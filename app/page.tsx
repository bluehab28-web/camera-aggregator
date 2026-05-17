import { db, Listing } from '@/lib/db';
import ListingCard from '@/components/ListingCard';
import SearchBar from '@/components/SearchBar';

type SearchParams = Promise<{ q?: string; source?: string }>;

const SOURCES = ['bunjang', 'joongna', 'daangn', 'clien'] as const;

async function getListings(q?: string, source?: string): Promise<Listing[]> {
  try {
    let sql = 'SELECT * FROM listings WHERE 1=1';
    const args: (string | number)[] = [];
    if (q && q.trim()) {
      sql += ' AND title LIKE ?';
      args.push(`%${q.trim()}%`);
    }
    if (source && (SOURCES as readonly string[]).includes(source)) {
      sql += ' AND source = ?';
      args.push(source);
    }
    sql += ' ORDER BY posted_at DESC, crawled_at DESC LIMIT 200';
    const result = await db.execute({ sql, args });
    return result.rows.map((r) => ({
      id: Number(r.id),
      source: String(r.source),
      source_id: String(r.source_id),
      title: String(r.title),
      price: r.price == null ? null : Number(r.price),
      url: String(r.url),
      image_url: r.image_url == null ? null : String(r.image_url),
      brand: r.brand == null ? null : String(r.brand),
      model: r.model == null ? null : String(r.model),
      location: r.location == null ? null : String(r.location),
      posted_at: r.posted_at == null ? null : String(r.posted_at),
      crawled_at: String(r.crawled_at),
    }));
  } catch {
    return [];
  }
}

async function getSourceCounts(): Promise<Record<string, number>> {
  try {
    const r = await db.execute('SELECT source, COUNT(*) AS n FROM listings GROUP BY source');
    const out: Record<string, number> = {};
    for (const row of r.rows) out[String(row.source)] = Number(row.n);
    return out;
  } catch {
    return {};
  }
}

export const revalidate = 60;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const { q, source } = await searchParams;
  const [listings, counts] = await Promise.all([getListings(q, source), getSourceCounts()]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          📷 중고 카메라 모아보기
        </h1>
        <p style={{ color: '#666', marginBottom: 16 }}>
          여러 중고 사이트의 카메라 매물을 한 곳에서 확인하세요 (DB 총 {total}건)
        </p>
        <SearchBar initialQuery={q ?? ''} initialSource={source ?? ''} counts={counts} />
      </header>

      {listings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#999' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>📭</p>
          <p style={{ fontSize: 18 }}>
            {q || source ? '검색 결과가 없습니다.' : '아직 수집된 매물이 없습니다.'}
          </p>
        </div>
      ) : (
        <>
          <p style={{ marginBottom: 16, color: '#666', fontSize: 14 }}>
            {listings.length}개 매물 표시 중
            {q ? ` · 검색어 "${q}"` : ''}
            {source ? ` · ${source}만` : ''}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
