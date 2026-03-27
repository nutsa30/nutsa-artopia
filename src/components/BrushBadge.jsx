import React from "react";
import brushPng from "../assets/brush.png";
import css from "./BrushBadge.module.css";

/**
 * BrushBadge – მწვანე "brush" ნიშანი ზედ ტექსტით (default: ახალი)
 * Props:
 *  - text: what to write on badge (default "ახალი")
 *  - size: px box (optional). თუ გადასცემ, მხოლოდ ზომას მივანიჭებთ inline-ით.
 *  - className: extra classes ( напр. styles.NewBadge ProductCard-იდან )
 */
export default function BrushBadge({ text = "ახალი", size, className = "" }) {
  const sizeStyle = size ? { width: size, height: size } : undefined;

  return (
    <div className={`${css.badge} ${className}`} style={sizeStyle}>
      <img src={brushPng} alt="" aria-hidden className={css.img} />
      <span className={css.label}>{text}</span>
    </div>
  );
}
