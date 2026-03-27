import React, {useEffect} from "react";
import styles from "./Checkout.module.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useLang } from "../../LanguageContext";

const LBL = {
  ka: {
    titleSuccess: "გადახდა წარმატებულია",
    titleFail: "გადახდა უარყოფილია",
    msgSuccess: "გადახდა წარმატებით შესრულდა და თქვენი შეკვეთა მიღებულია.",
    msgFail: "გადახდა ვერ შესრულდა, შეკვეთა არ განთავსდა.",
    backToShop: "დაბრუნება პროდუქტებზე",
  },
  en: {
    titleSuccess: "Payment successful",
    titleFail: "Payment failed",
    msgSuccess: "Your payment was successful and your order has been received.",
    msgFail: "Payment was declined and your order was not placed.",
    backToShop: "Back to products",
  },
};

const PaymentResult = () => {
  const { lang } = useLang();
  const T = LBL[lang] || LBL.ka;
  const navigate = useNavigate();
  const { search } = useLocation();

  const params = new URLSearchParams(search);
  const status = params.get("status"); // "success" | "fail"
  const state = params.get("state") || "";
  const isSuccess = status === "success";

  // ✅ აუცილებელი მინიმალური დამატება — success-ზე ქოლბექის დარეკვა
  useEffect(() => {
    if (!isSuccess) return;
    try {
      const orderId = sessionStorage.getItem("last_bog_order_id");
      if (!orderId) return;

      fetch("https://artopia-backend-2024-54872c79acdd.herokuapp.com/payments/bog/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId }),
      }).finally(() => {
        // სურვილისამებრ — გასუფთავება
        sessionStorage.removeItem("last_bog_order_id");
        sessionStorage.removeItem("last_bog_state");
      });
    } catch (_) {}
  }, [isSuccess]);

  return (
    <div className={`${styles.checkoutContainer} product-card`}>
      <div className={styles.cartSummary}>
        <h2>{isSuccess ? T.titleSuccess : T.titleFail}</h2>

        <div className={styles.totalPrice}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>
            {isSuccess ? T.msgSuccess : T.msgFail}
          </div>

          {state ? (
            <small style={{ opacity: 0.7 }}>
              ID: {state}
            </small>
          ) : null}

          <div style={{ marginTop: 16 }}>
            <button
              className={styles.submitBtn}
              onClick={() => navigate("/products")}
            >
              {T.backToShop}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentResult;
