import React from "react";
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
import SEO from "../components/SEO";
import { useStorefrontData } from "../context/StorefrontDataContext";

// პატარა ჰელპერი რომ https:// ავტომატურად მიეცეს
const toUrl = (val, fallback) => {
  const v = (val || "").trim();
  if (!v) return fallback;
  return v.startsWith("http://") || v.startsWith("https://")
    ? v
    : `https://${v}`;
};

const T = {
  title: "საკონტაქტო ინფორმაცია",
  phone: "ტელეფონი",
  email: "ელ. ფოსტა",
  hours: "სამუშაო საათები",
  empty: "📭 კონტაქტები ჯერ არ არის დამატებული",
  address: "მისამართი",
};

const ContactsPage = () => {
  const { data } = useStorefrontData();
  const contacts = Array.isArray(data.contacts) ? data.contacts : [];

return (
  <>
    <SEO
      title="კონტაქტი | Artopia"
      description="დაგვიკავშირდი Artopia-ს. ნახე ჩვენი მისამართი, ტელეფონი, ელფოსტა და სოციალური ქსელები."
      url="https://artopia.ge/contacts"
    />
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Store",
      name: "Artopia",
      url: "https://artopia.ge",
      telephone: contacts?.[0]?.phone || "",
      email: contacts?.[0]?.email || "",
      address: {
        "@type": "PostalAddress",
        streetAddress: contacts?.[0]?.address || "",
        addressLocality: "Tbilisi",
        addressCountry: "GE",
      },
    }),
  }}
/>

    <div className={styles.contactContainer}>
      {/* TikTok Gradient */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="tiktokGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f2ea" />
            <stop offset="100%" stopColor="#ff0050" />
          </linearGradient>
        </defs>
      </svg>

<h1>{T.title}</h1>

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

            const address = c.address;
            const workingHours = c.working_hours ?? c.workingHours;

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
                  <a href={ig} target="_blank" rel="noopener noreferrer">
                    <FaInstagram className={styles.instagram} />
                  </a>

                  <a href={fb} target="_blank" rel="noopener noreferrer">
                    <FaFacebook className={styles.facebook} />
                  </a>

                  <a
                    href={tt}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.tiktokLink}
                  >
                    <span className={styles.tiktokWrap}>
                      <FaTiktok className={styles.tiktokBase} />
                      <FaTiktok className={styles.tiktokCyan} />
                      <FaTiktok className={styles.tiktokPink} />
                    </span>
                  </a>

                  <a href={yt} target="_blank" rel="noopener noreferrer">
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
    </>
  );
};

export default ContactsPage;
