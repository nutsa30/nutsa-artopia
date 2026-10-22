import spectral from 'spectral.js';
import cssNames from 'color-name';

// All forward, reverse and sample calculations use this single model.
// Spectra reconstructed from sRGB are modeled, never measured pigment spectra.
const colors = new Map();
const color = hex => {
  if (!colors.has(hex)) colors.set(hex, new spectral.Color(hex));
  return colors.get(hex);
};
export function validHex(value) {
  const v = String(value).trim();
  if (/^#?[a-f\d]{6}$/i.test(v)) return '#' + v.replace('#', '').toUpperCase();
  if (/^#?[a-f\d]{3}$/i.test(v)) return '#' + v.replace('#', '').split('').map(x => x+x).join('').toUpperCase();
  return null;
}
export function normalize(weights) {
  const safe = weights.map(w => Number.isFinite(+w) ? Math.max(0, +w) : 0);
  const total = safe.reduce((a,b) => a+b, 0);
  return safe.map(w => total ? w / total : (safe.length ? 1 / safe.length : 0));
}
// Largest remainder apportionment: the displayed percentages sum to exactly 100.
export function percentages(weights) {
  if(!weights.length)return [];
  const raw = normalize(weights).map(x => x*100);
  const out = raw.map(Math.floor);
  const order = raw.map((x,i) => ({i, remainder:x-out[i]})).sort((a,b) => b.remainder-a.remainder);
  for (let i=0, remaining=100-out.reduce((a,b)=>a+b,0); i<remaining; i++) out[order[i].i]++;
  return out;
}
export function mixHex(hexes, weights) {
  if (!hexes.length || hexes.length !== weights.length) throw new Error('Invalid mixture');
  const fractions = normalize(weights);
  const active = hexes.map((h,i) => [color(h), fractions[i]]).filter(x => x[1] > 0);
  if (active.length === 1) return hexes[fractions.findIndex(x => x>0)].toUpperCase();
  return spectral.mix(...active).toString().toUpperCase();
}
export function hexRgb(hex) {
  return [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));
}
export function rgbLab(rgb) {
  const [r,g,b] = rgb.map(v => { const s=v/255; return s<=.04045 ? s/12.92 : ((s+.055)/1.055)**2.4; });
  const xyz = [(.4124564*r+.3575761*g+.1804375*b)/.95047, .2126729*r+.7151522*g+.072175*b, (.0193339*r+.119192*g+.9503041*b)/1.08883];
  const [x,y,z] = xyz.map(v => v>216/24389 ? Math.cbrt(v) : (24389/27*v+16)/116);
  return [116*y-16, 500*(x-y), 200*(y-z)];
}
export const hexLab = hex => rgbLab(hexRgb(hex));
export const delta76 = (a,b) => Math.hypot(...a.map((v,i)=>v-b[i]));
// CIEDE2000, Sharma/Wu/Dalal (2005), kL=kC=kH=1; Lab D65/2°.
export function deltaE(a,b) {
  const rad = Math.PI/180, deg=180/Math.PI;
  const [L1,a1,b1]=a, [L2,a2,b2]=b;
  const C1=Math.hypot(a1,b1), C2=Math.hypot(a2,b2), cm=(C1+C2)/2;
  const G=.5*(1-Math.sqrt(cm**7/(cm**7+25**7)));
  const ap1=(1+G)*a1, ap2=(1+G)*a2;
  const cp1=Math.hypot(ap1,b1),cp2=Math.hypot(ap2,b2);
  const hue=(x,y)=>(Math.atan2(y,x)*deg+360)%360;
  const h1=hue(ap1,b1),h2=hue(ap2,b2);
  const dl=L2-L1,dc=cp2-cp1;
  let dh=h2-h1;
  if (!cp1 || !cp2) dh=0;
  else if(dh>180) dh-=360; else if(dh< -180) dh+=360;
  const dH=2*Math.sqrt(cp1*cp2)*Math.sin(dh*rad/2);
  const lm=(L1+L2)/2, cpm=(cp1+cp2)/2;
  let hm=h1+h2;
  if(cp1 && cp2) hm=Math.abs(h1-h2)<=180 ? hm/2 : (hm+(hm<360?360:-360))/2;
  const T=1-.17*Math.cos((hm-30)*rad)+.24*Math.cos(2*hm*rad)+.32*Math.cos((3*hm+6)*rad)-.20*Math.cos((4*hm-63)*rad);
  const Sl=1+.015*(lm-50)**2/Math.sqrt(20+(lm-50)**2), Sc=1+.045*cpm, Sh=1+.015*cpm*T;
  const Rt=-2*Math.sqrt(cpm**7/(cpm**7+25**7))*Math.sin(60*Math.exp(-(((hm-275)/25)**2))*rad);
  return Math.sqrt((dl/Sl)**2+(dc/Sc)**2+(dH/Sh)**2+Rt*(dc/Sc)*(dH/Sh));
}

const kaNames = {black:'შავი',white:'თეთრი',gray:'ნაცრისფერი',grey:'ნაცრისფერი',green:'მწვანე',blue:'ლურჯი',red:'წითელი',yellow:'ყვითელი',orange:'ნარინჯისფერი',purple:'იისფერი',pink:'ვარდისფერი',olive:'ზეთისხილისფერი',teal:'მომწვანო ლურჯი',turquoise:'ფირუზისფერი',indigo:'ინდიგო',brown:'ყავისფერი',sienna:'სიენა',maroon:'შინდისფერი',navy:'მუქი ლურჯი',coral:'მარჯნისფერი',salmon:'ორაგულისფერი',gold:'ოქროსფერი',tan:'მოყავისფრო',beige:'ბეჟი',khaki:'ხაკი',ivory:'სპილოს ძვლისფერი',lavender:'ლავანდისფერი',plum:'ქლიავისფერი',chocolate:'შოკოლადისფერი',tomato:'პომიდვრისფერი',crimson:'ჟოლოსფერი',lime:'ლაიმისფერი',cyan:'ცისფერი',magenta:'მაჯენტა',violet:'იისფერი',orchid:'ორქიდეისფერი',wheat:'ხორბლისფერი',silver:'ვერცხლისფერი',azure:'ლაჟვარდისფერი',aquamarine:'აკვამარინი',firebrick:'აგურისფერი',peru:'მიწისფერი',thistle:'ბაცი იასამნისფერი',snow:'თოვლისფერი',honeydew:'ბაცი მწვანე',seashell:'ნიჟარისფერი',cornsilk:'ბაცი კრემისფერი',linen:'სელისფერი',bisque:'კრემისფერი',moccasin:'ბაცი ქვიშისფერი',papayawhip:'ბაცი ატმისფერი',peachpuff:'ატმისფერი',lemonchiffon:'ბაცი ლიმონისფერი',mistyrose:'ნისლიანი ვარდისფერი',gainsboro:'ღია ნაცრისფერი',whitesmoke:'მოთეთრო'};
const modifiers={dark:'მუქი',light:'ღია',medium:'საშუალო',pale:'ბაცი',deep:'ღრმა',slate:'ფიქლის',forest:'ტყის',sea:'ზღვის',spring:'გაზაფხულის',steel:'ფოლადის',royal:'სამეფო',sky:'ცის',midnight:'შუაღამის',dodger:'კაშკაშა',cornflower:'ღიღილოს',cadet:'მონაცრისფრო',sandy:'ქვიშის',rosy:'მოვარდისფრო',saddle:'უნაგირის',olive:'ზეთისხილის',goldenrod:'ოქროწკეპლას',blanchedalmond:'ნუშის',burlywood:'ხის',chartreuse:'მოყვითალო მწვანე',rebeccapurple:'რებეკას იისფერი',oldlace:'ბაცი კრემისფერი',floralwhite:'ყვავილის თეთრი',ghostwhite:'მოლურჯო თეთრი',aliceblue:'ბაცი ცისფერი',antiquewhite:'მოყვითალო თეთრი',mintcream:'პიტნის კრემისფერი',lavenderblush:'ბაცი ვარდისფერი',navajowhite:'ქვიშისფერი',powderblue:'ბაცი ცისფერი',hotpink:'კაშკაშა ვარდისფერი',greenyellow:'მოყვითალო მწვანე',yellowgreen:'მოყვითალო მწვანე',orangered:'მოწითალო ნარინჯისფერი',goldenrod:'ოქროწკეპლასფერი'};
function translateName(name) {
  if(name==='olivedrab')return 'მუქი ზეთისხილისფერი';
  if (kaNames[name] || modifiers[name]) return kaNames[name] || modifiers[name];
  for(const prefix of Object.keys(modifiers).sort((a,b)=>b.length-a.length)) {
    if(name.startsWith(prefix)) return modifiers[prefix]+' '+translateName(name.slice(prefix.length));
  }
  for(const suffix of Object.keys(kaNames).sort((a,b)=>b.length-a.length)) {
    if(name.endsWith(suffix)) return kaNames[suffix];
  }
  return 'შერეული ტონი';
}
const named=Object.entries(cssNames).map(([name,rgb])=>({name,ka:translateName(name),rgb,lab:rgbLab(rgb)}));
export function nearestName(hex) {
  const lab=hexLab(hex);
  return named.reduce((best,n)=>{ const distance=deltaE(lab,n.lab); return distance<best.distance ? {...n,distance} : best; },{distance:Infinity});
}

// Bounded, deterministic coarse-to-fine search. Run in a Worker, never the UI thread.
export function solveRecipes(pigments, target, progress=()=>{}) {
  const goal=hexLab(target), pool=[];
  const evaluate=(ids,weights)=>{
    const hex=mixHex(ids.map(i=>pigments[i].hex),weights);
    return {ids,weights:normalize(weights),hex,delta:deltaE(hexLab(hex),goal)};
  };
  const keep=r=>{ pool.push(r); if(pool.length>80) {pool.sort((a,b)=>a.delta-b.delta);pool.length=40;} };
  for(let i=0;i<pigments.length;i++) {
    for(let j=i+1;j<pigments.length;j++) {
      let best={delta:Infinity};
      for(let t=1;t<10;t++) {const r=evaluate([i,j],[t,10-t]);if(r.delta<best.delta)best=r;}
      keep(best);
    }
    if(i%12===0)progress(Math.round(i/pigments.length*65));
  }
  pool.sort((a,b)=>a.delta-b.delta);pool.length=Math.min(24,pool.length);
  const refine=seed=>{
    let best=seed;
    for(const step of [.05,.02,.005]) {
      let improved=true, passes=0;
      while(improved && passes++<20) {
        improved=false;
        for(let i=0;i<best.weights.length;i++)for(let j=0;j<best.weights.length;j++) {
          if(i===j||best.weights[j]<=step+.005)continue;
          const w=[...best.weights];w[i]+=step;w[j]-=step;
          const candidate=evaluate(best.ids,w);
          if(candidate.delta<best.delta-1e-8){best=candidate;improved=true;}
        }
      }
    }
    return best;
  };
  const pairs=pool.map(refine).sort((a,b)=>a.delta-b.delta);
  const triples=[];
  // Extend the best pair seeds with each possible third pigment, then refine.
  for(let p=0;p<Math.min(6,pairs.length);p++) {
    const pair=pairs[p];
    for(let k=0;k<pigments.length;k++) {
      if(pair.ids.includes(k))continue;
      for(const t of [.1,.3,.5]) {
        const r=evaluate([...pair.ids,k],[...pair.weights.map(w=>w*(1-t)),t]);
        triples.push(r);
      }
    }
    progress(65+Math.round((p+1)/6*25));
  }
  triples.sort((a,b)=>a.delta-b.delta);
  const candidates=[...pairs,...triples.slice(0,18).map(refine)];
  // Prefer a simple pair when within 0.6 ΔE00 of a triple.
  candidates.sort((a,b)=>(a.delta+.6*(a.ids.length-2))-(b.delta+.6*(b.ids.length-2)));
  const seen=new Set(), results=[];
  // Expose the best simple recipe as an alternative to closer triples.
  const bestPair=pairs[0];
  if(bestPair){const at=candidates.indexOf(bestPair);if(at>=5){candidates.splice(at,1);candidates.splice(1,0,bestPair);}}
  for(const r of candidates) {
    const key=[...r.ids].sort((a,b)=>a-b).join(',');
    if(seen.has(key))continue;seen.add(key);
    results.push({...r,recipe:r.ids.map((i,j)=>({id:pigments[i].id,weight:r.weights[j]*100}))});
    if(results.length===5)break;
  }
  progress(100);return results;
}
