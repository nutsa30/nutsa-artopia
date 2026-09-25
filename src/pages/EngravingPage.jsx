/**
 * /engraving — გრავირება.
 *
 * 1) ზემოთ: წარწერა (შრიფტის არჩევით) და/ან ფოტო. ბრელოკის არჩევისას ფორმა
 *    ორ პანელად იყოფა — წინა და უკანა მხარე. უკანა მხარე არასავალდებულოა:
 *    თუ მასზე რამეა, ფასი ავტომატურად 13₾-დან 20₾-ზე გადადის.
 * 2) ქვემოთ: პროდუქტი (5 კალამი, 4 ბრელოკი); ტყავის ბრელოკზე — ფერი.
 * 3) 3D პრევიუ (ტრიალებს) → კალათაში დამატება.
 *
 * "კალათაში დამატებისას" დიზაინი ინახება ბექზე (POST /engraving/designs):
 * ლაზერის შავ-თეთრი PNG (ზონის ზუსტი მმ ზომით), ორიგინალი ფოტო, 3D პრევიუს
 * სურათი, ტექსტი/შრიფტი და ფერი — ადმინი ზუსტად ამას ხედავს შეკვეთაში.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, Phone, Mail, ArrowUp } from "lucide-react";
import { FaInstagram, FaFacebook, FaTiktok } from "react-icons/fa";
import { Helmet } from "react-helmet-async";
import SEO from "../components/SEO";
import EngravingViewer from "../components/Engraving/EngravingViewer";
import SideEditor from "../components/Engraving/SideEditor";
import { ensureAllFonts } from "../components/Engraving/fonts";
import { composeSide, laserPngBlob, tintMask } from "../components/Engraving/compose";
import { useCart } from "../components/CartContext/CartContext";
import { ClockIcon, WarningIcon, StoreIcon, TruckIcon, PinIcon } from "../components/Checkout/icons";
import {
  ENGRAVING_PRODUCTS,
  PRODUCT_GROUPS,
  DEFAULT_FONT_ID,
  MAX_ENGRAVED_UNITS,
  PRODUCTION_LABEL,
  PX_PER_MM,
  SIDE_LABELS,
  colorById,
  engraveLook,
  engravingPrice,
  engravingUnits,
  fontById,
  fontSupportsText,
} from "../utils/engraving";
import styles from "./EngravingPage.module.css";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";
const PREVIEW_PX_PER_MM = 40; // 3D ტექსტურის გარჩევადობა (ლაზერის ფაილი — 20px/მმ)

const SOCIAL = {
  instagram: "https://www.instagram.com/artopia_tbilisi/",
  facebook: "https://www.facebook.com/profile.php?id=100093336648910",
  tiktok: "https://www.tiktok.com/@artopia_tbilisi",
};

const emptySide = () => ({
  text: "",
  fontId: DEFAULT_FONT_ID,
  photo: null,
  photoStyle: "contrast",
  photoLevel: 0,
  photoInvert: false,
});

/** საკუთარ (მომხმარებლის მოტანილ) ნივთზე გრავირება — შეკვეთა ტელეფონით/მესიჯით/ადგილზე */
const OWN_ITEM_PRICE = 10;

const SITE = "https://artopia.ge";

