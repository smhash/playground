"""
Module: bank_api.py
Purpose: API wrapper that mimics database queries using CSV files for bank reconciliation data.
"""

import pandas as pd
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import os

class BankAPI:
    def __init__(self, data_dir: str = "data"):
        """
        Initialize the BankAPI with paths to CSV files.
        
        Args:
            data_dir: Directory containing the CSV files
        """
        self.data_dir = data_dir
        self._load_data()
    
    def _load_data(self):
        """Load all CSV files into memory."""
        self.accounts = pd.read_csv(os.path.join(self.data_dir, "Bank_Accounts.csv"))
        self.user_access = pd.read_csv(os.path.join(self.data_dir, "User_Access.csv"))
        
        # Convert date columns to datetime
        for df in [self.accounts, self.user_access]:
            for col in df.columns:
                if 'date' in col.lower() or 'created_at' in col.lower():
                    df[col] = pd.to_datetime(df[col])
    
    def get_bank_accounts(self, bank_account_id: int, client_id: int) -> pd.DataFrame:
        """
        Get bank account details using both bank_account_id and client_id as composite key.
        
        Args:
            bank_account_id: Bank account ID
            client_id: Client ID
            
        Returns:
            DataFrame of bank account details
            
        Raises:
            KeyError: If account not found for given bank_account_id and client_id
        """
        account = self.accounts[
            (self.accounts['bank_account_id'] == bank_account_id) &
            (self.accounts['client_id'] == client_id)
        ]
        
        if account.empty:
            raise KeyError(f"No bank account found for bank_account_id={bank_account_id} and client_id={client_id}")
            
        return account
    
    def get_user_access(
        self,
        user_id: Optional[int] = None,
        client_id: Optional[int] = None,
        bank_account_id: Optional[int] = None
    ) -> pd.DataFrame:
        """
        Get user access records with optional filters.
        
        Args:
            user_id: Optional user ID to filter
            client_id: Optional client ID to filter
            bank_account_id: Optional bank account ID to filter
            
        Returns:
            DataFrame of user access records
        """
        mask = pd.Series(True, index=self.user_access.index)
        
        if user_id:
            mask &= self.user_access['user_id'] == user_id
        if client_id:
            mask &= self.user_access['client_id'] == client_id
        if bank_account_id:
            mask &= self.user_access['bank_account_id'] == bank_account_id
            
        return self.user_access[mask]
    
    def get_bank_statement(
        self,
        bank_account_id: int,
        client_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        chunk_size: int = 10000
    ) -> pd.DataFrame:
        """
        Get bank statement transactions for a specific account and client, with optional date filters.
        Uses chunking to handle large files efficiently.
        
        Args:
            bank_account_id: Bank account ID to filter transactions
            client_id: Client ID to filter transactions
            start_date: Optional start date to filter
            end_date: Optional end date to filter
            chunk_size: Number of rows to read at a time
            
        Returns:
            DataFrame of bank statement transactions
        """
        transactions = []
        file_path = os.path.join(self.data_dir, "Bank_Statements.csv")
        
        for chunk in pd.read_csv(file_path, chunksize=chunk_size):
            # Filter by bank_account_id and client_id
            chunk = chunk[
                (chunk['bank_account_id'] == bank_account_id) &
                (chunk['client_id'] == client_id)
            ]
            
            # Convert date columns
            for col in chunk.columns:
                if 'stmt_' in col.lower() and 'date' in col.lower() or col == 'txn_date':
                    chunk[col] = pd.to_datetime(chunk[col])
            
            # Apply date filters if provided
            if start_date:
                chunk = chunk[chunk['stmt_start_date'] >= start_date]
            if end_date:
                chunk = chunk[chunk['stmt_end_date'] <= end_date]
            
            transactions.append(chunk)
        
        if transactions:
            return pd.concat(transactions, ignore_index=True)
        return pd.DataFrame()
