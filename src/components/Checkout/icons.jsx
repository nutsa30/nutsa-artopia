import React from "react";

const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  style: { display: "inline-block", verticalAlign: "-3px", flexShrink: 0 },
};

export const TruckIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="1" y="6" width="13" height="10" rx="1.5" />
    <path d="M14 9h4l3 3.5V16h-7V9z" />
    <circle cx="6" cy="18.5" r="1.7" />
    <circle cx="17.5" cy="18.5" r="1.7" />
  </svg>
);

export const StoreIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4 9V4h16v5" />
    <path d="M3 9l1.5-5h15L21 9" />
    <path d="M4 9v11h16V9" />
    <path d="M9 20v-6h6v6" />
  </svg>
);

export const ClockIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const PinIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 21s7-7.25 7-12a7 7 0 1 0-14 0c0 4.75 7 12 7 12z" />
    <circle cx="12" cy="9" r="2.3" />
  </svg>
);

export const CardIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
);

export const WarningIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 3 2 20h20L12 3z" />
    <path d="M12 10v4" />
    <path d="M12 17h.01" />
  </svg>
);
