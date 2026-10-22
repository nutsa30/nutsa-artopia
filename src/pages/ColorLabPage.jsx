import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Bookmark, Copy, Search, X } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import SEO from '../components/SEO';
import { hasEdgeJsonLd } from '../utils/edgeJsonLd';
import { COLOR_LAB_SEO } from '../features/colorLab/seo.js';
import { trackLab, LAB_LIST, resetFirstUse } from '../features/colorLab/analytics.js';
import { trackSelectItem, trackViewItemList } from '../utils/analytics.js';
import ProductsCard from '../components/productCard/productsCard';
import { useCart } from '../components/CartContext/CartContext';
import { PUBLIC_API } from '../utils/apiBase';
import pigments from '../features/colorLab/pigments.json';
import { hexRgb, nearestName, percentages, validHex } from '../features/colorLab/engine.js';
import { dryPigmentProfiles, storePaintProfiles, loadShopCatalog, normalizeText, SHOP_ALIASES } from '../features/colorLab/catalog.js';
import { colorName as englishName, titleCase, uniqueColors, exactColorProducts } from '../features/colorLab/colorNames.js';
import PaintingCanvas from '../features/colorLab/PaintingCanvas';
import Swatch from '../features/colorLab/Swatch';
import MixingBench from '../features/colorLab/MixingBench';
import { MIX_MS } from '../features/colorLab/marble.js';
import { cupsReducer, initialCups, shownShares } from '../features/colorLab/cups.js';
import s from './ColorLabPage.module.css';

const visualName = n => ({ olivedrab: 'Olive Drab', darkolivegreen: 'Dark Olive Green', darkslategray: 'Dark Slate Grey', forestgreen: 'Forest Green', seagreen: 'Sea Green', darkseagreen: 'Dark Sea Green', mediumseagreen: 'Medium Sea Green', darkkhaki: 'Dark Khaki', yellowgreen: 'Yellow Green', darkgoldenrod: 'Dark Goldenrod', darkslateblue: 'Dark Slate Blue' }[n] || titleCase(n));
const readSaved = () => { try { const v = JSON.parse(localStorage.getItem('artopia.color-lab.recipes.v1') || '[]'); return Array.isArray(v) ? v.filter(r => r && validHex(r.hex) && Array.isArray(r.recipe)).slice(0, 12) : []; } catch { return []; } };
const targets = ['#7D9567', '#B56D53', '#738BA6', '#C9AE68', '#875A77', '#D8C4AD'];
// Palette order: hue families, light to dark; near-neutrals last.
function hueKey(hex) {
  const [r, g, b] = hexRgb(hex).map(v => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  const sat = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  if (sat < .14 || d < .06) return 1000 + (1 - l);
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360 + 20) % 360;
  return Math.floor(h / 24) * 10 + (1 - l) * 9;
}

