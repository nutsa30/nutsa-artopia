import React, { useEffect, useRef, useState } from 'react';
import Beaker, { PourStream, surfaceBox, surfaceY } from './Beaker';
import meta from './beakers/beakers.json';
import { MIX_MS, bodyColor, drawSurface, phase, pours } from './marble.js';
import { CUP_ML } from './cups.js';

const KIND = 'beaker-600', M = meta[KIND];
// Shares add up to 100%, i.e. one full 200 ml beaker's worth poured in.
const POURED = CUP_ML;
const pct = (v, of) => `${v / of * 100}%`;

/** The 600 ml mixing beaker: every cup is poured in, a glass rod stirs, and the
 * surface marbles into exactly the recipe's colour (see marble.js). */
export default function MixingBowl({ blend, children }) {
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
  // children = the mix button: it sits on the front of the beaker, over the thick base, so it is part of the vessel
  // and always in sight (owner, 2026-10-22: under the beaker it was too low to notice)
  const action = children && <div className="tw:absolute tw:left-1/2 tw:z-10 tw:-translate-x-1/2 tw:-translate-y-1/2" style={{ top: pct(M.bottom - M.ry * .55, M.height) }}>{children}</div>;
  if (!hexes.length) return <div className="tw:relative tw:mx-auto tw:w-full tw:max-w-[270px]"><Beaker kind={KIND} animate={false} ml={0} />{action}</div>;
  const { poured, swirl, plan } = { ...phase(t, hexes.length), plan: pours(hexes.length) };
  const fill = poured.reduce((a, p, j) => a + p * parts[j], 0) / total;
  const ml = POURED * fill, level = surfaceY(KIND, ml);
  const spin = t / 260, stirring = animate && swirl > 0 && swirl < 1;
  const tipX = M.cx + M.rx * .38 * Math.cos(spin), tipY = level + M.ry * .38 * Math.sin(spin);
  const body = t >= MIX_MS ? blend.result?.hex : bodyColor(hexes, parts, t);
  return <div className="tw:relative tw:mx-auto tw:w-full tw:max-w-[270px]">
    <Beaker kind={KIND} animate={false} ml={ml} color={body}
      surface={<canvas ref={canvasRef} width="200" height="48" className="tw:absolute" style={surfaceBox(KIND)} />} />
    {animate && hexes.map((hex, j) => <PourStream key={`${blend.token}-${j}`} color={hex} width="2.4%"
      left={pct(M.cx + plan[j].x * M.rx * .8, M.width)} height={pct(surfaceY(KIND, POURED * .6) + plan[j].y * M.ry, M.height)}
      delay={plan[j].start} duration={plan[j].end - plan[j].start + 260} />)}
    <GlassRod x={pct(tipX, M.width)} y={pct(tipY, M.height)} tilt={14 + 4 * Math.sin(spin)} paint={body} visible={stirring} />
    {action}
  </div>;
}

/** A laboratory stirring rod: clear glass, fire-polished round ends, light caught along both edges and a bright
 * core line, longer than the beaker so it stands out above the rim. Its lower end is under the surface (cut there)
 * and the last part above it is wet with the paint. */
function GlassRod({ x, y, tilt, paint, visible }) {
  return <span aria-hidden="true" className="tw:pointer-events-none tw:absolute tw:transition-opacity tw:duration-300"
    style={{ left: x, top: y, width: '3.1%', height: '78%', opacity: visible ? 1 : 0, transformOrigin: '50% 100%',
      transform: `translate(-50%, -100%) rotate(${tilt}deg)` }}>
    <span className="tw:absolute tw:inset-0 tw:rounded-full" style={{
      background: 'linear-gradient(90deg,#effcf7d9 0%,#d8f2ea4d 14%,#ffffff1a 28%,#ffffffe6 44%,#ffffff33 54%,#cfe9e21a 72%,#e6faf3cc 100%)',
      boxShadow: 'inset 0 0 0 .5px #ffffff59,0 0 6px #ffffff1a' }} />
    <span className="tw:absolute tw:inset-x-0 tw:bottom-0 tw:h-[9%] tw:rounded-b-full" style={{
      background: `linear-gradient(90deg,#0000004d,#0000 35%,#ffffff40 45%,#0000 60%,#0000004d),linear-gradient(#0000,${paint} 55%)` }} />
  </span>;
}
