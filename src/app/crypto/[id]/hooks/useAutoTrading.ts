import { useState, useEffect, useCallback, useRef } from 'react';
import { useTrading } from './useTrading';
import { ModelPrediction } from './useModelPrediction';
import { BinanceKlineRaw, BollingerBandsValue } from '../types';

export interface AutoTradePosition {
  symbol: string;
  buyPrice: number;
  amount: number;
  timestamp: number;
  targetSellPrice: number; // +1% from buy price for bb_lower_red_two_green strategy
  stopLossPrice: number;   // -0.5% from buy price
  strategy?: string; // Track which strategy was used
}

export interface AutoTradeStrategy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  // In a real system, this could be a function or a DSL string
  logic: string; // For now, store as a string description
}

export interface AutoTradeSettings {
  enabled: boolean;
  maxTradeAmount: number; // Max dollar amount per trade
  profitTarget: number;   // 1.2% = 0.012
  stopLoss: number;       // 0.5% = 0.005
  minConfidence: 'medium' | 'high'; // Minimum confidence for buy signals
  strategyMode?: 'default' | 'custom';
  selectedStrategyId?: string;
  testMode?: boolean; // Add test mode flag
  fastTesting?: boolean; // Speed up conditions for testing
}

export interface AutoTradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  winRate: number;
}

interface UseAutoTradingOptions {
  symbol: string;
  currentPrice: number;
  prediction: ModelPrediction | null;
  settings: AutoTradeSettings;
  selectedPeriod: string;
  indicators: any;
  binanceCandles: BinanceKlineRaw[];
  candles?: BinanceKlineRaw[]; // Add candle data for strategy evaluation
  bollingerBands?: BollingerBandsValue[]; // Add Bollinger Bands data
}

interface UseAutoTradingReturn {
  currentPosition: AutoTradePosition | null;
  stats: AutoTradeStats;
  isProcessing: boolean;
  lastAction: string | null;
  tradeLog: string[];
  strategies: AutoTradeStrategy[];
  saveStrategy: (strategy: AutoTradeStrategy) => void;
}

const DEFAULT_SETTINGS: AutoTradeSettings = {
  enabled: false,
  maxTradeAmount: 100, // $100 per trade
  profitTarget: 0.012, // 1.2%
  stopLoss: 0.005,     // 0.5%
  minConfidence: 'medium'
};

