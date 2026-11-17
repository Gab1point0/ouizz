import type { Zone } from '../types';

/** Dessine les zones par-dessus l'image (SVG étiré sur l'image, coordonnées 0..100). */
export function ZoneShapes({ zones, ar, selected, draft, className }: {
  zones: Zone[];
  ar?: number;
  selected?: number;
  draft?: [number, number][];
  className?: string;
}) {
  const ratio = ar ?? zones.find((z) => z.ar)?.ar ?? 1;
  return (
    <svg className={`zone-svg ${className ?? ''}`} viewBox="0 0 100 100" preserveAspectRatio="none">
      {zones.map((z, i) => {
        const cls = `zone-shape ${i === selected ? 'sel' : ''}`;
        const shape = z.shape ?? 'circle';
        if (shape === 'rect') {
          const w = (z.w ?? 0) * 100, h = (z.h ?? 0) * 100;
          return <rect key={i} className={cls} x={z.x * 100 - w / 2} y={z.y * 100 - h / 2} width={w} height={h} vectorEffect="non-scaling-stroke" />;
        }
        if (shape === 'poly') {
          return <polygon key={i} className={cls} points={(z.pts ?? []).map(([x, y]) => `${x * 100},${y * 100}`).join(' ')} vectorEffect="non-scaling-stroke" />;
        }
        return <ellipse key={i} className={cls} cx={z.x * 100} cy={z.y * 100} rx={z.r * 100} ry={(z.r * 100) / (z.ar ?? ratio)} vectorEffect="non-scaling-stroke" />;
      })}
      {draft && draft.length > 0 && (
        <>
          <polyline className="zone-draft" points={draft.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')} vectorEffect="non-scaling-stroke" />
          {draft.length < 60 && draft.map(([x, y], i) => (
            <ellipse key={i} className={`zone-vertex ${i === 0 ? 'first' : ''}`} cx={x * 100} cy={y * 100} rx={0.9} ry={0.9 / ratio} />
          ))}
        </>
      )}
    </svg>
  );
}
