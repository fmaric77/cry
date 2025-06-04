import React from 'react';
import { LineChartProps } from '../types';
import { createSmoothPath } from '../utils';

/**
 * Line chart component
 */
export function LineChart({ 
  pathData, 
  stroke = "#007bff", 
  strokeWidth = 2 
}: LineChartProps) {
  return (
    <path
      d={createSmoothPath(pathData)}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}
