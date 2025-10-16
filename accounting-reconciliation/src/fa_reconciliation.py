"""
Module: fa_reconciliation.py
Purpose: Reconciles the Fixed Assets register against the General Ledger (GL), ensuring compliance with accounting standards and providing detailed analysis of asset lifecycle events, depreciation, and reconciliation status.

Key Features:
1. Asset Lifecycle Tracking
   - Tracks acquisitions, disposals, retirements, and sales of fixed assets.
   - Ensures all asset movements are reflected in both the register and GL.
2. Depreciation Analysis
   - Calculates current period and accumulated depreciation.
   - Computes net book value and validates against GL balances.
3. Roll Forward Analysis
   - Provides beginning and ending balances for the period.
   - Summarizes all asset movements and their impact on balances.
4. Reconciliation & Anomaly Detection
   - Detects unmatched, duplicate, and outlier entries between register and GL.
   - Flags discrepancies and provides detailed reporting.
5. Compliance & Audit Trail
   - Ensures all asset events are documented and reconciled for audit purposes.

Data Requirements:
- Fixed assets register (CSV): asset_id, date, amount, transaction_type, description, location_id, etc.
- GL fixed assets entries (CSV): asset_id, date, amount, transaction_type, description, account_type, etc.
- GL depreciation entries (CSV): asset_id, date, amount, description, account_type, etc.

Reconciliation Rules:
- All asset acquisitions, disposals, retirements, and sales must be matched between register and GL.
- Depreciation must be calculated and reconciled for the period.
- Net book value = Total asset cost - Accumulated depreciation.
- Any unmatched, duplicate, or outlier entries must be flagged and explained.
- Roll forward must tie beginning balance, movements, and ending balance.
- Tolerance for reconciliation is 1e-6 (floating point precision).
"""
import pandas as pd
import numpy as np
from typing import Tuple, Dict, List
from datetime import datetime
from .anomaly_detection import detect_duplicates, find_unmatched_entries, detect_outliers_zscore

