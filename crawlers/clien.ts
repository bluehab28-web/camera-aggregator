import { createClient } from '@libsql/client';
import * as cheerio from 'cheerio';
import { fetchUtf8, sleep } from './_utils';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const DEBUG = process.argv.includes('--debug');
const BASE_URL = 'https://www.clien.net';
const MAX_PAGES = 20;
const DELAY_MS = 700;
const KEYWORD = '%EC%B9%B4%EB%A9%94%EB%9D%BC';

function extractPrice(text: string): number | null {
  const m = text.replace(/,/g, '').match(/([0-9]+)\s*원/);
  return m ? parseInt(m[1], 10) : null;
}

function extractSourceId(href: string): string | null {
  const m = href.match(/\/service\/board\/[a-z]+\/(\d+)/);
  return m ? m[1] : null;
}

interface PageResult {
  itemCount: number;
  inserted: number;
}

async function crawlPage(page: number): Promise<PageResult> {
  const searchUrl = `${BASE_URL}/service/search?q=${KEYWORD}&sort=recency&boardCd=sold&isBoard=true&p=${page}`;

  const res = await fetchUtf8(searchUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const $ = cheerio.load(res.text);
  const $items = $('.list_item.symph_row');

  let inserted = 0;
  for (const el of $items.toArray()) {
    const $el = $(el);
    const $a = $el.find('.list_subject a').first();
    const href = $a.attr('href') ?? '';
    const sourceId = extractSourceId(href);
    if (!sourceId) continue;
    const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;

    const titleSpan =
      $el.find('.list_subject .subject_fixed').first().text().trim() ||
      $el.find('.list_subject').first().text().trim() ||
      $a.text().trim();
    const title = titleSpan;
    if (!title) continue;

    const price = extractPrice(title);
    const dateAttr =
      $el.find('.list_time .timestamp').first().attr('title') ||
      $el.find('.list_time').first().attr('title') ||
      $el.find('.list_time').first().text().trim();
    const parsed = dateAttr ? new Date(dateAttr) : null;
    const postedAt = parsed && !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();

    try {
      const result = await db.execute({
        sql: `INSERT OR IGNORE INTO listings
              (source, source_id, title, price, url, image_url, brand, model, location, posted_at, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: ['clien', sourceId, title, price, url, null, null, null, null, postedAt, null],
      });
      if (result.rowsAffected > 0) inserted++;
    } catch (err) {
      console.error(`[clien] 삽입 오류 (id=${sourceId}):`, err);
    }
  }

  return { itemCount: $items.length, inserted };
}

async function crawlClien() {
  console.log('[clien] 크롤링 시작...');
  let totalSeen = 0;
  let totalInserted = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    let res: PageResult;
    try {
      res = await crawlPage(page);
    } catch (err) {
      console.error(`[clien] page=${page} 오류:`, err);
      break;
    }

    if (res.itemCount === 0) {
      console.log(`[clien] page=${page}: 빈 응답, 종료`);
      break;
    }

    totalSeen += res.itemCount;
    totalInserted += res.inserted;
    console.log(`[clien] page=${page}: 수집 ${res.itemCount} / 신규 ${res.inserted}`);

    if (res.inserted === 0) {
      console.log('[clien] 신규 0건, 종료');
      break;
    }
    await sleep(DELAY_MS);
  }

  console.log(`[clien] 완료: 페이지 수집 ${totalSeen} / 신규 삽입 ${totalInserted}`);
  if (DEBUG) console.log('[clien] DEBUG mode');
}

crawlClien().catch((err) => {
  console.error('[clien] 치명적 오류:', err);
  process.exit(1);
});
