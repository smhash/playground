"""
Module: ar_reconciliation.py
Reconciles the Accounts Receivable subledger against the General Ledger.
Ensures the total of unpaid invoices matches the Accounts Receivable account balance in the GL.
Performs aging analysis, payment pattern analysis, and detects anomalies.
Handles accrued entries, write-offs, and allowance for doubtful accounts.
"""
import pandas as pd
from typing import Tuple, Dict
from datetime import datetime, timedelta
from .anomaly_detection import detect_duplicates, find_unmatched_entries, detect_outliers_zscore

def load_ar_data(ar_path: str, gl_ar_path: str, allowance_path: str = None) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Load accounts receivable data from CSV files.
    
    Args:
        ar_path: Path to accounts receivable CSV
        gl_ar_path: Path to GL accounts receivable entries CSV
        allowance_path: Path to allowance for doubtful accounts CSV
        
    Returns:
        Tuple of (AR DataFrame, GL AR entries DataFrame, Allowance DataFrame)
    """
    ar = pd.read_csv(ar_path)
    gl_ar = pd.read_csv(gl_ar_path)
    
    # Convert date columns to datetime if they exist
    if 'date' in ar.columns:
        ar['date'] = pd.to_datetime(ar['date'].str.strip())
    if 'date' in gl_ar.columns:
        gl_ar['date'] = pd.to_datetime(gl_ar['date'].str.strip())
    
    # Load allowance data if provided
    allowance = None
    if allowance_path:
        allowance = pd.read_csv(allowance_path)
        if 'date' in allowance.columns:
            allowance['date'] = pd.to_datetime(allowance['date'].str.strip())
    
    return ar, gl_ar, allowance

def analyze_ar_aging(ar: pd.DataFrame) -> Dict:
    """
    Analyze accounts receivable aging.
    
    Args:
        ar: DataFrame of accounts receivable
        
    Returns:
        Dictionary containing aging analysis results
    """
    today = datetime.now()
    
    # Calculate days outstanding
    ar['days_outstanding'] = (today - ar['date']).dt.days
    
    # Categorize by aging buckets
    aging_buckets = {
        'current': ar[ar['days_outstanding'] <= 30],
        '31-60_days': ar[(ar['days_outstanding'] > 30) & (ar['days_outstanding'] <= 60)],
        '61-90_days': ar[(ar['days_outstanding'] > 60) & (ar['days_outstanding'] <= 90)],
        'over_90_days': ar[ar['days_outstanding'] > 90]
    }
    
    # Calculate totals for each bucket
    aging_totals = {bucket: df['amount'].sum() for bucket, df in aging_buckets.items()}
    
    return {
        'aging_buckets': aging_buckets,
        'aging_totals': aging_totals,
        'total_outstanding': ar['amount'].sum()
    }

def analyze_payment_patterns(ar: pd.DataFrame) -> Dict:
    """
    Analyze payment patterns for potential issues.
    
    Args:
        ar: DataFrame of accounts receivable
        
    Returns:
        Dictionary containing payment pattern analysis results
    """
    # Find customers with multiple outstanding invoices
    customer_analysis = ar.groupby('customer_id').agg({
        'amount': ['count', 'sum'],
        'date': ['min', 'max']
    }).reset_index()
    
    # Flatten MultiIndex columns
    customer_analysis.columns = ['_'.join(col).strip('_') for col in customer_analysis.columns.values]
    
    # Find customers with increasing balances
    customer_analysis['balance_trend'] = customer_analysis.apply(
        lambda x: 'increasing' if x['date_max'] > x['date_min'] else 'stable',
        axis=1
    )
    
    # Find customers with high concentration
    total_ar = ar['amount'].sum()
    customer_analysis['concentration'] = customer_analysis['amount_sum'] / total_ar
    
    return {
        'customer_analysis': customer_analysis,
        'high_concentration_customers': customer_analysis[customer_analysis['concentration'] > 0.1],
        'customers_with_multiple_invoices': customer_analysis[customer_analysis['amount_count'] > 1]
    }

def analyze_write_offs(ar: pd.DataFrame, allowance: pd.DataFrame) -> Dict:
    """
    Analyze write-offs and allowance for doubtful accounts.
    
    Args:
        ar: DataFrame of accounts receivable
        allowance: DataFrame of allowance for doubtful accounts
        
    Returns:
        Dictionary containing write-off analysis results
    """
    if allowance is None:
        return {
            'write_offs': pd.DataFrame(),
            'allowance_balance': 0.0,
            'write_off_ratio': 0.0,
            'unrecorded_write_offs': pd.DataFrame()
        }
    
    # Identify write-offs in AR
    write_offs = ar[ar['type'] == 'write_off']
    
    # Calculate write-off ratio
    total_ar = ar['amount'].sum()
    total_write_offs = write_offs['amount'].sum()
    write_off_ratio = total_write_offs / total_ar if total_ar > 0 else 0
    
    # Check for unrecorded write-offs
    recorded_write_offs = allowance[allowance['type'] == 'write_off']
    unrecorded = write_offs[~write_offs['invoice_id'].isin(recorded_write_offs['invoice_id'])]
    
    return {
        'write_offs': write_offs,
        'allowance_balance': allowance['amount'].sum(),
        'write_off_ratio': write_off_ratio,
        'unrecorded_write_offs': unrecorded
    }

def analyze_accrued_entries(ar: pd.DataFrame, gl_ar: pd.DataFrame) -> Dict:
    """
    Analyze accrued entries and their impact on reconciliation.
    
    Args:
        ar: DataFrame of accounts receivable
        gl_ar: DataFrame of GL accounts receivable entries
        
    Returns:
        Dictionary containing accrued entry analysis results
    """
    # Identify accrued entries
    accrued_ar = ar[ar['type'] == 'accrued']
    accrued_gl = gl_ar[gl_ar['type'] == 'accrued']
    
    # Find unmatched accrued entries
    only_in_ar, only_in_gl = find_unmatched_entries(
        accrued_ar, accrued_gl, ['invoice_id', 'amount']
    )
    
    return {
        'accrued_in_ar': accrued_ar,
        'accrued_in_gl': accrued_gl,
        'unmatched_accrued_ar': only_in_ar,
        'unmatched_accrued_gl': only_in_gl,
        'accrued_impact': accrued_ar['amount'].sum() - accrued_gl['amount'].sum()
    }

def reconcile_ar(ar: pd.DataFrame, gl_ar: pd.DataFrame, allowance: pd.DataFrame = None) -> dict:
    """
    Reconcile accounts receivable with GL entries.
    
    Args:
        ar: DataFrame of accounts receivable
        gl_ar: DataFrame of GL accounts receivable entries
        allowance: DataFrame of allowance for doubtful accounts
        
    Returns:
        Dictionary containing reconciliation results with the following keys:
        - entries_in_ar_not_gl: Entries in AR not found in GL (potential missing GL entries)
        - entries_in_gl_not_ar: Entries in GL not found in AR (potential errors)
        - duplicate_ar_entries: Duplicate invoices in AR subledger
        - duplicate_gl_entries: Duplicate entries in GL
        - outlier_ar_entries: Unusual amounts in AR
        - outlier_gl_entries: Unusual amounts in GL
        - balance_difference: Difference between AR and GL totals
        - is_fully_reconciled: Boolean indicating if totals match within tolerance
        - aging_analysis: Aging bucket analysis
        - payment_analysis: Customer payment pattern analysis
        - write_off_analysis: Analysis of write-offs and allowance
        - accrued_analysis: Analysis of accrued entries
    """
    # Find unmatched entries
    only_in_ar, only_in_gl = find_unmatched_entries(
        ar, gl_ar, ['invoice_id', 'amount']
    )
    
    # Check for duplicates
    ar_dupes = detect_duplicates(ar, ['invoice_id'])
    gl_dupes = detect_duplicates(gl_ar, ['invoice_id'])
    
    # Check for outliers
    ar_outliers = detect_outliers_zscore(ar, 'amount')
    gl_outliers = detect_outliers_zscore(gl_ar, 'amount')
    
    # Calculate balance differences with tolerance for floating-point precision
    ar_total = ar['amount'].sum()
    gl_total = gl_ar['amount'].sum()
    balance_diff = ar_total - gl_total
    is_fully_reconciled = abs(balance_diff) <= 1e-6
    
    # Analyze aging
    aging_analysis = analyze_ar_aging(ar)
    
    # Analyze payment patterns
    payment_analysis = analyze_payment_patterns(ar)
    
    # Analyze write-offs and allowance
    write_off_analysis = analyze_write_offs(ar, allowance)
    
    # Analyze accrued entries
    accrued_analysis = analyze_accrued_entries(ar, gl_ar)
    
    return {
        'entries_in_ar_not_gl': only_in_ar,
        'entries_in_gl_not_ar': only_in_gl,
        'duplicate_ar_entries': ar_dupes,
        'duplicate_gl_entries': gl_dupes,
        'outlier_ar_entries': ar_outliers,
        'outlier_gl_entries': gl_outliers,
        'balance_difference': balance_diff,
        'is_fully_reconciled': is_fully_reconciled,
        'aging_analysis': aging_analysis,
        'payment_analysis': payment_analysis,
        'write_off_analysis': write_off_analysis,
        'accrued_analysis': accrued_analysis
    } 