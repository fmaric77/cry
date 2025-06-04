import React from 'react';
import { ModelPrediction } from '../hooks';

interface PredictionPanelProps {
  prediction: ModelPrediction | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  onRefresh: () => void;
}

export function PredictionPanel({ 
  prediction, 
  loading, 
  error, 
  lastUpdated, 
  onRefresh 
}: PredictionPanelProps) {
  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'BUY': return 'text-green-600 bg-green-50 border-green-200';
      case 'SELL': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-red-600';
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.7) return 'text-green-600';
    if (probability >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">AI Profit Prediction</h3>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {prediction && (
        <div className="space-y-4">
          {/* Main Recommendation */}
          <div className={`p-4 rounded-lg border-2 ${getRecommendationColor(prediction.recommendation)}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Recommendation:</span>
                <div className="text-2xl font-bold">{prediction.recommendation}</div>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium">Confidence:</span>
                <div className={`text-lg font-semibold capitalize ${getConfidenceColor(prediction.confidence)}`}>
                  {prediction.confidence}
                </div>
              </div>
            </div>
          </div>

          {/* Probability and Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="text-sm text-gray-600">Profit Probability</span>
              <div className={`text-xl font-bold ${getProbabilityColor(prediction.probability)}`}>
                {(prediction.probability * 100).toFixed(1)}%
              </div>
            </div>
            
            {prediction.current_price && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="text-sm text-gray-600">Current Price</span>
                <div className="text-xl font-bold">
                  ${prediction.current_price.toFixed(4)}
                </div>
              </div>
            )}
          </div>

          {/* Technical Indicators */}
          {prediction.technical_summary && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Technical Indicators</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {prediction.technical_summary.rsi !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">RSI:</span>
                    <span className={`font-medium ${
                      prediction.technical_summary.rsi > 70 ? 'text-red-600' : 
                      prediction.technical_summary.rsi < 30 ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {prediction.technical_summary.rsi.toFixed(1)}
                    </span>
                  </div>
                )}
                
                {prediction.technical_summary.macd !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">MACD:</span>
                    <span className={`font-medium ${
                      prediction.technical_summary.macd > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {prediction.technical_summary.macd.toFixed(4)}
                    </span>
                  </div>
                )}
                
                {prediction.technical_summary.bb_position !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">BB Position:</span>
                    <span className={`font-medium ${
                      prediction.technical_summary.bb_position > 0.8 ? 'text-red-600' : 
                      prediction.technical_summary.bb_position < 0.2 ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {(prediction.technical_summary.bb_position * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                
                {prediction.technical_summary.volatility !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Volatility:</span>
                    <span className="font-medium text-gray-900">
                      {prediction.technical_summary.volatility.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="border-t pt-3 text-xs text-gray-500 space-y-1">
            {prediction.data_points && (
              <div>Data points analyzed: {prediction.data_points}</div>
            )}
            {lastUpdated && (
              <div>Last updated: {lastUpdated.toLocaleTimeString()}</div>
            )}
            <div className="text-yellow-600 font-medium">
              ⚠️ This is an AI prediction. Always do your own research before trading.
            </div>
          </div>
        </div>
      )}

      {!prediction && !loading && !error && (
        <div className="text-center text-gray-500 py-8">
          <p>Click "Refresh" to generate a prediction</p>
        </div>
      )}
    </div>
  );
}