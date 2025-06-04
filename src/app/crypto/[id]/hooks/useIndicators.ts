import { useMemo } from 'react';
import { 
  PricePoint, 
  BinanceKlineRaw, 
  IndicatorData, 
  IndicatorSettings 
} from '../types';
import { calculateAllIndicators, defaultIndicatorSettings } from '../indicators';

interface UseIndicatorsOptions {
  prices: PricePoint[];
  candles: BinanceKlineRaw[];
  settings?: IndicatorSettings;
}

interface UseIndicatorsReturn {
  indicators: IndicatorData;
  hasActiveIndicators: boolean;
  hasOverlayIndicators: boolean;
  hasPanelIndicators: boolean;
}

export function useIndicators({ 
  prices = [], 
  candles = [], 
  settings = defaultIndicatorSettings 
}: UseIndicatorsOptions): UseIndicatorsReturn {
  const indicators = useMemo(() => {
    if (prices.length === 0) return {};
    return calculateAllIndicators(prices, candles, settings);
  }, [prices, candles, settings]);

  const hasActiveIndicators = useMemo(() => {
    return Object.values(settings).some(setting => setting.enabled);
  }, [settings]);

  const hasOverlayIndicators = useMemo(() => {
    return settings.sma.enabled || settings.ema.enabled || settings.bb.enabled;
  }, [settings.sma.enabled, settings.ema.enabled, settings.bb.enabled]);

  const hasPanelIndicators = useMemo(() => {
    return settings.rsi.enabled || settings.macd.enabled || settings.stoch.enabled;
  }, [settings.rsi.enabled, settings.macd.enabled, settings.stoch.enabled]);

  return {
    indicators,
    hasActiveIndicators,
    hasOverlayIndicators,
    hasPanelIndicators
  };
}
