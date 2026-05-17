import { createClient } from '@libsql/client';
import { XMLParser } from 'fast-xml-parser';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    function extractPrice(text: string): number | null {
      const match = text.replace(/,/g, '').match(/([0-9]+)\s*\uC6D0/);
        return match ? parseInt(match[1], 10) : null;
        }

        function extractSourceId(url: string): string {
          const match = url.match(/\/([0-9]+)(?:\/|\?|$)/);
            return match ? match[1] : url;
            }

            async function crawlDaangn() {
              console.log('[daangn] \uD06C\uB864\uB9C1 \uC2DC\uC791...');

                const rssUrl = 'https://www.daangn.com/search/\uCE74\uBA54\uB77C/feed.rss';

                  let xmlText: string;
                    try {
                        const res = await fetch(rssUrl, {
                              headers: { 'User-Agent': 'Mozilla/5.0' },
                                  });
                                      if (!res.ok) {
                                            console.error(`[daangn] HTTP \uC624\uB958: ${res.status} - RSS \uD53C\uB4DC\uAC00 \uCC28\uB2E8\uB418\uC5C8\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`);
                                                  process.exit(0);
                                                      }
                                                          xmlText = await res.text();
                                                            } catch (err) {
                                                                console.error('[daangn] \uD328\uCE58 \uC2E4\uD328 - RSS \uC5D4\uB4DC\uD3EC\uC778\uD2B8\uAC00 \uBE44\uD65C\uC131\uC774\uAC70\uB098 \uCC28\uB2E8\uB428:', err);
                                                                    process.exit(0);
                                                                      }

                                                                        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
                                                                          const parsed = parser.parse(xmlText);
                                                                            const items = parsed?.rss?.channel?.item ?? [];
                                                                              const itemArray = Array.isArray(items) ? items : [items];

                                                                                console.log(`[daangn] \uC218\uC9D1\uB41C \uB9E4\uBB3C \uC218: ${itemArray.length}`);

                                                                                  let insertedCount = 0;

                                                                                    for (const item of itemArray) {
                                                                                        const url = item.link ?? '';
                                                                                            const sourceId = extractSourceId(url);
                                                                                                const title = item.title ?? '';
                                                                                                    const description = item.description ?? '';
                                                                                                        const price = extractPrice(title) ?? extractPrice(description);
                                                                                                            const imageUrl = item['enclosure']?.['@_url'] ?? null;
                                                                                                                const postedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();

                                                                                                                    try {
                                                                                                                          const result = await db.execute({
                                                                                                                                  sql: `INSERT OR IGNORE INTO listings
                                                                                                                                                (source, source_id, title, price, url, image_url, brand, model, location, posted_at)
                                                                                                                                                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                                                                                                                                                      args: ['daangn', sourceId, title, price, url, imageUrl, null, null, null, postedAt],
                                                                                                                                                                            });
                                                                                                                                                                                  if (result.rowsAffected > 0) insertedCount++;
                                                                                                                                                                                      } catch (err) {
                                                                                                                                                                                            console.error(`[daangn] \uC0BD\uC785 \uC624\uB958 (id=${sourceId}):`, err);
                                                                                                                                                                                                }
                                                                                                                                                                                                  }

                                                                                                                                                                                                    console.log(`[daangn] \uC0C8\uB85C \uC0BD\uC785\uB41C \uB9E4\uBB3C: ${insertedCount}\uAC74`);
                                                                                                                                                                                                    }

                                                                                                                                                                                                    crawlDaangn().catch((err) => {
                                                                                                                                                                                                      console.error('[daangn] \uCE58\uBA85\uC801 \uC624\uB958:', err);
                                                                                                                                                                                                        process.exit(1);
                                                                                                                                                                                                        });