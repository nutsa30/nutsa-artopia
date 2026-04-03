import React from "react";
import Lottie from "lottie-react";
import animation from "../../assets/lottie/loader-bird.json";

export default function AppLoader() {
  return (
    <div style={styles.overlay}>
      <div style={styles.blurBg} />

      <div style={styles.loaderWrap}>
        <Lottie
          animationData={animation}
          loop
          style={styles.lottie}
        />
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  blurBg: {
    position: "absolute",
    inset: 0,
    backdropFilter: "blur(12px)",
    background: "rgba(255,255,255,0.2)",
  },

  loaderWrap: {
    width: "40vw",          // responsive
    maxWidth: "300px",      // desktop limit (შენი current დიზაინი)
    minWidth: "140px",      // რომ ძალიან პატარა არ გახდეს
    aspectRatio: "1 / 1",   // ყოველთვის კვადრატი
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  lottie: {
    width: "100%",
    height: "100%",
  },
};