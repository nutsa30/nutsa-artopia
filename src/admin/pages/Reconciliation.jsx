import React, { useEffect, useState } from "react";
import { apiJson } from "../api";
import styles from "./Reconciliation.module.css";

const REASONS = { paid_stock_unavailable: "გადახდა მიღებულია, მაგრამ მარაგი ხელახლა დასადასტურებელია",
  missing_reservation: "დაჯავშნა ვერ მოიძებნა", settlement_failed: "გადახდის შემდეგ მარაგის დამუშავება ვერ დასრულდა",
  paid_amount_mismatch: "ბანკისა და შეკვეთის თანხა არ ემთხვევა" };

export default function Reconciliation() {
  const [data, setData] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const load = async () => { try { setData(await apiJson("/admin/stock-reconciliation")); setError(""); } catch { setError("ანგარიში ვერ ჩაიტვირთა. სცადეთ ხელახლა."); } };
  useEffect(() => { load(); }, []);
  const act = async (ref, action, financial = false) => {
    const ack = action === "optimo_acknowledged";
    if (financial && !window.confirm("ბანკთან თანხის სხვაობა გადაამოწმეთ და საკითხი ოპერატორულად მოაგვარეთ? აქ თანხის დაბრუნება არ სრულდება.")) return;
    if (!window.confirm(ack ? "ადასტურებთ, რომ გაყიდვა უკვე გაატარეთ Optimo-ში და ამის შემდეგ საიტის სინქიც დასრულდა? დაჯავშნა მხოლოდ ამის შემდეგ უნდა გათავისუფლდეს."
      : action === "cancel_unpaid" ? "გაუქმდეს მხოლოდ გადაუხდელი, ადგილზე გადასახდელი შეკვეთა?" : "ხელახლა შემოწმდეს და დაიჯავშნოს გადახდილი შეკვეთის მარაგი?")) return;
    setBusy(true); setError("");
    try {
      await apiJson(`/admin/stock-reconciliation/${encodeURIComponent(ref)}`, { method: "POST", body: JSON.stringify({ action,
        ...(ack ? { confirm_optimo_recorded: true, confirm_upstream_synced: true, sync_run_id: data.latest_sync_run_id } : {}),
        ...(financial ? { confirm_payment_reconciled: true } : {}) }) });
      await load();
    } catch (e) { setError(e.message || "მოქმედება ვერ შესრულდა."); }
    finally { setBusy(false); }
  };
  return <section className={styles.page}>
    <h1>გადახდები და მარაგის გადამოწმება</h1>
    <p>გადახდილი შეკვეთა მარაგის პრობლემის გამო გაუქმებულად არ ინიშნება. აქ ავტომატური refund ან Optimo-ს მარაგის ცვლილება არ სრულდება.</p>
    <button onClick={load} disabled={busy}>განახლება</button>
    {error && <p role="alert">{error}</p>}
    {!data ? <p role="status">იტვირთება…</p> : <>
      <h2>ყურადღებას საჭიროებს ({data.issues.length})</h2>
      {data.issues.length === 0 && <p>მოუგვარებელი გამონაკლისი არ არის.</p>}
      {data.issues.map(item => <article className={styles.card} key={item.ref}>
        <h3>შეკვეთა #{item.order_id}</h3><p>{REASONS[item.reason] || "საჭიროა ოპერატორის გადამოწმება"}</p>
        <div className={styles.actions}>
          <button disabled={busy} onClick={() => act(item.ref, "reserve_available", item.reason === "paid_amount_mismatch" || item.problems?.some(p => p.reason === "provider_snapshot_amount_mismatch"))}>მარაგის ხელახლა დაჯავშნა</button>
          <button disabled={busy} onClick={() => act(item.ref, "optimo_acknowledged", item.reason === "paid_amount_mismatch" || item.problems?.some(p => p.reason === "provider_snapshot_amount_mismatch"))}>Optimo-ში ასახვა დადასტურებულია</button>
        </div>
      </article>)}
      <h2>Optimo-ზე გადაცემის მოლოდინში ({data.handoffs.length})</h2>
      <p>ახალი დადასტურებული დაჯავშნა ვადის გასვლით ავტომატურად არ თავისუფლდება. ბოლო სინქის ID: {data.latest_sync_run_id ?? "—"}.</p>
      {data.handoffs.map(item => <article className={styles.card} key={item.ref}>
        <h3>შეკვეთა #{item.order_id} {item.overdue && "— ვადა გასულია, გადამოწმება აუცილებელია"}</h3>
        <p>{item.items.map(row => `პროდუქტი ${row.product_id}: ${row.quantity} ც.`).join("; ")}</p>
        <div className={styles.actions}>
          <button disabled={busy} onClick={() => act(item.ref, "optimo_acknowledged")}>Optimo-ში ასახვა დადასტურებულია</button>
          <button disabled={busy} onClick={() => act(item.ref, "cancel_unpaid")}>გადაუხდელი თვითგატანის გაუქმება</button>
        </div>
      </article>)}
      <p>ისტორიული ვადაგასული დაჯავშნები: {data.legacy_expired_count}. ისინი ავტომატურად არ აღდგენილა და არ შეცვლილა.</p>
    </>}
  </section>;
}
