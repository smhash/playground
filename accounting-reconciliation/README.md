# Accounting Reconciliation Tool

This Python project provides an automated solution for common accounting reconciliation tasks and anomaly detection. It helps reconcile various subledger records with their corresponding general ledger (GL) accounts and identifies potential issues like missing entries, duplicates, or unusual amounts.

## Features

- Bank reconciliation
- Accounts Receivable (AR) reconciliation
- Accounts Payable (AP) reconciliation
- Fixed Assets reconciliation
- Prepaid Expenses reconciliation
- Accrued Expenses reconciliation
- Anomaly detection (duplicates, outliers)

## Installation

1. Clone this repository
2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

1. Place your CSV files in the `data/` directory:
   - `bank_transactions.csv` and `bank_statement.csv`
   - `accounts_receivable.csv` and `gl_accounts_receivable.csv`
   - `accounts_payable.csv` and `gl_accounts_payable.csv`
   - `fixed_assets.csv` and `gl_fixed_assets.csv`
   - `prepaid_expenses.csv` and `gl_prepaid_expenses.csv`
   - `accrued_expenses.csv` and `gl_accrued_expenses.csv`

2. Run the main script:
```bash
python -m src.main
```

## CSV File Formats

### Bank Transactions
- date: Transaction date
- description: Transaction description
- amount: Transaction amount
- reference_id: Unique transaction reference

### Accounts Receivable
- invoice_id: Unique invoice identifier
- customer: Customer name
- date: Invoice date
- amount: Invoice amount

### Accounts Payable
- bill_id: Unique bill identifier
- vendor: Vendor name
- date: Bill date
- amount: Bill amount

### Fixed Assets
- asset_id: Unique asset identifier
- name: Asset name
- purchase_date: Purchase date
- value: Asset value

### Prepaid Expenses
- prepaid_id: Unique prepaid item identifier
- description: Item description
- date: Payment date
- remaining_amount: Remaining unamortized amount

### Accrued Expenses
- accrual_id: Unique accrual identifier
- description: Accrual description
- date: Accrual date
- amount: Accrued amount

## Output

The script will print reconciliation results for each category, including:
- Unmatched entries
- Duplicate entries
- Outlier amounts
- Balance differences

## Development

The project is organized into modules:
- `anomaly_detection.py`: Core anomaly detection functions
- `bank_reconciliation.py`: Bank reconciliation logic
- `ar_reconciliation.py`: AR reconciliation logic
- `ap_reconciliation.py`: AP reconciliation logic
- `fa_reconciliation.py`: Fixed assets reconciliation logic
- `prepaid_reconciliation.py`: Prepaid expenses reconciliation logic
- `accrued_reconciliation.py`: Accrued expenses reconciliation logic
- `main.py`: Main driver script

## Accounts Receivable Reconciliation

The AR reconciliation module provides comprehensive reconciliation of accounts receivable with the following features:

#### Core Reconciliation
- Matches AR subledger entries against GL entries
- Identifies missing or duplicate entries
- Calculates balance differences
- Validates GAAP compliance for accrual accounting

#### Aging Analysis
- Categorizes outstanding invoices into aging buckets:
  - Current (0-30 days)
  - 31-60 days
  - 61-90 days
  - Over 90 days
- Tracks total outstanding amounts by aging category

#### Customer Analysis
- Monitors customer payment patterns
- Identifies high-concentration customers (>10% of total AR)
- Tracks customers with multiple outstanding invoices
- Analyzes payment trends and relationships

#### Write-off Analysis
- Tracks write-offs and adjustments
- Monitors allowance for doubtful accounts
- Validates write-off amounts
- Maintains write-off history

#### Accrued Entry Analysis
- Validates accrued revenue entries
- Ensures proper period matching
- Tracks accrual reversals
- Maintains accrual audit trail

#### Anomaly Detection
- Identifies duplicate entries
- Detects unusual amounts using statistical analysis
- Flags potential errors or fraud indicators

#### GAAP Compliance
- Validates accrual accounting periods
- Ensures proper period matching
- Identifies period mismatches
- Maintains audit trail

#### Data Requirements
- AR subledger entries (CSV)
- GL accounts receivable entries (CSV)
- Write-off records (optional CSV)
- Accrual records (optional CSV)

Required columns in AR data:
- invoice_id: Unique identifier
- date: Transaction date
- amount: Invoice amount
- customer_id: Customer identifier
- payment_status: Payment status (e.g., 'paid', 'unpaid')

## Accounts Payable Reconciliation

The AP reconciliation module provides comprehensive reconciliation of accounts payable with the following features:

#### Core Reconciliation
- Matches AP subledger entries against GL entries
- Identifies missing or duplicate entries
- Calculates balance differences
- Validates GAAP compliance for accrual accounting

#### Aging Analysis
- Categorizes outstanding bills into aging buckets:
  - Current (0-30 days)
  - 31-60 days
  - 61-90 days
  - Over 90 days
- Tracks total outstanding amounts by aging category

#### Vendor Analysis
- Monitors vendor payment patterns
- Identifies high-concentration vendors (>10% of total AP)
- Tracks vendors with multiple outstanding invoices
- Analyzes payment trends and relationships

#### Credit Card Reconciliation
- Matches credit card transactions with AP entries
- Identifies unmatched charges and entries
- Validates payment amounts
- Tracks reconciliation status

#### Batch Payment Processing
- Monitors batch payment runs
- Tracks payment status (processed, failed, pending)
- Validates batch totals
- Identifies unprocessed payments

#### Anomaly Detection
- Identifies duplicate entries
- Detects unusual amounts using statistical analysis
- Flags potential errors or fraud indicators

#### GAAP Compliance
- Validates accrual accounting periods
- Ensures proper period matching
- Identifies period mismatches
- Maintains audit trail

#### Data Requirements
- AP subledger entries (CSV)
- GL accounts payable entries (CSV)
- Credit card statements (optional CSV)
- Batch payment records (optional CSV)

Required columns in AP data:
- bill_id: Unique identifier
- date: Transaction date
- amount: Payment amount
- vendor_id: Vendor identifier
- payment_method: Payment type (e.g., 'credit_card')

## Bank Reconciliation

The bank reconciliation module (`src/bank_reconciliation.py`) provides comprehensive reconciliation of bank statements with GL cash accounts.

### Core Features

1. **Transaction Matching**
   - Matches bank statement transactions with GL entries
   - Handles multiple matching criteria (amount, date, description)
   - Identifies unmatched transactions
   - Detects duplicate entries
   - Tracks transaction patterns

2. **Balance Reconciliation**
   - Compares bank statement balance with GL cash balance
   - Tracks outstanding items:
     - Outstanding checks
     - ACH in transit
     - Deposits in transit
     - Service fees
   - Calculates adjusted GL balance
   - Validates reconciliation status

3. **Date Analysis**
   - Validates transaction dates
   - Identifies timing differences
   - Tracks cut-off issues
   - Monitors posting delays

4. **Pattern Analysis**
   - Analyzes transaction patterns
   - Identifies unusual activity
   - Tracks recurring transactions
   - Monitors transaction volumes

5. **Data Validation**
   - Validates CSV file formats
   - Handles missing data
   - Processes different encodings
   - Manages large datasets

### Data Requirements

1. Bank Statement (bank_transactions.csv):
   - txn_id: Unique identifier
   - txn_date: Transaction date
   - txn_amount: Transaction amount
   - txn_description: Transaction description
   - check_num: Check number (if applicable)

2. GL Cash Account (gl_cash_account.csv):
   - txn_id: Unique identifier
   - txn_date: Transaction date
   - txn_amount: Transaction amount
   - txn_source: Transaction source
   - txn_description: Transaction description
   - check_num: Check number (if applicable)

3. Bank Accounts (Bank_Accounts.csv):
   - bank_account_id: Unique identifier
   - account_number: Bank account number
   - account_name: Account name
   - account_type: Type of account

4. Bank Reconcile (Bank_Reconcile.csv):
   - bank_account_id: Unique identifier
   - reconcile_date: Reconciliation date
   - statement_balance: Bank statement balance
   - gl_balance: GL cash balance

5. User Access (User_Access.csv):
   - user_id: Unique identifier
   - bank_account_id: Bank account ID
   - access_level: Access level

### Usage Example

```python
from src.bank_reconciliation import reconcile_bank_accounts
from datetime import datetime

# Perform bank reconciliation
results = reconcile_bank_accounts(
    bank_account_id=1,
    start_date=datetime(2024, 1, 1),
    end_date=datetime(2024, 3, 31),
    data_dir="data"
)

# Print results
print(results['reconciliation_message'])
```

### Output

The reconciliation results include:

- **Balance Comparison**: Bank statement balance, GL cash balance, outstanding items total, and adjusted GL balance
- **Outstanding Items**: Breakdown of outstanding checks, ACH in transit, deposits in transit, and service fees
- **Transaction Analysis**: Counts of unmatched and duplicate transactions
- **Reconciliation Status**: Overall reconciliation status (Reconciled/Not Reconciled)

