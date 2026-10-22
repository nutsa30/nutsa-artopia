import React from 'react';

// A brush stroke painted once with the lab's own engine (scripts/color-lab-swatches.mjs):
// a coverage mask tinted with the colour, then its shadow and gloss on top.
const files = import.meta.glob('./swatches/*.webp', { eager: true, import: 'default' });
const layer = (n, name) => files[`./swatches/stroke-${n}-${name}.webp`];
const fill = { WebkitMaskSize: '100% 100%', maskSize: '100% 100%' };
const variant = id => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 3; };

export default function Swatch({ hex, id, className = '' }) {
  const n = variant(id ?? hex), mask = `url(${layer(n, 'mask')})`;
  return <span aria-hidden="true" className={`tw:relative tw:block tw:aspect-[240/84] tw:w-full ${className}`}>
    <span className="tw:absolute tw:inset-0" style={{ background: hex, WebkitMaskImage: mask, maskImage: mask, ...fill }} />
    <img src={layer(n, 'shadow')} alt="" draggable="false" className="tw:absolute tw:inset-0 tw:size-full" />
    <img src={layer(n, 'gloss')} alt="" draggable="false" className="tw:absolute tw:inset-0 tw:size-full" />
  </span>;
}
