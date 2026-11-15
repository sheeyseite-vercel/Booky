import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

// Native app: CapacitorHttp patches fetch (no CORS). Web: go through /api/proxy.
export async function get(url, type = 'text') {
  const u = isNative ? url : `/api/proxy?url=${encodeURIComponent(url)}`;
  const r = await fetch(u);
  if (!r.ok) throw new Error(`Request failed (${r.status})`);
  if (type === 'json') return r.json();
  if (type === 'buffer') return r.arrayBuffer();
  return r.text();
}
