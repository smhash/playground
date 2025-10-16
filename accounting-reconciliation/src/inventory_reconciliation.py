"""
Module: inventory_reconciliation.py
Purpose: Reconciles physical inventory counts with GL records, handles obsolescence, and LCM valuation.

Key Features:
1. Physical Count Reconciliation
   - Reconciles physical counts with GL records
   - Handles cycle counts and annual counts
   - Tracks count discrepancies
   - Generates adjustment entries

2. Obsolescence Analysis
   - Tracks inventory age
   - Calculates obsolescence allowance
   - Monitors slow-moving items
   - Analyzes write-down patterns

3. LCM Valuation
   - Tracks cost vs market value
   - Calculates LCM adjustments
   - Monitors market value changes
   - Analyzes valuation trends

4. Cut-off Analysis
   - Validates month-end cut-off
   - Tracks in-transit items
   - Monitors accrual entries
   - Ensures proper period matching

5. Discrepancy Resolution
   - Tracks count variances
   - Generates adjustment entries
   - Maintains audit trail
   - Monitors resolution status
"""

import pandas as pd
import numpy as np
from typing import Tuple, Dict, List
from datetime import datetime, timedelta
from .anomaly_detection import detect_duplicates, find_unmatched_entries, detect_outliers_zscore

def load_inventory_data(
    gl_inventory_path: str,
    physical_counts_path: str,
    market_values_path: str,
    ap_transactions_path: str
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Load and prepare inventory data from CSV files.
    
    Args:
        gl_inventory_path: Path to GL inventory entries
        physical_counts_path: Path to physical count records
        market_values_path: Path to market value data
        ap_transactions_path: Path to AP transactions
        
    Returns:
        Tuple of (GL inventory DataFrame, physical counts DataFrame, 
                 market values DataFrame, AP transactions DataFrame)
    """
    print(f"Loading GL inventory from {gl_inventory_path}")
    gl_inventory = pd.read_csv(gl_inventory_path)
    print(f"GL inventory shape: {gl_inventory.shape}")
    
    print(f"Loading physical counts from {physical_counts_path}")
    physical_counts = pd.read_csv(physical_counts_path)
    print(f"Physical counts shape: {physical_counts.shape}")
    
    print(f"Loading market values from {market_values_path}")
    market_values = pd.read_csv(market_values_path)
    print(f"Market values shape: {market_values.shape}")
    
    print(f"Loading AP transactions from {ap_transactions_path}")
    ap_transactions = pd.read_csv(ap_transactions_path)
    print(f"AP transactions shape: {ap_transactions.shape}")
    
    # Convert date columns to datetime
    for df in [gl_inventory, physical_counts, market_values, ap_transactions]:
        for col in ['date', 'count_date', 'valuation_date', 'transaction_date']:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col])
    
    return gl_inventory, physical_counts, market_values, ap_transactions

def analyze_physical_counts(
    gl_inventory: pd.DataFrame,
    physical_counts: pd.DataFrame
) -> Dict:
    """
    Analyze physical count discrepancies and generate adjustment entries.
    
    Args:
        gl_inventory: GL inventory records
        physical_counts: Physical count records
        
    Returns:
        Dictionary containing count analysis results
    """
    # Merge GL and physical count data
    merged = pd.merge(
        gl_inventory,
        physical_counts,
        on=['item_id', 'location_id'],
        how='outer',
        suffixes=('_gl', '_count')
    )
    
    # Calculate discrepancies
    merged['quantity_diff'] = merged['quantity_count'] - merged['quantity_gl']
    merged['value_diff'] = merged['quantity_diff'] * merged['unit_cost']
    
    # Categorize discrepancies
    merged['discrepancy_type'] = np.where(
        merged['quantity_diff'] > 0,
        'Count > GL',
        np.where(
            merged['quantity_diff'] < 0,
            'Count < GL',
            'Matched'
        )
    )
    
    # Generate adjustment entries
    adjustments = merged[merged['quantity_diff'] != 0].copy()
    adjustments['adjustment_type'] = 'Physical Count Adjustment'
    adjustments['adjustment_date'] = datetime.now()
    
    return {
        'count_summary': merged.groupby('discrepancy_type').agg({
            'quantity_diff': 'sum',
            'value_diff': 'sum',
            'item_id': 'count'
        }),
        'adjustment_entries': adjustments,
        'total_discrepancy_value': merged['value_diff'].sum(),
        'discrepancy_count': len(adjustments)
    }

def analyze_obsolescence(
    gl_inventory: pd.DataFrame,
    market_values: pd.DataFrame
) -> Dict:
    """
    Analyze inventory obsolescence and calculate allowance.
    
    Args:
        gl_inventory: GL inventory records
        market_values: Market value data
        
    Returns:
        Dictionary containing obsolescence analysis
    """
    # Calculate inventory age
    today = datetime.now()
    gl_inventory['age_days'] = (today - gl_inventory['date']).dt.days
    
    # Categorize by age
    gl_inventory['age_category'] = pd.cut(
        gl_inventory['age_days'],
        bins=[0, 90, 180, 365, float('inf')],
        labels=['0-90 days', '91-180 days', '181-365 days', '>365 days']
    )
    
    # Calculate obsolescence allowance
    age_factors = {
        '0-90 days': 0.00,
        '91-180 days': 0.10,
        '181-365 days': 0.25,
        '>365 days': 0.50
    }
    
    gl_inventory['obsolescence_factor'] = gl_inventory['age_category'].map(age_factors).astype(float)
    gl_inventory['obsolescence_allowance'] = gl_inventory['quantity_gl'] * gl_inventory['unit_cost'] * gl_inventory['obsolescence_factor']
    
    # Merge with market values
    merged = pd.merge(
        gl_inventory,
        market_values,
        on='item_id',
        how='left'
    )
    
    # Calculate write-down needed
    merged['write_down'] = np.where(
        merged['market_value'] < merged['unit_cost'],
        (merged['unit_cost'] - merged['market_value']) * merged['quantity_gl'],
        0
    )
    
    return {
        'age_summary': gl_inventory.groupby('age_category', observed=True).agg({
            'quantity_gl': 'sum',
            'unit_cost': 'mean',
            'obsolescence_allowance': 'sum'
        }),
        'total_obsolescence': gl_inventory['obsolescence_allowance'].sum(),
        'total_write_down': merged['write_down'].sum(),
        'slow_moving_items': merged[merged['age_days'] > 180].sort_values('age_days', ascending=False)
    }

def analyze_lcm_valuation(
    gl_inventory: pd.DataFrame,
    market_values: pd.DataFrame
) -> Dict:
    """
    Analyze lower of cost or market (LCM) valuation.
    
    Args:
        gl_inventory: GL inventory records
        market_values: Market value data
        
    Returns:
        Dictionary containing LCM analysis
    """
    # Merge GL and market value data
    merged = pd.merge(
        gl_inventory,
        market_values,
        on='item_id',
        how='left'
    )
    
    # Rename item_category column if it exists with a suffix
    if 'item_category_gl' in merged.columns:
        merged.rename(columns={'item_category_gl': 'item_category'}, inplace=True)
    elif 'item_category_market' in merged.columns:
        merged.rename(columns={'item_category_market': 'item_category'}, inplace=True)
    else:
        merged['item_category'] = 'Uncategorized'
    
    # Calculate LCM adjustments
    merged['lcm_value'] = np.minimum(merged['unit_cost'], merged['market_value'])
    merged['lcm_adjustment'] = (merged['lcm_value'] - merged['unit_cost']) * merged['quantity_gl']
    
    # Group by item category
    by_category = merged.groupby('item_category').agg({
        'quantity_gl': 'sum',
        'unit_cost': 'mean',
        'market_value': 'mean',
        'lcm_adjustment': 'sum'
    })
    
    return {
        'lcm_summary': by_category,
        'total_lcm_adjustment': merged['lcm_adjustment'].sum(),
        'items_below_cost': merged[merged['market_value'] < merged['unit_cost']].sort_values('lcm_adjustment')
    }

def analyze_cutoff(
    gl_inventory: pd.DataFrame,
    ap_transactions: pd.DataFrame,
    cutoff_date: datetime
) -> Dict:
    """
    Analyze month-end cut-off and in-transit items.
    
    Args:
        gl_inventory: GL inventory records
        ap_transactions: AP transaction records
        cutoff_date: Month-end cut-off date
        
    Returns:
        Dictionary containing cut-off analysis
    """
    # Identify in-transit items
    in_transit = ap_transactions[
        (ap_transactions['transaction_date'] > cutoff_date) &
        (ap_transactions['status'] == 'in_transit')
    ]
    
    # Create a copy of in_transit before modifying
    in_transit = in_transit.copy()
    in_transit.loc[:, 'accrual_amount'] = in_transit['quantity'] * in_transit['unit_cost']
    
    # Group by vendor
    by_vendor = in_transit.groupby('vendor_id').agg({
        'quantity': 'sum',
        'accrual_amount': 'sum'
    })
    
    return {
        'in_transit_summary': by_vendor,
        'total_accrual': in_transit['accrual_amount'].sum(),
        'in_transit_items': in_transit.sort_values('transaction_date')
    }

def reconcile_inventory(
    gl_inventory: pd.DataFrame,
    physical_counts: pd.DataFrame,
    market_values: pd.DataFrame,
    ap_transactions: pd.DataFrame,
    cutoff_date: datetime = None
) -> Dict:
    """
    Reconcile inventory records and generate comprehensive analysis.
    
    Args:
        gl_inventory: GL inventory records
        physical_counts: Physical count records
        market_values: Market value data
        ap_transactions: AP transaction records
        cutoff_date: Month-end cut-off date
        
    Returns:
        Dictionary containing reconciliation results
    """
    # Analyze physical counts
    count_analysis = analyze_physical_counts(gl_inventory, physical_counts)
    
    # Analyze obsolescence
    obsolescence_analysis = analyze_obsolescence(gl_inventory, market_values)
    
    # Analyze LCM valuation
    lcm_analysis = analyze_lcm_valuation(gl_inventory, market_values)
    
    # Analyze cut-off if date provided
    cutoff_analysis = analyze_cutoff(gl_inventory, ap_transactions, cutoff_date) if cutoff_date else None
    
    # Create detailed reconciliation message
    reconciliation_message = (
        f"=== Inventory Reconciliation ===\n"
        f"Total GL Value: ${gl_inventory['quantity_gl'].sum() * gl_inventory['unit_cost'].sum():.2f}\n"
        f"Physical Count Discrepancy: ${count_analysis['total_discrepancy_value']:.2f}\n"
        f"Obsolescence Allowance: ${obsolescence_analysis['total_obsolescence']:.2f}\n"
        f"LCM Adjustment: ${lcm_analysis['total_lcm_adjustment']:.2f}\n"
    )
    
    if cutoff_analysis:
        reconciliation_message += f"Cut-off Accrual: ${cutoff_analysis['total_accrual']:.2f}\n"
    
    return {
        'count_analysis': count_analysis,
        'obsolescence_analysis': obsolescence_analysis,
        'lcm_analysis': lcm_analysis,
        'cutoff_analysis': cutoff_analysis,
        'reconciliation_message': reconciliation_message
    } 