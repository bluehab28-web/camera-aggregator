import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
    const brand = searchParams.get('brand');
      const source = searchParams.get('source');
        const limit = Math.min(Number(searchParams.get('limit') ?? 60), 200);

          let query = 'SELECT * FROM listings WHERE 1=1';
            const args: string[] = [];

              if (brand) { query += ' AND brand = ?'; args.push(brand); }
                if (source) { query += ' AND source = ?'; args.push(source); }
                  query += ' ORDER BY crawled_at DESC LIMIT ?';
                    args.push(String(limit));

                      const result = await db.execute({ sql: query, args });
                        return NextResponse.json({ listings: result.rows, total: result.rows.length });
                        }