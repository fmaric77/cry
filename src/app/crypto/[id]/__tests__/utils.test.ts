import {
  getBinanceSymbol,
  getDateFormat,
  getApiLimit,
  convertToLinePrices,
  calculateVisibleRange,
  calculatePriceRange,
  createSmoothPath,
  clamp
} from '../utils';
import { BinanceKlineRaw, TimePeriod } from '../types';

describe('Symbol Mapping Utils', () => {
  describe('getBinanceSymbol', () => {
    test('should return correct Binance symbol for known coins', () => {
      expect(getBinanceSymbol('bitcoin')).toBe('BTCUSDT');
      expect(getBinanceSymbol('ethereum')).toBe('ETHUSDT');
      expect(getBinanceSymbol('solana')).toBe('SOLUSDT');
    });

    test('should return null for unknown coins', () => {
      expect(getBinanceSymbol('unknown-coin')).toBeNull();
    });

    test('should return fallback symbol when provided', () => {
      expect(getBinanceSymbol('unknown-coin', 'FALLBACKUSDT')).toBe('FALLBACKUSDT');
    });
  });
});

describe('Date Format Utils', () => {
  describe('getDateFormat', () => {
    test('should return correct format for minute periods', () => {
      expect(getDateFormat('1m')).toBe('MMM d, HH:mm');
      expect(getDateFormat('5m')).toBe('MMM d, HH:mm');
      expect(getDateFormat('15m')).toBe('MMM d, HH:mm');
    });

    test('should return correct format for day period', () => {
      expect(getDateFormat('1D')).toBe('MMM d, HH:mm');
    });

    test('should return correct format for longer periods', () => {
      expect(getDateFormat('7D')).toBe('MMM yyyy');
      expect(getDateFormat('1M')).toBe('MMM yyyy');
      expect(getDateFormat('3M')).toBe('MMM yyyy');
    });

    test('should return correct format for year period', () => {
      expect(getDateFormat('1Y')).toBe('yyyy');
    });
  });
});

describe('API Utils', () => {
  describe('getApiLimit', () => {
    test('should return special limits for long periods', () => {
      expect(getApiLimit('1Y')).toBe(14);
      expect(getApiLimit('3M')).toBe(6);
    });

    test('should return default limit for other periods', () => {
      expect(getApiLimit('1m')).toBe(500);
      expect(getApiLimit('5m')).toBe(500);
      expect(getApiLimit('1D')).toBe(500);
    });
  });
});

describe('Data Conversion Utils', () => {
  describe('convertToLinePrices', () => {
    test('should convert Binance kline data to price points', () => {
      const mockData: BinanceKlineRaw[] = [
        [1640995200000, '50000', '50500', '49500', '50200', '100', 1640998799999, '5020000', 150, '60', '3012000', '0'],
        [1640998800000, '50200', '50800', '49800', '50600', '120', 1641002399999, '6072000', 180, '70', '3542000', '0']
      ];

      const result = convertToLinePrices(mockData);

      expect(result).toEqual([
        [1640995200000, 50200],
        [1640998800000, 50600]
      ]);
    });

    test('should handle empty data', () => {
      const result = convertToLinePrices([]);
      expect(result).toEqual([]);
    });
  });
});

describe('Chart Calculation Utils', () => {
  describe('calculateVisibleRange', () => {
    test('should calculate correct visible range for no zoom', () => {
      const result = calculateVisibleRange(100, 1, 0);
      expect(result).toEqual({
        visibleStart: 0,
        visibleEnd: 100,
        visibleCount: 100
      });
    });

    test('should calculate correct visible range for 2x zoom', () => {
      const result = calculateVisibleRange(100, 2, 0);
      expect(result).toEqual({
        visibleStart: 0,
        visibleEnd: 50,
        visibleCount: 50
      });
    });

    test('should calculate correct visible range with pan', () => {
      const result = calculateVisibleRange(100, 2, 0.5);
      expect(result).toEqual({
        visibleStart: 25,
        visibleEnd: 75,
        visibleCount: 50
      });
    });

    test('should handle edge cases', () => {
      // Empty data
      const emptyResult = calculateVisibleRange(0, 1, 0);
      expect(emptyResult.visibleCount).toBe(1);

      // Very high zoom
      const highZoomResult = calculateVisibleRange(100, 100, 0);
      expect(highZoomResult.visibleCount).toBe(1);
    });
  });

  describe('calculatePriceRange', () => {
    test('should calculate correct price range', () => {
      const prices = [100, 150, 80, 200, 120];
      const result = calculatePriceRange(prices);
      
      expect(result).toEqual({
        vmin: 80,
        vmax: 200,
        vrange: 120
      });
    });

    test('should handle single price', () => {
      const prices = [100];
      const result = calculatePriceRange(prices);
      
      expect(result).toEqual({
        vmin: 100,
        vmax: 100,
        vrange: 1 // Fallback to prevent division by zero
      });
    });

    test('should handle empty array', () => {
      const prices: number[] = [];
      const result = calculatePriceRange(prices);
      
      expect(result).toEqual({
        vmin: 0,
        vmax: 1,
        vrange: 1
      });
    });
  });

  describe('createSmoothPath', () => {
    test('should create SVG path from points', () => {
      const points = [
        { x: 10, y: 20, price: 100, timestamp: 1640995200000 },
        { x: 30, y: 40, price: 150, timestamp: 1640998800000 },
        { x: 50, y: 30, price: 125, timestamp: 1641002400000 }
      ];

      const result = createSmoothPath(points);
      expect(result).toBe('M 10 20 L 30 40 L 50 30');
    });

    test('should return empty string for insufficient points', () => {
      expect(createSmoothPath([])).toBe('');
      expect(createSmoothPath([{ x: 10, y: 20, price: 100, timestamp: 1640995200000 }])).toBe('');
    });
  });

  describe('clamp', () => {
    test('should clamp values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    test('should handle edge values', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });
});
