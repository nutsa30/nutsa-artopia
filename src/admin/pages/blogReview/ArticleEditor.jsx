import React, { useMemo, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { ArrowUp, ArrowDown, Trash2, Plus, ImageUp, Save, X, Eye, PenLine } from "lucide-react";
import styles from "./ArticleEditor.module.css";
import { uploadAdminImage } from "../../api";
import { cld } from "../../../utils/cloudinary";
import ArticleV2 from "../../../features/blogV2/ArticleV2";

// მფლობელის ხელით რედაქტირება (2026-10-22): რედაქციის სტატიას ადმინი თავად ასწორებს და ინახავს. backend:
// PUT /blogs/admin/<id>/doc (app/routes/blogs.py admin_edit_doc). ყოველი შენახვა „რა იყო → რა გახდა" ინახება და
// რედაქცია ამით სწავლობს, ამიტომ ბლოკი იცვლება მხოლოდ მაშინ, როცა მას მართლა შეეხე (Quill-ის თავისით
// გადაწყობილი HTML ცვლილებად არ ითვლება).

const QUILL_MODULES = { toolbar: [["bold", "italic"], ["link"], ["clean"]] };
const QUILL_FORMATS = ["bold", "italic", "link"];
const LAYOUTS = [
  ["center", "ცენტრში"],
  ["col", "სვეტის სიგანით"],
  ["wide", "ფართო"],
  ["side", "გვერდით (ტექსტი გარშემო)"],
  ["pair", "ორი ფოტო გვერდიგვერდ"],
];
const TYPE_LABEL = { p: "აბზაცი", h2: "ქვესათაური", h3: "მცირე ქვესათაური", figure: "ფოტო", list: "სია", table: "ცხრილი", callout: "ჩარჩო", quote: "ციტატა", faq: "კითხვები" };

let keySeed = 0;
const withKey = (b) => ({ ...b, _k: `b${(keySeed += 1)}` });
const stripKey = ({ _k, ...b }) => b; // eslint-disable-line no-unused-vars

// Quill-ის HTML → აბზაცების შიგთავსი: <p>..</p><p>..</p> = რამდენიმე აბზაცი (Enter ახალ აბზაცს ქმნის)
function quillParagraphs(value) {
  const box = document.createElement("div");
  box.innerHTML = value || "";
  const parts = [];
  box.childNodes.forEach((node) => {
    // Quill ჰარებს &nbsp;-ად წერს: ასეთ ჰარზე სტრიქონი არ იყოფა (ტელეფონზე ტექსტი გადავიდოდა) და რედაქციას ყველა სიტყვა შეცვლილი ეგონებოდა
    const inner = (node.nodeType === 1 ? node.innerHTML : node.textContent || "")
      .replace(/<br\s*\/?>/gi, " ").replace(/&nbsp;|\u00a0/g, " ").replace(/ {2,}/g, " ").trim();
    if (inner) parts.push(inner);
  });
  return parts;
}

function imageSize(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({});
    img.src = url;
  });
}

