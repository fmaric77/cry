import React, { useState, useEffect } from 'react';
import { useTrading, Trade } from '../hooks/useTrading';

interface TradingPanelProps {
  symbol: string;
  currentPrice: number;
  coinName?: string;
}

export function TradingPanel({ symbol, currentPrice, coinName }: TradingPanelProps) {
  const { portfolio, buyAsset, sellAsset, getHolding } = useTrading();
  const [activeTab, setActiveTab] = useState<'BUY' | 'SELL'>('BUY');
  const [amount, setAmount] = useState<string>('');
  const [dollarAmount, setDollarAmount] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const holding = getHolding(symbol);
  const maxBuyAmount = Math.floor((portfolio.cash * 0.95) / currentPrice * 100000) / 100000; // 95% of cash, 5 decimal precision
  const maxSellAmount = holding?.amount || 0;

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleAmountChange = (value: string) => {
    setAmount(value);
    const numValue = parseFloat(value) || 0;
    setDollarAmount((numValue * currentPrice).toFixed(2));
  };

  const handleDollarAmountChange = (value: string) => {
    setDollarAmount(value);
    const numValue = parseFloat(value) || 0;
    setAmount((numValue / currentPrice).toFixed(6));
  };

  const handleTrade = () => {
    const tradeAmount = parseFloat(amount);
    if (!tradeAmount || tradeAmount <= 0) {
      setNotification({ type: 'error', message: 'Please enter a valid amount' });
      return;
    }

    let success = false;
    if (activeTab === 'BUY') {
      success = buyAsset(symbol, tradeAmount, currentPrice);
      if (success) {
        setNotification({ 
          type: 'success', 
          message: `Successfully bought ${tradeAmount} ${symbol.toUpperCase()} for $${(tradeAmount * currentPrice).toFixed(2)}` 
        });
      } else {
        setNotification({ type: 'error', message: 'Insufficient funds' });
      }
    } else {
      success = sellAsset(symbol, tradeAmount, currentPrice);
      if (success) {
        setNotification({ 
          type: 'success', 
          message: `Successfully sold ${tradeAmount} ${symbol.toUpperCase()} for $${(tradeAmount * currentPrice).toFixed(2)}` 
        });
      } else {
        setNotification({ type: 'error', message: 'Insufficient holdings' });
      }
    }

    if (success) {
      setAmount('');
      setDollarAmount('');
    }
  };

  const setMaxAmount = () => {
    const maxAmount = activeTab === 'BUY' ? maxBuyAmount : maxSellAmount;
    setAmount(maxAmount.toFixed(6));
    setDollarAmount((maxAmount * currentPrice).toFixed(2));
  };

  const currentValue = holding ? holding.amount * currentPrice : 0;
  const pnl = holding ? currentValue - holding.totalInvested : 0;
  const pnlPercentage = holding && holding.totalInvested > 0 ? (pnl / holding.totalInvested) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Trade {coinName || symbol.toUpperCase()}
        </h3>
        <div className="text-sm text-gray-600">
          ${currentPrice.toFixed(4)}
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-3 rounded-md ${
          notification.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Portfolio Info */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Cash:</span>
            <div className="font-semibold">${portfolio.cash.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-gray-600">Holdings:</span>
            <div className="font-semibold">
              {holding ? `${holding.amount.toFixed(6)} ${symbol.toUpperCase()}` : '0'}
            </div>
          </div>
          {holding && (
            <>
              <div>
                <span className="text-gray-600">Avg Price:</span>
                <div className="font-semibold">${holding.averagePrice.toFixed(4)}</div>
              </div>
              <div>
                <span className="text-gray-600">P&L:</span>
                <div className={`font-semibold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${pnl.toFixed(2)} ({pnlPercentage.toFixed(2)}%)
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Buy/Sell Tabs */}
      <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('BUY')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'BUY'
              ? 'bg-green-600 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setActiveTab('SELL')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'SELL'
              ? 'bg-red-600 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Trading Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount ({symbol.toUpperCase()})
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00000000"
              step="0.00000001"
            />
            <button
              onClick={setMaxAmount}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
            >
              Max
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Max: {(activeTab === 'BUY' ? maxBuyAmount : maxSellAmount).toFixed(6)} {symbol.toUpperCase()}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total (USD)
          </label>
          <input
            type="number"
            value={dollarAmount}
            onChange={(e) => handleDollarAmountChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
            step="0.01"
          />
        </div>

        <button
          onClick={handleTrade}
          disabled={!amount || parseFloat(amount) <= 0}
          className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'BUY'
              ? 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300'
              : 'bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-300'
          }`}
        >
          {activeTab === 'BUY' ? 'Buy' : 'Sell'} {symbol.toUpperCase()}
        </button>
      </div>

      {/* Trade Summary */}
      {amount && parseFloat(amount) > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-2">Trade Summary:</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Amount:</span>
              <span>{parseFloat(amount).toFixed(6)} {symbol.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>Price:</span>
              <span>${currentPrice.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${(parseFloat(amount) * currentPrice).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Fee (0.1%):</span>
              <span>${(parseFloat(amount) * currentPrice * 0.001).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>Total:</span>
              <span>${(parseFloat(amount) * currentPrice * (activeTab === 'BUY' ? 1.001 : 0.999)).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}