import React from "react";
import { Helmet } from "react-helmet-async";
import { shareImage, SHARE_DEFAULT_IMAGE, SHARE_WIDTH, SHARE_HEIGHT } from "../utils/cloudinary";
import { canonicalUrl } from "../utils/canonical";

const DEFAULT_IMAGE = SHARE_DEFAULT_IMAGE;
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
  imageFit = "fill",
  type = "website",
  noIndex = false,
  noIndexFollow = false,
}) => {
  const cleanTitle = clean(title);
  const cleanDescription = clean(description);
  // არარსებული/noindex გვერდი canonical-ს და og:url-ს არ აცხადებს
  const cleanUrl = noIndex ? "" : canonicalUrl(clean(url) || "/");
  // og:image: ზუსტად 1200×630 JPEG (Facebook-ის crawler-ს დიდი ორიგინალი PNG არ უნდა მივცეთ)
  const cleanImage = shareImage(clean(image) || DEFAULT_IMAGE, imageFit);

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

      <meta name="robots" content={noIndex ? (noIndexFollow ? "noindex,follow" : "noindex,nofollow") : "index,follow"} />

      <meta property="og:locale" content={DEFAULT_LOCALE} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />

      {cleanUrl && <meta property="og:url" content={cleanUrl} />}
      {cleanDescription && (
        <meta property="og:description" content={cleanDescription} />
      )}
      {cleanImage && <meta property="og:image" content={cleanImage} />}
      {cleanImage && <meta property="og:image:width" content={String(SHARE_WIDTH)} />}
      {cleanImage && <meta property="og:image:height" content={String(SHARE_HEIGHT)} />}
      {cleanImage && <meta property="og:image:type" content="image/jpeg" />}
      {cleanImage && <meta property="og:image:alt" content={fullTitle} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />

      {cleanDescription && (
        <meta name="twitter:description" content={cleanDescription} />
      )}
      {cleanImage && <meta name="twitter:image" content={cleanImage} />}

      <meta name="theme-color" content="#ffffff" />

      {cleanUrl && <link rel="alternate" hrefLang="ka-GE" href={cleanUrl} />}
      {cleanUrl && <link rel="alternate" hrefLang="x-default" href={cleanUrl} />}
    </Helmet>
  );
};

export default SEO;
