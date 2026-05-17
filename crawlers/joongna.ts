import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    const DEBUG = process.argv.includes('--debug');

    interface JoongnaItem {
      sno: number;
        title: string;
          price: number;
            thumbnailUrl: string;
              regionName: string;
                regDt: string;
                }

                interface JoongnaResponse {
                  data: {
                      items: JoongnaItem[];
                        };
                        }

                        async function crawlJoongna() {
                          console.log('[joongna] 크롤링 시작...');

                            const url =
                                'https://api.joongna.com/v1/search/articles?keyword=%EC%B9%B4%EB%A9%94%EB%9D%BC&sort=RECENT&limit=100&page=1';

                                  const res = await fetch(url, {
                                      headers: {
                                            'User-Agent': 'Mozilla/5.0',
                                                  Accept: 'application/json',
                                                      },
                                                        });

                                                          if (!res.ok) {
                                                              console.error(`[joongna] HTTP 오류: ${res.status}`);
                                                                  process.exit(1);
                                                                    }

                                                                      const data: JoongnaResponse = await res.json();
                                                                        const items = data?.data?.items ?? [];

                                                                          if (DEBUG && items.length > 0) {
                                                                              console.log('[joongna] 첫 번째 아이템 구조:', JSON.stringify(items[0], null, 2));
                                                                                }

                                                                                  console.log(`[joongna] 수집된 매물 수: ${items.length}`);

                                                                                    let insertedCount = 0;

                                                                                      for (const item of items) {
                                                                                          const postedAt = item.regDt
                                                                                                ? new Date(item.regDt).toISOString()
                                                                                                      : new Date().toISOString();

                                                                                                          try {
                                                                                                                const result = await db.execute({
                                                                                                                        sql: `INSERT OR IGNORE INTO listings
                                                                                                                                      (source, source_id, title, price, url, image_url, brand, model, location, posted_at)
                                                                                                                                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                                                                                                                                            args: [
                                                                                                                                                                      'joongna',
                                                                                                                                                                                String(item.sno),
                                                                                                                                                                                          item.title,
                                                                                                                                                                                                    item.price,
                                                                                                                                                                                                              `https://web.joongna.com/product/${item.sno}`,
                                                                                                                                                                                                                        item.thumbnailUrl ?? null,
                                                                                                                                                                                                                                  null,
                                                                                                                                                                                                                                            null,
                                                                                                                                                                                                                                                      item.regionName ?? null,
                                                                                                                                                                                                                                                                postedAt,
                                                                                                                                                                                                                                                                        ],
                                                                                                                                                                                                                                                                              });
                                                                                                                                                                                                                                                                                    if (result.rowsAffected > 0) insertedCount++;
                                                                                                                                                                                                                                                                                        } catch (err) {
                                                                                                                                                                                                                                                                                              console.error(`[joongna] 삽입 오류 (sno=${item.sno}):`, err);
                                                                                                                                                                                                                                                                                                  }
                                                                                                                                                                                                                                                                                                    }

                                                                                                                                                                                                                                                                                                      console.log(`[joongna] 새로 삽입된 매물: ${insertedCount}건`);
                                                                                                                                                                                                                                                                                                      }

                                                                                                                                                                                                                                                                                                      crawlJoongna().catch((err) => {
                                                                                                                                                                                                                                                                                                        console.error('[joongna] 치명적 오류:', err);
                                                                                                                                                                                                                                                                                                          process.exit(1);
                                                                                                                                                                                                                                                                                                          });