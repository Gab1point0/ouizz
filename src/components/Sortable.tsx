// Glisser-déposer maison (souris + doigt, sans bibliothèque).
// - <Sortable> : réordonner une liste ou une grille (l'élément suit le pointeur, les autres s'écartent en douceur).
// - useDragTo : glisser un élément sur une cible (data-drop="…"), ex. associer des paires, ranger dans des catégories.
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

const NO_DRAG = 'input, textarea, select, button, a, [contenteditable="true"], [data-nodrag]';

/** Fait défiler la page (ou le conteneur) quand le pointeur s'approche d'un bord pendant un glisser. */
function autoScroll(el: HTMLElement | null, y: number) {
  const edge = 70;
  const speed = y < edge ? -(edge - y) / 4 : y > innerHeight - edge ? (y - (innerHeight - edge)) / 4 : 0;
  if (!speed) return;
  let p = el?.parentElement ?? null;
  while (p && p !== document.body) {
    const s = getComputedStyle(p).overflowY;
    if ((s === 'auto' || s === 'scroll') && p.scrollHeight > p.clientHeight) { p.scrollTop += speed; return; }
    p = p.parentElement;
  }
  window.scrollBy(0, speed);
}

export interface HandleProps {
  onPointerDown: (e: React.PointerEvent) => void;
  className: string;
  'data-drag-handle': true;
}

/**
 * Liste réordonnable. `render(item, index, handle)` : étaler `handle` sur la poignée (⠿).
 * Sans `withHandle`, tout l'élément sert de poignée (sauf champs et boutons).
 */
