import { useEffect, useRef, useState } from "react";
import { PRODUCTION_LABEL } from "../../utils/engraving";
import styles from "./Checkout.module.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../CartContext/CartContext";
import { confirmedPayment, paymentReference } from "../../utils/paymentStatus";
import { clearCheckoutIntent } from "../../utils/checkoutIntent";

const labels = {
  pending: ["გადახდა მოწმდება", "გადახდის დადასტურებას ველოდებით. თანხა ხელახლა არ გადაიხადოთ."],
  success: ["გადახდა წარმატებულია", "გადახდა დადასტურებულია და თქვენი შეკვეთა მიღებულია."],
  fail: ["გადახდა ვერ შესრულდა", "ბანკმა გადახდა არ დაადასტურა. შეგიძლიათ დაბრუნდეთ კალათაში."],
  invalid: ["გადახდის შემოწმება ვერ მოხერხდა", "შეკვეთის მითითებული მონაცემები ვერ დადასტურდა."],
  unavailable: ["დადასტურებას ველოდებით", "გადახდის მდგომარეობა ჯერ ვერ დადასტურდა. თანხა ხელახლა არ გადაიხადოთ; სცადეთ შემოწმება მოგვიანებით."],
};

const PaymentResult = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { clearCart } = useCart();
  const clearCartRef = useRef(clearCart);
  clearCartRef.current = clearCart;
  const clearedStates = useRef(new Set());
  const [status, setStatus] = useState("pending");
  const [reference, setReference] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let storage;
    try { storage = window.sessionStorage; } catch { /* optional */ }
    const ref = paymentReference(search, storage);
    setReference(ref);
    if (!ref) { setStatus("invalid"); return; }
    setStatus("pending");
    const controller = new AbortController();
    let timer;
    let attempts = 0;
    const poll = async () => {
      try {
        const result = await confirmedPayment(ref, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setStatus(result);
        if (result === "success" || result === "fail") clearCheckoutIntent("bank");
        if (result === "success") {
          const key = `payment_cart_cleared_${ref.state}`;
          let alreadyCleared = clearedStates.current.has(ref.state);
          try { alreadyCleared ||= storage?.getItem(key) === "1"; } catch { /* optional */ }
          if (!alreadyCleared) {
            clearedStates.current.add(ref.state);
            clearCartRef.current();
            try { storage?.setItem(key, "1"); storage?.removeItem("pending_purchase"); } catch { /* optional */ }
          }
          return;
        }
        if (result !== "pending") return;
      } catch {
        if (controller.signal.aborted) return;
      }
      if (++attempts >= 20) { setStatus("unavailable"); return; }
      timer = setTimeout(poll, 3000);
    };
    poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [search, retry]);

  const [title, message] = labels[status];
  return (
    <div className={`${styles.checkoutContainer} product-card`}>
      <div className={styles.cartSummary} aria-live="polite">
        <h2>{title}</h2>
        <div className={styles.totalPrice}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>{message}</div>
          {status === "success" && reference?.has_engraving && (
            <div style={{ fontSize: 15, marginBottom: 8, color: "#fde68a" }}>
              გრავირებული ნივთის დამზადებას სჭირდება {PRODUCTION_LABEL} — მზადყოფნისას ელ-ფოსტით შეგატყობინებთ.
            </div>
          )}
          {status === "unavailable" && (
            <button className={styles.submitBtn} onClick={() => setRetry((value) => value + 1)}>ხელახლა შემოწმება</button>
          )}
          <div style={{ marginTop: 16 }}>
            <button className={styles.submitBtn} onClick={() => navigate("/products")}>დაბრუნება პროდუქტებზე</button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PaymentResult;