export function useAutoTrading({
  symbol,
  currentPrice,
  prediction,
  settings,
  selectedPeriod,
  indicators,
  binanceCandles,
  candles,
  bollingerBands
}: UseAutoTradingOptions): UseAutoTradingReturn {
  const { portfolio, buyAsset, sellAsset, getHolding } = useTrading();
  const [currentPosition, setCurrentPosition] = useState<AutoTradePosition | null>(null);
  const [stats, setStats] = useState<AutoTradeStats>({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalProfit: 0,
    winRate: 0
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [tradeLog, setTradeLog] = useState<string[]>([]);
  const [strategies, setStrategies] = useState<AutoTradeStrategy[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('auto-trade-strategies');
      if (saved) return JSON.parse(saved);
    }
    // Default example strategy
    return [
      {
        id: 'default-bb-green',
        name: 'Bollinger Band + Green Candles',
        description: 'Buy when price hits lower Bollinger Band, red candle closes, then two green candles close',
        enabled: true,
        logic: 'bb_lower_red_two_green'
      }
    ];
  });

  const lastPriceRef = useRef<number>(currentPrice);
  const lastPredictionRef = useRef<ModelPrediction | null>(null);
  const wasEnabledRef = useRef<boolean>(settings.enabled);

  // Load saved state from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem(`auto-trade-position-${symbol}`);
    const savedStats = localStorage.getItem(`auto-trade-stats-${symbol}`);
    const savedLog = localStorage.getItem(`auto-trade-log-${symbol}`);
    
    if (savedPosition) {
      try {
        setCurrentPosition(JSON.parse(savedPosition));
      } catch (e) {
        console.error('Failed to load auto-trade position:', e);
      }
    }
    
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats));
      } catch (e) {
        console.error('Failed to load auto-trade stats:', e);
      }
    }
    
    if (savedLog) {
      try {
        setTradeLog(JSON.parse(savedLog));
      } catch (e) {
        console.error('Failed to load trade log:', e);
      }
    }
  }, [symbol]);

  // Save state to localStorage
  const saveState = useCallback(() => {
    localStorage.setItem(`auto-trade-position-${symbol}`, JSON.stringify(currentPosition));
    localStorage.setItem(`auto-trade-stats-${symbol}`, JSON.stringify(stats));
    localStorage.setItem(`auto-trade-log-${symbol}`, JSON.stringify(tradeLog));
  }, [symbol, currentPosition, stats, tradeLog]);

  // Save log to file function (only called when stopping auto trader)
  const saveLogToFile = useCallback(() => {
    if (tradeLog.length === 0) return;

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const logContent = tradeLog.join('\n') + '\n';
      const filename = `auto_trade_log_${symbol}_${timestamp}.txt`;
      
      const blob = new Blob([logContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`Auto trading log saved to: ${filename}`);
    } catch (error) {
      console.error('Failed to save log to file:', error);
    }
  }, [symbol, tradeLog]);

  // Simple log function that only adds to memory
  const addToLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleString();
    const logEntry = `[${timestamp}] ${message}`;
    
    // Add to in-memory log only
    setTradeLog(prev => [...prev.slice(-99), logEntry]); // Keep last 100 entries
    
    // Console log for debugging
    console.log('AutoTrader:', logEntry);
  }, []);

  // Check if we should buy based on ML prediction
  const shouldBuy = useCallback((pred: ModelPrediction | null): boolean => {
    if (!pred || !settings.enabled || currentPosition) return false;
    
    // Only buy on BUY recommendation with sufficient confidence
    if (pred.recommendation !== 'BUY') return false;
    
    // Check confidence level
    if (settings.minConfidence === 'high' && pred.confidence !== 'high') return false;
    if (settings.minConfidence === 'medium' && pred.confidence === 'low') return false;
    
    // Check if we have enough cash
    const holding = getHolding(symbol);
    const maxAmount = settings.maxTradeAmount / currentPrice;
    const availableCash = portfolio.cash * 0.95; // Use 95% of available cash as safety margin
    
    return availableCash >= settings.maxTradeAmount;
  }, [settings, currentPosition, portfolio.cash, symbol, currentPrice, getHolding]);

  // Check if we should sell based on price movement
  const shouldSell = useCallback((position: AutoTradePosition | null, price: number): { shouldSell: boolean; reason: string } => {
    if (!position || !settings.enabled) return { shouldSell: false, reason: '' };
    
    // Check profit target (1.2% gain)
    if (price >= position.targetSellPrice) {
      return { shouldSell: true, reason: `Profit target reached: ${((price - position.buyPrice) / position.buyPrice * 100).toFixed(2)}%` };
    }
    
    // Check stop loss (0.5% loss)
    if (price <= position.stopLossPrice) {
      return { shouldSell: true, reason: `Stop loss triggered: ${((price - position.buyPrice) / position.buyPrice * 100).toFixed(2)}%` };
    }
    
    return { shouldSell: false, reason: '' };
  }, [settings]);

  // Execute buy order
  const executeBuy = useCallback(async (pred: ModelPrediction) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const maxAmount = settings.maxTradeAmount / currentPrice;
      const success = buyAsset(symbol, maxAmount, currentPrice);
      
      if (success) {
        const targetSellPrice = currentPrice * (1 + settings.profitTarget);
        const stopLossPrice = currentPrice * (1 - settings.stopLoss);
        
        const position: AutoTradePosition = {
          symbol,
          buyPrice: currentPrice,
          amount: maxAmount,
          timestamp: Date.now(),
          targetSellPrice,
          stopLossPrice
        };
        
        setCurrentPosition(position);
        
        // Log to memory only
        addToLog(`BUY EXECUTED: ${maxAmount.toFixed(6)} ${symbol.toUpperCase()} @ $${currentPrice.toFixed(4)} (Confidence: ${pred.confidence}, Probability: ${(pred.probability * 100).toFixed(1)}%)`);
        addToLog(`Targets Set - Profit: $${targetSellPrice.toFixed(4)} (+1.2%) | Stop Loss: $${stopLossPrice.toFixed(4)} (-0.5%)`);
        
        setLastAction(`Bought ${maxAmount.toFixed(6)} ${symbol.toUpperCase()}`);
      } else {
        addToLog(`BUY FAILED: Insufficient funds for ${symbol.toUpperCase()}`);
        setLastAction('Buy failed - insufficient funds');
      }
    } catch (error) {
      addToLog(`BUY ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLastAction('Buy failed - error occurred');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, settings, currentPrice, buyAsset, symbol, addToLog]);

  // Execute sell order
  const executeSell = useCallback(async (position: AutoTradePosition, reason: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const success = sellAsset(symbol, position.amount, currentPrice);
      
      if (success) {
        const profit = (currentPrice - position.buyPrice) * position.amount;
        const profitPercentage = ((currentPrice - position.buyPrice) / position.buyPrice) * 100;
        const isWin = profit > 0;
        const holdTime = Date.now() - position.timestamp;
        const holdTimeStr = `${Math.floor(holdTime / 60000)}m ${Math.floor((holdTime % 60000) / 1000)}s`;
        
        // Update stats
        setStats(prev => {
          const newStats = {
            totalTrades: prev.totalTrades + 1,
            winningTrades: prev.winningTrades + (isWin ? 1 : 0),
            losingTrades: prev.losingTrades + (isWin ? 0 : 1),
            totalProfit: prev.totalProfit + profit,
            winRate: 0
          };
          newStats.winRate = newStats.totalTrades > 0 ? (newStats.winningTrades / newStats.totalTrades) * 100 : 0;
          return newStats;
        });
        
        // Log to memory only
        addToLog(`SELL EXECUTED: ${position.amount.toFixed(6)} ${symbol.toUpperCase()} @ $${currentPrice.toFixed(4)} | Reason: ${reason}`);
        addToLog(`Trade Result: ${profit >= 0 ? 'PROFIT' : 'LOSS'} $${profit.toFixed(2)} (${profitPercentage >= 0 ? '+' : ''}${profitPercentage.toFixed(2)}%) | Hold Time: ${holdTimeStr}`);
        addToLog(`Running Total P&L: $${(stats.totalProfit + profit).toFixed(2)} | Win Rate: ${((stats.winningTrades + (isWin ? 1 : 0)) / (stats.totalTrades + 1) * 100).toFixed(1)}%`);
        addToLog(`---`); // Separator for readability
        
        setCurrentPosition(null);
        setLastAction(`Sold ${position.amount.toFixed(6)} ${symbol.toUpperCase()} - ${profit >= 0 ? 'Profit' : 'Loss'}: $${Math.abs(profit).toFixed(2)}`);
      } else {
        addToLog(`SELL FAILED: Insufficient holdings for ${symbol.toUpperCase()}`);
        setLastAction('Sell failed - insufficient holdings');
      }
    } catch (error) {
      addToLog(`SELL ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLastAction('Sell failed - error occurred');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, sellAsset, symbol, currentPrice, addToLog, stats]);

  // Save strategies to localStorage
  useEffect(() => {
    localStorage.setItem('auto-trade-strategies', JSON.stringify(strategies));
  }, [strategies]);

  // Add a function to add or update a strategy
  const saveStrategy = useCallback((strategy: AutoTradeStrategy) => {
    setStrategies(prev => {
      const idx = prev.findIndex(s => s.id === strategy.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = strategy;
        return updated;
      }
      return [...prev, strategy];
    });
  }, []);

  // Helper function to check if a candle is green (close > open)
  const isCandleGreen = useCallback((candle: BinanceKlineRaw): boolean => {
    return parseFloat(candle[4]) > parseFloat(candle[1]); // close > open
  }, []);

  // Helper function to check if a candle is red (close < open)
  const isCandleRed = useCallback((candle: BinanceKlineRaw): boolean => {
    return parseFloat(candle[4]) < parseFloat(candle[1]); // close < open
  }, []);

  // Strategy evaluation logic - bb_lower_red_two_green strategy
  const evaluateCustomStrategy = useCallback((strategy: AutoTradeStrategy): boolean => {
    if (strategy.logic === 'bb_lower_red_two_green') {
      // Use binanceCandles data and extract Bollinger Bands from indicators
      if (!binanceCandles || binanceCandles.length < 3 || !indicators?.bb || indicators.bb.length < 1) {
        return false;
      }

      // Get the last 3 candles (most recent first)
      const lastCandles = binanceCandles.slice(-3);
      const [thirdLast, secondLast, latest] = lastCandles;
      
      // Get the latest Bollinger Band values from indicators
      const latestBB = indicators.bb[indicators.bb.length - 1];
      
      if (!latestBB) return false;

      // Check if we already have a position for this strategy
      if (currentPosition) return false;

      // Strategy conditions:
      // 1. Price hit lower Bollinger Band (check if any recent candle touched lower band)
      const priceHitLowerBand = lastCandles.some(candle => {
        const low = parseFloat(candle[3]);
        return low <= latestBB.lower * 1.001; // Allow 0.1% tolerance
      });

      // 2. Red candle closed (third to last candle should be red)
      const hasRedCandle = isCandleRed(thirdLast);

      // 3. Two consecutive green candles after the red one
      const hasTwoGreenCandles = isCandleGreen(secondLast) && isCandleGreen(latest);

      // 4. Make sure we have enough cash
      const availableCash = portfolio.cash * 0.95;
      const hasEnoughCash = availableCash >= settings.maxTradeAmount;

      const conditionsMet = priceHitLowerBand && hasRedCandle && hasTwoGreenCandles && hasEnoughCash;

      if (conditionsMet) {
        addToLog(`BB Strategy Signal: Lower Band Hit=${priceHitLowerBand}, Red Candle=${hasRedCandle}, Two Green=${hasTwoGreenCandles}`);
        addToLog(`Lower Band: $${latestBB.lower.toFixed(4)}, Current Price: $${currentPrice.toFixed(4)}`);
      }

      return conditionsMet;
    }
    
    return false;
  }, [binanceCandles, indicators, currentPosition, portfolio.cash, settings.maxTradeAmount, currentPrice, addToLog]);

  // Execute buy order specifically for custom strategies
  const executeCustomStrategyBuy = useCallback(async (strategy: AutoTradeStrategy) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const maxAmount = settings.maxTradeAmount / currentPrice;
      const success = buyAsset(symbol, maxAmount, currentPrice);
      
      if (success) {
        // For bb_lower_red_two_green strategy, use 1% profit target instead of default 1.2%
        const profitTarget = strategy.logic === 'bb_lower_red_two_green' ? 0.01 : settings.profitTarget;
        const targetSellPrice = currentPrice * (1 + profitTarget);
        const stopLossPrice = currentPrice * (1 - settings.stopLoss);
        
        const position: AutoTradePosition = {
          symbol,
          buyPrice: currentPrice,
          amount: maxAmount,
          timestamp: Date.now(),
          targetSellPrice,
          stopLossPrice,
          strategy: strategy.logic
        };
        
        setCurrentPosition(position);
        
        // Log to memory only
        addToLog(`STRATEGY BUY EXECUTED: ${strategy.name} - ${maxAmount.toFixed(6)} ${symbol.toUpperCase()} @ $${currentPrice.toFixed(4)}`);
        addToLog(`Targets Set - Profit: $${targetSellPrice.toFixed(4)} (+${(profitTarget * 100).toFixed(1)}%) | Stop Loss: $${stopLossPrice.toFixed(4)} (-0.5%)`);
        
        setLastAction(`Strategy Buy: ${maxAmount.toFixed(6)} ${symbol.toUpperCase()}`);
      } else {
        addToLog(`STRATEGY BUY FAILED: Insufficient funds for ${symbol.toUpperCase()}`);
        setLastAction('Strategy buy failed - insufficient funds');
      }
    } catch (error) {
      addToLog(`STRATEGY BUY ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLastAction('Strategy buy failed - error occurred');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, settings, currentPrice, buyAsset, symbol, addToLog]);

  // Monitor auto trading state changes and save log when stopped
  useEffect(() => {
    // Check if auto trading was just disabled
    if (wasEnabledRef.current && !settings.enabled) {
      addToLog(`AUTO TRADING DEACTIVATED`);
      // Save log to file when stopping
      setTimeout(() => saveLogToFile(), 100); // Small delay to ensure log entry is added
    } else if (!wasEnabledRef.current && settings.enabled) {
      addToLog(`AUTO TRADING ACTIVATED - Max Trade: $${settings.maxTradeAmount}, Profit Target: ${(settings.profitTarget * 100).toFixed(1)}%, Stop Loss: ${(settings.stopLoss * 100).toFixed(1)}%, Min Confidence: ${settings.minConfidence}`);
    }
    
    wasEnabledRef.current = settings.enabled;
  }, [settings.enabled, addToLog, saveLogToFile, settings.maxTradeAmount, settings.profitTarget, settings.stopLoss, settings.minConfidence]);

  // Main trading logic - runs when price or prediction changes
  useEffect(() => {
    if (!settings.enabled || isProcessing) return;
    
    const priceChanged = Math.abs(currentPrice - lastPriceRef.current) > 0.0001;
    const predictionChanged = prediction?.timestamp !== lastPredictionRef.current?.timestamp;
    
    if (!priceChanged && !predictionChanged) return;
    
    // Update refs
    lastPriceRef.current = currentPrice;
    lastPredictionRef.current = prediction;
    
    // Check for sell conditions first (if we have a position)
    if (currentPosition) {
      const { shouldSell: sell, reason } = shouldSell(currentPosition, currentPrice);
      if (sell) {
        executeSell(currentPosition, reason);
        return;
      }
    }
    
    // Check for buy conditions (if we don't have a position)
    if (!currentPosition && prediction) {
      if (shouldBuy(prediction)) {
        executeBuy(prediction);
      }
    }

    // If settings.strategyMode === 'custom', use the selected strategy
    if (settings.strategyMode === 'custom' && settings.selectedStrategyId) {
      const strat = strategies.find(s => s.id === settings.selectedStrategyId && s.enabled);
      if (strat && evaluateCustomStrategy(strat)) {
        // Execute buy logic for custom strategy
        executeCustomStrategyBuy(strat);
      }
    }
    
    saveState();
  }, [currentPrice, prediction, settings.enabled, isProcessing, currentPosition, shouldSell, executeSell, shouldBuy, executeBuy, saveState, strategies, evaluateCustomStrategy, executeCustomStrategyBuy]);

  // Save state whenever it changes
  useEffect(() => {
    saveState();
  }, [saveState]);

  return {
    currentPosition,
    stats,
    isProcessing,
    lastAction,
    tradeLog,
    strategies,
    saveStrategy
  };
}