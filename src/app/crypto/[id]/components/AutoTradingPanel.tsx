import React, { useState } from 'react';
import { useAutoTrading, AutoTradeSettings, AutoTradePosition } from '../hooks/useAutoTrading';
import { ModelPrediction } from '../hooks/useModelPrediction';

interface AutoTradingPanelProps {
  symbol: string;
  currentPrice: number;
  prediction: ModelPrediction | null;
  coinName?: string;
}

export function AutoTradingPanel({ symbol, currentPrice, prediction, coinName }: AutoTradingPanelProps) {
  const [settings, setSettings] = useState<AutoTradeSettings>({
    enabled: false,
    maxTradeAmount: 100,
    profitTarget: 0.012,
    stopLoss: 0.005,
    minConfidence: 'medium'
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const {
    currentPosition,
    stats,
    isProcessing,
    lastAction,
    tradeLog
  } = useAutoTrading({
    symbol,
    currentPrice,
    prediction,
    settings
  });

  const handleToggleAutoTrade = () => {
    setSettings(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const resetStats = () => {
    localStorage.removeItem(`auto-trade-stats-${symbol}`);
    localStorage.removeItem(`auto-trade-log-${symbol}`);
    window.location.reload(); // Simple way to reset state
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  const getPositionPnL = (position: AutoTradePosition | null) => {
    if (!position) return { pnl: 0, percentage: 0 };
    const pnl = (currentPrice - position.buyPrice) * position.amount;
    const percentage = ((currentPrice - position.buyPrice) / position.buyPrice) * 100;
    return { pnl, percentage };
  };

  const positionPnL = getPositionPnL(currentPosition);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Auto Trading {coinName || symbol.toUpperCase()}
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Settings"
          >
            ⚙️
          </button>
          <div className={`w-3 h-3 rounded-full ${settings.enabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`mb-4 p-3 rounded-lg border ${
        settings.enabled 
          ? 'bg-green-50 border-green-200 text-green-800' 
          : 'bg-red-50 border-red-200 text-red-800'
      }`}>
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {settings.enabled ? '🤖 Auto Trading Active' : '⏸️ Auto Trading Disabled'}
          </span>
          <button
            onClick={handleToggleAutoTrade}
            className={`px-3 py-1 rounded text-sm font-medium ${
              settings.enabled
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {settings.enabled ? 'Stop' : 'Start'}
          </button>
        </div>
        {isProcessing && (
          <div className="mt-2 text-sm">🔄 Processing trade...</div>
        )}
        {lastAction && (
          <div className="mt-2 text-sm">Last action: {lastAction}</div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
          <h4 className="font-medium text-gray-800 mb-3">Trading Settings</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Trade Amount (USD)
              </label>
              <input
                type="number"
                value={settings.maxTradeAmount}
                onChange={(e) => setSettings(prev => ({ ...prev, maxTradeAmount: parseFloat(e.target.value) || 100 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                min="10"
                max="1000"
                step="10"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Profit Target (%)
              </label>
              <input
                type="number"
                value={(settings.profitTarget * 100).toFixed(1)}
                onChange={(e) => setSettings(prev => ({ ...prev, profitTarget: (parseFloat(e.target.value) || 1.2) / 100 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                min="0.5"
                max="5.0"
                step="0.1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stop Loss (%)
              </label>
              <input
                type="number"
                value={(settings.stopLoss * 100).toFixed(1)}
                onChange={(e) => setSettings(prev => ({ ...prev, stopLoss: (parseFloat(e.target.value) || 0.5) / 100 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                min="0.1"
                max="2.0"
                step="0.1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Confidence for Buy
              </label>
              <select
                value={settings.minConfidence}
                onChange={(e) => setSettings(prev => ({ ...prev, minConfidence: e.target.value as 'medium' | 'high' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="medium">Medium or High</option>
                <option value="high">High Only</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Current Position */}
      {currentPosition && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2">Current Position</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Amount:</span>
              <span>{currentPosition.amount.toFixed(6)} {symbol.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>Buy Price:</span>
              <span>${currentPosition.buyPrice.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span>Current Price:</span>
              <span>${currentPrice.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span>Target Price:</span>
              <span className="text-green-600">${currentPosition.targetSellPrice.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span>Stop Loss:</span>
              <span className="text-red-600">${currentPosition.stopLossPrice.toFixed(4)}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-2">
              <span>Unrealized P&L:</span>
              <span className={positionPnL.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                {positionPnL.pnl >= 0 ? '+' : ''}${positionPnL.pnl.toFixed(2)} ({positionPnL.percentage >= 0 ? '+' : ''}{positionPnL.percentage.toFixed(2)}%)
              </span>
            </div>
            <div className="text-xs text-gray-600">
              Opened {formatTimeAgo(currentPosition.timestamp)}
            </div>
          </div>
        </div>
      )}

      {/* Trading Stats */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-3">Performance Stats</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{stats.totalTrades}</div>
            <div className="text-xs text-gray-600">Total Trades</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${stats.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{stats.winningTrades}</div>
            <div className="text-xs text-gray-600">Wins</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">{stats.losingTrades}</div>
            <div className="text-xs text-gray-600">Losses</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t text-center">
          <div className={`text-xl font-bold ${stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toFixed(2)}
          </div>
          <div className="text-xs text-gray-600">Total Profit/Loss</div>
        </div>
      </div>

      {/* Current ML Prediction */}
      {prediction && (
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="font-medium text-yellow-800 mb-2">Current ML Signal</h4>
          <div className="flex items-center justify-between text-sm">
            <span>Recommendation:</span>
            <span className={`font-medium px-2 py-1 rounded text-xs ${
              prediction.recommendation === 'BUY' ? 'bg-green-100 text-green-800' :
              prediction.recommendation === 'SELL' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {prediction.recommendation}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span>Confidence:</span>
            <span className={`font-medium ${
              prediction.confidence === 'high' ? 'text-green-600' :
              prediction.confidence === 'medium' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {prediction.confidence} ({(prediction.probability * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      )}

      {/* Trade Log */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-800">Trade Log</h4>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowLog(!showLog)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showLog ? 'Hide' : 'Show'} Log
            </button>
            {stats.totalTrades > 0 && (
              <button
                onClick={resetStats}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Reset
              </button>
            )}
          </div>
        </div>
        
        {showLog && (
          <div className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono max-h-60 overflow-y-auto">
            {tradeLog.length === 0 ? (
              <div className="text-gray-500">No trades yet. Enable auto trading to start.</div>
            ) : (
              tradeLog.map((entry, index) => (
                <div key={index} className="mb-1">
                  {entry}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}