// კატეგორიის გვერდის ქვედა ტექსტი (გზამკვლევი + ხშირი კითხვები).
//
// ტექსტი თითო მთავარ კატეგორიაზე ერთ ფაილშია (main-<id>.js) და ცალკე chunk-ად
// იტვირთება მხოლოდ მაშინ, როცა შესაბამისი კატეგორიის გვერდი იხსნება — მთავარ
// bundle-ს არ ამძიმებს. გასაღები კატეგორიის id-ია (Optimo-ს id არ იცვლება, slug კი
// სახელთან ერთად იცვლება), ბმულებიც id-ით იწერება: [ტექსტი](cat:<id>) / (main:<id>).
import { SUB_GUIDE_FILE } from "./fileMap";

const loaders = import.meta.glob("./main-*.js");

export async function loadCategoryGuide(kind, id) {
  const fileId = kind === "main" ? Number(id) : SUB_GUIDE_FILE[Number(id)];
  const load = fileId && loaders[`./main-${fileId}.js`];
  if (!load) return null;
  const mod = await load();
  const data = mod.default || {};
  return (kind === "main" ? data.main : data.subs?.[Number(id)]) || null;
}
