import pytest
import pandas as pd
from datetime import datetime, timedelta

@pytest.fixture
def sample_bank_statement():
    """Create a sample bank statement for testing"""
    return pd.DataFrame({
        'row_id': range(1, 6),
        'client_id': [100] * 5,
        'bank_account_id': [1] * 5,
        'stmt_generated_date': ['2024-03-01'] * 5,
        'stmt_start_date': ['2024-02-01'] * 5,
        'stmt_end_date': ['2024-02-29'] * 5,
        'txn_date': ['2024-02-15', '2024-02-20', '2024-02-25', '2024-02-26', '2024-02-27'],
        'description': ['Deposit', 'Check #123', 'Service Fee', 'ACH Payment', 'Deposit'],
        'amount': [1000.00, -500.00, -10.00, -200.00, 750.00]
    })

@pytest.fixture
def sample_gl_transactions():
    """Create sample GL transactions for testing"""
    return pd.DataFrame({
        'banktxn_id': range(1, 7),
        'created_at': ['2024-02-15', '2024-02-20', '2024-02-25', '2024-02-26', '2024-02-27', '2024-02-28'],
        'client_id': [100] * 6,
        'bank_account_id': [1] * 6,
        'txn_date': ['2024-02-15', '2024-02-20', '2024-02-25', '2024-02-26', '2024-02-27', '2024-02-28'],
        'txn_description': ['Deposit', 'Check #123', 'Service Fee', 'ACH Payment', 'Deposit', 'Check #456'],
        'check_num': [None, '123', None, None, None, '456'],
        'txn_amount': [1000.00, -500.00, -10.00, -200.00, 750.00, -300.00],
        'txn_type': ['deposit', 'check', 'fee', 'ach', 'deposit', 'check']
    })

@pytest.fixture
def sample_dates():
    """Create sample dates for testing"""
    return {
        'start_date': datetime(2024, 2, 1),
        'end_date': datetime(2024, 2, 29),
        'mid_date': datetime(2024, 2, 15)
    }

@pytest.fixture
def sample_transactions_with_duplicates():
    """Create sample transactions with duplicates for testing"""
    return pd.DataFrame({
        'txn_date': ['2024-02-15', '2024-02-15', '2024-02-20', '2024-02-20'],
        'txn_amount': [1000.00, 1000.00, -500.00, -500.00],
        'txn_description': ['Deposit', 'Deposit', 'Check #123', 'Check #123'],
        'check_num': [None, None, '123', '123'],
        'txn_type': ['deposit', 'deposit', 'check', 'check']
    })

@pytest.fixture
def sample_transactions_with_outliers():
    """Create sample transactions with outliers for testing"""
    return pd.DataFrame({
        'txn_date': ['2024-02-15', '2024-02-20', '2024-02-25'],
        'txn_amount': [1000.00, -500.00, 5000.00],
        'txn_description': ['Deposit', 'Check #123', 'Large Payment'],
        'check_num': [None, '123', None],
        'txn_type': ['deposit', 'check', 'payment']
    }) 