import { useMemo, useRef, useState } from "react";

export default function ChatWidget({ siteLang = "ka" }) {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  if (/^\/admin\b/.test(path)) return null;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState("start");
  const [lang, setLang] = useState(null);
  const [selected, setSelected] = useState(null);
  const timerRef = useRef(null);

  const buttonLabel = useMemo(
    () => (siteLang === "en" ? "Art Bot" : "არტ ბოტი"),
    [siteLang]
  );

  // 🔥 FRONT DATA
const DATA = {
  greeting: {
    ka: "აირჩიე ენა:",
    en: "Choose a language:",
  },

  goodbye: {
    ka: "გმადლობთ! სასიამოვნო შოპინგს გისურვებთ არტოპიაში 🌟",
    en: "Thank you! Enjoy your shopping at Artopia 🌟",
  },

  another: {
    ka: "გსურთ კიდევ რამე?",
    en: "Do you need anything else?",
  },

  yesno: {
    ka: { yes: "დიახ", no: "არა" },
    en: { yes: "Yes", no: "No" },
  },

  warning: {
    text: "20% of Georgia is occupied by Russia. Please select another language.",
    delay: 3000,
  },

  langs: {
    ka: "ქართული",
    en: "English",
    ru: "Русский",
  },

  start: ["ka", "en", "ru"],

  menu: {
    ka: [
      { id: "tbilisi_delivery", label: "მიწოდება თბილისში" },
      { id: "regions_delivery", label: "მიწოდება რეგიონში" },
      { id: "pickup", label: "ადგილზე აღება" },
      { id: "address", label: "მაღაზიის მისამართი" },
      { id: "hours", label: "მაღაზიის სამუშაო საათები" },
      { id: "exchange", label: "გაცვლა/დაბრუნება" },
      { id: "contact", label: "კონტაქტი" },
    ],
    en: [
      { id: "tbilisi_delivery", label: "Delivery in Tbilisi" },
      { id: "regions_delivery", label: "Delivery in the Region" },
      { id: "pickup", label: "Pickup at Artopia" },
      { id: "address", label: "Address" },
      { id: "hours", label: "Working hours" },
      { id: "exchange", label: "Exchange/Returns" },
      { id: "contact", label: "Contact" },
    ],
  },

  answers: {
    tbilisi_delivery: {
      ka: "თბილისში მიწოდების შემთხვევაში გვაქვს 2 სახის მიწოდების სერვისი:\n1) ადგილზე აღება;\n2) მიწოდება მომდევნო სამუშაო დღეს — 6ლ (მიწოდება უფასოა 50ლ-დან);",
      en: "We offer 2 options in Tbilisi:\n1) Pickup at Artopia;\n2) Next-day delivery — 6 GEL (free if order is more than 50 GEL).",
    },

    regions_delivery: {
      ka: "რეგიონებში საკურიერო მომსახურების საფასურია 8ლ. 70 ლარიდან კი უფასოა. მიწოდების ვადა არის 3–4 სამუშაო დღე.",
      en: "Delivery fee in the regions is 8 GEL, but it's free if the order is more than 70 GEL. Delivery time is 3–4 business days.",
    },

    pickup: {
      ka: "შეკვეთის ადგილზე აღება შესაძლებელია არტოპიაში.",
      en: "You can collect your order from the store.",
    },

    address: {
      ka: "ჩვენი მისამართია: თბილისი, სიმონ ჩიქოვანის ქ. 45 (ავერსის აფთიაქის გვერდით), მეტრო „ტექნიკურიდან“ ~10 წუთი.",
      en: "Our address is: Tbilisi, 45 Simon Chiqovani St. (next to Aversi pharmacy), ~10 minutes from Technical University metro.",
    },

    hours: {
      ka: "მაღაზიის სამუშაო საათებია: ყოველდღე 11:30–20:30.",
      en: "Artopia working hours: everyday 11:30–20:30.",
    },

    exchange: {
      ka: "გაცვლა/დაბრუნება შესაძლებელია შეკვეთის მიღებიდან 2 დღის განმავლობაში, თუ პროდუქტი არ არის გახსნილი/დაზიანებული და არის იმავე მდგომარეობაში, როგორშიც მიიღეთ. დაგვიკავშირდით ელ-ფოსტაზე ან ნომერზე.",
      en: "Exchange/Returns is allowed within 2 days after delivery, only if the product is unopened/undamaged and in the same condition as received. Please contact us via email or phone.",
    },

    contact: {
      ka: "ელ-ფოსტა: info@artopia.ge\nმობილურის ნომერი: +995 593 20 40 98\nმობილურის ნომერი (სარეზერვო): +995 505 05 16 16",
      en: "Mail: info@artopia.ge\nMobile number: +995 593 20 40 98\nMobile number (Backup): +995 505 05 16 16",
    },
  },
};

  const letters = "არტ ბოტი არტ ბოტი".split("");

  return (
    <>
      {/* 🔥 BUTTON — untouched */}
      {!open && (
        <button onClick={() => setOpen(true)} className="chat-button">
          <p className="chat-text">
            {letters.map((l, i) => (
              <span key={i} style={{ "--index": i }}>
                {l}
              </span>
            ))}
          </p>
          <div className="chat-circle">
            <img src="/Logo.png" className="chat-logo" />
          </div>
        </button>
      )}

      {/* 🔥 CHAT PANEL */}
      {open && (
        <div className="chat-box">
          <div className="chat-header">
            <span>{buttonLabel}</span>
<button
  className="close-btn"
  onClick={() => {
    setOpen(false);
    setView("start");
    setLang(null);
    setSelected(null);
  }}
>
  <span className="X"></span>
  <span className="Y"></span>
  <div className="close">Close</div>
</button>
          </div>

          <div className="chat-body">
            {/* START */}
            {view === "start" && (
              <>
                <div className="bubble">
                  {DATA.greeting[siteLang]}
                </div>

                <div className="grid">
                  {DATA.start.map((l) => (
                    <button
                      key={l}
                      className="chip"
                      onClick={() => {
                        if (l === "ru") {
                          setView("warn");
                          timerRef.current = setTimeout(
                            () => setView("start"),
                            DATA.warning.delay
                          );
                          return;
                        }
                        setLang(l);
                        setView("menu");
                      }}
                    >
                      {DATA.langs[l]}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* WARNING */}
            {view === "warn" && (
              <div className="warn">
                {DATA.warning.text}
              </div>
            )}

            {/* MENU */}
            {view === "menu" && (
              <>
                <div className="bubble">
                  {lang === "en" ? "Choose topic:" : "აირჩიე თემა:"}
                </div>

                <div className="grid">
                  {DATA.menu[lang].map((item) => (
                    <button
                      key={item.id}
                      className="chip"
                      onClick={() => {
                        setSelected(item.id);
                        setView("answer");
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ANSWER */}
            {view === "answer" && (
              <>
                <div className="bubble">
{DATA.answers[selected]?.[lang] || (lang === "en" ? "Answer not found." : "პასუხი ვერ მოიძებნა.")}
                </div>

                <div className="question">
                  {DATA.another[lang]}
                </div>

                <div className="row">
                  <button className="chip" onClick={() => setView("menu")}>
                    {DATA.yesno[lang].yes}
                  </button>
                  <button className="chip" onClick={() => setView("bye")}>
                    {DATA.yesno[lang].no}
                  </button>
                </div>
              </>
            )}

            {/* GOODBYE */}
            {view === "bye" && (
              <div className="bubble">
                {DATA.goodbye[lang]}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔥 UI STYLES */}
      <style>{`
        .chat-box {
          position: fixed;
          right: 16px;
          bottom: 16px;
          width: 340px;
          height: 480px;
          background: #0f172a;
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }

        .chat-header {
          background: linear-gradient(135deg,#5865f2,#7c3aed);
          padding: 12px;
          color: white;
          display: flex;
          justify-content: space-between;
        }

        .chat-body {
          flex: 1;
          padding: 12px;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .bubble {
          background: #1e293b;
          color: white;
          padding: 10px;
          border-radius: 12px;
          font-size: 14px;
        }

        .warn {
          background: #7f1d1d;
          padding: 12px;
          border-radius: 12px;
          color: white;
          font-weight: bold;
        }

        .grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .chip {
          background: #334155;
          color: white;
          border: none;
          padding: 8px 10px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
        }

        .chip:hover {
          background: #5865f2;
        }

        .row {
          display: flex;
          gap: 8px;
        }

        /* BUTTON ORIGINAL */
.chat-button {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 9999;

  cursor: pointer;
  border: none;
  background: #5865f2;
  color: #fff;

  width: 100px;
  height: 100px;
  border-radius: 50%;

  overflow: hidden;
  display: grid;
  place-content: center;

  transition: background 300ms, transform 200ms;
}

        .chat-text {
          position: absolute;
          inset: 0;
          animation: rotateText 8s linear infinite;
        }

        .chat-text span {
          position: absolute;
          transform: rotate(calc(20deg * var(--index)));
          inset: 6px;
          font-size: 10px;
          color: white;
        }
          .question {
  color: #7dd3fc; /* ცისფერი */
  font-size: 14px;
  margin-top: 4px;
}

.chat-circle {
  width: 48px;
  height: 48px;
  background: #111;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
  .chat-button:hover {
  background: #000;
  transform: scale(1.05);
}

.chat-button:hover .chat-logo {
  filter: brightness(1.08);
}

        .chat-logo {
          width: 30px;
        }

        @keyframes rotateText {
          to {
            transform: rotate(360deg);
          }
        }

        .close-btn {
  position: relative;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255,255,255,0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: 0.3s;
}

.close-btn:hover {
  background: rgb(211, 21, 21);
}

.close-btn:active {
  background: rgb(130, 0, 0);
}

.close-btn .X {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 18px;
  height: 2px;
  background: white;
  transform: translate(-50%, -50%) rotate(45deg);
}

.close-btn .Y {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 18px;
  height: 2px;
  background: white;
  transform: translate(-50%, -50%) rotate(-45deg);
}

.close-btn .close {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: #111;
  color: #7dd3fc;
  padding: 4px 8px;
  font-size: 11px;
  border-radius: 4px;
  opacity: 0;
  pointer-events: none;
}

.close-btn .close {
  display: none;
}
  @media (max-width: 480px) {
  .chat-button {
    width: 70px;
    height: 70px;
  }

  .chat-circle {
    width: 36px;
    height: 36px;
  }

  .chat-logo {
    width: 22px;
  }

  .chat-text span {
    font-size: 8px;
  }
}
  @media (max-width: 480px) {
  .chat-box {
    width: 92%;
    height: 70%;
    right: 4%;
    bottom: 10px;
    border-radius: 14px;
      z-index: 20;


  }
}
  @media (max-width: 480px) {
  .bubble {
    font-size: 13px;
    padding: 8px;
    line-height: 1.4;
  }

  .question {
    font-size: 13px;
  }
}
  @media (max-width: 480px) {
  .chip {
    font-size: 12px;
    padding: 6px 8px;
  }
}
  @media (min-width: 1440px) {
  .chat-button,
  .chat-box {
    right: 35px !important;
  }
}
  @media (min-width: 1600px) {
  .chat-button,
  .chat-box {
    right: 40px !important;
  }
}
  
      `}</style>
    </>
  );
}