import { useEffect, useRef, useState } from 'react';
import { fetchRaw } from '../lib/sources';
import { openPdf, paginate, toParagraphs } from '../lib/text';
import { Icon, RoundBtn } from '../ui';

const THEMES = {
  paper: ['Paper', '#FFF3E8', '#2B1B2E'],
  sepia: ['Sepia', '#E9D3B0', '#4A3420'],
  night: ['Night', '#14122E', '#EDE9FF'],
  mist: ['Mist', '#DCE9F6', '#1E2A44'],
};
const FONTS = { Lora: "'Lora', serif", Fraunces: "'Fraunces Variable', serif", Manrope: "'Manrope Variable', sans-serif" };
const LH = { Compact: 1.45, Normal: 1.65, Relaxed: 1.9 };

const HEAD = /^(chapter|part|book|section|volume|epilogue|prologue|الفصل|الباب|الجزء|المقدمة)\b.{0,70}$/i;
const isHead = (p) => p.length < 80 && (HEAD.test(p.trim()) || /^[IVXLC]+\.?$/.test(p.trim()));

const loadHl = (id) => { try { return JSON.parse(localStorage.getItem('booky:hl:' + id) || '[]'); } catch { return []; } };

function Para({ text, pi, hls, onMark }) {
  const mine = hls.filter((h) => h.pi === pi).sort((a, b) => a.s - b.s);
  if (!mine.length) return <p data-pi={pi}>{text}</p>;
  const out = [];
  let pos = 0;
  mine.forEach((h) => {
    const st = Math.max(h.s, pos), en = Math.min(h.e, text.length);
    if (en <= st) return;
    if (st > pos) out.push(text.slice(pos, st));
    out.push(<mark key={h.id} className={h.note ? 'hl hasnote' : 'hl'} onClick={(e) => { e.stopPropagation(); onMark(h, e.currentTarget.getBoundingClientRect()); }}>{text.slice(st, en)}</mark>);
    pos = en;
  });
  out.push(text.slice(pos));
  return <p data-pi={pi}>{out}</p>;
}

const offsetIn = (p, node, off) => { const r = document.createRange(); r.selectNodeContents(p); r.setEnd(node, off); return r.toString().length; };

const loadPrefs = () => {
  try { return { theme: 'paper', size: 17, font: 'Lora', lh: 'Normal', ...JSON.parse(localStorage.getItem('booky:prefs') || '{}') }; }
  catch { return { theme: 'paper', size: 17, font: 'Lora', lh: 'Normal' }; }
};

