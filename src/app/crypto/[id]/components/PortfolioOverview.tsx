import React, { useState } from 'react';
import { useTrading, Trade, Portfolio } from '../hooks/useTrading';

interface PortfolioOverviewProps {
  currentPrices?: Record<string, number>;
}

export function PortfolioOverview({ currentPrices = {} }: PortfolioOverviewProps) {
  const { portfolio, resetPortfolio } = useTrading();
  const [showTrades, setShowTrades] = useState(false);

  // Calculate portfolio metrics
  const totalValue = portfolio.cash + Object.entries(portfolio.holdings).reduce((total, [symbol, holding]) => {
    const currentPrice = currentPrices[symbol] || holding.averagePrice;
    return total + (holding.amount * currentPrice);
  }, 0);

  const totalInvested = Object.values(portfolio.holdings).reduce((total, holding) => {
    return total + holding.totalInvested;
  }, 0);

  const totalPnL = totalValue - 10000; // Initial balance was $10,000
  const totalPnLPercentage = ((totalValue - 10000) / 10000) * 100;

  const recentTrades = portfolio.trades.slice(-5).reverse(); // Last 5 trades

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Portfolio Overview</h3>
        <button
          onClick={resetPortfolio}
          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Reset Portfolio
        </button>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">Total Value</div>
          <div className="text-xl font-bold text-blue-900">${totalValue.toFixed(2)}</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-600 font-medium">Available Cash</div>
          <div className="text-xl font-bold text-green-900">${portfolio.cash.toFixed(2)}</div>
        </div>
        
        <div className={`p-4 rounded-lg ${totalPnL >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className={`text-sm font-medium ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Total P&L
          </div>
          <div className={`text-xl font-bold ${totalPnL >= 0 ? 'text-green-900' : 'text-red-900'}`}>
            ${totalPnL.toFixed(2)}
          </div>
          <div className={`text-sm ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalPnLPercentage >= 0 ? '+' : ''}{totalPnLPercentage.toFixed(2)}%
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600 font-medium">Total Trades</div>
          <div className="text-xl font-bold text-gray-900">{portfolio.trades.length}</div>
        </div>
      </div>

      {/* Holdings */}
      {Object.keys(portfolio.holdings).length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-800 mb-3">Current Holdings</h4>
          <div className="space-y-2">
            {Object.entries(portfolio.holdings).map(([symbol, holding]) => {
              const currentPrice = currentPrices[symbol] || holding.averagePrice;
              const currentValue = holding.amount * currentPrice;
              const pnl = currentValue - holding.totalInvested;
              const pnlPercentage = (pnl / holding.totalInvested) * 100;

              return (
                <div key={symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{symbol.toUpperCase()}</div>
                    <div className="text-sm text-gray-600">
                      {holding.amount.toFixed(6)} @ ${holding.averagePrice.toFixed(4)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${currentValue.toFixed(2)}</div>
                    <div className={`text-sm ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnlPercentage.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Trades */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-md font-semibold text-gray-800">Recent Trades</h4>
          {portfolio.trades.length > 5 && (
            <button
              onClick={() => setShowTrades(!showTrades)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showTrades ? 'Show Less' : 'Show All'}
            </button>
          )}
        </div>
        
        {portfolio.trades.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No trades yet. Start trading to see your transaction history!
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(showTrades ? portfolio.trades.slice().reverse() : recentTrades).map((trade: Trade) => (
              <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    trade.type === 'BUY' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {trade.type}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {trade.amount.toFixed(6)} {trade.symbol.toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-600">
                      @ ${trade.price.toFixed(4)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">${trade.total.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(trade.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}