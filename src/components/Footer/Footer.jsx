import React from "react";
import { Link } from "react-router-dom";
import { catalogPath } from "../../utils/canonical";
import styles from "./Footer.module.css";
import { FaInstagram, FaFacebook, FaTiktok, FaYoutube, FaEnvelope } from "react-icons/fa";
import { useStorefrontData } from "../../context/StorefrontDataContext";

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
const LogoImg = "/Logo.webp";
const Footer = () => {
  const { data } = useStorefrontData();
  const contacts = Array.isArray(data.contacts) ? data.contacts : [];
  const categories = [...new Set((Array.isArray(data.categories) ? data.categories : [])
    .map((category) => String(category).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ka"));

  return (
    <div className={styles.pageWrapper}>
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.companyInfo}>
<img src={LogoImg} alt="Artopia" className={styles.logo} width="50" height="50" loading="lazy" decoding="async" />
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

          {categories.length > 0 && (
            <details className={styles.categoryNav}>
              <summary>პროდუქციის კატეგორიები</summary>
              <nav aria-label="კატეგორიები" className={styles.categoryLinks}>
                {categories.map((name) => (
                  <Link key={name} to={catalogPath({ category: name })}>
                    {name}
                  </Link>
                ))}
              </nav>
            </details>
          )}

          <div className={styles.footerLinks}>
  <div className={styles.policyLinks}>
    <a href="/engraving" className={styles.policyBtn}>გრავირება</a>
    <a href="/terms" className={styles.policyBtn}>წესები და პირობები</a>
    <a href="/returns" className={styles.policyBtn}>დაბრუნების პოლიტიკა</a>
    <a href="/privacy" className={styles.policyBtn}>კონფიდენციალურობა</a>
  </div>
</div>
        </div>

        <div className={styles.footerBottom}>
          <p>{L.copyright}</p>
          <a
            href="https://www.kemsilab.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="KemsiLab"
            className={styles.kemsiLabLink}
          >
            <span className={styles.madeBy}>Made by</span>
            <img
              src="/kemsilab-fordark.webp"
              alt="KemsiLab"
              className={styles.kemsilabLogo}
              width="90"
              height="60"
              loading="lazy"
              decoding="async"
            />
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Footer;