export default function Reader({ book, lib, back }) {
  const [pages, setPages] = useState(null);
  const [page, setPage] = useState(0);
  const [err, setErr] = useState('');
  const [prefs, setPrefs] = useState(loadPrefs);
  const [sheet, setSheet] = useState(false);
  const [hls, setHls] = useState(() => loadHl(book.id));
  const [bar, setBar] = useState(null); // selection bar {x,y,text,segs} | edit bar {x,y,mark}
  const [pdfDoc, setPdfDoc] = useState(null);
  const canvas = useRef(null);
  const paper = useRef(null);
  const touch = useRef(0);
  const saved = lib.find(book.id);

  useEffect(() => localStorage.setItem('booky:prefs', JSON.stringify(prefs)), [prefs]);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        if (saved?.kind === 'pdf') {
          const doc = await openPdf(await lib.getPdf(book.id));
          if (dead) return;
          setPdfDoc(doc);
          setPages(Array.from({ length: doc.numPages }, () => []));
          setPage(Math.min(doc.numPages - 1, Math.floor((saved.progress || 0) * doc.numPages)));
          return;
        }
        const paras = saved ? await lib.getParas(book.id) : toParagraphs(await fetchRaw(book));
        if (!paras?.length) throw new Error('No readable text found');
        const pg = paginate(paras);
        if (dead) return;
        const frac = saved ? saved.progress : Number(localStorage.getItem('booky:pos:' + book.id) || 0);
        setPages(pg);
        setPage(Math.min(pg.length - 1, Math.floor(frac * pg.length)));
      } catch (e) { if (!dead) setErr(e.message); }
    })();
    return () => { dead = true; };
    // eslint-disable-next-line
  }, [book.id]);

  useEffect(() => { try { localStorage.setItem('booky:hl:' + book.id, JSON.stringify(hls)); } catch { /* ignore */ } }, [hls]);

  // text selection -> floating action bar
  useEffect(() => {
    const h = () => {
      const sel = window.getSelection();
      const root = paper.current;
      if (!sel || sel.isCollapsed || !root || !root.contains(sel.anchorNode)) { setBar((b) => (b && b.mark ? b : null)); return; }
      const r = sel.getRangeAt(0);
      const segs = [];
      root.querySelectorAll('p[data-pi]').forEach((p) => {
        if (!r.intersectsNode(p)) return;
        const s0 = p.contains(r.startContainer) ? offsetIn(p, r.startContainer, r.startOffset) : 0;
        const e0 = p.contains(r.endContainer) ? offsetIn(p, r.endContainer, r.endOffset) : p.textContent.length;
        if (e0 > s0) segs.push({ pi: +p.dataset.pi, s: s0, e: e0 });
      });
      const rect = r.getBoundingClientRect();
      setBar({ x: rect.left + rect.width / 2, y: rect.top, text: sel.toString(), segs });
    };
    document.addEventListener('selectionchange', h);
    return () => document.removeEventListener('selectionchange', h);
  }, []);

  // scanned-PDF page rendering
  useEffect(() => {
    if (!pdfDoc || !canvas.current) return;
    let task, dead = false;
    (async () => {
      const pg = await pdfDoc.getPage(page + 1);
      const base = pg.getViewport({ scale: 1 });
      const w = (paper.current?.clientWidth || 360) - 16;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const vp = pg.getViewport({ scale: (w / base.width) * dpr });
      const c = canvas.current;
      if (!c || dead) return;
      c.width = vp.width; c.height = vp.height;
      c.style.width = '100%';
      task = pg.render({ canvasContext: c.getContext('2d'), viewport: vp });
      await task.promise.catch(() => {});
    })();
    return () => { dead = true; task?.cancel(); };
  }, [pdfDoc, page, pages]);

  const addHl = (note) => {
    if (!bar?.segs?.length) return;
    const gid = Date.now();
    setHls((h) => [...h, ...bar.segs.map((sg, i) => ({ id: gid + '-' + i, page, ...sg, note: note || '' }))]);
    window.getSelection()?.removeAllRanges();
    setBar(null);
  };
  const doNote = () => { const n = window.prompt('Note'); if (n !== null) addHl(n.trim()); };
  const doCopy = () => { try { navigator.clipboard?.writeText(bar.text); } catch { /* ignore */ } window.getSelection()?.removeAllRanges(); setBar(null); };
  const doDefine = () => { window.open('https://www.google.com/search?q=define+' + encodeURIComponent(bar.text.trim().slice(0, 60)), '_system'); };
  const onMark = (h, rect) => setBar({ x: rect.left + rect.width / 2, y: rect.top, mark: h });
  const editNote = () => { const n = window.prompt('Note', bar.mark.note || ''); if (n !== null) setHls((x) => x.map((h) => (h.id === bar.mark.id ? { ...h, note: n.trim() } : h))); setBar(null); };
  const removeHl = () => { setHls((x) => x.filter((h) => h.id !== bar.mark.id)); setBar(null); };

  const frac = pages && pages.length > 1 ? page / (pages.length - 1) : 0;

  useEffect(() => {
    if (!pages) return;
    paper.current?.scrollTo({ top: 0 });
    const t = setTimeout(() => {
      if (saved) lib.setProgress(book.id, frac);
      else localStorage.setItem('booky:pos:' + book.id, String(frac));
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [page, pages]);

  const go = (d) => setPage((p) => Math.max(0, Math.min((pages?.length || 1) - 1, p + d)));
  const set = (k, v) => setPrefs((p) => ({ ...p, [k]: v }));
  const [, bg, ink] = THEMES[prefs.theme];
  const dark = prefs.theme === 'night';
  const rtl = !!pages && /[\u0590-\u08FF]/.test((pages[page][0] || '').slice(0, 200));

  return (
    <div className={'screen overlay reader' + (dark ? ' dark' : '')} data-theme={prefs.theme} style={{ '--ink': ink, '--rbg': bg }}>
      <div className="rblob a" /><div className="rblob b" /><div className="rblob c" />

      <div className="rtop glass">
        <RoundBtn icon="back" size={40} onClick={back} ink={ink} />
        <div className="rtitle"><b>{book.title}</b><small>{pages ? `Page ${page + 1} of ${pages.length}` : 'Loading…'}</small></div>
        <RoundBtn icon={saved ? 'check' : 'bookmark'} size={40} ink={ink} label="Save offline" onClick={() => !saved && book.readUrl && lib.download(book).catch((e) => setErr(e.message))} />
      </div>

      <div
        className={'paper glass' + (pdfDoc ? ' pdfmode' : '')}
        ref={paper}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => { if (window.getSelection()?.toString()) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 70) go(dx < 0 ? 1 : -1); }}
      >
        {!pages && !err && <p className="center"><span className="spinner" /> Opening book…</p>}
        {err && <p className="center">{err}</p>}
        {pdfDoc && <canvas ref={canvas} className="pdfpage" />}
        {pages && !pdfDoc && (
          <div dir={rtl ? 'rtl' : 'ltr'} style={{ fontFamily: rtl ? "'Noto Naskh Arabic', 'Traditional Arabic', serif" : FONTS[prefs.font], fontSize: prefs.size, lineHeight: LH[prefs.lh] }}>
            {page === 0 && (<><small className="kicker" style={rtl ? { letterSpacing: 0 } : undefined}>{book.author}</small><h2 className="rh">{book.title}</h2></>)}
            {pages[page].map((p, i) => (isHead(p) ? <h3 key={i} className="chap">{p.trim()}</h3> : <Para key={page + '-' + i} text={p} pi={i} hls={hls.filter((h) => h.page === page)} onMark={onMark} />))}
          </div>
        )}
      </div>

      {pages && (
        <div className="rctrl glass">
          <div className="rinfo2"><span>Page {page + 1} of {pages.length}</span><b>{Math.round(frac * 100)}%</b></div>
          <input type="range" min="0" max={pages.length - 1} value={page} onChange={(e) => setPage(+e.target.value)} style={{ '--p': `${frac * 100}%` }} />
          <div className="tools">
            <button onClick={() => go(-1)} aria-label="Previous"><Icon n="back" s={24} /></button>
            <button className="aa" onClick={() => setSheet(true)}>Aa</button>
            <button onClick={() => set('theme', dark ? 'paper' : 'night')} aria-label="Toggle night"><Icon n="moon" s={22} /></button>
            <button onClick={() => go(1)} aria-label="Next"><Icon n="next" s={24} /></button>
          </div>
        </div>
      )}

      {bar && (
        <div className="selbar" style={{ left: Math.min(Math.max(bar.x, 150), window.innerWidth - 150), top: Math.max(bar.y - 58, 80) }}>
          {bar.mark ? (
            <>
              <button onClick={editNote}>{bar.mark.note ? 'Edit note' : 'Note'}</button>
              <button onClick={removeHl}>Remove</button>
              <button onClick={() => setBar(null)}>Close</button>
            </>
          ) : (
            <>
              <button onClick={() => addHl('')}>Highlight</button>
              <button onClick={doNote}>Note</button>
              <button onClick={doDefine}>Define</button>
              <button onClick={doCopy}>Copy</button>
            </>
          )}
          {bar.mark?.note && <div className="notetip">{bar.mark.note}</div>}
        </div>
      )}

      {sheet && (
        <>
          <div className="scrim" onClick={() => setSheet(false)} />
          <div className="sheet glass">
            <div className="grab" />
            <div className="shead"><h3>Appearance</h3><RoundBtn icon="x" size={34} ink={ink} onClick={() => setSheet(false)} /></div>
            <label>TEXT SIZE</label>
            <div className="srow"><span style={{ fontSize: 14 }}>A</span>
              <input type="range" min="13" max="26" value={prefs.size} onChange={(e) => set('size', +e.target.value)} style={{ '--p': `${((prefs.size - 13) / 13) * 100}%` }} />
              <span style={{ fontSize: 26 }}>A</span></div>
            <label>THEME</label>
            <div className="themes">
              {Object.entries(THEMES).map(([k, [n, b, c]]) => (
                <button key={k} className={prefs.theme === k ? 'on' : ''} onClick={() => set('theme', k)}>
                  <i style={{ background: b, color: c }}>Aa</i><span>{n}</span>
                </button>
              ))}
            </div>
            <label>TYPEFACE</label>
            <div className="seg">{Object.keys(FONTS).map((f) => <button key={f} className={prefs.font === f ? 'on' : ''} onClick={() => set('font', f)}>{f}</button>)}</div>
            <label>LINE SPACING</label>
            <div className="seg">{Object.keys(LH).map((f) => <button key={f} className={prefs.lh === f ? 'on' : ''} onClick={() => set('lh', f)}>{f}</button>)}</div>
          </div>
        </>
      )}
    </div>
  );
}
