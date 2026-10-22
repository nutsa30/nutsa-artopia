import React from 'react';
import { Plus, Minus, X } from 'lucide-react';
import Beaker, { glassBox } from './Beaker';
import MixingBowl from './MixingBowl';
import { MAX_CUPS, STEP, MIN_SHARE, cupMl, shownShares } from './cups.js';

// ProductsCard.module.css sets an unscoped `button { font-size }` on wide screens,
// which beats layered utilities; these buttons pin size and padding with `!`.
const round = 'tw:grid tw:place-items-center tw:rounded-full tw:border-0 tw:p-0! tw:leading-none tw:transition-colors tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#efe5d1] tw:disabled:cursor-not-allowed tw:disabled:opacity-35';

export default function MixingBench({ state, dispatch, nameOf, onMix, onPalette, resultName }) {
  const mixing = state.blend.status === 'mixing', ready = state.blend.status === 'mixed';
  const filled = state.cups.filter(c => c.ingredients.length), shares = shownShares(state.cups);
  const most = 100 - MIN_SHARE * (filled.length - 1);
  return <section className="tw:flex tw:min-w-0 tw:flex-col tw:gap-4" aria-label="ფერების შერევა">
    <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-center tw:gap-x-3 tw:gap-y-4">
      {state.cups.map((cup, index) => {
        const ingredient = cup.ingredients[0], share = shares.get(cup.id) ?? 0, active = cup.id === state.activeId;
        // Steps land on multiples of 5: 33% goes to 35% or 30%.
        const step = d => dispatch({ type: 'parts', id: cup.id, parts: d > 0 ? Math.floor(share / STEP) * STEP + STEP : Math.ceil(share / STEP) * STEP - STEP });
        return <div key={cup.id} className="tw:group tw:relative tw:flex tw:w-[112px] tw:flex-col tw:items-center tw:gap-1.5 tw:max-sm:w-[108px]">
          {/* Only the glass is clickable, so the controls under it stay easy to hit. */}
          <div className="tw:relative tw:w-full">
            <button type="button" disabled={mixing} aria-pressed={active} style={glassBox()}
              aria-label={ingredient ? `ჭიქა ${index + 1}: ${nameOf(ingredient.pigment)} — შეცვლა` : `ჭიქა ${index + 1}: ფერის არჩევა`}
              onClick={event => { dispatch({ type: 'select', id: cup.id }); onPalette(event); }}
              className="tw:peer tw:absolute tw:z-10 tw:cursor-pointer tw:rounded-[18px] tw:border-0 tw:bg-transparent tw:p-0! tw:focus-visible:outline-2 tw:focus-visible:outline-[#efe5d1] tw:disabled:cursor-default" />
            <div className={`tw:pointer-events-none tw:transition tw:duration-500 tw:peer-hover:-translate-y-0.5 ${mixing && ingredient ? 'tw:-translate-y-1 tw:-rotate-6' : ''}`}>
              <Beaker color={ingredient?.pigment.hex} ml={cupMl(ingredient?.parts ?? 0)} pourKey={ingredient?.pigment.id} />
              {!ingredient && <span className="tw:absolute tw:left-1/2 tw:top-[52%] tw:grid tw:size-9 tw:-translate-x-1/2 tw:-translate-y-1/2 tw:place-items-center tw:rounded-full tw:bg-white/10 tw:text-[#efe5d1] tw:ring-1 tw:ring-white/20"><Plus size={18} /></span>}
            </div>
          </div>
          <span className="tw:max-w-full tw:truncate tw:text-center tw:text-xs tw:text-[#d7dde6]" title={ingredient ? `${nameOf(ingredient.pigment)} · ${ingredient.pigment.ka}` : undefined}>{ingredient ? nameOf(ingredient.pigment) : 'ფერი'}</span>
          {ingredient && filled.length > 1 && <div className="tw:flex tw:items-center tw:gap-0.5">
            <button type="button" className={`${round} tw:size-7 tw:cursor-pointer tw:bg-white/10 tw:text-[#d7dde6] tw:hover:bg-white/20`} disabled={mixing || share <= MIN_SHARE} aria-label={`${nameOf(ingredient.pigment)} — ნაკლები`} onClick={() => step(-STEP)}><Minus size={13} /></button>
            <output className="tw:min-w-[42px] tw:text-center tw:font-mono tw:text-xs tw:tabular-nums tw:text-[#e9edf2]" aria-label="წილი ნარევში">{share}%</output>
            <button type="button" className={`${round} tw:size-7 tw:cursor-pointer tw:bg-white/10 tw:text-[#d7dde6] tw:hover:bg-white/20`} disabled={mixing || share >= most} aria-label={`${nameOf(ingredient.pigment)} — მეტი`} onClick={() => step(STEP)}><Plus size={13} /></button>
          </div>}
          {(ingredient || state.cups.length > 2) && <button type="button" disabled={mixing} aria-label={`ჭიქა ${index + 1} — ამოღება`} onClick={() => dispatch({ type: 'remove', id: cup.id })}
            className={`${round} tw:absolute tw:-right-1 tw:-top-1 tw:z-20 tw:size-6 tw:cursor-pointer tw:bg-[#0b1626] tw:text-[#aeb8c6] tw:ring-1 tw:ring-white/20 tw:hover:text-white tw:opacity-0 tw:group-hover:opacity-100 tw:focus-visible:opacity-100 tw:pointer-coarse:opacity-90`}><X size={12} strokeWidth={2.4} /></button>}
        </div>;
      })}
      {state.cups.length < MAX_CUPS && <button type="button" disabled={mixing} aria-label="ჭიქის დამატება" title="ჭიქის დამატება" onClick={() => dispatch({ type: 'add' })}
        className={`${round} tw:mt-14 tw:size-10 tw:cursor-pointer tw:border tw:border-dashed tw:border-white/25 tw:bg-transparent tw:text-[#c9d1dc] tw:hover:border-white/50 tw:hover:text-white`}><Plus size={16} /></button>}
    </div>
    <MixingBowl blend={state.blend}>
      <button type="button" disabled={mixing || !filled.length} onClick={onMix}
        className="tw:h-11 tw:min-w-[128px] tw:cursor-pointer tw:whitespace-nowrap tw:rounded-full tw:border-0 tw:bg-linear-to-b tw:from-[#f6eedd] tw:to-[#e4d6ba] tw:px-7! tw:py-0! tw:text-sm! tw:font-semibold tw:text-[#132339] tw:shadow-[inset_0_1px_0_#fff8,0_8px_22px_-6px_#000c,0_0_0_4px_#0b162680] tw:transition tw:hover:-translate-y-px tw:disabled:cursor-not-allowed tw:disabled:from-[#c9c2b4] tw:disabled:to-[#b3ab9c] tw:disabled:text-[#132339b3] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#efe5d1]">
        {mixing ? 'ირევა…' : filled.length === 1 ? 'ჩასხმა' : 'შერევა'}
      </button>
    </MixingBowl>
    {ready && state.blend.result && <div className="tw:flex tw:items-center tw:justify-center tw:gap-2.5 tw:px-1 tw:text-[#e9edf2]">
      <i className="tw:size-5 tw:shrink-0 tw:rounded-full tw:ring-1 tw:ring-white/20" style={{ background: state.blend.result.hex }} />
      <b className="tw:truncate tw:text-[13px] tw:font-medium">{resultName}</b>
      <code className="tw:font-mono tw:text-[11px] tw:text-[#9aa6b6]">{state.blend.result.hex}</code>
    </div>}
  </section>;
}
