import { createClient } from '@libsql/client';
import * as cheerio from 'cheerio';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const DEBUG = process.argv.includes('--debug');
const BASE_URL = 'https://www.clien.net';

function extractPrice(text: string): number | null {
  const m = text.replace(/,/g, '').match(/([0-9]+)\s*원/);
  return m ? parseInt(m[1], 10) : null;
}

function extractSourceId(href: string): string | null {
  const m = href.match(/\/service\/board\/[a-z]+\/(\d+)/);
  return m ? m[1] : null;
}

async function crawlClien() {
  console.log('[clien] 크롤링 시작...');

  const searchUrl = `${BASE_URL}/service/search?q=%EC%B9%B4%EB%A9%94%EB%9D%BC&sort=recency&boardCd=sold&isBoard=true`;

  const res = await fetch(searchUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
    redirect: 'follow',
  });

  console.log(`[clien] HTTP ${res.status}`);
  if (!res.ok) {
    console.error(`[clien] HTTP 오류: ${res.status}`);
    process.exit(1);
  }

  const html = await res.text();
  console.log(`[clien] HTML 길이: ${html.length}`);
  const $ = cheerio.load(html);

  const $items = $('.list_item.symph_row');
  console.log(`[clien] list_item.symph_row 후보: ${$items.length}`);

  if ($items.length === 0) {
    console.warn('[clien] 셀렉터 불일치 - 수집 0건');
    if (DEBUG) console.log(html.substring(0, 2000));
    process.exit(0);
  }

  let insertedCount = 0;
  let skipped = 0;

  for (const el of $items.toArray()) {
    const $el = $(el);

    const $a = $el.find('.list_subject a').first();
    const href = $a.attr('href') ?? '';
    const sourceId = extractSourceId(href);
    if (!sourceId) {
      skipped++;
      continue;
    }
    const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;

    const title =
      $el.find('.list_subject .subject_fixed').first().text().trim() ||
      $el.find('.list_subject').first().text().trim() ||
      $a.text().trim();
    if (!title) {
      skipped++;
      continue;
    }

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
              (source, source_id, title, price, url, image_url, brand, model, location, posted_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: ['clien', sourceId, title, price, url, null, null, null, null, postedAt],
      });
      if (result.rowsAffected > 0) insertedCount++;
    } catch (err) {
      console.error(`[clien] 삽입 오류 (id=${sourceId}):`, err);
    }
  }

  console.log(`[clien] 새로 삽입된 매물: ${insertedCount}건 (skipped: ${skipped})`);
}

crawlClien().catch((err) => {
  console.error('[clien] 치명적 오류:', err);
  process.exit(1);
});
