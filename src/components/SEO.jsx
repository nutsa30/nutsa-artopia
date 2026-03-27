import React from "react";
import { Helmet } from "react-helmet-async";

const SEO = ({
  title,
  description,
  url,
  image = "https://artopia.ge/social-preview.png",
  type = "website",
}) => {
  const siteName = "Artopia";
  const fullTitle = title ? `${title} | ${siteName}` : siteName;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}

      {url && <link rel="canonical" href={url} />}

      <meta property="og:type" content={type} />
      {url && <meta property="og:url" content={url} />}
      <meta property="og:title" content={fullTitle} />
      {description && (
        <meta property="og:description" content={description} />
      )}
      {image && <meta property="og:image" content={image} />}
      <meta property="og:site_name" content={siteName} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && (
        <meta name="twitter:description" content={description} />
      )}
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  );
};

export default SEO;
