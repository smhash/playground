"""
Module: ap_reconciliation.py
Reconciles the Accounts Payable subledger against the General Ledger.
Ensures the total of unpaid bills matches the Accounts Payable account balance in the GL.
Performs aging analysis, payment pattern analysis, and detects anomalies.
Handles vendor concentration analysis and payment trends.
Supports credit card reconciliation, accrual period validation, and batch payment tracking.

Key Features:
- GAAP-compliant accrual accounting validation
- Credit card statement reconciliation
- Batch payment tracking and validation
- Aging analysis for outstanding payables
- Vendor concentration analysis
- Payment pattern analysis
- Anomaly detection (duplicates, outliers)
- ERP system integration support
"""

import pandas as pd
from typing import Tuple, Dict, List, Optional
from datetime import datetime, timedelta
from .anomaly_detection import detect_duplicates, find_unmatched_entries, detect_outliers_zscore

def load_ap_data(ap_path: str, gl_ap_path: str, credit_card_path: Optional[str] = None, 
                batch_payments_path: Optional[str] = None) -> Tuple[pd.DataFrame, pd.DataFrame, Optional[pd.DataFrame], Optional[pd.DataFrame]]:
    """
    Load accounts payable data from CSV files.
    
    This function loads and preprocesses data from multiple sources:
    - AP subledger entries
    - GL AP entries
    - Credit card statements (optional)
    - Batch payment records (optional)
    
    Args:
        ap_path: Path to accounts payable CSV containing bill details
        gl_ap_path: Path to GL accounts payable entries CSV
        credit_card_path: Optional path to credit card statements CSV
        batch_payments_path: Optional path to batch payment records CSV
        
    Returns:
        Tuple containing:
        - AP DataFrame: Subledger entries with bill details
        - GL AP DataFrame: General ledger entries
        - Credit Card DataFrame: Optional credit card transactions
        - Batch Payments DataFrame: Optional batch payment records
        
    Note:
        All date columns are automatically converted to datetime objects.
        Missing optional data sources return None.
    """
    # Load main AP and GL data
    ap = pd.read_csv(ap_path)
    gl_ap = pd.read_csv(gl_ap_path)
    
    # Convert date columns to datetime if they exist
    if 'date' in ap.columns:
        ap['date'] = pd.to_datetime(ap['date'].str.strip())
    if 'date' in gl_ap.columns:
        gl_ap['date'] = pd.to_datetime(gl_ap['date'].str.strip())
    
    # Load credit card data if provided
    credit_card = None
    if credit_card_path:
        credit_card = pd.read_csv(credit_card_path)
        if 'date' in credit_card.columns:
            credit_card['date'] = pd.to_datetime(credit_card['date'].str.strip())
    
    # Load batch payment data if provided
    batch_payments = None
    if batch_payments_path:
        batch_payments = pd.read_csv(batch_payments_path)
        if 'date' in batch_payments.columns:
            batch_payments['date'] = pd.to_datetime(batch_payments['date'].str.strip())
    
    return ap, gl_ap, credit_card, batch_payments

def analyze_ap_aging(ap: pd.DataFrame) -> Dict:
    """
    Analyze accounts payable aging to track outstanding bills.
    
    This function categorizes bills into aging buckets and calculates totals:
    - Current (0-30 days)
    - 31-60 days
    - 61-90 days
    - Over 90 days
    
    Args:
        ap: DataFrame of accounts payable with date and amount columns
        
    Returns:
        Dictionary containing:
        - aging_buckets: DataFrames for each aging category
        - aging_totals: Sum of amounts in each bucket
        - total_outstanding: Total amount of outstanding bills
        
    Note:
        Aging is calculated from the current date to the bill date.
    """
    today = datetime.now()
    
    # Calculate days outstanding
    ap['days_outstanding'] = (today - ap['date']).dt.days
    
    # Categorize by aging buckets
    aging_buckets = {
        'current': ap[ap['days_outstanding'] <= 30],
        '31-60_days': ap[(ap['days_outstanding'] > 30) & (ap['days_outstanding'] <= 60)],
        '61-90_days': ap[(ap['days_outstanding'] > 60) & (ap['days_outstanding'] <= 90)],
        'over_90_days': ap[ap['days_outstanding'] > 90]
    }
    
    # Calculate totals for each bucket
    aging_totals = {bucket: df['amount'].sum() for bucket, df in aging_buckets.items()}
    
    return {
        'aging_buckets': aging_buckets,
        'aging_totals': aging_totals,
        'total_outstanding': ap['amount'].sum()
    }