### Error Handling

The module handles various error conditions:
- Missing or malformed CSV files
- Invalid data types
- Duplicate transactions
- Outlier detection
- Unicode characters
- NaN values
- Date edge cases
- Amount edge cases

### Testing

The module includes comprehensive test coverage:
- Unit tests for individual functions
- Integration tests for end-to-end reconciliation
- Edge case testing
- Error condition testing
- Performance testing with large datasets

## Cash Equivalents Reconciliation

The cash equivalents reconciliation module (`src/cash_equivalents_reconciliation.py`) reconciles short-term investments and cash equivalents against GL accounts and broker statements, ensuring compliance with accounting standards.

### Core Reconciliation Logic

The module performs the following key reconciliations:

1. **Maturity Validation**: Ensures all investments comply with the 90-day maturity requirement.
2. **Market Value Analysis**: Tracks book value vs market value, calculates unrealized gains/losses, and analyzes performance.
3. **Yield Analysis**: Calculates yields based on market values and holding periods, summarizing yields by instrument type.
4. **Concentration Analysis**: Assesses investment concentration by instrument type and issuer, identifying high concentrations.
5. **Reconciliation Features**: Matches GL entries against broker statements, validates maturity periods, tracks market values, and monitors investment yields.

### Data Requirements

The module requires the following CSV files:

- **GL Cash Equivalents** (`gl_cash_equivalents.csv`): Contains GL entries for cash equivalents.
- **Broker Statements** (`broker_statements.csv`): Contains broker statement data.
- **Investment Details** (`investment_details.csv`): Contains detailed investment information.

### Reconciliation Rules

The module enforces the following rules:

1. **Maturity Rule**: All investments must have a maturity period of 90 days or less.
2. **Market Value Rule**: Investments must be valued at the lower of cost or market value.
3. **Yield Rule**: Yields must be calculated based on market values and holding periods.
4. **Concentration Rule**: No single investment type or issuer should exceed 10% of the total portfolio.
5. **Reconciliation Rule**: All GL entries must match broker statements.

### Output

The reconciliation results include:

- **Maturity Validation Results**: Total amount, compliant amount, and non-compliant amount.
- **Market Analysis**: Total book value, total market value, total unrealized gain/loss, and total return.
- **Yield Analysis**: Average yield, highest yield, and lowest yield.
- **Concentration Analysis**: High concentration types and issuers.

### Usage Example

```python
from src.cash_equivalents_reconciliation import load_cash_equivalents_data, reconcile_cash_equivalents

# Load data
gl_cash_equiv, broker_stmt, investment_details = load_cash_equivalents_data(
    'data/gl_cash_equivalents.csv',
    'data/broker_statements.csv',
    'data/investment_details.csv'
)

# Perform reconciliation
results = reconcile_cash_equivalents(gl_cash_equiv, broker_stmt, investment_details)

# Print results
print(results['reconciliation_message'])
```

## Inventory Reconciliation

The inventory reconciliation module (`src/inventory_reconciliation.py`) provides comprehensive reconciliation of physical inventory counts with GL records, handles obsolescence, and implements LCM valuation.

### Core Reconciliation Logic

1. **Physical Count Reconciliation**
   - Reconciles physical counts with GL records
   - Handles cycle counts and annual counts
   - Tracks count discrepancies
   - Generates adjustment entries
   - Maintains audit trail

2. **Obsolescence Analysis**
   - Tracks inventory age
   - Calculates obsolescence allowance
   - Monitors slow-moving items
   - Analyzes write-down patterns
   - Implements aging categories:
     - 0-90 days: 0% allowance
     - 91-180 days: 10% allowance
     - 181-365 days: 25% allowance
     - >365 days: 50% allowance

3. **LCM Valuation**
   - Tracks cost vs market value
   - Calculates LCM adjustments
   - Monitors market value changes
   - Analyzes valuation trends
   - Implements lower of cost or market rule

4. **Cut-off Analysis**
   - Validates month-end cut-off
   - Tracks in-transit items
   - Monitors accrual entries
   - Ensures proper period matching
   - Handles AP transaction lag

### Data Requirements

1. **GL Inventory (gl_inventory.csv)**
   - item_id: Unique identifier
   - location_id: Storage location
   - date: Transaction date
   - quantity_gl: GL quantity
   - unit_cost: Cost per unit
   - item_category: Item category

2. **Physical Counts (physical_counts.csv)**
   - item_id: Unique identifier
   - location_id: Storage location
   - count_date: Count date
   - quantity_count: Counted quantity
   - count_type: Type of count (cycle/annual)

