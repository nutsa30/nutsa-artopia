import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import styles from "./ArticleV2.module.css";
import { cld, cldSrcSet } from "../../utils/cloudinary";
import { sanitizeBlogHtml } from "../../utils/blogHtml";
import { PUBLIC_API } from "../../utils/apiBase";
import { kaDate, readingMinutes } from "./format";

// რედაქციის (v2) სტატია: დამტკიცებული მაკეტი artopia-editorial/docs/mockups/article-v2.html.
// ფოტოების განლაგებას რედაქციის კოდი წყვეტს (settle_figures): აქ მხოლოდ ვაჩვენებთ.
// იგივე კომპონენტი ადმინის გადახედვაშია (preview), ამიტომ მონაცემს მხოლოდ props-იდან იღებს.

const FIG_WIDTH = { wide: 1600, col: 1000, center: 1000, side: 700, pair: 700 };
const FIG_SIZES = {
  wide: "(max-width: 1080px) 100vw, 1040px",
  col: "(max-width: 712px) calc(100vw - 32px), 680px",
  center: "(max-width: 712px) calc(100vw - 32px), 680px",
  side: "(max-width: 640px) calc(100vw - 32px), 320px",
  pair: "(max-width: 640px) calc(100vw - 32px), 340px",
};
const FIG_CLASS = { col: styles.figCol, side: styles.figSide, pair: styles.figPair, wide: styles.figWide, center: styles.figCenter };

const html = (value) => ({ __html: sanitizeBlogHtml(value || "") });

function Img({ image, layout, eager = false }) {
  const w = FIG_WIDTH[layout] || 1000;
  const srcSet = cldSrcSet(image.url, [Math.round(w / 2), w, Math.min(w * 2, 2000)].filter((x, i, a) => a.indexOf(x) === i));
  return (
    <img
      src={cld(image.url, { w })}
      srcSet={srcSet}
      sizes={srcSet ? FIG_SIZES[layout] : undefined}
      alt={image.alt || ""}
      width={image.width || undefined}
      height={image.height || undefined}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      // პროპორცია: „center"/„side" ფოტოს ადგილი ჩატვირთვამდე ცნობილია (ტექსტი არ ხტება, CLS)
      style={image.width && image.height ? { "--r": image.width / image.height } : undefined}
      {...(eager ? { fetchpriority: "high" } : {})}
    />
  );
}

function Figure({ block }) {
  return (
    <figure className={FIG_CLASS[block.layout] || styles.figCenter}>
      {block.images.map((im, i) => <Img key={i} image={im} layout={block.layout} />)}
      {block.caption && <figcaption>{block.caption}</figcaption>}
    </figure>
  );
}

