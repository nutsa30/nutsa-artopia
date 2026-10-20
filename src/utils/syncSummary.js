const OUTCOMES = { success: "წარმატებული", success_with_info: "წარმატებული — ინფორმაციული გამოტოვებებით",
  warning: "დასრულებული — საჭიროებს გადამოწმებას", failed: "შეცდომა", blocked: "უსაფრთხოდ შეჩერებული", busy: "უკვე მიმდინარეობს" };
export function syncSummary(report) {
  return `${OUTCOMES[report.outcome] || report.status || "წინა ანგარიში"}\n` +
    `მიღებული: ${report.fetched ?? "—"}; შედარებული: ${report.compared ?? report.total ?? "—"}; ` +
    `შეცვლილი: ${report.business_changed ?? report.updated ?? 0}; დამატებული: ${report.inserted ?? report.added ?? 0}\n` +
    `მოსალოდნელი გამოტოვება (ახალი არააქტიური): ${report.expected_deferred ?? "—"}; ` +
    `გადასამოწმებელი: ${(report.unverified ?? 0) + (report.actionable_deferred ?? 0)}; ` +
    `შეცდომები: ${report.failed ?? 0}; ზედიზედ წარუმატებელი: ${report.consecutive_failures ?? 0}\n` +
    `დრო: ${report.duration_ms == null ? "—" : (report.duration_ms / 1000).toFixed(2)} წმ; გამეორებული მოთხოვნა: ${report.fetch_retries ?? 0}` +
    (report.error_code ? `\nმიზეზი: ${report.error_code}` : "") +
    (report.anomalies?.length ? `\nანომალიები: ${report.anomalies.map(item => item.code).join(", ")}` : "");
}