3. **Market Values (market_values.csv)**
   - item_id: Unique identifier
   - valuation_date: Valuation date
   - market_value: Current market value
   - item_category: Item category

4. **AP Transactions (ap_transactions.csv)**
   - transaction_id: Unique identifier
   - vendor_id: Vendor identifier
   - transaction_date: Transaction date
   - quantity: Transaction quantity
   - unit_cost: Cost per unit
   - status: Transaction status

### Reconciliation Rules

1. **Physical Count Rule**
   - All discrepancies must be investigated
   - Adjustments must be documented
   - Cycle counts must be performed regularly
   - Annual counts must be completed

2. **Obsolescence Rule**
   - Aging categories must be applied
   - Allowance must be calculated
   - Slow-moving items must be reviewed
   - Write-downs must be documented

3. **LCM Rule**
   - Market values must be tracked
   - LCM adjustments must be made
   - Valuation must be documented
   - Trends must be monitored

4. **Cut-off Rule**
   - Month-end cut-off must be enforced
   - In-transit items must be accrued
   - AP transactions must be matched
   - Period matching must be validated

### Output

The reconciliation process provides:
- Detailed reconciliation message
- Physical count analysis
- Obsolescence analysis
- LCM valuation analysis
- Cut-off analysis
- Adjustment entries
- Audit trail

### Usage

```python
from src.inventory_reconciliation import (
    load_inventory_data,
    reconcile_inventory
)
from datetime import datetime

# Load data
gl_inventory, physical_counts, market_values, ap_transactions = load_inventory_data(
    'data/gl_inventory.csv',
    'data/physical_counts.csv',
    'data/market_values.csv',
    'data/ap_transactions.csv'
)

# Perform reconciliation
results = reconcile_inventory(
    gl_inventory,
    physical_counts,
    market_values,
    ap_transactions,
    cutoff_date=datetime.now()
)

# Access results
print(results['reconciliation_message'])
print(results['count_analysis'])
print(results['obsolescence_analysis'])
print(results['lcm_analysis'])
print(results['cutoff_analysis'])

## Fixed Assets Reconciliation

#### Overview
The Fixed Assets Reconciliation module (`src/fa_reconciliation.py`) ensures that the fixed assets register is fully reconciled with the General Ledger (GL). It provides detailed analysis of asset lifecycle events, depreciation, rollforward, and anomaly detection, supporting compliance and audit requirements.

#### Core Reconciliation Logic
- Matches all asset acquisitions, disposals, retirements, and sales between the register and GL.
- Calculates and reconciles current period and accumulated depreciation.
- Provides roll forward analysis (beginning balance, movements, ending balance).
- Detects unmatched, duplicate, and outlier entries.
- Flags discrepancies and provides detailed reporting.

#### Asset Lifecycle Tracking
- Tracks all asset movements: purchases, disposals, retirements, and sales.
- Ensures all events are reflected in both the register and GL.

#### Depreciation Analysis
- Calculates current period depreciation and accumulated depreciation.
- Computes net book value and validates against GL balances.

#### Roll Forward Analysis
- Provides beginning and ending balances for the period.
- Summarizes all asset movements and their impact on balances.

#### Anomaly Detection
- Detects unmatched entries between register and GL.
- Flags duplicate and outlier entries.
- Provides detailed reporting for audit and compliance.

#### Compliance & Audit Trail
- Ensures all asset events are documented and reconciled.
- Provides a clear audit trail for all asset movements and reconciliations.

#### Data Requirements
- **Fixed assets register**: `asset_id`, `date`, `amount`, `transaction_type`, `description`, `location_id`, etc.
- **GL fixed assets entries**: `asset_id`, `date`, `amount`, `transaction_type`, `description`, `account_type`, etc.
- **GL depreciation entries**: `asset_id`, `date`, `amount`, `description`, `account_type`, etc.

#### Reconciliation Rules
- All asset acquisitions, disposals, retirements, and sales must be matched between register and GL.
- Depreciation must be calculated and reconciled for the period.
- Net book value = Total asset cost - Accumulated depreciation.
- Any unmatched, duplicate, or outlier entries must be flagged and explained.
- Roll forward must tie beginning balance, movements, and ending balance.
- Tolerance for reconciliation is 1e-6 (floating point precision).

#### Output Format
- Roll forward analysis (beginning, additions, disposals, retirements, sales, ending balance)
- Depreciation analysis (current period, accumulated, net book value)
- Lists of unmatched, duplicate, and outlier entries
- Reconciliation status and detailed message 