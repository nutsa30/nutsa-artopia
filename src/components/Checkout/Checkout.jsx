import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import styles from "./Checkout.module.css";
import { cld, IMG } from "../../utils/cloudinary";
import { useCart } from "../CartContext/CartContext";
import { useNavigate } from "react-router-dom";
import DeliverySection from "./DeliverySection";
import { TruckIcon, StoreIcon, ClockIcon, PinIcon, CardIcon, WarningIcon } from "./icons";
import { trackBeginCheckout, getGaClientId, CURRENCY } from "../../utils/analytics";
import {
  buildCartBreakdown,
  couponDiscountFor,
  normalizeSale,
  unitPrice,
  isPromoEligible,
  PROMO_MESSAGES,
  courierDeliveryInfo,
  meetsMinOrder,
  pickupReadyLabel,
  MIN_ORDER_SUBTOTAL,
} from "../../utils/pricing";
import {
  isEngravingItem,
  cartHasEngraving,
  engravingUnits,
  engravingSummary,
  engravingThumb,
  engravingPickupLabel,
  MAX_ENGRAVED_UNITS,
  PRODUCTION_LABEL,
} from "../../utils/engraving";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

const fmt = (n) => Number(n ?? 0).toFixed(2);

// პრომო კოდის საწყისი მდგომარეობა
// status: "idle" | "checking" | "valid" | "invalid"
const IDLE_PROMO = {
  status: "idle",
  code: "",
  percent: 0,
  discount: 0,
  reason: "",
  message: "",
  eligibleSubtotal: 0,
  excludedSubtotal: 0,
  appliesToAll: true,
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
  promoDiscount: "პრომო კოდის ფასდაკლება",
  productSavings: "პროდუქტების ფასდაკლება",
  onSaleItems: "ფასდაკლებული პროდუქტები",
  promoBase: "პრომო კოდი ვრცელდება",
  promoExcludedChip: "პრომო არ ვრცელდება",
  promoAppliedChip: "პრომო",
  promoChecking: "მოწმდება…",
  promoRuleHint:
    "პრომო კოდი არ ვრცელდება უკვე ფასდაკლებულ პროდუქტებზე — მათზე მოქმედებს მხოლოდ საკუთარი ფასდაკლება.",
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
  payCard: "ბარათით გადახდა (წინასწარ)",
  payOnSite: "ადგილზე გადახდა",
  courierCardOnlyNote: "კურიერზე გადახდა ხდება მხოლოდ ბარათით, წინასწარ საიტიდან.",
  proceed: "გაგრძელება",
  errOrderCreate: "შეკვეთის შექმნა ვერ მოხერხდა",
  errChooseProduct: "გთხოვთ ჯერ აირჩიოთ პროდუქტი",
  errMinOrder: `მინიმალური შეკვეთაა ${MIN_ORDER_SUBTOTAL}₾`,
  minOrderHint: `მინიმალური შეკვეთაა ${MIN_ORDER_SUBTOTAL}₾`,
  close: "დახურვა",
  delete: "წაშლა",
  engravingPromoChip: "პრომო არ ვრცელდება — გრავირებული ნივთი",
  engravingCardOnly: "გრავირებული ნივთი ინდივიდუალურად მზადდება — გადახდა მხოლოდ წინასწარ, ბარათით.",
  engravingNotice: `კალათაში გრავირებული ნივთია — დამზადებას სჭირდება ${PRODUCTION_LABEL}. მთელი შეკვეთა ერთად გაიცემა: ადგილზე აღებაც და კურიერიც ამ ვადის შემდეგ.`,
  engravingLimit: `ერთ შეკვეთაში მაქსიმუმ ${MAX_ENGRAVED_UNITS} გრავირებული ნივთია — მეტის შესაკვეთად დაგვიკავშირდით.`,
};

