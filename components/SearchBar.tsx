'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

const SOURCES = [
  { key: '', label: '전체' },
  { key: 'bunjang', label: '번개장터' },
  { key: 'joongna', label: '중고나라' },
  { key: 'daangn', label: '당근마켓' },
  { key: 'clien', label: '클리앙' },
] as const;

export default function SearchBar({
  initialQuery,
  initialSource,
  initialPriceMin,
  initialPriceMax,
  initialIncludeSold,
  counts,
}: {
  initialQuery: string;
  initialSource: string;
  initialPriceMin: string;
  initialPriceMax: string;
  initialIncludeSold: boolean;
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(initialQuery);
  const [priceMin, setPriceMin] = useState(initialPriceMin);
  const [priceMax, setPriceMax] = useState(initialPriceMax);

  function buildParams(overrides: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    return next;
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const next = buildParams({
      q: q.trim() || null,
      price_min: priceMin.trim() || null,
      price_max: priceMax.trim() || null,
    });
    router.push(`/?${next.toString()}`);
  }

  function setSource(key: string) {
    router.push(`/?${buildParams({ source: key || null }).toString()}`);
  }

  function toggleSold() {
    router.push(`/?${buildParams({ include_sold: initialIncludeSold ? null : '1' }).toString()}`);
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: 14,
    border: '1px solid #ddd',
    borderRadius: 8,
    background: '#fff',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <form onSubmit={submitSearch} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="제목 검색 (예: 캐논, 소니, 5D, RX100)"
          style={{ ...inputStyle, flex: '1 1 220px', minWidth: 180 }}
        />
        <input
          type="number"
          value={priceMin}
          onChange={(e) => setPriceMin(e.target.value)}
          placeholder="최소가격"
          style={{ ...inputStyle, width: 110 }}
          min={0}
        />
        <span style={{ alignSelf: 'center', color: '#999' }}>~</span>
        <input
          type="number"
          value={priceMax}
          onChange={(e) => setPriceMax(e.target.value)}
          placeholder="최대가격"
          style={{ ...inputStyle, width: 110 }}
          min={0}
        />
        <button
          type="submit"
          style={{
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            borderRadius: 8,
            background: '#000',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          검색
        </button>
      </form>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {SOURCES.map((s) => {
          const active = (initialSource || '') === s.key;
          const n = s.key ? counts[s.key] ?? 0 : Object.values(counts).reduce((a, b) => a + b, 0);
          return (
            <button
              key={s.key || 'all'}
              onClick={() => setSource(s.key)}
              style={{
                padding: '6px 12px',
                fontSize: 13,
                border: '1px solid ' + (active ? '#000' : '#ddd'),
                borderRadius: 999,
                background: active ? '#000' : '#fff',
                color: active ? '#fff' : '#333',
                cursor: 'pointer',
              }}
            >
              {s.label} <span style={{ opacity: 0.6, marginLeft: 4 }}>{n}</span>
            </button>
          );
        })}
        <span style={{ width: 1, height: 20, background: '#ddd', margin: '0 4px' }} />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={initialIncludeSold} onChange={toggleSold} />
          판매완료 포함
        </label>
      </div>
    </div>
  );
}
