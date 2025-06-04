import React, { useState, useEffect, useMemo } from 'react';
import { useAutoTrading, AutoTradeSettings, AutoTradePosition } from '../hooks/useAutoTrading';
import { ModelPrediction } from '../hooks/useModelPrediction';
import { useIndicators } from '../hooks/useIndicators';
import { useTrading } from '../hooks/useTrading';
import { PricePoint, BinanceKlineRaw } from '../types';

interface AutoTradingPanelProps {
  symbol: string;
  currentPrice: number;
  prediction?: ModelPrediction | null;
  coinName?: string;
  binanceCandles: BinanceKlineRaw[];
  indicators?: any;
}

export function AutoTradingPanel({
  symbol,
  currentPrice,
  prediction,
  coinName,
  binanceCandles,
  indicators: passedIndicators
}: AutoTradingPanelProps) {
  // Add portfolio reference
  const { portfolio } = useTrading();

  // Calculate prices from binanceCandles for indicators
  const prices: PricePoint[] = useMemo(() => {
    if (!binanceCandles || binanceCandles.length === 0) return [];
    return binanceCandles.map(candle => [
      candle[0], // timestamp
      parseFloat(candle[4]) // close price
    ]);
  }, [binanceCandles]);

  // Calculate local indicators if not passed
  const { indicators } = useIndicators(prices, binanceCandles, {
    sma: {
      enabled: false,
      period: 20,
      color: '#f39c12'
    },
    ema: {
      enabled: false,
      period: 20,
      color: '#4ecdc4'
    },
    rsi: {
      enabled: false,
      period: 14,
      color: '#45b7d1'
    },
    macd: {
      enabled: false,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      colors: {
        macd: '#45b7d1',
        signal: '#ff6b6b',
        histogram: '#95a5a6'
      }
    },
    bb: {
      enabled: false,
      period: 20,
      stdDev: 2,
      colors: {
        upper: '#e74c3c',
        middle: '#f39c12',
        lower: '#27ae60'
      }
    },
    stoch: {
      enabled: false,
      kPeriod: 14,
      dPeriod: 3,
      colors: {
        k: '#9b59b6',
        d: '#e67e22'
      }
    }
  });

  // Use passed indicators if available, otherwise use local ones
  const finalIndicators = passedIndicators || indicators;

  const [settingsState, setSettingsState] = useState<AutoTradeSettings>({
    enabled: false,
    maxTradeAmount: 100,
    profitTarget: 0.012,
    stopLoss: 0.005,
    minConfidence: 'medium'
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [testMode, setTestMode] = useState(false);

  const {
    currentPosition,
    stats,
    isProcessing,
    lastAction,
    tradeLog,
    strategies,
    saveStrategy
  } = useAutoTrading({
    symbol,
    currentPrice,
    prediction: prediction || null,
    settings: settingsState,
    binanceCandles,
    indicators: finalIndicators,
    selectedPeriod: '1m'
  });

  // Strategy mode UI state
  const [newStrategy, setNewStrategy] = useState({
    name: '',
    description: '',
    logic: ''
  });
  const [showStrategyForm, setShowStrategyForm] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`auto-trade-settings-${symbol}`);
    if (saved) {
      try {
        setSettingsState(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch {}
    }
  }, [symbol]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`auto-trade-settings-${symbol}`, JSON.stringify(settingsState));
  }, [settingsState, symbol]);

  // Handle strategy mode change
  const handleStrategyModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettingsState(prev => ({ ...prev, strategyMode: e.target.value as 'default' | 'custom' }));
  };

  // Handle strategy selection
  const handleStrategySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettingsState(prev => ({ ...prev, selectedStrategyId: e.target.value }));
  };

  // Handle new strategy save
  const handleSaveStrategy = () => {
    if (!newStrategy.name || !newStrategy.logic) return;
    saveStrategy({
      id: newStrategy.name.toLowerCase().replace(/\s+/g, '-'),
      name: newStrategy.name,
      description: newStrategy.description,
      enabled: true,
      logic: newStrategy.logic
    });
    setNewStrategy({ name: '', description: '', logic: '' });
    setShowStrategyForm(false);
  };

  const handleToggleAutoTrade = () => {
    setSettingsState(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const resetStats = () => {
    localStorage.removeItem(`auto-trade-stats-${symbol}`);
    localStorage.removeItem(`auto-trade-log-${symbol}`);
    window.location.reload(); // Simple way to reset state
  };

  // Test helper functions
  const simulateStrategyConditions = () => {
    if (!testMode) return;
    
    // Simulate bb_lower_red_two_green conditions
    const fakeStrategy = strategies.find(s => s.logic === 'bb_lower_red_two_green');
    if (fakeStrategy && settingsState.strategyMode === 'custom' && settingsState.selectedStrategyId === fakeStrategy.id) {
      // Force trigger strategy buy for testing
      console.log('🧪 TEST MODE: Simulating strategy conditions met');
      // This would trigger the strategy logic
    }
  };

  const debugStrategyConditions = () => {
    if (!finalIndicators?.bb || !binanceCandles || binanceCandles.length < 3) {
      return {
        error: 'Insufficient data for strategy evaluation',
        hasData: false
      };
    }

    const lastCandles = binanceCandles.slice(-3);
    const [thirdLast, secondLast, latest] = lastCandles;
    const latestBB = finalIndicators.bb[finalIndicators.bb.length - 1];

    if (!latestBB) {
      return { error: 'No Bollinger Band data', hasData: false };
    }

    // Check each condition
    const priceHitLowerBand = lastCandles.some(candle => {
      const low = parseFloat(candle[3]);
      return low <= latestBB.lower * 1.001;
    });

    const hasRedCandle = parseFloat(thirdLast[4]) < parseFloat(thirdLast[1]);
    const firstGreen = parseFloat(secondLast[4]) > parseFloat(secondLast[1]);
    const secondGreen = parseFloat(latest[4]) > parseFloat(latest[1]);
    const hasTwoGreenCandles = firstGreen && secondGreen;

    const availableCash = portfolio?.cash ? portfolio.cash * 0.95 : 0;
    const hasEnoughCash = availableCash >= settingsState.maxTradeAmount;

    return {
      hasData: true,
      conditions: {
        priceHitLowerBand,
        hasRedCandle,
        hasTwoGreenCandles: hasTwoGreenCandles,
        hasEnoughCash,
        allMet: priceHitLowerBand && hasRedCandle && hasTwoGreenCandles && hasEnoughCash
      },
      data: {
        lowerBand: latestBB.lower,
        currentPrice,
        availableCash,
        requiredCash: settingsState.maxTradeAmount,
        candleColors: [
          `3rd: ${hasRedCandle ? 'RED' : 'GREEN'}`,
          `2nd: ${firstGreen ? 'GREEN' : 'RED'}`,
          `1st: ${secondGreen ? 'GREEN' : 'RED'}`
        ]
      }
    };
  };

  const debugInfo = debugStrategyConditions();

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
    <div className="bg-black rounded-lg shadow-lg p-6 border border-gray-800 text-white">
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
          <div className={`w-3 h-3 rounded-full ${settingsState.enabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`mb-4 p-3 rounded-lg border ${
        settingsState.enabled 
          ? 'bg-green-50 border-green-200 text-green-800' 
          : 'bg-red-50 border-red-200 text-red-800'
      }`}>
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {settingsState.enabled ? '🤖 Auto Trading Active' : '⏸️ Auto Trading Disabled'}
          </span>
          <button
            onClick={handleToggleAutoTrade}
            className={`px-3 py-1 rounded text-sm font-medium ${
              settingsState.enabled
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {settingsState.enabled ? 'Stop' : 'Start'}
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
        <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700 text-white">
          <h4 className="font-medium text-gray-100 mb-3">Trading Settings</h4>
          <div className="space-y-3">
            {/* Strategy Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Strategy Mode
              </label>
              <select
                value={settingsState.strategyMode || 'default'}
                onChange={handleStrategyModeChange}
                className="w-full px-3 py-2 border border-gray-600 rounded-md text-sm bg-gray-700 text-white"
              >
                <option value="default">Default (ML Buy/Sell)</option>
                <option value="custom">Custom Strategy</option>
              </select>
            </div>
            {/* Custom Strategy Selection */}
            {settingsState.strategyMode === 'custom' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Select Strategy
                </label>
                <select
                  value={settingsState.selectedStrategyId || ''}
                  onChange={handleStrategySelect}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md text-sm bg-gray-700 text-white"
                >
                  <option value="">-- Select --</option>
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button
                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm"
                  onClick={() => setShowStrategyForm((v) => !v)}
                  type="button"
                >
                  {showStrategyForm ? 'Cancel' : 'Add New Strategy'}
                </button>
                {showStrategyForm && (
                  <div className="mt-2 space-y-2 p-2 border rounded bg-gray-800 text-white border-gray-700">
                    <input
                      type="text"
                      placeholder="Strategy Name"
                      value={newStrategy.name}
                      onChange={e => setNewStrategy(s => ({ ...s, name: e.target.value }))}
                      className="w-full px-2 py-1 border rounded text-sm bg-gray-700 text-white"
                    />
                    <textarea
                      placeholder="Description (optional)"
                      value={newStrategy.description}
                      onChange={e => setNewStrategy(s => ({ ...s, description: e.target.value }))}
                      className="w-full px-2 py-1 border rounded text-sm bg-gray-700 text-white"
                    />
                    <input
                      type="text"
                      placeholder="Logic (e.g. bb_lower_red_two_green)"
                      value={newStrategy.logic}
                      onChange={e => setNewStrategy(s => ({ ...s, logic: e.target.value }))}
                      className="w-full px-2 py-1 border rounded text-sm bg-gray-700 text-white"
                    />
                    <button
                      className="mt-1 px-3 py-1 bg-green-600 text-white rounded text-sm"
                      onClick={handleSaveStrategy}
                      type="button"
                    >
                      Save Strategy
                    </button>
                  </div>
                )}
                {/* Show selected strategy description */}
                {settingsState.selectedStrategyId && (
                  <div className="mt-2 text-xs text-gray-300 bg-gray-800 p-2 rounded border border-gray-700">
                    {strategies.find(s => s.id === settingsState.selectedStrategyId)?.description}
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Max Trade Amount (USD)
              </label>
              <input
                type="number"
                value={settingsState.maxTradeAmount}
                onChange={(e) => setSettingsState(prev => ({ ...prev, maxTradeAmount: parseFloat(e.target.value) || 100 }))}
                className="w-full px-3 py-2 border border-gray-600 rounded-md text-sm bg-gray-700 text-white"
                min="10"
                max="1000"
                step="10"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Profit Target (%)
              </label>
              <input
                type="number"
                value={(settingsState.profitTarget * 100).toFixed(1)}
                onChange={(e) => setSettingsState(prev => ({ ...prev, profitTarget: (parseFloat(e.target.value) || 1.2) / 100 }))}
                className="w-full px-3 py-2 border border-gray-600 rounded-md text-sm bg-gray-700 text-white"
                min="0.5"
                max="5.0"
                step="0.1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Stop Loss (%)
              </label>
              <input
                type="number"
                value={(settingsState.stopLoss * 100).toFixed(1)}
                onChange={(e) => setSettingsState(prev => ({ ...prev, stopLoss: (parseFloat(e.target.value) || 0.5) / 100 }))}
                className="w-full px-3 py-2 border border-gray-600 rounded-md text-sm bg-gray-700 text-white"
                min="0.1"
                max="2.0"
                step="0.1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Minimum Confidence for Buy
              </label>
              <select
                value={settingsState.minConfidence}
                onChange={(e) => setSettingsState(prev => ({ ...prev, minConfidence: e.target.value as 'medium' | 'high' }))}
                className="w-full px-3 py-2 border border-gray-600 rounded-md text-sm bg-gray-700 text-white"
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
        <div className="mb-4 p-4 bg-blue-800 rounded-lg border border-blue-700 text-white">
          <h4 className="font-medium text-white mb-2">Current Position</h4>
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
              <span className="text-green-400">${currentPosition.targetSellPrice.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span>Stop Loss:</span>
              <span className="text-red-400">${currentPosition.stopLossPrice.toFixed(4)}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-2">
              <span>Unrealized P&L:</span>
              <span className={positionPnL.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                {positionPnL.pnl >= 0 ? '+' : ''}${positionPnL.pnl.toFixed(2)} ({positionPnL.percentage >= 0 ? '+' : ''}{positionPnL.percentage.toFixed(2)}%)
              </span>
            </div>
            <div className="text-xs text-gray-400">
              Opened {formatTimeAgo(currentPosition.timestamp)}
            </div>
          </div>
        </div>
      )}

      {/* Trading Stats */}
      <div className="mb-4 p-4 bg-gray-800 rounded-lg text-white">
        <h4 className="font-medium text-gray-100 mb-3">Performance Stats</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{stats.totalTrades}</div>
            <div className="text-xs text-gray-400">Total Trades</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${stats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-400">{stats.winningTrades}</div>
            <div className="text-xs text-gray-400">Wins</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-400">{stats.losingTrades}</div>
            <div className="text-xs text-gray-400">Losses</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t text-center">
          <div className={`text-xl font-bold ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toFixed(2)}
          </div>
          <div className="text-xs text-gray-400">Total Profit/Loss</div>
        </div>
      </div>

      {/* Current ML Prediction */}
      {prediction && (
        <div className="mb-4 p-3 bg-yellow-800 rounded-lg border border-yellow-700 text-white">
          <h4 className="font-medium text-white mb-2">Current ML Signal</h4>
          <div className="flex items-center justify-between text-sm">
            <span>Recommendation:</span>
            <span className={`font-medium px-2 py-1 rounded text-xs bg-gray-900 text-white`}>
              {prediction.recommendation}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span>Confidence:</span>
            <span className="font-medium text-white">
              {prediction.confidence} ({(prediction.probability * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      )}

      {/* Debug Panel */}
      {showDebug && (
        <div className="mb-4 p-4 bg-gray-900 rounded-lg border border-gray-600 text-white">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-100">Strategy Debug Info</h4>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setTestMode(!testMode)}
                className={`px-2 py-1 rounded text-xs ${testMode ? 'bg-orange-600' : 'bg-gray-600'}`}
              >
                {testMode ? 'Test Mode ON' : 'Test Mode OFF'}
              </button>
              {testMode && (
                <button
                  onClick={simulateStrategyConditions}
                  className="px-2 py-1 bg-blue-600 rounded text-xs"
                >
                  Simulate Trigger
                </button>
              )}
            </div>
          </div>
          
          {debugInfo.hasData ? (
            <div className="space-y-2 text-sm">
              <div className="font-medium text-yellow-400">Strategy Conditions (bb_lower_red_two_green):</div>
              <div className="grid grid-cols-2 gap-2">
                <div className={`p-2 rounded ${debugInfo.conditions.priceHitLowerBand ? 'bg-green-800' : 'bg-red-800'}`}>
                  ✓ Price Hit Lower Band: {debugInfo.conditions.priceHitLowerBand ? 'YES' : 'NO'}
                  <div className="text-xs">Lower: ${debugInfo.data.lowerBand.toFixed(4)}</div>
                </div>
                <div className={`p-2 rounded ${debugInfo.conditions.hasRedCandle ? 'bg-green-800' : 'bg-red-800'}`}>
                  ✓ Red Candle: {debugInfo.conditions.hasRedCandle ? 'YES' : 'NO'}
                </div>
                <div className={`p-2 rounded ${debugInfo.conditions.hasTwoGreenCandles ? 'bg-green-800' : 'bg-red-800'}`}>
                  ✓ Two Green Candles: {debugInfo.conditions.hasTwoGreenCandles ? 'YES' : 'NO'}
                </div>
                <div className={`p-2 rounded ${debugInfo.conditions.hasEnoughCash ? 'bg-green-800' : 'bg-red-800'}`}>
                  ✓ Enough Cash: {debugInfo.conditions.hasEnoughCash ? 'YES' : 'NO'}
                  <div className="text-xs">${debugInfo.data.availableCash.toFixed(2)} / ${debugInfo.data.requiredCash}</div>
                </div>
              </div>
              
              <div className="mt-3 p-2 rounded bg-gray-800">
                <div className="font-medium">Candle Pattern:</div>
                <div className="text-xs">{debugInfo.data.candleColors.join(' → ')}</div>
              </div>
              
              <div className={`mt-3 p-2 rounded font-bold ${debugInfo.conditions.allMet ? 'bg-green-700' : 'bg-red-700'}`}>
                Overall: {debugInfo.conditions.allMet ? 'CONDITIONS MET! 🚀' : 'Waiting for conditions...'}
              </div>
            </div>
          ) : (
            <div className="text-red-400">{debugInfo.error}</div>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-100">Trade Log</h4>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-sm text-purple-400 hover:text-purple-200"
            >
              {showDebug ? 'Hide' : 'Show'} Debug
            </button>
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