/** სტრუქტურული მონაცემები Google-ისთვის: სერვისი + ფასები + ხშირი კითხვები */
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": `${SITE}/engraving#service`,
      name: "ლაზერული გრავირება",
      alternateName: ["გრავირება", "Laser engraving", "Engraving"],
      serviceType: "Laser engraving",
      description:
        "გრავირებული კალმები და ხის/ტყავის ბრელოკები საკუთარი წარწერით ან ფოტოთი, ასევე გრავირება მომხმარებლის ნივთზე.",
      url: `${SITE}/engraving`,
      provider: { "@id": `${SITE}/#organization` },
      areaServed: { "@type": "Country", name: "Georgia" },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "გრავირება",
        itemListElement: [
          ...Object.values(ENGRAVING_PRODUCTS).map((p) => ({
            "@type": "Offer",
            name: `გრავირებული ${p.name}`,
            price: String(p.prices[1]),
            priceCurrency: "GEL",
            availability: "https://schema.org/InStock",
            url: `${SITE}/engraving`,
            image: `${SITE}${p.image}`,
          })),
          {
            "@type": "Offer",
            name: "გრავირება მომხმარებლის ნივთზე",
            price: String(OWN_ITEM_PRICE),
            priceCurrency: "GEL",
            url: `${SITE}/engraving#own-item`,
          },
        ],
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "რა ღირს გრავირება?",
          acceptedAnswer: {
            "@type": "Answer",
            text: `გრავირებული კალამი — 16-დან 32 ₾-მდე, ბრელოკი — 13 ₾ ერთ მხარეს და 20 ₾ ორივე მხარეს, თქვენს ნივთზე გრავირება — ${OWN_ITEM_PRICE} ₾.`,
          },
        },
        {
          "@type": "Question",
          name: "რამდენ ხანში მზადდება გრავირებული ნივთი?",
          acceptedAnswer: {
            "@type": "Answer",
            text: `${PRODUCTION_LABEL}. აღება მაღაზიიდან ან კურიერით — დამზადების შემდეგ.`,
          },
        },
        {
          "@type": "Question",
          name: "შეიძლება ფოტოს ამოწვა?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "კი, ბრელოკებზე. ფოტო შავ-თეთრად მუშავდება და 3D პრევიუში ჩანს, როგორ ამოიწვება.",
          },
        },
        {
          "@type": "Question",
          name: "შეგიძლიათ ჩემს ნივთზე გრავირება?",
          acceptedAnswer: {
            "@type": "Answer",
            text: `კი, ${OWN_ITEM_PRICE} ₾. დაგვირეკეთ, მოგვწერეთ ან მობრძანდით მაღაზიაში — სიმონ ჩიქოვანის 45, თბილისი.`,
          },
        },
      ],
    },
  ],
};

const fmt = (n) => `${Number(n).toFixed(0)} ₾`;
const rawLineCount = (text) => String(text || "").split("\n").filter((l) => l.trim()).length;

