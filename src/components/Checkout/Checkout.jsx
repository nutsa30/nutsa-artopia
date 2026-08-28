import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import styles from "./Checkout.module.css";
import { useCart } from "../CartContext/CartContext";
import { useNavigate } from "react-router-dom";
import DeliverySection from "./DeliverySection";
import { trackBeginCheckout, getGaClientId, CURRENCY } from "../../utils/analytics";
import {
  buildCartBreakdown,
  couponDiscountFor,
  normalizeSale,
  unitPrice,
  PROMO_MESSAGES,
} from "../../utils/pricing";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

const DEFAULT_PICKUP_ADDRESS =
  "ადგილზე გატანა - არტოპია, სიმონ ჩიკოვანის 45, თბილისი";

const isTbilisi = (str) => {
  const lc = (str || "").trim().toLowerCase();
  return lc === "tbilisi" || lc === "თბილისი";
};

const fmt = (n) => Number(n ?? 0).toFixed(2);

// მიტანაზე ფასდაკლება კალათის ჯამის მიხედვით
const DELIVERY_TIERS = [
  { min: 201, discount: 20 },
  { min: 100, discount: 10 },
  { min: 50,  discount: 5  },
];

function calcDeliveryDiscount(subtotal, baseFee) {
  for (const t of DELIVERY_TIERS) {
    if (subtotal >= t.min) return Math.min(t.discount, baseFee);
  }
  return 0;
}

