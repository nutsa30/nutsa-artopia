import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, PenLine, ExternalLink, RefreshCw, Clock, History, GraduationCap } from "lucide-react";
import styles from "./BlogReview.module.css";
import { authHeaders } from "../../api";
import ArticleV2 from "../../../features/blogV2/ArticleV2";
import { kaDate } from "../../../features/blogV2/format";
import BlogOrders from "./BlogOrders";
import ArticleEditor from "./ArticleEditor";

// ბლოგის რედაქცია: რედაქციის (AI) სტატიები აქ ჩნდება მონახაზად. ადმინი კითხულობს, საჭიროებისას თავად ასწორებს
// (რედაქტორი, ArticleEditor) და აქვეყნებს, ან უარყოფს (არქივი). შენიშვნით რედაქციაში დაბრუნება 2026-10-22-დან აღარ არის:
// რედაქცია მფლობელის ხელით შესწორებებიდან სწავლობს (მხოლოდ გამოქვეყნებული სტატიისა).
// backend: /blogs/admin/review, /blogs/admin/<id>/review, /blogs/admin/<id>/doc, /blogs/admin/<id>/category (app/blog_editorial.py).

const BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/blogs";

const TABS = [
  { key: "pending", label: "განსახილველი" },
  { key: "revising", label: "გასწორებაზე", onlyIfAny: true }, // ძველი შენიშვნები (აღარ იქმნება)
  { key: "approved", label: "გამოქვეყნებული" },
  { key: "rejected", label: "უარყოფილი" },
];
const STATUS_LABEL = { pending: "ელოდება შენს გადაწყვეტილებას", revising: "რედაქცია ასწორებს (ძველი შენიშვნა)", approved: "გამოქვეყნებულია", rejected: "უარყოფილია" };
const ACTION_LABEL = { approve: "დადასტურდა", reject: "უარყოფილია", revise: "შენიშვნა" };
const CATEGORIES = [
  ["siakhleebi", "სიახლეები"],
  ["khelovnebis-istoria", "ხელოვნების ისტორია"],
  ["rchevebi-da-gidebi", "რჩევები და გიდები"],
  ["masalebi-da-teqnikebi", "მასალები და ტექნიკები"],
  ["kreativi-da-ideebi", "კრეატივი და იდეები"],
];

