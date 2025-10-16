"""
Module: anomaly_detection.py
Detects anomalies in transaction data.
"""

import pandas as pd
import numpy as np
from typing import Tuple, Dict, List
from sklearn.ensemble import IsolationForest

def find_unmatched_entries(df1: pd.DataFrame, df2: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Find entries that exist in one DataFrame but not in the other.
    
    Args:
        df1: First DataFrame
        df2: Second DataFrame
        
    Returns:
        Tuple of (entries in df1 not in df2, entries in df2 not in df1)
    """
    if df1.empty or df2.empty:
        return pd.DataFrame(), pd.DataFrame()
    
    # Create copies to avoid modifying original DataFrames
    df1_copy = df1.copy()
    df2_copy = df2.copy()
    
    # Add source column
    df1_copy['_source'] = 'df1'
    df2_copy['_source'] = 'df2'
    
    # Combine DataFrames
    combined = pd.concat([df1_copy, df2_copy])
    
    # Find duplicates
    duplicates = combined.duplicated(subset=['txn_date', 'txn_amount', 'txn_description'], keep=False)
    
    # Get unmatched entries
    only_in_df1 = df1_copy[~df1_copy.index.isin(combined[duplicates].index)]
    only_in_df2 = df2_copy[~df2_copy.index.isin(combined[duplicates].index)]
    
    return only_in_df1, only_in_df2

def detect_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    """
    Detect duplicate transactions.
    
    Args:
        df: DataFrame of transactions
        
    Returns:
        DataFrame of duplicate transactions
    """
    if df.empty:
        return pd.DataFrame()
    
    # Find duplicates based on date, amount, and description
    duplicates = df[df.duplicated(subset=['txn_date', 'txn_amount', 'txn_description'], keep=False)]
    
    return duplicates

def detect_outliers_zscore(df: pd.DataFrame, amount_column: str, threshold: float = 3.0) -> pd.DataFrame:
    """
    Detect outliers using Z-score method.
    
    Args:
        df: DataFrame of transactions
        amount_column: Name of the amount column
        threshold: Z-score threshold for outliers
        
    Returns:
        DataFrame of outlier transactions
    """
    if df.empty:
        return pd.DataFrame()
    
    # Calculate Z-scores
    z_scores = np.abs((df[amount_column] - df[amount_column].mean()) / df[amount_column].std())
    
    # Find outliers
    outliers = df[z_scores > threshold]
    
    return outliers

def detect_outliers_isolation_forest(df: pd.DataFrame, amount_column: str, contamination: float = 0.1) -> pd.DataFrame:
    """
    Detect outliers using Isolation Forest.
    
    Args:
        df: DataFrame of transactions
        amount_column: Name of the amount column
        contamination: Expected proportion of outliers
        
    Returns:
        DataFrame of outlier transactions
    """
    if df.empty:
        return pd.DataFrame()
    
    # Prepare data
    X = df[[amount_column]].values
    
    # Fit Isolation Forest
    iso_forest = IsolationForest(contamination=contamination, random_state=42)
    predictions = iso_forest.fit_predict(X)
    
    # Find outliers (predictions == -1)
    outliers = df[predictions == -1]
    
    return outliers 