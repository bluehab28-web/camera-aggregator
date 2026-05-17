import { createClient } from '@libsql/client';

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export interface Listing {
  id: number;
  source: string;
  source_id: string;
  title: string;
  price: number | null;
  url: string;
  image_url: string | null;
  brand: string | null;
  model: string | null;
  location: string | null;
  posted_at: string | null;
  crawled_at: string;
  status: string | null;
}