function PhotoPicker({ image, onChange, label = "ფოტოს შეცვლა" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = async (file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const url = await uploadAdminImage(file, { kind: "blog" });
      const size = await imageSize(url);
      onChange({ ...image, url, ...size });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={styles.photo}>
      {image?.url && <img src={cld(image.url, { w: 480 })} alt="" />}
      <div className={styles.photoSide}>
        <label className={styles.upload}>
          <ImageUp size={16} /> {busy ? "იტვირთება..." : label}
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <label className={styles.field}>
          ფოტოს აღწერა (alt, Google-ისთვის და ეკრანის მკითხველისთვის)
          <input value={image?.alt || ""} onChange={(e) => onChange({ ...image, alt: e.target.value })} />
        </label>
        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
}

function RichText({ value, onUser, small }) {
  return (
    <div className={small ? styles.quillSmall : styles.quill}>
      <ReactQuill theme="snow" value={value || ""} modules={QUILL_MODULES} formats={QUILL_FORMATS}
        onChange={(html, _delta, source) => { if (source === "user") onUser(html); }} />
    </div>
  );
}

function BlockEditor({ block, set }) {
  switch (block.t) {
    case "p":
      return <RichText value={block.html} onUser={(html) => set({ ...block, html, _quill: true })} />;
    case "h2":
    case "h3":
      return <input className={styles.heading} value={block.text} onChange={(e) => set({ ...block, text: e.target.value })} />;
    case "figure":
      return (
        <div className={styles.figure}>
          {block.images.map((im, i) => (
            <PhotoPicker key={i} image={im} onChange={(next) => set({ ...block, images: block.images.map((x, j) => (j === i ? next : x)) })} />
          ))}
          <label className={styles.field}>
            ფოტოს წარწერა
            <textarea rows={2} value={block.caption || ""} onChange={(e) => set({ ...block, caption: e.target.value })} />
          </label>
          <label className={styles.field}>
            განლაგება
            <select value={block.layout} onChange={(e) => set({ ...block, layout: e.target.value })}>
              {LAYOUTS.filter(([k]) => (k === "pair") === (block.images.length === 2)).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
          </label>
        </div>
      );
    case "list":
      return (
        <div className={styles.listItems}>
          {block.items.map((item, i) => (
            <RichText key={i} small value={item} onUser={(html) => set({ ...block, items: block.items.map((x, j) => (j === i ? quillParagraphs(html).join(" ") : x)) })} />
          ))}
        </div>
      );
    case "callout":
      return <RichText value={block.html} onUser={(html) => set({ ...block, html: quillParagraphs(html).join(" ") })} />;
    case "quote":
      return <textarea className={styles.textarea} rows={3} value={block.text} onChange={(e) => set({ ...block, text: e.target.value })} />;
    case "faq":
      return (
        <div className={styles.listItems}>
          {block.items.map((it, i) => (
            <div key={i} className={styles.faq}>
              <input value={it.q} onChange={(e) => set({ ...block, items: block.items.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) })} />
              <RichText small value={it.a} onUser={(html) => set({ ...block, items: block.items.map((x, j) => (j === i ? { ...x, a: quillParagraphs(html).join(" ") } : x)) })} />
            </div>
          ))}
        </div>
      );
    case "table":
      return (
        <div className={styles.table}>
          {[block.head, ...block.rows].map((row, r) => (
            <div key={r} className={styles.tableRow}>
              {row.map((cell, c) => (
                <input key={c} value={cell} onChange={(e) => set(r === 0
                  ? { ...block, head: block.head.map((x, j) => (j === c ? e.target.value : x)) }
                  : { ...block, rows: block.rows.map((rr, i) => (i === r - 1 ? rr.map((x, j) => (j === c ? e.target.value : x)) : rr)) })} />
              ))}
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

// შენახვისთვის: Quill-ში Enter-ით გაყოფილი აბზაცი ცალკე ბლოკებად, ცარიელი აბზაცი იშლება
function finalBlocks(blocks) {
  const out = [];
  blocks.forEach((b) => {
    if (b.t === "p" && b._quill) {
      quillParagraphs(b.html).forEach((html) => out.push({ t: "p", html }));
    } else if (b.t === "p" && !(b.html || "").replace(/<[^>]+>/g, "").trim()) {
      // ცარიელი აბზაცი
    } else if ((b.t === "h2" || b.t === "h3") && !(b.text || "").trim()) {
      // ცარიელი ქვესათაური
    } else {
      const { _quill, ...rest } = stripKey(b);
      out.push(rest);
    }
  });
  return out;
}

export default function ArticleEditor({ article, item, call, onSaved, onCancel, onAuthError }) {
  const [title, setTitle] = useState(article.title || "");
  const [metaTitle, setMetaTitle] = useState(article.meta_title || "");
  const [metaDescription, setMetaDescription] = useState(article.meta_description || "");
  const [lead, setLead] = useState(article.doc.lead || "");
  const [cover, setCover] = useState(article.doc.cover || {});
  const [blocks, setBlocks] = useState(() => article.doc.blocks.map(withKey));
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const doc = useMemo(() => ({ ...article.doc, lead, cover, blocks: finalBlocks(blocks) }), [article.doc, lead, cover, blocks]);
  const live = item.review_status === "approved";

  const setBlock = (k, next) => setBlocks((bs) => bs.map((b) => (b._k === k ? { ...next, _k: k } : b)));
  const move = (i, d) => setBlocks((bs) => {
    const j = i + d;
    if (j < 0 || j >= bs.length) return bs;
    const copy = [...bs];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  });
  const remove = (i) => setBlocks((bs) => bs.filter((_, j) => j !== i));
  const insertAfter = (i, block) => setBlocks((bs) => [...bs.slice(0, i + 1), withKey(block), ...bs.slice(i + 1)]);

  const save = async () => {
    if (live && !window.confirm("სტატია საიტზეა: ცვლილება მაშინვე გამოჩნდება. შევინახო?")) return;
    setBusy(true);
    setError("");
    try {
      const r = await call(`/admin/${item.id}/doc`, {
        method: "PUT",
        body: JSON.stringify({ revision: item.revision, title, meta_title: metaTitle, meta_description: metaDescription, doc }),
      });
      onSaved(r);
    } catch (e) {
      if (e.status === 401) return onAuthError();
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.editor}>
      <div className={styles.bar}>
        <strong><PenLine size={16} /> რედაქტირება</strong>
        <span className={styles.barHint}>{live ? "სტატია საიტზეა: შენახვისთანავე შეიცვლება." : "შენახვის შემდეგ სტატია ისევ მონახაზია: გამოაქვეყნე ღილაკით „გამოქვეყნება“."}</span>
        <div className={styles.barButtons}>
          <button type="button" className={styles.ghost} onClick={() => setPreview((p) => !p)}>{preview ? <PenLine size={16} /> : <Eye size={16} />} {preview ? "რედაქტორი" : "გადახედვა"}</button>
          <button type="button" className={styles.ghost} onClick={onCancel} disabled={busy}><X size={16} /> გაუქმება</button>
          <button type="button" className={styles.save} onClick={save} disabled={busy}><Save size={16} /> {busy ? "ინახება..." : "შენახვა"}</button>
        </div>
        {error && <div className={styles.error}>{error}</div>}
      </div>

      {preview ? (
        <div className={styles.preview}><ArticleV2 blog={{ ...article, title, meta_title: metaTitle, meta_description: metaDescription, doc }} preview /></div>
      ) : (
        <div className={styles.form}>
          <label className={styles.field}>სათაური<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className={styles.field}>
            <span>Google-ის სათაური <small className={metaTitle.length > 60 ? styles.over : undefined}>{metaTitle.length}/60</small></span>
            <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Google-ის აღწერა <small className={metaDescription.length > 160 ? styles.over : undefined}>{metaDescription.length}/160</small></span>
            <textarea rows={3} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} />
          </label>
          <label className={styles.field}>შესავალი (ლიდი)<textarea rows={3} value={lead} onChange={(e) => setLead(e.target.value)} /></label>

          <section className={styles.card}>
            <div className={styles.cardTop}><b>ქავერის ფოტო</b></div>
            <PhotoPicker image={cover} onChange={setCover} />
            <label className={styles.field}>
              ქავერის წარწერა
              <textarea rows={2} value={cover.caption || ""} onChange={(e) => setCover({ ...cover, caption: e.target.value })} />
            </label>
          </section>

          {blocks.map((b, i) => (
            <section key={b._k} className={`${styles.card} ${b.t === "h2" || b.t === "h3" ? styles.cardHeading : ""}`}>
              <div className={styles.cardTop}>
                <b>{TYPE_LABEL[b.t] || b.t}</b>
                <div className={styles.tools}>
                  <button type="button" title="ზემოთ" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={15} /></button>
                  <button type="button" title="ქვემოთ" onClick={() => move(i, 1)} disabled={i === blocks.length - 1}><ArrowDown size={15} /></button>
                  <button type="button" title="აბზაცის დამატება ქვემოთ" onClick={() => insertAfter(i, { t: "p", html: "", _quill: true })}><Plus size={15} /> აბზაცი</button>
                  <button type="button" title="ქვესათაურის დამატება ქვემოთ" onClick={() => insertAfter(i, { t: "h2", text: "" })}><Plus size={15} /> ქვესათაური</button>
                  <button type="button" title="წაშლა" className={styles.danger} onClick={() => { if (window.confirm(`წავშალო ${TYPE_LABEL[b.t] || "ბლოკი"}?`)) remove(i); }}><Trash2 size={15} /></button>
                </div>
              </div>
              <BlockEditor block={b} set={(next) => setBlock(b._k, next)} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
