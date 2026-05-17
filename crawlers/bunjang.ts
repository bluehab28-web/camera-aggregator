import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    interface BunjangItem {
      pid: string;
        name: string;
          int_price: number;
            product_image: string;
              update_time: number;
                location: string;
                }

                interface BunjangResponse {
                  list: BunjangItem[];
                  }

                  function extractBrandModel(title: string): { brand: string | null; model: string | null } {
                    const words = title.trim().split(/\s+/);
                      return {
                          brand: words[0] ?? null,
                              model: words[1] ?? null,
                                };
                                }

                                async function crawlBunjang() {
                                  console.log('[bunjang] 크롤링 시작...');

                                    const url =
                                        'https://api.bunjang.co.kr/api/1/find_v2.json?q=%EC%B9%B4%EB%A9%94%EB%9D%BC&order=date&n=100&page=0';

                                          const res = await fetch(url, {
                                              headers: {
                                                    'User-Agent': 'Mozilla/5.0',
                                                          Accept: 'application/json',
                                                              },
                                                                });

                                                                  if (!res.ok) {
                                                                      console.error(`[bunjang] HTTP 오류: ${res.status}`);
                                                                          process.exit(1);
                                                                            }

                                                                              const data: BunjangResponse = await res.json();
                                                                                const items = data.list ?? [];
                                                                                  console.log(`[bunjang] 수집된 매물 수: ${items.length}`);

                                                                                    let insertedCount = 0;

                                                                                      for (const item of items) {
                                                                                          const { brand, model } = extractBrandModel(item.name);
                                                                                              const postedAt = new Date(item.update_time * 1000).toISOString();
                                                                                                  const imageUrl = item.product_image
                                                                                                        ? `https://media.bunjang.co.kr/images/${item.product_image}`
                                                                                                              : null;

                                                                                                                  try {
                                                                                                                        const result = await db.execute({
                                                                                                                                sql: `INSERT OR IGNORE INTO listings
                                                                                                                                              (source, source_id, title, price, url, image_url, brand, model, location, posted_at)
                                                                                                                                                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                                                                                                                                                    args: [
                                                                                                                                                                              'bunjang',
                                                                                                                                                                                        item.pid,
                                                                                                                                                                                                  item.name,
                                                                                                                                                                                                            item.int_price,
                                                                                                                                                                                                                      `https://m.bunjang.co.kr/products/${item.pid}`,
                                                                                                                                                                                                                                imageUrl,
                                                                                                                                                                                                                                          brand,
                                                                                                                                                                                                                                                    model,
                                                                                                                                                                                                                                                              item.location ?? null,
                                                                                                                                                                                                                                                                        postedAt,
                                                                                                                                                                                                                                                                                ],
                                                                                                                                                                                                                                                                                      });
                                                                                                                                                                                                                                                                                            if (result.rowsAffected > 0) insertedCount++;
                                                                                                                                                                                                                                                                                                } catch (err) {
                                                                                                                                                                                                                                                                                                      console.error(`[bunjang] 삽입 오류 (pid=${item.pid}):`, err);
                                                                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                                                                            }

                                                                                                                                                                                                                                                                                                              console.log(`[bunjang] 새로 삽입된 매물: ${insertedCount}건`);
                                                                                                                                                                                                                                                                                                              }

                                                                                                                                                                                                                                                                                                              crawlBunjang().catch((err) => {
                                                                                                                                                                                                                                                                                                                console.error('[bunjang] 치명적 오류:', err);
                                                                                                                                                                                                                                                                                                                  process.exit(1);
                                                                                                                                                                                                                                                                                                                  });