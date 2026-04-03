import React from "react";
import loaderVideo from "../../assets/loader.webm";

export default function AppLoader() {
  return (
    <div style={styles.overlay}>
      <div style={styles.blurBg} />

      <div style={styles.loaderWrap}>
<video
  autoPlay
  loop
  muted
  playsInline
  style={styles.video}
>
  <source src={loaderVideo} type="video/webm" />
</video>
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
    background: "rgba(15, 23, 42, 0.6)", // 🔥 შეცვლილი (თეთრი აღარ ჩანს)
  },

  loaderWrap: {
    width: "40vw",
    maxWidth: "300px",
    minWidth: "140px",
    aspectRatio: "1 / 1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  video: {
    width: "100%",
    height: "100%",
    objectFit: "contain", // 🔥 რომ არ გაჭრას
  },
};