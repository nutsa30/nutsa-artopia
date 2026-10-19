import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Image as ImageIcon, Plus, Save } from "lucide-react";
import {
  createMainCategory,
  getCategoryManagement,
  updateMainCategory,
  updateSubcategory,
} from "../../api";
import styles from "./CategoryManagement.module.css";

const ICONS = ["🎨", "🖌️", "✏️", "📚", "✂️", "🧸", "🎁", "🧵", "🧩", "🔌", "✨", "📌"];

export default function CategoryManagement() {
  const [data, setData] = useState({ main_categories: [], subcategories: [], ungrouped_count: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({ name: "", slug: "" });

  const load = async () => {
    setLoading(true);
    setError("");
    try { setData(await getCategoryManagement()); }
    catch (e) { setError(e.message || "კატეგორიები ვერ ჩაიტვირთა"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const out = new Map(data.main_categories.map((main) => [main.id, []]));
    out.set(null, []);
    data.subcategories.forEach((sub) => (out.get(sub.main_category_id) || out.get(null)).push(sub));
    return out;
  }, [data]);

  const saveSub = async (sub, patch) => {
    setSaving(`sub-${sub.id}`); setError("");
    try {
      const updated = await updateSubcategory(sub.id, patch);
      setData((current) => ({ ...current,
        subcategories: current.subcategories.map((item) => item.id === sub.id ? updated : item),
        ungrouped_count: current.subcategories.map((item) => item.id === sub.id ? updated : item)
          .filter((item) => item.is_active && item.main_category_id == null).length,
      }));
    } catch (e) { setError(e.message); }
    finally { setSaving(""); }
  };

  const saveMain = async (main, form) => {
    setSaving(`main-${main.id}`); setError("");
    try {
      const payload = new FormData(form);
      payload.set("is_active", form.elements.is_active.checked ? "true" : "false");
      const updated = await updateMainCategory(main.id, payload);
      setData((current) => ({ ...current,
        main_categories: current.main_categories.map((item) => item.id === main.id ? updated : item),
      }));
    } catch (e) { setError(e.message); }
    finally { setSaving(""); }
  };

  const createMain = async (event) => {
    event.preventDefault();
    if (!draft.name.trim()) return;
    setSaving("new"); setError("");
    try {
      const created = await createMainCategory(draft);
      setData((current) => ({ ...current, main_categories: [...current.main_categories, created] }));
      setDraft({ name: "", slug: "" });
    } catch (e) { setError(e.message); }
    finally { setSaving(""); }
  };

  if (loading) return <main className={styles.page}><p>იტვირთება…</p></main>;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>Artopia კატალოგი</p><h1>კატეგორიების მართვა</h1>
          <p>Optimo-ს კატეგორიები უცვლელი რჩება. აქ მხოლოდ მათი ჯგუფი, ხილვადობა და SEO იმართება.</p></div>
        <div className={`${styles.status} ${data.ungrouped_count ? styles.warning : styles.ready}`}>
          {data.ungrouped_count ? <AlertCircle size={18} /> : <Check size={18} />}
          {data.ungrouped_count ? `${data.ungrouped_count} დაუჯგუფებელი` : "ყველა კატეგორია დაჯგუფებულია"}
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      <form className={styles.create} onSubmit={createMain}>
        <Plus size={20} /><input aria-label="მთავარი კატეგორიის სახელი" placeholder="ახალი მთავარი კატეგორია"
          value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <input aria-label="slug" placeholder="slug (არასავალდებულო)" value={draft.slug}
          onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
        <button disabled={saving === "new"}>დამატება</button>
      </form>

      {data.ungrouped_count > 0 && (
        <section className={styles.ungrouped}><h2>დაჯგუფებას საჭიროებს</h2>
          {(grouped.get(null) || []).filter((sub) => sub.is_active).map((sub) => (
            <SubcategoryRow key={sub.id} sub={sub} mains={data.main_categories} saving={saving} onSave={saveSub} />
          ))}
        </section>
      )}

      <div className={styles.mainGrid}>
        {data.main_categories.map((main) => (
          <section key={main.id} className={styles.mainCard}>
            <form onSubmit={(e) => { e.preventDefault(); saveMain(main, e.currentTarget); }}>
              <div className={styles.preview} style={main.image_url ? { backgroundImage: `url(${main.image_url})` } : undefined}>
                {!main.image_url && <><ImageIcon size={28} /><span>ფოტო ჯერ არ არის</span></>}
              </div>
              <div className={styles.fields}>
                <input name="name" defaultValue={main.name} aria-label="დასახელება" />
                <input name="slug" defaultValue={main.slug} aria-label="slug" />
                <textarea name="description" defaultValue={main.description || ""} placeholder="აღწერა" />
                <input name="meta_title" defaultValue={main.meta_title || ""} placeholder="SEO title" />
                <textarea name="meta_description" defaultValue={main.meta_description || ""} placeholder="Meta description" />
                <div className={styles.split}><label>რიგი <input name="sort_order" type="number" defaultValue={main.sort_order} /></label>
                  <label className={styles.check}><input name="is_active" type="checkbox" value="true" defaultChecked={main.is_active} /> აქტიური</label></div>
                <label className={styles.file}>ფოტო <input name="image" type="file" accept="image/jpeg,image/png,image/webp" />
                  <small>რეკომენდებული ზომა: {data.recommended_image_size || "1600 × 900 px"}</small></label>
                <button className={styles.save} disabled={saving === `main-${main.id}`}><Save size={17} /> შენახვა</button>
              </div>
            </form>
            <div className={styles.subList}>
              {(grouped.get(main.id) || []).map((sub) => <SubcategoryRow key={sub.id} sub={sub}
                mains={data.main_categories} saving={saving} onSave={saveSub} />)}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function SubcategoryRow({ sub, mains, saving, onSave }) {
  return <div className={styles.subRow}>
    <select aria-label={`${sub.name} icon`} value={sub.icon || ""} onChange={(e) => onSave(sub, { icon: e.target.value })}>
      <option value="">◌</option>{ICONS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
    </select>
    <div><strong>{sub.name}</strong><span>{sub.product_count} პროდუქტი</span></div>
    <select aria-label={`${sub.name} მთავარი კატეგორია`} value={sub.main_category_id ?? ""}
      onChange={(e) => onSave(sub, { main_category_id: e.target.value || null })}>
      <option value="">დაუჯგუფებელი</option>{mains.map((main) => <option key={main.id} value={main.id}>{main.name}</option>)}
    </select>
    <label className={styles.miniCheck}><input type="checkbox" checked={sub.is_visible}
      onChange={(e) => onSave(sub, { is_visible: e.target.checked })} /> ხილული</label>
    <label className={styles.miniCheck}><input type="checkbox" checked={sub.is_featured}
      onChange={(e) => onSave(sub, { is_featured: e.target.checked })} /> რჩეული</label>
    {saving === `sub-${sub.id}` && <span className={styles.saving}>ინახება…</span>}
  </div>;
}
