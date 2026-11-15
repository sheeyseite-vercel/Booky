import { useRef, useState } from 'react';
import { get } from '../lib/http';
import { htmlToText, parseEpub, parseFile } from '../lib/text';
import { Cover, Icon, Progress, SectionHeader } from '../ui';

export default function Import({ lib, openBook }) {
  const file = useRef(null);
  const [status, setStatus] = useState(null); // {name, state, msg}
  const [drag, setDrag] = useState(false);

  const finish = async (name, job) => {
    setStatus({ name, state: 'busy' });
    try {
      const { title, author, text } = await job();
      await lib.importText({ id: 'i' + Date.now(), title, author }, text);
      setStatus({ name: title, state: 'ok', msg: 'Imported to your library' });
    } catch (e) { setStatus({ name, state: 'err', msg: e.message }); }
  };

  const onFiles = (files) => [...files].forEach((f) => finish(f.name, () => parseFile(f)));

  const fromLink = () => {
    const url = window.prompt('Paste a link to an EPUB, TXT or HTML file');
    if (!url) return;
    finish(url, async () => {
      const name = decodeURIComponent(url.split('/').pop().split('?')[0] || 'Imported');
      if (/\.epub(\?|$)/i.test(url)) return { ...(await parseEpub(await get(url, 'buffer'))) };
      const raw = await get(url);
      const isHtml = /\.html?(\?|$)/i.test(url) || /^\s*<(!doctype|html)/i.test(raw);
      return { title: name.replace(/\.[^.]+$/, '') || 'Imported', author: 'Imported', text: isHtml ? htmlToText(raw) : raw };
    });
  };

  const tiles = [
    ['folder', 'From device', 'EPUB, TXT, HTML', () => file.current.click(), 'a'],
    ['link', 'Paste a link', 'Direct file URL', fromLink, 'b'],
    ['cloud', 'Cloud drives', 'Via file picker', () => file.current.click(), 'c'],
    ['scan', 'Scan a book', 'Coming soon', null, 'd'],
  ];
  const imported = lib.items.filter((b) => b.source === 'Imported');

  return (
    <div className="screen">
      <header className="pagehead"><div><h1>Import</h1><small>Bring books from anywhere</small></div></header>
      <input ref={file} type="file" hidden multiple accept=".epub,.txt,.html,.htm,.xhtml,text/plain,text/html,application/epub+zip" onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />

      <div className={'dropzone glass' + (drag ? ' drag' : '')} onClick={() => file.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}>
        <div className="upicon"><Icon n="import" s={28} w={2} /></div>
        <b>Drop EPUB, TXT or HTML</b>
        <span>or tap to browse your files</span>
      </div>

      {status && (
        <div className={'status glass ' + status.state}>
          {status.state === 'busy' ? <span className="spinner" /> : <Icon n={status.state === 'ok' ? 'check' : 'x'} s={18} w={2.4} />}
          <div><b>{status.name}</b><span>{status.state === 'busy' ? 'Importing…' : status.msg}</span></div>
        </div>
      )}

      <div className="tiles">
        {tiles.map(([ic, t, s, fn, c]) => (
          <button key={t} className={'tile glass ' + c} disabled={!fn} onClick={fn || undefined}>
            <i><Icon n={ic} s={22} w={1.9} /></i>
            <div><b>{t}</b><span>{s}</span></div>
          </button>
        ))}
      </div>

      <SectionHeader title="Recent imports" />
      {imported.length === 0 && <p className="muted">Nothing imported yet.</p>}
      {imported.map((b) => (
        <button key={b.id} className="irow glass" onClick={() => openBook(b)}>
          <Cover book={b} w={40} h={58} />
          <div><b>{b.title}</b><span>Imported · {(b.size / 1024).toFixed(0)} KB</span>{b.progress > 0 && <Progress value={b.progress} w={160} h={4} />}</div>
          <i className="okdot"><Icon n="check" s={16} w={2.4} /></i>
        </button>
      ))}
    </div>
  );
}
