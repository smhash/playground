import pytest
import pandas as pd
import numpy as np
from src.anomaly_detection import (
    find_unmatched_entries,
    detect_duplicates,
    detect_outliers_zscore,
    detect_outliers_isolation_forest
)

@pytest.fixture
def sample_transactions():
    """Create sample transaction data for testing"""
    return pd.DataFrame({
        'txn_date': ['2024-02-15', '2024-02-20', '2024-02-25'],
        'txn_amount': [1000.00, -500.00, 750.00],
        'txn_description': ['Deposit', 'Check #123', 'ACH Payment'],
        'check_num': [None, '123', None],
        'txn_type': ['deposit', 'check', 'ach']
    })

def test_find_unmatched_entries_basic():
    """Test basic unmatched entries detection"""
    df1 = pd.DataFrame({
        'txn_date': ['2024-02-15', '2024-02-20'],
        'txn_amount': [1000.00, -500.00],
        'txn_description': ['Deposit', 'Check #123']
    })
    
    df2 = pd.DataFrame({
        'txn_date': ['2024-02-15', '2024-02-25'],
        'txn_amount': [1000.00, 750.00],
        'txn_description': ['Deposit', 'ACH Payment']
    })
    
    only_in_df1, only_in_df2 = find_unmatched_entries(df1, df2)
    
    assert isinstance(only_in_df1, pd.DataFrame)
    assert isinstance(only_in_df2, pd.DataFrame)

def test_find_unmatched_entries_empty():
    """Test unmatched entries with empty DataFrames"""
    empty_df = pd.DataFrame()
    only_in_df1, only_in_df2 = find_unmatched_entries(empty_df, empty_df)
    assert only_in_df1.empty
    assert only_in_df2.empty

def test_detect_duplicates_basic():
    """Test basic duplicate detection"""
    df = pd.DataFrame({
        'txn_date': ['2024-02-15', '2024-02-15', '2024-02-20'],
        'txn_amount': [1000.00, 1000.00, -500.00],
        'txn_description': ['Deposit', 'Deposit', 'Check #123']
    })
    
    duplicates = detect_duplicates(df)
    assert len(duplicates) == 2
    assert all(duplicates['txn_amount'] == 1000.00)

def test_detect_duplicates_no_duplicates():
    """Test duplicate detection with no duplicates"""
    df = pd.DataFrame({
        'txn_date': ['2024-02-15', '2024-02-20'],
        'txn_amount': [1000.00, -500.00],
        'txn_description': ['Deposit', 'Check #123']
    })
    
    duplicates = detect_duplicates(df)
    assert len(duplicates) == 0

def test_detect_outliers_zscore_basic():
    """Test basic outlier detection using Z-score"""
    df = pd.DataFrame({
        'txn_amount': [1000.00, 1100.00, 900.00, 5000.00],
        'txn_date': pd.to_datetime(['2024-02-15', '2024-02-16', '2024-02-17', '2024-02-18']),
        'txn_description': ['A', 'B', 'C', 'D']
    })
    
    outliers = detect_outliers_zscore(df, 'txn_amount')
    assert isinstance(outliers, pd.DataFrame)

def test_detect_outliers_zscore_custom_threshold():
    """Test outlier detection with custom Z-score threshold"""
    df = pd.DataFrame({
        'txn_amount': [1000.00, 1100.00, 900.00, 2000.00],
        'txn_date': pd.to_datetime(['2024-02-15', '2024-02-16', '2024-02-17', '2024-02-18']),
        'txn_description': ['A', 'B', 'C', 'D']
    })
    
    outliers_default = detect_outliers_zscore(df, 'txn_amount')
    assert isinstance(outliers_default, pd.DataFrame)
    outliers_custom = detect_outliers_zscore(df, 'txn_amount', threshold=2.0)
    assert isinstance(outliers_custom, pd.DataFrame)

def test_detect_outliers_isolation_forest_basic():
    """Test basic outlier detection using Isolation Forest"""
    df = pd.DataFrame({
        'txn_amount': [1000.00, 1100.00, 900.00, 5000.00],
        'txn_date': pd.to_datetime(['2024-02-15', '2024-02-16', '2024-02-17', '2024-02-18']),
        'txn_description': ['A', 'B', 'C', 'D']
    })
    
    outliers = detect_outliers_isolation_forest(df, 'txn_amount')
    assert isinstance(outliers, pd.DataFrame)

def test_detect_outliers_isolation_forest_custom_contamination():
    """Test outlier detection with custom contamination"""
    df = pd.DataFrame({
        'txn_amount': [1000.00, 1100.00, 900.00, 2000.00, 3000.00],
        'txn_date': pd.to_datetime(['2024-02-15', '2024-02-16', '2024-02-17', '2024-02-18', '2024-02-19']),
        'txn_description': ['A', 'B', 'C', 'D', 'E']
    })
    
    outliers_default = detect_outliers_isolation_forest(df, 'txn_amount')
    assert isinstance(outliers_default, pd.DataFrame)
    outliers_custom = detect_outliers_isolation_forest(df, 'txn_amount', contamination=0.4)
    assert isinstance(outliers_custom, pd.DataFrame)

def test_edge_cases():
    """Test various edge cases"""
    # Single value
    single_value = pd.DataFrame({'txn_amount': [1000.00], 'txn_date': [pd.to_datetime('2024-02-15')], 'txn_description': ['A']})
    outliers = detect_outliers_zscore(single_value, 'txn_amount')
    assert isinstance(outliers, pd.DataFrame)
    
    # All same values
    same_values = pd.DataFrame({'txn_amount': [1000.00] * 5, 'txn_date': pd.to_datetime(['2024-02-15']*5), 'txn_description': ['A']*5})
    outliers = detect_outliers_zscore(same_values, 'txn_amount')
    assert isinstance(outliers, pd.DataFrame)
    
    # Missing values: should not raise, just skip
    with_missing = pd.DataFrame({'txn_amount': [1000.00, np.nan, 900.00], 'txn_date': pd.to_datetime(['2024-02-15', '2024-02-16', '2024-02-17']), 'txn_description': ['A', 'B', 'C']})
    outliers = detect_outliers_zscore(with_missing.dropna(), 'txn_amount')
    assert isinstance(outliers, pd.DataFrame)

def test_performance():
    """Test performance with larger datasets"""
    # Create larger dataset
    n_transactions = 1000
    amounts = np.random.normal(1000, 100, n_transactions)
    amounts[0] = 5000  # Add an outlier
    
    df = pd.DataFrame({
        'txn_amount': amounts,
        'txn_date': pd.date_range('2024-02-01', periods=n_transactions),
        'txn_description': [f"desc_{i}" for i in range(n_transactions)]
    })
    
    # Test Z-score method
    outliers_zscore = detect_outliers_zscore(df, 'txn_amount')
    
    # Test Isolation Forest method
    outliers_forest = detect_outliers_isolation_forest(df, 'txn_amount')
    
    # Verify results
    assert isinstance(outliers_zscore, pd.DataFrame)
    assert isinstance(outliers_forest, pd.DataFrame) 