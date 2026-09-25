/**
 * /engraving — გრავირება.
 *
 * 1) ზემოთ: წარწერა (შრიფტის არჩევით) და/ან ფოტო
 * 2) ქვემოთ: პროდუქტი — კალამი (25₾) ან ბრელოკი (13₾, ორივე მხარე 20₾)
 * 3) 3D პრევიუ (ტრიალებს) → კალათაში დამატება
 *
 * "კალათაში დამატებისას" დიზაინი ინახება ბექზე (POST /engraving/designs):
 * ლაზერის შავ-თეთრი PNG (ზონის ზუსტი მმ ზომით), ორიგინალი ფოტო, 3D პრევიუს
 * სურათი და ტექსტი/შრიფტი — ადმინი ზუსტად ამას ხედავს შეკვეთაში.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Trash2, RotateCcw, Phone, Mail, Contrast } from "lucide-react";
import { FaInstagram, FaFacebook, FaTiktok } from "react-icons/fa";
import SEO from "../components/SEO";
import EngravingViewer from "../components/Engraving/EngravingViewer";
import { ensureAllFonts } from "../components/Engraving/fonts";
import { readPhotoFile, releasePhoto, PHOTO_STYLES } from "../components/Engraving/photo";
import { composeSide, laserPngBlob, tintMask } from "../components/Engraving/compose";
import { useCart } from "../components/CartContext/CartContext";
import { ClockIcon, WarningIcon, StoreIcon, TruckIcon } from "../components/Checkout/icons";
import {
  ENGRAVING_PRODUCTS,
  ENGRAVING_FONTS,
  DEFAULT_FONT_ID,
  MAX_ENGRAVED_UNITS,
  MAX_LINE_CHARS,
  PRODUCTION_LABEL,
  PX_PER_MM,
  SIDE_LABELS,
  engravingPrice,
  engravingUnits,
  fontById,
  fontSupportsText,
  hasGeorgian,
  sanitizeEngravingText,
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

const fmt = (n) => `${Number(n).toFixed(0)} ₾`;

export default function EngravingPage() {
  const navigate = useNavigate();
  const { cartItems, addEngravingToCart } = useCart();
  const viewerRef = useRef(null);
  const fileRef = useRef(null);

  const [sides, setSides] = useState({ front: emptySide(), back: emptySide() });
  const [activeSide, setActiveSide] = useState("front");
  const [productKey, setProductKey] = useState(null);
  const [twoSided, setTwoSided] = useState(false);
  const [qty, setQty] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [textNotice, setTextNotice] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(null);
  const [contact, setContact] = useState(null);

  const product = productKey ? ENGRAVING_PRODUCTS[productKey] : null;
  const sideKeys = useMemo(
    () => (productKey === "keychain" && twoSided ? ["front", "back"] : ["front"]),
    [productKey, twoSided]
  );
  const editSide = sideKeys.includes(activeSide) ? activeSide : "front";
  const current = sides[editSide];
  const photoAllowed = !product || product.allowPhoto;
  const maxLines = product ? product.maxLines : 3;

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

  // ორმხრივიდან ცალმხრივზე გადასვლისას რედაქტორი წინა მხარეს ბრუნდება
  useEffect(() => {
    if (!sideKeys.includes(activeSide)) setActiveSide("front");
  }, [sideKeys, activeSide]);

  const updateSide = (key, patch) =>
    setSides((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  /* ---------- ტექსტი ---------- */
  const onTextChange = (e) => {
    const { text, removed } = sanitizeEngravingText(e.target.value);
    let lines = text.split("\n");
    let notice = removed
      ? "დაშვებულია მხოლოდ ქართული და ლათინური ასოები, ციფრები და ძირითადი სიმბოლოები."
      : "";
    if (lines.length > 3) {
      lines = lines.slice(0, 3);
      notice = "მაქსიმუმ 3 ხაზი.";
    }
    if (lines.some((l) => l.length > MAX_LINE_CHARS)) {
      lines = lines.map((l) => l.slice(0, MAX_LINE_CHARS));
      notice = `ერთ ხაზში მაქსიმუმ ${MAX_LINE_CHARS} სიმბოლო.`;
    }
    const nextText = lines.join("\n");
    const patch = { text: nextText };
    // ქართული ტექსტი ლათინურ შრიფტზე — ავტომატურად ქართულ შრიფტზე გადავდივართ
    if (!fontSupportsText(fontById(current.fontId), nextText)) {
      patch.fontId = DEFAULT_FONT_ID;
      notice = "ეს შრიფტი ქართულ ასოებს არ შეიცავს — შეიცვალა ქართულით.";
    }
    setTextNotice(notice);
    updateSide(editSide, patch);
  };

  /* ---------- ფოტო ---------- */
  const onPhotoPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError("");
    setPhotoBusy(true);
    try {
      const photo = await readPhotoFile(file);
      releasePhoto(current.photo);
      updateSide(editSide, { photo, photoLevel: 0, photoInvert: false });
    } catch (err) {
      setPhotoError(err.message || "ფოტო ვერ წაიკითხა");
    } finally {
      setPhotoBusy(false);
    }
  };

  /* ---------- აწყობა: 3D ტექსტურები + შემოწმებები ---------- */
  const composed = useMemo(() => {
    if (!product || !fontsReady) return null;
    const out = {};
    for (const key of sideKeys) {
      const { canvas, layout } = composeSide(productKey, sides[key], PREVIEW_PX_PER_MM);
      out[key] = { layout, texture: layout.empty ? null : tintMask(canvas, productKey) };
    }
    return out;
  }, [product, productKey, sides, sideKeys, fontsReady]);

  const textures = useMemo(() => {
    if (!composed) return {};
    return Object.fromEntries(Object.entries(composed).map(([k, v]) => [k, v.texture]));
  }, [composed]);

  const inCartUnits = engravingUnits(cartItems);
  const remaining = Math.max(0, MAX_ENGRAVED_UNITS - inCartUnits);
  useEffect(() => {
    if (qty > Math.max(1, remaining)) setQty(Math.max(1, remaining));
  }, [remaining, qty]);

  const unitPrice = product ? engravingPrice(productKey, sideKeys.length) : null;

  const problems = useMemo(() => {
    const list = [];
    if (!product) return ["აირჩიეთ პროდუქტი"];
    if (!fontsReady) return ["შრიფტები იტვირთება…"];
    for (const key of sideKeys) {
      const side = sides[key];
      const lay = composed?.[key]?.layout;
      const label = sideKeys.length > 1 ? `${SIDE_LABELS[key]}: ` : "";
      if (!lay || lay.empty) {
        list.push(
          product.allowPhoto
            ? `${label}დაწერეთ ტექსტი ან ატვირთეთ ფოტო`
            : "დაწერეთ წარწერა — კალამზე მხოლოდ ტექსტი ამოიწვება"
        );
        continue;
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
  }, [product, fontsReady, sideKeys, sides, composed, remaining]);

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
      fd.append("sides", String(sideKeys.length));
      const cfgSides = [];
      for (const key of sideKeys) {
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
      if (sideKeys.includes("back")) {
        fd.append("preview_back", await viewerRef.current.snapshot("back"), "preview-back.png");
      }

      const res = await fetch(`${API_BASE}/engraving/designs`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.message || "დიზაინის შენახვა ვერ მოხერხდა, სცადეთ თავიდან");

      const ok = addEngravingToCart(
        {
          id: `engr:${data.token}`,
          engraving_token: data.token,
          name: data.sides === 2 ? `${data.name} (ორივე მხარე)` : data.name,
          price: data.unit_price,
          image_url1: data.preview_url,
          engraving: {
            product_key: data.product_key,
            sides: data.sides,
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
      setAdded({ name: data.name, qty, price: data.unit_price });
      setConfirmed(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "დამატება ვერ მოხერხდა");
    } finally {
      setSubmitting(false);
    }
  };

  const sampleText = (font) => {
    const first = (current.text.split("\n").find((l) => l.trim()) || "").trim().slice(0, 18);
    if (first && fontSupportsText(font, first)) return first;
    return font.georgian ? "არტოპია" : "Artopia";
  };

  const phone = contact?.phone;
  const email = contact?.email;

  return (
    <div className={styles.page}>
      <SEO
        title="გრავირება — კალამი და ბრელოკი საკუთარი წარწერით"
        description="ლაზერული გრავირება Artopia-ში: ოქროსფერი კალამი და ხის ბრელოკი საკუთარი წარწერით ან ფოტოთი. აირჩიეთ შრიფტი, ნახეთ 3D პრევიუ და შეუკვეთეთ ონლაინ."
        url="https://artopia.ge/engraving"
      />

      <header className={styles.hero}>
        <h1>გრავირება</h1>
        <p>
          საჩუქარი საკუთარი წარწერით ან ფოტოთი — ლაზერული გრავირება ოქროსფერ კალამზე და ხის
          ბრელოკზე. დაწერეთ ტექსტი, აირჩიეთ პროდუქტი და ნახეთ, როგორ გამოჩნდება.
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.colMain}>
          {/* ───────── 1. წარწერა / ფოტო ───────── */}
          <section className={styles.card}>
            <h2 className={styles.stepTitle}>
              <span className={styles.stepNum}>1</span> წარწერა ან ფოტო
            </h2>

            {sideKeys.length > 1 && (
              <div className={styles.sideTabs} role="tablist">
                {sideKeys.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={editSide === k}
                    className={`${styles.sideTab} ${editSide === k ? styles.sideTabActive : ""}`}
                    onClick={() => {
                      setActiveSide(k);
                      viewerRef.current?.setView(k);
                    }}
                  >
                    {SIDE_LABELS[k]}
                  </button>
                ))}
              </div>
            )}

            <label className={styles.label} htmlFor="engr-text">
              წარწერა{" "}
              <span className={styles.labelHint}>
                {maxLines === 1 ? "კალამზე — ერთ ხაზად" : `მაქსიმუმ ${maxLines} ხაზი`}
              </span>
            </label>
            <textarea
              id="engr-text"
              className={styles.textInput}
              rows={maxLines === 1 ? 1 : 3}
              placeholder={maxLines === 1 ? "მაგ.: ნუცას, სიყვარულით" : "მაგ.: ნუცა\n25.09.2026"}
              value={current.text}
              onChange={onTextChange}
              spellCheck={false}
            />
            {textNotice && <p className={styles.notice}>{textNotice}</p>}

            <div className={styles.label}>შრიფტი</div>
            <div className={styles.fontGrid}>
              {ENGRAVING_FONTS.map((f) => {
                const supported = fontSupportsText(f, current.text);
                const active = current.fontId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`${styles.fontBtn} ${active ? styles.fontBtnActive : ""}`}
                    disabled={!supported}
                    onClick={() => updateSide(editSide, { fontId: f.id })}
                    title={supported ? f.label : "ქართულ ასოებს არ შეიცავს"}
                  >
                    <span className={styles.fontSample} style={{ fontFamily: `"${f.family}", sans-serif` }}>
                      {sampleText(f)}
                    </span>
                    <span className={styles.fontName}>
                      {f.label}
                      {!f.georgian && <em> · მხოლოდ ლათინური</em>}
                    </span>
                  </button>
                );
              })}
            </div>
            {hasGeorgian(current.text) && (
              <p className={styles.hint}>ლათინური შრიფტები ქართულ ტექსტზე არ მუშაობს.</p>
            )}

            <div className={styles.label}>
              ფოტო{" "}
              <span className={styles.labelHint}>
                {photoAllowed ? "ამოიწვება შავ-თეთრად, როგორც პრევიუშია" : "კალამზე ფოტო არ ამოიწვება — მხოლოდ წარწერა"}
              </span>
            </div>
            <div className={`${styles.photoBox} ${!photoAllowed ? styles.disabled : ""}`}>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onPhotoPick}
                disabled={!photoAllowed}
              />
              {current.photo ? (
                <div className={styles.photoRow}>
                  <img className={styles.photoThumb} src={current.photo.url} alt="ატვირთული ფოტო" />
                  <div className={styles.photoControls}>
                    <div className={styles.segmented}>
                      {PHOTO_STYLES.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={current.photoStyle === s.id ? styles.segActive : ""}
                          onClick={() => updateSide(editSide, { photoStyle: s.id })}
                          disabled={!photoAllowed}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <label className={styles.sliderLabel}>
                      <span>ღია</span>
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        step={1}
                        value={current.photoLevel}
                        onChange={(e) => updateSide(editSide, { photoLevel: Number(e.target.value) })}
                        disabled={!photoAllowed}
                        aria-label="სიმუქე"
                      />
                      <span>მუქი</span>
                    </label>
                    <div className={styles.photoBtns}>
                      <button
                        type="button"
                        className={`${styles.ghostBtn} ${current.photoInvert ? styles.ghostBtnOn : ""}`}
                        onClick={() => updateSide(editSide, { photoInvert: !current.photoInvert })}
                        disabled={!photoAllowed}
                        aria-pressed={current.photoInvert}
                        title="ამოსაწვავი და ხელუხლებელი ნაწილები ადგილს იცვლის — მუქ ფონიან ფოტოზე"
                      >
                        <Contrast size={15} /> ინვერსია
                      </button>
                      <button type="button" className={styles.ghostBtn} onClick={() => fileRef.current?.click()} disabled={!photoAllowed}>
                        <Upload size={15} /> შეცვლა
                      </button>
                      <button
                        type="button"
                        className={styles.ghostBtn}
                        onClick={() => {
                          releasePhoto(current.photo);
                          updateSide(editSide, { photo: null });
                        }}
                      >
                        <Trash2 size={15} /> წაშლა
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.uploadBtn}
                  onClick={() => fileRef.current?.click()}
                  disabled={!photoAllowed || photoBusy}
                >
                  <Upload size={18} /> {photoBusy ? "იტვირთება…" : "ფოტოს ატვირთვა"}
                </button>
              )}
            </div>
            {photoError && <p className={styles.errorText}>{photoError}</p>}
          </section>

          {/* ───────── 2. პროდუქტი ───────── */}
          <section className={styles.card}>
            <h2 className={styles.stepTitle}>
              <span className={styles.stepNum}>2</span> აირჩიეთ პროდუქტი
            </h2>
            <div className={styles.productGrid}>
              {Object.values(ENGRAVING_PRODUCTS).map((p) => {
                const active = productKey === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    className={`${styles.productCard} ${active ? styles.productActive : ""}`}
                    onClick={() => {
                      setProductKey(p.key);
                      setAdded(null);
                    }}
                    aria-pressed={active}
                  >
                    <img className={styles.productImg} src={p.image} alt={p.name} loading="lazy" />
                    <span className={styles.productName}>{p.name}</span>
                    <span className={styles.productPrice}>
                      {p.key === "keychain" ? (
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
                    <span className={styles.productNote}>{p.note}</span>
                  </button>
                );
              })}
            </div>

            {productKey === "keychain" && (
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={twoSided}
                  onChange={(e) => {
                    setTwoSided(e.target.checked);
                    if (e.target.checked) setActiveSide("back");
                  }}
                />
                <span>
                  ორივე მხარეს გრავირება — ჯამში {fmt(ENGRAVING_PRODUCTS.keychain.prices[2])}
                  <small> (უკანა მხარეს სხვა წარწერა ან ფოტო)</small>
                </span>
              </label>
            )}
          </section>
        </div>

        {/* ───────── 3. პრევიუ და კალათა ───────── */}
        <aside className={styles.colPreview}>
          <section className={`${styles.card} ${styles.previewCard}`}>
            <h2 className={styles.stepTitle}>
              <span className={styles.stepNum}>3</span> პრევიუ
            </h2>

            <div className={`${styles.stage} ${productKey === "pen" ? styles.stagePen : ""}`}>
              {product ? (
                <EngravingViewer ref={viewerRef} productKey={productKey} textures={textures} />
              ) : (
                <div className={styles.stagePlaceholder}>აირჩიეთ პროდუქტი — აქ გამოჩნდება 3D პრევიუ</div>
              )}
            </div>

            {product && (
              <div className={styles.viewBar}>
                <span className={styles.hint}>დაატრიალეთ თითით ან მაუსით</span>
                <div className={styles.viewBtns}>
                  {productKey === "keychain" && (
                    <>
                      <button type="button" className={styles.ghostBtn} onClick={() => viewerRef.current?.setView("front")}>
                        წინა
                      </button>
                      <button type="button" className={styles.ghostBtn} onClick={() => viewerRef.current?.setView("back")}>
                        უკანა
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={() => viewerRef.current?.setView("front")}
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
                        <span>{fmt(unitPrice)} × {qty}</span>
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
    </div>
  );
}
