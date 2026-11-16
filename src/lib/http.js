import { Capacitor, CapacitorHttp } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

function b64ToBuf(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

// Native: explicit CapacitorHttp (no CORS). Web: /api/proxy.
export async function get(url, type = 'text') {
  if (isNative) {
    const res = await CapacitorHttp.request({
      url,
      method: 'GET',
      headers: { Accept: type === 'json' ? 'application/json' : '*/*' },
      responseType: type === 'buffer' ? 'arraybuffer' : type === 'json' ? 'json' : 'text',
      connectTimeout: 30000,
      readTimeout: 60000,
    });
    if (res.status < 200 || res.status >= 300) throw new Error(`Request failed (${res.status})`);
    if (type === 'buffer') return typeof res.data === 'string' ? b64ToBuf(res.data) : res.data;
    if (type === 'json') return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  }
  const r = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
  if (!r.ok) throw new Error(`Request failed (${r.status})`);
  if (type === 'json') return r.json();
  if (type === 'buffer') return r.arrayBuffer();
  return r.text();
}
