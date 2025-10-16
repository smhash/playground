import os
from pathlib import Path
from typing import Dict, Any
from datetime import datetime

from .bank_reconciliation import load_bank_data, reconcile_bank_accounts
from .ar_reconciliation import load_ar_data, reconcile_ar
from .ap_reconciliation import load_ap_data, reconcile_ap
from .fa_reconciliation import load_fa_data, reconcile_fixed_assets
from .prepaid_reconciliation import load_prepaid_data, reconcile_prepaid_expenses
from .accrued_reconciliation import load_accrued_data, reconcile_accrued_expenses
from .cash_equivalents_reconciliation import load_cash_equivalents_data, reconcile_cash_equivalents
from .inventory_reconciliation import (
    load_inventory_data,
    reconcile_inventory
)

def run_all_reconciliations(data_dir: str) -> Dict[str, Any]:
    """
    Run all reconciliation processes and return results.
    
    Args:
        data_dir: Path to directory containing all CSV files
        
    Returns:
        Dictionary containing results from all reconciliations
    """
    results = {}
    
    # Cash Equivalents Reconciliation
    results['cash_equivalents'] = reconcile_cash_equivalents(
        os.path.join(data_dir, 'gl_cash_equivalents.csv'),
        os.path.join(data_dir, 'broker_statements.csv'),
        os.path.join(data_dir, 'investment_details.csv')
    )
    
    # Inventory Reconciliation
    gl_inventory, physical_counts, market_values, ap_transactions = load_inventory_data(
        os.path.join(data_dir, "gl_inventory.csv"),
        os.path.join(data_dir, "physical_counts.csv"),
        os.path.join(data_dir, "market_values.csv"),
        os.path.join(data_dir, "ap_transactions.csv")
    )
    results['inventory'] = reconcile_inventory(
        gl_inventory,
        physical_counts,
        market_values,
        ap_transactions,
        cutoff_date=datetime(2024, 3, 31)
    )
    
    # AR Reconciliation
    ar_subledger, gl_ar, allowance = load_ar_data(
        os.path.join(data_dir, "accounts_receivable.csv"),
        os.path.join(data_dir, "gl_accounts_receivable.csv"),
        os.path.join(data_dir, "allowance_for_doubtful_accounts.csv")
    )
    results['ar'] = reconcile_ar(ar_subledger, gl_ar, allowance)
    
    # AP Reconciliation
    ap_subledger, gl_ap, credit_card, batch_payments = load_ap_data(
        os.path.join(data_dir, "accounts_payable.csv"),
        os.path.join(data_dir, "gl_accounts_payable.csv")
    )
    results['ap'] = reconcile_ap(ap_subledger, gl_ap, credit_card, batch_payments)
    
    # Fixed Assets Reconciliation
    fa_register, gl_fa, gl_depreciation = load_fa_data(
        os.path.join(data_dir, "fixed_assets.csv"),
        os.path.join(data_dir, "gl_fixed_assets.csv"),
        os.path.join(data_dir, "gl_depreciation.csv")
    )
    results['fixed_assets'] = reconcile_fixed_assets(
        fa_register,
        gl_fa,
        gl_depreciation,
        start_date=datetime(2024, 1, 1),
        end_date=datetime(2024, 3, 31)
    )
    
    # Prepaid and accrued expenses reconciliation
    prepaid_schedule, gl_prepaid = load_prepaid_data(
        os.path.join(data_dir, "prepaid_expenses.csv"),
        os.path.join(data_dir, "gl_prepaid_expenses.csv")
    )
    results['prepaid'] = reconcile_prepaid_expenses(prepaid_schedule, gl_prepaid)
    
    accrued_schedule, gl_accrued = load_accrued_data(
        os.path.join(data_dir, "accrued_expenses.csv"),
        os.path.join(data_dir, "gl_accrued_expenses.csv")
    )
    results['accrued'] = reconcile_accrued_expenses(accrued_schedule, gl_accrued)
    
    return results

