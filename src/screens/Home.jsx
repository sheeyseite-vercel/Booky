import { useEffect, useState } from 'react';
import { gutenberg, SOURCES } from '../lib/sources';
import { Chip, Cover, Icon, Progress, RoundBtn, SectionHeader, Badge } from '../ui';

const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export default function Home({ lib, openBook, openReader, goSearch }) {
  const [trend, setTrend] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { gutenberg('').then(setTrend).catch((e) => setErr(e.message)); }, []);

  const cont = [...lib.items]
    .filter((b) => b.progress > 0 && b.progress < 0.99)
    .sort((a, b) => (b.lastRead || 0) - (a.lastRead || 0))[0];

  return (
    <div className="screen">
      <header className="hello">
        <div>
          <small>{greet()}</small>
          <h1>What will you<br />read today?</h1>
        </div>
        <RoundBtn icon="library" label="Library" onClick={() => goSearch({})} />
      </header>

      <button className="searchbar glass" onClick={() => goSearch({})}>
        <Icon n="search" s={20} />
        <span>Search millions of books…</span>
      </button>

      <div className="chips">
        <Chip active onClick={() => goSearch({})}>All sources</Chip>
        {SOURCES.map((s) => <Chip key={s} onClick={() => goSearch({ source: s })}>{s}</Chip>)}
      </div>

      {cont ? (
        <button className="continue glass" onClick={() => openReader(cont)}>
          <Cover book={cont} w={88} h={124} />
          <div className="cinfo">
            <small>CONTINUE READING</small>
            <h3>{cont.title}</h3>
            <span>{cont.author}</span>
            <Progress value={cont.progress} w="100%" />
            <em>{Math.round(cont.progress * 100)}% read</em>
          </div>
        </button>
      ) : (
        <button className="continue glass promo" onClick={() => goSearch({})}>
          <div className="promoicon"><Icon n="book" s={30} /></div>
          <div className="cinfo">
            <small>GET STARTED</small>
            <h3>Find your first book</h3>
            <span>Search Gutenberg, Open Library and Internet Archive, then read or download.</span>
          </div>
        </button>
      )}

      <SectionHeader title="Trending on Gutenberg" more="See all" onMore={() => goSearch({ source: 'Gutenberg' })} />
      {err && <p className="muted">{err}</p>}
      <div className="hscroll">
        {(trend || Array.from({ length: 5 })).map((b, i) =>
          b ? (
            <button key={b.id} className="bookcard" onClick={() => openBook(b)}>
              <Cover book={b} w={108} />
              <b>{b.title}</b>
              <span>{b.author}</span>
            </button>
          ) : (
            <div key={i} className="bookcard skeleton"><div style={{ width: 108, height: 162 }} /></div>
          )
        )}
      </div>

      {lib.items.length > 0 && (
        <>
          <SectionHeader title="Your library" />
          <div className="hscroll">
            {lib.items.slice(0, 8).map((b) => (
              <button key={b.id} className="bookcard" onClick={() => openBook(b)}>
                <Cover book={b} w={108} />
                <b>{b.title}</b>
                <Badge source={b.source} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
