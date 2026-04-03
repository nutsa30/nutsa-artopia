import { Navigate, useLocation } from "react-router-dom";
import { hasSeenOpening, clearOpening } from "../utils/openingGate";

export default function OpeningGuard({ children }) {
  const location = useLocation();
  const pathname = location.pathname;

  // ❌ admin არ შევეხოთ
  if (pathname.startsWith("/admin")) {
    return children;
  }

  // ❌ opening-ზე არ დავაბრუნოთ ისევ
  if (pathname === "/opening") {
    return children;
  }

  // ✅ თუ უკვე ნანახია → გავუშვათ
  if (hasSeenOpening()) {
    return children;
  }

  // ⛔ თუ დრო გასულია → გავწმინდოთ (optional safety)
  clearOpening();

  // ❗ redirect opening-ზე
  return (
    <Navigate
      to="/opening"
      replace
      state={{ from: pathname }}
    />
  );
}