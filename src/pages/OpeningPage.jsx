import { useNavigate, useLocation } from "react-router-dom";
import { markOpeningSeen } from "../utils/openingGate";
import styles from "./OpeningPage.module.css";
import { useState } from "react";

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
      {!isLight && (
        <>
          <img
            src="/src/assets/newhome/desk-dark.png"
            className={`${styles.image} ${styles.desktop}`}
          />
          <img
            src="/src/assets/newhome/mob-dark.png"
            className={`${styles.image} ${styles.mobile}`}
          />
        </>
      )}

      {/* 🔥 LIGHT */}
      {isLight && (
        <>
          <img
            src="/src/assets/newhome/desk-light.png"
            className={`${styles.image} ${styles.desktop} ${zoom ? styles.zoom : ""} ${fadeOut ? styles.fadeOut : ""}`}
          />
          <img
            src="/src/assets/newhome/mob-light.png"
            className={`${styles.image} ${styles.mobile} ${zoom ? styles.zoom : ""} ${fadeOut ? styles.fadeOut : ""}`}
          />
        </>
      )}

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