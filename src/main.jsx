import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, Check, ChevronLeft, House, List, Search, X } from 'lucide-react';
import { galHiamHymns, hymns } from './hymns';
import InstallButton from './InstallButton';
import './styles.css';

const galHiamCover = '/gal-hiam-book.png';
const sectionCounts = new Map();
for (const { section } of hymns) {
  sectionCounts.set(section, (sectionCounts.get(section) ?? 0) + 1);
}
const sections = [...sectionCounts].map(([name, count], index) => ({
  name, count, id: `hymn-section-${index + 1}`,
}));
const sectionIds = new Map(sections.map(({ name, id }) => [name, id]));
const textSizes = { standard: '100%', large: '120%', largest: '140%' };
const textSizeKey = 'labu-reader-text-size';
const themeKey = 'labu-reader-theme';

function readPreference(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storePreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Keep the preference in memory when browser storage is unavailable.
  }
}

function normalize(text) {
  return text.normalize('NFC').toLocaleLowerCase()
    .replace(/[၀-၉]/g, (digit) => String(digit.charCodeAt(0) - 0x1040))
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();
}

function isGalHiamUrl() {
  return new URLSearchParams(window.location.search).get('collection') === 'gal-hiam';
}

function OfflineStatus({ ready }) {
  return ready && <span className="offline-status"><Check size={15} aria-hidden="true" /> Available offline</span>;
}

