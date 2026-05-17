import { createClient } from '@libsql/client';
import { parse } from 'node-html-parser';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    const DEBUG = process.argv.includes('--debug');
    const BASE_URL = 'https://www.clien.net';

    function extractPrice(text: string): number | null {
      const match = text.replace(/,/g, '').match(/([0-9]+)\s*\uC6D0/);
        return match ? parseInt(match[1], 10) : null;
        }

        function extractSourceId(url: string): string {
          const match = url.match(/\/([0-9]+)(?:\?|$)/);
            return match ? match[1] : url;
            }

            async function crawlClien() {
              console.log('[clien] \uD06C\uB864\uB9C1 \uC2DC\uC791...');

                const searchUrl = `${BASE_URL}/service/search?q=\uCE74\uBA54\uB77C&sort=recency&boardCd=sold&isBoard=true`;

                  const res = await fetch(searchUrl, {
                      headers: {
                            'User-Agent':
                                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                          Accept: 'text/html',
                                              },
                                                });

                                                  if (!res.ok) {
                                                      console.error(`[clien] HTTP \uC624\uB958: ${res.status}`);
                                                          process.exit(1);
                                                            }

                                                              const html = await res.text();
                                                                const root = parse(html);

                                                                  const listItems = root.querySelectorAll('.list_item');

                                                                    if (listItems.length === 0) {
                                                                        console.warn(
                                                                              '[clien] \uC140\uB809\uD130 \uBD88\uC77C\uCE58 - HTML \uAD6C\uC870 \uD655\uC778 \uD544\uC694. \uC218\uC9D1 0\uAC74.'
                                                                                  );
                                                                                      if (DEBUG) {
                                                                                            console.log('[clien] Raw HTML (\uCC98\uC74C 2000\uC790):', html.substring(0, 2000));
                                                                                                }
                                                                                                    process.exit(0);
                                                                                                      }

                                                                                                        if (DEBUG) {
                                                                                                            console.log('[clien] \uCC3B \uBC88\uC9F8 item raw HTML:', listItems[0]?.toString().substring(0, 500));
                                                                                                              }

                                                                                                                console.log(`[clien] \uC218\uC9D1\uB41C \uB9E4\uBB3C \uC218: ${listItems.length}`);

                                                                                                                  let insertedCount = 0;

                                                                                                                    for (const item of listItems) {
                                                                                                                        const anchor = item.querySelector('a');
                                                                                                                            const href = anchor?.getAttribute('href') ?? '';
                                                                                                                                const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;
                                                                                                                                    const sourceId = extractSourceId(href);

                                                                                                                                        const titleEl =
                                                                                                                                              item.querySelector('.list_subject') ??
                                                                                                                                                    item.querySelector('.subject_fixed') ??
                                                                                                                                                          item.querySelector('.title');
                                                                                                                                                              const title = titleEl?.text?.trim() ?? anchor?.text?.trim() ?? '';

                                                                                                                                                                  if (!title) continue;

                                                                                                                                                                      const price = extractPrice(title);

                                                                                                                                                                          const timeEl = item.querySelector('.list_time') ?? item.querySelector('time');
                                                                                                                                                                              const dateStr =
                                                                                                                                                                                    timeEl?.getAttribute('datetime') ?? timeEl?.text?.trim() ?? '';
                                                                                                                                                                                        const postedAt = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();

                                                                                                                                                                                            try {
                                                                                                                                                                                                  const result = await db.execute({
                                                                                                                                                                                                          sql: `INSERT OR IGNORE INTO listings
                                                                                                                                                                                                                        (source, source_id, title, price, url, image_url, brand, model, location, posted_at)
                                                                                                                                                                                                                                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                                                                                                                                                                                                                              args: ['clien', sourceId, title, price, url, null, null, null, null, postedAt],
                                                                                                                                                                                                                                                    });
                                                                                                                                                                                                                                                          if (result.rowsAffected > 0) insertedCount++;
                                                                                                                                                                                                                                                              } catch (err) {
                                                                                                                                                                                                                                                                    console.error(`[clien] \uC0BD\uC785 \uC624\uB958 (id=${sourceId}):`, err);
                                                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                                                          }

                                                                                                                                                                                                                                                                            console.log(`[clien] \uC0C8\uB85C \uC0BD\uC785\uB41C \uB9E4\uBB3C: ${insertedCount}\uAC74`);
                                                                                                                                                                                                                                                                            }

                                                                                                                                                                                                                                                                            crawlClien().catch((err) => {
                                                                                                                                                                                                                                                                              console.error('[clien] \uCE58\uBA85\uC801 \uC624\uB958:', err);
                                                                                                                                                                                                                                                                                process.exit(1);
                                                                                                                                                                                                                                                                                });