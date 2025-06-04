import { 
  BinanceKlineRaw, 
  PricePoint, 
  SMAValue, 
  EMAValue, 
  RSIValue, 
  MACDValue, 
  BollingerBandsValue, 
  StochasticValue,
  IndicatorData,
  IndicatorSettings
} from './types';

/**
 * Calculate Simple Moving Average
 */
export function calculateSMA(prices: PricePoint[], period: number): SMAValue[] {
  if (prices.length < period) return [];
  
  const result: SMAValue[] = [];
  
  for (let i = period - 1; i < prices.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += prices[j][1];
    }
    result.push({
      timestamp: prices[i][0],
      value: sum / period
    });
  }
  
  return result;
}

/**
 * Calculate Exponential Moving Average
 */
export function calculateEMA(prices: PricePoint[], period: number): EMAValue[] {
  if (prices.length < period) return [];
  
  const result: EMAValue[] = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA value is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i][1];
  }
  let ema = sum / period;
  result.push({
    timestamp: prices[period - 1][0],
    value: ema
  });
  
  // Calculate subsequent EMA values
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i][1] * multiplier) + (ema * (1 - multiplier));
    result.push({
      timestamp: prices[i][0],
      value: ema
    });
  }
  
  return result;
}

/**
 * Calculate Relative Strength Index
 */
export function calculateRSI(prices: PricePoint[], period: number = 14): RSIValue[] {
  if (prices.length < period + 1) return [];
  
  const result: RSIValue[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i][1] - prices[i - 1][1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // Calculate initial average gain and loss
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;
  
  // Calculate first RSI
  let rs = avgGain / avgLoss;
  let rsi = 100 - (100 / (1 + rs));
  result.push({
    timestamp: prices[period][0],
    value: rsi
  });
  
  // Calculate subsequent RSI values using smoothed averages
  for (let i = period; i < gains.length; i++) {
    avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
    rs = avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));
    result.push({
      timestamp: prices[i + 1][0],
      value: rsi
    });
  }
  
  return result;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  prices: PricePoint[], 
  fastPeriod: number = 12, 
  slowPeriod: number = 26, 
  signalPeriod: number = 9
): MACDValue[] {
  if (prices.length < slowPeriod) return [];
  
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  if (fastEMA.length === 0 || slowEMA.length === 0) return [];
  
  // Calculate MACD line
  const macdLine: PricePoint[] = [];
  const minLength = Math.min(fastEMA.length, slowEMA.length);
  
  for (let i = 0; i < minLength; i++) {
    const fastIndex = fastEMA.length - minLength + i;
    const slowIndex = slowEMA.length - minLength + i;
    
    if (fastEMA[fastIndex] && slowEMA[slowIndex]) {
      macdLine.push([
        slowEMA[slowIndex].timestamp,
        fastEMA[fastIndex].value - slowEMA[slowIndex].value
      ]);
    }
  }
  
  // Calculate signal line (EMA of MACD)
  const signalLine = calculateEMA(macdLine, signalPeriod);
  
  // Combine MACD and signal
  const result: MACDValue[] = [];
  const resultLength = Math.min(macdLine.length, signalLine.length);
  
  for (let i = 0; i < resultLength; i++) {
    const macdIndex = macdLine.length - resultLength + i;
    const signalIndex = signalLine.length - resultLength + i;
    
    if (macdLine[macdIndex] && signalLine[signalIndex]) {
      const macdValue = macdLine[macdIndex][1];
      const signalValue = signalLine[signalIndex].value;
      
      result.push({
        timestamp: macdLine[macdIndex][0],
        macd: macdValue,
        signal: signalValue,
        histogram: macdValue - signalValue
      });
    }
  }
  
  return result;
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(
  prices: PricePoint[], 
  period: number = 20, 
  stdDev: number = 2
): BollingerBandsValue[] {
  if (prices.length < period) return [];
  
  const result: BollingerBandsValue[] = [];
  
  for (let i = period - 1; i < prices.length; i++) {
    // Calculate SMA (middle band)
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += prices[j][1];
    }
    const sma = sum / period;
    
    // Calculate standard deviation
    let squaredDifferences = 0;
    for (let j = i - period + 1; j <= i; j++) {
      squaredDifferences += Math.pow(prices[j][1] - sma, 2);
    }
    const standardDeviation = Math.sqrt(squaredDifferences / period);
    
    result.push({
      timestamp: prices[i][0],
      upper: sma + (stdDev * standardDeviation),
      middle: sma,
      lower: sma - (stdDev * standardDeviation)
    });
  }
  
  return result;
}

/**
 * Calculate Stochastic Oscillator
 */
export function calculateStochastic(
  candles: BinanceKlineRaw[], 
  kPeriod: number = 14, 
  dPeriod: number = 3
): StochasticValue[] {
  if (candles.length < kPeriod) return [];
  
  const result: StochasticValue[] = [];
  const kValues: number[] = [];
  
  // Calculate %K values
  for (let i = kPeriod - 1; i < candles.length; i++) {
    const periodCandles = candles.slice(i - kPeriod + 1, i + 1);
    const highs = periodCandles.map(c => parseFloat(c[2]));
    const lows = periodCandles.map(c => parseFloat(c[3]));
    const close = parseFloat(candles[i][4]);
    
    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);
    
    const k = ((close - lowestLow) / (highestHigh - lowestLow)) * 100;
    kValues.push(k);
  }
  
  // Calculate %D values (SMA of %K)
  for (let i = dPeriod - 1; i < kValues.length; i++) {
    const dSum = kValues.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b);
    const d = dSum / dPeriod;
    
    result.push({
      timestamp: candles[kPeriod - 1 + i][0],
      k: kValues[i],
      d: d
    });
  }
  
  return result;
}

/**
 * Calculate all indicators based on settings
 */
export function calculateAllIndicators(
  prices: PricePoint[],
  candles: BinanceKlineRaw[],
  settings: IndicatorSettings
): IndicatorData {
  const indicators: IndicatorData = {};
  
  if (settings.sma.enabled) {
    indicators.sma = calculateSMA(prices, settings.sma.period);
  }
  
  if (settings.ema.enabled) {
    indicators.ema = calculateEMA(prices, settings.ema.period);
  }
  
  if (settings.rsi.enabled) {
    indicators.rsi = calculateRSI(prices, settings.rsi.period);
  }
  
  if (settings.macd.enabled) {
    indicators.macd = calculateMACD(
      prices, 
      settings.macd.fastPeriod, 
      settings.macd.slowPeriod, 
      settings.macd.signalPeriod
    );
  }
  
  if (settings.bb.enabled) {
    indicators.bb = calculateBollingerBands(
      prices, 
      settings.bb.period, 
      settings.bb.stdDev
    );
  }
  
  if (settings.stoch.enabled && candles.length > 0) {
    indicators.stoch = calculateStochastic(
      candles, 
      settings.stoch.kPeriod, 
      settings.stoch.dPeriod
    );
  }
  
  return indicators;
}

/**
 * Default indicator settings
 */
export const defaultIndicatorSettings: IndicatorSettings = {
  sma: {
    enabled: false,
    period: 20,
    color: '#ff6b6b'
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
};
