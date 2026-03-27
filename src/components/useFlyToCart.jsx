import { useCallback } from "react";

export function useFlyToCart(cartRef) {
  const fly = useCallback((sourceEl) => {
    if (!cartRef?.current || !sourceEl) return;

    // თუ მომხმარებელს გამორთული აქვს ანიმაციები
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const cartRect = cartRef.current.getBoundingClientRect();
    const srcRect  = sourceEl.getBoundingClientRect();

    // მსუბუქი IMG-კლონი (ორიგინალს არ ვეხებით)
    const clone = new Image();
    clone.src = sourceEl.currentSrc || sourceEl.src;
    Object.assign(clone.style, {
      position: "fixed",
      left: `${srcRect.left}px`,
      top: `${srcRect.top}px`,
      width: `${srcRect.width}px`,
      height: `${srcRect.height}px`,
      margin: 0,
      zIndex: 9999,
      pointerEvents: "none",
      borderRadius: getComputedStyle(sourceEl).borderRadius || "8px",
      boxShadow: "0 8px 24px rgba(0,0,0,.12)",
      willChange: "transform, opacity",
    });
    document.body.appendChild(clone);

    const translateX = cartRect.left + cartRect.width / 2 - (srcRect.left + srcRect.width / 2);
    const translateY = cartRect.top  + cartRect.height / 2 - (srcRect.top  + srcRect.height / 2);

    const anim = clone.animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1, offset: 0 },
        { transform: `translate(${translateX * 0.65}px, ${translateY * 0.65}px) scale(0.8)`, opacity: 0.9, offset: 0.6 },
        { transform: `translate(${translateX}px, ${translateY}px) scale(0.2)`, opacity: 0, offset: 1 }
      ],
      { duration: 600, easing: "cubic-bezier(.22,.61,.36,1)", fill: "forwards" }
    );

    anim.onfinish = () => clone.remove();
    anim.onerror = () => clone.remove();
  }, [cartRef]);

  return fly;
}
