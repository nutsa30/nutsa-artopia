import React, { useState, useMemo, useEffect, useCallback } from "react";
import styles from "./Checkout.module.css";
import { useCart } from "../CartContext/CartContext";
import { useNavigate } from "react-router-dom";
import DeliverySection from "./DeliverySection";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

const DEFAULT_PICKUP_ADDRESS =
  "ადგილზე გატანა - არტოპია, სიმონ ჩიკოვანის 45, თბილისი";

const isTbilisi = (str) => {
  const lc = (str || "").trim().toLowerCase();
  return lc === "tbilisi" || lc === "თბილისი";
};

const fmt = (n) => Number(n ?? 0).toFixed(2);

const unitPrice = (it) => {
  const price = Number(it?.price || 0);
  const sale = Number(it?.sale || 0);
  if (sale > 0 && sale <= 100) {
    return +(price * (1 - sale / 100)).toFixed(2);
  }
  return +price.toFixed(2);
};

const normalizeQuantity = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
};

const LBL = {
  cartEmpty: "კალათა ცარიელია",
  orderDetails: "შეკვეთის დეტალები",
  newBadge: "ახალი",
  subtotal: "შეკვეთის ჯამური ღირებულება",
discount: "ფასდაკლება",
  deliveryFee: "მიტანის საფასური",
  total: "ჯამი",
  firstName: "სახელი",
  lastName: "გვარი",
  email: "იმეილი",
  phone: "ტელეფონი",
  city: "აირჩიეთ ქალაქი",
  address: "მისამართი",
  promo: "პრომო კოდი",
  comment: "კომენტარი",
  deliveryOption: "აირჩიეთ მიტანის ვარიანტი",
  paymentMethod: "აირჩიეთ გადახდის მეთოდი",
  payCard: "ბარათით გადახდა",
  optTomorrow: "მომდევნო დღე",
  optPickup: "ადგილზე მისვლით",
  optRegional: "რეგიონალური მიტანა (8 ₾)",
  proceed: "გაგრძელება",
  errOrderCreate: "შეკვეთის შექმნა ვერ მოხერხდა",
  errChooseProduct: "გთხოვთ ჯერ აირჩიოთ პროდუქტი",
  successPaid: "✅ შეკვეთა და ტესტ-გადახდა წარმატებით შესრულდა!",
  successCreatedOnly: "✅ შეკვეთა შეიქმნა (ტესტ-გადახდა ვერ შესრულდა)",
  successCreated: "✅ შეკვეთა შექმნილია.",
  close: "დახურვა",
  minus: "მინუსი",
  plus: "პლუსი",
  delete: "წაშლა",
};

const CITIES_GE = [
  "თბილისი",
  "ბათუმი",
  "რუსთავი",
  "ქუთაისი",
  "გორი",
  "ფოთი",
  "ზუგდიდი",
  "მარნეული",
  "ხაშური",
  "სამტრედია",
  "ზესტაფონი",
  "თელავი",
  "ქობულეთი",
  "ახალციხე",
  "სენაკი",
  "ოზურგეთი",
  "კასპი",
  "ჭიათურა",
  "გარდაბანი",
  "ბორჯომი",
  "საგარეჯო",
  "ყვარელი",
  "ბოლნისი",
  "ტყიბული",
  "ხონი",
  "წყალტუბო",
  "ახალქალაქი",
  "მცხეთა",
  "გურჯაანი",
  "დუშეთი",
  "ქარელი",
  "ლანჩხუთი",
  "ახმეტა",
  "ლაგოდეხი",
  "საჩხერე",
  "დედოფლისწყარო",
  "ვალე",
  "თერჯოლა",
  "წნორი",
  "თეთრიწყარო",
  "აბაშა",
  "მარტვილი",
  "ნინოწმინდა",
  "წალკა",
  "ვანი",
  "ხობი",
  "დმანისი",
  "წალენჯიხა",
  "ბაღდათი",
  "ონი",
  "ჩხოროწყუ",
  "ამბროლაური",
  "სიღნაღი",
  "ჯვარი",
  "ცაგერი",
];

