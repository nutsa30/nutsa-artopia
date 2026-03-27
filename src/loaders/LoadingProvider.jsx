import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import "./loading-overlay.css";
import { subscribeLoading } from "./loadingBus";

const LoadingContext = createContext(null);

export const LoadingProvider = ({ children, minShowMs = 400 }) => {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef(0);

  const start = useCallback(() => {
    setCount((c) => {
      const next = c + 1;
      if (next === 1) {
        shownAtRef.current = Date.now();
        setVisible(true);
        document.body.style.overflow = "hidden"; // ბლოკი სქროლზე
      }
      return next;
    });
  }, []);

  const stop = useCallback(() => {
    setCount((c) => {
      const next = Math.max(0, c - 1);
      if (next === 0) {
        const elapsed = Date.now() - shownAtRef.current;
        const wait = Math.max(0, minShowMs - elapsed);
        window.setTimeout(() => {
          setVisible(false);
          document.body.style.overflow = "";
        }, wait);
      }
      return next;
    });
  }, [minShowMs]);

  // 🔹 subscribe loadingBus (API/RouteLoader event-ები)
  useEffect(() => {
    const unsub = subscribeLoading((evt) => {
      if (evt === "start") start();
      else if (evt === "stop") stop();
    });
    return unsub;
  }, [start, stop]);

 

  const value = useMemo(
    () => ({ start, stop, isLoading: count > 0 }),
    [start, stop, count]
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {visible && (
        <div
          className="loading-overlay"
          role="status"
          aria-live="polite"
          aria-label="Loading"
        >
          <img src={loader} alt="Loading..." className="loading-spinner" />
          {/* თუ ვიდეო გინდა, აქ <video autoPlay muted playsInline src={...}/> ჩასვი */}
        </div>
      )}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error("useLoading must be used within LoadingProvider");
  }
  return ctx;
};
