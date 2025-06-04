import Image from "next/image";
import { Suspense } from "react";
import CryptoSearch from "./CryptoSearch";

// Fetch crypto data from CoinGecko API
async function getCryptoData(query: string) {
  const url = query
    ? `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
    : "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false";
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error("Failed to fetch crypto data");
  return res.json();
}

function SearchForm() {
  return (
    <form action="" method="GET" className="mb-6 w-full max-w-md flex gap-2">
      <input
        type="text"
        name="q"
        placeholder="Search for a cryptocurrency..."
        className="flex-1 px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white"
        autoComplete="off"
      />
      <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700">Search</button>
    </form>
  );
}

async function CryptoList({ query }: { query: string }) {
  let coins;
  if (query) {
    const data = await getCryptoData(query);
    coins = data.coins?.map((c: any) => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      image: c.large,
      market_cap_rank: c.market_cap_rank,
      current_price: c.market_cap_rank ? undefined : undefined, // Not available in search
    })) || [];
  } else {
    coins = await getCryptoData("");
  }
  if (!coins.length) return <div className="text-gray-500">No results found.</div>;
  return (
    <ul className="w-full space-y-4">
      {coins.map((coin: any) => (
        <li key={coin.id} className="flex items-center gap-4 p-4 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
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
  );
}

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Cryptocurrency Search</h1>
        <CryptoSearch />
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
