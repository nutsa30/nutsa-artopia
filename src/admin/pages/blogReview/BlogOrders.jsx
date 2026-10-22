import React, { useCallback, useEffect, useState } from "react";
import { Send, Pencil, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import styles from "./BlogOrders.module.css";

// ბლოგის შეკვეთა: ადმინი წერს თემას ან ტექსტს, რედაქცია შემდეგ სტატიას ამ თემაზე წერს. შეკვეთები პრიორიტეტულია და
// რიგით სრულდება (პირველი დაწერილი, პირველი). რიგში მდგომის რედაქტირება ადგილს არ უცვლის; მუშაობის დაწყების შემდეგ
// შეკვეთა აღარ იცვლება და აღარ იშლება. „შესრულდა" = სტატია ადმინში ჩამოვიდა (დადასტურების მიუხედავად).
// backend: /blogs/admin/orders (app/blog_editorial.py BlogOrder).

const REVIEW_LABEL = { pending: "ელოდება შენს გადაწყვეტილებას", revising: "გასწორებაზეა", approved: "გამოქვეყნდა", rejected: "უარყოფილია" };
const EXAMPLE = "მაგ.: დაწერე ოხრის პიგმენტზე: რა არის, საიდან მოდის და როგორ გამოვიყენოთ ზეთსა და აკრილში.";

export default function BlogOrders({ call, onAuthError, onOpenArticle, formatDate }) {
  const [data, setData] = useState({ available: true, queued: [], in_progress: [], done: [] });
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(null); // { id, text }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = useCallback(async (fn) => {
    setBusy(true);
    setError("");
    try {
      const next = await fn();
      if (next) setData(next);
      return true;
    } catch (e) {
      if (e.status === 401) onAuthError();
      else setError(e.message);
      if (e.status === 409) {
        try { setData(await call("/admin/orders")); } catch { /* the next refresh shows it */ }
      }
      return false;
    } finally {
      setBusy(false);
    }
  }, [call, onAuthError]);

  useEffect(() => { run(() => call("/admin/orders")); }, [run, call]);

  const create = async (e) => {
    e.preventDefault();
    if (!text.trim()) return setError("დაწერე თემა ან ტექსტი");
    if (await run(() => call("/admin/orders", { method: "POST", body: JSON.stringify({ text: text.trim() }) }))) setText("");
  };
  const save = async () => {
    if (!editing.text.trim()) return setError("შეკვეთა ცარიელი ვერ იქნება");
    if (await run(() => call(`/admin/orders/${editing.id}`, { method: "PUT", body: JSON.stringify({ text: editing.text.trim() }) }))) setEditing(null);
  };
  const remove = (order) => {
    if (!window.confirm(`წავშალო შეკვეთა #${order.position}?\n\n${order.text}`)) return;
    run(() => call(`/admin/orders/${order.id}`, { method: "DELETE" }));
  };

  if (!data.available) return <div className={styles.notice}>შეკვეთები ბაზაში ჯერ ჩართული არ არის (მიგრაცია).</div>;

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <div>
          <h2>ბლოგის შეკვეთა</h2>
          <p>დაწერე თემა ან რა გინდა, რომ სტატიაში იყოს. შეკვეთები პრიორიტეტულია: რედაქცია მათ რიგით ასრულებს, პირველიდან.
            თუ შეკვეთა არ არის, თემას თვითონ არჩევს.</p>
        </div>
      </div>

      <form className={styles.form} onSubmit={create}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} rows={3} maxLength={2000} disabled={busy} />
        <button type="submit" className={styles.order} disabled={busy || !text.trim()}>
          {busy ? <Loader2 size={17} className={styles.spin} /> : <Send size={17} />} შეკვეთა
        </button>
      </form>
      {error && <div className={styles.error}>{error}</div>}

      {(data.queued.length > 0 || data.in_progress.length > 0) && (
        <ol className={styles.list}>
          {data.in_progress.map((o) => (
            <li key={o.id} className={`${styles.item} ${styles.working}`}>
              <span className={styles.badgeWorking}><Loader2 size={13} className={styles.spin} /> მუშავდება</span>
              <div className={styles.body}>
                <p>{o.text}</p>
                <small>შეკვეთილია {formatDate(o.created_at)} · დაიწყო {formatDate(o.started_at)}</small>
              </div>
            </li>
          ))}
          {data.queued.map((o) => (
            <li key={o.id} className={styles.item}>
              <span className={styles.position} title="რიგში ადგილი">{o.position}</span>
              <div className={styles.body}>
                {editing?.id === o.id ? (
                  <>
                    <textarea value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} rows={3} maxLength={2000} autoFocus />
                    <div className={styles.editButtons}>
                      <button type="button" className={styles.save} onClick={save} disabled={busy}>შენახვა</button>
                      <button type="button" className={styles.ghost} onClick={() => { setEditing(null); setError(""); }} disabled={busy}>გაუქმება</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p>{o.text}</p>
                    <small>შეკვეთილია {formatDate(o.created_at)}{o.updated_at !== o.created_at ? ` · შეცვლილია ${formatDate(o.updated_at)}` : ""}</small>
                  </>
                )}
              </div>
              {editing?.id !== o.id && (
                <div className={styles.actions}>
                  <button type="button" onClick={() => { setEditing({ id: o.id, text: o.text }); setError(""); }} disabled={busy} aria-label="რედაქტირება" title="რედაქტირება"><Pencil size={16} /></button>
                  <button type="button" onClick={() => remove(o)} disabled={busy} aria-label="წაშლა" title="წაშლა" className={styles.danger}><Trash2 size={16} /></button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {data.done.length > 0 && (
        <details className={styles.done}>
          <summary>შესრულებული შეკვეთები ({data.done.length})</summary>
          <ul>
            {data.done.map((o) => (
              <li key={o.id}>
                <CheckCircle2 size={15} />
                <div>
                  <p>{o.text}</p>
                  <small>
                    შესრულდა {formatDate(o.done_at)}
                    {o.blog_id && (
                      <> · <button type="button" className={styles.link} onClick={() => onOpenArticle(o.blog_id, o.review_status)}>
                        {o.blog_title || "სტატია"}
                      </button>{o.review_status ? ` (${REVIEW_LABEL[o.review_status] || o.review_status})` : ""}</>
                    )}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
