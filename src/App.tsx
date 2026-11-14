import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { CardForm } from './components/CardForm';
import { CardViewer } from './components/CardViewer';
import { exportBackup, parseBackup } from './lib/backup';
import { userError, type Card } from './lib/cards';
import { deleteCard, listCards, replaceCards, saveCard } from './lib/storage';
import { useBlobUrl } from './lib/useBlobUrl';

type EditorState = { mode: 'new' } | { mode: 'edit'; card: Card } | null;
const collator = new Intl.Collator('uk', { sensitivity: 'base', numeric: true });

function CardTile({ card, onOpen, onEdit, onDelete, disabled }: {
  card: Card;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const src = useBlobUrl(card.front);
  return <article className="card-tile">
    <button type="button" className="card-open" disabled={disabled} onClick={onOpen} aria-label={`Відкрити картку ${card.name}`}>
      <div className="card-photo">{src ? <img src={src} alt="" loading="lazy" /> : null}</div>
      <span className="card-name">{card.name}</span>
      <span className="card-details">{card.back ? 'Дві сторони' : 'Одна сторона'} <span aria-hidden="true">↗</span></span>
    </button>
    <div className="card-actions">
      <button type="button" disabled={disabled} onClick={onEdit} aria-label={`Редагувати ${card.name}`}>Редагувати</button>
      <button type="button" disabled={disabled} onClick={onDelete} aria-label={`Видалити ${card.name}`} className="danger-text">Видалити</button>
    </div>
  </article>;
}

function Logo() {
  return <div className="brand"><span className="brand-mark" aria-hidden="true"><span className="brand-card" /></span><span>Kardy</span></div>;
}

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => setCards(await listCards()), []);
  useEffect(() => {
    void reload().catch((err: unknown) => setError(userError(err))).finally(() => setLoading(false));
  }, [reload]);

  const filtered = useMemo(() => cards.filter((card) => card.name.toLocaleLowerCase('uk').includes(query.trim().toLocaleLowerCase('uk'))).sort((a, b) => collator.compare(a.name, b.name)), [cards, query]);
  const viewed = cards.find((card) => card.id === viewId) ?? null;

  async function save(card: Card) {
    await saveCard(card);
    await reload();
    setEditor(null);
    setNotice('Картку збережено.');
  }
  async function remove(card: Card) {
    if (!window.confirm(`Видалити картку «${card.name}»? Це неможливо скасувати.`)) return;
    setError(null);
    try {
      await deleteCard(card.id);
      await reload();
      setNotice('Картку видалено.');
    } catch (err) { setError(userError(err)); }
  }
  async function backup() {
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      const result = await exportBackup(cards);
      const url = URL.createObjectURL(result);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `kardy-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setNotice('Резервну копію підготовлено. Збережіть файл у «Файли».');
    } catch (err) { setError(userError(err)); }
    finally { setWorking(false); }
  }
  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || working) return;
    setWorking(true);
    setError(null);
    try {
      const restored = await parseBackup(file);
      if (cards.length && !window.confirm(`Замінити всі ${cards.length} наявних карток на ${restored.length} із резервної копії? Поточні дані будуть втрачені.`)) return;
      await replaceCards(restored);
      await reload();
      setQuery('');
      setNotice(`Відновлено карток: ${restored.length}.`);
    } catch (err) { setError(userError(err)); }
    finally { setWorking(false); }
  }

  return <>
    <div className="app-shell">
      <header className="site-header">
        <Logo />
        <button className="button button-primary add-main" type="button" disabled={working || loading} onClick={() => { setEditor({ mode: 'new' }); setNotice(null); }}>+ <span>Додати картку</span></button>
      </header>
      <main className="main-content">
        <section className="welcome">
          <div><p className="eyebrow">Ваші картки · завжди поруч</p><h1>Мої картки</h1><p className="intro">Улюблені магазини — без зайвого пластику.</p></div>
          <span className="counter">{cards.length} {cards.length === 1 ? 'картка' : 'карток'}</span>
        </section>
        <div className="toolbar">
          <label className="search-box"><span aria-hidden="true">⌕</span><input type="search" placeholder="Знайти магазин…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Пошук за назвою магазину" /></label>
          <div className="backup-actions">
            <button className="button button-secondary" type="button" disabled={working || loading} onClick={() => { void backup(); }}>Експорт</button>
            <button className="button button-secondary" type="button" disabled={working || loading} onClick={() => fileRef.current?.click()}>Імпорт</button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="visually-hidden" onChange={(event) => { void restore(event); }} aria-label="Імпорт резервної копії" />
          </div>
        </div>
        {error ? <div className="message error" role="alert">{error}<button type="button" onClick={() => setError(null)} aria-label="Закрити повідомлення">×</button></div> : null}
        {notice ? <div className="message success" role="status">{notice}<button type="button" onClick={() => setNotice(null)} aria-label="Закрити повідомлення">×</button></div> : null}
        {loading ? <div className="empty-state"><p>Завантаження карток…</p></div> : filtered.length ? (
          <div className="cards-grid">{filtered.map((card) => <CardTile key={card.id} card={card} onOpen={() => setViewId(card.id)} onEdit={() => setEditor({ mode: 'edit', card })} onDelete={() => { void remove(card); }} disabled={working} />)}</div>
        ) : (
          <div className="empty-state"><div className="empty-symbol" aria-hidden="true"><span /></div>
            <h2>{query ? 'Нічого не знайдено' : 'Тут будуть ваші картки'}</h2>
            <p>{query ? 'Спробуйте іншу назву магазину.' : 'Додайте фото бонусної картки, щоб вона завжди була під рукою.'}</p>
            {!query && <button type="button" className="button button-primary" onClick={() => setEditor({ mode: 'new' })}>+ Додати першу картку</button>}
          </div>
        )}
      </main>
      <footer className="site-footer"><span>Kardy</span><span>Усі фото зберігаються лише на цьому пристрої.</span></footer>
    </div>
    {viewed && <CardViewer card={viewed} onClose={() => setViewId(null)} onEdit={() => { setEditor({ mode: 'edit', card: viewed }); setViewId(null); }} />}
    {editor && <CardForm key={editor.mode === 'new' ? 'new' : editor.card.id} initial={editor.mode === 'edit' ? editor.card : null} onSave={save} onClose={() => setEditor(null)} />}
  </>;
}
