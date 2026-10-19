import React from "react";
import styles from "./ProductFilter.module.css";

const LABELS = {
  search: "საძიებო სიტყვა...",
};

export default function ProductFilter({
  searchTerm,
  onSearchChange,
}) {
  return (
    <div className={styles.filterContainer}>
      <input
        type="text"
        className={`${styles.searchInput} ${styles.searchField}`}
        placeholder={LABELS.search}
        aria-label="პროდუქტების ძიება"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
}
