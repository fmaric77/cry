import React, { useMemo } from 'react';
import { 
  RSIValue, 
  MACDValue, 
  StochasticValue, 
  ChartDimensions,
  IndicatorSettings 
} from '../types';

interface IndicatorPanelProps {
  rsiData?: RSIValue[];
  macdData?: MACDValue[];
  stochData?: StochasticValue[];
  dimensions: ChartDimensions;
  settings: IndicatorSettings;
  panelHeight?: number;
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

export function IndicatorPanel({
  rsiData = [],
  macdData = [],
  stochData = [],
  dimensions,
  settings,
  panelHeight = 150
}: IndicatorPanelProps) {
  const { containerWidth, effectivePadding } = dimensions;
  
  const enabledIndicators = useMemo(() => [
    settings.rsi.enabled ? 'rsi' : null,
    settings.macd.enabled ? 'macd' : null,
    settings.stoch.enabled ? 'stoch' : null
  ].filter(Boolean), [settings]);

  if (enabledIndicators.length === 0) return null;

  const indicatorHeight = panelHeight / enabledIndicators.length;
  let currentY = 0;

  // Render RSI
  const renderRSI = useMemo(() => (yOffset: number) => {
    if (!settings.rsi.enabled || rsiData.length === 0) return null;
    const pathData = rsiData.map((point, index) => {
      const x = timestampToX(point.timestamp, rsiData, containerWidth, effectivePadding);
      const y = yOffset + indicatorHeight - ((point.value / 100) * (indicatorHeight - 20)) - 10;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return (
      <g>
        {/* Background with gradient */}
        <defs>
          <linearGradient id="rsi-bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.02)"/>
            <stop offset="100%" stopColor="rgba(0,0,0,0.08)"/>
          </linearGradient>
        </defs>
        <rect
          x={effectivePadding}
          y={yOffset}
          width={containerWidth - 2 * effectivePadding}
          height={indicatorHeight}
          fill="url(#rsi-bg)"
          stroke="rgba(128,128,128,0.2)"
          rx="4"
        />
        <line
          x1={effectivePadding}
          y1={yOffset + indicatorHeight - ((70 / 100) * (indicatorHeight - 20)) - 10}
          x2={containerWidth - effectivePadding}
          y2={yOffset + indicatorHeight - ((70 / 100) * (indicatorHeight - 20)) - 10}
          stroke="rgba(255,82,82,0.4)" strokeDasharray="3,3" strokeWidth="1"
        />
        <line
          x1={effectivePadding}
          y1={yOffset + indicatorHeight - ((30 / 100) * (indicatorHeight - 20)) - 10}
          x2={containerWidth - effectivePadding}
          y2={yOffset + indicatorHeight - ((30 / 100) * (indicatorHeight - 20)) - 10}
          stroke="rgba(76,175,80,0.4)" strokeDasharray="3,3" strokeWidth="1"
        />
        <path d={pathData} fill="none" stroke={settings.rsi.color} strokeWidth="3" opacity="0.2" strokeLinecap="round" />
        <path d={pathData} fill="none" stroke={settings.rsi.color} strokeWidth="2" strokeLinecap="round" />
        <rect x={effectivePadding + 5} y={yOffset + 5} width="80" height="18" fill="rgba(0,0,0,0.7)" rx="3" />
        <text x={effectivePadding + 10} y={yOffset + 16} fontSize="11" fill="white" fontWeight="600">
          RSI ({settings.rsi.period})
        </text>
      </g>
    );
  }, [rsiData, containerWidth, effectivePadding, indicatorHeight, settings.rsi.color, settings.rsi.period]);

  // Render MACD with enhanced styling
  const renderMACD = useMemo(() => (yOffset: number) => {
    if (!settings.macd.enabled || macdData.length === 0) return null;

    // Find min/max for scaling
    const allValues = macdData.flatMap(d => [d.macd, d.signal, d.histogram]);
    let minVal = Math.min(...allValues);
    let maxVal = Math.max(...allValues);
    // Prevent flat line: add buffer if min == max
    if (minVal === maxVal) {
      minVal -= 1;
      maxVal += 1;
    }
    const range = maxVal - minVal;

    const scaleY = (value: number) => {
      if (range === 0) return yOffset + indicatorHeight / 2;
      return yOffset + indicatorHeight - 10 - ((value - minVal) / range) * (indicatorHeight - 20);
    };

    const macdPath = macdData.map((point, index) => {
      const x = timestampToX(point.timestamp, macdData, containerWidth, effectivePadding);
      const y = scaleY(point.macd);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const signalPath = macdData.map((point, index) => {
      const x = timestampToX(point.timestamp, macdData, containerWidth, effectivePadding);
      const y = scaleY(point.signal);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const zeroLine = scaleY(0);

    return (
      <g>
        {/* Background with gradient */}
        <defs>
          <linearGradient id="macd-bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.02)"/>
            <stop offset="100%" stopColor="rgba(0,0,0,0.08)"/>
          </linearGradient>
          <linearGradient id="histogram-positive" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={settings.macd.colors.histogram}/>
            <stop offset="100%" stopColor={settings.macd.colors.histogram} stopOpacity="0.3"/>
          </linearGradient>
          <linearGradient id="histogram-negative" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff4444" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#ff4444"/>
          </linearGradient>
        </defs>
        
        <rect
          x={effectivePadding}
          y={yOffset}
          width={containerWidth - 2 * effectivePadding}
          height={indicatorHeight}
          fill="url(#macd-bg)"
          stroke="rgba(128,128,128,0.2)"
          rx="4"
        />
        
        {/* Zero line with better styling */}
        <line
          x1={effectivePadding}
          y1={zeroLine}
          x2={containerWidth - effectivePadding}
          y2={zeroLine}
          stroke="rgba(128,128,128,0.6)"
          strokeDasharray="3,3"
          strokeWidth="1"
        />
        
        {/* Enhanced histogram bars */}
        {macdData.map((point, index) => {
          const x = timestampToX(point.timestamp, macdData, containerWidth, effectivePadding);
          const histogramY = scaleY(point.histogram);
          const barHeight = Math.abs(histogramY - zeroLine);
          const barY = point.histogram >= 0 ? histogramY : zeroLine;
          const isPositive = point.histogram >= 0;
          
          return (
            <rect
              key={index}
              x={x - 1.5}
              y={barY}
              width="3"
              height={barHeight}
              fill={isPositive ? "url(#histogram-positive)" : "url(#histogram-negative)"}
              opacity="0.8"
              rx="0.5"
            />
          );
        })}
        
        {/* MACD line with glow effect */}
        <path
          d={macdPath}
          fill="none"
          stroke={settings.macd.colors.macd}
          strokeWidth="3"
          opacity="0.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={macdPath}
          fill="none"
          stroke={settings.macd.colors.macd}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Signal line with glow effect */}
        <path
          d={signalPath}
          fill="none"
          stroke={settings.macd.colors.signal}
          strokeWidth="3"
          opacity="0.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={signalPath}
          fill="none"
          stroke={settings.macd.colors.signal}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Enhanced label */}
        <rect
          x={effectivePadding + 5}
          y={yOffset + 5}
          width="120"
          height="18"
          fill="rgba(0,0,0,0.7)"
          rx="3"
        />
        <text
          x={effectivePadding + 10}
          y={yOffset + 16}
          fontSize="11"
          fill="white"
          fontWeight="600"
        >
          MACD ({settings.macd.fastPeriod},{settings.macd.slowPeriod},{settings.macd.signalPeriod})
        </text>
      </g>
    );
  }, [macdData, containerWidth, effectivePadding, indicatorHeight, settings.macd]);

  // Render Stochastic with enhanced styling
  const renderStochastic = useMemo(() => (yOffset: number) => {
    if (!settings.stoch.enabled || stochData.length === 0) return null;

    // Find min/max for scaling
    const kValues = stochData.map(d => d.k);
    const dValues = stochData.map(d => d.d);
    let minVal = Math.min(...kValues, ...dValues);
    let maxVal = Math.max(...kValues, ...dValues);
    if (minVal === maxVal) {
      minVal -= 1;
      maxVal += 1;
    }
    const range = maxVal - minVal;

    const scaleY = (value: number) => {
      if (range === 0) return yOffset + indicatorHeight / 2;
      return yOffset + indicatorHeight - 10 - ((value - minVal) / range) * (indicatorHeight - 20);
    };

    const kPath = stochData.map((point, index) => {
      const x = timestampToX(point.timestamp, stochData, containerWidth, effectivePadding);
      const y = scaleY(point.k);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const dPath = stochData.map((point, index) => {
      const x = timestampToX(point.timestamp, stochData, containerWidth, effectivePadding);
      const y = scaleY(point.d);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return (
      <g>
        {/* Background with gradient */}
        <defs>
          <linearGradient id="stoch-bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.02)"/>
            <stop offset="100%" stopColor="rgba(0,0,0,0.08)"/>
          </linearGradient>
        </defs>
        
        <rect
          x={effectivePadding}
          y={yOffset}
          width={containerWidth - 2 * effectivePadding}
          height={indicatorHeight}
          fill="url(#stoch-bg)"
          stroke="rgba(128,128,128,0.2)"
          rx="4"
        />
        
        {/* Enhanced Stochastic levels */}
        <line
          x1={effectivePadding}
          y1={yOffset + indicatorHeight - ((80 / 100) * (indicatorHeight - 20)) - 10}
          x2={containerWidth - effectivePadding}
          y2={yOffset + indicatorHeight - ((80 / 100) * (indicatorHeight - 20)) - 10}
          stroke="rgba(255,82,82,0.4)"
          strokeDasharray="3,3"
          strokeWidth="1"
        />
        <line
          x1={effectivePadding}
          y1={yOffset + indicatorHeight - ((50 / 100) * (indicatorHeight - 20)) - 10}
          x2={containerWidth - effectivePadding}
          y2={yOffset + indicatorHeight - ((50 / 100) * (indicatorHeight - 20)) - 10}
          stroke="rgba(128,128,128,0.3)"
          strokeDasharray="2,4"
          strokeWidth="1"
        />
        <line
          x1={effectivePadding}
          y1={yOffset + indicatorHeight - ((20 / 100) * (indicatorHeight - 20)) - 10}
          x2={containerWidth - effectivePadding}
          y2={yOffset + indicatorHeight - ((20 / 100) * (indicatorHeight - 20)) - 10}
          stroke="rgba(76,175,80,0.4)"
          strokeDasharray="3,3"
          strokeWidth="1"
        />
        
        {/* %K line with glow effect */}
        <path
          d={kPath}
          fill="none"
          stroke={settings.stoch.colors.k}
          strokeWidth="3"
          opacity="0.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={kPath}
          fill="none"
          stroke={settings.stoch.colors.k}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* %D line with glow effect */}
        <path
          d={dPath}
          fill="none"
          stroke={settings.stoch.colors.d}
          strokeWidth="3"
          opacity="0.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={dPath}
          fill="none"
          stroke={settings.stoch.colors.d}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Enhanced label */}
        <rect
          x={effectivePadding + 5}
          y={yOffset + 5}
          width="100"
          height="18"
          fill="rgba(0,0,0,0.7)"
          rx="3"
        />
        <text
          x={effectivePadding + 10}
          y={yOffset + 16}
          fontSize="11"
          fill="white"
          fontWeight="600"
        >
          Stochastic ({settings.stoch.kPeriod},{settings.stoch.dPeriod})
        </text>
      </g>
    );
  }, [stochData, containerWidth, effectivePadding, indicatorHeight, settings.stoch]);

  return (
    <svg
      width={containerWidth}
      height={panelHeight}
      style={{ marginTop: 10 }}
    >
      {enabledIndicators.map((indicator, index) => {
        const yOffset = index * indicatorHeight;
        currentY = yOffset;
        
        switch (indicator) {
          case 'rsi':
            return <g key="rsi">{renderRSI(yOffset)}</g>;
          case 'macd':
            return <g key="macd">{renderMACD(yOffset)}</g>;
          case 'stoch':
            return <g key="stoch">{renderStochastic(yOffset)}</g>;
          default:
            return null;
        }
      })}
    </svg>
  );
}
