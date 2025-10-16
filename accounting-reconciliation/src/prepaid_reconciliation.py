import pandas as pd
from typing import Tuple
from .anomaly_detection import detect_duplicates, find_unmatched_entries, detect_outliers_zscore

def load_prepaid_data(prepaid_schedule_path: str, gl_prepaid_path: str) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Load prepaid expenses data from CSV files.
    
    Args:
        prepaid_schedule_path: Path to prepaid expenses schedule CSV
        gl_prepaid_path: Path to GL prepaid expenses entries CSV
        
    Returns:
        Tuple of (prepaid expenses schedule DataFrame, GL prepaid expenses entries DataFrame)
    """
    prepaid_schedule = pd.read_csv(prepaid_schedule_path)
    gl_prepaid = pd.read_csv(gl_prepaid_path)
    return prepaid_schedule, gl_prepaid

def reconcile_prepaid_expenses(prepaid_schedule: pd.DataFrame, gl_prepaid: pd.DataFrame) -> dict:
    """
    Reconcile prepaid expenses schedule with GL prepaid expenses entries.
    
    Args:
        prepaid_schedule: DataFrame of prepaid expenses schedule entries
        gl_prepaid: DataFrame of GL prepaid expenses entries
        
    Returns:
        Dictionary containing reconciliation results
    """
    # Find unmatched entries
    only_in_schedule, only_in_gl = find_unmatched_entries(
        prepaid_schedule, gl_prepaid, ['prepaid_id']
    )
    
    # Check for duplicates
    schedule_dupes = detect_duplicates(prepaid_schedule, ['prepaid_id'])
    gl_dupes = detect_duplicates(gl_prepaid, ['prepaid_id'])
    
    # Check for outliers
    schedule_outliers = detect_outliers_zscore(prepaid_schedule, 'amount')
    gl_outliers = detect_outliers_zscore(gl_prepaid, 'amount')
    
    # Calculate balance differences
    schedule_total = prepaid_schedule['amount'].sum()
    gl_total = gl_prepaid['amount'].sum()
    balance_diff = schedule_total - gl_total
    is_fully_reconciled = abs(balance_diff) <= 1e-6
    
    return {
        'entries_in_prepaid_not_gl': only_in_schedule,
        'entries_in_gl_not_prepaid': only_in_gl,
        'duplicate_prepaid_entries': schedule_dupes,
        'duplicate_gl_entries': gl_dupes,
        'outlier_prepaid_entries': schedule_outliers,
        'outlier_gl_entries': gl_outliers,
        'balance_difference': balance_diff,
        'is_fully_reconciled': is_fully_reconciled
    } 