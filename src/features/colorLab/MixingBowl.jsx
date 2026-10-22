import React, { useEffect, useRef, useState } from 'react';
import Beaker, { surfaceBox, surfaceY } from './Beaker';
import meta from './beakers/beakers.json';
import { MIX_MS, bodyColor, drawSurface, phase, pours } from './marble.js';
import { CUP_ML } from './cups.js';
import s from './Beaker.module.css';

const KIND = 'beaker-600', M = meta[KIND];
// Shares add up to 100%, i.e. one full 200 ml beaker's worth poured in.
const POURED = CUP_ML;
const pct = (v, of) => `${v / of * 100}%`;

/** The 600 ml mixing beaker: every cup is poured in, a glass rod stirs, and the
 * surface marbles into exactly the recipe's colour (see marble.js). */
export default function MixingBowl({ blend }) {
  const canvasRef = useRef(null);
  const hexes = blend.ingredients.map(i => i.pigment.hex), parts = blend.ingredients.map(i => i.parts);
  const total = parts.reduce((a, b) => a + b, 0);
  const key = blend.ingredients.map(i => `${i.pigment.hex}:${i.parts}`).join('|');
  const animate = blend.status === 'mixing';
  const [t, setT] = useState(MIX_MS);
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!hexes.length || !animate || reduced) { setT(MIX_MS); return; }
    let frame = 0; const start = performance.now();
    setT(0);
    const tick = now => { const at = Math.min(MIX_MS, now - start); setT(at); if (at < MIX_MS) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [key, animate, blend.token]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hexes.length) return;
    const ctx = canvas.getContext('2d'), image = ctx.createImageData(canvas.width, canvas.height);
    drawSurface(image, hexes, parts, t); ctx.putImageData(image, 0, 0);
  }, [t, key]);
  if (!hexes.length) return <div className="tw:mx-auto tw:w-full tw:max-w-[250px]"><Beaker kind={KIND} animate={false} ml={0} /></div>;
  const { poured, swirl, plan } = { ...phase(t, hexes.length), plan: pours(hexes.length) };
  const fill = poured.reduce((a, p, j) => a + p * parts[j], 0) / total;
  const ml = POURED * fill, level = surfaceY(KIND, ml);
  const spin = t / 260, stirring = animate && swirl > 0 && swirl < 1;
  const tipX = M.cx + M.rx * .38 * Math.cos(spin), tipY = level + M.ry * .38 * Math.sin(spin);
  return <div className="tw:relative tw:mx-auto tw:w-full tw:max-w-[250px]">
    <Beaker kind={KIND} animate={false} ml={ml} color={t >= MIX_MS ? blend.result?.hex : bodyColor(hexes, parts, t)}
      surface={<canvas ref={canvasRef} width="200" height="48" className="tw:absolute" style={surfaceBox(KIND)} />} />
    {animate && hexes.map((hex, j) => <span key={`${blend.token}-${j}`} className={s.stream}
      style={{ background: hex, left: pct(M.cx + plan[j].x * M.rx * .8, M.width), height: pct(surfaceY(KIND, POURED * .6) + plan[j].y * M.ry, M.height), animationDelay: `${plan[j].start}ms`, animationDuration: `${plan[j].end - plan[j].start + 260}ms`, width: '2.2%' }} />)}
    <span aria-hidden="true" className="tw:pointer-events-none tw:absolute tw:w-[2.4%] tw:rounded-full tw:transition-opacity tw:duration-300"
      style={{ left: pct(tipX, M.width), top: pct(tipY - M.height * .62, M.height), height: '62%', opacity: stirring ? 1 : 0, transformOrigin: '50% 100%', transform: `translateX(-50%) rotate(${14 + 4 * Math.sin(spin)}deg)`, background: 'linear-gradient(90deg,#ffffff40,#ffffffd0 35%,#ffffff30 60%,#ffffff70)', boxShadow: '0 0 0 1px #ffffff26' }} />
  </div>;
}