const Checkout = () => {
  const { cartItems, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();
  const T = LBL;

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    deliveryOption: "",
    paymentMethod: "card",
    coupon_code: "",
    comment: "",
  });



  const [delivery, setDelivery] = useState({
    streetName: "", city: "Tbilisi",
    lat: 41.6941, lng: 44.8337,
    hallway: "", floor: "", apartment: "",
  });
  const [selectedCourier, setSelectedCourier] = useState(null);

  const handleDeliveryChange = useCallback((updates) => {
    setDelivery((prev) => ({ ...prev, ...updates }));
  }, []);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [stockById, setStockById] = useState({});
  const [stockMessageById, setStockMessageById] = useState({});

  const subtotal = cartItems.reduce(
    (s, it) => s + unitPrice(it) * (it.quantity || 0),
    0
  );
const [couponDiscount, setCouponDiscount] = useState(0);

useEffect(() => {
  const applyCoupon = async () => {
    if (!formData.coupon_code) {
      setCouponDiscount(0);
      return;
    }

    try {
   const res = await fetch(`${API_BASE}/promo-codes`);
const json = await res.json();

// 🔥 FIX
const data = json.items || [];

const code = formData.coupon_code.toUpperCase().trim();

const found = data.find((c) => c.code === code && c.is_active);
      if (found) {
        const discount = +(subtotal * (found.percent / 100)).toFixed(2);
        setCouponDiscount(discount);
      } else {
        setCouponDiscount(0);
      }
    } catch (e) {
      console.error(e);
      setCouponDiscount(0);
    }
  };

  applyCoupon();
}, [formData.coupon_code, subtotal]);
const deliveryOptions = useMemo(() => {
  return [
    { value: "storePickup", label: "ადგილზე აღება" },
    { value: "courierDelivery", label: "კურიერული მომსახურება" },
  ];
}, []);

  useEffect(() => {
    let ignore = false;

    const fetchStocks = async () => {
      const entries = await Promise.all(
        cartItems.map(async (item) => {
          const id = item.id;
          try {
            const res = await fetch(`${API_BASE}/products/${id}`);
            if (!res.ok) return [id, 0];

            const data = await res.json();
            return [id, normalizeQuantity(data?.quantity)];
          } catch {
            return [id, 0];
          }
        })
      );

      if (!ignore) {
        setStockById(Object.fromEntries(entries));
      }
    };

    if (cartItems.length > 0) {
      fetchStocks();
    }

    return () => {
      ignore = true;
    };
  }, [cartItems]);


  const preview = useMemo(() => {
  const delivery_fee =
    formData.deliveryOption === "courierDelivery" && selectedCourier
      ? +(selectedCourier.amount ?? 0)
      : 0;
  const extra_discount = couponDiscount;
  const total = Math.max(0, +(subtotal - extra_discount + delivery_fee).toFixed(2));
  return { subtotal: +subtotal.toFixed(2), delivery_fee, extra_discount, total };
}, [subtotal, formData.deliveryOption, couponDiscount, selectedCourier]);

useEffect(() => {
  const style = document.createElement("style");
  style.id = "checkout-navbar-override";
  style.textContent = `#site-navbar { z-index: 1 !important; }`;
  document.head.appendChild(style);
  return () => document.getElementById("checkout-navbar-override")?.remove();
}, []);

const canSubmit = useMemo(() => {
  if (cartItems.length === 0) return false;
  if (!formData.first_name?.trim() || !formData.last_name?.trim()) return false;
  if (!formData.email?.trim() || !formData.phone?.trim()) return false;
  if (!formData.deliveryOption) return false;
  if (formData.deliveryOption === "courierDelivery") {
    if (!delivery.streetName?.trim()) return false;
    if (!selectedCourier) return false;
  }
  return true;
}, [cartItems, formData, delivery, selectedCourier]);

const submitHint = useMemo(() => {
  if (cartItems.length === 0) return "კალათა ცარიელია";
  if (!formData.deliveryOption) return "აირჩიეთ მიტანის ვარიანტი";
  if (formData.deliveryOption === "courierDelivery") {
    if (!delivery.streetName?.trim()) return "შეიყვანეთ მიტანის მისამართი";
    if (!selectedCourier) return "აირჩიეთ კურიერი";
  }
  if (!formData.first_name?.trim() || !formData.last_name?.trim() ||
      !formData.email?.trim() || !formData.phone?.trim()) {
    return "შეავსეთ ყველა სავალდებულო ველი";
  }
  return "";
}, [cartItems, formData, delivery, selectedCourier]);

