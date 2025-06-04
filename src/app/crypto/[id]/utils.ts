import { TimePeriod, PeriodConfig, BinanceKlineRaw, PricePoint, ProcessedCandle, ChartPoint } from './types';

// Symbol mapping constants
export const COINGECKO_TO_BINANCE: Record<string, string> = {
  bitcoin: 'BTCUSDT',
  ethereum: 'ETHUSDT',
  solana: 'SOLUSDT',
  cardano: 'ADAUSDT',
  dogecoin: 'DOGEUSDT',
  ripple: 'XRPUSDT',
  polkadot: 'DOTUSDT',
  litecoin: 'LTCUSDT',
  avalanche: 'AVAXUSDT',
  chainlink: 'LINKUSDT',
  tron: 'TRXUSDT',
  polygon: 'MATICUSDT',
  // Add more as needed
};

export const PERIOD_API_PARAMS: Record<TimePeriod, PeriodConfig> = {
  '1m': { days: 1, interval: 'minutely' },
  '5m': { days: 1, interval: 'minutely' },
  '15m': { days: 1, interval: 'minutely' },
  '1D': { days: 1 },
  '7D': { days: 7 },
  '1M': { days: 30 },
  '3M': { days: 90 },
  '1Y': { days: 365 },
};

export const PERIOD_TO_BINANCE: Record<TimePeriod, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1D': '1d',
  '7D': '1w',
  '1M': '1M',
  '3M': '1M', // Use monthly candles for 3M
  '1Y': '1M', // Use monthly candles for 1Y
};

/**
 * Get Binance symbol from CoinGecko ID
 */
export function getBinanceSymbol(coinId: string, fallbackSymbol?: string): string | null {
  return COINGECKO_TO_BINANCE[coinId] || fallbackSymbol || null;
}

/**
 * Get date format string based on time period
 */
export function getDateFormat(period: TimePeriod): string {
  switch (period) {
    case '1m':
    case '5m':
    case '15m':
      return 'MMM d, HH:mm';
    case '1D':
      return 'MMM d, HH:mm';
    case '7D':
    case '1M':
    case '3M':
      return 'MMM yyyy';
    case '1Y':
      return 'yyyy';
    default:
      return 'MMM d, yyyy';
  }
}

/**
 * Get API limit based on period for optimal candle display
 */
export function getApiLimit(period: TimePeriod): number {
  switch (period) {
    case '1Y':
      return 14;
    case '3M':
      return 6;
    default:
      return 500;
  }
}

/**
 * Convert raw Binance kline data to price points
 */
export function convertToLinePrices(data: BinanceKlineRaw[]): PricePoint[] {
  return data.map((d) => [d[0], parseFloat(d[4])]);
}

/**
 * Create SVG path string from chart points
 */
export function createSmoothPath(points: ChartPoint[]): string {
  if (points.length < 2) return '';
  
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
}

/**
 * Calculate visible range based on zoom and pan
 */
export function calculateVisibleRange(
  totalLength: number,
  zoom: number,
  pan: number
): { visibleStart: number; visibleEnd: number; visibleCount: number } {
  const visibleCount = Math.min(totalLength, Math.max(1, Math.floor(totalLength / zoom)));
  const maxPan = totalLength - visibleCount;
  const panIndex = Math.round(pan * maxPan);
  const visibleStart = Math.max(0, Math.min(totalLength - visibleCount, panIndex));
  const visibleEnd = visibleStart + visibleCount;
  
  return { visibleStart, visibleEnd, visibleCount };
}

/**
 * Transform visible Binance candles to processed candles with screen coordinates
 */
export function transformBinanceCandles(
  visibleCandles: BinanceKlineRaw[],
  containerWidth: number,
  effectivePadding: number
): ProcessedCandle[] {
  return visibleCandles.map((d, i) => {
    const open = parseFloat(d[1]);
    const high = parseFloat(d[2]);
    const low = parseFloat(d[3]);
    const close = parseFloat(d[4]);
    const volume = d[5]?.toString() ?? "0";
    const timestamp = d[0];
    const x = effectivePadding + (i / Math.max(1, visibleCandles.length - 1)) * (containerWidth - 2 * effectivePadding);
    
    return {
      open,
      close,
      high,
      low,
      x,
      timestamp,
      isPositive: close >= open,
      volume
    };
  });
}

/**
 * Create pseudo-candles from price data for fallback
 */
export function createPseudoCandles(
  visiblePrices: PricePoint[],
  containerWidth: number,
  effectivePadding: number
): ProcessedCandle[] {
  const candleGroupSize = Math.max(1, Math.floor(visiblePrices.length / 60));
  const ohlcCandles: ProcessedCandle[] = [];

  for (let i = 0; i < visiblePrices.length; i += candleGroupSize) {
    const group = visiblePrices.slice(i, i + candleGroupSize);
    if (group.length === 0) continue;

    const open = group[0][1];
    const close = group[group.length - 1][1];
    const high = Math.max(...group.map((p) => p[1]));
    const low = Math.min(...group.map((p) => p[1]));
    const timestamp = group[0][0];
    const x = effectivePadding + (i / (visiblePrices.length - 1)) * (containerWidth - 2 * effectivePadding);

    ohlcCandles.push({
      open,
      close,
      high,
      low,
      x,
      timestamp,
      isPositive: close >= open,
      volume: "0"
    });
  }

  return ohlcCandles;
}

/**
 * Calculate chart points with screen coordinates
 */
export function calculateChartPoints(
  visiblePrices: PricePoint[],
  vmin: number,
  vmax: number,
  vrange: number,
  containerWidth: number,
  containerHeight: number,
  effectivePadding: number
): ChartPoint[] {
  const vstep = (containerWidth - 2 * effectivePadding) / Math.max(1, visiblePrices.length - 1);

  return visiblePrices.map((pricePoint, i) => {
    const price = pricePoint[1];
    const x = effectivePadding + i * vstep;
    const y = containerHeight - effectivePadding - ((price - vmin) / vrange) * (containerHeight - 2 * effectivePadding);
    
    return {
      x,
      y,
      price,
      timestamp: pricePoint[0]
    };
  });
}

/**
 * Calculate min, max, and range from visible prices
 */
export function calculatePriceRange(visiblePoints: number[]): { vmin: number; vmax: number; vrange: number } {
  if (visiblePoints.length === 0) {
    return { vmin: 0, vmax: 1, vrange: 1 };
  }

  const vmin = Math.min(...visiblePoints);
  const vmax = Math.max(...visiblePoints);
  const vrange = vmax - vmin || 1; // Prevent division by zero

  return { vmin, vmax, vrange };
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
