import React, { useEffect } from "react";
import styles from "./Checkout.module.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../CartContext/CartContext";

const LBL = {
  titleSuccess: "გადახდა წარმატებულია",
  titleFail: "გადახდა უარყოფილია",
  msgSuccess: "გადახდა წარმატებით შესრულდა და თქვენი შეკვეთა მიღებულია.",
  msgFail: "გადახდა ვერ შესრულდა, შეკვეთა არ განთავსდა.",
  backToShop: "დაბრუნება პროდუქტებზე",
};

const PaymentResult = () => {
  const T = LBL;
  const navigate = useNavigate();
  const { search } = useLocation();
  const { clearCart } = useCart();

  const params = new URLSearchParams(search);
  const status = params.get("status"); // "success" | "fail"
  const state = params.get("state") || "";
  const isSuccess = status === "success";

  // ✅ success-ზე ქოლბექის დარეკვა + კალათის გასუფთავება
  useEffect(() => {
    if (!isSuccess) return;

    clearCart();

    try {
      const orderId = sessionStorage.getItem("last_bog_order_id");
      if (!orderId) return;

      fetch("https://artopia-backend-2024-54872c79acdd.herokuapp.com/payments/bog/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId }),
      }).finally(() => {
        sessionStorage.removeItem("last_bog_order_id");
        sessionStorage.removeItem("last_bog_state");
      });
    } catch (_) {
      // ignore
    }
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