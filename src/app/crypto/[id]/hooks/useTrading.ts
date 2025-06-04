import { useState, useEffect, useCallback } from 'react';

export interface Trade {
  id: string;
  type: 'BUY' | 'SELL';
  symbol: string;
  amount: number;
  price: number;
  timestamp: number;
  total: number;
}

export interface Portfolio {
  cash: number;
  holdings: Record<string, {
    amount: number;
    averagePrice: number;
    totalInvested: number;
  }>;
  trades: Trade[];
  totalPortfolioValue: number;
  totalPnL: number;
}

export interface UseTradingReturn {
  portfolio: Portfolio;
  buyAsset: (symbol: string, amount: number, price: number) => boolean;
  sellAsset: (symbol: string, amount: number, price: number) => boolean;
  getHolding: (symbol: string) => { amount: number; averagePrice: number; currentValue: number; pnl: number } | null;
  getPortfolioValue: (currentPrices: Record<string, number>) => number;
  resetPortfolio: () => void;
}

const INITIAL_CASH = 10000; // $10,000 starting balance
const TRADING_FEE = 0.001; // 0.1% trading fee

export function useTrading(): UseTradingReturn {
  const [portfolio, setPortfolio] = useState<Portfolio>({
    cash: INITIAL_CASH,
    holdings: {},
    trades: [],
    totalPortfolioValue: INITIAL_CASH,
    totalPnL: 0
  });

  // Load portfolio from localStorage on mount
  useEffect(() => {
    const savedPortfolio = localStorage.getItem('crypto-trading-portfolio');
    if (savedPortfolio) {
      try {
        const parsed = JSON.parse(savedPortfolio);
        setPortfolio(parsed);
      } catch (error) {
        console.error('Failed to load portfolio from localStorage:', error);
      }
    }
  }, []);

  // Save portfolio to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('crypto-trading-portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  const buyAsset = useCallback((symbol: string, amount: number, price: number): boolean => {
    const total = amount * price;
    const fee = total * TRADING_FEE;
    const totalCost = total + fee;

    if (portfolio.cash < totalCost) {
      return false; // Insufficient funds
    }

    const trade: Trade = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'BUY',
      symbol,
      amount,
      price,
      timestamp: Date.now(),
      total: totalCost
    };

    setPortfolio(prev => {
      const newHoldings = { ...prev.holdings };
      
      if (newHoldings[symbol]) {
        // Update existing holding with weighted average price
        const existingValue = newHoldings[symbol].amount * newHoldings[symbol].averagePrice;
        const newValue = amount * price;
        const totalAmount = newHoldings[symbol].amount + amount;
        const newAveragePrice = (existingValue + newValue) / totalAmount;
        
        newHoldings[symbol] = {
          amount: totalAmount,
          averagePrice: newAveragePrice,
          totalInvested: newHoldings[symbol].totalInvested + total
        };
      } else {
        // New holding
        newHoldings[symbol] = {
          amount,
          averagePrice: price,
          totalInvested: total
        };
      }

      return {
        ...prev,
        cash: prev.cash - totalCost,
        holdings: newHoldings,
        trades: [...prev.trades, trade]
      };
    });

    return true;
  }, [portfolio.cash]);

  const sellAsset = useCallback((symbol: string, amount: number, price: number): boolean => {
    const holding = portfolio.holdings[symbol];
    
    if (!holding || holding.amount < amount) {
      return false; // Insufficient holdings
    }

    const total = amount * price;
    const fee = total * TRADING_FEE;
    const netReceived = total - fee;

    const trade: Trade = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'SELL',
      symbol,
      amount,
      price,
      timestamp: Date.now(),
      total: netReceived
    };

    setPortfolio(prev => {
      const newHoldings = { ...prev.holdings };
      
      if (newHoldings[symbol].amount === amount) {
        // Selling all holdings
        delete newHoldings[symbol];
      } else {
        // Partial sale - maintain average price, reduce amount and total invested proportionally
        const remainingRatio = (newHoldings[symbol].amount - amount) / newHoldings[symbol].amount;
        newHoldings[symbol] = {
          ...newHoldings[symbol],
          amount: newHoldings[symbol].amount - amount,
          totalInvested: newHoldings[symbol].totalInvested * remainingRatio
        };
      }

      return {
        ...prev,
        cash: prev.cash + netReceived,
        holdings: newHoldings,
        trades: [...prev.trades, trade]
      };
    });

    return true;
  }, [portfolio.holdings]);

  const getHolding = useCallback((symbol: string) => {
    const holding = portfolio.holdings[symbol];
    if (!holding) return null;

    return {
      amount: holding.amount,
      averagePrice: holding.averagePrice,
      currentValue: 0, // Will be calculated with current price
      pnl: 0 // Will be calculated with current price
    };
  }, [portfolio.holdings]);

  const getPortfolioValue = useCallback((currentPrices: Record<string, number>): number => {
    let totalValue = portfolio.cash;
    
    Object.entries(portfolio.holdings).forEach(([symbol, holding]) => {
      const currentPrice = currentPrices[symbol] || holding.averagePrice;
      totalValue += holding.amount * currentPrice;
    });

    return totalValue;
  }, [portfolio.cash, portfolio.holdings]);

  const resetPortfolio = useCallback(() => {
    const resetPortfolio: Portfolio = {
      cash: INITIAL_CASH,
      holdings: {},
      trades: [],
      totalPortfolioValue: INITIAL_CASH,
      totalPnL: 0
    };
    setPortfolio(resetPortfolio);
    localStorage.setItem('crypto-trading-portfolio', JSON.stringify(resetPortfolio));
  }, []);

  return {
    portfolio,
    buyAsset,
    sellAsset,
    getHolding,
    getPortfolioValue,
    resetPortfolio
  };
}