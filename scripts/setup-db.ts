import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function setup() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('[setup] TURSO_DATABASE_URL / TURSO_AUTH_TOKEN 환경변수가 비어 있습니다.');
    process.exit(1);
  }

  console.log('[setup] DB 연결 확인 중...');
  const ping = await db.execute('SELECT 1 AS ok');
  console.log('[setup] 연결 OK:', ping.rows[0]);

  console.log('[setup] listings 테이블 생성 중...');
  await db.execute(`
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      title TEXT NOT NULL,
      price INTEGER,
      url TEXT NOT NULL,
      image_url TEXT,
      brand TEXT,
      model TEXT,
      location TEXT,
      posted_at TEXT,
      crawled_at TEXT DEFAULT (datetime('now')),
      status TEXT,
      UNIQUE(source, source_id)
    )
  `);

  try {
    await db.execute(`ALTER TABLE listings ADD COLUMN status TEXT`);
    console.log('[setup] status 컬럼 추가됨');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('duplicate column')) {
      console.log('[setup] status 컬럼 이미 존재함');
    } else {
      throw err;
    }
  }

  console.log('[setup] 인덱스 생성 중...');
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_listings_source ON listings(source)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_listings_posted_at ON listings(posted_at DESC)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status)`);

  const count = await db.execute('SELECT COUNT(*) AS n FROM listings');
  console.log(`[setup] 완료. 현재 listings 행 수: ${count.rows[0].n}`);
}

setup().catch((err) => {
  console.error('[setup] 실패:', err);
  process.exit(1);
});
