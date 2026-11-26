import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, Check, ChevronDown, ChevronLeft, House, Info, List, Search, X } from 'lucide-react';
import { galHiamHymns, hymns } from './hymns';
import InstallButton from './InstallButton';
import { assortedPrayers, confessionPrayers, dailyPrayers, funeralPrayers, houseBlessingPrayers, marianPrayers, massPrayers, occasionPrayers, stationsOfTheCross, wordServicePrayers } from './prayers';
import './styles.css';

const galHiamCover = '/gal-hiam-book.png';
const prayersByNumber = { 1: assortedPrayers, 2: marianPrayers, 3: dailyPrayers, 4: occasionPrayers, 5: houseBlessingPrayers, 6: massPrayers, 7: wordServicePrayers, 8: confessionPrayers, 9: stationsOfTheCross, 10: funeralPrayers };
const prayerTitles = [
  'Thungetna tuam tuam',
  'Tonu Maria tung thungetna',
  'Nisim thungetna',
  'Hunzui thungetna',
  'Inn thupha piakna',
  'Missa Biakpiakna',
  'Athu tawh Biakpiakna',
  'Mawhsut dan',
  'Singlamteh lam Zuih na',
  'Misi tawh kisai thungetna',
];
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

function collectionFromUrl() {
  const collection = new URLSearchParams(window.location.search).get('collection');
  return collection === 'gal-hiam' || collection === 'thungetna' ? collection : 'home';
}

function OfflineStatus({ ready }) {
  return ready && <span className="offline-status"><Check size={15} aria-hidden="true" /> Available offline</span>;
}

