import { useMemo } from 'react';
import { ChartCalculations, PricePoint, BinanceKlineRaw, ChartDimensions } from '../types';
import {
  calculateVisibleRange,
  calculatePriceRange,
  calculateChartPoints,
  transformBinanceCandles,
  createPseudoCandles
} from '../utils';

interface UseChartCalculationsOptions {
  prices: PricePoint[];
  binanceCandles: BinanceKlineRaw[];
  zoom: number;
  pan: number;
  dimensions: ChartDimensions;
}

/**
 * Custom hook for calculating chart data and coordinates
 */
export function useChartCalculations({
  prices,
  binanceCandles,
  zoom,
  pan,
  dimensions
}: UseChartCalculationsOptions): ChartCalculations {
  return useMemo(() => {
    const { containerWidth, containerHeight, effectivePadding } = dimensions;
    
    // Use binanceCandles for zoom/pan calculations if available, else prices
    const zoomSource = binanceCandles.length > 0 ? binanceCandles : prices;
    const pointsLength = zoomSource.length;
    
    // Calculate visible range
    const { visibleStart, visibleEnd } = calculateVisibleRange(pointsLength, zoom, pan);
    
    // Get visible data slices
    const visiblePrices = prices.slice(visibleStart, visibleEnd);
    const visiblePoints = visiblePrices.map(p => p[1]);
    
    // Calculate price range and scaling
    const { vmin, vmax, vrange } = calculatePriceRange(visiblePoints);
    
    // Calculate chart step size
    const vstep = (containerWidth - 2 * effectivePadding) / Math.max(1, visiblePoints.length - 1);
    
    // Calculate chart points with screen coordinates
    const vpathData = calculateChartPoints(
      visiblePrices,
      vmin,
      vmax,
      vrange,
      containerWidth,
      containerHeight,
      effectivePadding
    );
    
    // Calculate OHLC candles
    let ohlcCandles;
    if (binanceCandles.length > 0) {
      // Use real Binance candles
      const visibleBinanceCandles = binanceCandles.slice(visibleStart, visibleEnd);
      ohlcCandles = transformBinanceCandles(
        visibleBinanceCandles,
        containerWidth,
        effectivePadding
      );
    } else {
      // Fallback to pseudo-candles
      ohlcCandles = createPseudoCandles(
        visiblePrices,
        containerWidth,
        effectivePadding
      );
    }
    
    return {
      visibleStart,
      visibleEnd,
      visiblePrices,
      visiblePoints,
      vmin,
      vmax,
      vrange,
      vstep,
      vpathData,
      ohlcCandles
    };
  }, [prices, binanceCandles, zoom, pan, dimensions]);
}
