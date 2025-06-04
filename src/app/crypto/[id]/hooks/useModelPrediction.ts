import { useState, useEffect, useCallback } from 'react';
import { BinanceKlineRaw } from '../types';

export interface ModelPrediction {
  prediction: number;
  probability: number;
  confidence: 'low' | 'medium' | 'high';
  recommendation: 'BUY' | 'SELL' | 'WAIT';
  current_price?: number;
  price_change_24h?: number;
  technical_summary?: {
    rsi?: number;
    macd?: number;
    bb_position?: number;
    volatility?: number;
  };
  data_points?: number;
  timestamp?: number;
  error?: string;
}

interface UseModelPredictionOptions {
  binanceCandles: BinanceKlineRaw[];
  enabled: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseModelPredictionReturn {
  prediction: ModelPrediction | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  generatePrediction: () => Promise<void>;
}

export function useModelPrediction({ 
  binanceCandles, 
  enabled = true,
  refreshInterval = 60000 // 1 minute default
}: UseModelPredictionOptions): UseModelPredictionReturn {
  const [prediction, setPrediction] = useState<ModelPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const generatePrediction = useCallback(async () => {
    if (!binanceCandles || binanceCandles.length === 0) {
      setError('No data available for prediction');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          klineData: binanceCandles
        }),
      });

      if (!response.ok) {
        throw new Error(`Prediction failed: ${response.statusText}`);
      }

      const result: ModelPrediction = await response.json();
      
      if (result.error) {
        setError(result.error);
        setPrediction(result); // Still set prediction with error info
      } else {
        setPrediction(result);
        setLastUpdated(new Date());
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setPrediction({
        prediction: 0,
        probability: 0.5,
        confidence: 'low',
        recommendation: 'WAIT',
        error: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [binanceCandles]);

  // Auto-refresh predictions
  useEffect(() => {
    if (!enabled || !binanceCandles.length) return;

    // Generate initial prediction
    generatePrediction();

    // Set up auto-refresh
    const intervalId = setInterval(() => {
      generatePrediction();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [enabled, binanceCandles.length, refreshInterval, generatePrediction]);

  return {
    prediction,
    loading,
    error,
    lastUpdated,
    generatePrediction
  };
}