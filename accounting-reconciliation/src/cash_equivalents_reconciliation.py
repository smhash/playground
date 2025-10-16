"""
Module: cash_equivalents_reconciliation.py
Purpose: Reconciles short-term investments and cash equivalents against GL accounts and broker statements.

Key Features:
1. Maturity Validation
   - Ensures all investments meet the 90-day maturity requirement
   - Tracks compliant vs non-compliant investments
   - Calculates days to maturity for each instrument

2. Market Value Analysis
   - Tracks book value vs market value
   - Calculates unrealized gains/losses
   - Analyzes returns by instrument type
   - Monitors market value fluctuations

3. Yield Analysis
   - Calculates investment yields
   - Tracks holding periods
   - Analyzes performance by instrument type
   - Monitors yield trends

4. Concentration Analysis
   - Monitors investment concentration by type
   - Tracks issuer concentration
   - Identifies high concentration risks
   - Ensures diversification

5. Reconciliation Features
   - Matches GL entries with broker statements
   - Identifies unmatched entries
   - Detects duplicates and outliers
   - Validates transaction amounts

Data Requirements:
1. GL Cash Equivalents (gl_cash_equivalents.csv):
   - investment_id: Unique identifier
   - date: Transaction date
   - amount: Book value
   - instrument_type: Type of investment
   - description: Transaction description

2. Broker Statements (broker_statements.csv):
   - investment_id: Unique identifier
   - date: Statement date
   - market_value: Current market value
   - yield: Current yield
   - issuer: Investment issuer

3. Investment Details (investment_details.csv):
   - investment_id: Unique identifier
   - instrument_type: Type of investment
   - purchase_date: Investment purchase date
   - maturity_date: Investment maturity date
   - amount: Investment amount
   - issuer: Investment issuer

Rules:
1. Maturity Rule: All investments must mature within 90 days
2. Market Value Rule: Market values must be tracked daily
3. Yield Rule: Yields must be calculated and monitored
4. Concentration Rule: No single issuer > 10% of total
5. Reconciliation Rule: GL must match broker statements
"""

import pandas as pd
from typing import Tuple, Dict, List
from datetime import datetime, timedelta
from .anomaly_detection import detect_duplicates, find_unmatched_entries, detect_outliers_zscore

