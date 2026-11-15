import { useState } from 'react';
import { Badge, Cover, Icon, RoundBtn } from '../ui';

export default function Detail({ book, lib, back, openReader }) {
  const saved = lib.find(book.id);
  const busy = lib.busy[book.id];
  const [err, setErr] = useState('');
  const b = saved ? { ...book, ...saved } : book;
  const stats = [
    [b.year || (b.downloads ? Intl.NumberFormat('en', { notation: 'compact' }).format(b.downloads) : '—'), b.year ? 'Published' : 'Downloads'],
    [(b.lang || 'en').toUpperCase(), 'Language'],
    [b.size ? `${(b.size / 1048576).toFixed(1)} MB` : b.pages ? b.pages : 'Text', b.size ? 'Offline size' : b.pages ? 'Pages' : 'Format'],
  ];

  return (
    <div className="screen overlay detail">
      <div className="topbar">
        <RoundBtn icon="back" onClick={back} />
        {b.webUrl && <RoundBtn icon="external" label="Open website" onClick={() => window.open(b.webUrl, '_system')} />}
      </div>

      <div className="hero">
        <div className="bigcover"><Cover book={b} w={176} h={264} /></div>
        <h1>{b.title}</h1>
        <p>{b.author}</p>
      </div>

      <div className="stats glass">
        {stats.map(([v, l], i) => (
          <div key={l} className={i ? 'sep' : ''}><b>{v}</b><span>{l}</span></div>
        ))}
      </div>

      <div className="avail"><span>Available on</span><Badge source={b.source} />{saved && <Badge source="Imported" />}</div>

      {b.subjects?.length > 0 && (
        <p className="about">{b.subjects.map((s) => s.split(' -- ')[0]).filter((v, i, a) => a.indexOf(v) === i).slice(0, 4).join(' · ')}</p>
      )}
      {!b.readUrl && <p className="about">This edition is only available to borrow online. Open the website to read it there.</p>}
      {err && <p className="about err">{err}</p>}

      <div className="actions">
        <button className="btn primary" disabled={!b.readUrl} onClick={() => openReader(b)}>
          <Icon n="book" s={20} /> {saved?.progress > 0 ? 'Continue' : 'Read now'}
        </button>
        {saved ? (
          <button className="btn glass" onClick={() => lib.remove(b.id).then(back)}><Icon n="trash" s={20} /> Remove</button>
        ) : (
          <button className="btn glass" disabled={!b.readUrl || busy} onClick={() => lib.download(b).catch((e) => setErr(e.message))}>
            {busy ? <span className="spinner" /> : <Icon n="import" s={20} />} Download
          </button>
        )}
      </div>
      {b.epubUrl && !saved && (
        <button className="linkbtn" onClick={() => window.open(b.epubUrl, '_system')}>Get the EPUB file <Icon n="external" s={14} /></button>
      )}
    </div>
  );
}