const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (cartItems.length === 0) {
      setError(T.errChooseProduct);
      return;
    }

    setError("");

    const addrComment = [
      delivery.hallway   ? `სადარბაზო ${delivery.hallway}`  : "",
      delivery.floor     ? `სართული ${delivery.floor}`      : "",
      delivery.apartment ? `ბინა ${delivery.apartment}`      : "",
    ].filter(Boolean).join(", ");

    const draft = {
      formData,
      items: cartItems.map((it) => ({
        id: it.id,
        name: it.name,
        price: it.price,
        sale: it.sale || 0,
        quantity: it.quantity,
        image: it.image_url1 || null,
      })),
      totals: {
        subtotal:       Number(preview.subtotal),
        delivery_fee:   Number(preview.delivery_fee),
        extra_discount: Number(preview.extra_discount),
        total:          Number(preview.total),
      },
      pickup_address: DEFAULT_PICKUP_ADDRESS,
      delivery: formData.deliveryOption === "courierDelivery" ? {
        streetName:     delivery.streetName,
        city:           delivery.city,
        latitude:       delivery.lat,
        longitude:      delivery.lng,
        hallway:        delivery.hallway,
        floor:          delivery.floor,
        apartment:      delivery.apartment,
        addressComment: addrComment,
        courier: selectedCourier,
      } : null,
    };

    try {
      const res = await fetch(`${API_BASE}/payments/bog/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const data = await res.json();

      if (!res.ok || !data?.redirect_url) {
        throw new Error(`HTTP ${res.status} – redirect_url not provided`);
      }

      try {
        const u = new URL(data.redirect_url);
        const orderId = u.searchParams.get("order_id");
        if (orderId) sessionStorage.setItem("last_bog_order_id", orderId);
      } catch {}

      if (data.state) {
        sessionStorage.setItem("last_bog_state", data.state);
      }

      window.location.href = data.redirect_url;
    } catch (err) {
      console.error(err);
      setError(err.message || "გადახდის ინიციალიზაცია ვერ მოხერხდა");
    }
  };

  return (
    <div className={`${styles.checkoutContainer} product-card`}>
      <div className={styles.cartSummary}>
        {cartItems.length === 0 ? (
          <p>{T.cartEmpty}</p>
        ) : (
          <>
            <h2>{T.orderDetails}</h2>

            {cartItems.map((item) => {
              const up = unitPrice(item);
              const hasSale =
                Number(item?.sale || 0) > 0 && Number(item.sale) <= 100;
              const line = up * (item.quantity || 0);

              return (
                <div key={item.id} className={styles.cartItem}>
                  {hasSale && (
                    <div className={styles.saleTag}>
                      <span>
                        <b>-{Number(item.sale)}%</b>
                      </span>
                    </div>
                  )}

                  <div className={styles.thumbWrap}>
                    {item?.is_new && (
                      <div className={styles.ribbon}>
                        <span>{T.newBadge}</span>
                      </div>
                    )}

                    <img
                      src={item.image_url1 || "https://via.placeholder.com/60"}
                      alt={item.name}
                      className={styles.thumb}
                    />
                  </div>

                  <div className={styles.itemContent}>
                    <span className={styles.itemName} title={item.name}>
                      {item.name}
                    </span>

                    <div className={styles.itemPrice}>
                      {fmt(up)} ₾ × {item.quantity} = <b>{fmt(line)} ₾</b>
                    </div>

                    {(stockMessageById[item.id] || item.quantity >= normalizeQuantity(stockById[item.id])) && (
                      <div className={styles.stockWarning}>
                        {stockMessageById[item.id] ||
                          `მარაგში მხოლოდ ${normalizeQuantity(stockById[item.id])} ცალია.`}
                      </div>
                    )}

                    <div className={styles.controls}>
{/* MINUS */}
<div className={styles.checkboxWrapper}>
  <input
    type="checkbox"
    className={styles.checkbox}
    id={`minus-${item.id}`}
    onClick={() => updateQuantity(item.id, -1)}
    disabled={item.quantity === 1}
  />

  <label htmlFor={`minus-${item.id}`} className={styles.checkboxLabel}>
    <div className={styles.checkboxFlip}>
      <div className={styles.checkboxFront}>−</div>
      <div className={styles.checkboxBack}>−</div>
    </div>
  </label>
</div>

<span className={styles.quantityDisplay}>
  {item.quantity}
</span>

{/* PLUS */}
<div className={styles.checkboxWrapper}>
  <input
    type="checkbox"
    className={styles.checkbox}
    id={`plus-${item.id}`}
    onClick={() => {
      const maxQty = normalizeQuantity(stockById[item.id]);

      if (item.quantity >= maxQty) {
        setStockMessageById((prev) => ({
          ...prev,
          [item.id]: `მარაგში მხოლოდ ${maxQty} ცალია.`,
        }));
        return;
      }

      setStockMessageById((prev) => ({
        ...prev,
        [item.id]: "",
      }));

      updateQuantity(item.id, 1);
    }}
    disabled={item.quantity >= normalizeQuantity(stockById[item.id])}
  />

  <label htmlFor={`plus-${item.id}`} className={styles.checkboxLabel}>
    <div className={styles.checkboxFlip}>
      <div className={styles.checkboxFront}>+</div>
      <div className={styles.checkboxBack}>+</div>
    </div>
  </label>
</div>

                      <button
                        className={styles.binButton}
                        onClick={() => removeFromCart(item.id)}
                        type="button"
                        aria-label={T.delete}
                        title={T.delete}
                      >
                        <svg className={styles.binTop} viewBox="0 0 39 7" fill="none">
                          <line y1="5" x2="39" y2="5" stroke="white" strokeWidth="4" />
                          <line
                            x1="12"
                            y1="1.5"
                            x2="26"
                            y2="1.5"
                            stroke="white"
                            strokeWidth="3"
                          />
                        </svg>

                        <svg className={styles.binBottom} viewBox="0 0 33 39" fill="none">
                          <path
                            d="M0 0H33V35C33 37 31 39 29 39H4C2 39 0 37 0 35V0Z"
                            fill="white"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className={styles.totalPrice}>
              <div>
                {T.subtotal}: <strong>{fmt(preview.subtotal)} ₾</strong>
              </div>

              {preview.extra_discount > 0 && (
                <div>
{T.discount}: <strong>-{fmt(preview.extra_discount)} ₾</strong>
                </div>
              )}

              {formData.deliveryOption === "courierDelivery" && (
                <div>
                  {T.deliveryFee}:{" "}
                  <strong>
                    {selectedCourier
                      ? `${fmt(selectedCourier.amount)} ₾ · ${selectedCourier.providerName}`
                      : "კურიერი არ არის არჩეული"}
                  </strong>
                </div>
              )}

              <hr />

              <div>
                {T.total}: <strong>{fmt(preview.total)} ₾</strong>
              </div>
            </div>
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          name="first_name"
          placeholder={T.firstName}
          value={formData.first_name}
          onChange={handleChange}
          className={styles.input}
          required
        />
        <input
          name="last_name"
          placeholder={T.lastName}
          value={formData.last_name}
          onChange={handleChange}
          className={styles.input}
          required
        />
        <input
          name="email"
          type="email"
          placeholder={T.email}
          value={formData.email}
          onChange={handleChange}
          className={styles.input}
          required
        />
        <input
          name="phone"
          placeholder={T.phone}
          value={formData.phone}
          onChange={handleChange}
          className={styles.input}
          required
        />

  

        <select
          name="deliveryOption"
          value={formData.deliveryOption}
          onChange={(e) => {
            handleChange(e);
            setSelectedCourier(null);
          }}
          className={styles.input}
          required
        >
          <option value="">{T.deliveryOption}</option>
          {deliveryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {formData.deliveryOption === "courierDelivery" && (
          <DeliverySection
            delivery={delivery}
            onChange={handleDeliveryChange}
            selectedCourier={selectedCourier}
            onCourierSelect={setSelectedCourier}
          />
        )}

        {formData.deliveryOption !== "storePickup" && (
          <input
            name="coupon_code"
            placeholder={T.promo}
            value={formData.coupon_code}
            onChange={handleChange}
            className={styles.input}
          />
        )}

        <textarea
          name="comment"
          placeholder={T.comment}
          value={formData.comment}
          onChange={handleChange}
          className={styles.input}
          rows={3}
        />

        <select
          name="paymentMethod"
          value={formData.paymentMethod}
          onChange={handleChange}
          className={styles.input}
          required
        >
          <option value="card">{T.payCard}</option>
        </select>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={!canSubmit}
          title={submitHint || undefined}
        >
          {T.proceed}
        </button>
        {submitHint && (
          <p className={styles.submitHint}>{submitHint}</p>
        )}
      </form>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {successMessage && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              color: "black",
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              width: 420,
              maxWidth: "92vw",
              boxShadow: "0 10px 30px rgba(0,0,0,.2)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
              {successMessage}
            </div>

            <button
              onClick={() => {
                setSuccessMessage("");
                navigate("/products");
              }}
              className={styles.submitBtn}
              aria-label={T.close}
              title={T.close}
              type="button"
            >
              {T.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;