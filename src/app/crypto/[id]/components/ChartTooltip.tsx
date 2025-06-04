import React from 'react';
import { format } from 'date-fns';
import { ChartTooltipProps } from '../types';

/**
 * Chart hover tooltip component
 */
export function ChartTooltip({ 
  point, 
  dimensions, 
  dateFormat 
}: ChartTooltipProps) {
  const { containerWidth, containerHeight, effectivePadding } = dimensions;

  if (!point) return null;

  return (
    <>
      {/* Vertical crosshair */}
      <line
        x1={point.x}
        y1={effectivePadding}
        x2={point.x}
        y2={containerHeight - effectivePadding}
        stroke="#ff9800"
        strokeWidth={2}
        strokeDasharray="4"
      />
      
      {/* Horizontal crosshair */}
      <line
        x1={effectivePadding}
        y1={point.y}
        x2={containerWidth - effectivePadding}
        y2={point.y}
        stroke="#ff9800"
        strokeWidth={2}
        strokeDasharray="4"
      />
      
      {/* Timestamp label */}
      <text
        x={point.x}
        y={point.y - 10}
        textAnchor="middle"
        fill="#333"
        fontSize={12}
      >
        {format(new Date(point.timestamp), dateFormat)}
      </text>
    </>
  );
}