function DeliveryDiscountBanner({ subtotal }) {
  if (subtotal >= 201) {
    return (
      <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#15803d", fontWeight: 600, margin: "10px 0" }}>
        🎉 მიტანაზე 20₾ ფასდაკლება გეკუთვნის!
      </div>
    );
  }
  if (subtotal >= 100) {
    const needed = (201 - subtotal).toFixed(2);
    return (
      <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#166534", margin: "10px 0" }}>
        ✓ <strong>10₾ ფასდაკლება მიტანაზე!</strong> კიდევ <strong>{needed}₾</strong> და 20₾ ფასდაკლება
      </div>
    );
  }
  if (subtotal >= 50) {
    const needed = (100 - subtotal).toFixed(2);
    return (
      <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#166534", margin: "10px 0" }}>
        ✓ <strong>5₾ ფასდაკლება მიტანაზე!</strong> კიდევ <strong>{needed}₾</strong> და 10₾ ფასდაკლება
      </div>
    );
  }
  const needed = (50 - subtotal).toFixed(2);
  return (
    <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#1d4ed8", margin: "10px 0" }}>
      🚚 კიდევ <strong>{needed}₾</strong> და მიტანაზე <strong>5₾ ფასდაკლება</strong> მიიღებ!
    </div>
  );
}

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
  const beginCheckoutFiredRef = useRef(false);

  /**
   * კალათის დაშლა პრომო-კოდის ბაზისებად.
   * წესი: პრომო კოდი ვრცელდება მხოლოდ იმ პროდუქტებზე, რომლებსაც
   * ადმინის ფასდაკლება (sale) არ აქვთ.
   */
  const cart = useMemo(() => buildCartBreakdown(cartItems), [cartItems]);
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
    // იგივე კოდის თავიდან შემოწმებისას (მაგ. რაოდენობა შეიცვალა) პროცენტს
    // ვინახავთ, რომ ჯამი არ აციმციმდეს; ახალ კოდზე კი ნულდება
    setPromo((prev) =>
      prev.code === code
        ? { ...prev, status: "checking" }
        : { ...IDLE_PROMO, status: "checking", code }
    );

    const timer = setTimeout(async () => {
      const payload = {
        code,
        items: cartItems.map((it) => ({
          product_id: it.id,
          quantity: it.quantity,
        })),
      };

      try {
        // ავტორიტეტული ვალიდაცია — ბექენდი თვითონ ითვლის დასაშვებ ბაზას
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
        // Fallback: ბექთან კავშირი ვერ დამყარდა — იგივე წესით ვთვლით ლოკალურად
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
            setPromo({
              ...IDLE_PROMO,
              status: "invalid",
              code,
              reason: "all_items_on_sale",
              message: PROMO_MESSAGES.all_items_on_sale,
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

  /**
   * რეალურად გამოსაყენებელი პრომო ფასდაკლება.
   * ყოველთვის მიმდინარე კალათის დასაშვებ ბაზაზე ითვლება (და არა პასუხის
   * ჩაბეჭდილ თანხაზე), რომ რაოდენობის ცვლილებისას ციფრი არ ჩამორჩეს.
   */
  // კოდი "ჩართულია" — ვალიდურია, ან იმავე კოდის ხელახალი შემოწმება მიდის
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
  const baseFee =
    formData.deliveryOption === "courierDelivery" && selectedCourier
      ? +(selectedCourier.amount ?? 0)
      : 0;
  const delivDisc = formData.deliveryOption === "courierDelivery"
    ? calcDeliveryDiscount(subtotal, baseFee)
    : 0;
  const delivery_fee = Math.max(0, +(baseFee - delivDisc).toFixed(2));
  const extra_discount = couponDiscount;
  const total = Math.max(0, +(subtotal - extra_discount + delivery_fee).toFixed(2));
  return {
    subtotal: +subtotal.toFixed(2),
    base_delivery_fee: baseFee,
    delivery_fee,
    delivery_discount: delivDisc,
    extra_discount,
    // პრომო კოდის ბაზა — ფასდაკლებული პროდუქტების გარეშე
    promo_base: promoEligibleSubtotal,
    promo_excluded: promoExcludedSubtotal,
    total,
  };
}, [subtotal, formData.deliveryOption, couponDiscount, selectedCourier, promoEligibleSubtotal, promoExcludedSubtotal]);

// GA4 begin_checkout — ერთხელ, როცა checkout იხსნება და კალათა შევსებულია
useEffect(() => {
  if (!beginCheckoutFiredRef.current && cartItems.length > 0) {
    beginCheckoutFiredRef.current = true;
    trackBeginCheckout(cartItems, preview.subtotal);
  }
}, [cartItems, preview.subtotal]);


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
      formData: {
        ...formData,
        // მხოლოდ ვალიდური კოდი მიდის ბექზე (ბექი მაინც თავიდან ამოწმებს)
        coupon_code: promoActive ? promo.code : "",
      },
      // GA4 client_id — backend-ის Measurement Protocol purchase-ისთვის (იგივე user/session)
      ga_client_id: getGaClientId(),
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
        promo_base:     Number(preview.promo_base),
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

      // BOG order_id — ჯერ backend-ის პასუხიდან (იგივეს იყენებს webhook-იც),
      // შემდეგ redirect_url-დან. transaction_id-ის თანმიმდევრულობისთვის.
      let orderId = data.order_id || "";
      if (!orderId) {
        try {
          const u = new URL(data.redirect_url);
          orderId = u.searchParams.get("order_id") || "";
        } catch {}
      }
      if (orderId) sessionStorage.setItem("last_bog_order_id", orderId);

      if (data.state) {
        sessionStorage.setItem("last_bog_state", data.state);
      }

      // GA4 purchase-ის snapshot — გადახდის წარმატებით დასრულების შემდეგ
      // PaymentResult-ში გამოვა. transaction_id = backend order_id (fallback: state).
      try {
        const pendingPurchase = {
          transaction_id: orderId || data.state || "",
          currency: CURRENCY,
          value: Number(preview.total),
          shipping: Number(preview.delivery_fee),
          items: cartItems.map((it) => ({
            id: it.id,
            name: it.name,
            price: it.price,
            sale: it.sale || 0,
            quantity: it.quantity,
          })),
        };
        sessionStorage.setItem("pending_purchase", JSON.stringify(pendingPurchase));
      } catch {}

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
              const saleValue = normalizeSale(item?.sale);
              const hasSale = saleValue > 0;
              const line = up * (item.quantity || 0);
              // ფასდაკლებულ პროდუქტზე პრომო კოდი არ ვრცელდება
              const promoApplies = promoActive && !hasSale;
              const promoBlocked = promoActive && hasSale;

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
                          ? `🔒 ${T.promoExcludedChip} — უკვე ფასდაკლებულია −${saleValue}%`
                          : `🏷️ ${T.promoAppliedChip} −${promo.percent}%`}
                      </div>
                    )}

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

            <DeliveryDiscountBanner subtotal={subtotal} />

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

              {formData.deliveryOption === "courierDelivery" && (
                <>
                  {preview.delivery_discount > 0 && (
                    <div style={{ color: "#16a34a", fontWeight: 600 }}>
                      🚚 მიტანაზე ფასდაკლება: <strong>−{fmt(preview.delivery_discount)}₾</strong>
                    </div>
                  )}
                  <div>
                    {T.deliveryFee}:{" "}
                    <strong>
                      {selectedCourier
                        ? `${fmt(preview.delivery_fee)} ₾ · ${selectedCourier.providerName}`
                        : "კურიერი არ არის არჩეული"}
                    </strong>
                    {preview.delivery_discount > 0 && selectedCourier && (
                      <span style={{ textDecoration: "line-through", color: "#94a3b8", marginLeft: 6, fontWeight: 400 }}>
                        {fmt(preview.base_delivery_fee)}₾
                      </span>
                    )}
                  </div>
                </>
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

        {formData.deliveryOption === "courierDelivery" && (
          <DeliverySection
            delivery={delivery}
            onChange={handleDeliveryChange}
            selectedCourier={selectedCourier}
            onCourierSelect={setSelectedCourier}
            subtotal={subtotal}
          />
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