import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { readInitialData } from "../utils/initialData";

const API_BASE = ((import.meta.env.VITE_API_BASE ?? "").trim() ||
  "https://artopia-backend-2024-54872c79acdd.herokuapp.com").replace(/\/+$/, "");

const EMPTY = {
  contacts: [], categories: [], home_images: [], sale_products: [], new_products: [], blogs: [],
};
const requestCache = new Map();

const json = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

async function legacyBootstrap(includeHome) {
  const requests = [json(`${API_BASE}/contacts`), json(`${API_BASE}/products/categories`)];
  if (includeHome) {
    requests.push(
      json(`${API_BASE}/home-images/public`), json(`${API_BASE}/products/sale`),
      json(`${API_BASE}/products/new`), json(`${API_BASE}/blogs`),
    );
  }
  const [contacts, categories, homeImages = [], sale = [], newest = [], blogs = []] = await Promise.all(requests);
  return { contacts, categories, home_images: homeImages, sale_products: sale, new_products: newest, blogs };
}

function loadBootstrap(includeHome) {
  const key = includeHome ? "home" : "chrome";
  if (!requestCache.has(key)) {
    const suffix = includeHome ? "?home=1" : "";
    const request = json(`${API_BASE}/storefront/bootstrap${suffix}`)
      .catch(() => legacyBootstrap(includeHome))
      .then((data) => ({ ...EMPTY, ...(data && typeof data === "object" && !Array.isArray(data) ? data : {}) }))
      .catch((error) => {
        requestCache.delete(key);
        throw error;
      });
    requestCache.set(key, request);
  }
  return requestCache.get(key);
}

const StorefrontDataContext = createContext({ data: EMPTY, loading: true, error: "" });

export function StorefrontDataProvider({ children }) {
  const { pathname } = useLocation();
  const includeHome = pathname === "/";
  const isAdmin = pathname.startsWith("/admin");
  const initial = includeHome ? readInitialData("storefront", pathname) : null;
  const [state, setState] = useState(() => ({
    data: initial ? { ...EMPTY, ...initial } : EMPTY,
    loading: !isAdmin && (!initial || initial.__partial === true),
    error: "",
  }));

  useEffect(() => {
    if (isAdmin) {
      setState({ data: EMPTY, loading: false, error: "" });
      return;
    }
    const embedded = includeHome ? readInitialData("storefront", pathname) : null;
    if (embedded && embedded.__partial !== true) {
      setState({ data: { ...EMPTY, ...embedded }, loading: false, error: "" });
      return;
    }
    let alive = true;
    setState((current) => ({
      ...current,
      data: embedded ? { ...EMPTY, ...embedded } : current.data,
      loading: true,
      error: "",
    }));
    loadBootstrap(includeHome)
      .then((data) => {
        if (!alive) return;
        setState({ data, loading: false, error: "" });
      })
      .catch(() => {
        if (!alive) return;
        setState({ data: EMPTY, loading: false, error: "მონაცემები ვერ ჩაიტვირთა" });
      });
    return () => { alive = false; };
  }, [includeHome, isAdmin, pathname]);

  const value = useMemo(() => state, [state]);
  return <StorefrontDataContext.Provider value={value}>{children}</StorefrontDataContext.Provider>;
}

export const useStorefrontData = () => useContext(StorefrontDataContext);
