import React from "react";

/** The shop on Google Maps (owner's link, tracking query removed). */
export const ARTOPIA_MAPS_URL =
  "https://www.google.com/maps/place/%E1%83%90%E1%83%A0%E1%83%A2%E1%83%9D%E1%83%9E%E1%83%98%E1%83%90+%E2%80%A2+Artopia/@41.7149978,44.7704746,17z/data=!3m1!4b1!4m6!3m5!1s0x404473af80519221:0xda6f70384fae090e!8m2!3d41.7149978!4d44.7730495!16s%2Fg%2F11lnp16k6v";

const linkStyle = {
  color: "inherit",
  textDecoration: "underline",
  textDecorationStyle: "dotted",
  textDecorationThickness: "1px",
  textUnderlineOffset: "3px",
};

/** Shows the address as text; a tap opens the shop on Google Maps in a new tab. */
export default function ShopAddressLink({ children, className, style }) {
  return (
    <a
      href={ARTOPIA_MAPS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={{ ...linkStyle, ...style }}
      title="გახსნა Google Maps-ზე"
    >
      {children}
    </a>
  );
}
