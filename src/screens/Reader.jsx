import { useEffect, useRef, useState } from 'react';
import { fetchRaw } from '../lib/sources';
import { paginate, toParagraphs } from '../lib/text';
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
  const paper = useRef(null);
  const touch = useRef(0);
  const saved = lib.find(book.id);

  useEffect(() => localStorage.setItem('booky:prefs', JSON.stringify(prefs)), [prefs]);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
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
        className="paper glass"
        ref={paper}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 70) go(dx < 0 ? 1 : -1); }}
      >
        {!pages && !err && <p className="center"><span className="spinner" /> Opening book…</p>}
        {err && <p className="center">{err}</p>}
        {pages && (
          <div dir={rtl ? 'rtl' : 'ltr'} style={{ fontFamily: rtl ? "'Noto Naskh Arabic', 'Traditional Arabic', serif" : FONTS[prefs.font], fontSize: prefs.size, lineHeight: LH[prefs.lh] }}>
            {page === 0 && (<><small className="kicker" style={rtl ? { letterSpacing: 0 } : undefined}>{book.author}</small><h2 className="rh">{book.title}</h2></>)}
            {pages[page].map((p, i) => (isHead(p) ? <h3 key={i} className="chap">{p.trim()}</h3> : <p key={i}>{p}</p>))}
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
