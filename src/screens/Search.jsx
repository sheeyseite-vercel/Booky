import { useEffect, useRef, useState } from 'react';
import { search, SOURCES } from '../lib/sources';
import { Badge, Chip, Cover, Empty, Icon, RoundBtn } from '../ui';

const IDEAS = ['Dostoevsky', 'Jane Austen', 'Philosophy', 'Poetry', 'Science fiction', 'Shakespeare'];

export default function Search({ preset, lib, openBook, openReader }) {
  const [q, setQ] = useState(preset.q || '');
  const [source, setSource] = useState(preset.source || 'All');
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const seq = useRef(0);

  const run = async (query = q, src = source) => {
    if (query.trim().length < 2) { setRes(null); return; }
    const id = ++seq.current;
    setLoading(true); setErr('');
    try {
      const r = await search(query.trim(), src, (part) => { if (id === seq.current) setRes(part); });
      if (id === seq.current) setRes(r);
    } catch (e) { if (id === seq.current) { setErr(e.message); setRes([]); } }
    finally { if (id === seq.current) setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => run(), 550);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q, source]);

  return (
    <div className="screen">
      <form className="searchbar glass focus" onSubmit={(e) => { e.preventDefault(); run(); }}>
        <Icon n="search" s={20} />
        <input autoFocus={!preset.q} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, author or topic" enterKeyHint="search" />
        {q && <RoundBtn icon="x" size={34} onClick={() => { setQ(''); setRes(null); }} />}
      </form>

      <div className="chips">
        {['All', ...SOURCES].map((s) => <Chip key={s} active={source === s} onClick={() => setSource(s)}>{s === 'All' ? 'Everything' : s}</Chip>)}
      </div>

      {res === null && !loading && (
        <>
          <p className="muted">Try searching for</p>
          <div className="chips wrap">{IDEAS.map((i) => <Chip key={i} onClick={() => setQ(i)}>{i}</Chip>)}</div>
        </>
      )}

      {loading && <p className="muted"><span className="spinner" /> Searching libraries…</p>}
      {err && <p className="muted">{err}</p>}
      {res && !loading && <p className="muted">{res.length} results</p>}
      {res && !loading && res.length === 0 && !err && <Empty icon="search" title="No results" text="Try another title, author or source." />}

      <div className="results">
        {(res || []).map((b) => {
          const saved = lib.has(b.id);
          const busy = lib.busy[b.id];
          return (
            <div key={b.id} className="result glass" onClick={() => openBook(b)}>
              <Cover book={b} w={62} h={94} />
              <div className="rinfo">
                <h3>{b.title}</h3>
                <span>{b.author}</span>
                <div className="tags">
                  <Badge source={b.source} />
                  <em>{b.readUrl ? (b.year ? b.year : 'Free') : 'Borrow only'}</em>
                </div>
              </div>
              <div className="ract" onClick={(e) => e.stopPropagation()}>
                {busy ? <div className="round glass"><span className="spinner" /></div>
                  : <RoundBtn icon={saved ? 'check' : 'import'} primary={!saved} size={40} label="Download" onClick={() => b.readUrl && !saved && lib.download(b).catch((e) => setErr(e.message))} />}
                <RoundBtn icon="book" size={40} label="Read" onClick={() => (b.readUrl ? openReader(b) : openBook(b))} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
