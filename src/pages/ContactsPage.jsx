// src/pages/ContactsPage.jsx
import React, { useEffect, useState } from "react";
import styles from "./ContactsPage.module.css";
import {
  FaInstagram,
  FaFacebook,
  FaTiktok,
  FaYoutube,
  FaEnvelope,
  FaMapMarkerAlt,
  FaClock,
  FaPhoneAlt,
} from "react-icons/fa";
import { useLang } from "../LanguageContext";

const BASE =
  "https://artopia-backend-2024-54872c79acdd.herokuapp.com/contacts";

// პატარა ჰელპერი რომ https:// ავტომატურად მიეცეს
const toUrl = (val, fallback) => {
  const v = (val || "").trim();
  if (!v) return fallback;
  return v.startsWith("http://") || v.startsWith("https://")
    ? v
    : `https://${v}`;
};

const LBL = {
  ka: {
    title: "საკონტაქტო ინფორმაცია",
    phone: "ტელეფონი",
    email: "ელ. ფოსტა",
    hours: "სამუშაო საათები",
    empty: "📭 კონტაქტები ჯერ არ არის დამატებული",
    address: "მისამართი",
  },
  en: {
    title: "Contact Information",
    phone: "Phone",
    email: "Email",
    hours: "Working hours",
    empty: "📭 No contacts yet",
    address: "Address",
  },
};

const ContactsPage = () => {
  const { lang } = useLang();
  const T = LBL[lang] || LBL.ka;

  const [contacts, setContacts] = useState([]);
  const [error, setError] = useState("");

  const pick = (ka, en) =>
    lang === "en" ? en ?? ka ?? "" : ka ?? en ?? "";

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch(`${BASE}?lang=${lang}`);
        if (!res.ok) throw new Error("მონაცემების წაკითხვა ვერ მოხერხდა");
        const data = await res.json();
        setContacts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError("კონტაქტის მონაცემების წამოღება ვერ მოხერხდა.");
      }
    };
    fetchContacts();
  }, [lang]);

  if (error) return <div>{error}</div>;

  return (
    <div className={styles.contactContainer}>
      {/* ▼ TikTok Gradient defs */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient
            id="tiktokGrad"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#00f2ea" />
            <stop offset="100%" stopColor="#ff0050" />
          </linearGradient>
        </defs>
      </svg>
      {/* ▲ */}

      <h2>{T.title}</h2>

      {contacts.length > 0 ? (
        <div className={styles.contactInfo}>
          {contacts.map((c) => {
            const ig = toUrl(
              c.instagram,
              "https://www.instagram.com/artopia_tbilisi/"
            );
            const fb = toUrl(
              c.facebook,
              "https://www.facebook.com/profile.php?id=100093336648910"
            );
            const tt = toUrl(
              c.tiktok,
              "https://www.tiktok.com/@artopia_tbilisi"
            );
            const yt = toUrl(
              c.youtube,
              "https://youtube.com/@artopia_georgia?si=Yip4PF9jpE1o9S2g"
            );

            const address = pick(c.address, c.address_en);
            const workingHours = pick(
              c.working_hours ?? c.workingHours,
              c.working_hours_en ?? c.workingHoursEn
            );

            return (
              <div key={c.id} className={styles.contactCard}>
                <p>
                  <strong>
                    <FaMapMarkerAlt className={styles.pin} /> {T.address}
                  </strong>{" "}
                  {address || "—"}
                </p>
                <p>
                  <strong>
                    <FaPhoneAlt /> {T.phone}
                  </strong>{" "}
                  {c.phone || "—"}
                </p>
                <p>
                  <strong>
                    <FaEnvelope className={styles.mail} /> {T.email}
                  </strong>{" "}
                  {c.email || "—"}
                </p>
                <p>
                  <strong>
                    <FaClock /> {T.hours}
                  </strong>{" "}
                  {workingHours || "—"}
                </p>

                <div className={styles.socialRow}>
                  <a
                    href={ig}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                  >
                    <FaInstagram className={styles.instagram} />
                  </a>
                  <a
                    href={fb}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                  >
                    <FaFacebook className={styles.facebook} />
                  </a>

                  <a
                    href={tt}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className={styles.tiktokLink}
                  >
                    <span
                      className={styles.tiktokWrap}
                      aria-hidden="true"
                    >
                      <FaTiktok className={styles.tiktokBase} />
                      <FaTiktok className={styles.tiktokCyan} />
                      <FaTiktok className={styles.tiktokPink} />
                    </span>
                  </a>

                  <a
                    href={yt}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                  >
                    <FaYoutube className={styles.youtube} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p>{T.empty}</p>
      )}
    </div>
  );
};

export default ContactsPage;
