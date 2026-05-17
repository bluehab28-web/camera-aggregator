export async function fetchUtf8(url: string, init?: RequestInit): Promise<{ status: number; ok: boolean; text: string }> {
  const res = await fetch(url, init);
  const buf = await res.arrayBuffer();
  const text = new TextDecoder('utf-8').decode(buf);
  return { status: res.status, ok: res.ok, text };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