def load_fa_data(
    fa_path: str, 
    gl_fa_path: str,
    gl_depreciation_path: str
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Load fixed assets data from CSV files.
    
    Args:
        fa_path: Path to fixed assets CSV
        gl_fa_path: Path to GL fixed assets entries CSV
        gl_depreciation_path: Path to GL accumulated depreciation entries CSV
        
    Returns:
        Tuple of (FA register DataFrame, GL FA entries DataFrame, GL depreciation entries DataFrame)
    """
    fa_register = pd.read_csv(fa_path)
    gl_fa = pd.read_csv(gl_fa_path)
    gl_depreciation = pd.read_csv(gl_depreciation_path)
    
    # Convert date columns to datetime if they exist
    for df in [fa_register, gl_fa, gl_depreciation]:
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'].str.strip())
    
    return fa_register, gl_fa, gl_depreciation

def analyze_asset_movements(
    fa_register: pd.DataFrame,
    gl_fa: pd.DataFrame,
    start_date: datetime,
    end_date: datetime
) -> Dict:
    """
    Analyze fixed asset movements during the period.
    
    Args:
        fa_register: DataFrame of fixed assets register
        gl_fa: DataFrame of GL fixed assets entries
        start_date: Start of analysis period
        end_date: End of analysis period
        
    Returns:
        Dictionary containing movement analysis
    """
    # Filter transactions within period
    period_transactions = gl_fa[
        (gl_fa['date'] >= start_date) & 
        (gl_fa['date'] <= end_date)
    ]
    
    # Categorize transactions
    movements = {
        'additions': period_transactions[period_transactions['transaction_type'] == 'purchase'],
        'disposals': period_transactions[period_transactions['transaction_type'] == 'disposal'],
        'retirements': period_transactions[period_transactions['transaction_type'] == 'retirement'],
        'sales': period_transactions[period_transactions['transaction_type'] == 'sale']
    }
    
    # Calculate totals
    totals = {
        'additions': movements['additions']['amount'].sum(),
        'disposals': movements['disposals']['amount'].sum(),
        'retirements': movements['retirements']['amount'].sum(),
        'sales': movements['sales']['amount'].sum()
    }
    
    return {
        'movements': movements,
        'totals': totals
    }

def analyze_depreciation(
    fa_register: pd.DataFrame,
    gl_depreciation: pd.DataFrame,
    start_date: datetime,
    end_date: datetime
) -> Dict:
    """
    Analyze accumulated depreciation and current period depreciation.
    
    Args:
        fa_register: DataFrame of fixed assets register
        gl_depreciation: DataFrame of GL depreciation entries
        start_date: Start of analysis period
        end_date: End of analysis period
        
    Returns:
        Dictionary containing depreciation analysis
    """
    # Filter depreciation entries within period
    period_depreciation = gl_depreciation[
        (gl_depreciation['date'] >= start_date) & 
        (gl_depreciation['date'] <= end_date)
    ]
    
    # Calculate current period depreciation
    current_depreciation = period_depreciation['amount'].sum()
    
    # Calculate accumulated depreciation
    accumulated_depreciation = gl_depreciation[
        gl_depreciation['date'] <= end_date
    ]['amount'].sum()
    
    # Calculate net book value
    total_assets = fa_register['amount'].sum()
    net_book_value = total_assets - accumulated_depreciation
    
    return {
        'current_depreciation': current_depreciation,
        'accumulated_depreciation': accumulated_depreciation,
        'net_book_value': net_book_value,
        'depreciation_entries': period_depreciation
    }

def generate_reconciliation_message(results: Dict) -> str:
    """
    Generate a detailed reconciliation message from the results.
    
    Args:
        results: Dictionary containing reconciliation results
        
    Returns:
        Formatted reconciliation message
    """
    message = "\n=== Fixed Assets Reconciliation ===\n"
    
    # Show roll forward analysis
    message += "\nRoll Forward Analysis:\n"
    message += f"Beginning Balance: ${results['beginning_balance']:.2f}\n"
    message += f"Additions: ${results['movement_analysis']['totals']['additions']:.2f}\n"
    message += f"Disposals: ${results['movement_analysis']['totals']['disposals']:.2f}\n"
    message += f"Retirements: ${results['movement_analysis']['totals']['retirements']:.2f}\n"
    message += f"Sales: ${results['movement_analysis']['totals']['sales']:.2f}\n"
    message += f"Ending Balance: ${results['ending_balance']:.2f}\n"
    
    # Show depreciation analysis
    message += "\nDepreciation Analysis:\n"
    message += f"Current Period Depreciation: ${results['depreciation_analysis']['current_depreciation']:.2f}\n"
    message += f"Accumulated Depreciation: ${results['depreciation_analysis']['accumulated_depreciation']:.2f}\n"
    message += f"Net Book Value: ${results['depreciation_analysis']['net_book_value']:.2f}\n"
    
    # Check for duplicates
    if not results['duplicate_fa_entries'].empty:
        message += f"\nDuplicate assets in Fixed Asset register:\n{results['duplicate_fa_entries']}\n"
    if not results['duplicate_gl_entries'].empty:
        message += f"\nDuplicate entries in Fixed Assets GL data:\n{results['duplicate_gl_entries']}\n"
    
    # Check for unmatched entries
    if not results['entries_in_fa_not_gl'].empty:
        message += f"\nAssets in register not in GL:\n{results['entries_in_fa_not_gl']}\n"
    if not results['entries_in_gl_not_fa'].empty:
        message += f"\nEntries in GL not in asset register:\n{results['entries_in_gl_not_fa']}\n"
    
    # Check for outliers
    if not results['outlier_fa_entries'].empty:
        message += f"\nUnusual amounts in Fixed Asset register:\n{results['outlier_fa_entries']}\n"
    if not results['outlier_gl_entries'].empty:
        message += f"\nUnusual amounts in GL:\n{results['outlier_gl_entries']}\n"
    
    # Show balance comparison
    if not results['is_fully_reconciled']:
        message += f"\nDifference in fixed assets value: {results['balance_difference']:.2f}\n"
    else:
        message += "\nFixed assets are fully reconciled (totals match).\n"
    
    return message

def reconcile_fixed_assets(
    fa_register: pd.DataFrame,
    gl_fa: pd.DataFrame,
    gl_depreciation: pd.DataFrame,
    start_date: datetime,
    end_date: datetime
) -> dict:
    """
    Reconcile fixed assets with GL entries and analyze movements and depreciation.
    
    Args:
        fa_register: DataFrame of fixed assets register
        gl_fa: DataFrame of GL fixed assets entries
        gl_depreciation: DataFrame of GL depreciation entries
        start_date: Start of analysis period
        end_date: End of analysis period
        
    Returns:
        Dictionary containing comprehensive reconciliation results
    """
    # Find unmatched entries
    only_in_fa, only_in_gl = find_unmatched_entries(
        fa_register, gl_fa, ['asset_id', 'amount']
    )
    
    # Check for duplicates
    fa_dupes = detect_duplicates(fa_register, ['asset_id'])
    gl_dupes = detect_duplicates(gl_fa, ['asset_id'])
    
    # Check for outliers
    fa_outliers = detect_outliers_zscore(fa_register, 'amount')
    gl_outliers = detect_outliers_zscore(gl_fa, 'amount')
    
    # Calculate beginning and ending balances
    beginning_balance = gl_fa[gl_fa['date'] < start_date]['amount'].sum()
    ending_balance = gl_fa[gl_fa['date'] <= end_date]['amount'].sum()
    
    # Analyze movements
    movement_analysis = analyze_asset_movements(fa_register, gl_fa, start_date, end_date)
    
    # Analyze depreciation
    depreciation_analysis = analyze_depreciation(fa_register, gl_depreciation, start_date, end_date)
    
    # Calculate balance differences
    fa_total = fa_register['amount'].sum()
    gl_total = ending_balance
    balance_diff = fa_total - gl_total
    is_fully_reconciled = abs(balance_diff) <= 1e-6
    
    results = {
        'entries_in_fa_not_gl': only_in_fa,
        'entries_in_gl_not_fa': only_in_gl,
        'duplicate_fa_entries': fa_dupes,
        'duplicate_gl_entries': gl_dupes,
        'outlier_fa_entries': fa_outliers,
        'outlier_gl_entries': gl_outliers,
        'balance_difference': balance_diff,
        'is_fully_reconciled': is_fully_reconciled,
        'beginning_balance': beginning_balance,
        'ending_balance': ending_balance,
        'movement_analysis': movement_analysis,
        'depreciation_analysis': depreciation_analysis
    }
    
    # Generate detailed reconciliation message
    results['reconciliation_message'] = generate_reconciliation_message(results)
    
    return results 