async function call(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: authHeaders({ "Content-Type": "application/json", ...(init.headers || {}) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `შეცდომა (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}

const shortDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${kaDate(iso)}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function Decision({ item, onDone, onAuthError, onEdit }) {
  const [mode, setMode] = useState(null); // null | approve | reject
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setMode(null); setNote(""); setError(""); }, [item.id, item.revision]);

  const send = async () => {
    if (mode === "reject" && !note.trim()) {
      setError("დაწერე უარყოფის მიზეზი");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const updated = await call(`/admin/${item.id}/review`, {
        method: "POST",
        body: JSON.stringify({ action: mode, note: note.trim() || null, revision: item.revision }),
      });
      onDone(updated);
    } catch (e) {
      if (e.status === 401) return onAuthError();
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (item.review_status === "approved") {
    return (
      <div className={styles.actions}>
        <button type="button" className={styles.revise} onClick={onEdit}><PenLine size={18} /> რედაქტირება</button>
      </div>
    );
  }
  if (item.review_status !== "pending") return null;

  const prompts = {
    approve: { title: "გამოქვეყნება", hint: "სტატია ახლავე გამოჩნდება საიტზე, კატეგორიაში „" + (item.category_name || "") + "“.", placeholder: "კომენტარი (არასავალდებულო)", button: "გამოქვეყნება" },
    reject: { title: "უარყოფა", hint: "სტატია არქივში გადავა და საიტზე არ გამოჩნდება. მიზეზს რედაქცია მომავალ სტატიებში ითვალისწინებს.", placeholder: "რატომ არ გამოდგება?", button: "უარყოფა" },
  };
  const p = mode && prompts[mode];

  return (
    <div className={styles.decision}>
      {!mode && (
        <div className={styles.actions}>
          <button type="button" className={styles.revise} onClick={onEdit}><PenLine size={18} /> რედაქტირება</button>
          <button type="button" className={styles.approve} onClick={() => setMode("approve")}><Check size={18} /> გამოქვეყნება</button>
          <button type="button" className={styles.reject} onClick={() => setMode("reject")}><X size={18} /> უარყოფა</button>
        </div>
      )}
      {p && (
        <div className={`${styles.form} ${styles[`form_${mode}`]}`}>
          <strong>{p.title}</strong>
          <p>{p.hint}</p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={p.placeholder} rows={mode === "approve" ? 3 : 6} maxLength={4000} autoFocus />
          {error && <div className={styles.formError}>{error}</div>}
          <div className={styles.formButtons}>
            <button type="button" className={styles[mode]} onClick={send} disabled={busy}>{busy ? "იგზავნება..." : p.button}</button>
            <button type="button" className={styles.cancel} onClick={() => { setMode(null); setError(""); }} disabled={busy}>გაუქმება</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BlogReview() {
  const navigate = useNavigate();
  const [data, setData] = useState({ items: [], counts: {}, available: true });
  const [tab, setTab] = useState("pending");
  const [selectedId, setSelectedId] = useState(null);
  const [article, setArticle] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const onAuthError = useCallback(() => {
    localStorage.removeItem("ADMIN_TOKEN"); sessionStorage.removeItem("ADMIN_TOKEN");
    localStorage.removeItem("ADMIN_ROLE"); sessionStorage.removeItem("ADMIN_ROLE");
    navigate("/admin/login", { replace: true });
  }, [navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await call("/admin/review"));
    } catch (e) {
      if (e.status === 401) return onAuthError();
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => { load(); }, [load]);

  const items = useMemo(() => data.items.filter((i) => i.review_status === tab), [data.items, tab]);
  const selected = data.items.find((i) => i.id === selectedId) || items[0] || null;

  useEffect(() => { setEditing(false); }, [selected?.id]);

  useEffect(() => {
    if (!selected) { setArticle(null); return; }
    let alive = true;
    setArticle(null);
    call(`/admin/${selected.id}`)
      .then((full) => alive && setArticle(full))
      .catch((e) => { if (e.status === 401) onAuthError(); else if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [selected?.id, selected?.revision, onAuthError]); // eslint-disable-line react-hooks/exhaustive-deps

  const replaceItem = (updated) => {
    setData((d) => {
      const list = d.items.map((i) => (i.id === updated.id ? updated : i));
      const counts = Object.fromEntries(TABS.map((t) => [t.key, list.filter((i) => i.review_status === t.key).length]));
      return { ...d, items: list, counts };
    });
  };

  const changeCategory = async (key) => {
    try {
      const r = await call(`/admin/${selected.id}/category`, { method: "PUT", body: JSON.stringify({ category: key }) });
      replaceItem({ ...selected, category: r.category, category_name: r.category_name });
      setArticle((a) => a && { ...a, category: r.category, category_name: r.category_name });
    } catch (e) {
      if (e.status === 401) return onAuthError();
      setError(e.message);
    }
  };

  return (
    <div className={styles.shell}>
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Artopia-ს რედაქცია</span>
          <h1>ბლოგის რედაქცია</h1>
          <p>შეუკვეთე თემა, ან გადახედე რედაქციის სტატიებს: საჭიროებისას თავად შეასწორე და გამოაქვეყნე, ან უარყავი. შენს შესწორებებს რედაქცია შემდეგ სტატიებში ითვალისწინებს.</p>
        </div>
        <button type="button" className={styles.refresh} onClick={load} disabled={loading}><RefreshCw size={16} /> განახლება</button>
      </header>

      {!data.available && <div className={styles.notice}>ბლოგის რედაქცია ბაზაში ჯერ ჩართული არ არის (მიგრაცია).</div>}
      {error && <div className={styles.error}>{error}</div>}

      <BlogOrders
        call={call}
        onAuthError={onAuthError}
        formatDate={shortDate}
        onOpenArticle={(id, status) => { if (status) setTab(status); setSelectedId(id); }}
      />

      <nav className={styles.tabs}>
        {TABS.filter((t) => !t.onlyIfAny || data.counts?.[t.key]).map((t) => (
          <button key={t.key} type="button" className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
            onClick={() => { setTab(t.key); setSelectedId(null); }}>
            {t.label}{data.counts?.[t.key] ? <span className={styles.badge}>{data.counts[t.key]}</span> : null}
          </button>
        ))}
      </nav>

      <div className={styles.layout}>
        <aside className={styles.list}>
          {loading && <div className={styles.muted}>იტვირთება...</div>}
          {!loading && items.length === 0 && (
            <div className={styles.emptyList}>
              {tab === "pending" ? "განსახილველი სტატია ახლა არ არის." : "აქ ჯერ არაფერია."}
            </div>
          )}
          {items.map((i) => (
            <button key={i.id} type="button" className={`${styles.item} ${selected?.id === i.id ? styles.itemActive : ""}`} onClick={() => setSelectedId(i.id)}>
              {i.cover_image && <img src={i.cover_image.replace("/upload/", "/upload/c_fill,w_160,h_100,q_auto,f_auto/")} alt="" width="80" height="50" />}
              <span>
                <b>{i.title}</b>
                <small>{i.category_name || "კატეგორიის გარეშე"} · ვერსია {i.revision} · {shortDate(i.draft_updated_at)}</small>
              </span>
            </button>
          ))}
        </aside>

        {selected && (
          <section className={styles.main}>
            <div className={styles.panel}>
              <div className={styles.panelTop}>
                <span className={`${styles.status} ${styles[`status_${selected.review_status}`]}`}>
                  {selected.review_status === "revising" ? <Clock size={15} /> : null}
                  {STATUS_LABEL[selected.review_status]}
                </span>
                <span className={styles.muted}>ვერსია {selected.revision} · {selected.word_count} სიტყვა</span>
                {selected.review_status === "approved" && (
                  <a className={styles.siteLink} href={`/blog/${selected.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={15} /> საიტზე ნახვა</a>
                )}
              </div>

              <label className={styles.category}>
                კატეგორია
                <select value={selected.category || ""} onChange={(e) => changeCategory(e.target.value || null)}>
                  {!selected.category && <option value="">აირჩიე</option>}
                  {CATEGORIES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                </select>
              </label>

              {selected.editor_note && selected.revision > 1 && (
                <div className={styles.editorNote}><b>რედაქცია: რა შეიცვალა ამ ვერსიაში</b><p>{selected.editor_note}</p></div>
              )}

              {selected.review_status === "revising" && (
                <div className={styles.waiting}>
                  შენი შენიშვნა რედაქციაშია. აგენტები ტექსტს გაასწორებენ და ახალი ვერსია აქ, „განსახილველში“ გამოჩნდება.
                </div>
              )}

              {!editing && (
                <Decision item={selected} onAuthError={onAuthError} onEdit={() => setEditing(true)}
                  onDone={(u) => { replaceItem(u); setTab(u.review_status); setSelectedId(u.id); }} />
              )}

              {selected.review_status !== "rejected" && (
                <div className={styles.learning}>
                  <GraduationCap size={16} />
                  {selected.owner_edits > 0
                    ? (selected.review_status === "approved"
                      ? <span>შენ ეს სტატია ხელით შეასწორე ({selected.owner_edits}-ჯერ): რედაქცია ამ ცვლილებებს შემდეგი სტატიის დაწყებამდე ისწავლის.</span>
                      : <span>შეასწორე ({selected.owner_edits}-ჯერ). რედაქცია ამას გამოქვეყნების შემდეგ ისწავლის.</span>)
                    : <span>ხელით ჯერ არ შეგისწორებია: სანამ არ შეასწორებ, რედაქცია ამ სტატიას ნიმუშად არ ჩათვლის.</span>}
                </div>
              )}

              <div className={styles.serp}>
                <div className={styles.serpUrl}>artopia.ge › blog › {selected.slug}</div>
                <div className={styles.serpTitle}>{selected.meta_title} | Artopia</div>
                <div className={styles.serpDesc}>{selected.meta_description}</div>
                <small>ასე გამოჩნდება Google-ის შედეგებში</small>
              </div>

              {selected.history?.length > 0 && (
                <div className={styles.history}>
                  <b><History size={15} /> ისტორია</b>
                  <ol>
                    {selected.history.map((h) => (
                      <li key={h.id}>
                        <span className={styles[`h_${h.action}`]}>{ACTION_LABEL[h.action]}</span> · ვერსია {h.revision} · {shortDate(h.created_at)}
                        {h.note && <p>{h.note}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {editing && article?.doc ? (
              <ArticleEditor
                key={`${selected.id}-${selected.revision}`}
                article={article}
                item={selected}
                call={call}
                onAuthError={onAuthError}
                onCancel={() => setEditing(false)}
                onSaved={(r) => { replaceItem(r.item); setArticle(r.article); setEditing(false); }}
              />
            ) : (
              <div className={styles.preview}>
                <div className={styles.previewBar}>გადახედვა: ასე გამოჩნდება საიტზე</div>
                {article?.doc ? <ArticleV2 blog={article} preview /> : <div className={styles.muted}>სტატია იტვირთება...</div>}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
    </div>
  );
}
