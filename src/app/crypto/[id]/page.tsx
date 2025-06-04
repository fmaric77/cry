'use client';

import { useEffect, useState } from 'react';
import InteractiveChart from "./InteractiveChart";
import { PredictionPanel, TradingPanel, PortfolioOverview, AutoTradingPanel } from "./components";
import { useBinanceData, useModelPrediction } from "./hooks";
import { getBinanceSymbol } from "./utils";

interface CoinData {
  prices: [number, number][];
}

// Client component for prediction integration
function PredictionWrapper({ coinId }: { coinId: string }) {
  const { binanceCandles } = useBinanceData({
    coinId,
    selectedPeriod: '1m',
    refreshRate: 30000
  });

  const {
    prediction,
    loading,
    error,
    lastUpdated,
    generatePrediction
  } = useModelPrediction({
    binanceCandles,
    enabled: true,
    refreshInterval: 60000 // Update every minute
  });

  return (
    <PredictionPanel
      prediction={prediction}
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      onRefresh={generatePrediction}
    />
  );
}

// Trading wrapper component
function TradingWrapper({ coinId }: { coinId: string }) {
  const { prices } = useBinanceData({
    coinId,
    selectedPeriod: '1m',
    refreshRate: 30000
  });

  const currentPrice = prices.length > 0 ? prices[prices.length - 1][1] : 0;
  const symbol = getBinanceSymbol(coinId) || coinId;

  if (!currentPrice) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border">
        <div className="text-center text-gray-500">Loading price data...</div>
      </div>
    );
  }

  return (
    <TradingPanel
      symbol={symbol.replace('USDT', '').toLowerCase()}
      currentPrice={currentPrice}
      coinName={coinId}
    />
  );
}

// Auto trading wrapper component
function AutoTradingWrapper({ coinId }: { coinId: string }) {
  const { binanceCandles, prices } = useBinanceData({
    coinId,
    selectedPeriod: '1m',
    refreshRate: 30000
  });

  const {
    prediction
  } = useModelPrediction({
    binanceCandles,
    enabled: true,
    refreshInterval: 60000
  });

  const currentPrice = prices.length > 0 ? prices[prices.length - 1][1] : 0;
  const symbol = getBinanceSymbol(coinId) || coinId;

  if (!currentPrice) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border">
        <div className="text-center text-gray-500">Loading price data...</div>
      </div>
    );
  }

  return (
    <AutoTradingPanel
      symbol={symbol.replace('USDT', '').toLowerCase()}
      currentPrice={currentPrice}
      prediction={prediction}
      coinName={coinId}
    />
  );
}

export default function CryptoDiagramPage({ params }: { params: Promise<{ id: string }> }) {
  const [coinId, setCoinId] = useState<string>('');
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'predictions' | 'trading' | 'portfolio' | 'autotrading'>('predictions');

  useEffect(() => {
    const loadData = async () => {
      try {
        const resolvedParams = await params;
        setCoinId(resolvedParams.id);
        
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${resolvedParams.id}/market_chart?vs_currency=usd&days=30`
        );
        if (!res.ok) throw new Error("Failed to fetch chart data");
        const data = await res.json();
        setCoinData(data);
      } catch (error) {
        console.error('Error loading coin data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params]);

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!coinData || !coinId) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Failed to load coin data</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <InteractiveChart id={coinId} initialPrices={coinData.prices} />
      
      {/* Trading Dashboard */}
      <div className="max-w-[95vw] mx-auto p-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Navigation and Chart Controls */}
          <div className="xl:col-span-2">
            <a href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium mb-4">
              ← Back to search
            </a>
            
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-lg border p-1 mb-4">
              <div className="grid grid-cols-4 gap-1">
                <button
                  onClick={() => setActiveTab('predictions')}
                  className={`py-2 px-3 rounded-md font-medium transition-colors text-sm ${
                    activeTab === 'predictions'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  AI Predictions
                </button>
                <button
                  onClick={() => setActiveTab('trading')}
                  className={`py-2 px-3 rounded-md font-medium transition-colors text-sm ${
                    activeTab === 'trading'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Manual Trading
                </button>
                <button
                  onClick={() => setActiveTab('autotrading')}
                  className={`py-2 px-3 rounded-md font-medium transition-colors text-sm ${
                    activeTab === 'autotrading'
                      ? 'bg-orange-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🤖 Auto Trading
                </button>
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className={`py-2 px-3 rounded-md font-medium transition-colors text-sm ${
                    activeTab === 'portfolio'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Portfolio
                </button>
              </div>
            </div>
          </div>
          
          {/* Side Panel */}
          <div>
            {activeTab === 'predictions' && <PredictionWrapper coinId={coinId} />}
            {activeTab === 'trading' && <TradingWrapper coinId={coinId} />}
            {activeTab === 'autotrading' && <AutoTradingWrapper coinId={coinId} />}
            {activeTab === 'portfolio' && (
              <PortfolioOverview 
                currentPrices={{
                  [getBinanceSymbol(coinId)?.replace('USDT', '').toLowerCase() || coinId]: 
                    coinData.prices[coinData.prices.length - 1]?.[1] || 0
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
