// ბლოგის თარიღი და კითხვის დრო (v2 სტატია, სია, კატეგორიის გვერდი, ადმინი)
const MONTHS = ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"];

export function kaDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

export function readingMinutes(words) {
  return Math.max(1, Math.round((words || 0) / 200));
}
