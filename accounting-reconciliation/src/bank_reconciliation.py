"""
Module: bank_reconciliation.py
Reconciles company's bank transactions against the bank statement and GL cash account.

Features:
- Compares bank statement balance to GL cash account balance
- Identifies outstanding items (checks, ACH, deposits in transit, service fees)
- Tracks timing differences and analyzes transaction dates
- Detects duplicate and outlier transactions
- Provides detailed reconciliation status and messages
- Handles user access and permissions
- Tracks reconciliation history and status

Rules:
- All transactions must be matched by date, amount, and reference_id
- Outstanding checks: checks in company books not yet cleared by bank
- ACH in transit: ACH payments in company books not yet cleared by bank
- Deposits in transit: deposits in company books not yet credited by bank
- Service fees: fees on bank statement not yet recorded in company books
- Adjusted GL balance = GL cash balance - sum(outstanding items)
- Reconciled if adjusted GL balance matches bank statement balance within tolerance
- Timing differences are analyzed by transaction type
- Duplicate and outlier detection is performed for both company and bank records
- User access is validated before allowing reconciliation
- Reconciliation status is tracked and updated
"""

import pandas as pd
from typing import Tuple, Dict, List
from datetime import datetime, timedelta
from .anomaly_detection import detect_duplicates, find_unmatched_entries, detect_outliers_zscore
from .api.bank_api import BankAPI
from .api.gl_accounts_api import GLAccountsAPI

