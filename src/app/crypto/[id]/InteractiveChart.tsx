"use client";
import React, { useRef, useState, useEffect } from "react";
import { ChartProps, TimePeriod, ChartMode } from './types';
import { getDateFormat } from './utils';
import { defaultIndicatorSettings } from './indicators';
import {
  useBinanceData,
  useChartZoom,
  useResponsiveSize,
  useUserPreferences,
  useChartCalculations,
  useIndicators
} from './hooks';
import {
  ChartGrid,
  ChartAxis,
  LineChart,
  CandlestickChart,
  ChartTooltip,
  VolumeBars,
  IndicatorOverlays,
  IndicatorPanel,
  IndicatorSettingsPanel
} from './components';

export default function InteractiveChart({ 
  id, 
  initialPrices, 
  width = 1200, 
  height = 700, 
  padding = 80 
}: ChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Custom hooks for chart functionality
  const dimensions = useResponsiveSize({ 
    initialWidth: width, 
    initialHeight: height, 
    padding 
  });

  const preferences = useUserPreferences({
    defaultPreferences: { selectedPeriod: '1M' as TimePeriod, chartMode: 'line' as ChartMode }
  });

  const zoomPan = useChartZoom({
    initialZoom: preferences.zoom,
    initialPan: preferences.pan
  });

  const binanceData = useBinanceData({
    coinId: id,
    selectedPeriod: preferences.selectedPeriod,
    refreshRate: preferences.refreshRate
  });

  const calculations = useChartCalculations({
    prices: binanceData.prices.length > 0 ? binanceData.prices : initialPrices,
    binanceCandles: binanceData.binanceCandles,
    zoom: zoomPan.zoom,
    pan: zoomPan.pan,
    dimensions
  });

  const indicators = useIndicators({
    prices: binanceData.prices.length > 0 ? binanceData.prices : initialPrices,
    candles: binanceData.binanceCandles,
    settings: preferences.indicators || defaultIndicatorSettings
  });

  // Sync zoom/pan with preferences
  useEffect(() => {
    preferences.updatePreferences({ 
      zoom: zoomPan.zoom, 
      pan: zoomPan.pan 
    });
  }, [zoomPan.zoom, zoomPan.pan]);

  // Auto-reset zoom for 3M/1Y periods
  useEffect(() => {
    if ((preferences.selectedPeriod === '3M' || preferences.selectedPeriod === '1Y') && 
        binanceData.binanceCandles.length > 0) {
      zoomPan.setZoom(1);
      zoomPan.setPan(0);
    }
  }, [preferences.selectedPeriod, binanceData.binanceCandles.length]);

  // Get current hover point
  const currentHoverPoint = hoverIndex !== null && calculations.vpathData[hoverIndex] 
    ? calculations.vpathData[hoverIndex] 
    : null;

  const dateFormat = getDateFormat(preferences.selectedPeriod);

  // Mouse event handlers
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Update hover for tooltip
    const mouseX = e.clientX - rect.left;
    const dataIndex = Math.round(
      ((mouseX - dimensions.effectivePadding) / (dimensions.containerWidth - 2 * dimensions.effectivePadding)) * 
      (calculations.vpathData.length - 1)
    );
    
    if (dataIndex >= 0 && dataIndex < calculations.vpathData.length) {
      setHoverIndex(dataIndex);
    }
    
    // Handle zoom/pan mouse move
    zoomPan.handleMouseMove(e, dimensions.containerWidth, dimensions.effectivePadding);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    zoomPan.setIsPanning(false);
  };

  // Determine visible time range for indicators (timestamps)
  const visiblePricePoints = calculations.visiblePrices;
  const indicatorStartTs = visiblePricePoints.length > 0 ? visiblePricePoints[0][0] : 0;
  const indicatorEndTs = visiblePricePoints.length > 0 ? visiblePricePoints[visiblePricePoints.length - 1][0] : 0;

  return (
    <div ref={dimensions.containerRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <svg 
        ref={svgRef} 
        width={dimensions.containerWidth} 
        height={dimensions.containerHeight}
        onWheel={(e) => zoomPan.handleWheel(e, dimensions.containerWidth, dimensions.effectivePadding)}
        onMouseDown={zoomPan.handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={zoomPan.handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: zoomPan.zoom > 1 ? (zoomPan.isPanning ? 'grabbing' : 'grab') : 'crosshair' }}
      >
        <ChartGrid dimensions={dimensions} />

        {preferences.chartMode === 'line' && (
          <LineChart pathData={calculations.vpathData} />
        )}

        {preferences.chartMode === 'candle' && (
          <CandlestickChart 
            candles={calculations.ohlcCandles} 
            dimensions={dimensions}
            vmin={calculations.vmin}
            vmax={calculations.vmax}
            vrange={calculations.vrange}
          />
        )}

        <ChartAxis dimensions={dimensions} />

        {indicators.hasOverlayIndicators && (
          <IndicatorOverlays
            smaData={getVisibleWithEdgePoints(indicators.indicators.sma, indicatorStartTs, indicatorEndTs)}
            emaData={getVisibleWithEdgePoints(indicators.indicators.ema, indicatorStartTs, indicatorEndTs)}
            bbData={getVisibleWithEdgePoints(indicators.indicators.bb, indicatorStartTs, indicatorEndTs)}
            dimensions={dimensions}
            vmin={calculations.vmin}
            vmax={calculations.vmax}
            vrange={calculations.vrange}
            settings={preferences.indicators || defaultIndicatorSettings}
          />
        )}

        <ChartTooltip 
          point={currentHoverPoint}
          dimensions={dimensions}
          dateFormat={dateFormat}
        />

        {preferences.showVolume && (
          <VolumeBars 
            candles={calculations.ohlcCandles}
            dimensions={dimensions}
            vmin={calculations.vmin}
            vmax={calculations.vmax}
            vrange={calculations.vrange}
          />
        )}
      </svg>

      {/* Indicator Settings Panel */}
      <IndicatorSettingsPanel
        settings={preferences.indicators || defaultIndicatorSettings}
        onSettingsChange={(newSettings) => 
          preferences.updatePreferences({ indicators: newSettings })
        }
      />

      {/* Secondary Indicators Panel */}
      {indicators.hasPanelIndicators && (
        <IndicatorPanel
          rsiData={getVisibleWithEdgePoints(indicators.indicators.rsi, indicatorStartTs, indicatorEndTs)}
          macdData={getVisibleWithEdgePoints(indicators.indicators.macd, indicatorStartTs, indicatorEndTs)}
          stochData={getVisibleWithEdgePoints(indicators.indicators.stoch, indicatorStartTs, indicatorEndTs)}
          dimensions={dimensions}
          settings={preferences.indicators || defaultIndicatorSettings}
        />
      )}

      {/* Period and mode controls */}
      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 10 }}>
        <select
          value={preferences.selectedPeriod}
          onChange={(e) => preferences.updatePreferences({ selectedPeriod: e.target.value as TimePeriod })}
          style={{ padding: 8, fontSize: 14 }}
        >
          <option value="1m">1 Minute</option>
          <option value="5m">5 Minutes</option>
          <option value="15m">15 Minutes</option>
          <option value="1D">1 Day</option>
          <option value="7D">7 Days</option>
          <option value="1M">1 Month</option>
          <option value="3M">3 Months</option>
          <option value="1Y">1 Year</option>
        </select>
        <select
          value={preferences.chartMode}
          onChange={(e) => preferences.updatePreferences({ chartMode: e.target.value as ChartMode })}
          style={{ padding: 8, fontSize: 14 }}
        >
          <option value="line">Line</option>
          <option value="candle">Candlestick</option>
        </select>
        <button onClick={zoomPan.resetZoom} style={{ padding: 8, fontSize: 14 }}>
          Reset Zoom
        </button>
        <button 
          onClick={() => preferences.updatePreferences({ showVolume: !preferences.showVolume })} 
          style={{ padding: 8, fontSize: 14 }}
        >
          {preferences.showVolume ? 'Hide' : 'Show'} Volume
        </button>
      </div>

      {/* Loading and no data messages */}
      {binanceData.loading && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 18, color: '#007bff' }}>
          Loading...
        </div>
      )}
      {binanceData.noData && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 18, color: '#f44336' }}>
          No data available for the selected period.
        </div>
      )}
    </div>
  );
}

// Helper function to include edge points for indicator overlays
function getVisibleWithEdgePoints<T extends { timestamp: number }>(data: T[] | undefined, start: number, end: number): T[] | undefined {
  if (!data || data.length === 0) return data;
  const visible = data.filter((point) => point.timestamp >= start && point.timestamp <= end);
  const before = data.filter((point) => point.timestamp < start);
  const after = data.filter((point) => point.timestamp > end);
  const edgePoints: T[] = [];
  if (before.length > 0) edgePoints.push(before[before.length - 1]);
  edgePoints.push(...visible);
  if (after.length > 0) edgePoints.push(after[0]);
  // Ensure at least two points if possible
  if (edgePoints.length < 2 && data.length >= 2) {
    // fallback: return the last two points in data
    return data.slice(-2);
  }
  return edgePoints;
}