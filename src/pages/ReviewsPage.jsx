import { useEffect, useMemo, useState } from "react";
import styles from "./ReviewsPage.module.css";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

/*
  მერე აქ ჩასვი შენი ნამდვილი Google review link
  მაგალითად:
  https://search.google.com/local/writereview?placeid=YOUR_REAL_PLACE_ID
*/
const GOOGLE_REVIEW_URL = "https://search.google.com/local/writereview?placeid=ChIJIZJRgK9zREARDgmuTzhwb9o";

function Stars({ value = 0 }) {
  const full = Math.round(Number(value) || 0);

  return (
    <div className={styles.stars} aria-label={`რეიტინგი ${value} 5-დან`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`${styles.star} ${n <= full ? styles.starActive : ""}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function ReviewCard({ review }) {
  const fallbackInitial = review?.author?.trim()?.charAt(0)?.toUpperCase() || "A";

  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.avatarWrap}>
  <img
  src={
    review?.profile_photo ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      review?.author || "User"
    )}&background=0D1B2A&color=fff`
  }
  alt={review?.author || "მომხმარებელი"}
  className={styles.avatar}
  loading="lazy"
  onError={(e) => {
    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      review?.author || "User"
    )}&background=0D1B2A&color=fff`;
  }}
/>
        </div>

        <div className={styles.cardMeta}>
          <h3 className={styles.author}>{review.author || "მომხმარებელი"}</h3>
          <div className={styles.metaRow}>
            <Stars value={review.rating} />
            <span className={styles.time}>{review.time || ""}</span>
          </div>
        </div>
      </div>

      <p className={styles.reviewText}>{review.text || "შეფასების ტექსტი მიუწვდომელია."}</p>
    </article>
  );
}

export default function ReviewsPage() {

  const [data, setData] = useState({
    rating: 0,
    total_reviews: 0,
    reviews: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "მომხმარებელთა შეფასებები | Artopia";

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "ნახეთ Artopia-ს მომხმარებელთა რეალური შეფასებები Google-იდან და დატოვეთ თქვენი შეფასებაც."
      );
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    const fetchReviews = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE}/google-reviews`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.google_error || json?.error || "შეფასებები ვერ ჩაიტვირთა");
        }

        if (!ignore) {
          setData({
            rating: Number(json?.rating || 0),
            total_reviews: Number(json?.total_reviews || 0),
            reviews: Array.isArray(json?.reviews) ? json.reviews : [],
          });
        }
      } catch (err) {
        if (!ignore) {
          setError("შეფასებები დროებით ვერ ჩაიტვირთა. სცადეთ მოგვიანებით.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchReviews();

    return () => {
      ignore = true;
    };
  }, []);

  const sortedReviews = useMemo(() => {
    return [...data.reviews].sort((a, b) => {
      const da = new Date(a?.original_time || 0).getTime();
      const db = new Date(b?.original_time || 0).getTime();
      return db - da;
    });
  }, [data.reviews]);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>Google შეფასებები</span>
          <h1 className={styles.title}>მომხმარებელთა შეფასებები</h1>
          <p className={styles.subtitle}>
            ნახე რას წერენ ჩვენზე მომხმარებლები Google-ზე და გაეცანი მათ გამოცდილებას.
          </p>

          <div className={styles.heroActions}>
           
          </div>
        </div>
      </section>

      <section className={styles.summarySection}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLeft}>
            <span className={styles.summaryLabel}>საერთო რეიტინგი</span>
            <div className={styles.ratingRow}>
              <strong className={styles.ratingValue}>
                {loading ? "..." : (data.rating || 0).toFixed(1)}
              </strong>
              <Stars value={data.rating} />
            </div>
            <p className={styles.summaryText}>
              {loading
                ? "იტვირთება..."
                : `${data.total_reviews || 0} შეფასება Google-ზე`}
            </p>
          </div>

          <div className={styles.summaryRight}>
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.reviewLinkBtn}
            >
              დაგვიტოვე შეფასება Google-ზე
            </a>
          </div>
        </div>
      </section>

      <section id="reviews-list" className={styles.listSection}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>ბოლო შეფასებები</h2>
          {!loading && !error && (
            <span className={styles.badge}>
              {sortedReviews.length} ნაჩვენები შეფასება
            </span>
          )}
        </div>

        {loading && (
          <div className={styles.stateBox}>შეფასებები იტვირთება...</div>
        )}

        {!loading && error && (
          <div className={styles.stateBoxError}>{error}</div>
        )}

        {!loading && !error && sortedReviews.length > 0 && (
          <div className={styles.grid}>
            {sortedReviews.map((review, index) => (
              <ReviewCard key={`${review.author}-${review.original_time || index}`} review={review} />
            ))}
          </div>
        )}

        {!loading && !error && sortedReviews.length === 0 && (
          <div className={styles.stateBox}>შეფასებები ჯერ არ მოიძებნა.</div>
        )}
      </section>
    </main>
  );
}