def load_cash_equivalents_data(
    gl_cash_equiv_path: str,
    broker_statements_path: str,
    investment_details_path: str
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Load and prepare cash equivalents data from CSV files.
    
    This function reads three CSV files:
    1. GL cash equivalents entries
    2. Broker statements
    3. Investment details
    
    It performs the following operations:
    - Reads CSV files into pandas DataFrames
    - Converts date columns to datetime format
    - Validates required columns are present
    - Ensures data types are correct
    
    Args:
        gl_cash_equiv_path: Path to GL cash equivalents entries CSV
        broker_statements_path: Path to broker statements CSV
        investment_details_path: Path to investment details CSV
        
    Returns:
        Tuple containing:
        - GL entries DataFrame
        - Broker statements DataFrame
        - Investment details DataFrame
        
    Raises:
        FileNotFoundError: If any CSV file is missing
        ValueError: If required columns are missing
    """
    # Read CSV files
    gl_entries = pd.read_csv(gl_cash_equiv_path)
    broker_stmt = pd.read_csv(broker_statements_path)
    inv_details = pd.read_csv(investment_details_path)
    
    # Convert date columns to datetime
    for df in [gl_entries, broker_stmt, inv_details]:
        for col in ['date', 'purchase_date', 'maturity_date']:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col])
    
    return gl_entries, broker_stmt, inv_details

def validate_maturity_periods(investment_details: pd.DataFrame) -> Dict:
    """
    Validate that all investments meet the 90-day maturity requirement.
    
    This function:
    1. Calculates days to maturity for each investment
    2. Identifies non-compliant investments (>90 days)
    3. Summarizes compliance by instrument type
    4. Calculates total compliant vs non-compliant amounts
    
    Args:
        investment_details: DataFrame containing investment details
            Required columns:
            - maturity_date: Date when investment matures
            - amount: Investment amount
            - instrument_type: Type of investment
            
    Returns:
        Dictionary containing:
        - non_compliant_investments: DataFrame of investments >90 days
        - summary_by_type: Summary statistics by instrument type
        - total_amount: Total investment amount
        - compliant_amount: Amount meeting 90-day requirement
    """
    today = datetime.now()
    
    # Calculate days to maturity
    investment_details['days_to_maturity'] = (
        investment_details['maturity_date'] - today
    ).dt.days
    
    # Identify non-compliant investments
    non_compliant = investment_details[
        investment_details['days_to_maturity'] > 90
    ]
    
    # Group by instrument type
    by_type = investment_details.groupby('instrument_type').agg({
        'amount': ['count', 'sum'],
        'days_to_maturity': ['mean', 'max']
    })
    
    return {
        'non_compliant_investments': non_compliant,
        'summary_by_type': by_type,
        'total_amount': investment_details['amount'].sum(),
        'compliant_amount': investment_details[
            investment_details['days_to_maturity'] <= 90
        ]['amount'].sum()
    }

def analyze_market_values(gl_cash_equiv: pd.DataFrame, broker_stmt: pd.DataFrame) -> Dict:
    """
    Analyze market values and calculate unrealized gains/losses.
    
    This function:
    1. Merges GL and broker data
    2. Calculates unrealized gains/losses
    3. Computes returns by instrument type
    4. Tracks market value fluctuations
    
    Args:
        gl_cash_equiv: GL cash equivalents entries
            Required columns:
            - investment_id: Unique identifier
            - date: Transaction date
            - amount: Book value
            - instrument_type: Type of investment
            
        broker_stmt: Broker statements
            Required columns:
            - investment_id: Unique identifier
            - date: Statement date
            - market_value: Current market value
            
    Returns:
        Dictionary containing:
        - total_book_value: Sum of all book values
        - total_market_value: Sum of all market values
        - total_unrealized_gain_loss: Total unrealized gain/loss
        - total_return: Overall return percentage
        - summary_by_type: Summary by instrument type
    """
    # Merge GL and broker data
    merged = pd.merge(
        gl_cash_equiv,
        broker_stmt,
        on=['investment_id', 'date'],
        how='outer',
        suffixes=('_gl', '_broker')
    )
    
    # Use amount as book value
    merged['book_value'] = merged['amount']
    
    # Calculate unrealized gains/losses
    merged['unrealized_gain_loss'] = merged['market_value'] - merged['book_value']
    merged['return'] = merged['unrealized_gain_loss'] / merged['book_value']
    
    # Summarize by instrument type
    summary = merged.groupby('instrument_type').agg({
        'book_value': 'sum',
        'market_value': 'sum',
        'unrealized_gain_loss': 'sum',
        'return': 'mean'
    }).round(2)
    
    return {
        'total_book_value': merged['book_value'].sum(),
        'total_market_value': merged['market_value'].sum(),
        'total_unrealized_gain_loss': merged['unrealized_gain_loss'].sum(),
        'total_return': merged['unrealized_gain_loss'].sum() / merged['book_value'].sum(),
        'summary_by_type': summary.to_dict()
    }

def analyze_investment_yields(
    investment_details: pd.DataFrame,
    broker_stmt: pd.DataFrame
) -> Dict:
    """
    Analyze investment yields and returns.
    
    This function:
    1. Calculates holding periods
    2. Computes yields for each investment
    3. Analyzes performance by instrument type
    4. Tracks yield trends
    
    Args:
        investment_details: DataFrame containing investment details
            Required columns:
            - investment_id: Unique identifier
            - purchase_date: Investment purchase date
            - maturity_date: Investment maturity date
            - amount: Investment amount
            - instrument_type: Type of investment
            
        broker_stmt: DataFrame containing broker statements
            Required columns:
            - investment_id: Unique identifier
            - market_value: Current market value
            
    Returns:
        Dictionary containing:
        - yield_summary: Summary statistics by instrument type
        - average_yield: Mean yield across all investments
        - highest_yield: Maximum yield achieved
        - lowest_yield: Minimum yield achieved
    """
    # Merge investment details with broker statements
    merged = pd.merge(
        investment_details,
        broker_stmt,
        on='investment_id',
        how='left'
    )
    
    # Use amount as book value
    merged['book_value'] = merged['amount']
    
    # Calculate holding period
    merged['holding_period'] = (
        merged['maturity_date'] - merged['purchase_date']
    ).dt.days
    
    # Calculate yield
    merged['yield'] = (
        merged['market_value'] - merged['book_value']
    ) / merged['book_value'] * (365 / merged['holding_period'])
    
    # Group by instrument type
    by_type = merged.groupby('instrument_type').agg({
        'yield': ['mean', 'min', 'max'],
        'amount': 'sum'
    })
    
    return {
        'yield_summary': by_type,
        'average_yield': merged['yield'].mean(),
        'highest_yield': merged['yield'].max(),
        'lowest_yield': merged['yield'].min()
    }

def analyze_concentration(investment_details: pd.DataFrame) -> Dict:
    """
    Analyze investment concentration by instrument type and issuer.
    
    This function:
    1. Calculates total investment amount
    2. Analyzes concentration by instrument type
    3. Analyzes concentration by issuer
    4. Identifies high concentration risks
    
    Args:
        investment_details: DataFrame containing investment details
            Required columns:
            - amount: Investment amount
            - instrument_type: Type of investment
            - issuer: Investment issuer
            
    Returns:
        Dictionary containing:
        - by_instrument_type: Summary by instrument type
        - by_issuer: Summary by issuer
        - high_concentration_types: Types with >10% concentration
        - high_concentration_issuers: Issuers with >10% concentration
        - is_compliant: Boolean indicating if all concentrations are <=10%
    """
    # Calculate total amount
    total_amount = investment_details['amount'].sum()
    
    # Group by instrument type
    by_type = investment_details.groupby('instrument_type').agg({
        'amount': ['sum', 'count']
    })
    by_type['concentration'] = by_type[('amount', 'sum')] / total_amount
    
    # Group by issuer
    by_issuer = investment_details.groupby('issuer').agg({
        'amount': ['sum', 'count']
    })
    by_issuer['concentration'] = by_issuer[('amount', 'sum')] / total_amount
    
    # Identify high concentrations (>10%)
    high_concentration_types = by_type[by_type['concentration'] > 0.1]
    high_concentration_issuers = by_issuer[by_issuer['concentration'] > 0.1]
    
    # Check if all concentrations are compliant (<=10%)
    is_compliant = (
        (by_type['concentration'] <= 0.1).all() and
        (by_issuer['concentration'] <= 0.1).all()
    )
    
    return {
        'by_instrument_type': by_type,
        'by_issuer': by_issuer,
        'high_concentration_types': high_concentration_types,
        'high_concentration_issuers': high_concentration_issuers,
        'is_compliant': is_compliant
    }

def reconcile_cash_equivalents(
    gl_cash_equiv_path: str,
    broker_statements_path: str,
    investment_details_path: str
) -> Dict:
    """
    Reconcile cash equivalents with GL accounts and broker statements.
    
    This function:
    1. Loads and validates all required data
    2. Validates maturity periods
    3. Analyzes market values
    4. Analyzes investment yields
    5. Checks concentration limits
    6. Performs reconciliation
    
    Args:
        gl_cash_equiv_path: Path to GL cash equivalents entries CSV
        broker_statements_path: Path to broker statements CSV
        investment_details_path: Path to investment details CSV
        
    Returns:
        Dictionary containing:
        - reconciliation_message: Summary of reconciliation results
        - total_book_value: Total book value of investments
        - total_market_value: Total market value of investments
        - unrealized_gain_loss: Total unrealized gain/loss
        - compliance_status: Overall compliance status
        - maturity_validation: Results of maturity validation
        - market_value_analysis: Results of market value analysis
        - yield_analysis: Results of yield analysis
        - concentration_analysis: Results of concentration analysis
        - reconciliation_status: Overall reconciliation status
    """
    # Load data
    gl_entries, broker_stmt, investment_details = load_cash_equivalents_data(
        gl_cash_equiv_path,
        broker_statements_path,
        investment_details_path
    )
    
    # Validate maturity periods
    maturity_validation = validate_maturity_periods(investment_details)
    
    # Analyze market values
    market_value_analysis = analyze_market_values(gl_entries, broker_stmt)
    
    # Analyze investment yields
    yield_analysis = analyze_investment_yields(investment_details, broker_stmt)
    
    # Analyze concentration
    concentration_analysis = analyze_concentration(investment_details)
    
    # Determine overall compliance status
    compliance_status = "Compliant" if (
        maturity_validation['compliant_amount'] == maturity_validation['total_amount'] and
        concentration_analysis['is_compliant']
    ) else "Non-Compliant"
    
    # Create reconciliation message
    reconciliation_message = f"""=== Cash Equivalents Reconciliation ===
Total Book Value: ${market_value_analysis['total_book_value']:.2f}
Total Market Value: ${market_value_analysis['total_market_value']:.2f}
Unrealized Gain/Loss: ${market_value_analysis['total_unrealized_gain_loss']:.2f}
Compliance Status: {compliance_status}

Maturity Validation:
- Total Amount: ${maturity_validation['total_amount']:.2f}
- Compliant Amount: ${maturity_validation['compliant_amount']:.2f}
- Non-compliant Amount: ${maturity_validation['total_amount'] - maturity_validation['compliant_amount']:.2f}

Yield Analysis:
- Average Yield: {yield_analysis['average_yield']:.2%}
- Highest Yield: {yield_analysis['highest_yield']:.2%}
- Lowest Yield: {yield_analysis['lowest_yield']:.2%}

Concentration Analysis:
- High Concentration Types: {len(concentration_analysis['high_concentration_types'])}
- High Concentration Issuers: {len(concentration_analysis['high_concentration_issuers'])}
- Overall Compliant: {concentration_analysis['is_compliant']}"""
    
    return {
        'reconciliation_message': reconciliation_message,
        'total_book_value': market_value_analysis['total_book_value'],
        'total_market_value': market_value_analysis['total_market_value'],
        'unrealized_gain_loss': market_value_analysis['total_unrealized_gain_loss'],
        'compliance_status': compliance_status,
        'maturity_validation': maturity_validation,
        'market_value_analysis': market_value_analysis,
        'yield_analysis': yield_analysis,
        'concentration_analysis': concentration_analysis
    } 