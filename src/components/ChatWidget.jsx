// src/components/ChatWidget.jsx
import { useEffect, useMemo, useRef, useState } from "react";

// შენი ახალი ბექენდის მისამართი — ბოლო სლაში გარეშე
const BOT_BASE = "https://artopia-bot-geo-78145bff4475.herokuapp.com";

// ჰელპერი: აგენერირებს коррект URL-ს (არ გამოვა ორმაგი სლაში)
const api = (path) => new URL(path, BOT_BASE).toString();

/**
 * Props:
 * - siteLang: "ka" | "en"
 */
export default function ChatWidget({ siteLang = "ka" }) {
  // ადმინზე ჩატბოტი არ უნდა ჩანდეს
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  if (/^\/admin\b/.test(path)) return null;

  const [open, setOpen] = useState(false);

  // Views: start | russia_warning | menu | answer | goodbye
  const [view, setView] = useState("start");

  // Data buckets
  const [greeting, setGreeting] = useState({ ka: "", en: "" });
  const [startLanguages, setStartLanguages] = useState([]); // [{code,label}]
  const [error, setError] = useState("");

  // Russia warning flow
  const [warningText, setWarningText] = useState("");
  const [selectAnother, setSelectAnother] = useState("");
  const warningTimerRef = useRef(null);

  // Selected functional language (ka/en) after pick
  const [lang, setLang] = useState(null); // "ka" | "en"

  // Menu + Answer data
  const [menuItems, setMenuItems] = useState([]); // [{id,label}]
  const [answerData, setAnswerData] = useState(null); // {answer, another_question, yes_no}

  const buttonLabel = useMemo(
    () => (siteLang === "en" ? "Art Bot" : "არტ ბოტი"),
    [siteLang]
  );

  // Fetch /start whenever panel opens
  useEffect(() => {
    if (!open) return;
    let ignore = false;

    const getStart = async () => {
      try {
        setError("");
        const res = await fetch(api("/start"));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (ignore) return;
        setGreeting(data.message || {});
        setStartLanguages(data.languages || []);
        setLang(null);
        setMenuItems([]);
        setAnswerData(null);
        setView("start");
      } catch (e) {
        console.error("GET /start failed:", e);
        setError(
          siteLang === "en"
            ? "Failed to reach bot API."
            : "ბოტის API-მდე ვერ მივდივართ."
        );
      }
    };

    getStart();
    return () => {
      ignore = true;
    };
  }, [open, siteLang]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
        warningTimerRef.current = null;
      }
    };
  }, []);

  const onPickLanguage = async (code) => {
    if (code === "ru") {
      // Russia flow
      try {
        const res = await fetch(api("/russia"));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setWarningText(
          data.warning ||
            "RUSSIA IS OCCUPIER AND 20% OF GEORGIA IS OCCUPIED BY RUSSIA."
        );
        setSelectAnother(
          data.select_another || "Please select another language."
        );
        setView("russia_warning");

        const delay = Number(data.delay_ms || 2000);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

        // race-condition fix — გამოვიყენოთ data-ს მნიშვნელობები
        warningTimerRef.current = setTimeout(() => {
          const msg = data.select_another || "Please select another language.";
          setGreeting((prev) => ({ ...prev, en: msg, ka: msg }));
          setStartLanguages(data.languages || []); // now only ka/en
          setView("start");
        }, delay);
      } catch (e) {
        console.error("GET /russia failed:", e);
        setError(
          siteLang === "en"
            ? "Failed to reach bot API."
            : "ბოტის API-მდე ვერ მივდივართ."
        );
      }
      return;
    }

    // ka/en → load menu
    try {
      setError("");
      const res = await fetch(api(`/menu/${code}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLang(data.lang || code);
      setMenuItems(data.items || []);
      setAnswerData(null);
      setView("menu");
    } catch (e) {
      console.error(`GET /menu/${code} failed:`, e);
      setError(
        siteLang === "en"
          ? "Failed to load menu."
          : "მენიუს ჩატვირთვა ვერ მოხერხდა."
      );
    }
  };

  const onPickMenuItem = async (itemId) => {
    if (!lang) return;
    try {
      setError("");
      const res = await fetch(api(`/answer/${lang}/${itemId}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAnswerData(data || null);
      setView("answer");
    } catch (e) {
      console.error(`GET /answer/${lang}/${itemId} failed:`, e);
      setError(
        siteLang === "en"
          ? "Failed to load answer."
          : "პასუხის ჩატვირთვა ვერ მოხერხდა."
      );
    }
  };

  const onYes = () => {
    // Back to menu
    setAnswerData(null);
    setView("menu");
  };

  const onNo = async () => {
    if (!lang) return;
    try {
      setError("");
      const res = await fetch(api(`/goodbye/${lang}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAnswerData({ goodbye: data.message });
      setView("goodbye");
    } catch (e) {
      console.error(`GET /goodbye/${lang} failed:`, e);
      setError(
        siteLang === "en"
          ? "Failed to load goodbye."
          : "დამშვიდობება ვერ ჩაიტვირთა."
      );
    }
  };

  return (
    <>
      {/* Collapsed button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={buttonLabel}
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            zIndex: 9999,
            background: "#7EC3F3",
            color: "#0B2B3B",
            border: "none",
            borderRadius: 9999,
            padding: "12px 16px",
            fontWeight: 600,
            boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
            cursor: "pointer",
          }}
        >
          {buttonLabel}
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            zIndex: 10000,
            width: 360,
            maxWidth: "90vw",
            height: 480,
            maxHeight: "70vh",
            background: "white",
            borderRadius: 16,
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid #E5E7EB",
          }}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div
            style={{
              background: "#7EC3F3",
              color: "#0B2B3B",
              padding: "10px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <strong>{buttonLabel}</strong>
            <button
              onClick={() => {
                setOpen(false);
                // reset state
                setView("start");
                setLang(null);
                setMenuItems([]);
                setAnswerData(null);
              }}
              aria-label={siteLang === "en" ? "Close chat" : "ჩატის დახურვა"}
              style={{
                maxWidth: "40px",
                background: "transparent",
                border: "none",
                fontSize: 18,
                cursor: "pointer",
                color: "#0B2B3B",
              }}
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, padding: 12, overflow: "auto" }}>
            {error && (
              <div
                style={{
                  color: "#b91c1c",
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  padding: 10,
                  borderRadius: 10,
                  marginBottom: 8,
                }}
              >
                {error}
              </div>
            )}

            {view === "russia_warning" && (
              <div
                style={{
                  color: "#b91c1c",
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: 12,
                  padding: 12,
                  fontWeight: 700,
                  fontSize: 15,
                  lineHeight: 1.4,
                }}
              >
                {warningText ||
                  "RUSSIA IS OCCUPIER AND 20% OF GEORGIA IS OCCUPIED BY RUSSIA."}
              </div>
            )}

            {view === "start" && (
              <>
                <div
                  style={{
                    fontSize: 14,
                    color: "#334155",
                    background: "#F8FAFC",
                    border: "1px solid #E5E7EB",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 12,
                  }}
                >
                  {greeting?.[siteLang] ||
                    greeting?.en ||
                    (siteLang === "en" ? "Choose a language:" : "აირჩიე ენა:")}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {startLanguages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => onPickLanguage(l.code)}
                      style={{
                        color: "#0B2B3B",
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid #cbd5e1",
                        cursor: "pointer",
                        background: "white",
                      }}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {view === "menu" && (
              <>
                <div
                  style={{
                    fontSize: 14,
                    color: "#334155",
                    background: "#F8FAFC",
                    border: "1px solid #E5E7EB",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 12,
                  }}
                >
                  {lang === "en" ? "Choose a topic:" : "აირჩიე თემა:"}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onPickMenuItem(item.id)}
                      style={{
                        color: "#0B2B3B",
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid #cbd5e1",
                        cursor: "pointer",
                        background: "white",
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {view === "answer" && answerData && (
              <>
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    fontSize: 14,
                    color: "#334155",
                    background: "#F8FAFC",
                    border: "1px solid #E5E7EB",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 12,
                  }}
                >
                  {answerData.answer}
                </div>

                <div
                  style={{
                    fontSize: 14,
                    color: "#334155",
                    marginBottom: 8,
                  }}
                >
                  {answerData.another_question}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={onYes}
                    style={{
                      color: "#0B2B3B",
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid #cbd5e1",
                      cursor: "pointer",
                      background: "white",
                    }}
                  >
                    {answerData.yes_no?.yes || (lang === "en" ? "Yes" : "დიახ")}
                  </button>
                  <button
                    onClick={onNo}
                    style={{
                      color: "#0B2B3B",
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid #cbd5e1",
                      cursor: "pointer",
                      background: "white",
                    }}
                  >
                    {answerData.yes_no?.no || (lang === "en" ? "No" : "არა")}
                  </button>
                </div>
              </>
            )}

            {view === "goodbye" && (
              <div
                style={{
                  fontSize: 14,
                  color: "#334155",
                  background: "#F8FAFC",
                  border: "1px solid #E5E7EB",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                {answerData?.goodbye ||
                  (lang === "en"
                    ? "Thank you! Enjoy your shopping at Artopia 🌟"
                    : "გმადლობთ! სასიამოვნო შოპინგს გისურვებთ არტოპიაში 🌟")}
              </div>
            )}
          </div>

          {/* Footer (input disabled in this step) */}
          <div
            style={{
              borderTop: "1px solid #E5E7EB",
              padding: 8,
              background: "#F9FAFB",
            }}
          ></div>
        </div>
      )}
    </>
  );
}
