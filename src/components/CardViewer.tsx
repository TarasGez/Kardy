import { useCallback, useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { useBlobUrl } from '../lib/useBlobUrl';
import type { Card, CardSide } from '../lib/cards';

type Point = { x: number; y: number };
type Transform = { scale: number; x: number; y: number };
const MIN_SCALE = 1;
const MAX_SCALE = 6;
const clamp = (value: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function CardViewer({ card, onClose, onEdit }: { card: Card; onClose: () => void; onEdit: () => void }) {
  const [side, setSide] = useState<CardSide>('front');
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const points = useRef(new Map<number, Point>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const image = useBlobUrl(side === 'front' ? card.front : card.back);
  const reset = useCallback(() => { setTransform({ scale: 1, x: 0, y: 0 }); points.current.clear(); pinch.current = null; }, []);
  const flip = () => { setSide((current) => current === 'front' ? 'back' : 'front'); reset(); };
  const changeZoom = (amount: number) => setTransform((value) => {
    const scale = clamp(value.scale * amount);
    return scale === 1 ? { scale: 1, x: 0, y: 0 } : { ...value, scale };
  });

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function keys(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === '+') changeZoom(1.25);
      if (event.key === '-') changeZoom(0.8);
    }
    window.addEventListener('keydown', keys);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', keys); };
  }, [onClose]);

  function down(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (points.current.size === 2) {
      const [a, b] = [...points.current.values()];
      if (a && b) pinch.current = { distance: distance(a, b), scale: transform.scale };
    }
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const before = points.current.get(event.pointerId);
    if (!before) return;
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (points.current.size === 2 && pinch.current) {
      const [a, b] = [...points.current.values()];
      if (a && b && pinch.current.distance > 0) {
        const scale = clamp(pinch.current.scale * distance(a, b) / pinch.current.distance);
        setTransform((value) => scale === 1 ? { scale: 1, x: 0, y: 0 } : { ...value, scale });
      }
    } else if (points.current.size === 1) {
      setTransform((value) => value.scale === 1 ? value : { ...value, x: value.x + event.clientX - before.x, y: value.y + event.clientY - before.y });
    }
  }
  function up(event: PointerEvent<HTMLDivElement>) {
    points.current.delete(event.pointerId);
    pinch.current = null;
  }
  function wheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    changeZoom(event.deltaY < 0 ? 1.15 : 1 / 1.15);
  }

  return (
    <section className="viewer" role="dialog" aria-modal="true" aria-label={`Картка ${card.name}`}>
      <header className="viewer-bar">
        <button className="viewer-control" type="button" onClick={onClose} aria-label="Назад до карток">← <span>Назад</span></button>
        <strong className="viewer-title">{card.name}</strong>
        <button className="viewer-control" type="button" onClick={onEdit}>Змінити</button>
      </header>
      <div className="viewer-stage" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel} onDoubleClick={() => changeZoom(transform.scale > 1 ? 1 / transform.scale : 2)} aria-label="Фото картки; розведіть пальці для збільшення">
        {image ? <img className="viewer-image" src={image} alt={`${card.name}: ${side === 'front' ? 'лицьова' : 'зворотна'} сторона`} draggable={false} style={{ transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})` }} /> : null}
      </div>
      <footer className="viewer-footer">
        <div className="viewer-sides" aria-label="Сторони картки">
          <span>{side === 'front' ? 'Лицьова сторона' : 'Зворотна сторона'}</span>
          {card.back && <button className="viewer-control viewer-flip" type="button" onClick={flip}>Перевернути ↔</button>}
        </div>
        <div className="viewer-zoom" aria-label="Масштабування">
          <button className="viewer-control" type="button" onClick={() => changeZoom(0.8)} aria-label="Зменшити">−</button>
          <button className="viewer-control" type="button" onClick={reset} aria-label="Скинути масштаб">{Math.round(transform.scale * 100)}%</button>
          <button className="viewer-control" type="button" onClick={() => changeZoom(1.25)} aria-label="Збільшити">+</button>
        </div>
      </footer>
    </section>
  );
}
