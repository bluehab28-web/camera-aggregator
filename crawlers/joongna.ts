import { createClient } from '@libsql/client';
import * as cheerio from 'cheerio';
import { fetchUtf8 } from './_utils';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const DEBUG = process.argv.includes('--debug');
const BASE_URL = 'https://web.joongna.com';

function parseRelativeTime(text: string): string {
  const m = text.match(/(-?\d+)\s*(초|분|시간|일)\s*전/);
  if (!m) return new Date().toISOString();
  const n = Math.abs(parseInt(m[1], 10));
  const unit = m[2];
  const ms =
    unit === '초'
      ? n * 1000
      : unit === '분'
        ? n * 60_000
        : unit === '시간'
          ? n * 3_600_000
          : n * 86_400_000;
  return new Date(Date.now() - ms).toISOString();
}

async function crawlJoongna() {
  console.log('[joongna] 크롤링 시작...');

  const url = `${BASE_URL}/search/%EC%B9%B4%EB%A9%94%EB%9D%BC?sort=RECENT_SORT`;

  const res = await fetchUtf8(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
    redirect: 'follow',
  });

  console.log(`[joongna] HTTP ${res.status}`);
  if (!res.ok) {
    console.error(`[joongna] HTTP 오류: ${res.status}`);
    process.exit(1);
  }

  const html = res.text;
  console.log(`[joongna] HTML 길이: ${html.length}`);
  const $ = cheerio.load(html);

  const $cards = $('a[href^="/product/"]').filter((_, el) => /\/product\/\d+/.test($(el).attr('href') ?? ''));
  console.log(`[joongna] product 카드 수: ${$cards.length}`);

  if ($cards.length === 0) {
    console.warn('[joongna] 셀렉터 불일치 - 수집 0건');
    if (DEBUG) console.log(html.substring(0, 2000));
    process.exit(0);
  }

  let insertedCount = 0;
  let skipped = 0;

  for (const el of $cards.toArray()) {
    const $a = $(el);
    const href = $a.attr('href') ?? '';
    const idMatch = href.match(/\/product\/(\d+)/);
    if (!idMatch) {
      skipped++;
      continue;
    }
    const sno = idMatch[1];

    const $img = $a.find('img').first();
    const alt = ($img.attr('alt') ?? '').trim();
    const title = alt.replace(/\s*이미지$/, '').trim();
    if (!title) {
      skipped++;
      continue;
    }

    const thumb = $img.attr('src') ?? null;

    const cardText = $a.text();
    const priceMatch = cardText.match(/([\d,]+)\s*원/);
    const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : null;

    const timeMatch = cardText.match(/-?\d+\s*(초|분|시간|일)\s*전/);
    const postedAt = timeMatch ? parseRelativeTime(timeMatch[0]) : new Date().toISOString();

    try {
      const result = await db.execute({
        sql: `INSERT OR IGNORE INTO listings
              (source, source_id, title, price, url, image_url, brand, model, location, posted_at, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          'joongna',
          sno,
          title,
          price,
          `${BASE_URL}/product/${sno}`,
          thumb,
          null,
          null,
          null,
          postedAt,
          null,
        ],
      });
      if (result.rowsAffected > 0) insertedCount++;
    } catch (err) {
      console.error(`[joongna] 삽입 오류 (sno=${sno}):`, err);
    }
  }

  console.log(`[joongna] 새로 삽입된 매물: ${insertedCount}건 (skipped: ${skipped})`);
}

crawlJoongna().catch((err) => {
  console.error('[joongna] 치명적 오류:', err);
  process.exit(1);
});
