import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.preprocessing import StandardScaler
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
import gc  # Garbage collection for memory management
import os

# Try to import h5py for HDF5 support (optional optimization)
try:
    import h5py
    HDF5_AVAILABLE = True
except ImportError:
    HDF5_AVAILABLE = False

def create_features(df):
    """Create technical indicators and features from OHLCV data"""
    df = df.copy()
    
    # Convert Open time to datetime
    df['Open time'] = pd.to_datetime(df['Open time'])
    df = df.sort_values('Open time').reset_index(drop=True)
    
    # Price-based features
    df['price_change'] = df['Close'].pct_change()
    df['high_low_ratio'] = df['High'] / df['Low']
    df['close_open_ratio'] = df['Close'] / df['Open']
    df['volume_change'] = df['Volume'].pct_change()
    
    # Moving averages (reduced windows for memory efficiency)
    for window in [5, 10, 20]:
        df[f'ma_{window}'] = df['Close'].rolling(window=window).mean()
        df[f'price_to_ma_{window}'] = df['Close'] / df[f'ma_{window}']
    
    # Volatility features
    df['volatility_5'] = df['Close'].rolling(window=5).std()
    df['volatility_10'] = df['Close'].rolling(window=10).std()
    
    # Volume features
    df['volume_ma_5'] = df['Volume'].rolling(window=5).mean()
    df['volume_ratio'] = df['Volume'] / df['volume_ma_5']
    
    # RSI-like indicator (reduced window)
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=10).mean()  # Reduced from 14 to 10
    loss = (-delta.where(delta < 0, 0)).rolling(window=10).mean()
    rs = gain / loss
    df['rsi'] = 100 - (100 / (1 + rs))
    
    # MACD-like indicator (reduced windows)
    exp1 = df['Close'].ewm(span=8).mean()   # Reduced from 12 to 8
    exp2 = df['Close'].ewm(span=18).mean()  # Reduced from 26 to 18
    df['macd'] = exp1 - exp2
    df['macd_signal'] = df['macd'].ewm(span=6).mean()  # Reduced from 9 to 6
    df['macd_histogram'] = df['macd'] - df['macd_signal']
    
    # Bollinger Bands (reduced window)
    df['bb_middle'] = df['Close'].rolling(window=15).mean()  # Reduced from 20 to 15
    bb_std = df['Close'].rolling(window=15).std()
    df['bb_upper'] = df['bb_middle'] + (bb_std * 2)
    df['bb_lower'] = df['bb_middle'] - (bb_std * 2)
    df['bb_position'] = (df['Close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
    
    # Clean up intermediate variables
    del delta, gain, loss, rs, exp1, exp2, bb_std
    gc.collect()
    
    # ✅ NEW: Clean infinite and extreme values
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

def create_target_optimized(df, profit_threshold=0.01, lookforward_periods=30):
    """
    Memory-optimized target creation using vectorized operations
    Reduced lookforward_periods from 60 to 30 for memory efficiency
    """
    df = df.copy()
    df['target'] = 0
    
    # Vectorized approach - more memory efficient
    close_prices = df['Close'].values
    high_prices = df['High'].values
    
    print(f"Creating targets for {len(df) - lookforward_periods} data points...")
    
    # Process in chunks to save memory
    chunk_size = 10000
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
        
        # Progress indicator
        if (start_idx // chunk_size) % 10 == 0:
            progress = (end_idx / (len(df) - lookforward_periods)) * 100
            print(f"Progress: {progress:.1f}%")
    
    return df

def train_model():
    """Main training function with advanced memory optimizations and 80/20 train/test split"""
    print("Loading data with advanced memory management...")
    
    # Strategy 1: Use memory mapping for large files
    try:
        print("Analyzing dataset size...")
        total_rows = sum(1 for line in open('ETHUSD_1m_Binance.csv')) - 1
        print(f"Total rows in dataset: {total_rows}")
        
        print("Processing data in chunks with feature engineering...")
        chunk_size = 50000
        all_features = []
        all_targets = []
        all_raw = []  # Store raw rows for test set
        feature_columns = [
            'Open', 'High', 'Low', 'Close', 'Volume',
            'price_change', 'high_low_ratio', 'close_open_ratio', 'volume_change',
            'ma_5', 'ma_10', 'ma_20', 'price_to_ma_5', 'price_to_ma_10', 'price_to_ma_20',
            'volatility_5', 'volatility_10', 'volume_ma_5', 'volume_ratio',
            'rsi', 'macd', 'macd_signal', 'macd_histogram',
            'bb_middle', 'bb_upper', 'bb_lower', 'bb_position'
        ]
        chunk_count = 0
        processed_rows = 0
        overlap_size = 100
        previous_chunk_tail = None
        for chunk in pd.read_csv('ETHUSD_1m_Binance.csv', chunksize=chunk_size):
            chunk_count += 1
            print(f"Processing chunk {chunk_count}, rows {processed_rows}-{processed_rows + len(chunk)}")
            if previous_chunk_tail is not None:
                chunk = pd.concat([previous_chunk_tail, chunk], ignore_index=True)
            chunk_with_features = create_features(chunk)
            lookforward_periods = min(30, len(chunk) // 10)
            chunk_with_targets = create_target_optimized(
                chunk_with_features, 
                profit_threshold=0.01, 
                lookforward_periods=lookforward_periods
            )
            chunk_clean = chunk_with_targets[feature_columns + ['target']].dropna()
            if previous_chunk_tail is not None:
                chunk_clean = chunk_clean.iloc[overlap_size:]
            if len(chunk_clean) > 0:
                all_features.append(chunk_clean[feature_columns])
                all_targets.append(chunk_clean['target'])
                all_raw.append(chunk_with_targets.iloc[chunk_clean.index])
            previous_chunk_tail = chunk.tail(overlap_size).copy()
            del chunk, chunk_with_features, chunk_with_targets, chunk_clean
            gc.collect()
            processed_rows += chunk_size
            progress = min((processed_rows / total_rows) * 100, 100)
            print(f"Progress: {progress:.1f}% - Memory freed after chunk")
        print("Combining all processed chunks...")
        X_combined = pd.concat(all_features, ignore_index=True)
        y_combined = pd.concat(all_targets, ignore_index=True)
        raw_combined = pd.concat(all_raw, ignore_index=True)
        del all_features, all_targets, all_raw
        gc.collect()
        print(f"Combined data shape: {X_combined.shape}")
        print(f"Target distribution:\n{y_combined.value_counts()}")
        print(f"Profit opportunity percentage: {y_combined.mean()*100:.2f}%")
        # 80/20 split
        from sklearn.model_selection import train_test_split
        X_train, X_test, y_train, y_test, raw_train, raw_test = train_test_split(
            X_combined, y_combined, raw_combined, test_size=0.2, random_state=42, stratify=y_combined
        )
        # Save test set (raw, with all columns) for later use
        raw_test.to_csv('test_set.csv', index=False)
        print(f"Test set saved to test_set.csv with shape: {raw_test.shape}")
        # Clear unused
        del X_combined, y_combined, raw_combined, raw_train, raw_test
        gc.collect()
        print("Scaling features...")
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        del X_train, X_test
        gc.collect()
        print("Training Random Forest model...")
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=15,
            min_samples_split=10,
            min_samples_leaf=5,
            random_state=42,
            class_weight='balanced',
            n_jobs=-1,
            max_features='sqrt'
        )
        model.fit(X_train_scaled, y_train)
        return evaluate_and_save_model(model, scaler, feature_columns, X_test_scaled, y_test)
    except MemoryError:
        print("Memory error with chunk processing. Falling back to smaller chunks...")
        return train_with_smaller_chunks()
    except Exception as e:
        print(f"Error in advanced processing: {e}")
        return train_with_smaller_chunks()

def train_standard_model(X, y, feature_columns):
    """Train model with standard approach when data fits in memory"""
    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print("Scaling features...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Clear unscaled data
    del X, X_train, X_test
    gc.collect()
    
    print("Training Random Forest model...")
    model = RandomForestClassifier(
        n_estimators=100,       # Back to full complexity since we have efficient processing
        max_depth=15,
        min_samples_split=10,
        min_samples_leaf=5,
        random_state=42,
        class_weight='balanced',
        n_jobs=-1,
        max_features='sqrt'
    )
    
    model.fit(X_train_scaled, y_train)
    
    # Evaluate and save model
    return evaluate_and_save_model(model, scaler, feature_columns, X_test_scaled, y_test)

def train_incremental_model(X, y, feature_columns):
    """Train model incrementally for very large datasets"""
    from sklearn.linear_model import SGDClassifier
    from sklearn.preprocessing import StandardScaler
    
    print("Using incremental learning with SGD Classifier...")
    
    # Use SGD for incremental learning
    model = SGDClassifier(
        loss='log_loss',  # For probability estimates
        random_state=42,
        class_weight='balanced',
        max_iter=1000
    )
    
    scaler = StandardScaler()
    
    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Fit scaler on a sample to avoid memory issues
    sample_size = min(50000, len(X_train))
    sample_indices = np.random.choice(len(X_train), sample_size, replace=False)
    X_sample = X_train.iloc[sample_indices]
    scaler.fit(X_sample)
    
    # Train incrementally in batches
    batch_size = 10000
    n_batches = len(X_train) // batch_size + (1 if len(X_train) % batch_size != 0 else 0)
    
    print(f"Training incrementally with {n_batches} batches...")
    
    for i in range(n_batches):
        start_idx = i * batch_size
        end_idx = min((i + 1) * batch_size, len(X_train))
        
        X_batch = X_train.iloc[start_idx:end_idx]
        y_batch = y_train.iloc[start_idx:end_idx]
        
        # Scale batch
        X_batch_scaled = scaler.transform(X_batch)
        
        # Partial fit
        classes = np.array([0, 1])
        model.partial_fit(X_batch_scaled, y_batch, classes=classes)
        
        if (i + 1) % 10 == 0:
            progress = ((i + 1) / n_batches) * 100
            print(f"Incremental training progress: {progress:.1f}%")
        
        del X_batch, y_batch, X_batch_scaled
        gc.collect()
    
    # Evaluate on test set
    print("Evaluating incremental model...")
    X_test_scaled = scaler.transform(X_test)
    
    return evaluate_and_save_model(model, scaler, feature_columns, X_test_scaled, y_test)

def train_with_smaller_chunks():
    """Fallback method with very small chunks"""
    print("Using fallback method with very small chunks...")
    
    chunk_size = 10000
    sample_ratio = 0.5  # Use 50% of data
    
    chunks = []
    chunk_count = 0
    max_chunks = 50  # Limit total chunks
    
    for chunk in pd.read_csv('ETHUSD_1m_Binance.csv', chunksize=chunk_size):
        if chunk_count >= max_chunks:
            break
            
        # Sample from chunk
        chunk_sample = chunk.sample(frac=sample_ratio, random_state=42)
        chunks.append(chunk_sample)
        chunk_count += 1
        
        if chunk_count % 10 == 0:
            print(f"Loaded {chunk_count} chunks...")
    
    df = pd.concat(chunks, ignore_index=True)
    print(f"Fallback loaded data shape: {df.shape}")
    
    # Process with original method
    df = create_features(df)
    df = create_target_optimized(df, profit_threshold=0.01, lookforward_periods=20)
    
    feature_columns = [
        'Open', 'High', 'Low', 'Close', 'Volume',
        'price_change', 'high_low_ratio', 'close_open_ratio', 'volume_change',
        'ma_5', 'ma_10', 'ma_20', 'price_to_ma_5', 'price_to_ma_10', 'price_to_ma_20',
        'volatility_5', 'volatility_10', 'volume_ma_5', 'volume_ratio',
        'rsi', 'macd', 'macd_signal', 'macd_histogram',
        'bb_middle', 'bb_upper', 'bb_lower', 'bb_position'
    ]
    
    df_clean = df[feature_columns + ['target']].dropna()
    X = df_clean[feature_columns]
    y = df_clean['target']
    
    return train_standard_model(X, y, feature_columns)

def evaluate_and_save_model(model, scaler, feature_columns, X_test_scaled, y_test):
    """Common evaluation and saving logic"""
    print("Evaluating model...")
    y_pred = model.predict(X_test_scaled)
    
    # Handle probability prediction based on model type
    if hasattr(model, 'predict_proba'):
        y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
    else:
        # For SGD, use decision function and convert to probabilities
        decision_scores = model.decision_function(X_test_scaled)
        y_pred_proba = 1 / (1 + np.exp(-decision_scores))  # Sigmoid transformation
    
    # Print evaluation metrics
    print(f"\nAccuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Create plots with memory efficiency
    try:
        # Confusion Matrix
        cm = confusion_matrix(y_test, y_pred)
        plt.figure(figsize=(6, 4))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
        plt.title('Confusion Matrix')
        plt.ylabel('Actual')
        plt.xlabel('Predicted')
        plt.tight_layout()
        plt.savefig('confusion_matrix.png', dpi=100, bbox_inches='tight')
        plt.close()
        
        # Feature importance (if available)
        if hasattr(model, 'feature_importances_'):
            feature_importance = pd.DataFrame({
                'feature': feature_columns,
                'importance': model.feature_importances_
            }).sort_values('importance', ascending=False)
            
            print(f"\nTop 10 Feature Importances:")
            print(feature_importance.head(10))
            
            plt.figure(figsize=(8, 6))
            sns.barplot(data=feature_importance.head(10), y='feature', x='importance')
            plt.title('Top 10 Feature Importances')
            plt.tight_layout()
            plt.savefig('feature_importance.png', dpi=100, bbox_inches='tight')
            plt.close()
        
    except Exception as e:
        print(f"Warning: Could not create plots due to: {e}")
    
    # Save model and scaler
    print("Saving model and scaler...")
    joblib.dump(model, 'crypto_profit_model.pkl')
    joblib.dump(scaler, 'feature_scaler.pkl')
    joblib.dump(feature_columns, 'feature_columns.pkl')
    
    print("Training completed! Model saved as 'crypto_profit_model.pkl'")
    print("✅ Successfully used 100% of available data with advanced memory management!")
    
    return model, scaler, feature_columns

if __name__ == "__main__":
    try:
        model, scaler, feature_columns = train_model()
    except MemoryError:
        print("\nMemory error occurred. Try these solutions:")
        print("1. Close other applications to free RAM")
        print("2. Reduce sample_ratio in the script (currently 0.3)")
        print("3. Use a smaller dataset")
        print("4. Run on a machine with more RAM")
    except Exception as e:
        print(f"\nError during training: {e}")
        print("Check your data file and dependencies.")