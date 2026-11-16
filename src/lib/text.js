import JSZip from 'jszip';

export function htmlToText(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,nav').forEach((n) => n.remove());
  const blocks = [...doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote')]
    .map((n) => n.textContent.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (blocks.length > 3) return blocks.join('\n\n');
  return (doc.body.textContent || '').replace(/\r/g, '').trim();
}

// Plain text (Gutenberg, Internet Archive OCR, .txt) -> clean paragraphs
export function toParagraphs(raw) {
  let t = raw.replace(/\r\n?/g, '\n');
  const start = t.search(/\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG[^\n]*\n/i);
  if (start >= 0) t = t.slice(t.indexOf('\n', start) + 1);
  const end = t.search(/\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG/i);
  if (end >= 0) t = t.slice(0, end);
  return t
    .split(/\n\s*\n/)
    .map((p) => p.replace(/-\n(?=[a-z])/g, '').replace(/\s*\n\s*/g, ' ').replace(/[ \t]+/g, ' ').trim())
    .filter((p) => p.length > 0);
}

// Group paragraphs into pages of roughly `limit` characters
export function paginate(paras, limit = 1900) {
  const pages = [];
  let cur = [];
  let len = 0;
  for (const p of paras) {
    if (cur.length && len + p.length > limit) {
      pages.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(p);
    len += p.length;
  }
  if (cur.length) pages.push(cur);
  return pages;
}

export async function parseEpub(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const read = async (p) => {
    const f = zip.file(decodeURIComponent(p));
    return f ? f.async('string') : '';
  };
  const container = await read('META-INF/container.xml');
  const opfPath = /full-path="([^"]+)"/.exec(container)?.[1];
  if (!opfPath) throw new Error('Not a valid EPUB file');
  const opf = new DOMParser().parseFromString(await read(opfPath), 'application/xml');
  const base = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
  const manifest = {};
  opf.querySelectorAll('manifest > item').forEach((i) => (manifest[i.getAttribute('id')] = i.getAttribute('href')));
  const spine = [...opf.querySelectorAll('spine > itemref')].map((i) => manifest[i.getAttribute('idref')]).filter(Boolean);
  const meta = (tag) => opf.getElementsByTagNameNS('*', tag)[0]?.textContent?.trim();
  const parts = [];
  for (const href of spine) {
    const html = await read(base + href);
    if (html) parts.push(htmlToText(html));
  }
  return { title: meta('title') || 'Untitled', author: meta('creator') || 'Unknown', text: parts.filter(Boolean).join('\n\n') };
}

export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const base = file.name.replace(/\.[^.]+$/, '');
  if (ext === 'epub') return parseEpub(await file.arrayBuffer());
  if (ext === 'pdf') return parsePdf(await file.arrayBuffer(), base);
  const t = await file.text();
  if (['html', 'htm', 'xhtml'].includes(ext)) return { title: base, author: 'Imported', text: htmlToText(t) };
  return { title: base, author: 'Imported', text: t };
}

export async function parsePdf(buf, base) {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const parts = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const c = await page.getTextContent();
    let line = '', out = '', px = null, py = null, pend = 0;
    for (const it of c.items) {
      if (!it.str && !it.hasEOL) continue;
      const x = it.transform[4], y = it.transform[5], h = Math.abs(it.transform[3]) || 10;
      if (py !== null && Math.abs(y - py) > h * 0.6) { out += line + '\n'; line = ''; px = null; }
      else if (px !== null) {
        const gap = Math.min(Math.abs(x - pend), Math.abs(x + it.width - px));
        if (gap > h * 0.18 && !/\s$/.test(line) && !/^\s/.test(it.str)) line += ' ';
      }
      line += it.str;
      px = x; pend = x + it.width; py = y;
      if (it.hasEOL) { out += line + '\n'; line = ''; px = null; py = null; }
    }
    parts.push(out + line);
  }
  const text = parts.join('\n\n').normalize('NFKC').replace(/-\n(?=[a-z])/g, '').replace(/([^\n.!?:"”])\n(?=[^\n])/g, '$1 ');
  if (text.trim().length < 50) throw new Error('This PDF is a scan (images only) — no text to read');
  return { title: base, author: 'Imported', text };
}
