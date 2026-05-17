import { createClient } from '@libsql/client';
import { sleep } from './_utils';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const MAX_PAGES = 30;
const PER_PAGE = 100;
const DELAY_MS = 700;
const KEYWORD = '%EC%B9%B4%EB%A9%94%EB%9D%BC';

interface BunjangItem {
  pid: string;
  name: string;
  price: string;
  product_image: string;
  update_time: number;
  location: string;
  status?: string;
}

function mapBunjangStatus(s: string | undefined): string | null {
  if (s === '0') return 'active';
  if (s === '1') return 'reserved';
  if (s === '2' || s === '5' || s === '6') return 'sold';
  return null;
}

interface BunjangResponse {
  list: BunjangItem[];
}

function extractBrandModel(title: string): { brand: string | null; model: string | null } {
  const words = title.trim().split(/\s+/);
  return {
    brand: words[0] || null,
    model: words[1] || null,
  };
}

function nullIfEmpty(s: string | null | undefined): string | null {
  if (s === null || s === undefined) return null;
  const t = String(s).trim();
  return t === '' ? null : t;
}

function buildImageUrl(product_image: string | null | undefined): string | null {
  if (!product_image) return null;
  return product_image.replace('{res}', '300');
}

async function fetchPage(page: number): Promise<BunjangItem[]> {
  const url = `https://api.bunjang.co.kr/api/1/find_v2.json?q=${KEYWORD}&order=date&n=${PER_PAGE}&page=${page}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data: BunjangResponse = await res.json();
  return data.list ?? [];
}

async function crawlBunjang() {
  console.log('[bunjang] 크롤링 시작...');
  let totalSeen = 0;
  let totalInserted = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    let items: BunjangItem[];
    try {
      items = await fetchPage(page);
    } catch (err) {
      console.error(`[bunjang] page=${page} fetch 오류:`, err);
      break;
    }

    if (items.length === 0) {
      console.log(`[bunjang] page=${page}: 빈 응답, 종료`);
      break;
    }

    let pageInserted = 0;
    for (const item of items) {
      const { brand, model } = extractBrandModel(item.name);
      const priceNum = item.price != null ? parseInt(String(item.price), 10) : NaN;
      const price = Number.isFinite(priceNum) ? priceNum : null;
      const postedAt = item.update_time
        ? new Date(item.update_time * 1000).toISOString()
        : new Date().toISOString();

      try {
        const result = await db.execute({
          sql: `INSERT OR IGNORE INTO listings
                (source, source_id, title, price, url, image_url, brand, model, location, posted_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            'bunjang',
            String(item.pid),
            item.name,
            price,
            `https://m.bunjang.co.kr/products/${item.pid}`,
            buildImageUrl(item.product_image),
            brand,
            model,
            nullIfEmpty(item.location),
            postedAt,
            mapBunjangStatus(item.status),
          ],
        });
        if (result.rowsAffected > 0) pageInserted++;
      } catch (err) {
        console.error(`[bunjang] 삽입 오류 (pid=${item.pid}):`, err);
      }
    }

    totalSeen += items.length;
    totalInserted += pageInserted;
    console.log(`[bunjang] page=${page}: 수집 ${items.length} / 신규 ${pageInserted}`);

    if (pageInserted === 0) {
      console.log('[bunjang] 신규 0건, 종료');
      break;
    }
    await sleep(DELAY_MS);
  }

  console.log(`[bunjang] 완료: 페이지 수집 ${totalSeen} / 신규 삽입 ${totalInserted}`);
}

crawlBunjang().catch((err) => {
  console.error('[bunjang] 치명적 오류:', err);
  process.exit(1);
});
