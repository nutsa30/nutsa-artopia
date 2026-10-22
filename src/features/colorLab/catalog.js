export const PAINT_CATEGORIES=['pigmentebi','akrilis-saghebavebi','zetis-saghebavebi','akvarelis-saghebavebi','guashis-saghebavebi','nachris-saghebavebi'];
export const normalizeText=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[’`]/g,"'").replace(/[^\p{L}\p{N}:]+/gu,' ').trim();
const containsPhrase=(text,phrase)=>{const words=normalizeText(phrase).split(' ').filter(Boolean);return words.length>0&&words.every(w=>text.split(' ').includes(w));};
export const SHOP_ALIASES={
  '14101':['ტიტანის თეთრი','Titanium White'], '14102':['თუთიის თეთრი','Zinc White'],
  '14494':['ულტრამარინის ლურჯი','Ultramarine'], '14495':['ულტრამარინის იისფერი'],
  '14492':['პრუსიული ლურჯი'], '14487':['კობალტის ლურჯი'], '14477':['საფირონის ლურჯი'],
  '14519':['ფტალის მწვანე','ფტალოს მწვანე','Phthalocyanine Green'],
  '14484':['Phthalocyanine Blue'], '14535':['კობალტის მწვანე'],
  '14661':['გამომწვარი სიენა','დამწვარი სიენა'], '14668':['გამომწვარი უმბრა','დამწვარი უმბრა'],
  '14667':['ბუნებრივი უმბრა'], '14655':['ყვითელი ოხრა'], '14347':['კადმიუმის წითელი','Cadmium Red'],
  '14225':['კადმიუმის ყვითელი','Cadmium Yellow'], '14228':['კადმიუმის სტაფილოსფერი','Cadmium Orange'],
  '14645':['რკინის წითლი','წითელი ოხრა'], '14783':['მონაცრისფრო ლურჯი'],
};
export function matchProduct(product,pigment) {
  if(!PAINT_CATEGORIES.includes(product.category_slug))return null;
  const text=normalizeText(product.name);
  if(pigment.productId!=null&&pigment.productId===product.id)return {kind:'product',label:'Artopia-ს პიგმენტი · ეკრანული მიახლოება'};
  const names=[pigment.name,pigment.ka,...pigment.aliases,...(SHOP_ALIASES[pigment.id]||[])];
  if(names.some(n=>containsPhrase(text,n)))return {kind:'name',label:'სახელის დამთხვევა · შემადგენლობა გადაამოწმეთ'};
  // CI numbers must match as tokens: PB15 is not PB15:3; no image-based inference.
  if(pigment.pigments.some(code=>text.split(' ').includes(code.toLowerCase())))return {kind:'pigment',label:'პიგმენტის კოდის დამთხვევა'};
  return null;
}
export function profileForProduct(product,pigments) {
  // Prefer specific names; do not classify 'emerald green' as generic green.
  const text=normalizeText(product.name);
  const candidates=pigments.filter(p=>matchProduct(product,p));
  const score=p=>p.productId===product.id&&p.productId!=null?10000:Math.max(0,...[p.name,p.ka,...p.aliases,...(SHOP_ALIASES[p.id]||[])].filter(n=>containsPhrase(text,n)).map(n=>normalizeText(n).length));
  return candidates.sort((a,b)=>score(b)-score(a))[0]||null;
}
export function dryPigmentProfiles(products,pigments) {
  const english={
    'საშუალო მწვანე':'Medium Green','ფტალის მწვანე':'Phthalo Green','კადმიუმის სტაფილოსფერი':'Cadmium Orange',
    'კობალტის მწვანე':'Cobalt Green','გამომწვარი სიენა':'Burnt Sienna','გამომწვარი უმბრა':'Burnt Umber',
    'ულტრამარინის ლურჯი':'Ultramarine Blue','ულტრამარინის იისფერი':'Ultramarine Violet','კადმიუმის წითელი':'Cadmium Red',
    'მონაცრისფრო ლურჯი':'Grey Blue','კობალტის ლურჯი':'Cobalt Blue','საფირონის ლურჯი':'Sapphire Blue',
    'ჰანსას ყვითელი':'Hansa Yellow','ყვითელი ოხრა':'Yellow Ochre','წითელი ოხრა':'Red Ochre','თუთიის თეთრი':'Zinc White',
    'ტიტანის თეთრი':'Titanium White','ბუნებრივი უმბრა':'Raw Umber','კადმიუმის ყვითელი':'Cadmium Yellow',
    'შავი ოხრა':'Black Ochre','პრუსიული ლურჯი':'Prussian Blue','რკინის წითლი':'Iron Oxide Red','საშუალო ყვითელი':'Medium Yellow',
  };
  const fallbacks=[['ჰანსას ყვითელი','#F2CB16'],['საშუალო ყვითელი','#ECCB19'],['საშუალო მწვანე','#3B8452'],['შავი ოხრა','#36312B']];
  return products.filter(p=>p.category_slug==='pigmentebi').map(p=>{
    const known=profileForProduct(p,pigments);
    const fallback=fallbacks.find(([name])=>p.name.includes(name));
    const ka=p.name.replace(/^პიგმენტი\s*/,'');
    return {id:'shop-'+p.id,productId:p.id,name:english[ka]||known?.name||'Artist Pigment',ka,aliases:[p.name],pigments:[],hex:known?.hex||fallback?.[1]||'#76716A',opacity:'მწარმოებლის მონაცემი უცნობია',profile:'modeled-rgb',source:`https://artopia.ge/products/${p.slug}`,brandReference:'Artopia-ს მშრალი პიგმენტი',note:'სახელიდან შერჩეული ეკრანული მიახლოება. Pigment Index, სპექტრი და შემკვრელში ქცევა გაზომილი არ არის.'};
  });
}
// These are explicitly approximate screen colors for catalogue names, not CI identities.
const paintNames=[
  ['Orange Red','მოწითალო ნარინჯისფერი','#D75F35'],['Crimson','ჟოლოსფერი','#A72E48'],
  ['Emerald Green','ზურმუხტისფერი მწვანე','#16845B'],['Dark Verdigris','მუქი ვერდიგრისი','#31534C'],
  ['Green Deep','მუქი მწვანე','#285542'],['Green Pale','ღია მწვანე','#87B96C'],
  ['Yellow Pale','ღია ყვითელი','#EDDD6B'],["Marie's Yellow",'მარიეს ყვითელი','#E8CB30'],
  ['Red Middle','საშუალო წითელი','#C6453A'],['Purple Red','მეწამული წითელი','#8F3655'],
  ["Marie's Violet",'მარიეს იისფერი','#794B89'],['Grey Deep','მუქი ნაცრისფერი','#55565A'],
  ['Bright Red','კაშკაშა წითელი','#DE3E39'],['Bright Orange','კაშკაშა ნარინჯისფერი','#EE7E28'],
  ['Scarlet Lake','ალისფერი ლაქი','#C83C38'],['Scarlet','ალისფერი','#D43C30'],
  ['Rose Pale','ბაცი ვარდისფერი','#DEA6B1'],['Rose','ვარდისფერი','#C86A94'],
  ['Purple Pale','ბაცი იისფერი','#AFA3C8'],['Turquoise Blue','ფირუზისფერი ლურჯი','#3D9AA5'],
  ['Sky Blue','ცისფერი','#85B6CD'],['Pink','ვარდისფერი','#DEA1AD'],
  ['Soft Mix White Row','შერევის თეთრი','#F0EDE2'],['Mixing White','შერევის თეთრი','#EEECE5'],
  ['თეთრი','თეთრი','#F1EFE8'],['Black','შავი','#242323'],['შავი','შავი','#242323'],
];
// Keep the actual shade label independent of the reference used for RGB.
// In particular "Zinc Titanium White" is not "Titanium White", and a Hue,
// Light, Pale or Deep product must not be recommended for its parent name.
export function productColorName(product) {
  let label = String(product.name || '')
    .replace(/\b(?:maries|marie['’`]s)\b/i, ' ')
    .replace(/winsor\s*&\s*newton/gi, ' ')
    .replace(/\b(?:winton|galeria|finenolo|dozzen|dozen|deli|primo|gamma|luch|maries)\b/gi, ' ')
    .replace(/\b[a-z]\d+[-_][a-z]+\b/gi, ' ')
    .replace(/\d+(?:[.,]\d+)?\s*(?:ml|მლ|გ|მ|g|kg)?/gi, ' ')
    .replace(/[^a-zA-Z'’` -]/g, ' ').replace(/\b(?:ml|x)\b/gi, ' ').replace(/\s+/g, ' ').trim().replace(/^[\s'-]+|[\s'-]+$/g, '');
  if (!label) {
    const text = normalizeText(product.name);
    if (text.includes('ტიტანის თეთრი')) label = 'Titanium White';
    else if (text.includes('თუთიის თეთრი')) label = 'Zinc White';
    else if (text.includes('თეთრი')) label = 'White';
    else if (text.includes('შავი')) label = 'Black';
  }
  return label.replace(/[’`]/g, "'").toLowerCase().replace(/(^|[\s-])[a-z]/g, c => c.toUpperCase());
}
export function storePaintProfiles(products,pigments){
  return products.filter(p=>p.category_slug!=='pigmentebi').flatMap(p=>{
    const text=normalizeText(p.name);
    if(/ბრჭყვიალა|ოქროსფერი|ვერცხლისფერი|\bgold\b|\bsilver\b/.test(text))return [];
    // Sets and accessories have no single-color profile.
    if(/\d+\s*(?:ფერიანი|ფ\b)|ფურცლები|ჭიქა|სელის ზეთი/u.test(text))return [];
    const base=profileForProduct(p,pigments);
    const guess=paintNames.find(([n])=>containsPhrase(text,n));
    if(!base&&!guess)return [];
    const hex=base?.hex||guess[2],ka=base?.ka||guess[1],name=productColorName(p);
    if(!name)return [];
    return [{id:'paint-'+p.id,productId:p.id,material:p.category_name,name,ka,aliases:[p.name],pigments:[],hex,opacity:'პროდუქტის დაფარვა დაუდასტურებელია',profile:'modeled-rgb',source:`https://artopia.ge/products/${p.slug}`,brandReference:p.brand||'Artopia-ს საღებავი',note:'ამ პროდუქტის სახელისთვის შერჩეული მიახლოებითი ეკრანული პროფილი. მწარმოებლის სპექტრი, PI კოდი და შეფერილობის ძალა გაზომილი არ არის.'}];
  });
}
let shopRequest;
export function loadShopCatalog(api,fetcher=fetch) {
  if(shopRequest)return shopRequest;
  shopRequest=Promise.all(PAINT_CATEGORIES.map(async category=>{
    const items=[];let page=1,total=Infinity;
    while(items.length<total) {
      const r=await fetcher(`${api}/products/list?${new URLSearchParams({category,limit:'100',page:String(page)})}`,{signal:AbortSignal.timeout(15000)});
      if(!r.ok)throw new Error('კატალოგის ჩატვირთვა ვერ მოხერხდა');
      const data=await r.json();
      if(!Array.isArray(data.items)||!Number.isFinite(data.total))throw new Error('კატალოგის პასუხი ვერ დამუშავდა');
      total=data.total;items.push(...data.items);page++;
      if(!data.items.length)break;
    }
    return items;
  })).then(groups=>[...new Map(groups.flat().map(p=>[p.id,p])).values()]).catch(e=>{shopRequest=null;throw e;});
  return shopRequest;
}