function Blocks({ blocks }) {
  // „wide" ფოტო სვეტიდან გამოდის: სტატია ნაწილებად იყოფა, ფოტო მათ შორის სრული სიგანით დგას
  const parts = [[]];
  blocks.forEach((b) => {
    if (b.t === "figure" && b.layout === "wide") parts.push(b, []);
    else parts[parts.length - 1].push(b);
  });
  let firstP = true;
  const render = (b, i) => {
    switch (b.t) {
      case "p": {
        const first = firstP;
        firstP = false;
        return <p key={i} className={first ? styles.first : undefined} dangerouslySetInnerHTML={html(b.html)} />;
      }
      case "h2":
        return <React.Fragment key={i}><div className={styles.clear} /><h2>{b.text}</h2></React.Fragment>;
      case "h3":
        return <React.Fragment key={i}><div className={styles.clear} /><h3>{b.text}</h3></React.Fragment>;
      case "figure":
        return <Figure key={i} block={b} />;
      case "list": {
        const Tag = b.ordered ? "ol" : "ul";
        return <Tag key={i}>{b.items.map((x, j) => <li key={j} dangerouslySetInnerHTML={html(x)} />)}</Tag>;
      }
      case "table":
        return (
          <div key={i} className={styles.tbl}>
            <table>
              <thead><tr>{b.head.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
              <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        );
      case "callout":
        return (
          <div key={i} className={`${styles.callout} ${b.kind === "warn" ? styles.warn : ""}`}>
            <b>{b.kind === "warn" ? "ყურადღება." : "რჩევა."}</b> <span dangerouslySetInnerHTML={html(b.html)} />
          </div>
        );
      case "quote":
        return <blockquote key={i}>„{b.text}“</blockquote>;
      case "faq":
        return (
          <div key={i} className={styles.faq}>
            {b.items.map((x, j) => (
              <details key={j}><summary>{x.q}</summary><p dangerouslySetInnerHTML={html(x.a)} /></details>
            ))}
          </div>
        );
      default:
        return null;
    }
  };
  return parts.map((part, n) =>
    Array.isArray(part)
      ? part.length > 0 && <div key={n} className={styles.article}>{part.map(render)}<div className={styles.clear} /></div>
      : <Figure key={n} block={part} />,
  );
}

function Shelf({ shelf }) {
  // მცირე თარო სტატიის ბოლოს: მხოლოდ ის პროდუქტი, რომელიც ახლაც არსებობს და მარაგშია
  const [items, setItems] = useState([]);
  useEffect(() => {
    let alive = true;
    Promise.all((shelf.products || []).slice(0, 8).map((slug) =>
      fetch(`${PUBLIC_API}/products/full/${encodeURIComponent(slug)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    )).then((rows) => {
      if (!alive) return;
      setItems(rows.map((r) => r?.product).filter((p) => p && (p.quantity ?? 1) > 0));
    });
    return () => { alive = false; };
  }, [shelf]);
  if (!items.length) return null;
  return (
    <div className={styles.shelf}>
      <p><b>{shelf.label}</b></p>
      <div className={styles.sgrid}>
        {items.map((p) => (
          <a key={p.slug} className={styles.pcard} href={`/products/${p.slug}`}>
            <img src={cld(p.image_url1, { w: 300 })} alt={p.name} width="300" height="300" loading="lazy" />
            <span>{p.name}</span>
            {(p.discounted_price || p.price) && <em>{Number(p.discounted_price || p.price).toFixed(2)} ₾</em>}
          </a>
        ))}
      </div>
    </div>
  );
}

export default function ArticleV2({ blog, related = [], breadcrumbs = null, preview = false }) {
  const doc = blog.doc;
  const words = blog.word_count || 0;
  const date = blog.created_at ? kaDate(blog.created_at) : null;
  return (
    <div className={styles.root}>
      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Georgian:wght@600;700&display=swap" rel="stylesheet" />
      </Helmet>
      <div className={styles.narrow}>
        {breadcrumbs}
        {blog.category && (
          preview
            ? <span className={styles.kicker}>{blog.category_name}</span>
            : <Link className={styles.kicker} to={`/blogs/category/${blog.category}`}>{blog.category_name}</Link>
        )}
        <h1 className={styles.h1}>{blog.title}</h1>
        <p className={styles.lead}>{doc.lead}</p>
        <div className={styles.meta}>
          <b>Artopia-ს რედაქცია</b>
          {date && <><span className={styles.dot}>·</span><time dateTime={blog.created_at}>{date}</time></>}
          {words > 0 && <><span className={styles.dot}>·</span><span>{readingMinutes(words)} წთ საკითხავი</span></>}
        </div>
      </div>

      <figure className={styles.cover}>
        <img
          src={cld(doc.cover.url, { w: 1600 })}
          srcSet={cldSrcSet(doc.cover.url, [640, 1040, 1600, 2080])}
          sizes="(max-width: 1080px) 100vw, 1040px"
          alt={doc.cover.alt || blog.title}
          width={doc.cover.width || 1600}
          height={doc.cover.height || 900}
          loading="eager"
          fetchpriority="high"
          decoding="async"
        />
        {doc.cover.caption && <figcaption>{doc.cover.caption}</figcaption>}
      </figure>

      <Blocks blocks={doc.blocks} />

      {doc.shelf && !preview && <Shelf shelf={doc.shelf} />}

      <div className={styles.sign}><span>Artopia-ს რედაქცია</span></div>

      {doc.sources?.length > 0 && (
        <details className={styles.sources}>
          <summary>წყაროები</summary>
          <ul>
            {doc.sources.map((s, i) => (
              <li key={i}><a href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.publisher}</a></li>
            ))}
          </ul>
        </details>
      )}

      {related.length > 0 && (
        <section className={styles.related}>
          <h2>მსგავსი სტატიები</h2>
          <div className={styles.rgrid}>
            {related.slice(0, 3).map((b) => (
              <Link key={b.id} className={styles.rcard} to={`/blog/${b.slug}`}>
                <img src={cld(b.cover_image || "/noimage.jpeg", { w: 640 })} alt="" width="640" height="400" loading="lazy" />
                {b.category_name && <div className={styles.rc}>{b.category_name}</div>}
                <div className={styles.rt}>{b.title}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