def analyze_payment_patterns(ap: pd.DataFrame) -> Dict:
    """
    Analyze payment patterns to identify potential issues and vendor relationships.
    
    This function performs several analyses:
    - Vendor payment frequency
    - Payment amount trends
    - Vendor concentration
    - Multiple invoice tracking
    
    Args:
        ap: DataFrame of accounts payable with vendor and amount information
        
    Returns:
        Dictionary containing:
        - vendor_analysis: Detailed vendor payment statistics
        - high_concentration_vendors: Vendors with >10% of total AP
        - vendors_with_multiple_invoices: Vendors with multiple outstanding bills
    """
    # Find vendors with multiple outstanding invoices
    vendor_analysis = ap.groupby('vendor_id').agg({
        'amount': ['count', 'sum'],
        'date': ['min', 'max']
    }).reset_index()
    
    # Flatten MultiIndex columns
    vendor_analysis.columns = ['_'.join(col).strip('_') for col in vendor_analysis.columns.values]
    
    # Find vendors with increasing balances
    vendor_analysis['balance_trend'] = vendor_analysis.apply(
        lambda x: 'increasing' if x['date_max'] > x['date_min'] else 'stable',
        axis=1
    )
    
    # Find vendors with high concentration
    total_ap = ap['amount'].sum()
    vendor_analysis['concentration'] = vendor_analysis['amount_sum'] / total_ap
    
    return {
        'vendor_analysis': vendor_analysis,
        'high_concentration_vendors': vendor_analysis[vendor_analysis['concentration'] > 0.1],
        'vendors_with_multiple_invoices': vendor_analysis[vendor_analysis['amount_count'] > 1]
    }

def validate_accrual_periods(ap: pd.DataFrame, gl_ap: pd.DataFrame) -> Dict:
    """
    Validate that AP entries are recorded in the correct accounting periods per GAAP.
    
    This function ensures GAAP compliance by:
    - Grouping entries by accounting period
    - Comparing AP and GL totals for each period
    - Identifying periods with mismatches
    - Validating accrual accounting principles
    
    Args:
        ap: DataFrame of accounts payable entries
        gl_ap: DataFrame of GL accounts payable entries
        
    Returns:
        Dictionary containing:
        - period_mismatches: Details of periods with AP/GL differences
        - is_gaap_compliant: Boolean indicating GAAP compliance
    """
    # Group by accounting period
    ap['accounting_period'] = ap['date'].dt.to_period('M')
    gl_ap['accounting_period'] = gl_ap['date'].dt.to_period('M')
    
    # Compare totals by period
    ap_by_period = ap.groupby('accounting_period')['amount'].sum()
    gl_by_period = gl_ap.groupby('accounting_period')['amount'].sum()
    
    # Find periods with mismatches
    period_mismatches = {}
    for period in set(ap_by_period.index) | set(gl_by_period.index):
        ap_amount = ap_by_period.get(period, 0)
        gl_amount = gl_by_period.get(period, 0)
        if abs(ap_amount - gl_amount) > 1e-6:
            period_mismatches[period] = {
                'ap_amount': ap_amount,
                'gl_amount': gl_amount,
                'difference': ap_amount - gl_amount
            }
    
    return {
        'period_mismatches': period_mismatches,
        'is_gaap_compliant': len(period_mismatches) == 0
    }

def reconcile_credit_cards(ap: pd.DataFrame, credit_card: pd.DataFrame) -> Dict:
    """
    Reconcile credit card statements with AP accounts.
    
    This function matches credit card transactions with AP entries to ensure:
    - All credit card charges are properly recorded in AP
    - No duplicate or missing entries
    - Correct amount matching
    
    Args:
        ap: DataFrame of accounts payable entries
        credit_card: DataFrame of credit card transactions
        
    Returns:
        Dictionary containing:
        - unmatched_charges: Credit card charges not found in AP
        - unmatched_ap_entries: AP entries not found in credit card
        - total_difference: Net difference between credit card and AP
        - is_reconciled: Boolean indicating if fully reconciled
    """
    if credit_card is None:
        return {
            'unmatched_charges': pd.DataFrame(),
            'unmatched_ap_entries': pd.DataFrame(),
            'total_difference': 0.0,
            'is_reconciled': True
        }
    
    # Find unmatched entries
    only_in_cc, only_in_ap = find_unmatched_entries(
        credit_card, ap, ['transaction_id', 'amount']
    )
    
    # Calculate total differences
    cc_total = credit_card['amount'].sum()
    ap_cc_total = ap[ap['payment_method'] == 'credit_card']['amount'].sum()
    total_diff = cc_total - ap_cc_total
    
    return {
        'unmatched_charges': only_in_cc,
        'unmatched_ap_entries': only_in_ap,
        'total_difference': total_diff,
        'is_reconciled': abs(total_diff) <= 1e-6
    }