const Checkout = () => {
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();
  const T = LBL;

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    deliveryOption: "",
    paymentMethod: "card",
    coupon_code: "",
    comment: "",
  });

  const [delivery, setDelivery] = useState({
    city: "თბილისი",
    address: "",
    hallway: "",
    floor: "",
    apartment: "",
  });

  const handleDeliveryChange = useCallback((updates) => {
    setDelivery((prev) => ({ ...prev, ...updates }));
  }, []);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stockById, setStockById] = useState({});
  const [stockMessageById, setStockMessageById] = useState({});
  const beginCheckoutFiredRef = useRef(false);

  /**
   * კალათის დაშლა პრომო-კოდის ბაზისებად.
   * წესი: პრომო კოდი ვრცელდება მხოლოდ იმ პროდუქტებზე, რომლებსაც
   * ადმინის ფასდაკლება (sale) არ აქვთ.
   */
  const cart = useMemo(() => buildCartBreakdown(cartItems), [cartItems]);
  const hasEngraving = useMemo(() => cartHasEngraving(cartItems), [cartItems]);
  const engrUnits = useMemo(() => engravingUnits(cartItems), [cartItems]);
  const subtotal = cart.subtotal;
  const promoEligibleSubtotal = cart.eligibleSubtotal;
  const promoExcludedSubtotal = cart.excludedSubtotal;

  // პროდუქტების საკუთარი ფასდაკლებით დაზოგილი თანხა
  const productSavings = useMemo(
    () =>
      +cart.lines
        .reduce((s, l) => s + (l.originalPrice - l.unitPrice) * l.quantity, 0)
        .toFixed(2),
    [cart.lines]
  );

  // კალათის ხელმოწერა — ცვლილებაზე პრომო კოდი ხელახლა მოწმდება
  const cartSignature = useMemo(
    () =>
      cartItems
        .map((it) => `${it.id}:${it.quantity}:${normalizeSale(it.sale)}:${it.price}`)
        .join("|"),
    [cartItems]
  );

  const [promo, setPromo] = useState(IDLE_PROMO);

  useEffect(() => {
    const code = (formData.coupon_code || "").trim().toUpperCase();

    if (!code) {
      setPromo(IDLE_PROMO);
      return undefined;
    }
    if (cartItems.length === 0) {
      setPromo({
        ...IDLE_PROMO,
        status: "invalid",
        code,
        reason: "empty_cart",
        message: PROMO_MESSAGES.empty_cart,
      });
      return undefined;
    }

    let cancelled = false;
    setPromo((prev) =>
      prev.code === code
        ? { ...prev, status: "checking" }
        : { ...IDLE_PROMO, status: "checking", code }
    );

    const timer = setTimeout(async () => {
      const payload = {
        code,
        items: cartItems.map((it) =>
          isEngravingItem(it)
            ? { engraving_token: it.engraving_token, quantity: it.quantity }
            : { product_id: it.id, quantity: it.quantity }
        ),
      };

      try {
        const res = await fetch(`${API_BASE}/promo-codes/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        setPromo({
          status: data.valid ? "valid" : "invalid",
          code: (data.code || code).toUpperCase(),
          percent: Number(data.percent || 0),
          discount: Number(data.discount || 0),
          reason: data.reason || "",
          message: data.message || "",
          eligibleSubtotal: Number(data.eligible_subtotal || 0),
          excludedSubtotal: Number(data.excluded_subtotal || 0),
          appliesToAll: !!data.applies_to_all,
        });
      } catch (err) {
        console.error("promo validate failed, falling back:", err);
        if (cancelled) return;

        try {
          const res = await fetch(`${API_BASE}/promo-codes?per_page=200`);
          const json = await res.json();
          if (cancelled) return;

          const found = (json.items || []).find(
            (c) => String(c.code || "").toUpperCase() === code && c.is_active
          );

          if (!found) {
            setPromo({
              ...IDLE_PROMO,
              status: "invalid",
              code,
              reason: "not_found",
              message: PROMO_MESSAGES.not_found,
            });
            return;
          }
          if (promoEligibleSubtotal <= 0) {
            const engrCount = cartItems.filter(isEngravingItem).length;
            const reason =
              engrCount === 0
                ? "all_items_on_sale"
                : engrCount === cartItems.length
                ? "engraving_only"
                : "no_eligible_items";
            setPromo({
              ...IDLE_PROMO,
              status: "invalid",
              code,
              reason,
              message: PROMO_MESSAGES[reason],
              excludedSubtotal: promoExcludedSubtotal,
            });
            return;
          }

          setPromo({
            status: "valid",
            code,
            percent: Number(found.percent || 0),
            discount: couponDiscountFor(promoEligibleSubtotal, found.percent),
            reason: "ok",
            message: PROMO_MESSAGES.ok,
            eligibleSubtotal: promoEligibleSubtotal,
            excludedSubtotal: promoExcludedSubtotal,
            appliesToAll: promoExcludedSubtotal <= 0,
          });
        } catch (err2) {
          console.error(err2);
          if (cancelled) return;
          setPromo({
            ...IDLE_PROMO,
            status: "invalid",
            code,
            reason: "not_found",
            message: PROMO_MESSAGES.not_found,
          });
        }
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.coupon_code, cartSignature, promoEligibleSubtotal, promoExcludedSubtotal]);

  const promoActive =
    promo.status === "valid" ||
    (promo.status === "checking" && promo.percent > 0);

  const couponDiscount = useMemo(
    () =>
      promoActive ? couponDiscountFor(promoEligibleSubtotal, promo.percent) : 0,
    [promoActive, promo.percent, promoEligibleSubtotal]
  );

  const deliveryOptions = useMemo(() => {
    return [
      { value: "storePickup", label: "ადგილზე აღება" },
      { value: "courierDelivery", label: "კურიერული მომსახურება" },
    ];
  }, []);

  // კურიერზე და გრავირებიან კალათაზე გადახდა მხოლოდ ბარათითაა — ავტომატურად ვაბრუნებთ "card"-ზე
  useEffect(() => {
    if (
      (formData.deliveryOption === "courierDelivery" || hasEngraving) &&
      formData.paymentMethod !== "card"
    ) {
      setFormData((prev) => ({ ...prev, paymentMethod: "card" }));
    }
  }, [formData.deliveryOption, formData.paymentMethod, hasEngraving]);

  useEffect(() => {
    let ignore = false;

    const fetchStocks = async () => {
      const entries = await Promise.all(
        // გრავირებულ ნივთს მარაგი არ აქვს — მისი ლიმიტი MAX_ENGRAVED_UNITS-ია
        cartItems.filter((item) => !isEngravingItem(item)).map(async (item) => {
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

  const courierInfo = useMemo(
    () =>
      formData.deliveryOption === "courierDelivery"
        ? courierDeliveryInfo(delivery.city, subtotal, hasEngraving)
        : null,
    [formData.deliveryOption, delivery.city, subtotal, hasEngraving]
  );

  const preview = useMemo(() => {
    const delivery_fee = courierInfo ? courierInfo.fee : 0;
    const delivery_discount = courierInfo ? courierInfo.discount : 0;
    const extra_discount = couponDiscount;
    const total = Math.max(0, +(subtotal - extra_discount + delivery_fee).toFixed(2));
    return {
      subtotal: +subtotal.toFixed(2),
      delivery_fee,
      delivery_discount,
      extra_discount,
      promo_base: promoEligibleSubtotal,
      promo_excluded: promoExcludedSubtotal,
      total,
    };
  }, [subtotal, courierInfo, couponDiscount, promoEligibleSubtotal, promoExcludedSubtotal]);

  const pickupReady = useMemo(
    () =>
      formData.deliveryOption === "storePickup"
        ? hasEngraving
          ? engravingPickupLabel()
          : pickupReadyLabel()
        : "",
    [formData.deliveryOption, hasEngraving]
  );

  // GA4 begin_checkout — ერთხელ, როცა checkout იხსნება და კალათა შევსებულია
  useEffect(() => {
    if (!beginCheckoutFiredRef.current && cartItems.length > 0) {
      beginCheckoutFiredRef.current = true;
      trackBeginCheckout(cartItems, preview.subtotal);
    }
  }, [cartItems, preview.subtotal]);

  const minOrderOk = meetsMinOrder(subtotal, hasEngraving);

  const canSubmit = useMemo(() => {
    if (cartItems.length === 0) return false;
    if (!minOrderOk) return false;
    if (!formData.first_name?.trim() || !formData.last_name?.trim()) return false;
    if (!formData.email?.trim() || !formData.phone?.trim()) return false;
    if (!formData.deliveryOption) return false;
    if (formData.deliveryOption === "courierDelivery") {
      if (!delivery.address?.trim()) return false;
      if (!delivery.city) return false;
    }
    return true;
  }, [cartItems, formData, delivery, minOrderOk]);

  const submitHint = useMemo(() => {
    if (cartItems.length === 0) return "კალათა ცარიელია";
    if (!minOrderOk) return T.minOrderHint;
    if (!formData.deliveryOption) return "აირჩიეთ მიტანის ვარიანტი";
    if (formData.deliveryOption === "courierDelivery" && !delivery.address?.trim()) {
      return "შეიყვანეთ მიტანის მისამართი";
    }
    if (!formData.first_name?.trim() || !formData.last_name?.trim() ||
        !formData.email?.trim() || !formData.phone?.trim()) {
      return "შეავსეთ ყველა სავალდებულო ველი";
    }
    return "";
  }, [cartItems, formData, delivery, minOrderOk, T.minOrderHint]);

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
    if (!minOrderOk) {
      setError(T.errMinOrder);
      return;
    }

    setError("");

    // ── ადგილზე აღება + ადგილზე გადახდა — ბანკის გვერდის გვერდის ავლით ──
    // (გრავირებიან კალათაზე ეს გზა დაკეტილია — მხოლოდ ბარათით, წინასწარ)
    if (
      !hasEngraving &&
      formData.deliveryOption === "storePickup" &&
      formData.paymentMethod === "on_site"
    ) {
      setSubmitting(true);
      try {
        const res = await fetch(`${API_BASE}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer: {
              first_name: formData.first_name,
              last_name: formData.last_name,
              email: formData.email,
              phone: formData.phone,
            },
            comment: formData.comment,
            items: cartItems.map((it) => ({
              product_id: it.id,
              quantity: it.quantity,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || T.errOrderCreate);
        }

        clearCart();
        setSuccessMessage(
          `შეკვეთა მიღებულია — #${data.order_number}. გადასახდელია ${fmt(data.total)} ₾ ადგილზე. მზად იქნება: ${data.pickup_ready_label}.`
        );
      } catch (err) {
        console.error(err);
        setError(err.message || T.errOrderCreate);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // ── ბარათით გადახდა (pickup ან courier) — BOG ──
    const addrComment = [
      delivery.hallway   ? `სადარბაზო ${delivery.hallway}`  : "",
      delivery.floor     ? `სართული ${delivery.floor}`      : "",
      delivery.apartment ? `ბინა ${delivery.apartment}`      : "",
    ].filter(Boolean).join(", ");

    const draft = {
      formData: {
        ...formData,
        coupon_code: promoActive ? promo.code : "",
      },
      ga_client_id: getGaClientId(),
      items: cartItems.map((it) => ({
        id: it.id,
        name: it.name,
        price: it.price,
        sale: it.sale || 0,
        quantity: it.quantity,
        image: it.image_url1 || null,
        ...(isEngravingItem(it) ? { engraving_token: it.engraving_token } : {}),
      })),
      totals: {
        subtotal:       Number(preview.subtotal),
        delivery_fee:   Number(preview.delivery_fee),
        extra_discount: Number(preview.extra_discount),
        promo_base:     Number(preview.promo_base),
        total:          Number(preview.total),
      },
      delivery: formData.deliveryOption === "courierDelivery" ? {
        city:           delivery.city,
        address:        delivery.address,
        hallway:        delivery.hallway,
        floor:          delivery.floor,
        apartment:      delivery.apartment,
        addressComment: addrComment,
      } : null,
    };

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/payments/bog/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const data = await res.json();

      if (!res.ok || !data?.redirect_url) {
        throw new Error(data?.message || `HTTP ${res.status} – redirect_url not provided`);
      }

      let orderId = data.order_id || "";
      if (!orderId) {
        try {
          const u = new URL(data.redirect_url);
          orderId = u.searchParams.get("order_id") || "";
        } catch {
          // redirect_url URL-ად ვერ დაიპარსა — orderId ცარიელი დარჩება
        }
      }
      if (orderId) sessionStorage.setItem("last_bog_order_id", orderId);

      if (data.state) {
        sessionStorage.setItem("last_bog_state", data.state);
      }

      try {
        const pendingPurchase = {
          transaction_id: orderId || data.state || "",
          currency: CURRENCY,
          value: Number(preview.total),
          shipping: Number(preview.delivery_fee),
          has_engraving: hasEngraving,
          items: cartItems.map((it) => ({
            id: it.id,
            name: it.name,
            price: it.price,
            sale: it.sale || 0,
            quantity: it.quantity,
          })),
        };
        sessionStorage.setItem("pending_purchase", JSON.stringify(pendingPurchase));
      } catch {
        // sessionStorage მიუწვდომელია (პრივატული ბრაუზერი და მისთ.) — უვნებელია
      }

      window.location.href = data.redirect_url;
    } catch (err) {
      console.error(err);
      setError(err.message || "გადახდის ინიციალიზაცია ვერ მოხერხდა");
      setSubmitting(false);
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

            {hasEngraving && (
              <div className={styles.promoScopeNote} style={{ color: "#fde68a", borderColor: "rgba(253,230,138,.4)", background: "rgba(253,230,138,.08)" }}>
                <ClockIcon /> {T.engravingNotice}
              </div>
            )}

            {cartItems.map((item) => {
              const up = unitPrice(item);
              const saleValue = normalizeSale(item?.sale);
              const hasSale = saleValue > 0;
              const isEngr = isEngravingItem(item);
              const line = up * (item.quantity || 0);
              const eligible = isPromoEligible(item);
              const promoApplies = promoActive && eligible;
              const promoBlocked = promoActive && !eligible;
              // გრავირება: ლიმიტი ჯამური 5 ცალი; ჩვეულებრივი პროდუქტი: მარაგი
              const maxQty = isEngr
                ? MAX_ENGRAVED_UNITS - (engrUnits - item.quantity)
                : normalizeQuantity(stockById[item.id]);

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
                      src={
                        (isEngr
                          ? engravingThumb(item.image_url1, IMG.MINI)
                          : cld(item.image_url1, { w: IMG.MINI })) || "https://via.placeholder.com/60"
                      }
                      alt={item.name}
                      className={styles.thumb}
                    />
                  </div>

                  <div className={styles.itemContent}>
                    <span className={styles.itemName} title={item.name}>
                      {item.name}
                    </span>
                    {isEngr && (
                      <span className={styles.engravingNote}>{engravingSummary(item)}</span>
                    )}

                    <div className={styles.itemPrice}>
                      {hasSale && (
                        <span className={styles.oldUnitPrice}>
                          {fmt(Number(item.price || 0))} ₾
                        </span>
                      )}
                      {fmt(up)} ₾ × {item.quantity} = <b>{fmt(line)} ₾</b>
                    </div>

                    {(promoApplies || promoBlocked) && (
                      <div
                        className={`${styles.promoChip} ${
                          promoBlocked ? styles.promoChipBlocked : styles.promoChipActive
                        }`}
                        title={promoBlocked ? T.promoRuleHint : undefined}
                      >
                        {promoBlocked
                          ? isEngr
                            ? T.engravingPromoChip
                            : `🔒 ${T.promoExcludedChip} — უკვე ფასდაკლებულია −${saleValue}%`
                          : `🏷️ ${T.promoAppliedChip} −${promo.percent}%`}
                      </div>
                    )}

                    {!isEngr &&
                      (stockMessageById[item.id] || item.quantity >= normalizeQuantity(stockById[item.id])) && (
                      <div className={styles.stockWarning}>
                        {stockMessageById[item.id] ||
                          `მარაგში მხოლოდ ${normalizeQuantity(stockById[item.id])} ცალია.`}
                      </div>
                    )}

                    <div className={styles.controls}>
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

                      <div className={styles.checkboxWrapper}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          id={`plus-${item.id}`}
                          onClick={() => {
                            if (item.quantity >= maxQty) {
                              if (isEngr) return;
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
                          disabled={item.quantity >= maxQty}
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

            {engrUnits >= MAX_ENGRAVED_UNITS && (
              <div className={styles.promoScopeNote}>{T.engravingLimit}</div>
            )}

            {!minOrderOk && (
              <div className={styles.promoScopeNote} style={{ color: "#fca5a5", borderColor: "rgba(248,113,113,.4)", background: "rgba(248,113,113,.08)" }}>
                <WarningIcon /> {T.minOrderHint} — კიდევ დაამატეთ {fmt(MIN_ORDER_SUBTOTAL - subtotal)} ₾-ის ღირებულების პროდუქტი.
              </div>
            )}

            <div className={styles.totalPrice}>
              <div>
                {T.subtotal}: <strong>{fmt(preview.subtotal)} ₾</strong>
              </div>

              {productSavings > 0 && (
                <div className={styles.savingsRow}>
                  🏷️ {T.productSavings}: <strong>−{fmt(productSavings)} ₾</strong>
                </div>
              )}

              {promoActive && preview.extra_discount > 0 && (
                <>
                  <div className={styles.savingsRow}>
                    {T.promoDiscount} ({promo.code} −{promo.percent}%):{" "}
                    <strong>−{fmt(preview.extra_discount)} ₾</strong>
                  </div>
                  {promoExcludedSubtotal > 0 && (
                    <div className={styles.promoScopeNote}>
                      {T.promoBase} <strong>{fmt(promoEligibleSubtotal)} ₾</strong>-ზე ·{" "}
                      {T.onSaleItems} ({fmt(promoExcludedSubtotal)} ₾) არ მონაწილეობს
                    </div>
                  )}
                </>
              )}

              {promo.status !== "valid" && promoExcludedSubtotal > 0 && (
                <div className={styles.promoScopeNote}>
                  🏷️ {T.onSaleItems}: <strong>{fmt(promoExcludedSubtotal)} ₾</strong> —{" "}
                  {T.promoRuleHint}
                </div>
              )}

              {formData.deliveryOption === "courierDelivery" && courierInfo && (
                <>
                  {preview.delivery_discount > 0 && (
                    <div style={{ color: "#16a34a", fontWeight: 600 }}>
                      <TruckIcon /> მიტანაზე ფასდაკლება (შეკვ. ≥ {courierInfo.freeThreshold}₾):{" "}
                      <strong>−{fmt(preview.delivery_discount)}₾</strong>
                    </div>
                  )}
                  <div>
                    <TruckIcon /> {T.deliveryFee}:{" "}
                    <strong>
                      {preview.delivery_fee > 0 ? `${fmt(preview.delivery_fee)} ₾` : "უფასო"}
                    </strong>
                    {preview.delivery_discount > 0 && (
                      <span style={{ textDecoration: "line-through", color: "#94a3b8", marginLeft: 6, fontWeight: 400 }}>
                        {fmt(courierInfo.baseFee)}₾
                      </span>
                    )}
                    <span style={{ color: "#94a3b8", marginLeft: 8, fontSize: 12 }}>
                      ({courierInfo.etaLabel})
                    </span>
                  </div>
                </>
              )}

              {formData.deliveryOption === "storePickup" && (
                <div style={{ color: "#4ade80", fontWeight: 600 }}>
                  <StoreIcon /> ადგილზე აღება: უფასო
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
            // ადგილზე აღებისას პრომო ველი იმალება — კოდიც ვასუფთავებთ,
            // რომ დამალული კოდი ჩუმად არ გამოიყენოს
            if (e.target.value === "storePickup") {
              setFormData((prev) => ({ ...prev, coupon_code: "" }));
            }
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

        {formData.deliveryOption === "storePickup" && (
          <div style={{ background: "rgba(59,130,246,.1)", border: "1px solid rgba(59,130,246,.35)", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#bfdbfe", margin: "7px 0" }}>
            <div><ClockIcon /> შეკვეთა მზად იქნება: <strong>{pickupReady}</strong></div>
            <div><PinIcon /> არტოპია — სიმონ ჩიკოვანის 45, თბილისი</div>
          </div>
        )}

        {formData.deliveryOption === "courierDelivery" && (
          <DeliverySection
            delivery={delivery}
            onChange={handleDeliveryChange}
            subtotal={subtotal}
            hasEngraving={hasEngraving}
          />
        )}

        {formData.deliveryOption === "storePickup" && hasEngraving && (
          <p className={styles.submitHint} style={{ marginTop: 4 }}>
            <CardIcon /> {T.engravingCardOnly}
          </p>
        )}

        {formData.deliveryOption === "storePickup" && !hasEngraving && (
          <select
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleChange}
            className={styles.input}
            required
          >
            <option value="card">{T.payCard}</option>
            <option value="on_site">{T.payOnSite}</option>
          </select>
        )}

        {formData.deliveryOption === "courierDelivery" && (
          <p className={styles.submitHint} style={{ marginTop: 4 }}>
            <CardIcon /> {T.courierCardOnlyNote}
          </p>
        )}

        {formData.deliveryOption !== "storePickup" && (
          <div className={styles.promoField}>
            <input
              name="coupon_code"
              placeholder={T.promo}
              value={formData.coupon_code}
              onChange={handleChange}
              className={`${styles.input} ${
                promo.status === "valid"
                  ? styles.inputValid
                  : promo.status === "invalid"
                  ? styles.inputInvalid
                  : ""
              }`}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />

            {promo.status === "checking" && (
              <p className={styles.promoStatusChecking}>{T.promoChecking}</p>
            )}

            {promo.status === "valid" && (
              <p className={styles.promoStatusValid}>
                ✓ {promo.code} · −{promo.percent}% ={" "}
                <strong>−{fmt(couponDiscount)} ₾</strong>
                {promoExcludedSubtotal > 0 && (
                  <span className={styles.promoStatusPartial}>
                    {" "}
                    — {T.promoRuleHint}
                  </span>
                )}
              </p>
            )}

            {promo.status === "invalid" && (
              <p className={styles.promoStatusInvalid}>✕ {promo.message}</p>
            )}

            {promo.status === "idle" && promoExcludedSubtotal > 0 && (
              <p className={styles.promoStatusHint}>ℹ️ {T.promoRuleHint}</p>
            )}
          </div>
        )}

        <textarea
          name="comment"
          placeholder={T.comment}
          value={formData.comment}
          onChange={handleChange}
          className={styles.input}
          rows={3}
        />

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={!canSubmit || submitting}
          title={submitHint || undefined}
        >
          {submitting ? "..." : T.proceed}
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
