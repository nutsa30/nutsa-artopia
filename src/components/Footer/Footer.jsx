import React, { useEffect, useState } from "react";
import styles from "./Footer.module.css";
import { FaInstagram, FaFacebook, FaTiktok, FaYoutube, FaEnvelope } from "react-icons/fa";

const BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/contacts";

/* ---------- ერთენოვანი ლეიბლები ---------- */
const L = {
  brand: "არტოპია",
  email: <FaEnvelope className={styles.mail} />,
  about: "ჩვენ შესახებ",
  company: "კომპანია",
  vacancy: "ვაკანსია",
  branches: "ფილიალები",
  help: "დახმარება",
  subscription: "შეკვეთის განთავსების ინსტრუქცია",
  user: "მომხმარებელი",
  register: "რეგისტრაცია",
  cart: "კალათა",
  copyright: "2024 © არტოპია",
  noEmail: "ელ. ფოსტა არ არის",
};
const LogoImg = "/Logo.png";
const Footer = () => {
  const [contacts, setContacts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch(BASE);
        if (!res.ok) throw new Error("მონაცემების წაკითხვა ვერ მოხერხდა");
        const data = await res.json();
        setContacts(data);
      } catch (err) {
        console.error(err);
        setError("კონტაქტის მონაცემების წამოღება ვერ მოხერხდა.");
      }
    };
    fetchContacts();
  }, []);

  if (error) return <div>{error}</div>;

  return (
    <div className={styles.pageWrapper}>
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.companyInfo}>
<img src={LogoImg} alt="Company Logo" className={styles.logo} />
            <p className={styles.companyName}>{L.brand}</p>

            <p className={styles.contact}>
              <FaEnvelope className={styles.mail} />

              {contacts.length > 0 && contacts[0]?.email ? (() => {
                const email = String(contacts[0].email).trim();
                const mailto = `mailto:${encodeURIComponent(email)}`;

                return (
                  <a
                    href={mailto}
                    className={styles.contactLink}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onAuxClick={(e) => { if (e.button === 1) e.stopPropagation(); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        window.location.href = mailto;
                      }
                    }}
                  >
                    {email}
                  </a>
                );
              })() : (
                <span className={styles.contactLinkDisabled}>{L.noEmail}</span>
              )}
            </p>

            <div className={styles.socialMedia}>
              <a 
                href="https://www.instagram.com/artopia_tbilisi/"
                target="_blank"
                rel="noopener noreferrer" 
                aria-label="Instagram"
              >
                <FaInstagram className={styles.instagram} />
              </a>

              <a
                href="https://www.facebook.com/profile.php?id=100093336648910"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <FaFacebook className={styles.facebook} />
              </a>

              <a
                href="https://www.tiktok.com/@artopia_tbilisi"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className={styles.tiktokLink}
              >
                <span className={styles.tiktokWrap} aria-hidden="true">
                  <FaTiktok className={styles.tiktokBase} />
                  <FaTiktok className={styles.tiktokCyan} />
                  <FaTiktok className={styles.tiktokPink} />
                </span>
              </a>

              <a
                href="https://youtube.com/@artopia_georgia?si=Yip4PF9jpE1o9S2g"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
              >
                <FaYoutube className={styles.youtube} />
              </a>
            </div>
          </div>

          <div className={styles.footerLinks}>
            {/* შენ დატოვე დაკომენტებული სექციები უცვლელად */}
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>{L.copyright}</p>
        </div>
      </footer>
    </div>
  );
};

export default Footer;