import React, { useMemo } from 'react';
import { 
  SMAValue, 
  EMAValue, 
  BollingerBandsValue, 
  ChartDimensions,
  IndicatorSettings 
} from '../types';

interface IndicatorOverlaysProps {
  smaData?: SMAValue[];
  emaData?: EMAValue[];
  bbData?: BollingerBandsValue[];
  dimensions: ChartDimensions;
  vmin: number;
  vmax: number;
  vrange: number;
  settings: IndicatorSettings;
}

/**
 * Convert price to Y coordinate
 */
function priceToY(price: number, vmin: number, vrange: number, height: number, padding: number): number {
  return height - padding - ((price - vmin) / vrange) * (height - 2 * padding);
}

/**
 * Convert timestamp to X coordinate
 */
function timestampToX(timestamp: number, data: any[], width: number, padding: number): number {
  if (data.length === 0) return 0;
  const minTime = data[0].timestamp;
  const maxTime = data[data.length - 1].timestamp;
  const timeRange = maxTime - minTime;
  if (timeRange === 0) return padding;
  return padding + ((timestamp - minTime) / timeRange) * (width - 2 * padding);
}

export function IndicatorOverlays({
  smaData = [],
  emaData = [],
  bbData = [],
  dimensions,
  vmin,
  vmax,
  vrange,
  settings
}: IndicatorOverlaysProps) {
  const { containerWidth, containerHeight, effectivePadding } = dimensions;

  // Memoize calculations for better performance
  const memoizedPaths = useMemo(() => {
    const createPath = (data: any[], getValue: (point: any) => number) => {
      if (!data || data.length === 0) return '';
      return data.map((point, index) => {
        const x = timestampToX(point.timestamp, data, containerWidth, effectivePadding);
        const y = priceToY(getValue(point), vmin, vrange, containerHeight, effectivePadding);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
    };

    return {
      smaPath: settings.sma.enabled ? createPath(smaData, (p) => p.value) : '',
      emaPath: settings.ema.enabled ? createPath(emaData, (p) => p.value) : '',
      bbPaths: settings.bb.enabled && bbData.length > 0 ? {
        upper: createPath(bbData, (p) => p.upper),
        middle: createPath(bbData, (p) => p.middle),
        lower: createPath(bbData, (p) => p.lower),
        area: createBollingerArea(bbData)
      } : null
    };
  }, [smaData, emaData, bbData, containerWidth, containerHeight, effectivePadding, vmin, vrange, settings]);

  // Create Bollinger Bands area path
  function createBollingerArea(data: BollingerBandsValue[]) {
    if (data.length === 0) return '';
    
    const upperPath = data.map((point, index) => {
      const x = timestampToX(point.timestamp, data, containerWidth, effectivePadding);
      const y = priceToY(point.upper, vmin, vrange, containerHeight, effectivePadding);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const lowerReversed = data.slice().reverse().map(point => {
      const x = timestampToX(point.timestamp, data, containerWidth, effectivePadding);
      const y = priceToY(point.lower, vmin, vrange, containerHeight, effectivePadding);
      return `L ${x} ${y}`;
    }).join(' ');

    return upperPath + lowerReversed + ' Z';
  }

  // Render SMA line
  const renderSMA = () => {
    if (!settings.sma.enabled || !memoizedPaths.smaPath) return null;

    return (
      <g className="sma-indicator">
        <path
          d={memoizedPaths.smaPath}
          fill="none"
          stroke={settings.sma.color}
          strokeWidth="2"
          opacity="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Add glow effect */}
        <path
          d={memoizedPaths.smaPath}
          fill="none"
          stroke={settings.sma.color}
          strokeWidth="4"
          opacity="0.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  };

  // Render EMA line
  const renderEMA = () => {
    if (!settings.ema.enabled || !memoizedPaths.emaPath) return null;

    return (
      <g className="ema-indicator">
        <path
          d={memoizedPaths.emaPath}
          fill="none"
          stroke={settings.ema.color}
          strokeWidth="2"
          opacity="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Add glow effect */}
        <path
          d={memoizedPaths.emaPath}
          fill="none"
          stroke={settings.ema.color}
          strokeWidth="4"
          opacity="0.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  };

  // Render Bollinger Bands
  const renderBollingerBands = () => {
    if (!settings.bb.enabled || !memoizedPaths.bbPaths || bbData.length < 2) return null;

    return (
      <g className="bollinger-bands">
        {/* Band area with gradient */}
        <defs>
          <linearGradient id="bb-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={settings.bb.colors.upper} stopOpacity="0.1"/>
            <stop offset="50%" stopColor={settings.bb.colors.middle} stopOpacity="0.15"/>
            <stop offset="100%" stopColor={settings.bb.colors.lower} stopOpacity="0.1"/>
          </linearGradient>
        </defs>
        
        <path
          d={memoizedPaths.bbPaths.area}
          fill="url(#bb-gradient)"
        />
        
        {/* Upper band */}
        <path
          d={memoizedPaths.bbPaths.upper}
          fill="none"
          stroke={settings.bb.colors.upper}
          strokeWidth="1.5"
          strokeDasharray="4,2"
          opacity="0.8"
          strokeLinecap="round"
        />
        
        {/* Middle band (SMA) */}
        <path
          d={memoizedPaths.bbPaths.middle}
          fill="none"
          stroke={settings.bb.colors.middle}
          strokeWidth="2"
          opacity="0.9"
          strokeLinecap="round"
        />
        
        {/* Lower band */}
        <path
          d={memoizedPaths.bbPaths.lower}
          fill="none"
          stroke={settings.bb.colors.lower}
          strokeWidth="1.5"
          strokeDasharray="4,2"
          opacity="0.8"
          strokeLinecap="round"
        />
      </g>
    );
  };

  return (
    <g className="indicator-overlays">
      {renderBollingerBands()}
      {renderSMA()}
      {renderEMA()}
    </g>
  );
}
