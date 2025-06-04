#!/usr/bin/env python3
import sys
import json
import pandas as pd
import numpy as np
import joblib
import warnings
warnings.filterwarnings('ignore')

def create_features(df):
    """Create technical indicators and features from OHLCV data (matching training exactly)"""
    df = df.copy()
    
    # Convert Open time to datetime
    df['Open time'] = pd.to_datetime(df['Open time'], unit='ms')
    df = df.sort_values('Open time').reset_index(drop=True)
    
    # Price-based features
    df['price_change'] = df['Close'].pct_change()
    df['high_low_ratio'] = df['High'] / df['Low']
    df['close_open_ratio'] = df['Close'] / df['Open']
    df['volume_change'] = df['Volume'].pct_change()
    
    # Moving averages (matching training - reduced windows)
    for window in [5, 10, 20]:
        df[f'ma_{window}'] = df['Close'].rolling(window=window).mean()
        df[f'price_to_ma_{window}'] = df['Close'] / df[f'ma_{window}']
    
    # Volatility features
    df['volatility_5'] = df['Close'].rolling(window=5).std()
    df['volatility_10'] = df['Close'].rolling(window=10).std()
    
    # Volume features
    df['volume_ma_5'] = df['Volume'].rolling(window=5).mean()
    df['volume_ratio'] = df['Volume'] / df['volume_ma_5']
    
    # RSI-like indicator (matching training - reduced window to 10)
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=10).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=10).mean()
    rs = gain / loss
    df['rsi'] = 100 - (100 / (1 + rs))
    
    # MACD-like indicator (matching training - reduced windows)
    exp1 = df['Close'].ewm(span=8).mean()
    exp2 = df['Close'].ewm(span=18).mean()
    df['macd'] = exp1 - exp2
    df['macd_signal'] = df['macd'].ewm(span=6).mean()
    df['macd_histogram'] = df['macd'] - df['macd_signal']
    
    # Bollinger Bands (matching training - reduced window to 15)
    df['bb_middle'] = df['Close'].rolling(window=15).mean()
    bb_std = df['Close'].rolling(window=15).std()
    df['bb_upper'] = df['bb_middle'] + (bb_std * 2)
    df['bb_lower'] = df['bb_middle'] - (bb_std * 2)
    df['bb_position'] = (df['Close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
    
    # Clean infinite and extreme values (matching training)
    df = df.replace([np.inf, -np.inf], np.nan)
    
    # Cap extreme values using percentiles
    numeric_columns = df.select_dtypes(include=[np.number]).columns
    for col in numeric_columns:
        if col not in ['Open time']:
            q99 = df[col].quantile(0.999)
            q01 = df[col].quantile(0.001)
            df[col] = df[col].clip(lower=q01, upper=q99)
    
    # Handle division by zero cases
    ratio_columns = ['high_low_ratio', 'close_open_ratio', 'volume_ratio', 'bb_position']
    for col in ratio_columns:
        if col in df.columns:
            df[col] = df[col].fillna(1.0)
    
    # Handle percentage changes
    pct_columns = ['price_change', 'volume_change']
    for col in pct_columns:
        if col in df.columns:
            df[col] = df[col].fillna(0.0)
    
    # Handle price-to-MA ratios
    ma_ratio_columns = [col for col in df.columns if 'price_to_ma_' in col]
    for col in ma_ratio_columns:
        df[col] = df[col].fillna(1.0)
    
    # Handle RSI
    if 'rsi' in df.columns:
        df['rsi'] = df['rsi'].fillna(50.0)
        df['rsi'] = df['rsi'].clip(0, 100)
    
    return df

def load_model():
    """Load the trained model and components"""
    try:
        model = joblib.load('crypto_profit_model.pkl')
        scaler = joblib.load('feature_scaler.pkl')
        feature_columns = joblib.load('feature_columns.pkl')
        return model, scaler, feature_columns
    except FileNotFoundError as e:
        raise Exception(f"Model files not found: {e}")

def predict_live(kline_data):
    """Generate prediction for live data"""
    try:
        # Load model components
        model, scaler, feature_columns = load_model()
        
        # Convert to DataFrame
        df = pd.DataFrame(kline_data)
        
        # Create features
        df_with_features = create_features(df)
        
        # Get the latest data point with all features
        latest_data = df_with_features[feature_columns].iloc[-1:]
        
        # Check if we have valid data
        if latest_data.isna().any().any():
            return {
                'error': 'Insufficient data for prediction',
                'prediction': 0,
                'probability': 0.5,
                'confidence': 'low',
                'recommendation': 'WAIT',
                'features_available': len([col for col in feature_columns if not latest_data[col].isna().any()])
            }
        
        # Scale features
        features_scaled = scaler.transform(latest_data)
        
        # Make prediction
        prediction = model.predict(features_scaled)[0]
        probability = model.predict_proba(features_scaled)[0, 1]
        
        # Determine confidence and recommendation
        confidence = 'high' if probability >= 0.8 or probability <= 0.2 else 'medium' if probability >= 0.7 or probability <= 0.3 else 'low'
        
        if probability >= 0.7:
            recommendation = 'BUY'
        elif probability <= 0.3:
            recommendation = 'SELL'
        else:
            recommendation = 'WAIT'
        
        # Get current price info
        current_price = float(df['Close'].iloc[-1])
        price_change_24h = ((current_price - float(df['Close'].iloc[0])) / float(df['Close'].iloc[0])) * 100
        
        return {
            'prediction': int(prediction),
            'probability': float(probability),
            'confidence': confidence,
            'recommendation': recommendation,
            'current_price': current_price,
            'price_change_24h': price_change_24h,
            'technical_summary': {
                'rsi': float(df_with_features['rsi'].iloc[-1]) if 'rsi' in df_with_features.columns else None,
                'macd': float(df_with_features['macd'].iloc[-1]) if 'macd' in df_with_features.columns else None,
                'bb_position': float(df_with_features['bb_position'].iloc[-1]) if 'bb_position' in df_with_features.columns else None,
                'volatility': float(df_with_features['volatility_10'].iloc[-1]) if 'volatility_10' in df_with_features.columns else None
            },
            'data_points': len(df),
            'timestamp': int(pd.Timestamp(df['Open time'].iloc[-1]).timestamp() * 1000)
        }
        
    except Exception as e:
        return {
            'error': str(e),
            'prediction': 0,
            'probability': 0.5,
            'confidence': 'low',
            'recommendation': 'WAIT'
        }

def main():
    try:
        # Read JSON data from stdin
        input_data = sys.stdin.read()
        kline_data = json.loads(input_data)
        
        # Generate prediction
        result = predict_live(kline_data)
        
        # Output result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'prediction': 0,
            'probability': 0.5,
            'confidence': 'low',
            'recommendation': 'WAIT'
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()