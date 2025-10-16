"""
Module: gl_accounts_api.py
Purpose: API wrapper for GL account related operations.
"""

import pandas as pd
from typing import Optional
from datetime import datetime
import os

class GLAccountsAPI:
    def __init__(self, data_dir: str = "data"):
        """
        Initialize the GLAccountsAPI with paths to CSV files.
        
        Args:
            data_dir: Directory containing the CSV files
        """
        self.data_dir = data_dir
    
    def get_gl_transactions(
        self,
        bank_account_id: int,
        client_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        chunk_size: int = 10000
    ) -> pd.DataFrame:
        """
        Get GL transactions for a specific account and client, with optional date filters.
        Uses chunking to handle large files efficiently.
        
        Args:
            bank_account_id: Bank account ID to filter transactions
            client_id: Client ID to filter transactions
            start_date: Optional start date to filter
            end_date: Optional end date to filter
            chunk_size: Number of rows to read at a time
            
        Returns:
            DataFrame of GL transactions
        """
        transactions = []
        file_path = os.path.join(self.data_dir, "Bank_Transactions.csv")
        
        for chunk in pd.read_csv(file_path, chunksize=chunk_size):
            # Filter by bank_account_id and client_id
            chunk = chunk[
                (chunk['bank_account_id'] == bank_account_id) &
                (chunk['client_id'] == client_id)
            ]
            
            # Convert date columns
            for col in chunk.columns:
                if col in ['created_at', 'txn_date', 'completed_at']:
                    chunk[col] = pd.to_datetime(chunk[col])
            
            # Apply date filters if provided
            if start_date:
                chunk = chunk[chunk['txn_date'] >= start_date]
            if end_date:
                chunk = chunk[chunk['txn_date'] <= end_date]
            
            transactions.append(chunk)
        
        if transactions:
            return pd.concat(transactions, ignore_index=True)
        return pd.DataFrame() 