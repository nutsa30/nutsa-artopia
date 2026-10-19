// Backend-ის მისამართი. Netlify-ის VITE_API_BASE ცვლადში შეიძლება იყოს ზედმეტი
// სიმბოლო (მაგ. „✅ https://…" — ასე მოხდა 2026-10-19-ს და ჰოუმის ყველა მოთხოვნა
// artopia.ge/✅… მისამართზე წავიდა). ამიტომ მნიშვნელობიდან მხოლოდ პირველ ნამდვილ
// http(s) მისამართს ვიღებთ; თუ ასეთი არ არის — ნაგულისხმევ Heroku მისამართს.
export const DEFAULT_API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

export function cleanApiBase(value, fallback = DEFAULT_API_BASE) {
  const match = String(value ?? "").match(/https?:\/\/[^\s"'<>]+/i);
  return (match ? match[0] : fallback).replace(/\/+$/, "");
}

export const API_BASE = cleanApiBase(import.meta.env.VITE_API_BASE);

// საჯარო, მხოლოდ წასაკითხი GET-ები (კატალოგი, პროდუქტი, ბლოგი, ჰოუმი) production-ში
// იმავე დომენიდან მიდის: /api/* → Heroku (public/_redirects). ბრაუზერს აშშ-ის
// სერვერთან ცალკე კავშირი აღარ სჭირდება და პასუხს Netlify-ის CDN ინახავს.
// კალათა, checkout, გადახდა და ყველა POST პირდაპირ API_BASE-ზე რჩება (ცოცხალი მარაგი).
export const PUBLIC_API = import.meta.env.PROD ? "/api" : API_BASE;