export default function EngravingPage() {
  const navigate = useNavigate();
  const { cartItems, addEngravingToCart } = useCart();
  const viewerRef = useRef(null);
  const editorRef = useRef(null);

  const [sides, setSides] = useState({ front: emptySide(), back: emptySide() });
  const [productKey, setProductKey] = useState(null);
  const [color, setColor] = useState(null);
  const [viewSide, setViewSide] = useState("front");
  const [qty, setQty] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(null);
  const [contact, setContact] = useState(null);

  const product = productKey ? ENGRAVING_PRODUCTS[productKey] : null;
  const isKeychain = product?.category === "keychain";
  const editSides = isKeychain ? ["front", "back"] : ["front"];

  useEffect(() => {
    let alive = true;
    ensureAllFonts().then(() => alive && setFontsReady(true));
    fetch(`${API_BASE}/contacts`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => alive && setContact(Array.isArray(list) ? list[0] || null : null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const updateSide = (key, patch) =>
    setSides((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const selectProduct = (key) => {
    const p = ENGRAVING_PRODUCTS[key];
    setProductKey(key);
    setColor(p.colors ? (p.colors.some((c) => c.id === color) ? color : p.colors[0].id) : null);
    setViewSide("front");
    setAdded(null);
  };

  const focusSide = (key) => {
    if (!isKeychain || key === viewSide) return;
    setViewSide(key);
    viewerRef.current?.setView(key);
  };

  /* ---------- აწყობა: 3D ტექსტურები + შემოწმებები ---------- */
  const composed = useMemo(() => {
    if (!product || !fontsReady) return null;
    const look = engraveLook(productKey, color);
    const out = {};
    for (const key of editSides) {
      const { canvas, layout } = composeSide(productKey, sides[key], PREVIEW_PX_PER_MM);
      out[key] = {
        layout,
        texture: layout.empty ? null : tintMask(canvas, look, PREVIEW_PX_PER_MM),
      };
    }
    return out;
    // editSides იცვლება მხოლოდ productKey-სთან ერთად
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, productKey, sides, color, fontsReady]);

  const textures = useMemo(() => {
    if (!composed) return {};
    return Object.fromEntries(Object.entries(composed).map(([k, v]) => [k, v.texture]));
  }, [composed]);

  const filled = (key) => !!composed?.[key] && !composed[key].layout.empty;
  // ბრელოკი: უკანა მხარე ითვლება მხოლოდ მაშინ, თუ მასზე რამეა
  const usedSides = isKeychain && filled("back") ? ["front", "back"] : ["front"];
  const unitPrice = product ? engravingPrice(productKey, usedSides.length) : null;

  const inCartUnits = engravingUnits(cartItems);
  const remaining = Math.max(0, MAX_ENGRAVED_UNITS - inCartUnits);
  useEffect(() => {
    if (qty > Math.max(1, remaining)) setQty(Math.max(1, remaining));
  }, [remaining, qty]);

  const problems = useMemo(() => {
    if (!product) return ["აირჩიეთ პროდუქტი"];
    if (!fontsReady) return ["შრიფტები იტვირთება…"];
    const list = [];
    if (product.colors && !colorById(productKey, color)) list.push("აირჩიეთ ფერი");
    if (!filled("front")) {
      list.push(
        !isKeychain
          ? "დაწერეთ წარწერა — კალამზე მხოლოდ ტექსტი ამოიწვება"
          : filled("back")
          ? "წინა მხარე ცარიელია — ერთ მხარეზე გრავირებისთვის გამოიყენეთ წინა მხარე"
          : "წინა მხარეზე დაწერეთ ტექსტი ან ატვირთეთ ფოტო"
      );
    }
    for (const key of editSides) {
      const lay = composed?.[key]?.layout;
      const side = sides[key];
      if (!lay || lay.empty) continue;
      const label = isKeychain ? `${SIDE_LABELS[key]}: ` : "";
      if (!isKeychain ? false : rawLineCount(side.text) > product.maxLines) {
        list.push(`${label}ამ პროდუქტზე მაქსიმუმ ${product.maxLines} ხაზია — ზედმეტი ხაზი წაშალეთ`);
      }
      if (lay.tooSmall) {
        list.push(`${label}ტექსტი ძალიან გრძელია — ამოწვისას ძალიან წვრილი გამოვა. შეამოკლეთ.`);
      }
      if (lay.lines.length && !fontSupportsText(fontById(side.fontId), lay.lines.join(" "))) {
        list.push(`${label}არჩეული შრიფტი ქართულ ასოებს არ შეიცავს`);
      }
    }
    if (remaining <= 0) list.push("კალათაში უკვე მაქსიმალური რაოდენობის გრავირებული ნივთია");
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, productKey, color, fontsReady, sides, composed, remaining]);

  const canAdd = problems.length === 0 && confirmed && !submitting;

  /* ---------- კალათაში დამატება ---------- */
  const handleAdd = async () => {
    if (problems.length || !confirmed || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      if (!viewerRef.current?.isReady()) throw new Error("დაელოდეთ 3D მოდელის ჩატვირთვას");

      const fd = new FormData();
      fd.append("product_key", productKey);
      fd.append("sides", String(usedSides.length));
      if (color) fd.append("color", color);
      const cfgSides = [];
      for (const key of usedSides) {
        const side = sides[key];
        const { canvas, layout } = composeSide(productKey, side, PX_PER_MM);
        const png = await laserPngBlob(canvas);
        fd.append(`${key}_png`, png, `laser-${key}.png`);
        const usePhoto = product.allowPhoto && !!side.photo && !!layout.photoBox;
        if (usePhoto) fd.append(`${key}_photo`, side.photo.uploadBlob, side.photo.uploadName);
        const font = layout.lines.length ? fontById(side.fontId) : null;
        cfgSides.push({
          side: key,
          lines: layout.lines,
          font: font ? { id: font.id, family: font.family, label: font.label } : null,
          photo: usePhoto
            ? { style: side.photoStyle, level: side.photoLevel, invert: !!side.photoInvert }
            : null,
          text_height_mm: layout.lines.length ? +layout.emMm.toFixed(2) : null,
          photo_size_mm: layout.photoBox
            ? [+layout.photoBox.w.toFixed(1), +layout.photoBox.h.toFixed(1)]
            : null,
        });
      }
      fd.append("config", JSON.stringify({ sides: cfgSides }));
      fd.append("preview", await viewerRef.current.snapshot("front"), "preview.png");
      if (usedSides.includes("back")) {
        fd.append("preview_back", await viewerRef.current.snapshot("back"), "preview-back.png");
      }

      const res = await fetch(`${API_BASE}/engraving/designs`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.message || "დიზაინის შენახვა ვერ მოხერხდა, სცადეთ თავიდან");

      const ok = addEngravingToCart(
        {
          id: `engr:${data.token}`,
          engraving_token: data.token,
          name: data.name,
          price: data.unit_price,
          image_url1: data.preview_url,
          engraving: {
            product_key: data.product_key,
            sides: data.sides,
            color: data.color || null,
            color_label: colorById(data.product_key, data.color)?.label || null,
            sides_detail: cfgSides.map((s) => ({
              side: s.side,
              lines: s.lines,
              font_label: s.font?.label || null,
              has_photo: !!s.photo,
            })),
          },
        },
        qty
      );
      if (!ok) throw new Error(`ერთ შეკვეთაში მაქსიმუმ ${MAX_ENGRAVED_UNITS} გრავირებული ნივთია`);
      setAdded({ name: data.name, qty });
      setConfirmed(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "დამატება ვერ მოხერხდა");
    } finally {
      setSubmitting(false);
    }
  };

  const phone = contact?.phone;
  const email = contact?.email;

  return (
    <div className={styles.page}>
      <SEO
        title="გრავირება თბილისში — გრავირებული კალამი და ბრელოკი | Engraving"
        description="ლაზერული გრავირება (engraving) Artopia-ში: გრავირებული კალმები 16–32₾, ხის და ტყავის ბრელოკები წარწერით ან ფოტოთი — 13₾, ორივე მხარე 20₾. გრავირება თქვენს ნივთზე — 10₾. 3D პრევიუ და ონლაინ შეკვეთა."
        url="https://artopia.ge/engraving"
        image="https://artopia.ge/images/engraving/pen.webp"
      />
      <Helmet>
        <meta
          name="keywords"
          content="გრავირება, ლაზერული გრავირება, გრავირება თბილისში, გრავირებული კალამი, კალამი წარწერით, ბრელოკი წარწერით, ხის ბრელოკი, ტყავის ბრელოკი, ფოტოს ამოწვა, პერსონალური საჩუქარი, engraving, laser engraving, engraved pen, engraved keychain, Tbilisi"
        />
        <script type="application/ld+json">{JSON.stringify(JSON_LD)}</script>
      </Helmet>

      <header className={styles.hero}>
        <h1>გრავირება</h1>
        <p>
          საჩუქარი საკუთარი წარწერით ან ფოტოთი — ლაზერული გრავირება კალმებზე და ხის ან ტყავის
          ბრელოკებზე. დაწერეთ ტექსტი, აირჩიეთ პროდუქტი და ნახეთ, როგორ გამოჩნდება.
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.colMain}>
          {/* ───────── 1. წარწერა / ფოტო ───────── */}
          <section className={styles.card} ref={editorRef}>
            <h2 className={styles.stepTitle}>
              <span className={styles.stepNum}>1</span> წარწერა ან ფოტო
            </h2>

            {isKeychain ? (
              <>
                <p className={styles.sideIntro}>
                  ბრელოკს ორი მხარე აქვს. წინა მხარე სავალდებულოა, უკანა — არა. თუ უკანა
                  მხარესაც შეავსებთ, ფასი ავტომატურად გახდება{" "}
                  <b>{fmt(product.prices[2])}</b>.
                </p>
                {editSides.map((key) => (
                  <div
                    key={key}
                    className={`${styles.sidePanel} ${viewSide === key ? styles.sidePanelActive : ""}`}
                  >
                    <div className={styles.sidePanelHead}>
                      <span className={styles.sidePanelTitle}>{SIDE_LABELS[key]}</span>
                      <span className={`${styles.sideChip} ${filled(key) ? styles.sideChipOn : ""}`}>
                        {filled(key)
                          ? "შევსებულია"
                          : key === "back"
                          ? "არასავალდებულო"
                          : "ცარიელია"}
                      </span>
                    </div>
                    <SideEditor
                      id={`engr-${key}`}
                      side={sides[key]}
                      onChange={(patch) => updateSide(key, patch)}
                      product={product}
                      onFocusSide={() => focusSide(key)}
                    />
                  </div>
                ))}
              </>
            ) : (
              <SideEditor
                id="engr-front"
                side={sides.front}
                onChange={(patch) => updateSide("front", patch)}
                product={product}
              />
            )}
          </section>

          {/* ───────── 2. პროდუქტი ───────── */}
          <section className={styles.card}>
            <h2 className={styles.stepTitle}>
              <span className={styles.stepNum}>2</span> აირჩიეთ პროდუქტი
            </h2>
            {PRODUCT_GROUPS.map((g) => (
              <div key={g.id} className={styles.productGroup}>
                <h3 className={styles.groupTitle}>{g.label}</h3>
                <div className={styles.productGrid}>
                  {Object.values(ENGRAVING_PRODUCTS)
                    .filter((p) => p.category === g.id)
                    .map((p) => {
                      const active = productKey === p.key;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          className={`${styles.productCard} ${active ? styles.productActive : ""}`}
                          onClick={() => selectProduct(p.key)}
                          aria-pressed={active}
                        >
                          <img className={styles.productImg} src={p.image} alt={p.name} loading="lazy" />
                          <span className={styles.productName}>{p.name}</span>
                          {p.sizeLabel && <span className={styles.productSize}>{p.sizeLabel}</span>}
                          <span className={styles.productPrice}>
                            {p.category === "keychain" ? (
                              <>
                                <span className={styles.priceLine}>
                                  {fmt(p.prices[1])} <small>ერთი მხარე</small>
                                </span>
                                <span className={styles.priceLine}>
                                  {fmt(p.prices[2])} <small>ორივე მხარე</small>
                                </span>
                              </>
                            ) : (
                              fmt(p.prices[1])
                            )}
                          </span>
                          {p.colors && (
                            <span className={styles.cardSwatches} aria-hidden="true">
                              {p.colors.map((c) => (
                                <i key={c.id} style={{ background: c.swatch }} />
                              ))}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}

            {product?.colors && (
              <div className={styles.colorRow}>
                <span className={styles.label}>ფერი</span>
                <div className={styles.swatches} role="radiogroup" aria-label="ფერი">
                  {product.colors.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={color === c.id}
                      className={`${styles.swatchBtn} ${color === c.id ? styles.swatchActive : ""}`}
                      onClick={() => setColor(c.id)}
                    >
                      <i style={{ background: c.swatch }} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product && (
              <p className={styles.productPicked}>
                <b>{product.name}</b> — {product.note}
                {isKeychain && (
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    <ArrowUp size={14} /> შეავსეთ წინა და უკანა მხარე
                  </button>
                )}
              </p>
            )}
          </section>
        </div>

        {/* ───────── 3. პრევიუ და კალათა ───────── */}
        <aside className={styles.colPreview}>
          <section className={`${styles.card} ${styles.previewCard}`}>
            <h2 className={styles.stepTitle}>
              <span className={styles.stepNum}>3</span> პრევიუ
            </h2>

            <div className={`${styles.stage} ${product?.category === "pen" ? styles.stagePen : ""}`}>
              {product ? (
                <EngravingViewer ref={viewerRef} productKey={productKey} color={color} textures={textures} />
              ) : (
                <div className={styles.stagePlaceholder}>აირჩიეთ პროდუქტი — აქ გამოჩნდება 3D პრევიუ</div>
              )}
            </div>

            {product && (
              <div className={styles.viewBar}>
                <span className={styles.hint}>დაატრიალეთ თითით ან მაუსით</span>
                <div className={styles.viewBtns}>
                  {isKeychain && (
                    <>
                      <button
                        type="button"
                        className={`${styles.ghostBtn} ${viewSide === "front" ? styles.ghostBtnOn : ""}`}
                        onClick={() => {
                          setViewSide("front");
                          viewerRef.current?.setView("front");
                        }}
                      >
                        წინა
                      </button>
                      <button
                        type="button"
                        className={`${styles.ghostBtn} ${viewSide === "back" ? styles.ghostBtnOn : ""}`}
                        onClick={() => {
                          setViewSide("back");
                          viewerRef.current?.setView("back");
                        }}
                      >
                        უკანა
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={() => viewerRef.current?.setView(viewSide)}
                    aria-label="ხედის აღდგენა"
                  >
                    <RotateCcw size={15} />
                  </button>
                </div>
              </div>
            )}

            <div className={styles.infoBox}>
              <div>
                <ClockIcon /> დამზადება: <strong>{PRODUCTION_LABEL}</strong>
              </div>
              <div>
                <StoreIcon /> ადგილზე აღებაც და <TruckIcon /> კურიერით მიწოდებაც ამ ვადის შემდეგ
                ხდება — კალათის სხვა პროდუქტებიც ერთად გაიცემა.
              </div>
              <div>
                <WarningIcon /> ინდივიდუალურად დამზადებული ნივთი არ ბრუნდება — გადაამოწმეთ ტექსტი
                და შრიფტი.
              </div>
            </div>

            {product && problems.length > 0 && (
              <ul className={styles.problems}>
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}

            {product && (
              <>
                <div className={styles.buyRow}>
                  <div className={styles.qty}>
                    <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="ნაკლები">
                      −
                    </button>
                    <span>{qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.min(remaining, q + 1))}
                      disabled={qty >= remaining}
                      aria-label="მეტი"
                    >
                      +
                    </button>
                  </div>
                  <div className={styles.total}>
                    {unitPrice != null && (
                      <>
                        <span>
                          {fmt(unitPrice)} × {qty}
                          {isKeychain && ` · ${usedSides.length === 2 ? "ორივე მხარე" : "ერთი მხარე"}`}
                        </span>
                        <strong>{fmt(unitPrice * qty)}</strong>
                      </>
                    )}
                  </div>
                </div>

                <label className={styles.checkRow}>
                  <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                  <span>
                    გადავამოწმე წარწერა, შრიფტი და ფოტო. ვიცი, რომ ინდივიდუალურად დამზადებული ნივთი
                    არ ბრუნდება.
                  </span>
                </label>

                <button type="button" className={styles.addBtn} onClick={handleAdd} disabled={!canAdd}>
                  {submitting ? "ინახება…" : "კალათაში დამატება"}
                </button>
                {error && <p className={styles.errorText}>{error}</p>}

                {added && (
                  <div className={styles.added}>
                    <strong>
                      {added.name} ({added.qty} ცალი) დაემატა კალათაში.
                    </strong>
                    <div className={styles.addedBtns}>
                      <button type="button" className={styles.addBtn} onClick={() => navigate("/checkout")}>
                        შეკვეთის გაფორმება
                      </button>
                      <button type="button" className={styles.ghostBtn} onClick={() => setAdded(null)}>
                        კიდევ ერთის შექმნა
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className={styles.bulk}>
              <strong>6 ან მეტი ცალი გჭირდებათ?</strong> ერთ შეკვეთაში საიტიდან მაქსიმუმ{" "}
              {MAX_ENGRAVED_UNITS} გრავირებული ნივთის დამატებაა შესაძლებელი. დიდი რაოდენობისთვის
              წინასწარ დაგვიკავშირდით:
              <div className={styles.bulkLinks}>
                {phone && (
                  <a href={`tel:${String(phone).replace(/\s+/g, "")}`}>
                    <Phone size={15} /> {phone}
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`}>
                    <Mail size={15} /> {email}
                  </a>
                )}
                <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <FaInstagram /> Instagram
                </a>
                <a href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <FaFacebook /> Facebook
                </a>
                <a href={SOCIAL.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                  <FaTiktok /> TikTok
                </a>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {/* ───────── საკუთარ ნივთზე გრავირება ───────── */}
      <section className={`${styles.card} ${styles.ownItem}`} id="own-item">
        <h2>გრავირება თქვენს ნივთზე</h2>
        <p>
          გრავირებას ვაკეთებთ თქვენს საკუთარ ან სასურველ ნივთზეც — ხის, ტყავის, ლითონის და სხვა
          ნივთებზე. ნივთის შესაფერისობას წინასწარ შევამოწმებთ.
        </p>
        <span className={styles.ownPrice}>ფასი: {OWN_ITEM_PRICE} ₾</span>
        <p>
          შესაკვეთად დაგვირეკეთ, მოგვწერეთ ელ-ფოსტაზე ან სოციალურ ქსელებში, ან მობრძანდით ჩვენს
          მაღაზიაში.
        </p>
        <div className={styles.ownLinks}>
          {phone && (
            <a href={`tel:${String(phone).replace(/\s+/g, "")}`}>
              <Phone size={16} /> {phone}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`}>
              <Mail size={16} /> {email}
            </a>
          )}
          <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer">
            <FaInstagram /> Instagram
          </a>
          <a href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer">
            <FaFacebook /> Facebook
          </a>
          <a href={SOCIAL.tiktok} target="_blank" rel="noopener noreferrer">
            <FaTiktok /> TikTok
          </a>
          <span>
            <PinIcon /> {contact?.address || "სიმონ ჩიქოვანის 45, თბილისი"}
            {contact?.working_hours ? ` · ${contact.working_hours}` : ""}
          </span>
        </div>
      </section>

      {/* ───────── გრავირების შესახებ (SEO) ───────── */}
      <section className={`${styles.card} ${styles.about}`}>
        <h2>ლაზერული გრავირება თბილისში — Artopia</h2>
        <p>
          Artopia-ში ლაზერული გრავირებით (engraving) შეგიძლიათ შექმნათ პერსონალური საჩუქარი:
          გრავირებული კალამი სახელით ან მილოცვით, ხის ან ტყავის ბრელოკი წარწერით ან ფოტოთი.
          წარწერა ქართულად ან ინგლისურად, რამდენიმე შრიფტით — შეკვეთამდე 3D პრევიუში ხედავთ,
          ზუსტად როგორ ამოიწვება.
        </p>
        <h3>რა ღირს გრავირება?</h3>
        <p>
          გრავირებული კალამი — 16-დან 32 ₾-მდე (ფასი კალმის ჩათვლით). ბრელოკი — 13 ₾ ერთ
          მხარეს, 20 ₾ ორივე მხარეს. თქვენს ნივთზე გრავირება — {OWN_ITEM_PRICE} ₾.
        </p>
        <h3>რამდენ ხანში მზადდება?</h3>
        <p>
          {PRODUCTION_LABEL}. შეკვეთის აღება შეგიძლიათ მაღაზიიდან ან მიიღოთ კურიერით —
          მიწოდება დამზადების შემდეგ ხდება.
        </p>
        <h3>შეიძლება ფოტოს ამოწვა?</h3>
        <p>
          კი — ბრელოკებზე ფოტოც ამოიწვება. ლაზერი ფერს ვერ გადმოსცემს, ამიტომ ფოტო შავ-თეთრად
          მუშავდება და პრევიუში ზუსტად ისე ჩანს, როგორც ამოიწვება.
        </p>
      </section>
    </div>
  );
}