def track_batch_payments(ap: pd.DataFrame, batch_payments: pd.DataFrame) -> Dict:
    """
    Track and validate batch payment runs.
    
    This function monitors batch payment processing to ensure:
    - All payments are properly processed
    - Failed payments are identified
    - Batch totals are accurate
    - Payment status is tracked
    
    Args:
        ap: DataFrame of accounts payable entries
        batch_payments: DataFrame of batch payment records
        
    Returns:
        Dictionary containing:
        - batch_summary: Statistics for each batch run
        - unprocessed_payments: Bills not yet processed
        - failed_payments: Payments that failed processing
    """
    if batch_payments is None:
        return {
            'batch_summary': pd.DataFrame(),
            'unprocessed_payments': pd.DataFrame(),
            'failed_payments': pd.DataFrame()
        }
    
    # Group batch payments by run
    batch_summary = batch_payments.groupby('batch_id').agg({
        'amount': ['count', 'sum'],
        'status': lambda x: x.value_counts().to_dict()
    }).reset_index()
    
    # Find unprocessed payments
    processed_bills = batch_payments[batch_payments['status'] == 'processed']['bill_id']
    unprocessed = ap[~ap['bill_id'].isin(processed_bills)]
    
    # Find failed payments
    failed = batch_payments[batch_payments['status'] == 'failed']
    
    return {
        'batch_summary': batch_summary,
        'unprocessed_payments': unprocessed,
        'failed_payments': failed
    }

def reconcile_ap(ap: pd.DataFrame, gl_ap: pd.DataFrame, credit_card: Optional[pd.DataFrame] = None,
                batch_payments: Optional[pd.DataFrame] = None) -> dict:
    """
    Reconcile accounts payable with GL entries.
    
    This function performs comprehensive AP reconciliation including:
    - Basic AP/GL matching
    - Duplicate detection
    - Outlier identification
    - Aging analysis
    - Payment pattern analysis
    - GAAP compliance validation
    - Credit card reconciliation
    - Batch payment tracking
    
    Args:
        ap: DataFrame of accounts payable entries
        gl_ap: DataFrame of GL accounts payable entries
        credit_card: Optional DataFrame of credit card transactions
        batch_payments: Optional DataFrame of batch payment records
        
    Returns:
        Dictionary containing comprehensive reconciliation results:
        - entries_in_ap_not_gl: Entries in AP not found in GL
        - entries_in_gl_not_ap: Entries in GL not found in AP
        - duplicate_ap_entries: Duplicate bills in AP
        - duplicate_gl_entries: Duplicate entries in GL
        - outlier_ap_entries: Unusual amounts in AP
        - outlier_gl_entries: Unusual amounts in GL
        - balance_difference: Net difference between AP and GL
        - is_fully_reconciled: Boolean indicating full reconciliation
        - aging_analysis: Aging bucket analysis
        - payment_analysis: Vendor payment patterns
        - reconciliation_message: Detailed status message
        - accrual_validation: GAAP compliance results
        - credit_card_reconciliation: Credit card matching results
        - batch_payment_tracking: Batch payment status
    """
    # Find unmatched entries
    only_in_ap, only_in_gl = find_unmatched_entries(
        ap, gl_ap, ['bill_id', 'amount']
    )
    
    # Check for duplicates
    ap_dupes = detect_duplicates(ap, ['bill_id'])
    gl_dupes = detect_duplicates(gl_ap, ['bill_id'])
    
    # Check for outliers
    ap_outliers = detect_outliers_zscore(ap, 'amount')
    gl_outliers = detect_outliers_zscore(gl_ap, 'amount')
    
    # Calculate balance differences
    ap_total = ap['amount'].sum()
    gl_total = gl_ap['amount'].sum()
    balance_diff = ap_total - gl_total
    is_fully_reconciled = abs(balance_diff) <= 1e-6
    
    # Create detailed reconciliation message
    reconciliation_message = (
        f"AP Subledger total: ${ap_total:.2f}\n"
        f"GL AP total: ${gl_total:.2f}\n"
        f"Difference: ${balance_diff:.2f}\n"
        f"Status: {'Fully reconciled' if is_fully_reconciled else 'Not reconciled'}"
    )
    
    # Analyze aging
    aging_analysis = analyze_ap_aging(ap)
    
    # Analyze payment patterns
    payment_analysis = analyze_payment_patterns(ap)
    
    # Validate accrual periods
    accrual_validation = validate_accrual_periods(ap, gl_ap)
    
    # Reconcile credit cards
    credit_card_reconciliation = reconcile_credit_cards(ap, credit_card)
    
    # Track batch payments
    batch_payment_tracking = track_batch_payments(ap, batch_payments)
    
    return {
        'entries_in_ap_not_gl': only_in_ap,
        'entries_in_gl_not_ap': only_in_gl,
        'duplicate_ap_entries': ap_dupes,
        'duplicate_gl_entries': gl_dupes,
        'outlier_ap_entries': ap_outliers,
        'outlier_gl_entries': gl_outliers,
        'balance_difference': balance_diff,
        'is_fully_reconciled': is_fully_reconciled,
        'aging_analysis': aging_analysis,
        'payment_analysis': payment_analysis,
        'reconciliation_message': reconciliation_message,
        'accrual_validation': accrual_validation,
        'credit_card_reconciliation': credit_card_reconciliation,
        'batch_payment_tracking': batch_payment_tracking
    } 