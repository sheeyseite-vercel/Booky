import { useCallback, useEffect, useState } from 'react';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { fetchRaw } from './sources';
import { toParagraphs } from './text';

const KEY = 'booky:library';

export function useLibrary() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    idbGet(KEY).then((v) => { setItems(v || []); setReady(true); });
  }, []);

  const persist = useCallback((next) => { setItems(next); return idbSet(KEY, next); }, []);

  const has = (id) => items.some((b) => b.id === id);
  const find = (id) => items.find((b) => b.id === id);

  const saveText = async (meta, text) => {
    const paras = toParagraphs(text);
    if (!paras.length) throw new Error('No readable text found');
    await idbSet('text:' + meta.id, paras);
    const cur = (await idbGet(KEY)) || [];
    const entry = { ...meta, added: Date.now(), progress: 0, size: text.length, text: undefined };
    await persist([entry, ...cur.filter((b) => b.id !== meta.id)]);
    return paras;
  };

  const download = async (book) => {
    setBusy((b) => ({ ...b, [book.id]: true }));
    try {
      const raw = await fetchRaw(book);
      await saveText(book, raw);
    } finally {
      setBusy((b) => { const n = { ...b }; delete n[book.id]; return n; });
    }
  };

  const importPdf = async (meta, buf, pages) => {
    await idbSet('pdf:' + meta.id, buf);
    const cur = (await idbGet(KEY)) || [];
    const entry = { source: 'Imported', cover: null, ...meta, kind: 'pdf', pages, added: Date.now(), progress: 0, size: buf.byteLength };
    await persist([entry, ...cur.filter((b) => b.id !== meta.id)]);
  };

  const getPdf = (id) => idbGet('pdf:' + id);

  const importText = (meta, text) => saveText({ source: 'Imported', cover: null, ...meta }, text);

  const remove = async (id) => { await idbDel('text:' + id); await idbDel('pdf:' + id); await persist(items.filter((b) => b.id !== id)); };

  const getParas = (id) => idbGet('text:' + id);

  const setProgress = (id, progress) => {
    const next = items.map((b) => (b.id === id ? { ...b, progress, lastRead: Date.now() } : b));
    persist(next);
  };

  return { items, busy, ready, has, find, download, importText, importPdf, getPdf, remove, getParas, setProgress };
}
