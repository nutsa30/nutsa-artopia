// src/components/Footer/Footer.jsx
import React, { useEffect, useState } from "react";
import styles from "./Footer.module.css";
import logo from "../../assets/Logo.png";
import { FaInstagram, FaFacebook, FaTiktok, FaYoutube, FaEnvelope } from "react-icons/fa";
import { useLang } from "../../LanguageContext";

const BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/contacts";

/* ---------- ლეიბლები ორ ენაზე ---------- */
const FOOTER_LABELS = {
  ka: {
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
  },
  en: {
    brand: "ARTOPIA",
    email: "Email:",
    about: "About Us",
    company: "Company",
    vacancy: "Vacancies",
    branches: "Branches",
    help: "Help",
    subscription: "Purchasing Guide",
    user: "User",
    register: "Register",
    cart: "Cart",
    copyright: "2024 © ARTOPIA",
    noEmail: "No email available",
  },
};

const Footer = () => {
  const [contacts, setContacts] = useState([]);
  const [error, setError] = useState("");
  const { lang } = useLang();
  const L = FOOTER_LABELS[lang] || FOOTER_LABELS.ka;

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

  // OPTIONAL: თუ backend-ში გაქვს YouTube ბმული, აქ ჩასვი contacts[0]?.youtube || defaultLink
  const youtubeLink = "https://www.youtube.com/"; // შეცვალე შენს რეალურ channel URL-ზე

  return (
    <div className={styles.pageWrapper}>
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.companyInfo}>
            <img src={logo} alt="Company Logo" className={styles.logo} />
            <p className={styles.companyName}>{L.brand}</p>

<p className={styles.contact}>
  <FaEnvelope className={styles.mail} />

  {contacts.length > 0 && contacts[0]?.email ? (() => {
    const email = String(contacts[0].email).trim();
    const mailto = `mailto:${encodeURIComponent(email)}`; // უსაფრთხოება

    return (
      <a
        href={mailto}
        className={styles.contactLink}
        // რომ მშობლის onClick/overlay არ დაბლოკოს:
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        // სუფთა fallback — თუ მაინც არ გადავიდა, ძალით გადავიყვანოთ:
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
                 aria-label="Instagram">
                                 
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
                href= "https://www.tiktok.com/@artopia_tbilisi"
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
            {/* <div className={styles.section}>
              <h4>{L.about}</h4>
              <ul>
                <li>{L.company}</li>
                <li>{L.vacancy}</li>
                <li>{L.branches}</li>
              </ul>
            </div> */}

            {/* <div className={styles.section}>
              <h4>{L.help}</h4>
              <ul>
                <li>{L.subscription}</li>
              </ul>
            </div> */}

            {/* <div className={styles.section}>
              <h4>{L.user}</h4>
              <ul>
                <li>{L.register}</li>
                <li>{L.cart}</li>
              </ul>
            </div> */}
          </div>
        </div>


{/* 
<button style={{background:"white",color:"black", width:50,height:50,}} onClick={() => (window.location.href = "/admin")}>
  გახსნა ადმინი
</button> */}


        <div className={styles.footerBottom}>
          <p>{L.copyright}</p>
        </div>
      </footer>
    </div>
  );
};

export default Footer;
