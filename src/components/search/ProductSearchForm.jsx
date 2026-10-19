import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import styles from "./ProductSearchForm.module.css";

// ყველა კატეგორიაში ძიება → /products?search=<სიტყვა>. ერთი და იგივე ფორმა ჰოუმზე
// (carousel-ზე გადაფარებით: overlapHero) და კატალოგის მთავარ გვერდზე.
export default function ProductSearchForm({ overlapHero = false }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const submit = (event) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    navigate(`/products?search=${encodeURIComponent(value)}`);
  };

  return (
    <form className={`${styles.productSearch} ${overlapHero ? styles.overlapHero : ""}`} onSubmit={submit}
      role="search" aria-label="პროდუქტების ძიება">
      <div className={styles.searchCopy}>
        <span>იპოვე სწრაფად</span>
        <strong>რას ეძებ?</strong>
      </div>
      <div className={styles.searchControl}>
        <Search size={21} aria-hidden="true" />
        <input type="search" value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="მოძებნე პროდუქტი..." aria-label="პროდუქტის დასახელება" />
        <button type="submit" disabled={!query.trim()}>ძებნა</button>
      </div>
    </form>
  );
}
