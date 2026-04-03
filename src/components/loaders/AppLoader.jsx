import React from "react";
import Lottie from "lottie-react";
import animation from "../../assets/lottie/loader-bird.json";

export default function AppLoader() {
  return (
    <div style={styles.overlay}>
      <div style={styles.blurBg} />
      <Lottie
        animationData={animation}
        loop
        style={{ width: 300, height: 300 }}
      />
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
};