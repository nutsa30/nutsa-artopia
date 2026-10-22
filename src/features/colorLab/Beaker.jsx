import React, { useEffect, useState } from 'react';
import meta from './beakers/beakers.json';
import s from './Beaker.module.css';

// Griffin beakers rendered in Blender (scripts/color-lab-beakers.py): glass
// behind, the liquid as a mask + shadow + gloss tinted here with the paint
// colour, glass and printed scale in front. The camera is orthographic, so a
// level only moves the surface straight up or down.
const files = import.meta.glob('./beakers/*.webp', { eager: true, import: 'default' });
const layer = (kind, name) => files[`./beakers/${kind}-${name}.webp`];
const pct = (v, of) => `${v / of * 100}%`;

/** Where the surface centre sits (in image pixels) for a given volume. */
export function surfaceY(kind, ml) {
  const m = meta[kind];
  return m.y0 + (m.y1 - m.y0) * Math.max(0, Math.min(1, ml / m.ml));
}

function Liquid({ kind, part, color, children }) {
  const mask = `url(${layer(kind, `${part}-mask`)})`;
  return <>
    <div className="tw:absolute tw:inset-0" style={{ background: color, WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' }} />
    {children && <div className="tw:absolute tw:inset-0" style={{ WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' }}>{children}</div>}
    <img src={layer(kind, `${part}-shadow`)} alt="" draggable="false" className="tw:absolute tw:inset-0 tw:size-full" />
    <img src={layer(kind, `${part}-gloss`)} alt="" draggable="false" className="tw:absolute tw:inset-0 tw:size-full" />
  </>;
}

/** A falling stream of paint: it lands, flows while the level rises and its tail drops into the beaker
 * (not a bar that fades). Shading across makes it read as a round, glossy rope of paint. */
export function PourStream({ color, left, height, width = '3.2%', delay = 0, duration = 1050 }) {
  return <span className={s.stream} style={{ left, height, width, animationDelay: `${delay}ms`, animationDuration: `${duration}ms`,
    background: `linear-gradient(90deg,#0000003d,#0000 30%,#ffffff47 42%,#0000 58%,#00000052),${color}` }} />;
}

/** A beaker holding `ml` of paint. `surface` is drawn on the liquid top
 * (inside the meniscus), `pourKey` replays the pour when the paint changes. */
export default function Beaker({ kind = 'beaker-200', color, ml, pourKey, surface, animate = true, className = '' }) {
  const m = meta[kind];
  const [shown, setShown] = useState(animate ? 0 : ml);
  const [pouring, setPouring] = useState(false);
  useEffect(() => {
    if (!animate) { setShown(ml); return; }
    if (!color) { setShown(0); return; }
    setShown(0); setPouring(true);
    const start = requestAnimationFrame(() => requestAnimationFrame(() => setShown(ml)));
    const stop = setTimeout(() => setPouring(false), 1100);
    // Without animation frames (hidden tab) the level still arrives.
    const late = setTimeout(() => setShown(ml), 60);
    return () => { cancelAnimationFrame(start); clearTimeout(stop); clearTimeout(late); };
  }, [pourKey, color && 'filled']);
  useEffect(() => { if (!pouring) setShown(ml); }, [ml]);
  const y = surfaceY(kind, shown), filled = color && shown > 0;
  return <div className={`tw:relative tw:w-full tw:select-none ${className}`} style={{ aspectRatio: `${m.width} / ${m.height}` }}>
    <div className="tw:absolute tw:bottom-[1%] tw:left-[12%] tw:right-[12%] tw:h-[7%] tw:rounded-[50%] tw:bg-black/45 tw:blur-md" />
    <img src={layer(kind, 'back')} alt="" draggable="false" className="tw:absolute tw:inset-0 tw:size-full" />
    {color && <>
      <div className={`tw:absolute tw:inset-0 ${animate ? s.level : ""}`} style={{ clipPath: `inset(${pct(y, m.height)} 0 0 0)`, visibility: filled ? 'visible' : 'hidden' }}>
        <Liquid kind={kind} part="liquid" color={color} />
      </div>
      <div className={`tw:absolute tw:inset-0 ${animate ? s.level : ""}`} style={{ transform: `translateY(${pct(y - m.y1, m.height)})`, visibility: filled ? 'visible' : 'hidden' }}>
        <Liquid kind={kind} part="top" color={color}>
          {surface}
          {/* where the stream lands, rings spread on the surface (it moves up with the level) */}
          {pouring && <span key={`r${pourKey}`} className={s.ripple} style={{ left: pct(m.cx - m.rx * .25, m.width), top: pct(m.y1, m.height), width: pct(m.rx * .5, m.width), height: pct(m.ry * .5, m.height) }} />}
        </Liquid>
      </div>
      {pouring && <PourStream key={pourKey} color={color} left={pct(m.cx - m.rx * .25, m.width)} height={pct(surfaceY(kind, ml), m.height)} />}
    </>}
    <img src={layer(kind, 'front')} alt="" draggable="false" className="tw:absolute tw:inset-0 tw:size-full tw:pointer-events-none" />
  </div>;
}

/** The ellipse of the liquid surface, as percentages of the beaker image,
 * for placing something on it (at the nominal level; it moves with `surface`). */
export function surfaceBox(kind) {
  const m = meta[kind];
  return { left: pct(m.cx - m.rx, m.width), top: pct(m.y1 - m.ry, m.height), width: pct(m.rx * 2, m.width), height: pct(m.ry * 2, m.height) };
}

/** The glass itself (rim to base), for a click target that stops at the glass. */
export function glassBox(kind = 'beaker-200') {
  const m = meta[kind], top = m.rim - m.ry * 1.1;
  return { left: pct(m.left, m.width), top: pct(top, m.height), width: pct(m.right - m.left, m.width), height: pct(m.bottom + m.ry * .3 - top, m.height) };
}
