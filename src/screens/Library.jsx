import { useState } from 'react';
import { Chip, Cover, Empty, Icon, Progress } from '../ui';

const TABS = ['All', 'Downloaded', 'Imported'];

export default function Library({ lib, openBook }) {
  const [tab, setTab] = useState('All');
  const list = lib.items.filter((b) => tab === 'All' || (tab === 'Imported' ? b.source === 'Imported' : b.source !== 'Imported'));
  const mb = lib.items.reduce((a, b) => a + (b.size || 0), 0) / 1048576;

  return (
    <div className="screen">
      <header className="pagehead"><div><h1>Library</h1></div></header>
      <div className="segctl glass">{TABS.map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>

      <div className="storage glass">
        <div><b>Offline library</b><span>{lib.items.length} books · {mb.toFixed(1)} MB</span></div>
        <Icon n="cloud" s={22} />
      </div>

      {list.length === 0 && <Empty title="No books yet" text="Download from Search or import your own files." />}
      <div className="grid">
        {list.map((b) => (
          <button key={b.id} className="gitem" onClick={() => openBook(b)}>
            <div className="cwrap"><Cover book={b} w={102} h={152} /><i className="sbadge"><Icon n="check" s={12} w={2.4} /></i></div>
            <b>{b.title}</b>
            {b.progress > 0 && b.progress < 0.99 ? <Progress value={b.progress} w="100%" h={4} /> : <span>{b.progress >= 0.99 ? 'Finished' : 'Not started'}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
