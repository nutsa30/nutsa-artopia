import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadCategoryGuide } from "../../content/categoryGuides";
import { parseGuideText, plainGuideText } from "../../utils/guideText";
import { catalogPath } from "../../utils/canonical";
import styles from "./CategoryGuide.module.css";

// კატეგორიის გვერდის ქვედა ტექსტი: გზამკვლევი და ხშირი კითხვები (FAQPage).
// ტექსტი ცალკე chunk-ად იტვირთება და პროდუქტების ქვემოთ ჩნდება, ამიტომ არც
// მთავარ bundle-ს ამძიმებს და არც ეკრანზე ხილულ ნაწილს აძრავს.
export default function CategoryGuide({ kind, id, catalog }) {
  const [state, setState] = useState({ key: null, guide: null });
  const key = `${kind}:${id}`;

  useEffect(() => {
    let alive = true;
    loadCategoryGuide(kind, id)
      .then((guide) => { if (alive) setState({ key, guide }); })
      .catch(() => { if (alive) setState({ key, guide: null }); });
    return () => { alive = false; };
  }, [kind, id, key]);

  const guide = state.key === key ? state.guide : null;
  if (!guide) return null;

  // id → მიმდინარე slug (slug სახელთან ერთად იცვლება, id — არა)
  const subSlugs = new Map();
  const mainSlugs = new Map();
  for (const main of catalog?.main_categories || []) {
    mainSlugs.set(Number(main.id), main.slug);
    for (const sub of main.subcategories || []) subSlugs.set(Number(sub.id), sub.slug);
  }
  const hrefFor = (target) => {
    if (target.kind === "path") return target.path;
    if (target.kind === "main") {
      const slug = mainSlugs.get(target.id);
      return slug ? catalogPath({ mainCategory: slug }) : null;
    }
    const slug = subSlugs.get(target.id);
    return slug ? catalogPath({ category: slug }) : null;
  };
  const rich = (text) => parseGuideText(text).map((part, index) => {
    if (part.type === "text") return <Fragment key={index}>{part.value}</Fragment>;
    const href = hrefFor(part.target);
    return href ? <Link key={index} to={href}>{part.text}</Link> : <Fragment key={index}>{part.text}</Fragment>;
  });

  const faq = Array.isArray(guide.faq) ? guide.faq : [];
  const faqSchema = faq.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: plainGuideText(item.q),
      acceptedAnswer: { "@type": "Answer", text: plainGuideText(item.a) },
    })),
  } : null;
  const headingId = `category-guide-${kind}-${id}`;

  return (
    <section className={styles.guide} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>{guide.title}</h2>
      {(guide.sections || []).map((section, index) => (
        <div key={index} className={styles.block}>
          {section.heading && <h3 className={styles.heading}>{section.heading}</h3>}
          {(section.paragraphs || []).map((text, i) => <p key={`p${i}`}>{rich(text)}</p>)}
          {section.items?.length > 0 && (
            <ul className={styles.list}>
              {section.items.map((text, i) => <li key={i}>{rich(text)}</li>)}
            </ul>
          )}
          {(section.notes || []).map((text, i) => <p key={`n${i}`}>{rich(text)}</p>)}
        </div>
      ))}
      {faq.length > 0 && (
        <div className={styles.faq}>
          <h3 className={styles.heading}>ხშირად დასმული კითხვები</h3>
          {faq.map((item, index) => (
            <div key={index} className={styles.faqItem}>
              <h4 className={styles.question}>{item.q}</h4>
              <p>{rich(item.a)}</p>
            </div>
          ))}
        </div>
      )}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }}
        />
      )}
    </section>
  );
}
