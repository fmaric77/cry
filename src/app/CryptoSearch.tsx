"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function CryptoSearch() {
  const [query, setQuery] = useState("");
  const [coins, setCoins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let data;
      if (query.trim()) {
        const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
        data = await res.json();
        setCoins(
          data.coins.map((c: any) => ({
            id: c.id,
            name: c.name,
            symbol: c.symbol,
            image: c.large,
            market_cap_rank: c.market_cap_rank,
            current_price: undefined,
          }))
        );
      } else {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false"
        );
        data = await res.json();
        setCoins(data);
      }
    } catch (err) {
      setError("Failed to fetch data");
    }
    setLoading(false);
  };

  const handleCoinClick = (id: string) => {
    router.push(`/crypto/${id}`);
  };

  // Initial load: show top 10
  useEffect(() => {
    handleSearch({ preventDefault: () => {} } as any);
    // eslint-disable-next-line
  }, []);

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={handleSearch} className="mb-6 w-full flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search for a cryptocurrency..."
          className="flex-1 px-3 py-2 rounded border border-gray-700 bg-gray-900 text-white"
          autoComplete="off"
        />
        <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700">Search</button>
      </form>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {!loading && !error && (
        <ul className="w-full space-y-4">
          {coins.length === 0 && <div className="text-gray-500">No results found.</div>}
          {coins.map((coin: any) => (
            <li
              key={coin.id}
              className="flex items-center gap-4 p-4 rounded border border-gray-700 bg-gray-900 shadow-sm text-white hover:bg-gray-800 transition"
              onClick={() => handleCoinClick(coin.id)}
              tabIndex={0}
              role="button"
              onKeyDown={e => { if (e.key === 'Enter') handleCoinClick(coin.id); }}
            >
              <Image src={coin.image} alt={coin.name} width={32} height={32} />
              <div className="flex-1">
                <div className="font-semibold">{coin.name} <span className="text-xs text-gray-500">({coin.symbol?.toUpperCase()})</span></div>
                {coin.market_cap_rank && <div className="text-sm text-gray-500">Rank #{coin.market_cap_rank}</div>}
              </div>
              {coin.current_price !== undefined && (
                <div className="font-mono text-lg">${coin.current_price?.toLocaleString()}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
