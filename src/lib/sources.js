import { get } from './http';
import { htmlToText } from './text';

const flip = (n = 'Unknown') => n.replace(/^(.+?), (.+)$/, '$2 $1');

function fromGutenberg(b) {
  const f = b.formats || {};
  const txt = f['text/plain; charset=utf-8'] || f['text/plain; charset=us-ascii'] || f['text/plain'];
  const html = f['text/html'] || f['text/html; charset=utf-8'];
  return {
    id: 'g' + b.id,
    source: 'Gutenberg',
    title: b.title,
    author: flip(b.authors?.[0]?.name),
    cover: f['image/jpeg'] || null,
    lang: b.languages?.[0],
    downloads: b.download_count,
    subjects: (b.subjects || []).slice(0, 6),
    readUrl: txt || html || null,
    readKind: txt ? 'text' : 'html',
    epubUrl: f['application/epub+zip'] || null,
    webUrl: `https://www.gutenberg.org/ebooks/${b.id}`,
  };
}

export async function gutenberg(q) {
  const url = q ? `https://gutendex.com/books/?search=${encodeURIComponent(q)}` : 'https://gutendex.com/books/?sort=popular';
  const d = await get(url, 'json');
  return d.results.slice(0, 20).map(fromGutenberg);
}

export async function openLibrary(q) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=15&fields=key,title,author_name,cover_i,first_publish_year,ia,public_scan_b,number_of_pages_median,language`;
  const d = await get(url, 'json');
  return d.docs.map((b) => {
    const ia = (b.ia || [])[0];
    const free = b.public_scan_b && ia;
    return {
      id: 'o' + b.key.replace('/works/', ''),
      source: 'Open Library',
      title: b.title,
      author: (b.author_name || ['Unknown'])[0],
      cover: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
      year: b.first_publish_year,
      pages: b.number_of_pages_median,
      lang: (b.language || [])[0],
      readUrl: free ? `https://archive.org/download/${ia}/${ia}_djvu.txt` : null,
      readKind: 'text',
      webUrl: 'https://openlibrary.org' + b.key,
    };
  });
}

export async function archive(q) {
  const query = `(${q}) AND mediatype:texts AND access-restricted-item:false`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=creator&fl%5B%5D=year&rows=15&output=json&sort%5B%5D=downloads+desc`;
  const d = await get(url, 'json');
  return (d.response?.docs || []).map((b) => ({
    id: 'a' + b.identifier,
    source: 'Internet Archive',
    title: Array.isArray(b.title) ? b.title[0] : b.title,
    author: Array.isArray(b.creator) ? b.creator[0] : b.creator || 'Unknown',
    cover: `https://archive.org/services/img/${b.identifier}`,
    year: b.year,
    readUrl: `https://archive.org/download/${b.identifier}/${b.identifier}_djvu.txt`,
    readKind: 'text',
    webUrl: `https://archive.org/details/${b.identifier}`,
  }));
}

export const SOURCES = ['Gutenberg', 'Open Library', 'Internet Archive'];

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

// Calls onPartial(list) every time a source answers, so results show up fast.
export async function search(q, source = 'All', onPartial = () => {}) {
  const jobs = { Gutenberg: gutenberg, 'Open Library': openLibrary, 'Internet Archive': archive };
  const names = source === 'All' ? SOURCES : [source];
  const lists = names.map(() => []);
  const merge = () => {
    const out = [];
    for (let i = 0; out.length < 40 && lists.some((l) => i < l.length); i++) lists.forEach((l) => l[i] && out.push(l[i]));
    return out;
  };
  let fails = 0;
  await Promise.all(names.map((n, k) => withTimeout(jobs[n](q), 12000).then(
    (r) => { lists[k] = r; onPartial(merge()); },
    () => { fails++; },
  )));
  if (fails === names.length) throw new Error('Could not reach the book sources — check your connection');
  return merge();
}

export async function fetchRaw(book) {
  if (!book.readUrl) throw new Error('This book is not available for free reading here');
  const raw = await get(book.readUrl);
  return book.readKind === 'html' ? htmlToText(raw) : raw;
}
