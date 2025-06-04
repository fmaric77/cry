import pandas as pd
import numpy as np
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, roc_auc_score, roc_curve
import warnings
import gc
warnings.filterwarnings('ignore')

def create_features(df):
    """Create technical indicators and features from OHLCV data (matching training exactly)"""
    df = df.copy()
    
    # Convert Open time to datetime
    df['Open time'] = pd.to_datetime(df['Open time'])
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
    
    # Clean up intermediate variables
    del delta, gain, loss, rs, exp1, exp2, bb_std
    gc.collect()
    
    # ✅ CRITICAL: Add same data cleaning as training script
    print("Cleaning infinite and extreme values...")
    
    # Replace infinite values with NaN
    df = df.replace([np.inf, -np.inf], np.nan)
    
    # Cap extreme values using percentiles (99.9th percentile)
    numeric_columns = df.select_dtypes(include=[np.number]).columns
    for col in numeric_columns:
        if col not in ['Open time']:  # Skip datetime columns
            q99 = df[col].quantile(0.999)
            q01 = df[col].quantile(0.001)
            df[col] = df[col].clip(lower=q01, upper=q99)
    
    # Handle division by zero cases specifically
    # Replace NaN ratios with 1.0 (neutral ratio)
    ratio_columns = ['high_low_ratio', 'close_open_ratio', 'volume_ratio', 'bb_position']
    for col in ratio_columns:
        if col in df.columns:
            df[col] = df[col].fillna(1.0)
    
    # Handle percentage changes - replace NaN with 0
    pct_columns = ['price_change', 'volume_change']
    for col in pct_columns:
        if col in df.columns:
            df[col] = df[col].fillna(0.0)
    
    # Handle price-to-MA ratios - replace NaN with 1.0
    ma_ratio_columns = [col for col in df.columns if 'price_to_ma_' in col]
    for col in ma_ratio_columns:
        df[col] = df[col].fillna(1.0)
    
    # Handle RSI - replace NaN with 50 (neutral)
    if 'rsi' in df.columns:
        df['rsi'] = df['rsi'].fillna(50.0)
        df['rsi'] = df['rsi'].clip(0, 100)  # Ensure RSI is in valid range
    
    print(f"Data cleaning completed. Shape: {df.shape}")
    
    return df

def create_target_for_validation(df, profit_threshold=0.01, lookforward_periods=30):
    """Create target variable for validation (matching training script)"""
    df = df.copy()
    df['target'] = 0
    
    # Use same optimized approach as training
    close_prices = df['Close'].values
    high_prices = df['High'].values
    
    # Process in smaller chunks for memory efficiency
    chunk_size = 5000  # Smaller chunks for testing
    for start_idx in range(0, len(df) - lookforward_periods, chunk_size):
        end_idx = min(start_idx + chunk_size, len(df) - lookforward_periods)
        
        for i in range(start_idx, end_idx):
            current_price = close_prices[i]
            future_high_slice = high_prices[i+1:i+1+lookforward_periods]
            
            if len(future_high_slice) > 0:
                max_future_price = np.max(future_high_slice)
                profit_ratio = (max_future_price - current_price) / current_price
                
                if profit_ratio >= profit_threshold:
                    df.iloc[i, df.columns.get_loc('target')] = 1
    
    return df

def load_model():
    """Load the trained model and components"""
    try:
        model = joblib.load('crypto_profit_model.pkl')
        scaler = joblib.load('feature_scaler.pkl')
        feature_columns = joblib.load('feature_columns.pkl')
        print("Model and components loaded successfully!")
        return model, scaler, feature_columns
    except FileNotFoundError as e:
        print(f"Error loading model files: {e}")
        print("Please run train_model.py first to create the model files.")
        return None, None, None

def predict_single_point(model, scaler, feature_columns, current_data):
    """
    Predict profit opportunity for a single data point
    current_data should be a pandas Series or dict with the required features
    """
    if isinstance(current_data, dict):
        current_data = pd.Series(current_data)
    
    # Extract features in the correct order
    features = current_data[feature_columns].values.reshape(1, -1)
    
    # Scale features
    features_scaled = scaler.transform(features)
    
    # Make prediction
    prediction = model.predict(features_scaled)[0]
    probability = model.predict_proba(features_scaled)[0, 1]
    
    return prediction, probability

