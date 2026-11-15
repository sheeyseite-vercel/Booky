import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { useLibrary } from './lib/library';
import { TabBar } from './ui';
import Home from './screens/Home';
import Search from './screens/Search';
import Detail from './screens/Detail';
import Reader from './screens/Reader';
import Import from './screens/Import';
import Library from './screens/Library';

const BLOBS = [
  ['-90px', '-60px', 380, '#7C3AED', 0.9],
  ['200px', '150px', 300, '#06B6D4', 0.5],
  ['-90px', '520px', 340, '#EC4899', 0.55],
  ['220px', '650px', 300, '#4F46E5', 0.8],
];

export default function App() {
  const lib = useLibrary();
  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState([]);
  const [searchPreset, setSearchPreset] = useState({ q: '', source: 'All' });
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const push = (v) => setStack((s) => [...s, v]);
  const pop = () => setStack((s) => s.slice(0, -1));
  const openBook = (book) => push({ type: 'detail', book });
  const openReader = (book) => push({ type: 'reader', book });
  const goSearch = (preset) => { setSearchPreset({ q: '', source: 'All', ...preset }); setTab('search'); };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const h = CapApp.addListener('backButton', () => {
      if (stackRef.current.length) pop();
      else CapApp.exitApp();
    });
    return () => { h.then((x) => x.remove()); };
  }, []);

  const top = stack[stack.length - 1];

  return (
    <div className="app">
      {BLOBS.map(([x, y, s, c, o], i) => (
        <div key={i} className="blob" style={{ left: x, top: y, width: s, height: s, background: c, opacity: o }} />
      ))}
      <div className="screens" style={{ display: top ? 'none' : 'block' }}>
        {tab === 'home' && <Home lib={lib} openBook={openBook} openReader={openReader} goSearch={goSearch} />}
        {tab === 'search' && <Search key={searchPreset.q + searchPreset.source} preset={searchPreset} lib={lib} openBook={openBook} openReader={openReader} />}
        {tab === 'import' && <Import lib={lib} openBook={openBook} />}
        {tab === 'library' && <Library lib={lib} openBook={openBook} />}
      </div>
      {!top && <TabBar tab={tab} setTab={setTab} />}
      {top?.type === 'detail' && <Detail book={top.book} lib={lib} back={pop} openReader={openReader} />}
      {top?.type === 'reader' && <Reader book={top.book} lib={lib} back={pop} />}
    </div>
  );
}
