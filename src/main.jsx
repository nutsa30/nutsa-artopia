import { createRoot } from "react-dom/client";
import "../index.css";
import "./tailwind.css";
import App from "./App.jsx";
import { LoadingProvider } from "./loaders/LoadingProvider.jsx";
import { HelmetProvider } from "react-helmet-async";
import { loadGoogleTranslate, translationRequested } from "./utils/googleTranslate.js";
import { captureEdgeArticle } from "./utils/edgeArticle.js";

// ლოკალური ტესტი: `.env.development.local`-ში VITE_API_OVERRIDE=http://localhost:5055
// ჰეროკუს მისამართზე წასულ fetch-ებს ლოკალურ ბექზე გადაამისამართებს (ჰეროკუს
// CORS localhost-ს არ უშვებს). მხოლოდ `npm run dev`-ში მუშაობს — production
// build-ში import.meta.env.DEV = false და ეს ბლოკი საერთოდ ამოიჭრება.
if (import.meta.env.DEV && import.meta.env.VITE_API_OVERRIDE) {
  const HEROKU = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";
  const LOCAL = String(import.meta.env.VITE_API_OVERRIDE).replace(/\/+$/, "");
  const nativeFetch = window.fetch.bind(window);
  const toLocal = (url) => (typeof url === "string" && url.startsWith(HEROKU)
    ? LOCAL + "/" + url.slice(HEROKU.length).replace(/^\/+/, "") : url);
  window.fetch = (input, init) => nativeFetch(toLocal(input), init);
  // ადმინის ფოტოს ატვირთვა XHR-ით მიდის (პროგრესის გამო) — ისიც ლოკალურ ბექზე
  const nativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function open(method, url, ...rest) {
    return nativeOpen.call(this, method, toLocal(url), ...rest);
  };
}

// ვიზიტორმა წინა გვერდზე ინგლისური აირჩია → თარგმანს ვაგრძელებთ, ოღონდ გვერდის
// ჩატვირთვის შემდეგ, რომ საწყის რენდერს არ შეაფერხოს.
if (translationRequested()) {
  const start = () => loadGoogleTranslate().catch(() => {});
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}

const rootElement = document.getElementById("root");
// edge-ის ჩაწერილი სტატია ინახება, სანამ React მას ჩაანაცვლებს (იხ. src/utils/edgeArticle.js)
captureEdgeArticle(rootElement);

createRoot(rootElement).render(
  <HelmetProvider>
    <LoadingProvider>
      <App />
    </LoadingProvider>
  </HelmetProvider>
);