export function Sortable<T extends { id: string }>({ items, onChange, render, className, style, withHandle, itemClassName, itemStyle }: {
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, index: number, handle: HandleProps) => ReactNode;
  className?: string;
  style?: CSSProperties;
  withHandle?: boolean;
  itemClassName?: string | ((item: T, index: number) => string);
  itemStyle?: (item: T, index: number) => CSSProperties | undefined;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [order, setOrder] = useState<string[] | null>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const st = useRef({ id: '', grabX: 0, grabY: 0, px: 0, py: 0, tx: 0, ty: 0, order: [] as string[], prev: new Map<string, DOMRect>(), raf: 0 });

  const byId = new Map(items.map((x) => [x.id, x]));
  const shown = order ? order.map((id) => byId.get(id)).filter(Boolean) as T[] : items;

  const place = () => {
    const s = st.current;
    const el = els.current.get(s.id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = r.left - s.tx, top = r.top - s.ty; // position « au repos »
    s.tx = s.px - s.grabX - left;
    s.ty = s.py - s.grabY - top;
    el.style.transform = `translate(${s.tx}px, ${s.ty}px)`;
  };

  // FLIP : après un réordonnancement, les autres éléments glissent vers leur nouvelle place
  useLayoutEffect(() => {
    const s = st.current;
    if (!order) return;
    for (const [id, el] of els.current) {
      if (id === s.id) continue;
      const before = s.prev.get(id);
      if (!before) continue;
      const now = el.getBoundingClientRect();
      const dx = before.left - now.left, dy = before.top - now.top;
      if (!dx && !dy) continue;
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      void el.offsetWidth;
      el.style.transition = 'transform .18s ease';
      el.style.transform = '';
    }
    place();
  }, [order]);

  const onMove = (e: PointerEvent) => {
    const s = st.current;
    s.px = e.clientX; s.py = e.clientY;
    const me = els.current.get(s.id);
    if (!me) return;
    const mr = me.getBoundingClientRect();
    const mine = { left: mr.left - s.tx, top: mr.top - s.ty, right: mr.right - s.tx, bottom: mr.bottom - s.ty };
    const insideMine = s.px >= mine.left && s.px <= mine.right && s.py >= mine.top && s.py <= mine.bottom;
    if (!insideMine) {
      for (const id of s.order) {
        if (id === s.id) continue;
        const r = els.current.get(id)?.getBoundingClientRect();
        if (r && s.px >= r.left && s.px <= r.right && s.py >= r.top && s.py <= r.bottom) {
          const next = s.order.filter((x) => x !== s.id);
          const to = s.order.indexOf(id);
          next.splice(to, 0, s.id);
          s.prev = new Map([...els.current].map(([k, el]) => [k, el.getBoundingClientRect()]));
          s.order = next;
          setOrder(next);
          return;
        }
      }
    }
    place();
  };

  const onUp = () => {
    const s = st.current;
    cancelAnimationFrame(s.raf);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    const el = els.current.get(s.id);
    if (el) { el.style.transition = 'transform .15s ease'; el.style.transform = ''; }
    const changed = s.order.join() !== items.map((x) => x.id).join();
    const next = s.order.map((id) => byId.get(id)).filter(Boolean) as T[];
    s.id = '';
    setDragId(null);
    setOrder(null);
    if (changed) onChange(next);
  };

  const start = (id: string) => (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement;
    if (!target.closest('[data-drag-handle]') && target.closest(NO_DRAG)) return;
    const el = els.current.get(id);
    if (!el) return;
    e.preventDefault();
    const r = el.getBoundingClientRect();
    const s = st.current;
    Object.assign(s, { id, grabX: e.clientX - r.left, grabY: e.clientY - r.top, px: e.clientX, py: e.clientY, tx: 0, ty: 0, order: items.map((x) => x.id) });
    el.style.transition = 'none';
    setDragId(id);
    setOrder(s.order);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    const tick = () => { autoScroll(el, s.py); place(); s.raf = requestAnimationFrame(tick); };
    s.raf = requestAnimationFrame(tick);
  };

  return (
    <div className={`sortable ${dragId ? 'is-sorting' : ''} ${className ?? ''}`} style={style}>
      {shown.map((it, i) => {
        const handle: HandleProps = { onPointerDown: start(it.id), className: 'drag-handle', 'data-drag-handle': true };
        const extra = typeof itemClassName === 'function' ? itemClassName(it, i) : itemClassName ?? '';
        return (
          <div key={it.id} ref={(el) => { if (el) els.current.set(it.id, el); else els.current.delete(it.id); }}
            className={`sortable-item ${extra} ${dragId === it.id ? 'sorting' : ''} ${withHandle ? '' : 'grab-anywhere'}`}
            style={itemStyle?.(it, i)}
            onPointerDown={withHandle ? undefined : start(it.id)}>
            {render(it, i, handle)}
          </div>
        );
      })}
    </div>
  );
}

/** Poignée ⠿ standard. */
export function Grip(props: HandleProps & { title?: string }) {
  return <span {...props} className={`drag-handle ${props.className}`} title={props.title ?? 'Glisser pour déplacer'} aria-label="Glisser pour déplacer">⠿</span>;
}

/**
 * Glisser un élément vers une cible marquée data-drop="<id>".
 * `drag(id)` donne les props à mettre sur l'élément déplaçable ; `over` = cible survolée.
 * Un simple appui (sans glisser) appelle onTap.
 */
export function useDragTo(onDrop: (dragId: string, dropId: string) => void, onTap?: (dragId: string) => void) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const st = useRef({ id: '', el: null as HTMLElement | null, x0: 0, y0: 0, moved: false, over: null as string | null });

  const drag = (id: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const el = e.currentTarget as HTMLElement;
      e.preventDefault();
      const s = st.current;
      Object.assign(s, { id, el, x0: e.clientX, y0: e.clientY, moved: false, over: null });
      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - s.x0, dy = ev.clientY - s.y0;
        if (!s.moved && Math.hypot(dx, dy) < 6) return;
        if (!s.moved) { s.moved = true; setDragging(id); el.style.transition = 'none'; el.style.zIndex = '50'; el.style.position = 'relative'; }
        el.style.transform = `translate(${dx}px, ${dy}px) scale(1.05)`;
        el.style.pointerEvents = 'none';
        const t = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)?.closest('[data-drop]') as HTMLElement | null;
        const o = t?.dataset.drop ?? null;
        if (o !== s.over) { s.over = o; setOver(o); }
        autoScroll(el, ev.clientY);
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        Object.assign(el.style, { transition: 'transform .15s ease', transform: '', pointerEvents: '', zIndex: '' });
        if (s.moved && s.over) onDrop(s.id, s.over);
        else if (!s.moved) onTap?.(s.id);
        setDragging(null);
        setOver(null);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    },
    className: `drag-src ${dragging === id ? 'dragging' : ''}`,
  });

  /** Props d'une cible. */
  const drop = (id: string) => ({ 'data-drop': id, className: `drop-target ${over === id ? 'drop-over' : ''} ${dragging ? 'drop-ready' : ''}` });

  return { drag, drop, dragging, over };
}
