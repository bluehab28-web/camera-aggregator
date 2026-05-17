import { createClient } from '@libsql/client';
import * as cheerio from 'cheerio';
import { fetchUtf8 } from './_utils';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const DEBUG = process.argv.includes('--debug');
const BASE_URL = 'https://www.daangn.com';

function extractPrice(text: string): number | null {
  const m = text.replace(/,/g, '').match(/([0-9]+)\s*원/);
  return m ? parseInt(m[1], 10) : null;
}

function extractSourceId(href: string): string | null {
  const m = href.match(/-([a-z0-9]{8,})\/?$/);
  return m ? m[1] : null;
}

async function crawlDaangn() {
  console.log('[daangn] 크롤링 시작...');

  const url = `${BASE_URL}/kr/buy-sell/?search=%EC%B9%B4%EB%A9%94%EB%9D%BC&sort=published_at_desc`;

  const res = await fetchUtf8(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
    redirect: 'follow',
  });

  console.log(`[daangn] HTTP ${res.status}`);
  if (!res.ok) {
    console.error(`[daangn] HTTP 오류: ${res.status} - 검색 페이지 접근 불가`);
    process.exit(1);
  }

  const html = res.text;
  console.log(`[daangn] HTML 길이: ${html.length}`);
  const $ = cheerio.load(html, { scriptingEnabled: false });

  const $cards = $('a[data-gtm="search_article"]');
  console.log(`[daangn] search_article 카드 수: ${$cards.length}`);

  if ($cards.length === 0) {
    console.warn('[daangn] 셀렉터 불일치 - 수집 0건');
    if (DEBUG) console.log(html.substring(0, 2000));
    process.exit(0);
  }

  let insertedCount = 0;
  let skipped = 0;

  for (const el of $cards.toArray()) {
    const $a = $(el);
    const href = $a.attr('href') ?? '';
    const sourceId = extractSourceId(href);
    if (!sourceId) {
      skipped++;
      continue;
    }
    const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

    const $img = $a.find('noscript img').first().length
      ? $a.find('noscript img').first()
      : $a.find('img').first();
    const thumb = $img.attr('src') ?? null;

    const spans = $a
      .find('span')
      .map((_, s) => $(s).text().trim())
      .get()
      .filter((t) => t.length > 0);

    let title = '';
    let priceText = '';
    for (const s of spans) {
      if (!priceText && /[\d,]+\s*원/.test(s)) {
        priceText = s;
        continue;
      }
      if (!title && !/[\d,]+\s*원/.test(s) && s.length > 1) {
        title = s;
      }
      if (title && priceText) break;
    }
    if (!title) {
      skipped++;
      continue;
    }
    const price = priceText ? extractPrice(priceText) : null;

    const datetime = $a.find('time').first().attr('datetime') ?? '';
    const parsed = datetime ? new Date(datetime) : null;
    const postedAt = parsed && !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();

    const otherSpans = spans.filter((s) => s !== title && !/[\d,]+\s*원/.test(s) && s.length < 20);
    const location = otherSpans.length > 0 ? otherSpans[0] : null;

    try {
      const result = await db.execute({
        sql: `INSERT OR IGNORE INTO listings
              (source, source_id, title, price, url, image_url, brand, model, location, posted_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: ['daangn', sourceId, title, price, fullUrl, thumb, null, null, location, postedAt],
      });
      if (result.rowsAffected > 0) insertedCount++;
    } catch (err) {
      console.error(`[daangn] 삽입 오류 (id=${sourceId}):`, err);
    }
  }

  console.log(`[daangn] 새로 삽입된 매물: ${insertedCount}건 (skipped: ${skipped})`);
}

crawlDaangn().catch((err) => {
  console.error('[daangn] 치명적 오류:', err);
  process.exit(1);
});
