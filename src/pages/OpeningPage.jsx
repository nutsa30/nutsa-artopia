import { markOpeningSeen } from "../utils/openingGate";
import styles from "./OpeningPage.module.css";
import { useState } from "react";

import deskDark from "../assets/newhome/desk-dark.png";
import deskLight from "../assets/newhome/desk-light.png";
import mobDark from "../assets/newhome/mob-dark.png";
import mobLight from "../assets/newhome/mob-light.png";

export default function OpeningPage({ onFinish }) {

  const [isLight, setIsLight] = useState(false);
  const [hideButton, setHideButton] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const handleOpen = () => {
    markOpeningSeen();

    setIsLight(true);

setHideButton(true);
    setTimeout(() => {
      setZoom(true);

      setTimeout(() => setFadeOut(true), 900);

    setTimeout(() => {
  onFinish();
}, 1000);
    }, 1500);
  };

  return (
    <div className={styles.wrapper}>

{/* 🔥 DARK */}
<img
  src={deskDark}
  className={`${styles.image} ${styles.desktop} ${
    isLight ? styles.hidden : ""
  }`}
/>
<img
  src={mobDark}
  className={`${styles.image} ${styles.mobile} ${
    isLight ? styles.hidden : ""
  }`}
/>

{/* 🔥 LIGHT */}
<img
  src={deskLight}
  className={`${styles.image} ${styles.desktop} ${
    isLight ? "" : styles.hidden
  } ${zoom ? styles.zoom : ""} ${fadeOut ? styles.fadeOut : ""}`}
/>
<img
  src={mobLight}
  className={`${styles.image} ${styles.mobile} ${
    isLight ? "" : styles.hidden
  } ${zoom ? styles.zoom : ""} ${fadeOut ? styles.fadeOut : ""}`}
/>

      {/* 🔘 BUTTON */}
      {!hideButton && (
        <div
          className={`${styles.scene} ${isLight ? styles.buttonFade : ""}`}
          onClick={handleOpen}
        >
          <div className={styles.cube}>
            <span className={`${styles.side} ${styles.front}`}>
              მაღაზიის გაღება
            </span>
            <span className={`${styles.side} ${styles.top}`}>
              Welcome
            </span>
          </div>
        </div>
      )}

    </div>
  );
}