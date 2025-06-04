import { useState, useEffect } from 'react';
import { BinanceKlineRaw, PricePoint, TimePeriod } from '../types';
import { getBinanceSymbol, PERIOD_TO_BINANCE, getApiLimit, convertToLinePrices } from '../utils';

interface UseBinanceDataOptions {
  coinId: string;
  selectedPeriod: TimePeriod;
  refreshRate: number;
}

interface UseBinanceDataReturn {
  prices: PricePoint[];
  binanceCandles: BinanceKlineRaw[];
  loading: boolean;
  noData: boolean;
  noDataPeriods: Set<TimePeriod>;
}

/**
 * Custom hook for fetching and managing Binance data
 */
export function useBinanceData({ 
  coinId, 
  selectedPeriod, 
  refreshRate 
}: UseBinanceDataOptions): UseBinanceDataReturn {
  const [prices, setPrices] = useState<PricePoint[]>([]);
  const [binanceCandles, setBinanceCandles] = useState<BinanceKlineRaw[]>([]);
  const [loading, setLoading] = useState(false);
  const [noDataPeriods, setNoDataPeriods] = useState<Set<TimePeriod>>(new Set());
  const [noData, setNoData] = useState(false);

  // Fetch data when period changes
  useEffect(() => {
    const fetchPriceData = async () => {
      const binanceInterval = PERIOD_TO_BINANCE[selectedPeriod];
      const symbol = getBinanceSymbol(coinId);
      
      if (!symbol) {
        setNoDataPeriods(prev => new Set(prev).add(selectedPeriod));
        setNoData(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      
      try {
        const limit = getApiLimit(selectedPeriod);
        const url = `/api/binance/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${limit}`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Binance fetch failed');
        
        const data: BinanceKlineRaw[] = await response.json();
        const linePrices = convertToLinePrices(data);
        
        setPrices(linePrices);
        setBinanceCandles(data);
        setNoData(false);
      } catch (error) {
        setNoDataPeriods(prev => new Set(prev).add(selectedPeriod));
        setNoData(true);
        setBinanceCandles([]);
        console.error('Error fetching Binance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPriceData();
  }, [selectedPeriod, coinId]);

  // WebSocket real-time updates for 1m period
  useEffect(() => {
    if (selectedPeriod !== '1m') return;
    
    const symbol = getBinanceSymbol(coinId)?.toLowerCase();
    if (!symbol) return;

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@kline_1m`);
    let lastCandles = binanceCandles.length ? [...binanceCandles] : [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.k) {
        const k = msg.k;
        const candle: BinanceKlineRaw = [
          k.t, // openTime
          k.o, // open
          k.h, // high
          k.l, // low
          k.c, // close
          k.v, // volume
          k.T, // closeTime
          k.q, // quote asset volume
          k.n, // number of trades
          k.V, // taker buy base asset volume
          k.Q, // taker buy quote asset volume
          k.B  // ignore
        ];

        // Update last candle or push new
        if (lastCandles.length && lastCandles[lastCandles.length - 1][0] === k.t) {
          lastCandles[lastCandles.length - 1] = candle;
        } else {
          lastCandles.push(candle);
          if (lastCandles.length > 500) {
            lastCandles = lastCandles.slice(-500);
          }
        }

        setBinanceCandles([...lastCandles]);
        setPrices(convertToLinePrices(lastCandles));
      }
    };

    ws.onerror = () => ws.close();

    return () => {
      ws.close();
    };
  }, [selectedPeriod, coinId, binanceCandles.length]);

  // Polling for all other periods except 1m
  useEffect(() => {
    if (selectedPeriod === '1m') return;

    const binanceInterval = PERIOD_TO_BINANCE[selectedPeriod];
    if (!binanceInterval) return;

    let intervalId: NodeJS.Timeout | null = null;

    const fetchLatest = async () => {
      const symbol = getBinanceSymbol(coinId);
      if (!symbol) return;

      try {
        const limit = getApiLimit(selectedPeriod);
        const url = `/api/binance/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${limit}`;
        const response = await fetch(url);
        
        if (!response.ok) return;
        
        const data: BinanceKlineRaw[] = await response.json();
        const linePrices = convertToLinePrices(data);
        
        setPrices(linePrices);
        setBinanceCandles(data);
      } catch (error) {
        // Silently handle polling errors
        console.warn('Polling error:', error);
      }
    };

    intervalId = setInterval(fetchLatest, refreshRate);
    fetchLatest();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [selectedPeriod, coinId, refreshRate]);

  return {
    prices,
    binanceCandles,
    loading,
    noData,
    noDataPeriods
  };
}
