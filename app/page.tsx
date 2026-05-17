import { db, Listing } from '@/lib/db';
import ListingCard from '@/components/ListingCard';
import SearchBar from '@/components/SearchBar';

type SearchParams = Promise<{
  q?: string;
  source?: string;
  price_min?: string;
  price_max?: string;
  include_sold?: string;
}>;

const SOURCES = ['bunjang', 'joongna', 'daangn', 'clien'] as const;

interface Filters {
  q?: string;
  source?: string;
  priceMin?: number;
  priceMax?: number;
  includeSold: boolean;
}

async function getListings(f: Filters): Promise<Listing[]> {
  try {
    let sql = 'SELECT * FROM listings WHERE 1=1';
    const args: (string | number)[] = [];
    if (f.q && f.q.trim()) {
      sql += ' AND title LIKE ?';
      args.push(`%${f.q.trim()}%`);
    }
    if (f.source && (SOURCES as readonly string[]).includes(f.source)) {
      sql += ' AND source = ?';
      args.push(f.source);
    }
    if (!f.includeSold) {
      sql += " AND (status IS NULL OR status != 'sold')";
    }
    if (f.priceMin !== undefined) {
      sql += ' AND price >= ?';
      args.push(f.priceMin);
    }
    if (f.priceMax !== undefined) {
      sql += ' AND price <= ?';
      args.push(f.priceMax);
    }
    sql += ' ORDER BY (image_url IS NULL) ASC, posted_at DESC, crawled_at DESC LIMIT 200';
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
      status: r.status == null ? null : String(r.status),
    }));
  } catch {
    return [];
  }
}

async function getSourceCounts(): Promise<Record<string, number>> {
  try {
    const r = await db.execute(
      "SELECT source, COUNT(*) AS n FROM listings WHERE (status IS NULL OR status != 'sold') GROUP BY source"
    );
    const out: Record<string, number> = {};
    for (const row of r.rows) out[String(row.source)] = Number(row.n);
    return out;
  } catch {
    return {};
  }
}

export const revalidate = 60;

function parsePositiveInt(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filters: Filters = {
    q: sp.q,
    source: sp.source,
    priceMin: parsePositiveInt(sp.price_min),
    priceMax: parsePositiveInt(sp.price_max),
    includeSold: sp.include_sold === '1',
  };

  const [listings, counts] = await Promise.all([getListings(filters), getSourceCounts()]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          📷 중고 카메라 모아보기
        </h1>
        <p style={{ color: '#666', marginBottom: 16 }}>
          여러 중고 사이트의 카메라 매물을 한 곳에서 (판매중 {total}건)
        </p>
        <SearchBar
          initialQuery={filters.q ?? ''}
          initialSource={filters.source ?? ''}
          initialPriceMin={filters.priceMin?.toString() ?? ''}
          initialPriceMax={filters.priceMax?.toString() ?? ''}
          initialIncludeSold={filters.includeSold}
          counts={counts}
        />
      </header>

      {listings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#999' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>📭</p>
          <p style={{ fontSize: 18 }}>
            {filters.q || filters.source || filters.priceMin !== undefined || filters.priceMax !== undefined
              ? '조건에 맞는 매물이 없습니다.'
              : '아직 수집된 매물이 없습니다.'}
          </p>
        </div>
      ) : (
        <>
          <p style={{ marginBottom: 16, color: '#666', fontSize: 14 }}>
            {listings.length}개 표시
            {filters.q ? ` · 검색 "${filters.q}"` : ''}
            {filters.source ? ` · ${filters.source}` : ''}
            {filters.priceMin !== undefined ? ` · ≥${filters.priceMin.toLocaleString()}원` : ''}
            {filters.priceMax !== undefined ? ` · ≤${filters.priceMax.toLocaleString()}원` : ''}
            {filters.includeSold ? ' · 판매완료 포함' : ''}
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
