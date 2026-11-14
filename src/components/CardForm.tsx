import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { createCard, normalizedName, userError, validateImage, type Card, type CardSide } from '../lib/cards';
import { useBlobUrl } from '../lib/useBlobUrl';

type Props = { initial: Card | null; onSave: (card: Card) => Promise<void>; onClose: () => void };

function PhotoField({ side, photo, onFile, onRemove }: {
  side: CardSide;
  photo: Blob | null;
  onFile: (file: File) => void;
  onRemove?: () => void;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const preview = useBlobUrl(photo);
  const label = side === 'front' ? 'Лицьова сторона' : 'Зворотна сторона';
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) onFile(file);
  }
  return (
    <section className="photo-field" aria-label={label}>
      <div className="photo-field-title">
        <strong>{label}</strong>
        {side === 'front' ? <span className="required-note">Обов’язково</span> : <span className="muted">Необов’язково</span>}
      </div>
      <div className="photo-drop">
        {preview ? <img src={preview} alt={`Фото: ${label.toLowerCase()}`} /> : (
          <div className="photo-placeholder"><span className="photo-placeholder-icon" aria-hidden="true">▧</span><span>Фото картки</span></div>
        )}
      </div>
      <div className="photo-actions">
        <button type="button" className="button button-secondary" onClick={() => camera.current?.click()}>Камера</button>
        <button type="button" className="button button-secondary" onClick={() => gallery.current?.click()}>Галерея</button>
        {photo && onRemove ? <button type="button" className="button button-quiet" onClick={onRemove}>Прибрати</button> : null}
      </div>
      <input ref={camera} type="file" accept="image/*" capture="environment" onChange={handleChange} className="visually-hidden" tabIndex={-1} aria-label={`Зняти фото: ${label}`} />
      <input ref={gallery} type="file" accept="image/*" onChange={handleChange} className="visually-hidden" tabIndex={-1} aria-label={`Вибрати фото: ${label}`} />
    </section>
  );
}

export function CardForm({ initial, onSave, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [front, setFront] = useState<Blob | null>(initial?.front ?? null);
  const [back, setBack] = useState<Blob | null>(initial?.back ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function choose(side: CardSide, file: File) {
    try {
      validateImage(file);
      if (side === 'front') setFront(file);
      else setBack(file);
      setError(null);
    } catch (err) { setError(userError(err)); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    try {
      const validName = normalizedName(name);
      if (!front) throw new Error('Додайте фото лицьової сторони.');
      const card = initial ? { ...initial, name: validName, front, back, updatedAt: Date.now() } : createCard(validName, front, back);
      setSaving(true);
      setError(null);
      await onSave(card);
    } catch (err) {
      setError(userError(err));
    } finally { setSaving(false); }
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="editor" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <div className="editor-head">
          <h2 id="editor-title">{initial ? 'Редагувати картку' : 'Нова картка'}</h2>
          <button type="button" className="icon-button" aria-label="Закрити" onClick={onClose} disabled={saving}>×</button>
        </div>
        <form onSubmit={(event) => { void submit(event); }}>
          <label className="field-label" htmlFor="store-name">Назва магазину</label>
          <input id="store-name" type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Наприклад, Магазин" maxLength={100} autoFocus autoComplete="off" required />
          <div className="photos">
            <PhotoField side="front" photo={front} onFile={(file) => choose('front', file)} />
            <PhotoField side="back" photo={back} onFile={(file) => choose('back', file)} onRemove={() => setBack(null)} />
          </div>
          {error ? <p className="error" role="alert">{error}</p> : null}
          <div className="form-footer">
            <button type="button" className="button button-secondary" onClick={onClose} disabled={saving}>Скасувати</button>
            <button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Збереження…' : 'Зберегти'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
