import { createRoot } from "react-dom/client";
import "../index.css";
import App from "./App.jsx";
import { LoadingProvider } from "./loaders/LoadingProvider.jsx";
import { HelmetProvider } from "react-helmet-async";

createRoot(document.getElementById("root")).render(
  <HelmetProvider>
    <LoadingProvider>
      <App />
    </LoadingProvider>
  </HelmetProvider>
);