def backtest_strategy(df, model, scaler, feature_columns, confidence_threshold=0.7):
    """
    Backtest the trading strategy using the model predictions (memory optimized)
    """
    print(f"Running backtest with sample of data to save memory...")
    
    # Sample data if it's too large
    if len(df) > 50000:
        sample_size = 20000
        print(f"Sampling {sample_size} rows for backtest...")
        df = df.tail(sample_size).copy()  # Use recent data
    
    # Create features
    df = create_features(df)
    df = create_target_for_validation(df)
    
    # Remove rows with NaN values
    df_clean = df[feature_columns + ['target', 'Open time', 'Close']].dropna()
    
    if len(df_clean) == 0:
        print("No valid data for backtest after cleaning.")
        return None
    
    print(f"Backtest data shape: {df_clean.shape}")
    
    # Make predictions in batches to save memory
    batch_size = 5000
    predictions = []
    probabilities = []
    
    for i in range(0, len(df_clean), batch_size):
        batch_end = min(i + batch_size, len(df_clean))
        X_batch = df_clean[feature_columns].iloc[i:batch_end]
        X_batch_scaled = scaler.transform(X_batch)
        
        batch_pred = model.predict(X_batch_scaled)
        batch_prob = model.predict_proba(X_batch_scaled)[:, 1]
        
        predictions.extend(batch_pred)
        probabilities.extend(batch_prob)
    
    # Add predictions to dataframe
    df_clean['prediction'] = predictions
    df_clean['probability'] = probabilities
    df_clean['high_confidence'] = df_clean['probability'] >= confidence_threshold
    
    # Calculate strategy performance
    total_signals = len(df_clean[df_clean['high_confidence']])
    correct_signals = len(df_clean[(df_clean['high_confidence']) & (df_clean['target'] == 1)])
    
    if total_signals > 0:
        precision = correct_signals / total_signals
        print(f"\nBacktest Results (Confidence >= {confidence_threshold}):")
        print(f"Total signals: {total_signals}")
        print(f"Correct signals: {correct_signals}")
        print(f"Precision: {precision:.4f}")
        print(f"Expected profit per signal: {precision * 0.01:.4f} (1% * precision)")
    else:
        print(f"No signals generated with confidence >= {confidence_threshold}")
    
    return df_clean

def evaluate_model_performance(df_test, model, scaler, feature_columns):
    """Evaluate model performance on test data (memory optimized)"""
    print("Evaluating model performance...")
    
    # Sample test data if too large
    if len(df_test) > 30000:
        sample_size = 15000
        print(f"Sampling {sample_size} rows for evaluation...")
        df_test = df_test.tail(sample_size).copy()
    
    # Create features and target
    df_test = create_features(df_test)
    df_test = create_target_for_validation(df_test)
    
    # Clean data
    df_clean = df_test[feature_columns + ['target']].dropna()
    
    if len(df_clean) == 0:
        print("No valid data for evaluation after cleaning.")
        return
    
    print(f"Evaluation data shape: {df_clean.shape}")
    
    X_test = df_clean[feature_columns]
    y_test = df_clean['target']
    
    # Scale features in batches
    batch_size = 5000
    y_pred = []
    y_pred_proba = []
    
    for i in range(0, len(X_test), batch_size):
        batch_end = min(i + batch_size, len(X_test))
        X_batch = X_test.iloc[i:batch_end]
        X_batch_scaled = scaler.transform(X_batch)
        
        batch_pred = model.predict(X_batch_scaled)
        batch_prob = model.predict_proba(X_batch_scaled)[:, 1]
        
        y_pred.extend(batch_pred)
        y_pred_proba.extend(batch_prob)
    
    y_pred = np.array(y_pred)
    y_pred_proba = np.array(y_pred_proba)
    
    # Print metrics
    print(f"\nTest Set Performance:")
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(f"ROC AUC: {roc_auc_score(y_test, y_pred_proba):.4f}")
    print(f"\nTarget distribution in test set:")
    print(y_test.value_counts())
    print(f"Profit opportunity percentage: {y_test.mean()*100:.2f}%")
    
    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Create smaller plots to save memory
    try:
        # Plot ROC curve
        fpr, tpr, thresholds = roc_curve(y_test, y_pred_proba)
        plt.figure(figsize=(6, 4))
        plt.plot(fpr, tpr, label=f'ROC Curve (AUC = {roc_auc_score(y_test, y_pred_proba):.3f})')
        plt.plot([0, 1], [0, 1], 'k--', label='Random')
        plt.xlabel('False Positive Rate')
        plt.ylabel('True Positive Rate')
        plt.title('ROC Curve')
        plt.legend()
        plt.grid(True)
        plt.tight_layout()
        plt.savefig('roc_curve.png', dpi=100, bbox_inches='tight')
        plt.close()
        
        # Plot probability distribution (sample if too large)
        if len(y_pred_proba) > 10000:
            sample_indices = np.random.choice(len(y_pred_proba), 10000, replace=False)
            y_pred_proba_sample = y_pred_proba[sample_indices]
            y_test_sample = y_test.iloc[sample_indices]
        else:
            y_pred_proba_sample = y_pred_proba
            y_test_sample = y_test
        
        plt.figure(figsize=(8, 4))
        plt.hist(y_pred_proba_sample[y_test_sample == 0], alpha=0.7, label='No Profit', bins=30)
        plt.hist(y_pred_proba_sample[y_test_sample == 1], alpha=0.7, label='Profit', bins=30)
        plt.xlabel('Predicted Probability')
        plt.ylabel('Frequency')
        plt.title('Distribution of Predicted Probabilities')
        plt.legend()
        plt.grid(True)
        plt.tight_layout()
        plt.savefig('probability_distribution.png', dpi=100, bbox_inches='tight')
        plt.close()
        
    except Exception as e:
        print(f"Warning: Could not create plots due to: {e}")

