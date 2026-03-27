// src/components/StarburstBadge.jsx
import React from "react";

/**
 * Starburst discount badge (SVG)
 * Props:
 *  - value: number | string  (მაგ. 20 → გამოიტანს "-20%")
 *  - size: px ზომა (default 88)
 *  - className: პოზიციონირების კლასები (absolute / top / left etc.)
 */
export default function StarburstBadge({ value = 0, size = 88, className = "" }) {
  const label = `-${value}%`;
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        pointerEvents: "none", // რომ კლიკებს არ აფარებდეს
      }}
    >
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        aria-label={label}
      >
        {/* წითელი ვარსკვლავი */}
        <polygon
          points="
            50,3  60,18  78,12  73,31  90,40  73,49
            78,68 60,62  50,77  40,62  22,68  27,49
            10,40 27,31  22,12  40,18
          "
          fill="#E32219"
          stroke="#C71A12"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* თეთრი ტექსტი ცენტრში */}
        <text
          x="50"
          y="44"
          textAnchor="middle"
          dominantBaseline="middle"
          fontWeight="800"
          fontFamily="inherit"
          fontSize="22"
          fill="#FFFFFF"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
