# 📷 Camera Aggregator

중고 카메라 매물을 번개장터, 중고나라, 당근마켓, 클리앙 장터에서 자동으로 수집하는 aggregator입니다.

## 기술 스택

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Database**: Turso (libSQL / SQLite edge DB)
- **Crawler**: GitHub Actions (scheduled) + Node.js fetch
- **Hosting**: Vercel

## 프로젝트 구조

```
camera-aggregator/
├── app/
│   ├── api/listings/route.ts   # 매물 목록 API
│   ├── page.tsx                # 메인 페이지
│   ├── layout.tsx
│   └── globals.css
├── components/
│   └── ListingCard.tsx         # 매물 카드 컴포넌트
├── lib/
│   └── db.ts                   # Turso DB 클라이언트
├── crawlers/
│   ├── bunjang.ts              # 번개장터 크롤러
│   ├── joongna.ts              # 중고나라 크롤러
│   ├── daangn.ts               # 당근마켓 크롤러
│   └── clien.ts                # 클리앙 장터 크롤러
└── .github/workflows/
    └── crawl.yml               # GitHub Actions 스케줄러
    ```

    ## 환경 변수

    ```env
    TURSO_DATABASE_URL=libsql://...
    TURSO_AUTH_TOKEN=eyJ...
    ```

    ## DB 스키마

    ```sql
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
                              UNIQUE(source, source_id)
                              );
                              ```

                              ## 크롤러 실행 주기

                              GitHub Actions로 매 1시간마다 자동 실행됩니다.

                              ## 로컬 개발

                              ```bash
                              npm install
                              npm run dev
                              ```

                              ## 라이선스

                              MIT