function HymnLyrics({ lyrics, language }) {
  return (
    <>
      <p className="hymn-music">
        {lyrics.key && <span>Key {lyrics.key}</span>}
        {lyrics.doh && <span>Doh is {lyrics.doh}</span>}
        {lyrics.expression && <span>{lyrics.expression}</span>}
        {lyrics.timing !== undefined && <span>{lyrics.timing ? `Timing ${lyrics.timing}` : 'Timing'}</span>}
      </p>
      <div className="hymn-lyrics">
        {lyrics.stanzas.map(({ label, lines }) => (
          <div className={`stanza ${label === 'Chorus' ? 'chorus' : ''}`} key={label}>
            <h3 className="stanza-label">{label}</h3>
            <p lang={language}>{lines.join('\n')}</p>
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
          ? <HymnLyrics lyrics={hymn.lyrics} language={hymn.language} />
          : <p className="detail-message">Lyrics are currently unavailable for this hymn.</p>}
      </div>
    </dialog>
  );
}

function App() {
  const [activeCollection, setActiveCollection] = useState(collectionFromUrl);
  const galHiamOpen = activeCollection === 'gal-hiam';
  const prayersOpen = activeCollection === 'thungetna';
  const homeOpen = activeCollection === 'home';
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
  const about = useRef(null);
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
    if (!homeOpen || term) return;
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
  }, [homeOpen, term]);

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
      const nextCollection = collectionFromUrl();
      if (nextCollection === activeCollection) return;
      setActiveHymn(null);
      categories.current?.close();
      setCurrentSection(null);
      setQuery('');
      setActiveCollection(nextCollection);
    }
    window.addEventListener('popstate', restoreCollection);
    return () => window.removeEventListener('popstate', restoreCollection);
  }, [activeCollection]);

  function openCollection(nextCollection) {
    if (nextCollection !== activeCollection) {
      const url = new URL(window.location.href);
      if (nextCollection !== 'home') url.searchParams.set('collection', nextCollection);
      else url.searchParams.delete('collection');
      url.hash = '';
      window.history.pushState(null, '', url);
      setActiveCollection(nextCollection);
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
  const prayerEntries = prayerTitles.map((title, index) => ({ title, number: index + 1 }));
  const collection = prayersOpen ? prayerEntries : galHiamOpen ? galHiamHymns : hymns;
  const visible = collection.filter((hymn) => {
    return hymnNumber
      ? hymn.number === Number(hymnNumber)
      : normalize(hymn.title).includes(term);
  });
  const groups = new Map();
  for (const hymn of prayersOpen ? [] : visible) {
    const section = hymn.section ?? null;
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section).push(hymn);
  }

  return (
    <>
      <a className="skip-link" href="#hymn-index">Skip to {prayersOpen ? 'prayer' : 'hymn'} index</a>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href={window.location.pathname} onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
            event.preventDefault();
            openCollection('home');
          }}>
            <img src="/church-logo-192.png" width="42" height="42" alt="" />
            <span>Zomi Catholic</span>
          </a>
          <nav className="desktop-nav" aria-label="Hymnal">
            <button type="button" className="nav-button" aria-current={homeOpen ? 'page' : undefined} onClick={() => openCollection('home')}>
              <BookOpen size={17} aria-hidden="true" /> Hymn index
            </button>
            <button type="button" className="nav-button" aria-current={galHiamOpen ? 'page' : undefined} onClick={() => openCollection('gal-hiam')}>
              <img src={galHiamCover} width="15" height="22" alt="" /> <span lang="ctd">Gal Hiam Labu</span>
            </button>
            <button type="button" className="nav-button" aria-current={prayersOpen ? 'page' : undefined} onClick={() => openCollection('thungetna')}>
              <span aria-hidden="true">🙏</span> <span lang="ctd">Thungetna</span>
            </button>
          </nav>
          <InstallButton />
        </div>
      </header>

      <main className="page" id="top">
        <section className={`cover${galHiamOpen ? ' cover-gal-hiam' : ''}${prayersOpen ? ' cover-thungetna' : ''}`} aria-labelledby="cover-title">
          <div className="cover-copy">
            {prayersOpen ? <h1 id="cover-title" lang="ctd">Thungetna</h1> : galHiamOpen
              ? <h1 id="cover-title" lang="ctd">Gal Hiam Phatna Labu</h1>
              : <h1 id="cover-title">Zomi <span>Catholic</span></h1>}
          </div>
          {galHiamOpen
            ? <img className="collection-logo" src={galHiamCover} alt="" width="56" height="81" />
            : !prayersOpen && <div className="cover-art" aria-hidden="true">
                <div className="window-frame"><div className="window-image" /></div>
              </div>}
        </section>
        <section className="index" id="hymn-index" tabIndex={-1} ref={main} aria-label={prayersOpen ? 'Prayer index' : 'Hymn index'}>
          <div className="search-anchor" ref={searchAnchor} />
          <div className="search-toolbar" ref={searchToolbar}>
            <form className="search" role="search" onSubmit={(event) => {
              event.preventDefault();
              search.current?.blur();
              if (!prayersOpen && hymnNumber && visible.length === 1) openHymn(visible[0], search.current);
            }}>
              <Search size={21} strokeWidth={1.8} aria-hidden="true" />
              <input type="search" placeholder="Title or number"
                aria-label={prayersOpen ? 'Search by title or prayer number' : 'Search by title or hymn number'}
                value={query} ref={search} onChange={(event) => changeQuery(event.target.value)}
                autoComplete="off" enterKeyHint="search" />
              {query ? (
                <button className="icon-button clear-search" type="button" aria-label="Clear search" onClick={() => { changeQuery(''); search.current.focus(); }}>
                  <X size={19} aria-hidden="true" />
                </button>
              ) : <kbd aria-hidden="true">/</kbd>}
            </form>
            {homeOpen && <button type="button" className="categories-button" aria-haspopup="dialog"
              onClick={() => categories.current.showModal()}>
              <List size={19} aria-hidden="true" /> Categories
            </button>}
            {homeOpen && !term && currentSection && (
              <p className="current-section" lang="ctd">{currentSection}</p>
            )}
          </div>
          <div className="index-heading">
            <p className="result-count" aria-live="polite">{visible.length} {prayersOpen ? 'prayer' : 'hymn'}{visible.length === 1 ? '' : 's'}</p>
            <OfflineStatus ready={offlineReady} />
          </div>
          {visible.length ? (
            prayersOpen ? (
              <ol className="hymn-list prayer-titles" role="list" lang="ctd" aria-label="Thungetna">
                {visible.map(({ title, number }) => {
                  const row = (
                    <>
                      <span className="hymn-number">{String(number).padStart(2, '0')}</span>
                      <span className="hymn-title">{title}</span>
                    </>
                  );
                  return (
                    <li className="hymn-row" key={number}>
                      {prayersByNumber[number] ? (
                        <details>
                          <summary className="hymn-open">{row}<ChevronDown size={18} aria-hidden="true" /></summary>
                          <div className="prayer-content">
                            {prayersByNumber[number].map(({ title: prayerTitle, subtitle, text, illustration }, index) => {
                              const isStation = number === 9;
                              const heading = isStation ? (
                                <span className="station-heading">
                                  <span>{index + 1}.</span>{' '}<span>{prayerTitle}</span>
                                </span>
                              ) : prayerTitle;
                              const content = (
                                <>
                                  {subtitle && <h4>{subtitle}</h4>}
                                  {text?.split('\n\n').map((paragraph, paragraphIndex) => (
                                    <p key={paragraphIndex}>
                                      {paragraph.split('\n').map((line, lineIndex) => (
                                        <span className="prayer-line" key={lineIndex}>{line}</span>
                                      ))}
                                    </p>
                                  ))}
                                  {illustration && (
                                    <img className="prayer-illustration" src={illustration.src} alt={illustration.alt} lang={illustration.lang} loading="lazy" />
                                  )}
                                </>
                              );
                              return (
                                <section className="prayer" key={`${index}-${prayerTitle}`}>
                                  {isStation && text ? (
                                    <details>
                                      <summary className="station-summary">
                                        {heading}<ChevronDown size={16} aria-hidden="true" />
                                      </summary>
                                      {content}
                                    </details>
                                  ) : (
                                    <>
                                      <h3>{heading}</h3>
                                      {content}
                                    </>
                                  )}
                                </section>
                              );
                            })}
                          </div>
                        </details>
                      ) : <div className="hymn-open">{row}</div>}
                    </li>
                  );
                })}
              </ol>
            ) :
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
              <h2>No matching {prayersOpen ? 'prayers' : 'hymns'}</h2>
              <p>Try a different title or {prayersOpen ? 'prayer' : 'hymn'} number.</p>
              <button className="empty-button" type="button" onClick={() => {
                changeQuery('');
                search.current.focus();
              }}>Clear search</button>
            </div>
          )}
        </section>
      </main>

      <nav className="bottom-nav" aria-label="Hymnal">
        <button className="tab" type="button" aria-current={homeOpen ? 'page' : undefined} onClick={() => openCollection('home')}>
          <span className="tab-icon"><House size={21} aria-hidden="true" /></span><span>Home</span>
        </button>
        <button className="tab" type="button" aria-current={galHiamOpen ? 'page' : undefined} onClick={() => openCollection('gal-hiam')}>
          <img src={galHiamCover} width="19" height="28" alt="" /><span lang="ctd">Gal Hiam Labu</span>
        </button>
        <button className="tab" type="button" aria-current={prayersOpen ? 'page' : undefined} onClick={() => openCollection('thungetna')}>
          <span className="tab-icon prayer-icon" aria-hidden="true">🙏</span><span lang="ctd">Thungetna</span>
        </button>
        <button className="tab" type="button" aria-haspopup="dialog" onClick={() => about.current.showModal()}>
          <span className="tab-icon"><Info size={21} aria-hidden="true" /></span><span>About</span>
        </button>
      </nav>
      <dialog className="detail categories-dialog" ref={about} aria-labelledby="about-title"
        onClick={(event) => { if (event.target === event.currentTarget) about.current.close(); }}>
        <div className="categories-panel">
          <header className="categories-heading">
            <h2 id="about-title">About Zomi Catholic</h2>
            <button type="button" className="icon-button" aria-label="Close About" onClick={() => about.current.close()}>
              <X size={22} aria-hidden="true" />
            </button>
          </header>
          <p>Search and read hymns from the Zomi Catholic hymnal and Gal Hiam Labu.</p>
          <p>developed by Noel Muang</p>
          <div className="about-links">
            <div>
              <a href="mailto:ksmuang20@gmail.com?subject=Zomi%20Catholic%20Feedback">Send feedback</a>
              <p className="feedback-note">Please include the hymnal name, hymn number, and the line that needs correcting.</p>
            </div>
            <a href="mailto:ksmuang20@gmail.com">Contact us</a>
          </div>
        </div>
      </dialog>
      {homeOpen && <dialog className="detail categories-dialog" ref={categories} aria-labelledby="categories-title"
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