function HymnLyrics({ lyrics }) {
  return (
    <>
      <p className="hymn-music"><span>Doh is {lyrics.doh}</span><span>Timing {lyrics.timing}</span></p>
      <div className="hymn-lyrics">
        {lyrics.stanzas.map(({ label, lines }) => (
          <div className={`stanza ${label === 'Chorus' ? 'chorus' : ''}`} key={label}>
            <h3 className="stanza-label">{label}</h3>
            <p lang="ctd">{lines.join('\n')}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function HymnDetail({ hymn, onClose, onSearch, textSize, onTextSizeChange, dim, onThemeChange, offlineReady }) {
  const dialog = useRef(null);
  const title = useRef(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    const scroll = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = scroll;
    };
  }, []);

  useEffect(() => {
    dialog.current.scrollTop = 0;
    title.current?.focus({ preventScroll: true });
  }, [hymn.number]);

  return (
    <dialog className="detail hymn-reader" data-theme={dim ? 'dim' : 'light'} ref={dialog} aria-labelledby="detail-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="reader-controls">
        <div className="reader-toolbar">
          <button type="button" className="icon-button" aria-label="Back to hymn list" onClick={onClose}>
            <ChevronLeft size={24} aria-hidden="true" />
          </button>
          <p className="detail-number">Hymn {hymn.number}</p>
          <div className="reader-actions">
            <button type="button" className="icon-button reader-text-size"
              aria-label="Reading settings" aria-expanded={showSettings} aria-controls="reader-settings"
              onClick={() => setShowSettings(!showSettings)}>Aa</button>
            <button type="button" className="icon-button" aria-label="Search hymns" onClick={() => {
              dialog.current.close();
              onSearch();
            }}>
              <Search size={21} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="reader-settings" id="reader-settings" hidden={!showSettings}>
          {hymn.lyrics && <div className="reader-text-sizes" role="group" aria-label="Lyric text size">
            {Object.entries(textSizes).map(([size, label]) => (
              <button key={size} type="button" aria-pressed={size === textSize} onClick={() => onTextSizeChange(size)}>{label}</button>
            ))}
          </div>}
          <button type="button" className="reader-theme" aria-pressed={dim} onClick={onThemeChange}>Dim theme</button>
        </div>
      </div>
      <header className="reader-header">
        <h2 id="detail-title" ref={title} tabIndex={-1} lang={hymn.language}>{hymn.title}</h2>
        <OfflineStatus ready={offlineReady} />
      </header>
      <div className="detail-inner" data-text-size={textSize}>
        {hymn.lyrics
          ? <HymnLyrics lyrics={hymn.lyrics} />
          : <p className="detail-message">Lyrics are currently unavailable for this hymn.</p>}
      </div>
    </dialog>
  );
}

function App() {
  const [galHiamOpen, setGalHiamOpen] = useState(isGalHiamUrl);
  const [query, setQuery] = useState('');
  const [activeHymn, setActiveHymn] = useState(null);
  const [textSize, setTextSize] = useState(() => {
    const size = readPreference(textSizeKey);
    return Object.hasOwn(textSizes, size) ? size : 'standard';
  });
  const [dim, setDim] = useState(() => readPreference(themeKey) === 'dim');
  const [offlineReady, setOfflineReady] = useState(false);
  const [currentSection, setCurrentSection] = useState(null);
  const [jumpSection, setJumpSection] = useState(null);
  const search = useRef(null);
  const searchAnchor = useRef(null);
  const searchToolbar = useRef(null);
  const main = useRef(null);
  const readerTrigger = useRef(null);
  const categories = useRef(null);
  const term = normalize(query);

  useEffect(() => {
    if (!import.meta.env.PROD || !navigator.serviceWorker) return;
    const workers = navigator.serviceWorker;
    function updateOfflineStatus() {
      setOfflineReady(new URL('/sw.js', window.location.href).href === workers.controller?.scriptURL);
    }
    updateOfflineStatus();
    workers.addEventListener('controllerchange', updateOfflineStatus);
    return () => workers.removeEventListener('controllerchange', updateOfflineStatus);
  }, []);

  useEffect(() => {
    if (galHiamOpen || term) return;
    const headings = sections.map(({ id }) => document.getElementById(id));
    let frame = null;
    function updateSection() {
      frame = null;
      const toolbar = searchToolbar.current;
      const bounds = toolbar.getBoundingClientRect();
      if (bounds.top > parseFloat(getComputedStyle(toolbar).top) + 1) {
        setCurrentSection(null);
        return;
      }
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        setCurrentSection(sections.at(-1).name);
        return;
      }
      let section = null;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > bounds.bottom + 40) break;
        section = heading.textContent;
      }
      setCurrentSection(section);
    }
    function scheduleUpdate() {
      if (frame === null) frame = requestAnimationFrame(updateSection);
    }
    scheduleUpdate();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [galHiamOpen, term]);

  useEffect(() => {
    if (!jumpSection) return;
    const heading = document.getElementById(sectionIds.get(jumpSection));
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: 'start' });
    setJumpSection(null);
  }, [jumpSection]);

  useEffect(() => {
    function handleSearchShortcut(event) {
      if (event.key !== '/' || event.defaultPrevented || activeHymn || document.querySelector('dialog[open]') || event.ctrlKey ||
          event.metaKey || event.altKey || event.target.closest?.('input, textarea, [contenteditable]')) return;
      event.preventDefault();
      search.current?.focus();
    }
    document.addEventListener('keydown', handleSearchShortcut);
    return () => document.removeEventListener('keydown', handleSearchShortcut);
  }, [activeHymn]);

  useEffect(() => {
    function restoreCollection() {
      const nextCollection = isGalHiamUrl();
      if (nextCollection === galHiamOpen) return;
      setActiveHymn(null);
      categories.current?.close();
      setCurrentSection(null);
      setQuery('');
      setGalHiamOpen(nextCollection);
    }
    window.addEventListener('popstate', restoreCollection);
    return () => window.removeEventListener('popstate', restoreCollection);
  }, [galHiamOpen]);

  function openCollection(nextCollection) {
    if (nextCollection !== galHiamOpen) {
      const url = new URL(window.location.href);
      if (nextCollection) url.searchParams.set('collection', 'gal-hiam');
      else url.searchParams.delete('collection');
      url.hash = '';
      window.history.pushState(null, '', url);
      setGalHiamOpen(nextCollection);
      setCurrentSection(null);
    }
    setQuery('');
    window.scrollTo(0, 0);
  }

  function openHymn(hymn, trigger) {
    readerTrigger.current = trigger;
    setActiveHymn(hymn);
  }

  function closeHymn() {
    setActiveHymn(null);
    requestAnimationFrame(() => {
      if (readerTrigger.current?.isConnected) readerTrigger.current.focus();
      else main.current?.focus();
    });
  }

  function searchFromReader() {
    setActiveHymn(null);
    search.current?.focus();
  }

  function changeTextSize(size) {
    setTextSize(size);
    storePreference(textSizeKey, size);
  }

  function toggleTheme() {
    setDim(!dim);
    storePreference(themeKey, dim ? 'light' : 'dim');
  }

  function changeQuery(value) {
    setQuery(value);
    if (searchAnchor.current.getBoundingClientRect().top < 0) {
      searchAnchor.current.scrollIntoView({ block: 'start' });
    }
  }

  const hymnNumber = /^(?:(?:hymn|no)\s+)?0*(\d+)$/.exec(term)?.[1];
  const collection = galHiamOpen ? galHiamHymns : hymns;
  const visible = collection.filter((hymn) => {
    return hymnNumber
      ? hymn.number === Number(hymnNumber)
      : normalize(hymn.title).includes(term);
  });
  const groups = new Map();
  for (const hymn of visible) {
    const section = hymn.section ?? null;
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section).push(hymn);
  }

  return (
    <>
      <a className="skip-link" href="#hymn-index">Skip to hymn index</a>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href={window.location.pathname} onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
            event.preventDefault();
            openCollection(false);
          }}>
            <img src="/labu.svg" width="42" height="42" alt="" />
            <span>Zomi Catholic</span>
          </a>
          <nav className="desktop-nav" aria-label="Hymnal">
            <button type="button" className="nav-button" aria-current={!galHiamOpen ? 'page' : undefined} onClick={() => openCollection(false)}>
              <BookOpen size={17} aria-hidden="true" /> Hymn index
            </button>
            <button type="button" className="nav-button" aria-current={galHiamOpen ? 'page' : undefined} onClick={() => openCollection(true)}>
              <img src={galHiamCover} width="15" height="22" alt="" /> <span lang="ctd">Gal Hiam Labu</span>
            </button>
          </nav>
          <InstallButton />
        </div>
      </header>

      <main className="page" id="top">
        <section className={`cover${galHiamOpen ? ' cover-gal-hiam' : ''}`} aria-labelledby="cover-title">
          <div className="cover-copy">
            {galHiamOpen
              ? <h1 id="cover-title" lang="ctd">Gal Hiam Phatna Labu</h1>
              : <h1 id="cover-title">Zomi <span>Catholic</span></h1>}
          </div>
          {galHiamOpen
            ? <img className="collection-logo" src={galHiamCover} alt="" width="56" height="81" />
            : <div className="cover-art" aria-hidden="true">
                <div className="window-frame"><div className="window-image" /></div>
              </div>}
        </section>
        <section className="index" id="hymn-index" tabIndex={-1} ref={main} aria-label="Hymn index">
          <div className="search-anchor" ref={searchAnchor} />
          <div className="search-toolbar" ref={searchToolbar}>
            <form className="search" role="search" onSubmit={(event) => {
              event.preventDefault();
              search.current?.blur();
              if (hymnNumber && visible.length === 1) openHymn(visible[0], search.current);
            }}>
              <Search size={21} strokeWidth={1.8} aria-hidden="true" />
              <input type="search" placeholder="Title or number"
                aria-label="Search by title or hymn number"
                value={query} ref={search} onChange={(event) => changeQuery(event.target.value)}
                autoComplete="off" enterKeyHint="search" />
              {query ? (
                <button className="icon-button clear-search" type="button" aria-label="Clear search" onClick={() => { changeQuery(''); search.current.focus(); }}>
                  <X size={19} aria-hidden="true" />
                </button>
              ) : <kbd aria-hidden="true">/</kbd>}
            </form>
            {!galHiamOpen && <button type="button" className="categories-button" aria-haspopup="dialog"
              onClick={() => categories.current.showModal()}>
              <List size={19} aria-hidden="true" /> Categories
            </button>}
            {!galHiamOpen && !term && currentSection && (
              <p className="current-section" lang="ctd">{currentSection}</p>
            )}
          </div>
          <div className="index-heading">
            <p className="result-count" aria-live="polite">{visible.length} {visible.length === 1 ? 'hymn' : 'hymns'}</p>
            <OfflineStatus ready={offlineReady} />
          </div>
          {visible.length ? (
            [...groups].map(([section, sectionHymns]) => (
              <div className="hymn-group" key={section ?? 'gal-hiam'}>
                {section && <h2 className="hymn-group-title" id={sectionIds.get(section)} tabIndex={-1} lang="ctd">{section}</h2>}
                <ol className="hymn-list" role="list" aria-label={section ?? 'Hymns'}>
                  {sectionHymns.map((hymn) => (
                    <li className="hymn-row" key={hymn.id}>
                      <button className="hymn-open" type="button" onClick={(event) => openHymn(hymn, event.currentTarget)}>
                        <span className="hymn-number" aria-label={`Hymn ${hymn.number}`}>{String(hymn.number).padStart(2, '0')}</span>
                        <span className="hymn-row-copy">
                          <span className="hymn-title" lang={hymn.language}>{hymn.title}</span>
                          {!hymn.lyrics && <span className="lyrics-pending">Lyrics pending</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            ))
          ) : (
            <div className="empty">
              <Search size={26} aria-hidden="true" />
              <h2>No matching hymns</h2>
              <p>Try a different title or hymn number.</p>
              <button className="empty-button" type="button" onClick={() => {
                changeQuery('');
                search.current.focus();
              }}>Clear search</button>
            </div>
          )}
        </section>
      </main>

      <nav className="bottom-nav" aria-label="Hymnal">
        <button className="tab" type="button" aria-current={!galHiamOpen ? 'page' : undefined} onClick={() => openCollection(false)}>
          <span className="tab-icon"><House size={21} aria-hidden="true" /></span><span>Home</span>
        </button>
        <button className="tab" type="button" aria-current={galHiamOpen ? 'page' : undefined} onClick={() => openCollection(true)}>
          <img src={galHiamCover} width="19" height="28" alt="" /><span lang="ctd">Gal Hiam Labu</span>
        </button>
      </nav>
      {!galHiamOpen && <dialog className="detail categories-dialog" ref={categories} aria-labelledby="categories-title"
        onClick={(event) => { if (event.target === event.currentTarget) categories.current.close(); }}>
        <div className="categories-panel">
          <header className="categories-heading">
            <h2 id="categories-title">Categories</h2>
            <button type="button" className="icon-button" aria-label="Close categories" onClick={() => categories.current.close()}>
              <X size={22} aria-hidden="true" />
            </button>
          </header>
          <ul className="categories-list" role="list">
            {sections.map(({ name, count }) => (
              <li key={name}>
                <button type="button" aria-current={name === currentSection && !term ? 'location' : undefined} onClick={() => {
                  categories.current.close();
                  setQuery('');
                  setJumpSection(name);
                }}>
                  <span lang="ctd">{name}</span>
                  <span className="category-count">{count} {count === 1 ? 'hymn' : 'hymns'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </dialog>}
      {activeHymn && <HymnDetail hymn={activeHymn} onClose={closeHymn} onSearch={searchFromReader}
        textSize={textSize} onTextSizeChange={changeTextSize} dim={dim} onThemeChange={toggleTheme} offlineReady={offlineReady} />}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((error) => {
    console.error('Could not enable offline access.', error);
  });
}