def test_live_prediction():
    """Test the model with the most recent data points (memory optimized)"""
    print("\nTesting live prediction capability...")
    
    # Load model
    model, scaler, feature_columns = load_model()
    if model is None:
        return
    
    try:
        # Load only recent data to save memory
        df = pd.read_csv('ETHUSD_1m_Binance.csv')
        
        # Use only the last 1000 rows for live testing
        df = df.tail(1000).copy()
        print(f"Using last 1000 rows for live prediction test")
        
        # Create features for the recent data
        df_with_features = create_features(df)
        
        # Get valid data points
        df_clean = df_with_features[feature_columns].dropna()
        
        if len(df_clean) == 0:
            print("No valid data points found.")
            return
        
        # Test with last 5 data points
        print(f"\nPredictions for last 5 data points:")
        print("-" * 60)
        
        for i in range(max(0, len(df_clean) - 5), len(df_clean)):
            current_data = df_clean.iloc[i]
            prediction, probability = predict_single_point(model, scaler, feature_columns, current_data)
            
            print(f"Data point {i+1}:")
            print(f"  Prediction: {'PROFIT OPPORTUNITY' if prediction == 1 else 'NO PROFIT'}")
            print(f"  Confidence: {probability:.4f}")
            print(f"  Recommendation: {'BUY' if probability >= 0.7 else 'WAIT'}")
            print()
            
    except Exception as e:
        print(f"Error in live prediction test: {e}")

def main():
    """Main testing function (memory optimized)"""
    print("Loading trained model...")
    
    # Load model components
    model, scaler, feature_columns = load_model()
    if model is None:
        return
    
    # Load test data with memory management
    print("Loading test data...")
    try:
        df = pd.read_csv('ETHUSD_1m_Binance.csv')
        
        # Use last portion of data for testing (memory efficient)
        test_size = min(50000, int(len(df) * 0.2))  # Limit test size
        df_test = df.tail(test_size).copy()
        
        print(f"Test data shape: {df_test.shape}")
        
        # Clear original dataframe
        del df
        gc.collect()
        
        # Evaluate model performance
        evaluate_model_performance(df_test, model, scaler, feature_columns)
        
        # Backtest strategy
        print("\nRunning backtest...")
        results = backtest_strategy(df_test, model, scaler, feature_columns, confidence_threshold=0.7)
        
        # Test different confidence thresholds (if we have results)
        if results is not None:
            print("\nTesting different confidence thresholds:")
            for threshold in [0.5, 0.6, 0.7, 0.8, 0.9]:
                total_signals = len(results[results['probability'] >= threshold])
                if total_signals > 0:
                    correct_signals = len(results[(results['probability'] >= threshold) & (results['target'] == 1)])
                    precision = correct_signals / total_signals
                    print(f"Threshold {threshold}: {total_signals} signals, {precision:.4f} precision")
        
        # Clear test data
        del df_test
        if results is not None:
            del results
        gc.collect()
        
    except Exception as e:
        print(f"Error loading test data: {e}")
        print("Trying with smaller sample...")
        try:
            # Try with very small sample
            df = pd.read_csv('ETHUSD_1m_Binance.csv', nrows=10000)
            evaluate_model_performance(df, model, scaler, feature_columns)
        except Exception as e2:
            print(f"Error even with small sample: {e2}")
    
    # Test live predictions
    test_live_prediction()

if __name__ == "__main__":
    main()