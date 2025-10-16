import pytest
import pandas as pd
from datetime import datetime, timedelta
from src.bank_reconciliation import (
    load_bank_data,
    identify_outstanding_items,
    compare_balances,
    analyze_transaction_dates,
    analyze_transaction_patterns,
    generate_reconciliation_message,
    reconcile_bank_accounts
)
from src.anomaly_detection import detect_outliers_zscore

@pytest.fixture
def sample_bank_statement():
    return pd.DataFrame({
        'row_id': [1, 2, 3],
        'client_id': [100, 100, 100],
        'bank_account_id': [1, 1, 1],
        'stmt_generated_date': ['2024-03-01', '2024-03-01', '2024-03-01'],
        'stmt_start_date': ['2024-02-01', '2024-02-01', '2024-02-01'],
        'stmt_end_date': ['2024-02-29', '2024-02-29', '2024-02-29'],
        'txn_date': ['2024-02-15', '2024-02-20', '2024-02-25'],
        'description': ['Deposit', 'Check #123', 'Service Fee'],
        'amount': [1000.00, -500.00, -10.00]
    })

@pytest.fixture
def sample_gl_transactions():
    return pd.DataFrame({
        'banktxn_id': [1, 2, 3],
        'created_at': ['2024-02-15', '2024-02-20', '2024-02-25'],
        'client_id': [100, 100, 100],
        'bank_account_id': [1, 1, 1],
        'txn_date': ['2024-02-15', '2024-02-20', '2024-02-25'],
        'txn_description': ['Deposit', 'Check #123', 'Service Fee'],
        'check_num': [None, '123', None],
        'txn_amount': [1000.00, -500.00, -10.00],
        'txn_type': ['deposit', 'check', 'fee']
    })

def test_load_bank_data_empty():
    # This test is a placeholder, as load_bank_data requires actual API/data files
    pass

def test_identify_outstanding_items():
    bank_stmt = pd.DataFrame({
        'txn_date': ['2024-02-15', '2024-02-20'],
        'txn_amount': [1000.00, -500.00],
        'txn_description': ['Deposit', 'Check #123']
    })
    gl_txns = pd.DataFrame({
        'txn_date': ['2024-02-15', '2024-02-20', '2024-02-25'],
        'txn_amount': [1000.00, -500.00, -750.00],
        'txn_description': ['Deposit', 'Check #123', 'Check #456'],
        'check_num': [None, '123', '456'],
        'txn_type': ['deposit', 'check', 'check']
    })
    results = identify_outstanding_items(gl_txns, bank_stmt)
    assert len(results['outstanding_checks']) == 1
    assert results['outstanding_checks'].iloc[0]['check_num'] == '456'
    assert len(results['ach_in_transit']) == 0
    assert len(results['deposits_in_transit']) == 0
    assert len(results['service_fees']) == 0

def test_compare_balances():
    bank_stmt = pd.DataFrame({
        'txn_date': ['2024-02-15', '2024-02-20', '2024-02-25'],
        'txn_amount': [1000.00, -500.00, -10.00],
        'txn_description': ['Deposit', 'Check #123', 'Service Fee']
    })
    gl_txns = pd.DataFrame({
        'txn_date': ['2024-02-15', '2024-02-20', '2024-02-25'],
        'txn_amount': [1000.00, -500.00, -750.00],
        'txn_type': ['deposit', 'check', 'check'],
        'check_num': [None, '123', '456'],
        'txn_description': ['Deposit', 'Check #123', 'Check #456']
    })
    results = compare_balances(bank_stmt, gl_txns)
    assert results['bank_stmt_balance'] == 490.00
    assert results['gl_balance'] == -250.00
    assert results['balance_difference'] == -740.00
    assert not results['is_reconciled']

def test_analyze_transaction_dates():
    bank_stmt = pd.DataFrame({
        'txn_date': pd.to_datetime(['2024-02-15', '2024-02-20']),
        'txn_amount': [1000.00, -500.00],
        'txn_description': ['Deposit', 'Check #123']
    })
    gl_txns = pd.DataFrame({
        'txn_date': pd.to_datetime(['2024-02-15', '2024-02-20', '2024-01-15']),
        'txn_amount': [1000.00, -500.00, 750.00],
        'txn_description': ['Deposit', 'Check #123', 'Old Deposit']
    })
    results = analyze_transaction_dates(gl_txns, bank_stmt)
    assert isinstance(results['same_amount_different_dates'], pd.DataFrame)
    assert isinstance(results['old_transactions'], pd.DataFrame)

def test_analyze_transaction_patterns():
    gl_txns = pd.DataFrame({
        'txn_date': ['2024-02-15', '2024-02-15', '2024-02-20'],
        'txn_amount': [1000.00, 1000.00, 500.00],
        'txn_type': ['deposit', 'deposit', 'check'],
        'check_num': [None, None, '123'],
        'txn_description': ['Deposit', 'Deposit', 'Check #123']
    })
    results = analyze_transaction_patterns(gl_txns, pd.DataFrame())
    assert len(results['same_day_same_amount']) == 2
    assert len(results['round_amounts']) == 3  # All amounts (1000, 1000, 500) are round

def test_generate_reconciliation_message():
    results = {
        'balance_comparison': {
            'bank_stmt_balance': 490.00,
            'gl_balance': -250.00,
            'outstanding_total': 740.00,
            'adjusted_balance': 490.00,
            'is_reconciled': True,
            'outstanding_items': {
                'outstanding_checks': pd.DataFrame({'txn_amount': [500.00]}),
                'ach_in_transit': pd.DataFrame({'txn_amount': [200.00]}),
                'deposits_in_transit': pd.DataFrame({'txn_amount': [40.00]}),
                'service_fees': pd.DataFrame({'txn_amount': [0.00]})
            }
        },
        'transactions_in_gl_not_bank': pd.DataFrame(),
        'transactions_in_bank_not_gl': pd.DataFrame(),
        'duplicate_gl_transactions': pd.DataFrame(),
        'duplicate_bank_transactions': pd.DataFrame()
    }
    message = generate_reconciliation_message(results)
    assert 'Bank Statement Balance: $490.00' in message
    assert 'Status: Reconciled' in message

def test_reconcile_bank_accounts():
    # This test is a placeholder, as reconcile_bank_accounts requires actual API/data files
    pass

def test_edge_cases():
    # Empty DataFrames with all expected columns
    empty_df = pd.DataFrame({
        'txn_date': [],
        'txn_amount': [],
        'txn_description': [],
        'check_num': [],
        'txn_type': []
    })
    results = identify_outstanding_items(empty_df, empty_df)
    assert all(len(df) == 0 for df in results.values())
    # Single transaction with all columns
    single_txn = pd.DataFrame({
        'txn_date': ['2024-02-15'],
        'txn_amount': [1000.00],
        'txn_description': ['Deposit'],
        'check_num': [None],
        'txn_type': ['deposit']
    })
    results = compare_balances(single_txn, single_txn)
    assert results['is_reconciled']
    # Large amounts
    large_txns = pd.DataFrame({
        'txn_amount': [1000000.00, -500000.00],
        'txn_date': ['2024-02-15', '2024-02-16'],
        'txn_description': ['Big Deposit', 'Big Check'],
        'check_num': [None, '999'],
        'txn_type': ['deposit', 'check']
    })
    results = detect_outliers_zscore(large_txns, 'txn_amount')
    assert len(results) == 0  # No outliers since amounts are proportional 