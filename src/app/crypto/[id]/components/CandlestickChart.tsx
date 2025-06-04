import React from 'react';
import { CandlestickChartProps } from '../types';

/**
 * Candlestick chart component
 */
export function CandlestickChart({ 
  candles, 
  dimensions, 
  vmin, 
  vmax, 
  vrange 
}: CandlestickChartProps) {
  const { containerHeight, effectivePadding } = dimensions;

  return (
    <g className="candlesticks">
      {candles.map((candle, i) => {
        const x = candle.x;
        const openY = containerHeight - effectivePadding - ((candle.open - vmin) / vrange) * (containerHeight - 2 * effectivePadding);
        const closeY = containerHeight - effectivePadding - ((candle.close - vmin) / vrange) * (containerHeight - 2 * effectivePadding);
        const highY = containerHeight - effectivePadding - ((candle.high - vmin) / vrange) * (containerHeight - 2 * effectivePadding);
        const lowY = containerHeight - effectivePadding - ((candle.low - vmin) / vrange) * (containerHeight - 2 * effectivePadding);
        const isPositive = candle.close >= candle.open;
        
        return (
          <g key={`candle-${i}`}>
            {/* Wick */}
            <line 
              x1={x} 
              y1={highY} 
              x2={x} 
              y2={lowY} 
              stroke={isPositive ? '#4caf50' : '#f44336'} 
              strokeWidth={1} 
            />
            
            {/* Body */}
            <rect
              x={x - 5}
              y={Math.min(openY, closeY)}
              width={10}
              height={Math.abs(openY - closeY)}
              fill={isPositive ? '#4caf50' : '#f44336'}
              stroke={isPositive ? '#388e3c' : '#c62828'}
              strokeWidth={1}
            />
          </g>
        );
      })}
    </g>
  );
}
