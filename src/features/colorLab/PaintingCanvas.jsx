import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pipette, Undo2, Trash2, Download, Maximize2, Minimize2 } from 'lucide-react';
import { PaintSurface, BRUSHES } from './painting.js';
import { createRenderer } from './paintRenderer.js';
import { ToolGlyph, TIP } from './tools.jsx';
import s from './PaintingCanvas.module.css';

const TOOLS = [...BRUSHES, { id: 'tube', label: 'ტუბი — საღებავის გამოწურვა' }, { id: 'knife', label: 'პალიტრის დანა — ურევს ტილოზე არსებულ საღებავს' }];
// The tool drawn at the pointer: this size, tilted like a hand holds it.
const CURSOR = 72, TILT = 32;
// Tube flow in grid paint units per millisecond for a nozzle of radius 7.
const FLOW = 7;

const PaintingCanvas = forwardRef(function PaintingCanvas({ brush, onSample, onNeedPaint, onPick }, ref) {
  const canvasRef = useRef(null), cursorRef = useRef(null);
  const state = useRef(null), frame = useRef(0), pointer = useRef(null), callback = useRef(onSample);
  const brushRef = useRef(brush), settings = useRef({ size: 56, type: 'flat', tool: 'paint' });
  const [type, setType] = useState('flat'), [size, setSize] = useState(56), [tool, setTool] = useState('paint');
  // Phones get a portrait canvas of about the same number of cells.
  const [grid] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 640px)').matches ? [400, 500] : [640, 400]);
  const [strokes, setStrokes] = useState(0), [started, setStarted] = useState(false), [expanded, setExpanded] = useState(false), [exportError, setExportError] = useState('');
  callback.current = onSample; brushRef.current = brush; settings.current = { size, type, tool };
  function render() {
    frame.current = 0;
    const st = state.current;
    if (!st?.renderer) return;
    st.renderer.draw(st.surface.render(), st.dpr);
  }
  function schedule() { if (!frame.current) frame.current = requestAnimationFrame(render); }
  function finish() {
    if (!pointer.current) return;
    cancelAnimationFrame(pointer.current.loop);
    const { moved, point: p, load: pressure, tube } = pointer.current;
    if (tube) squeeze(performance.now());
    else if (!moved) state.current.surface.dab(p.x, p.y, p.rx, p.ry, -.15, pressure);
    pointer.current = null;
    const surface = state.current.surface;
    const sample = surface.end();
    setStrokes(surface.history.length); callback.current(sample); schedule();
  }
  // While the tube is held, paint keeps coming: piling up in place, or laid
  // as a bead along the way the pointer moved since the last call.
  function squeeze(now) {
    const pt = pointer.current;
    if (!pt?.tube || !state.current) return;
    const dt = Math.min(50, Math.max(0, now - pt.time)), nozzle = Math.max(3, pt.point.rx * .45);
    pt.time = now;
    const surface = state.current.surface;
    surface.squeeze(pt.from, pt.point, FLOW * (nozzle / 7) ** 2 * pt.load * dt, nozzle);
    surface.settle(8);
    pt.from = pt.point; schedule();
  }
  function flowLoop(now) {
    if (!pointer.current?.tube) return;
    squeeze(now); pointer.current.loop = requestAnimationFrame(flowLoop);
  }
  function clear() {
    pointer.current = null; state.current?.surface.clear(); setStrokes(0); setStarted(false); callback.current(null); schedule();
  }
  function undo() {
    if (!state.current) return;
    finish(); const surface = state.current.surface;
    callback.current(surface.undo()); setStrokes(surface.history.length); setStarted(surface.history.length > 0); schedule();
  }
  useImperativeHandle(ref, () => ({ clear, activateBrush: () => setTool('paint') }), []);
  useEffect(() => {
    const surface = new PaintSurface(grid[0], grid[1]);
    setStrokes(0); setStarted(false); callback.current(null);
    let renderer = null;
    try { renderer = createRenderer(canvasRef.current, surface); } catch { renderer = null; }
    state.current = { surface, renderer, dpr: 1 };
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !state.current) return;
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, renderer?.kind === 'webgl2' ? 2 : 1.5);
      canvas.width = Math.min(2400, Math.round(r.width * dpr)); canvas.height = Math.round(canvas.width * r.height / r.width);
      state.current.dpr = canvas.width / r.width;
      surface.markDirty(0, 0, surface.width - 1, surface.height - 1); schedule();
    };
    const observer = new ResizeObserver(resize); observer.observe(canvasRef.current); resize();
    return () => { observer.disconnect(); cancelAnimationFrame(frame.current); cancelAnimationFrame(pointer.current?.loop); frame.current = 0; renderer?.destroy(); state.current = null; };
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const exit = e => { if (e.key === 'Escape') setExpanded(false); };
    document.addEventListener('keydown', exit);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', exit); };
  }, [expanded]);
  function point(e) {
    const r = canvasRef.current.getBoundingClientRect(), surface = state.current.surface;
    const radius = settings.current.size / 2 * Math.max(.55, Math.min(1, r.width / 900));
    return { x: (e.clientX - r.left) / r.width * surface.width, y: (e.clientY - r.top) / r.height * surface.height, rx: radius / r.width * surface.width, ry: radius / r.height * surface.height };
  }
  const load = e => e.pointerType === 'pen' && e.pressure ? Math.max(.3, e.pressure * 1.6) : 1;
  function moveCursor(e) {
    if (!cursorRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    cursorRef.current.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px)`;
    cursorRef.current.style.opacity = e.pointerType === 'touch' ? '0' : '1';
  }
  function down(e) {
    if (e.button !== 0 || pointer.current || !state.current) return;
    e.preventDefault(); const p = point(e), surface = state.current.surface;
    // The pipette puts the mix under it on the brush, pigments and shares included.
    if (settings.current.tool === 'sample') { const picked = surface.sample(p.x, p.y); callback.current(picked); if (picked) onPick?.(picked); setTool('paint'); return; }
    const knife = settings.current.type === 'knife';
    if (!brushRef.current && !knife) { onNeedPaint?.(); return; }
    setStarted(true);
    canvasRef.current.setPointerCapture?.(e.pointerId);
    // The knife carries no paint of its own; it works what is on the canvas.
    surface.begin(knife ? [] : brushRef.current.components, settings.current.type);
    // The first stamp waits for a direction; a tap without one dabs on release.
    pointer.current = { id: e.pointerId, point: p, moved: false, load: load(e), tube: settings.current.type === 'tube', from: p, time: performance.now() }; moveCursor(e);
    if (pointer.current.tube) pointer.current.loop = requestAnimationFrame(flowLoop);
  }
  function move(e) {
    moveCursor(e);
    if (pointer.current?.id !== e.pointerId) return;
    const events = e.nativeEvent?.getCoalescedEvents?.() || [];
    if (pointer.current.tube) { pointer.current.point = point(e); pointer.current.load = load(e); squeeze(performance.now()); return; }
    for (const ev of events.length ? events : [e]) {
      const p = point(ev);
      state.current.surface.line(pointer.current.point, p, p.rx, p.ry, load(ev));
      pointer.current.point = p; pointer.current.moved = true;
    }
    schedule();
  }
  function up(e) {
    if (pointer.current?.id !== e.pointerId) return;
    finish(); if (canvasRef.current.hasPointerCapture?.(e.pointerId)) canvasRef.current.releasePointerCapture(e.pointerId);
  }
  async function download() {
    setExportError('');
    try {
      const st = state.current; st.renderer.draw(null, st.dpr);
      const blob = await new Promise(resolve => canvasRef.current.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Export failed');
      const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'artopia-my-canvas.png'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch { setExportError('ტილოს შენახვა ვერ მოხერხდა. სცადე ხელახლა.'); }
  }
  return <div className={`${s.workspace} ${expanded ? s.expanded : ''}`}>
    <div className={s.toolbar}>
      <span className={s.loaded} style={{ '--paint': brush?.hex || 'transparent' }} title={brush ? brush.hex : 'ფუნჯი ცარიელია'} aria-label={brush ? `ფუნჯზე ${brush.hex}` : 'ფუნჯი ცარიელია'} />
      <div className={s.group} role="group" aria-label="ფუნჯი">{TOOLS.map(b => <button key={b.id} type="button" aria-label={b.label} title={b.label} aria-pressed={type === b.id && tool === 'paint'} onClick={() => { setType(b.id); setTool('paint'); }}><ToolGlyph id={b.id} size={30} style={{ transform: `rotate(${TILT}deg)` }} /></button>)}</div>
      <label className={s.size} title="ფუნჯის ზომა"><i style={{ '--d': `${6 + size / 6}px` }} /><input aria-label="ფუნჯის ზომა" type="range" min="12" max="110" value={size} onChange={e => setSize(+e.target.value)} /></label>
      <div className={s.group}>
        <button type="button" aria-pressed={tool === 'sample'} aria-label="პიპეტი" title="პიპეტი — ტილოდან ფერის აღება" onClick={() => setTool(t => t === 'sample' ? 'paint' : 'sample')}><Pipette size={17} /></button>
        <button type="button" onClick={undo} disabled={!strokes} aria-label="უკან" title="უკან"><Undo2 size={17} /></button>
        <button type="button" onClick={clear} disabled={!strokes} aria-label="გასუფთავება" title="გასუფთავება"><Trash2 size={17} /></button>
        <button type="button" onClick={download} disabled={!strokes} aria-label="ჩამოტვირთვა" title="PNG"><Download size={17} /></button>
        <button type="button" onClick={() => setExpanded(v => !v)} aria-label={expanded ? 'დაპატარავება' : 'გადიდება'} title={expanded ? 'დაპატარავება' : 'გადიდება'}>{expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
      </div>
    </div>
    <div className={`${s.paper} ${tool === 'sample' ? s.sampling : ''}`} style={{ '--aspect': grid[0] / grid[1] }}>
      <canvas ref={canvasRef} aria-label="ტილო" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={finish} onPointerLeave={() => { if (cursorRef.current) cursorRef.current.style.opacity = '0'; }} />
      <div ref={cursorRef} className={s.cursor} style={{ '--size': `${tool === 'sample' ? 18 : (type === 'tube' ? size * .5 : size) * Math.max(.55, Math.min(1, (canvasRef.current?.getBoundingClientRect().width || 900) / 900))}px`, '--paint': brush?.hex || '#ffffff' }}>
        {tool === 'paint' && <span className={s.tool} style={{ left: -CURSOR * TIP[0] / 24, top: -CURSOR * TIP[1] / 24, transformOrigin: `${CURSOR * TIP[0] / 24}px ${CURSOR * TIP[1] / 24}px`, transform: `rotate(${TILT}deg)` }}>
          <ToolGlyph id={type} size={CURSOR} paint={type === 'knife' ? undefined : brush?.hex} />
        </span>}
      </div>
      {!started && <p className={s.empty}>{brush || type === 'knife' ? 'მოსვი აქ' : 'ჯერ ფერი შეურიე'}</p>}
    </div>
    {exportError && <p role="alert" className={s.error}>{exportError}</p>}
  </div>;
});
export default PaintingCanvas;
