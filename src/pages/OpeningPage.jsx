import { useNavigate, useLocation } from "react-router-dom";
import { markOpeningSeen } from "../utils/openingGate";
import styles from "./OpeningPage.module.css";
import { useState } from "react";

import deskDark from "../assets/newhome/desk-dark.png";
import deskLight from "../assets/newhome/desk-light.png";
import mobDark from "../assets/newhome/mob-dark.png";
import mobLight from "../assets/newhome/mob-light.png";

export default function OpeningPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLight, setIsLight] = useState(false);
  const [hideButton, setHideButton] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const handleOpen = () => {
    markOpeningSeen();

    setIsLight(true);

    setTimeout(() => setHideButton(true), 10);

    setTimeout(() => {
      setZoom(true);

      setTimeout(() => setFadeOut(true), 900);

      setTimeout(() => {
        const redirectTo = location.state?.from || "/";
        navigate(redirectTo, { replace: true });
      }, 1000);
    }, 1500);
  };

  return (
    <div className={styles.wrapper}>

      {/* 🔥 DARK */}
      <img
        src={deskDark}
        className={`${styles.image} ${styles.desktop} ${
          isLight ? styles.fadeOutSmooth : styles.fadeIn
        }`}
      />
      <img
        src={mobDark}
        className={`${styles.image} ${styles.mobile} ${
          isLight ? styles.fadeOutSmooth : styles.fadeIn
        }`}
      />

      {/* 🔥 LIGHT */}
      <img
        src={deskLight}
        className={`${styles.image} ${styles.desktop} ${
          isLight ? styles.fadeInSmooth : styles.hidden
        } ${zoom ? styles.zoom : ""} ${fadeOut ? styles.fadeOut : ""}`}
      />
      <img
        src={mobLight}
        className={`${styles.image} ${styles.mobile} ${
          isLight ? styles.fadeInSmooth : styles.hidden
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