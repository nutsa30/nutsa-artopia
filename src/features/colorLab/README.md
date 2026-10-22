# Artopia Color Lab

Local route: `/color-lab`. New lazy React page, existing Netlify/Flask hosting and cart. No paid API, AI call, database table, migration or new hosted service.

## Cup mixing and canvas

The bench holds 200 ml Griffin beakers (two to start, up to six). Clicking one opens a single searchable palette sorted by hue; the choice pours into that beaker. Each beaker has − / + in 10 ml steps (10–200 ml, 100 ml to start); the millilitres are the recipe ratio and the level shows them on the printed scale. "შერევა" pours everything into a 600 ml beaker: the colours land as pools, a glass rod stirs them into marbled streaks (`marble.js`) and they settle into exactly the `mixHex` result, which goes straight onto the brush. One filled beaker can be poured alone. Reverse recipes are poured as about 300 ml in the same ratio.

The beakers are real renders, not drawings: `scripts/color-lab-beakers.py` models them in Blender (ISO-like proportions, enamel graduation, spout) and renders, with an orthographic camera, the glass behind, the glass and scale in front, and the liquid side and top as white matte and black gloss passes. `scripts/color-lab-beakers-bake.py` turns those into straight-alpha WebP layers (mask, shadow, gloss) in `beakers/`, about 190 KB in total, plus `beakers.json` with where the 0 ml and full levels sit. `Beaker.jsx` tints the mask with the paint colour and moves the level with a clip and a translate, no blend modes. Re-run both scripts (Blender 5.2) to change the look. The glass reflects a soft studio (bright horizon band, dim floor) that the camera itself never sees, so the silhouette, rolled rim, spout and thick base read as one continuous glass vessel (owner, 2026-10-22: the earlier light-only render looked like loose streaks with no base). `BEAKER_*` env vars try other looks. A pour is a shaded stream that lands, flows and drops its tail in, with rings on the surface (`PourStream`); the mixing beaker is stirred by a clear lab glass rod with a paint-wet tip, and the mix button sits on its base.

The canvas (`painting.js`) is wet paint. Every cell of a 640×400 grid keeps the amount of each pigment.

- A brush starts every stroke with a full load that lasts about 20 radii on bare canvas, then the drier hairs stop first and the stroke breaks into bristle streaks. It touches down narrower and opens up. Each stamp lays paint from the load and lifts some of the wet paint under it into the tip; the tip lays that down further on, unevenly per hair, so crossings mix and smear in streaks. One full pass over bare canvas lays the prepared mix exactly.
- The tube squeezes paint out while held: in place it piles up, moving it lays a round bead whose thickness depends on speed. Stiff paint slumps wherever the surface is steeper than it can hold (8-neighbour flow, volume conserved), so a heap spreads round. A brush through tube paint picks it up and smears it.
- The palette knife brings no paint and needs no mix on the brush. It spreads what is on the canvas to an even, opaque layer (`KNIFE_LAYER`): it scrapes off what stands higher, fills lower spots from the paint on the blade and trades a share (`KNIFE_TRADE`) with what it passes, so heaps it drags through mix. It never adds paint.
- The toolbar and the pointer show the tool itself (`tools.jsx`), loaded with the current colour.
- There are no drips.

Rendering (`paintRenderer.js`): the grid produces premultiplied color and a normal/height/coverage field; WebGL2 lights it at screen resolution as glossy oil on primed linen. Without WebGL2 a 2D fallback shades the grid. Per-pixel color uses `km.js`, an allocation-free form of the same spectral.js Kubelka–Munk mix (equal to `mixHex` within rounding), cached by pigment set and 1/255 shares. Only dirty rectangles are recomputed and uploaded; nothing runs while idle (the tube runs a frame loop only while pressed).

Flat, round and dry brushes, tube, size, eyedropper, undo (24 strokes), clear, PNG and full-screen. The sample under the canvas shows the color and its pigment shares after each stroke or eyedropper click.

Tailwind (`tw:` prefix, no preflight) styles the bench. `ProductsCard.module.css` still sets an unscoped `button { font-size }` on wide screens (its padding is now scoped to the card), so bench buttons pin size and padding with `!`.

## Model and data

`engine.js` is shared by the live mixer and reverse Worker. Spectral.js 3.0.0 (MIT) reconstructs 38 reflectance samples (380–750 nm) from sRGB and mixes via its single-constant Kubelka–Munk model. Its luminance and nonlinear concentration weighting are retained, with default tinting strength; no measured K/S or manufacturer-specific strength is claimed. Model weights are relative factors, not validated grams/volume.

