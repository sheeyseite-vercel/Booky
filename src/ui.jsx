import { useState } from 'react';

const P = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  import: '<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>',
  library: '<path d="M5 4v16"/><path d="M10 4v16"/><path d="m14.5 5.5 5 14"/>',
  book: '<path d="M2 5.5C4.5 4 8.5 4 12 6c3.5-2 7.5-2 10-.5V19c-2.5-1.5-6.5-1.5-10 .5-3.5-2-7.5-2-10-.5z"/><path d="M12 6v13.5"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  next: '<path d="m9 5 7 7-7 7"/>',
  bookmark: '<path d="M6 3h12v18l-6-4.5L6 21z"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9a4 4 0 0 1 0 9z"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
};

export function Icon({ n, s = 22, c = 'currentColor', w = 1.8, style }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={style} dangerouslySetInnerHTML={{ __html: P[n] }} />
  );
}

const PAL = [['#7C3AED', '#EC4899'], ['#0EA5E9', '#22D3EE'], ['#F97316', '#EF4444'], ['#F472B6', '#FBBF24'], ['#10B981', '#065F46'], ['#1D4ED8', '#06B6D4'], ['#65A30D', '#14B8A6'], ['#991B1B', '#1E1B4B']];
const hash = (s = '') => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export function Cover({ book, w = 104, h }) {
  const H = h || Math.round(w * 1.5);
  const [bad, setBad] = useState(false);
  const k = hash(book.title);
  const p = PAL[k % PAL.length];
  return (
    <div className="cover" style={{ width: w, height: H, borderRadius: w * 0.08, background: `linear-gradient(135deg,${p[0]},${p[1]})` }}>
      {book.cover && !bad ? (
        <img src={book.cover} alt="" loading="lazy" onError={() => setBad(true)} />
      ) : (
        <>
          <div className={'deco d' + (k % 3)} />
          <div className="ctitle" style={{ fontSize: Math.max(8, w * 0.115), left: w * 0.11, top: H * 0.09, width: w * 0.78 }}>{book.title}</div>
          <div className="cauthor" style={{ fontSize: Math.max(6, w * 0.062), left: w * 0.11, bottom: w * 0.1, width: w * 0.8 }}>{book.author}</div>
        </>
      )}
      <i className="spine" />
    </div>
  );
}

export const SRC_COLOR = { Gutenberg: '#F59E0B', 'Open Library': '#38BDF8', 'Internet Archive': '#A78BFA', Wikisource: '#F472B6', Imported: '#34D399' };

export function Badge({ source }) {
  return (
    <span className="badge">
      <i style={{ background: SRC_COLOR[source] || '#fff' }} />
      {source}
    </span>
  );
}

export function Chip({ active, children, onClick }) {
  return <button className={'chip' + (active ? ' on' : '')} onClick={onClick}>{children}</button>;
}

export function RoundBtn({ icon, primary, onClick, size = 46, ink, label }) {
  return (
    <button aria-label={label || icon} className={'round' + (primary ? ' primary' : ' glass')} style={{ width: size, height: size, color: ink }} onClick={onClick}>
      <Icon n={icon} s={Math.round(size * 0.44)} w={1.9} />
    </button>
  );
}

export function Progress({ value, w, h = 6 }) {
  return (
    <div className="prog" style={{ width: w, height: h, borderRadius: h }}>
      <b style={{ width: `${Math.max(2, value * 100)}%` }} />
    </div>
  );
}

export function TabBar({ tab, setTab }) {
  const items = [['home', 'Home', 'home'], ['search', 'Search', 'search'], ['import', 'Import', 'import'], ['library', 'Library', 'library']];
  return (
    <nav className="tabbar glass">
      {items.map(([id, label, icon]) => (
        <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
          <Icon n={icon} s={22} w={tab === id ? 2 : 1.7} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function SectionHeader({ title, more, onMore }) {
  return (
    <div className="sechead">
      <h2>{title}</h2>
      {more && <button onClick={onMore}>{more}</button>}
    </div>
  );
}

export function Empty({ icon = 'book', title, text }) {
  return (
    <div className="empty glass">
      <Icon n={icon} s={30} />
      <b>{title}</b>
      <span>{text}</span>
    </div>
  );
}
