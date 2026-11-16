// Tiny allow-listed proxy so the web version (Vercel) can read book sources
// that do not send CORS headers. The Android app talks to the sources directly.
const ALLOW = [/^gutendex\.com$/, /(^|\.)gutenberg\.org$/, /(^|\.)archive\.org$/, /(^|\.)openlibrary\.org$/, /(^|\.)wikisource\.org$/];
const ok = (u) => u.protocol === 'https:' && ALLOW.some((r) => r.test(u.hostname));

export default async function handler(req, res) {
  try {
    const target = new URL(req.url, 'http://x').searchParams.get('url');
    const u = new URL(target);
    if (!ok(u)) { res.statusCode = 403; return res.end('blocked host'); }
    const r = await fetch(u, { redirect: 'follow', headers: { 'user-agent': 'BookyReader/1.0' } });
    if (!ok(new URL(r.url))) { res.statusCode = 403; return res.end('blocked redirect'); }
    const buf = Buffer.from(await r.arrayBuffer());
    res.statusCode = r.status;
    res.setHeader('content-type', r.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('cache-control', 'public, s-maxage=86400, max-age=3600');
    res.end(buf);
  } catch (e) {
    res.statusCode = 502;
    res.end(String((e && e.message) || e));
  }
}
