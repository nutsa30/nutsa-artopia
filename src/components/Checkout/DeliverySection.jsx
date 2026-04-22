import React, { useEffect, useRef, useState, useCallback } from "react";
import s from "./DeliverySection.module.css";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";
const DEFAULT_CENTER = { lat: 41.6941, lng: 44.8337 };
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

const Spinner = () => <span className={s.spinner} />;

const DeliverySection = ({ delivery, onChange, selectedCourier, onCourierSelect }) => {
  const mapDivRef   = useRef(null);
  const mapRef      = useRef(null);
  const markerRef   = useRef(null);
  const geocoderRef = useRef(null);

  const [mapsReady, setMapsReady]         = useState(false);
  const [inputVal, setInputVal]           = useState(delivery.streetName || "");
  const [suggestions, setSuggestions]     = useState([]);
  const [showSugg, setShowSugg]           = useState(false);
  const [loadingSugg, setLoadingSugg]     = useState(false);
  const [couriers, setCouriers]           = useState([]);
  const [loadingC, setLoadingC]           = useState(false);
  const [courierErr, setCourierErr]       = useState("");

  /* ── 1. Load Maps SDK ── */
  useEffect(() => {
    const ready = () => setMapsReady(true);
    if (window.google?.maps?.Map) { ready(); return; }
    if (document.getElementById("gm-sdk")) {
      const t = setInterval(() => { if (window.google?.maps?.Map) { clearInterval(t); ready(); } }, 100);
      return () => clearInterval(t);
    }
    window.__gmapsReady = ready;
    const sc = document.createElement("script");
    sc.id  = "gm-sdk";
    sc.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places&v=weekly&callback=__gmapsReady`;
    sc.async = true;
    document.head.appendChild(sc);
  }, []);

  /* ── 2. Map + draggable marker ── */
  useEffect(() => {
    if (!mapsReady || !mapDivRef.current || mapRef.current) return;

    const center = delivery.lat ? { lat: delivery.lat, lng: delivery.lng } : DEFAULT_CENTER;

    const map = new window.google.maps.Map(mapDivRef.current, {
      center, zoom: 15,
      mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
    });

    const marker = new window.google.maps.Marker({
      position: center, map, draggable: true,
      animation: window.google.maps.Animation.DROP,
    });

    const geocoder = new window.google.maps.Geocoder();
    geocoderRef.current = geocoder;

    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      const lat = pos.lat(); const lng = pos.lng();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        const addr = status === "OK" && results[0] ? results[0].formatted_address : "";
        setInputVal(addr);
        onChange({ lat, lng, streetName: addr });
      });
    });

    mapRef.current    = map;
    markerRef.current = marker;
    return () => { marker.setMap(null); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady]);

  /* ── 3. Autocomplete suggestions (new Places API) ── */
  useEffect(() => {
    if (!mapsReady || !inputVal.trim()) { setSuggestions([]); return; }

    const t = setTimeout(async () => {
      setLoadingSugg(true);
      try {
        const { AutocompleteSuggestion } = await window.google.maps.importLibrary("places");
        const { suggestions: sugg } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: inputVal,
          includedRegionCodes: ["ge"],
        });
        setSuggestions(sugg || []);
        setShowSugg(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSugg(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [inputVal, mapsReady]);

  /* ── 4. Select suggestion ── */
  const handleSelect = useCallback(async (suggestion) => {
    setShowSugg(false);
    const mainText = suggestion.placePrediction?.mainText?.toString() ?? "";
    const fullText = suggestion.placePrediction?.text?.toString() ?? mainText;
    setInputVal(fullText);
    setSuggestions([]);

    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({ fields: ["formattedAddress", "location"] });

      const lat = place.location.lat();
      const lng = place.location.lng();
      const addr = place.formattedAddress || fullText;

      setInputVal(addr);
      if (mapRef.current) { mapRef.current.panTo({ lat, lng }); mapRef.current.setZoom(16); }
      if (markerRef.current) markerRef.current.setPosition({ lat, lng });
      onChange({ lat, lng, streetName: addr });
    } catch {
      // fetchFields failed — try geocoder fallback
      if (geocoderRef.current) {
        geocoderRef.current.geocode({ address: fullText + ", Georgia" }, (results, status) => {
          if (status === "OK" && results[0]) {
            const loc = results[0].geometry.location;
            const lat = loc.lat(); const lng = loc.lng();
            const addr = results[0].formatted_address;
            setInputVal(addr);
            if (mapRef.current) { mapRef.current.panTo({ lat, lng }); mapRef.current.setZoom(16); }
            if (markerRef.current) markerRef.current.setPosition({ lat, lng });
            onChange({ lat, lng, streetName: addr });
          }
        });
      }
    }
  }, [onChange]);

  /* ── 5. Courier fetch ── */
  useEffect(() => {
    if (!delivery.streetName?.trim() || !delivery.lat) {
      setCouriers([]); setCourierErr(""); return;
    }
    const t = setTimeout(async () => {
      setLoadingC(true); setCourierErr(""); onCourierSelect(null);
      try {
        const p = new URLSearchParams({
          toLat: delivery.lat, toLng: delivery.lng,
          toAddress: delivery.streetName, toCity: delivery.city || "Tbilisi",
        });
        const res = await fetch(`${API_BASE}/quickshipper/fees?${p}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const active = (data.fees || []).filter(c => c.isActive !== false);
        setCouriers(active);
        if (active.length === 0) setCourierErr("ამ მისამართისთვის კურიერი ვერ მოიძებნა");
      } catch {
        setCourierErr("ტარიფების ჩატვირთვა ვერ მოხერხდა — სცადეთ მოგვიანებით");
        setCouriers([]);
      } finally { setLoadingC(false); }
    }, 750);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivery.lat, delivery.lng, delivery.streetName]);

  /* ── RENDER ── */
  return (
    <div className={s.wrap}>

      <div className={s.sectionHead}>
        <svg className={s.headIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#3b82f6"/>
          <circle cx="12" cy="9" r="2.5" fill="#fff"/>
        </svg>
        <span>მიტანის მისამართი</span>
      </div>

      {/* ── Custom autocomplete input ── */}
      <div className={s.searchWrap} onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setShowSugg(false);
      }}>
        <svg className={s.searchIcon} viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          className={s.addrInput}
          type="text"
          placeholder="მოძებნეთ მისამართი…"
          value={inputVal}
          autoComplete="off"
          onChange={(e) => {
            setInputVal(e.target.value);
            if (!e.target.value) onChange({ streetName: "" });
          }}
          onFocus={() => suggestions.length > 0 && setShowSugg(true)}
        />
        {loadingSugg && <span className={s.inputSpinner}><Spinner /></span>}
        {inputVal && (
          <button className={s.clearBtn} tabIndex={-1} onMouseDown={(e) => {
            e.preventDefault();
            setInputVal(""); setSuggestions([]); setShowSugg(false);
            onChange({ streetName: "" });
          }}>✕</button>
        )}

        {/* Suggestions dropdown */}
        {showSugg && suggestions.length > 0 && (
          <ul className={s.suggList}>
            {suggestions.map((sugg, i) => {
              const pred = sugg.placePrediction;
              const main = pred?.mainText?.toString() ?? "";
              const secondary = pred?.secondaryText?.toString() ?? "";
              return (
                <li key={i} className={s.suggItem}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(sugg); }}>
                  <svg className={s.suggIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#3b82f6"/>
                    <circle cx="12" cy="9" r="2.5" fill="#fff"/>
                  </svg>
                  <span>
                    <span className={s.suggMain}>{main}</span>
                    {secondary && <span className={s.suggSec}>, {secondary}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Map ── */}
      <div className={s.mapWrap}>
        {!mapsReady && (
          <div className={s.mapOverlay}><Spinner /><span>რუკა იტვირთება…</span></div>
        )}
        <div ref={mapDivRef} className={s.map} />
        <p className={s.mapHint}>პინი შეგიძლიათ ხელითაც გადაიტანოთ</p>
      </div>

      {/* ── Extra fields ── */}
      <div className={s.extraRow}>
        {[
          { key: "hallway",   label: "სადარბაზო", ph: "მაგ. 2"  },
          { key: "floor",     label: "სართული",   ph: "მაგ. 3"  },
          { key: "apartment", label: "ბინა",       ph: "მაგ. 14" },
        ].map(({ key, label, ph }) => (
          <div key={key} className={s.extraCol}>
            <label className={s.extraLabel}>{label}</label>
            <input type="text" className={s.extraInput} placeholder={ph}
              value={delivery[key]}
              onChange={(e) => onChange({ [key]: e.target.value })} />
          </div>
        ))}
      </div>

      {/* ── Courier section ── */}
      <div className={s.sectionHead} style={{ marginTop: "1.4rem" }}>
        <svg className={s.headIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="7" width="13" height="10" rx="1.5" fill="#3b82f6"/>
          <path d="M14 10h4.5l2.5 3.5V17h-7V10z" fill="#2563eb"/>
          <circle cx="6"  cy="18" r="1.8" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2"/>
          <circle cx="18" cy="18" r="1.8" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2"/>
          <path d="M5 11h5M5 13.5h3" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <span>კურიერის არჩევა</span>
      </div>

      {!delivery.streetName?.trim() ? (
        <p className={s.hint}>შეიყვანეთ მისამართი კურიერების სანახავად</p>
      ) : loadingC ? (
        <div className={s.loadRow}><Spinner /><span>ტარიფები იტვირთება…</span></div>
      ) : courierErr ? (
        <p className={s.errText}>{courierErr}</p>
      ) : (
        <div className={s.courierList}>
          {couriers.map((c) => {
            const price = c.prices?.[0];
            const isSelected = selectedCourier?.providerId === c.providerId;
            return (
              <div key={c.providerId}
                className={`${s.courierCard} ${isSelected ? s.cardSelected : ""}`}
                role="button" tabIndex={0} aria-pressed={isSelected}
                onClick={() => onCourierSelect({
                  providerId: c.providerId, priceId: price?.id ?? null,
                  amount: c.minPrice ?? 0, currency: price?.currency ?? "₾",
                  speedName: price?.deliverySpeedName ?? "",
                  providerName: c.providerName, logoUrl: c.providerLogoUrl,
                })}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.click()}>
                <div className={s.logoBox}>
                  <img src={c.providerLogoUrl} alt={c.providerName} className={s.logo}
                    onError={(e) => { e.target.style.display = "none"; }} />
                </div>
                <div className={s.cInfo}>
                  <span className={s.cName}>{c.providerName}</span>
                  {price?.deliverySpeedName && <span className={s.cSpeed}>{price.deliverySpeedName}</span>}
                </div>
                <div className={s.cRight}>
                  <span className={s.cPrice}>{c.minPrice} {price?.currency ?? "₾"}</span>
                  <span className={`${s.cCheck} ${isSelected ? s.checkOn : ""}`}>✓</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeliverySection;