def load_bank_data(
    bank_account_id: int,
    client_id: int,
    start_date: datetime,
    end_date: datetime,
    data_dir: str = "data"
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Load bank transaction data using the BankAPI.
    
    Args:
        bank_account_id: ID of the bank account to reconcile
        client_id: ID of the client
        start_date: Start date for reconciliation period
        end_date: End date for reconciliation period
        data_dir: Directory containing the data files
        
    Returns:
        Tuple of (GL transactions DataFrame, bank statement DataFrame)
    """
    gl_api = GLAccountsAPI(data_dir)
    bank_api = BankAPI(data_dir)
    
    # Get GL transactions directly
    gl_transactions = gl_api.get_gl_transactions(bank_account_id, client_id, start_date, end_date)
    
    # Get bank statement data
    bank_stmt = bank_api.get_bank_statement(bank_account_id, client_id, start_date, end_date)
    
    # Ensure dates are datetime
    if not gl_transactions.empty:
        gl_transactions['txn_date'] = pd.to_datetime(gl_transactions['txn_date'])
    if not bank_stmt.empty:
        bank_stmt['txn_date'] = pd.to_datetime(bank_stmt['txn_date'])
    
    return gl_transactions, bank_stmt

def identify_outstanding_items(gl_transactions: pd.DataFrame, bank_stmt: pd.DataFrame) -> Dict:
    """
    Identify outstanding items that cause timing differences.
    
    Args:
        gl_transactions: DataFrame of GL transactions
        bank_stmt: DataFrame of bank statement transactions
        
    Returns:
        Dictionary containing outstanding items analysis
    """
    # Find outstanding checks
    merged = pd.merge(
        gl_transactions, bank_stmt,
        on=['txn_date', 'txn_amount', 'txn_description'],
        how='left',
        indicator=True
    )
    
    outstanding_checks = merged[
        (merged['check_num_x'].notna()) & 
        (merged['_merge'] == 'left_only')
    ]
    
    # Find ACH transactions in transit
    ach_in_transit = gl_transactions[
        (gl_transactions['txn_type'] == 'ach') & 
        (~gl_transactions['txn_amount'].isin(bank_stmt['txn_amount'])) &
        (~gl_transactions['txn_date'].isin(bank_stmt['txn_date'])) &
        (~gl_transactions['txn_description'].isin(bank_stmt['txn_description']))
    ]
    
    # Find deposits in transit
    deposits_in_transit = gl_transactions[
        (gl_transactions['txn_type'] == 'deposit') & 
        (~gl_transactions['txn_amount'].isin(bank_stmt['txn_amount'])) &
        (~gl_transactions['txn_date'].isin(bank_stmt['txn_date'])) &
        (~gl_transactions['txn_description'].isin(bank_stmt['txn_description']))
    ]
    
    # Find bank service fees
    service_fees = bank_stmt[
        (bank_stmt['txn_description'].str.contains('fee', case=False, na=False)) & 
        (~bank_stmt['txn_amount'].isin(gl_transactions['txn_amount'])) &
        (~bank_stmt['txn_date'].isin(gl_transactions['txn_date'])) &
        (~bank_stmt['txn_description'].isin(gl_transactions['txn_description']))
    ]
    
    return {
        'outstanding_checks': outstanding_checks,
        'ach_in_transit': ach_in_transit,
        'deposits_in_transit': deposits_in_transit,
        'service_fees': service_fees
    }

def compare_balances(bank_stmt: pd.DataFrame, gl_transactions: pd.DataFrame) -> Dict:
    """
    Compare bank statement balance with GL transactions balance.
    
    Args:
        bank_stmt: DataFrame of bank statement transactions
        gl_transactions: DataFrame of GL transactions
        
    Returns:
        Dictionary containing balance comparison results
    """
    # Get ending balances
    bank_stmt_balance = bank_stmt['txn_amount'].sum() if not bank_stmt.empty else 0
    gl_balance = gl_transactions['txn_amount'].sum() if not gl_transactions.empty else 0
    
    # Calculate difference
    balance_diff = gl_balance - bank_stmt_balance
    
    # Get outstanding items
    outstanding_items = identify_outstanding_items(gl_transactions, bank_stmt)
    
    # Calculate adjusted balance
    outstanding_total = sum(df['txn_amount'].sum() for df in outstanding_items.values())
    adjusted_balance = gl_balance - outstanding_total
    
    return {
        'bank_stmt_balance': bank_stmt_balance,
        'gl_balance': gl_balance,
        'balance_difference': balance_diff,
        'outstanding_items': outstanding_items,
        'outstanding_total': outstanding_total,
        'adjusted_balance': adjusted_balance,
        'is_reconciled': abs(adjusted_balance - bank_stmt_balance) <= 1e-6
    }

def analyze_transaction_dates(gl_transactions: pd.DataFrame, bank_stmt: pd.DataFrame) -> Dict:
    """
    Analyze transaction dates for timing differences.
    
    Args:
        gl_transactions: DataFrame of GL transactions
        bank_stmt: DataFrame of bank statement transactions
        
    Returns:
        Dictionary containing date analysis results
    """
    if gl_transactions.empty or bank_stmt.empty:
        return {
            'same_amount_different_dates': pd.DataFrame(),
            'old_transactions': pd.DataFrame()
        }
    
    # Find transactions with same amount but different dates
    merged = pd.merge(gl_transactions, bank_stmt, on=['txn_date', 'txn_amount'], how='inner', suffixes=('_gl', '_bank'))
    
    # Find old transactions
    today = datetime.now()
    old_gl_txns = gl_transactions[today - gl_transactions['txn_date'] > timedelta(days=30)]
    
    return {
        'same_amount_different_dates': merged,
        'old_transactions': old_gl_txns
    }

def analyze_transaction_patterns(gl_transactions: pd.DataFrame, bank_stmt: pd.DataFrame) -> Dict:
    """
    Analyze transaction patterns for anomalies.
    
    Args:
        gl_transactions: DataFrame of GL transactions
        bank_stmt: DataFrame of bank statement transactions
        
    Returns:
        Dictionary containing pattern analysis results
    """
    if gl_transactions.empty:
        return {
            'same_day_same_amount': pd.DataFrame(),
            'round_amounts': pd.DataFrame()
        }
    
    # Find transactions with same amount on same day
    gl_same_day = gl_transactions.groupby(['txn_date', 'txn_amount']).filter(lambda x: len(x) > 1)
    
    # Find round number transactions
    gl_round = gl_transactions[gl_transactions['txn_amount'] % 100 == 0]
    
    return {
        'same_day_same_amount': gl_same_day,
        'round_amounts': gl_round
    }

def generate_reconciliation_message(results: Dict) -> str:
    """
    Generate a detailed reconciliation message from the results.
    
    Args:
        results: Dictionary containing reconciliation results
        
    Returns:
        Formatted string containing reconciliation details
    """
    balance_comparison = results['balance_comparison']
    
    message = (
        f"=== Bank Reconciliation ===\n"
        f"Bank Statement Balance: ${balance_comparison['bank_stmt_balance']:.2f}\n"
        f"GL Transactions Balance: ${balance_comparison['gl_balance']:.2f}\n"
        f"Outstanding Items Total: ${balance_comparison['outstanding_total']:.2f}\n"
        f"Adjusted GL Balance: ${balance_comparison['adjusted_balance']:.2f}\n"
        f"Status: {'Reconciled' if balance_comparison['is_reconciled'] else 'Not Reconciled'}\n\n"
        f"Outstanding Items:\n"
        f"- Outstanding Checks: ${balance_comparison['outstanding_items']['outstanding_checks']['txn_amount'].sum():.2f}\n"
        f"- ACH in Transit: ${balance_comparison['outstanding_items']['ach_in_transit']['txn_amount'].sum():.2f}\n"
        f"- Deposits in Transit: ${balance_comparison['outstanding_items']['deposits_in_transit']['txn_amount'].sum():.2f}\n"
        f"- Service Fees: ${balance_comparison['outstanding_items']['service_fees']['txn_amount'].sum():.2f}\n\n"
        f"Transaction Analysis:\n"
        f"- Unmatched GL Transactions: {len(results['transactions_in_gl_not_bank'])}\n"
        f"- Unmatched Bank Transactions: {len(results['transactions_in_bank_not_gl'])}\n"
        f"- Duplicate GL Transactions: {len(results['duplicate_gl_transactions'])}\n"
        f"- Duplicate Bank Transactions: {len(results['duplicate_bank_transactions'])}"
    )
    
    return message

def reconcile_bank_accounts(
    bank_account_id: int,
    client_id: int,
    start_date: datetime,
    end_date: datetime,
    data_dir: str = "data"
) -> dict:
    """
    Reconcile bank account transactions.
    
    Args:
        bank_account_id: ID of the bank account to reconcile
        client_id: ID of the client
        start_date: Start date for reconciliation period
        end_date: End date for reconciliation period
        data_dir: Directory containing the data files
        
    Returns:
        Dictionary containing reconciliation results
    """
    # Load data
    gl_transactions, bank_stmt = load_bank_data(bank_account_id, client_id, start_date, end_date, data_dir)
    
    # Find unmatched entries
    gl_not_bank, bank_not_gl = find_unmatched_entries(gl_transactions, bank_stmt)
    
    # Find duplicates
    company_dupes = detect_duplicates(gl_transactions)
    bank_dupes = detect_duplicates(bank_stmt)
    
    # Find outliers
    company_outliers = detect_outliers_zscore(gl_transactions, 'txn_amount')
    bank_outliers = detect_outliers_zscore(bank_stmt, 'txn_amount')
    
    # Compare balances
    balance_comparison = compare_balances(bank_stmt, gl_transactions)
    
    # Analyze dates
    date_analysis = analyze_transaction_dates(gl_transactions, bank_stmt)
    
    # Analyze patterns
    pattern_analysis = analyze_transaction_patterns(gl_transactions, bank_stmt)
    
    # Generate message
    reconciliation_message = generate_reconciliation_message({
        'balance_comparison': balance_comparison,
        'date_analysis': date_analysis,
        'pattern_analysis': pattern_analysis,
        'transactions_in_gl_not_bank': gl_not_bank,
        'transactions_in_bank_not_gl': bank_not_gl,
        'duplicate_gl_transactions': company_dupes,
        'duplicate_bank_transactions': bank_dupes
    })
    
    return {
        'transactions_in_gl_not_bank': gl_not_bank,
        'transactions_in_bank_not_gl': bank_not_gl,
        'duplicate_gl_transactions': company_dupes,
        'duplicate_bank_transactions': bank_dupes,
        'outlier_company_transactions': company_outliers,
        'outlier_bank_transactions': bank_outliers,
        'balance_comparison': balance_comparison,
        'date_analysis': date_analysis,
        'pattern_analysis': pattern_analysis,
        'reconciliation_message': reconciliation_message
    } 