All profiles are **modeled**, none are measured spectra. `pigments.json` contains 120 modern Schmincke HORADAM reference formulations. Names, CI declarations and opacity are from the manufacturer's public chart; RGB was estimated from the median RGB of the upper, stronger 20–80% x / 4–17% y area of each digital manufacturer swatch. Original chart and image URLs are retained on every entry. RGB samples are not manufacturer-certified colorimetry and are affected by image capture and reproduction. Formulation metadata belongs to that exact Schmincke reference, not every paint sold under the same name.

The live catalogue currently contributes 23 dry-pigment profiles and 114 individually named paint-product profiles. These are generated in memory from real products and mapped to a plausible reference swatch or an explicitly approximate screen color. They deliberately have empty CI arrays and unknown opacity, because Artopia product names do not establish chemical composition. Product IDs, prices, images, stock and links always come from the API. Do not turn a name match into a chemical identity assertion. Emerald Green is treated as a contemporary trade name, not historical arsenic pigment PG21.

Metallic/glitter effects, sets without individual color data, unclear trade shades (e.g. Maldives/Haruhi) and accessories remain in the shop catalogue but do not receive invented mixing profiles. Paint sets cannot be expanded into named colors without additional data. All 23 dry products, including names without CI information, receive clearly labeled approximate profiles.

Display values are sRGB and CIELAB D65 / 2°. CIEDE2000 is checked against Sharma reference pairs. Nearest visual names use the 148 CSS names in `color-name` 2.1.1 (MIT); a visual name is never a pigment identification. The procedural Canvas strokes simulate material appearance only. Thickness, translucency and highlights do not alter the underlying recipe model. Physical layer thickness, medium differences, granulation and substrate optics are not simulated.

## Reverse mixing

Search runs in `solver.worker.js`, cancellable by termination. It uses the exact forward model: enumerate all pairs on a 10% coarse grid; refine the best pairs with 5%, 2%, 0.5% transfer steps; extend leading pairs with each possible third pigment; refine promising triples. Score with CIEDE2000; give a 0.6 ΔE00 complexity preference to pairs. Return five distinct pigment combinations, including the best pair. Identical RGB profiles are deduplicated for search because their model behavior is identical. This is bounded heuristic optimization, not a proof of the global optimum. Stored recipe weights retain their full precision; displayed percentages use largest remainder rounding and sum to 100.

## Catalogue and cart

`loadShopCatalog()` uses only existing public GET `/products/list`, with pagination of six relevant categories. Reading this bounded subset (currently 211 products) is intentional: the requested lab must expose all store pigments and paints, including out-of-stock entries. It does not download the whole shop, persist a duplicate database, or request API data on slider changes. One request per category is currently enough; categories with over 100 products are paginated. Session cache is reused across route visits; reload refreshes stock. A failed request allows retry.

Reference RGB assignment supports normalized names and aliases, but product recommendations use explicit IDs from the actual product shade label, with modifiers preserved. It never derives color from product photography. The page displays only exact-name linked products, with no alternative-color suggestions. Existing `ProductsCard`, `useCart().addToCart`, stock rules, sale calculation, toast and product routes are reused. The inspected Product model has no separate variant model; unidentified sets/choices use their existing detail page. Checkout is untouched and retains its own live stock validation.

## Development

Run `npm run dev:color-lab`, then open `http://127.0.0.1:5173/color-lab`. The existing Vite server proxies public catalogue GETs to Heroku to avoid localhost CORS. This development command overrides environment variables in process memory only; `.env` files are untouched. The preview proxy rejects writes. It requires network access for the real catalogue, but mixing and reverse search run locally after the code/data load. The regular dev/build scripts are unchanged.

Run `npm test` and `npm run build`. Relevant tests: `tests/color-lab.test.mjs`, `tests/color-names.test.mjs`, `tests/cups.test.mjs`, `tests/painting.test.mjs`, `tests/painting-ui.test.mjs`. Thickness, relief and gloss are appearance only; they never change a sampled recipe. The new edge route has initial Georgian SEO and a canonical; the backend-generated sitemap is intentionally unchanged and will need an explicit `/color-lab` entry in a separately authorized publication task.

Sources:
- https://github.com/rvanwijnen/spectral.js
- https://www.schmincke.de/en/produkte/aquarell/horadam-aquarell
- https://github.com/colorjs/color-name
- https://www2.ece.rochester.edu/~gsharma/ciede2000/

Physical accuracy has not been validated with actual Artopia paint-outs or spectrophotometer measurements. Better fidelity needs measured reflectance/K/S and mixtures for those specific products, not a different hosting stack.
