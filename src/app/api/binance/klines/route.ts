import { NextRequest, NextResponse } from 'next/server';

// /api/binance/klines?symbol=BTCUSDT&interval=1m&limit=500
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const interval = searchParams.get('interval');
  const limit = searchParams.get('limit') || '500';

  if (!symbol || !interval) {
    return NextResponse.json({ error: 'Missing symbol or interval' }, { status: 400 });
  }

  const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

  try {
    const res = await fetch(binanceUrl);
    if (!res.ok) {
      return NextResponse.json({ error: 'Binance fetch failed' }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}
