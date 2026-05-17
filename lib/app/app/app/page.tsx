import { db, Listing } from '@/lib/db';
import ListingCard from '@/components/ListingCard';

async function getListings(): Promise<Listing[]> {
  try {
      const result = await db.execute(
            'SELECT * FROM listings ORDER BY crawled_at DESC LIMIT 60'
                );
                    return result.rows as unknown as Listing[];
                      } catch {
                          return [];
                            }
                            }

                            export const revalidate = 300;

                            export default async function Home() {
                              const listings = await getListings();

                                return (
                                    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
                                          <header style={{ marginBottom: 32 }}>
                                                  <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
                                                            📷 중고 카메라 모아보기
                                                                    </h1>
                                                                            <p style={{ color: '#666' }}>
                                                                                      여러 중고 사이트의 카메라 매물을 한 곳에서 확인하세요
                                                                                              </p>
                                                                                                    </header>

                                                                                                          {listings.length === 0 ? (
                                                                                                                  <div style={{ textAlign: 'center', padding: '80px 0', color: '#999' }}>
                                                                                                                            <p style={{ fontSize: 48, marginBottom: 16 }}>📭</p>
                                                                                                                                      <p style={{ fontSize: 18 }}>아직 수집된 매물이 없습니다.</p>
                                                                                                                                                <p style={{ fontSize: 14, marginTop: 8 }}>크롤러를 실행하면 매물이 표시됩니다.</p>
                                                                                                                                                        </div>
                                                                                                                                                              ) : (
                                                                                                                                                                      <>
                                                                                                                                                                                <p style={{ marginBottom: 16, color: '#666', fontSize: 14 }}>
                                                                                                                                                                                            총 {listings.length}개 매물
                                                                                                                                                                                                      </p>
                                                                                                                                                                                                                <div style={{
                                                                                                                                                                                                                            display: 'grid',
                                                                                                                                                                                                                                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                                                                                                                                                                                                                                    gap: 16,
                                                                                                                                                                                                                                                              }}>
                                                                                                                                                                                                                                                                          {listings.map((listing) => (
                                                                                                                                                                                                                                                                                        <ListingCard key={listing.id} listing={listing} />
                                                                                                                                                                                                                                                                                                    ))}
                                                                                                                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                                                                                                                      </>
                                                                                                                                                                                                                                                                                                                            )}
                                                                                                                                                                                                                                                                                                                                </main>
                                                                                                                                                                                                                                                                                                                                  );
                                                                                                                                                                                                                                                                                                                                  }