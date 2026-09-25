/**
 * ერთი მხარის რედაქტორი: წარწერა + შრიფტი + ფოტო.
 * კალამზე — ერთი (წინა), ბრელოკზე — ორი ცალკე პანელი (წინა / უკანა).
 */
import React, { useRef, useState } from "react";
import { Upload, Trash2, Contrast } from "lucide-react";
import { readPhotoFile, releasePhoto, PHOTO_STYLES } from "./photo";
import {
  ENGRAVING_FONTS,
  DEFAULT_FONT_ID,
  MAX_LINE_CHARS,
  fontById,
  fontSupportsText,
  hasGeorgian,
  sanitizeEngravingText,
} from "../../utils/engraving";
import styles from "../../pages/EngravingPage.module.css";

export default function SideEditor({ id, side, onChange, product, onFocusSide }) {
  const fileRef = useRef(null);
  const [notice, setNotice] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);

  const photoAllowed = !product || product.allowPhoto;
  const maxLines = product ? product.maxLines : 3;

  const onText = (e) => {
    const { text, removed } = sanitizeEngravingText(e.target.value);
    // კალამზე წარწერა ერთ ხაზადაა — Enter ჰარად იქცევა
    let lines = maxLines === 1 ? [text.replace(/\n+/g, " ")] : text.split("\n");
    let msg = removed
      ? "დაშვებულია მხოლოდ ქართული და ლათინური ასოები, ციფრები და ძირითადი სიმბოლოები."
      : "";
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      msg = `მაქსიმუმ ${maxLines} ხაზი.`;
    }
    if (lines.some((l) => l.length > MAX_LINE_CHARS)) {
      lines = lines.map((l) => l.slice(0, MAX_LINE_CHARS));
      msg = `ერთ ხაზში მაქსიმუმ ${MAX_LINE_CHARS} სიმბოლო.`;
    }
    const next = lines.join("\n");
    const patch = { text: next };
    // ქართული ტექსტი ლათინურ შრიფტზე — ავტომატურად ქართულ შრიფტზე გადავდივართ
    if (!fontSupportsText(fontById(side.fontId), next)) {
      patch.fontId = DEFAULT_FONT_ID;
      msg = "ეს შრიფტი ქართულ ასოებს არ შეიცავს — შეიცვალა ქართულით.";
    }
    setNotice(msg);
    onChange(patch);
  };

  const onPhotoPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError("");
    setPhotoBusy(true);
    try {
      const photo = await readPhotoFile(file);
      releasePhoto(side.photo);
      onChange({ photo, photoLevel: 0, photoInvert: false });
    } catch (err) {
      setPhotoError(err.message || "ფოტო ვერ წაიკითხა");
    } finally {
      setPhotoBusy(false);
    }
  };

  const sampleText = (font) => {
    const first = (side.text.split("\n").find((l) => l.trim()) || "").trim().slice(0, 18);
    if (first && fontSupportsText(font, first)) return first;
    return font.georgian ? "არტოპია" : "Artopia";
  };

  return (
    <div onFocusCapture={onFocusSide} onPointerDownCapture={onFocusSide}>
      <label className={styles.label} htmlFor={`${id}-text`}>
        წარწერა{" "}
        <span className={styles.labelHint}>
          {maxLines === 1 ? "კალამზე — ერთ ხაზად" : `მაქსიმუმ ${maxLines} ხაზი`}
        </span>
      </label>
      <textarea
        id={`${id}-text`}
        className={styles.textInput}
        rows={maxLines === 1 ? 1 : 3}
        placeholder={maxLines === 1 ? "მაგ.: ნუცას, სიყვარულით" : "მაგ.: ნუცა\n25.09.2026"}
        value={side.text}
        onChange={onText}
        spellCheck={false}
      />
      {notice && <p className={styles.notice}>{notice}</p>}

      <div className={styles.label}>შრიფტი</div>
      <div className={styles.fontGrid}>
        {ENGRAVING_FONTS.map((f) => {
          const supported = fontSupportsText(f, side.text);
          const active = side.fontId === f.id;
          return (
            <button
              key={f.id}
              type="button"
              className={`${styles.fontBtn} ${active ? styles.fontBtnActive : ""}`}
              disabled={!supported}
              onClick={() => onChange({ fontId: f.id })}
              title={supported ? f.label : "ქართულ ასოებს არ შეიცავს"}
              aria-pressed={active}
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
      {hasGeorgian(side.text) && (
        <p className={styles.hint}>ლათინური შრიფტები ქართულ ტექსტზე არ მუშაობს.</p>
      )}

      <div className={styles.label}>
        ფოტო{" "}
        <span className={styles.labelHint}>
          {photoAllowed ? "ამოიწვება შავ-თეთრად, როგორც პრევიუშია" : "კალამზე ფოტო არ ამოიწვება — მხოლოდ წარწერა"}
        </span>
      </div>
      <div className={`${styles.photoBox} ${!photoAllowed ? styles.disabled : ""}`}>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhotoPick} disabled={!photoAllowed} />
        {side.photo ? (
          <div className={styles.photoRow}>
            <img className={styles.photoThumb} src={side.photo.url} alt="ატვირთული ფოტო" />
            <div className={styles.photoControls}>
              <div className={styles.segmented}>
                {PHOTO_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={side.photoStyle === s.id ? styles.segActive : ""}
                    onClick={() => onChange({ photoStyle: s.id })}
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
                  value={side.photoLevel}
                  onChange={(e) => onChange({ photoLevel: Number(e.target.value) })}
                  disabled={!photoAllowed}
                  aria-label="სიმუქე"
                />
                <span>მუქი</span>
              </label>
              <div className={styles.photoBtns}>
                <button
                  type="button"
                  className={`${styles.ghostBtn} ${side.photoInvert ? styles.ghostBtnOn : ""}`}
                  onClick={() => onChange({ photoInvert: !side.photoInvert })}
                  disabled={!photoAllowed}
                  aria-pressed={side.photoInvert}
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
                    releasePhoto(side.photo);
                    onChange({ photo: null });
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
    </div>
  );
}
