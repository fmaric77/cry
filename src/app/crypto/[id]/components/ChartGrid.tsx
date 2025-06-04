import React from 'react';
import { ChartGridProps } from '../types';

/**
 * Chart grid background component
 */
export function ChartGrid({ 
  dimensions, 
  strokeColor = "#ddd", 
  strokeWidth = 0.5 
}: ChartGridProps) {
  const { containerWidth, containerHeight, effectivePadding } = dimensions;

  return (
    <g className="grid" stroke={strokeColor} strokeWidth={strokeWidth}>
      {/* Vertical grid lines */}
      {Array.from({ length: 11 }).map((_, i) => {
        const x = effectivePadding + (i / 10) * (containerWidth - 2 * effectivePadding);
        return (
          <line 
            key={`vline-${i}`} 
            x1={x} 
            y1={effectivePadding} 
            x2={x} 
            y2={containerHeight - effectivePadding} 
          />
        );
      })}
      
      {/* Horizontal grid lines */}
      {Array.from({ length: 11 }).map((_, i) => {
        const y = containerHeight - effectivePadding - (i / 10) * (containerHeight - 2 * effectivePadding);
        return (
          <line 
            key={`hline-${i}`} 
            x1={effectivePadding} 
            y1={y} 
            x2={containerWidth - effectivePadding} 
            y2={y} 
          />
        );
      })}
    </g>
  );
}
