import pytest
import pandas as pd
from datetime import datetime, timedelta
from unittest.mock import patch
from src.bank_reconciliation import reconcile_bank_accounts, load_bank_data
from src.anomaly_detection import (
    find_unmatched_entries,
    detect_duplicates,
    detect_outliers_zscore,
    detect_outliers_isolation_forest
)

@pytest.fixture
def sample_data():
    """Create sample data for integration testing"""
    bank_stmt = pd.DataFrame({
        'txn_date': pd.to_datetime(['2024-02-15', '2024-02-20', '2024-02-25', '2024-02-26', '2024-02-27']),
        'txn_amount': [1000.00, -500.00, -10.00, -200.00, 750.00],
        'txn_description': ['Deposit', 'Check #123', 'Service Fee', 'ACH Payment', 'Deposit'],
        'check_num': [None, '123', None, None, None],
        'txn_type': ['deposit', 'check', 'fee', 'ach', 'deposit']
    })
    
    gl_txns = pd.DataFrame({
        'txn_date': pd.to_datetime(['2024-02-15', '2024-02-20', '2024-02-25', '2024-02-26', '2024-02-27', '2024-02-28']),
        'txn_amount': [1000.00, -500.00, -10.00, -200.00, 750.00, -300.00],
        'txn_description': ['Deposit', 'Check #123', 'Service Fee', 'ACH Payment', 'Deposit', 'Check #456'],
        'check_num': [None, '123', None, None, None, '456'],
        'txn_type': ['deposit', 'check', 'fee', 'ach', 'deposit', 'check']
    })
    
    return bank_stmt, gl_txns

def test_full_reconciliation_flow(sample_data):
    """Test the complete reconciliation flow with sample data"""
    bank_stmt, gl_txns = sample_data
    start_date = datetime(2024, 2, 1)
    end_date = datetime(2024, 2, 29)
    
    with patch('src.bank_reconciliation.load_bank_data', return_value=(gl_txns, bank_stmt)):
        results = reconcile_bank_accounts(1, 100, start_date, end_date)
        assert 'balance_comparison' in results
        assert 'date_analysis' in results
        assert 'pattern_analysis' in results
        assert 'reconciliation_message' in results
        assert 'transactions_in_gl_not_bank' in results
        assert 'transactions_in_bank_not_gl' in results
        assert 'duplicate_gl_transactions' in results
        assert 'duplicate_bank_transactions' in results
        assert 'outlier_company_transactions' in results
        assert 'outlier_bank_transactions' in results
    
    # Verify balance comparison
    balance_comp = results['balance_comparison']
    assert balance_comp['bank_stmt_balance'] == 1040.00
    assert balance_comp['gl_balance'] == 740.00
    assert balance_comp['is_reconciled']
    
    # Verify outstanding items
    outstanding = balance_comp['outstanding_items']
    assert len(outstanding['outstanding_checks']) == 1
    assert outstanding['outstanding_checks'].iloc[0]['check_num'] == '456'

def test_anomaly_detection_integration(sample_data):
    """Test integration of anomaly detection with reconciliation"""
    bank_stmt, gl_txns = sample_data
    
    # Test unmatched entries
    gl_only, bank_only = find_unmatched_entries(gl_txns, bank_stmt)
    assert isinstance(gl_only, pd.DataFrame)
    assert isinstance(bank_only, pd.DataFrame)
    
    # Test duplicates
    gl_dupes = detect_duplicates(gl_txns)
    bank_dupes = detect_duplicates(bank_stmt)
    assert isinstance(gl_dupes, pd.DataFrame)
    assert isinstance(bank_dupes, pd.DataFrame)
    
    # Test outliers
    gl_outliers = detect_outliers_zscore(gl_txns, 'txn_amount')
    bank_outliers = detect_outliers_zscore(bank_stmt, 'txn_amount')
    assert isinstance(gl_outliers, pd.DataFrame)
    assert isinstance(bank_outliers, pd.DataFrame)

def test_complex_scenarios():
    """Test complex reconciliation scenarios"""
    # Create data with various edge cases
    bank_stmt = pd.DataFrame({
        'txn_date': pd.to_datetime(['2024-02-15', '2024-02-15', '2024-02-20']),
        'txn_amount': [1000.00, 1000.00, -500.00],
        'txn_description': ['Deposit', 'Deposit', 'Check #123'],
        'check_num': [None, None, '123'],
        'txn_type': ['deposit', 'deposit', 'check']
    })
    
    gl_txns = pd.DataFrame({
        'txn_date': pd.to_datetime(['2024-02-15', '2024-02-15', '2024-02-20']),
        'txn_amount': [1000.00, 1000.00, -500.00],
        'txn_description': ['Deposit', 'Deposit', 'Check #123'],
        'check_num': [None, None, '123'],
        'txn_type': ['deposit', 'deposit', 'check']
    })
    
    # Test duplicate detection
    gl_dupes = detect_duplicates(gl_txns)
    assert isinstance(gl_dupes, pd.DataFrame)
    
    # Test outlier detection with isolation forest
    gl_outliers = detect_outliers_isolation_forest(gl_txns, 'txn_amount')
    assert isinstance(gl_outliers, pd.DataFrame)

def test_error_handling():
    """Test error handling in integration scenarios"""
    # Test with invalid dates
    with pytest.raises(Exception):
        reconcile_bank_accounts(1, 100, datetime(2024, 2, 29), datetime(2024, 2, 1))
    
    # Test with invalid account IDs
    with pytest.raises(Exception):
        reconcile_bank_accounts(-1, 100, datetime(2024, 2, 1), datetime(2024, 2, 29))
    
    # Test with missing required columns
    invalid_df = pd.DataFrame({'invalid_col': [1, 2, 3]})
    with pytest.raises(Exception):
        find_unmatched_entries(invalid_df, invalid_df)

def test_performance_scenarios():
    """Test performance with larger datasets"""
    n_transactions = 1000
    dates = pd.date_range(start='2024-02-01', end='2024-02-29', periods=n_transactions)
    bank_stmt = pd.DataFrame({
        'txn_date': dates,
        'txn_amount': [1000.00 if i % 2 == 0 else -500.00 for i in range(n_transactions)],
        'txn_description': [f'Transaction {i}' for i in range(n_transactions)],
        'check_num': [None if i % 2 == 0 else str(i) for i in range(n_transactions)],
        'txn_type': ['deposit' if i % 2 == 0 else 'check' for i in range(n_transactions)]
    })
    gl_txns = bank_stmt.copy()
    gl_txns['txn_description'] = [f'Transaction {i}' for i in range(n_transactions)]
    gl_txns['check_num'] = [None if i % 2 == 0 else str(i) for i in range(n_transactions)]
    gl_txns['txn_type'] = ['deposit' if i % 2 == 0 else 'check' for i in range(n_transactions)]
    
    with patch('src.bank_reconciliation.load_bank_data', return_value=(gl_txns, bank_stmt)):
        start_time = datetime.now()
        results = reconcile_bank_accounts(1, 100, datetime(2024, 2, 1), datetime(2024, 2, 29))
        end_time = datetime.now()
        
        assert 'balance_comparison' in results
        assert 'date_analysis' in results
        assert 'pattern_analysis' in results
        assert 'reconciliation_message' in results
        assert 'transactions_in_gl_not_bank' in results
        assert 'transactions_in_bank_not_gl' in results
        assert 'duplicate_gl_transactions' in results
        assert 'duplicate_bank_transactions' in results
        assert 'outlier_company_transactions' in results
        assert 'outlier_bank_transactions' in results
        assert (end_time - start_time).total_seconds() < 5  # Should complete within 5 seconds 