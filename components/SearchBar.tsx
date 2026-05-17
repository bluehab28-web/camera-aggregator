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
  counts,
}: {
  initialQuery: string;
  initialSource: string;
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(initialQuery);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (q.trim()) next.set('q', q.trim());
    else next.delete('q');
    router.push(`/?${next.toString()}`);
  }

  function setSource(key: string) {
    const next = new URLSearchParams(params.toString());
    if (key) next.set('source', key);
    else next.delete('source');
    router.push(`/?${next.toString()}`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="제목으로 검색 (예: 캐논, 소니, 5D, RX100)"
          style={{
            flex: 1,
            padding: '10px 14px',
            fontSize: 14,
            border: '1px solid #ddd',
            borderRadius: 8,
            background: '#fff',
          }}
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
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
      </div>
    </div>
  );
}