export default function ColorLabPage() {
  const { addToCart } = useCart(), navigate = useNavigate();
  const [mode, setMode] = useState('mix'), [brush, setBrush] = useState(null);
  const [cups, dispatchCups] = useReducer(cupsReducer, undefined, initialCups);
  const [query, setQuery] = useState(''), [paletteOpen, setPaletteOpen] = useState(false), [sample, setSample] = useState(null);
  const [target, setTarget] = useState('#7D9567'), [solutions, setSolutions] = useState([]), [busy, setBusy] = useState(false), [progress, setProgress] = useState(0), [solverError, setSolverError] = useState(''), [solverRetry, setSolverRetry] = useState(0);
  const [shop, setShop] = useState([]), [shopError, setShopError] = useState(''), [retry, setRetry] = useState(0);
  const [shown, setShown] = useState(8);
  const [saved, setSaved] = useState(readSaved), [notice, setNotice] = useState(''), [copyText, setCopyText] = useState('');
  const surfaceRef = useRef(null), paletteRef = useRef(null), searchRef = useRef(null), paletteButton = useRef(null), mixTimers = useRef(new Map()), mixToken = useRef(0);
  useEffect(() => () => { for (const timer of mixTimers.current.values()) clearTimeout(timer); }, []);
  // Each visit reports its first stroke per tool again.
  useEffect(() => { resetFirstUse(); }, []);
  useEffect(() => {
    let alive = true; setShopError('');
    loadShopCatalog(PUBLIC_API).then(data => { if (alive) setShop(data); }).catch(() => { if (alive) setShopError('მასალები ვერ ჩაიტვირთა.'); });
    return () => { alive = false; };
  }, [retry]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 3200); return () => clearTimeout(t); }, [notice]);
  useEffect(() => {
    if (!paletteOpen) return;
    const small = window.innerWidth <= 900, previous = document.body.style.overflow;
    if (small) document.body.style.overflow = 'hidden';
    searchRef.current?.focus({ preventScroll: true });
    const keyboard = e => {
      if (e.key === 'Escape') { setPaletteOpen(false); paletteButton.current?.focus(); }
      if (e.key === 'Tab') {
        const list = [...(paletteRef.current?.querySelectorAll('button,input') || [])].filter(el => el.getClientRects().length && !el.disabled);
        if (e.shiftKey && document.activeElement === list[0]) { e.preventDefault(); list.at(-1)?.focus(); }
        else if (!e.shiftKey && document.activeElement === list.at(-1)) { e.preventDefault(); list[0]?.focus(); }
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => { if (small) document.body.style.overflow = previous; document.removeEventListener('keydown', keyboard); };
  }, [paletteOpen]);
  // A finished mix goes straight onto the brush.
  useEffect(() => {
    if (cups.blend.status !== 'mixed' || !cups.blend.result) return;
    // A poured or mixed bench (a recipe loads with no token and is reported as recipe_try).
    if (cups.blend.token != null) {
      const filled = cups.cups.filter(c => c.ingredients.length), shares = shownShares(cups.cups);
      trackLab('mix', { colors: filled.length, color_names: filled.map(c => englishName(c.ingredients[0].pigment)).join(' + '), shares: filled.map(c => shares.get(c.id)).join('/'), result_hex: cups.blend.result.hex });
    }
    setBrush({ ...cups.blend.result, name: 'Your Mix' });
    surfaceRef.current?.activateBrush();
  }, [cups.blend.status, cups.blend.result]);
  const dry = useMemo(() => dryPigmentProfiles(shop, pigments), [shop]);
  const paints = useMemo(() => storePaintProfiles(shop, pigments), [shop]);
  const all = useMemo(() => uniqueColors([...dry, ...pigments, ...paints]), [dry, paints]);
  const byId = useMemo(() => new Map(all.flatMap(p => p.memberIds.map(id => [id, p]))), [all]);
  const palette = useMemo(() => {
    const words = normalizeText(query).split(' ').filter(Boolean);
    const found = all.filter(p => { const text = normalizeText([p.name, p.ka, p.id, ...p.pigments, ...p.aliases, ...(SHOP_ALIASES[p.id] || [])].join(' ')); return words.every(w => text.includes(w)); });
    return found.map(p => [hueKey(p.hex), p]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  }, [all, query]);
  const activeCup = cups.cups.find(c => c.id === cups.activeId);
  const targetHex = validHex(target);
  const reversePool = useMemo(() => [...new Map(all.map(p => [p.hex, p])).values()], [all]);
  useEffect(() => {
    if (mode !== 'reverse' || !targetHex) { setBusy(false); setSolutions([]); return; }
    let alive = true, worker;
    setBusy(true); setProgress(0); setSolverError(''); setSolutions([]);
    const timer = setTimeout(() => {
      worker = new Worker(new URL('../features/colorLab/solver.worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }) => {
        if (!alive) return;
        if (data.progress !== undefined) setProgress(data.progress);
        if (data.recipes) { setSolutions(data.recipes); setBusy(false); worker.terminate(); trackLab('recipe_search', { target_hex: targetHex, results: data.recipes.length, best_match: data.recipes[0] ? +data.recipes[0].delta.toFixed(1) : undefined }); }
        if (data.error) { setSolverError(data.error); setBusy(false); worker.terminate(); }
      };
      worker.onerror = () => { if (alive) { setSolverError('ძიება ვერ დასრულდა.'); setBusy(false); } worker.terminate(); };
      worker.postMessage({ pigments: reversePool, target: targetHex });
    }, 220);
    return () => { alive = false; clearTimeout(timer); worker?.terminate(); };
  }, [mode, targetHex, reversePool, solverRetry]);
  function choose(p) {
    if (cups.blend.status === 'mixing') return;
    trackLab('color_choose', { color_name: englishName(p), pigment_code: p.pigments.filter(Boolean).join(' '), cup: cups.cups.findIndex(c => c.id === cups.activeId) + 1, search_term: query.trim() });
    dispatchCups({ type: 'ingredient', pigment: p }); setPaletteOpen(false); setQuery('');
    paletteButton.current?.focus({ preventScroll: true });
  }
  function mixCup() {
    if (!cups.cups.some(c => c.ingredients.length) || cups.blend.status === 'mixing') return;
    const token = ++mixToken.current;
    dispatchCups({ type: 'mix', token });
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => { dispatchCups({ type: 'finish', token }); mixTimers.current.delete(token); }, reduced ? 120 : MIX_MS);
    mixTimers.current.set(token, timer);
  }
  function useRecipe(recipe, source) {
    const valid = recipe.filter(r => r && byId.has(r.id) && Number.isFinite(r.weight) && r.weight > 0);
    if (valid.length !== recipe.length || !valid.length) { setNotice('ამ რეცეპტის ზოგი ფერი აღარ არის ხელმისაწვდომი'); return; }
    const grouped = new Map();
    for (const r of valid) { const pigment = byId.get(r.id), previous = grouped.get(pigment.id); grouped.set(pigment.id, { pigment, weight: r.weight + (previous?.weight || 0) }); }
    dispatchCups({ type: 'recipe', components: [...grouped.values()] });
    trackLab('recipe_try', { source, colors: grouped.size, target_hex: source === 'search' ? targetHex : undefined });
    setMode('mix');
    requestAnimationFrame(() => document.getElementById('lab-studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  const sampleName = useMemo(() => sample ? nearestName(sample.hex) : null, [sample]);
  const resultName = useMemo(() => cups.blend.result ? nearestName(cups.blend.result.hex).ka : '', [cups.blend.result]);
  const shares = sample ? percentages(sample.recipe.map(r => r.weight)) : [];
  async function copy() {
    if (!sample) return;
    const text = `Artopia — ${sample.hex}\n${sample.recipe.map((r, i) => `${englishName(byId.get(r.id))} / ${byId.get(r.id)?.ka}: ${shares[i]}%`).join('\n')}\nhttps://artopia.ge/color-lab`;
    trackLab('recipe_copy', { hex: sample.hex, colors: sample.recipe.length });
    try { await navigator.clipboard.writeText(text); setNotice('დაკოპირდა'); } catch { setCopyText(text); }
  }
  function save() {
    if (!sample) return;
    trackLab('recipe_save', { hex: sample.hex, colors: sample.recipe.length });
    try { const next = [{ hex: sample.hex, recipe: sample.recipe, title: visualName(sampleName.name) }, ...saved.filter(r => r.hex !== sample.hex)].slice(0, 12); localStorage.setItem('artopia.color-lab.recipes.v1', JSON.stringify(next)); setSaved(next); setNotice('შენახულია'); } catch { setNotice('შენახვა ვერ მოხერხდა'); }
  }
  const selectedForShop = useMemo(() => mode === 'reverse' && solutions[0] ? solutions[0].recipe.map(r => byId.get(r.id)).filter(Boolean) : cups.cups.some(c => c.ingredients.length) ? cups.cups.flatMap(c => c.ingredients.map(i => i.pigment)) : sample ? sample.recipe.map(r => byId.get(r.id)).filter(Boolean) : brush?.components.map(c => c.pigment) || [], [mode, solutions, cups.cups, sample, brush, byId]);
  const shopItems = useMemo(() => exactColorProducts(shop, selectedForShop.map(p => byId.get(p.id) || p)), [shop, selectedForShop, byId]);
  // view_item_list once per distinct set of products, after the bench settles.
  const listed = useRef('');
  useEffect(() => {
    const key = shopItems.slice(0, shown).map(p => p.id).join(',');
    if (!key || key === listed.current) return;
    const t = setTimeout(() => { listed.current = key; trackViewItemList(shopItems.slice(0, shown), LAB_LIST.id, LAB_LIST.name); }, 1500);
    return () => clearTimeout(t);
  }, [shopItems, shown]);
  return <div className={s.page}>
    <SEO title={COLOR_LAB_SEO.title} description={COLOR_LAB_SEO.description} url={COLOR_LAB_SEO.url} image={COLOR_LAB_SEO.image} />
    <Helmet>
      <meta name="keywords" content={COLOR_LAB_SEO.keywords} />
      {!hasEdgeJsonLd('/color-lab') && <script type="application/ld+json">{JSON.stringify(COLOR_LAB_SEO.jsonLd)}</script>}
    </Helmet>
    <header className={s.top}>
      <h1>ფერების ლაბორატორია</h1>
      <div className={s.modes} role="tablist" aria-label="რეჟიმი">
        <button type="button" role="tab" id="paint-tab" aria-controls="painting-panel" aria-selected={mode === 'mix'} onClick={() => { if (mode !== 'mix') trackLab('mode', { mode: 'mix' }); setMode('mix'); }}>შერევა</button>
        <button type="button" role="tab" id="reverse-tab" aria-controls="recipe-panel" aria-selected={mode === 'reverse'} onClick={() => { if (mode !== 'reverse') trackLab('mode', { mode: 'recipe' }); setPaletteOpen(false); setMode('reverse'); }}>ფერის რეცეპტი</button>
      </div>
    </header>
    <section hidden={mode !== 'mix'} id="painting-panel" role="tabpanel" aria-labelledby="paint-tab">
      <div className={s.studio} id="lab-studio">
        <div className={s.benchColumn}>
          <MixingBench state={cups} dispatch={dispatchCups} nameOf={englishName} onMix={mixCup} resultName={resultName} onPalette={e => { paletteButton.current = e.currentTarget; setPaletteOpen(true); }} />
          {paletteOpen && <>
            <button className={s.backdrop} tabIndex={-1} aria-label="დახურვა" onClick={() => setPaletteOpen(false)} />
            <div ref={paletteRef} className={s.palette} role="dialog" aria-modal="true" aria-label="ფერის არჩევა">
              <div className={s.paletteTop}>
                <label className={s.search}><Search size={16} /><input ref={searchRef} type="search" aria-label="ფერის ძიება" placeholder="ძიება — Blue, Ochre, PB29…" value={query} onChange={e => setQuery(e.target.value)} /></label>
                <button type="button" className={s.close} aria-label="დახურვა" onClick={() => { setPaletteOpen(false); paletteButton.current?.focus(); }}><X size={18} /></button>
              </div>
              <div className={s.chips}>{palette.map(p => {
                const chosen = activeCup?.ingredients.some(i => i.pigment.id === p.id);
                const codes = p.pigments.filter(Boolean).join(' · ');
                return <button type="button" key={p.id} className={s.chip} aria-pressed={chosen} title={[englishName(p), codes, p.ka].filter(Boolean).join(' · ')} onClick={() => choose(p)}>
                  <Swatch hex={p.hex} id={p.id} className={s.stroke} /><span>{englishName(p)}</span>{codes && <small>{codes}</small>}
                </button>;
              })}</div>
              {!palette.length && <p className={s.empty}>ვერ მოიძებნა</p>}
            </div>
          </>}
        </div>
        <div className={s.canvasColumn}>
          <PaintingCanvas ref={surfaceRef} brush={brush} onSample={setSample} onNeedPaint={() => setNotice('ჯერ ფერი შეურიე')} onPick={picked => { trackLab('pipette', { hex: picked.hex, colors: picked.recipe.length }); setBrush({ hex: picked.hex, components: picked.components, name: 'Picked' }); setNotice(`ფუნჯზე აიღე ${picked.hex}`); }} />
          {sample && <div className={s.sample}>
            <i style={{ background: sample.hex }} />
            <div className={s.sampleName}><b>{sampleName.ka}</b><code>{sample.hex}</code></div>
            <div className={s.recipe}>{sample.recipe.map((r, i) => { const p = byId.get(r.id); return <span key={r.id} title={p ? `${englishName(p)} · ${p.ka}` : r.id}><i style={{ background: p?.hex }} />{p ? englishName(p) : r.id}<b>{shares[i]}%</b></span>; })}</div>
            <div className={s.sampleActions}><button type="button" onClick={copy} aria-label="კოპირება" title="კოპირება"><Copy size={16} /></button><button type="button" onClick={save} aria-label="შენახვა" title="შენახვა"><Bookmark size={16} /></button></div>
          </div>}
          {copyText && <label className={s.manualCopy}><textarea readOnly value={copyText} onFocus={e => e.target.select()} /><button type="button" onClick={() => setCopyText('')}>დახურვა</button></label>}
        </div>
      </div>
    </section>
    {mode === 'reverse' && <section className={s.reverse} id="recipe-panel" role="tabpanel" aria-labelledby="reverse-tab">
      <div className={s.target}>
        <label className={s.targetSwatch} style={{ background: targetHex || '#3a4656' }}><input type="color" aria-label="სასურველი ფერი" value={(targetHex || '#7D9567').toLowerCase()} onChange={e => setTarget(e.target.value.toUpperCase())} /></label>
        <input className={s.hex} aria-label="HEX" value={target} maxLength={7} spellCheck={false} onChange={e => setTarget(e.target.value)} aria-invalid={!targetHex} />
        <div className={s.dots}>{targets.map(h => <button type="button" key={h} aria-label={h} style={{ background: h }} onClick={() => setTarget(h)} />)}</div>
      </div>
      {busy && <div className={s.searching} role="status"><span style={{ '--p': `${progress}%` }} /></div>}
      {solverError && <div role="alert" className={s.empty}>{solverError} <button type="button" onClick={() => setSolverRetry(n => n + 1)}>ხელახლა</button></div>}
      {!!solutions.length && <div className={s.solutions}>{solutions.map((r, i) => {
        const parts = percentages(r.recipe.map(v => v.weight));
        return <article className={s.solution} key={i}>
          <div className={s.pair}><i style={{ background: targetHex }} /><i style={{ background: r.hex }} /></div>
          <div className={s.solutionRecipe}>{r.recipe.map((c, j) => { const p = byId.get(c.id); return <span key={c.id} title={p?.ka}><i style={{ background: p?.hex }} />{englishName(p)}<b>{parts[j]}%</b></span>; })}</div>
          <span className={s.match} title={`ΔE₀₀ ${r.delta.toFixed(2)}`}>{r.delta < 2 ? 'თითქმის ზუსტი' : r.delta < 5 ? 'ახლოა' : 'მიახლოებითი'}</span>
          <button type="button" className={s.try} onClick={() => useRecipe(r.recipe, 'search')}>ცდა <ArrowRight size={15} /></button>
        </article>;
      })}</div>}
    </section>}
    {!!saved.length && <div className={s.saved}>{saved.map((r, i) => <button type="button" key={i} title={`${r.title} · ${r.hex}`} onClick={() => useRecipe(r.recipe, 'saved')}><i style={{ background: r.hex }} />{r.title}</button>)}</div>}
    {(shopError || shopItems.length > 0) && <section className={s.shop} id="lab-shop">
      <div className={s.shopHeading}><h2>შერჩეული ან მსგავსი ფერები Artopia-ში</h2><Link to="/products">კატალოგი <ArrowUpRight size={16} /></Link></div>
      {shopError ? <div role="alert" className={s.empty}>{shopError} <button type="button" onClick={() => setRetry(n => n + 1)}>ხელახლა</button></div> : <div className={s.productGrid}>{shopItems.slice(0, shown).map(p => {
        const href = `/products/${p.slug || p.id}`;
        // Same card and click behaviour as the catalogue page.
        return <div key={p.id} className={s.cardWrap} onClick={() => { trackSelectItem(p, LAB_LIST.id, LAB_LIST.name, shopItems.indexOf(p)); navigate(href); }}><ProductsCard product={p} href={href} onAddToCart={(e, qty, product = p) => { e.stopPropagation(); addToCart(product, qty); }} onBuyNow={(e, qty, product = p) => { e.stopPropagation(); addToCart(product, qty); navigate('/checkout'); }} /></div>;
      })}</div>}
      {shown < shopItems.length && <button type="button" className={s.more} onClick={() => setShown(n => n + 8)}>მეტი ({shopItems.length - shown})</button>}
    </section>}
    <p className={s.about}>გთხოვთ გაითვალისწინოთ, რომ შეზავებები მაქსიმალურად ზუსტია, მაგრამ აბსოლუტურ გარანტიას არ იძლევა.</p>
    <div className={`${s.toast} ${notice ? s.toastOn : ''}`} role="status" aria-live="polite">{notice}</div>
  </div>;
}
