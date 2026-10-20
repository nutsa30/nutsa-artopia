import React, { useEffect, useState } from "react";
import { apiJson } from "../api";
import styles from "./Reconciliation.module.css";

const REASONS = { paid_amount_mismatch: "ბანკისა და შეკვეთის თანხა არ ემთხვევა" };

export default function Reconciliation() {
  const [data, setData] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const load = async () => { try { setData(await apiJson("/admin/stock-reconciliation")); setError(""); } catch { setError("ანგარიში ვერ ჩაიტვირთა. სცადეთ ხელახლა."); } };
  useEffect(() => { load(); }, []);
  const act = async (ref) => {
    if (!window.confirm("ბანკთან თანხის სხვაობა გადაამოწმეთ და საკითხი ოპერატორულად მოაგვარეთ? აქ თანხის დაბრუნება არ სრულდება.")) return;
    setBusy(true); setError("");
    try {
      await apiJson(`/admin/stock-reconciliation/${encodeURIComponent(ref)}`, { method: "POST", body: JSON.stringify({
        action: "payment_reconciled", confirm_payment_reconciled: true }) });
      await load();
    } catch (e) { setError(e.message || "მოქმედება ვერ შესრულდა."); }
    finally { setBusy(false); }
  };
  return <section className={styles.page}>
    <h1>გადახდების გადამოწმება</h1>
    <p>აქ ჩანს მხოლოდ გადახდის ფინანსური გამონაკლისები. ჩვეულებრივ შეკვეთას დამატებითი დადასტურება არ სჭირდება. მარაგს მართავს Optimo; აქ თანხის დაბრუნება არ სრულდება.</p>
    <button onClick={load} disabled={busy}>განახლება</button>
    {error && <p role="alert">{error}</p>}
    {!data ? <p role="status">იტვირთება…</p> : <>
      <h2>ყურადღებას საჭიროებს ({data.issues.length})</h2>
      {data.issues.length === 0 && <p>მოუგვარებელი გამონაკლისი არ არის.</p>}
      {data.issues.map(item => <article className={styles.card} key={item.ref}>
        <h3>შეკვეთა #{item.order_id}</h3><p>{REASONS[item.reason] || "საჭიროა ოპერატორის გადამოწმება"}</p>
        <div className={styles.actions}>
          <button disabled={busy} onClick={() => act(item.ref)}>ფინანსური საკითხი გადამოწმებულია</button>
        </div>
      </article>)}
    </>}
  </section>;
}
