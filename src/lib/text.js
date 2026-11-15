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
  if (ext === 'pdf') throw new Error('PDF import is not supported yet — use EPUB, TXT or HTML');
  const t = await file.text();
  if (['html', 'htm', 'xhtml'].includes(ext)) return { title: base, author: 'Imported', text: htmlToText(t) };
  return { title: base, author: 'Imported', text: t };
}
