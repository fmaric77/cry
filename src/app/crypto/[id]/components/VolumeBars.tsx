import React from 'react';
import { VolumeBarProps } from '../types';

/**
 * Volume bars component
 */
export function VolumeBars({ 
  candles, 
  dimensions, 
  vmin, 
  vmax, 
  vrange,
  opacity = 0.7 
}: VolumeBarProps) {
  const { containerHeight, effectivePadding } = dimensions;

  return (
    <g className="volume-bars" fill="#007bff" opacity={opacity}>
      {candles.map((candle, i) => {
        const x = candle.x;
        const closeY = containerHeight - effectivePadding - ((candle.close - vmin) / vrange) * (containerHeight - 2 * effectivePadding);
        const volumeValue = parseFloat(candle.volume);
        const y = containerHeight - effectivePadding - ((volumeValue - vmin) / vrange) * (containerHeight - 2 * effectivePadding);
        
        return (
          <rect
            key={`volume-${i}`}
            x={x - 5}
            y={Math.min(y, closeY)}
            width={10}
            height={Math.abs(y - closeY)}
            fill="#007bff"
            opacity={opacity}
          />
        );
      })}
    </g>
  );
}
