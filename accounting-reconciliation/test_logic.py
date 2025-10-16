import pandas as pd

# Sample GL transactions
gl_txns = pd.DataFrame({
    'txn_date': ['2024-02-15', '2024-02-15', '2024-02-20', '2024-02-25', '2024-02-26', '2024-02-27', '2024-02-28', '2024-02-29'],
    'txn_amount': [1000.00, 1000.00, -500.00, 750.00, 1000.00, 1000.00, 1000.00, 1000.00],
    'txn_description': ['Check #123', 'Check #123', 'Check #456', 'Check #789', 'Check #999', 'Check #111', 'Check #222', 'Check #333'],
    'check_num': ['123', '123', '456', '789', '999', '111', '222', '333'],
    'txn_type': ['check', 'check', 'check', 'check', 'check', 'check', 'check', 'check']
})

# Sample bank statement
bank_stmt = pd.DataFrame({
    'txn_date': ['2024-02-15', '2024-02-20', '2024-02-26', '2024-02-27', '2024-02-28', '2024-02-29'],
    'txn_amount': [1000.00, -500.00, 1000.00, 1000.00, 1000.00, 1000.00],
    'txn_description': ['Check #123', 'Check #456', 'Check #888', 'Check #111', 'Check #444', 'Check #333'],
    'check_num': ['123', '456', '888', '111', '444', '333'],
    'txn_type': ['check', 'check', 'check', 'check', 'check', 'check']
})

print('GL Transactions:')
print(gl_txns)
print('\nBank Statement:')
print(bank_stmt)

# Better approach - find exact matches using only txn_date, txn_amount, txn_description
# but still filter for non-null check numbers
merged = pd.merge(gl_txns, bank_stmt, 
                 on=['txn_date', 'txn_amount', 'txn_description'],
                 how='left', 
                 indicator=True)

# Filter for non-null check numbers and unmatched records
outstanding_checks = merged[
    (merged['check_num_x'].notna()) & 
    (merged['_merge'] == 'left_only')
]

print('\nOutstanding checks found:', len(outstanding_checks))
print('\nOutstanding checks:')
print(outstanding_checks[['txn_date', 'txn_amount', 'txn_description', 'check_num_x', 'txn_type_x']])

# Print partial matches for analysis
print('\nPartial matches analysis:')
for idx, row in gl_txns.iterrows():
    date_match = row['txn_date'] in bank_stmt['txn_date'].values
    amount_match = row['txn_amount'] in bank_stmt['txn_amount'].values
    desc_match = row['txn_description'] in bank_stmt['txn_description'].values
    
    if not (date_match and amount_match and desc_match):
        print(f"\nCheck #{row['check_num']}:")
        print(f"Date match: {date_match}")
        print(f"Amount match: {amount_match}")
        print(f"Description match: {desc_match}") 