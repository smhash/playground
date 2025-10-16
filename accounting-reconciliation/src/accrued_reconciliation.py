import pandas as pd
from typing import Tuple
from .anomaly_detection import detect_duplicates, find_unmatched_entries, detect_outliers_zscore

def load_accrued_data(accrued_schedule_path: str, gl_accrued_path: str) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Load accrued expenses data from CSV files.
    
    Args:
        accrued_schedule_path: Path to accrued expenses schedule CSV
        gl_accrued_path: Path to GL accrued expenses entries CSV
        
    Returns:
        Tuple of (accrued expenses schedule DataFrame, GL accrued expenses entries DataFrame)
    """
    accrued_schedule = pd.read_csv(accrued_schedule_path)
    gl_accrued = pd.read_csv(gl_accrued_path)
    return accrued_schedule, gl_accrued

def reconcile_accrued_expenses(accrued_schedule: pd.DataFrame, gl_accrued: pd.DataFrame) -> dict:
    """
    Reconcile accrued expenses schedule with GL accrued expenses entries.
    
    Args:
        accrued_schedule: DataFrame of accrued expenses schedule entries
        gl_accrued: DataFrame of GL accrued expenses entries
        
    Returns:
        Dictionary containing reconciliation results
    """
    # Find unmatched entries
    only_in_schedule, only_in_gl = find_unmatched_entries(
        accrued_schedule, gl_accrued, ['accrual_id']
    )
    
    # Check for duplicates
    schedule_dupes = detect_duplicates(accrued_schedule, ['accrual_id'])
    gl_dupes = detect_duplicates(gl_accrued, ['accrual_id'])
    
    # Check for outliers
    schedule_outliers = detect_outliers_zscore(accrued_schedule, 'amount')
    gl_outliers = detect_outliers_zscore(gl_accrued, 'amount')
    
    # Calculate balance differences
    schedule_total = accrued_schedule['amount'].sum()
    gl_total = gl_accrued['amount'].sum()
    balance_diff = schedule_total - gl_total
    is_fully_reconciled = abs(balance_diff) <= 1e-6
    
    return {
        'entries_in_accrued_not_gl': only_in_schedule,
        'entries_in_gl_not_accrued': only_in_gl,
        'duplicate_accrued_entries': schedule_dupes,
        'duplicate_gl_entries': gl_dupes,
        'outlier_accrued_entries': schedule_outliers,
        'outlier_gl_entries': gl_outliers,
        'balance_difference': balance_diff,
        'is_fully_reconciled': is_fully_reconciled
    } 