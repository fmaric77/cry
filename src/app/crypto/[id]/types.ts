// Chart-related TypeScript types

export type ChartMode = 'line' | 'candle';
export type TimePeriod = '1m' | '5m' | '15m' | '1D' | '7D' | '1M' | '3M' | '1Y';

// Binance API types
export interface BinanceKlineData {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
  ignore: string;
}

// Raw Binance kline response (array format)
export type BinanceKlineRaw = [
  number, // Open time
  string, // Open
  string, // High
  string, // Low
  string, // Close
  string, // Volume
  number, // Close time
  string, // Quote asset volume
  number, // Number of trades
  string, // Taker buy base asset volume
  string, // Taker buy quote asset volume
  string  // Ignore
];

// WebSocket kline data
export interface BinanceWebSocketKline {
  t: number; // Kline start time
  T: number; // Kline close time
  s: string; // Symbol
  i: string; // Interval
  f: number; // First trade ID
  L: number; // Last trade ID
  o: string; // Open price
  c: string; // Close price
  h: string; // High price
  l: string; // Low price
  v: string; // Base asset volume
  n: number; // Number of trades
  x: boolean; // Is this kline closed?
  q: string; // Quote asset volume
  V: string; // Taker buy base asset volume
  Q: string; // Taker buy quote asset volume
  B: string; // Ignore
}

export interface BinanceWebSocketMessage {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  k: BinanceWebSocketKline;
}

// Chart data types
export type PricePoint = [number, number]; // [timestamp, price]

export interface ChartPoint {
  x: number;
  y: number;
  price: number;
  timestamp: number;
}

export interface ProcessedCandle {
  open: number;
  close: number;
  high: number;
  low: number;
  x: number;
  timestamp: number;
  isPositive: boolean;
  volume: string;
}

// Chart configuration
export interface ChartConfig {
  width: number;
  height: number;
  padding: number;
  effectivePadding: number;
  minZoom: number;
  maxZoom: number;
}

export interface ChartDimensions {
  containerWidth: number;
  containerHeight: number;
  effectivePadding: number;
}

// User preferences
export interface UserPreferences {
  selectedPeriod: TimePeriod;
  chartMode: ChartMode;
  zoom: number;
  pan: number;
  refreshRate: number;
  showVolume?: boolean;
  indicators?: IndicatorSettings;
}

// API configuration
export interface PeriodConfig {
  days: number;
  interval?: string;
}

// Chart state
export interface ChartState {
  hoverIndex: number | null;
  chartMode: ChartMode;
  selectedPeriod: TimePeriod;
  prices: PricePoint[];
  loading: boolean;
  noDataPeriods: Set<TimePeriod>;
  noData: boolean;
  binanceCandles: BinanceKlineRaw[];
  showVolume: boolean;
  refreshRate: number;
}

// Zoom and pan state
export interface ZoomPanState {
  zoom: number;
  pan: number;
  isPanning: boolean;
  panStartX: number | null;
}

// Chart calculations
export interface ChartCalculations {
  visibleStart: number;
  visibleEnd: number;
  visiblePrices: PricePoint[];
  visiblePoints: number[];
  vmin: number;
  vmax: number;
  vrange: number;
  vstep: number;
  vpathData: ChartPoint[];
  ohlcCandles: ProcessedCandle[];
}

// Component props
export interface ChartProps {
  id: string;
  initialPrices: PricePoint[];
  width?: number;
  height?: number;
  padding?: number;
}

export interface LineChartProps {
  pathData: ChartPoint[];
  stroke?: string;
  strokeWidth?: number;
}

export interface CandlestickChartProps {
  candles: ProcessedCandle[];
  dimensions: ChartDimensions;
  vmin: number;
  vmax: number;
  vrange: number;
}

export interface ChartGridProps {
  dimensions: ChartDimensions;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface ChartAxisProps {
  dimensions: ChartDimensions;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface ChartTooltipProps {
  point: ChartPoint | null;
  dimensions: ChartDimensions;
  dateFormat: string;
}

export interface VolumeBarProps {
  candles: ProcessedCandle[];
  dimensions: ChartDimensions;
  vmin: number;
  vmax: number;
  vrange: number;
  opacity?: number;
}

// Technical Indicators
export type IndicatorType = 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB' | 'STOCH';

export interface IndicatorConfig {
  type: IndicatorType;
  enabled: boolean;
  period?: number;
  color?: string;
  params?: Record<string, any>;
}

export interface IndicatorValue {
  timestamp: number;
  value: number | { [key: string]: number };
}

export interface SMAValue {
  timestamp: number;
  value: number;
}

export interface EMAValue {
  timestamp: number;
  value: number;
}

export interface RSIValue {
  timestamp: number;
  value: number;
}

export interface MACDValue {
  timestamp: number;
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerBandsValue {
  timestamp: number;
  upper: number;
  middle: number;
  lower: number;
}

export interface StochasticValue {
  timestamp: number;
  k: number;
  d: number;
}

export interface IndicatorData {
  sma?: SMAValue[];
  ema?: EMAValue[];
  rsi?: RSIValue[];
  macd?: MACDValue[];
  bb?: BollingerBandsValue[];
  stoch?: StochasticValue[];
}

export interface IndicatorSettings {
  sma: { enabled: boolean; period: number; color: string };
  ema: { enabled: boolean; period: number; color: string };
  rsi: { enabled: boolean; period: number; color: string };
  macd: { enabled: boolean; fastPeriod: number; slowPeriod: number; signalPeriod: number; colors: { macd: string; signal: string; histogram: string } };
  bb: { enabled: boolean; period: number; stdDev: number; colors: { upper: string; middle: string; lower: string } };
  stoch: { enabled: boolean; kPeriod: number; dPeriod: number; colors: { k: string; d: string } };
}
