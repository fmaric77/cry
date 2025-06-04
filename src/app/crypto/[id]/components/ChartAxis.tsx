import React from 'react';
import { ChartAxisProps } from '../types';

/**
 * Chart axis component
 */
export function ChartAxis({ 
  dimensions, 
  strokeColor = "#333", 
  strokeWidth = 1 
}: ChartAxisProps) {
  const { containerWidth, containerHeight, effectivePadding } = dimensions;

  return (
    <g className="axis" stroke={strokeColor} strokeWidth={strokeWidth}>
      {/* X axis */}
      <line 
        x1={effectivePadding} 
        y1={containerHeight - effectivePadding} 
        x2={containerWidth - effectivePadding} 
        y2={containerHeight - effectivePadding} 
      />
      
      {/* Y axis */}
      <line 
        x1={effectivePadding} 
        y1={effectivePadding} 
        x2={effectivePadding} 
        y2={containerHeight - effectivePadding} 
      />
    </g>
  );
}
