import React from "react";
import { Helmet } from "react-helmet-async";
import { cld, IMG } from "../utils/cloudinary";

const DEFAULT_IMAGE = "https://artopia.ge/social-preview.png";
const SITE_NAME = "Artopia";
const SITE_URL = "https://artopia.ge";
const DEFAULT_LOCALE = "ka_GE";

const clean = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const SEO = ({
  title,
  description,
  url,
  image = DEFAULT_IMAGE,
  type = "website",
  noIndex = false,
}) => {
  const cleanTitle = clean(title);
  const cleanDescription = clean(description);
  const cleanUrl = clean(url);
  // og:image-ს სოციალური ქსელების და საძიებოების crawler-ები იწევენ, ხშირად
  // განმეორებით. ორიგინალის ნაცვლად 1200px-იან ვერსიას ვაწვდით — crawler-ები,
  // რომლებიც AVIF/WebP-ს არ უჭერენ მხარს, `f_auto`-ს წყალობით ისევ თავიანთ
  // ფორმატს იღებენ, უბრალოდ გაცილებით მსუბუქს.
  const cleanImage = cld(clean(image), { w: IMG.DETAIL });

  const fullTitle = cleanTitle
    ? cleanTitle.includes(SITE_NAME)
      ? cleanTitle
      : `${cleanTitle} | ${SITE_NAME}`
    : SITE_NAME;

  return (
    <Helmet prioritizeSeoTags>
      <html lang="ka" />

      <title>{fullTitle}</title>

      {cleanDescription && (
        <meta name="description" content={cleanDescription} />
      )}

      {cleanUrl && <link rel="canonical" href={cleanUrl} />}

      <meta name="robots" content={noIndex ? "noindex,nofollow" : "index,follow"} />

      <meta property="og:locale" content={DEFAULT_LOCALE} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />

      {cleanUrl && <meta property="og:url" content={cleanUrl} />}
      {cleanDescription && (
        <meta property="og:description" content={cleanDescription} />
      )}
      {cleanImage && <meta property="og:image" content={cleanImage} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />

      {cleanDescription && (
        <meta name="twitter:description" content={cleanDescription} />
      )}
      {cleanImage && <meta name="twitter:image" content={cleanImage} />}

      <meta name="theme-color" content="#ffffff" />

      <link rel="alternate" hrefLang="ka-GE" href={cleanUrl || SITE_URL} />
      <link rel="alternate" hrefLang="x-default" href={cleanUrl || SITE_URL} />
    </Helmet>
  );
};

export default SEO;