def print_results(results: Dict):
    """Print reconciliation results in a readable format."""
    print("\n=== Cash Equivalents Reconciliation ===")
    print(results['cash_equivalents']['reconciliation_message'])
    
    # Print maturity validation
    maturity = results['cash_equivalents']['maturity_validation']
    print("\nMaturity Validation:")
    print(f"Total Amount: ${maturity['total_amount']:.2f}")
    print(f"Compliant Amount: ${maturity['compliant_amount']:.2f}")
    print(f"Non-compliant Amount: ${maturity['total_amount'] - maturity['compliant_amount']:.2f}")
    
    # Print market analysis
    market = results['cash_equivalents']['market_value_analysis']
    print("\nMarket Analysis:")
    print(f"Total Book Value: ${market['total_book_value']:.2f}")
    print(f"Total Market Value: ${market['total_market_value']:.2f}")
    print(f"Total Unrealized Gain/Loss: ${market['total_unrealized_gain_loss']:.2f}")
    print(f"Total Return: {market['total_return']:.2%}")
    
    # Print yield analysis
    yield_analysis = results['cash_equivalents']['yield_analysis']
    print("\nYield Analysis:")
    print(f"Average Yield: {yield_analysis['average_yield']:.2%}")
    print(f"Highest Yield: {yield_analysis['highest_yield']:.2%}")
    print(f"Lowest Yield: {yield_analysis['lowest_yield']:.2%}")
    
    # Print concentration analysis
    concentration = results['cash_equivalents']['concentration_analysis']
    print("\nHigh Concentration Types (>10%):")
    print(concentration['high_concentration_types'])
    print("\nHigh Concentration Issuers (>10%):")
    print(concentration['high_concentration_issuers'])
    
    print("\n=== Inventory Reconciliation ===")
    print(results['inventory']['reconciliation_message'])
    
    # Print detailed inventory analysis
    print("\nPhysical Count Analysis:")
    count_analysis = results['inventory']['count_analysis']
    print(f"Total Discrepancy Value: ${count_analysis['total_discrepancy_value']:.2f}")
    print(f"Discrepancy Count: {count_analysis['discrepancy_count']}")
    print("\nCount Summary:")
    print(count_analysis['count_summary'])
    
    print("\nObsolescence Analysis:")
    obsolescence = results['inventory']['obsolescence_analysis']
    print(f"Total Obsolescence: ${obsolescence['total_obsolescence']:.2f}")
    print(f"Total Write-down: ${obsolescence['total_write_down']:.2f}")
    print("\nAge Summary:")
    print(obsolescence['age_summary'])
    
    print("\nLCM Analysis:")
    lcm = results['inventory']['lcm_analysis']
    print(f"Total LCM Adjustment: ${lcm['total_lcm_adjustment']:.2f}")
    print("\nLCM Summary:")
    print(lcm['lcm_summary'])
    
    if results['inventory']['cutoff_analysis']:
        print("\nCut-off Analysis:")
        cutoff = results['inventory']['cutoff_analysis']
        print(f"Total Accrual: ${cutoff['total_accrual']:.2f}")
        print("\nIn-transit Summary:")
        print(cutoff['in_transit_summary'])
    
    print("\n=== AR Reconciliation ===")
    print(f"Entries in AR not found in GL: {len(results['ar']['entries_in_ar_not_gl'])}")
    print(f"Entries in GL not found in AR: {len(results['ar']['entries_in_gl_not_ar'])}")
    print(f"Duplicate AR entries: {len(results['ar']['duplicate_ar_entries'])}")
    print(f"Duplicate GL entries: {len(results['ar']['duplicate_gl_entries'])}")
    print(f"Balance difference: ${results['ar']['balance_difference']:.2f}")
    print(f"Fully reconciled: {results['ar']['is_fully_reconciled']}")
    
    # Print aging analysis
    aging = results['ar']['aging_analysis']
    print("\nAR Aging Analysis:")
    print(f"Current: ${aging['aging_totals']['current']:.2f}")
    print(f"31-60 days: ${aging['aging_totals']['31-60_days']:.2f}")
    print(f"61-90 days: ${aging['aging_totals']['61-90_days']:.2f}")
    print(f"Over 90 days: ${aging['aging_totals']['over_90_days']:.2f}")
    print(f"Total Outstanding: ${aging['total_outstanding']:.2f}")
    
    # Print write-off analysis
    write_off = results['ar']['write_off_analysis']
    print("\nWrite-off Analysis:")
    print(f"Allowance Balance: ${write_off['allowance_balance']:.2f}")
    print(f"Write-off Ratio: {write_off['write_off_ratio']:.2%}")
    if not write_off['unrecorded_write_offs'].empty:
        print("\nUnrecorded Write-offs:")
        print(write_off['unrecorded_write_offs'])
    
    # Print accrued entry analysis
    accrued = results['ar']['accrued_analysis']
    print("\nAccrued Entry Analysis:")
    print(f"Accrued Impact: ${accrued['accrued_impact']:.2f}")
    if not accrued['unmatched_accrued_ar'].empty:
        print("\nUnmatched Accrued Entries in AR:")
        print(accrued['unmatched_accrued_ar'])
    if not accrued['unmatched_accrued_gl'].empty:
        print("\nUnmatched Accrued Entries in GL:")
        print(accrued['unmatched_accrued_gl'])
    
    # Print high concentration customers
    print("\nCustomers with High Concentration (>10%):")
    print(results['ar']['payment_analysis']['high_concentration_customers'])
    
    print("\n=== AP Reconciliation ===")
    print(f"Entries in AP not found in GL: {len(results['ap']['entries_in_ap_not_gl'])}")
    print(f"Entries in GL not found in AP: {len(results['ap']['entries_in_gl_not_ap'])}")
    print(f"Duplicate AP entries: {len(results['ap']['duplicate_ap_entries'])}")
    print(f"Duplicate GL entries: {len(results['ap']['duplicate_gl_entries'])}")
    print(f"Balance difference: ${results['ap']['balance_difference']:.2f}")
    print(f"Fully reconciled: {results['ap']['is_fully_reconciled']}")
    
    # Print AP aging analysis
    aging = results['ap']['aging_analysis']
    print("\nAP Aging Analysis:")
    print(f"Current: ${aging['aging_totals']['current']:.2f}")
    print(f"31-60 days: ${aging['aging_totals']['31-60_days']:.2f}")
    print(f"61-90 days: ${aging['aging_totals']['61-90_days']:.2f}")
    print(f"Over 90 days: ${aging['aging_totals']['over_90_days']:.2f}")
    print(f"Total Outstanding: ${aging['total_outstanding']:.2f}")
    
    # Print high concentration vendors
    print("\nVendors with High Concentration (>10%):")
    print(results['ap']['payment_analysis']['high_concentration_vendors'])
    
    print("\n=== Prepaid Expenses Reconciliation ===")
    print(f"Entries in Prepaid not found in GL: {len(results['prepaid']['entries_in_prepaid_not_gl'])}")
    print(f"Entries in GL not found in Prepaid: {len(results['prepaid']['entries_in_gl_not_prepaid'])}")
    print(f"Duplicate Prepaid entries: {len(results['prepaid']['duplicate_prepaid_entries'])}")
    print(f"Duplicate GL entries: {len(results['prepaid']['duplicate_gl_entries'])}")
    print(f"Balance difference: ${results['prepaid']['balance_difference']:.2f}")
    print(f"Fully reconciled: {results['prepaid']['is_fully_reconciled']}")
    
    print("\n=== Accrued Expenses Reconciliation ===")
    print(f"Entries in Accrued not found in GL: {len(results['accrued']['entries_in_accrued_not_gl'])}")
    print(f"Entries in GL not found in Accrued: {len(results['accrued']['entries_in_gl_not_accrued'])}")
    print(f"Duplicate Accrued entries: {len(results['accrued']['duplicate_accrued_entries'])}")
    print(f"Duplicate GL entries: {len(results['accrued']['duplicate_gl_entries'])}")
    print(f"Balance difference: ${results['accrued']['balance_difference']:.2f}")
    print(f"Fully reconciled: {results['accrued']['is_fully_reconciled']}")

def main():
    """Run all reconciliation processes."""
    # Set up data directory
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    
    # Set reconciliation period
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2024, 3, 31)
    
    # Bank reconciliation
    bank_account_id = 1  # Example bank account ID
    bank_results = reconcile_bank_accounts(
        bank_account_id=bank_account_id,
        start_date=start_date,
        end_date=end_date,
        data_dir=data_dir
    )
    print("\nBank Reconciliation Results:")
    print(bank_results['reconciliation_message'])
    
    # Run all other reconciliations
    results = run_all_reconciliations(data_dir)
    
    # Print all results
    print_results(results)

if __name__ == "__main__":
    main() 