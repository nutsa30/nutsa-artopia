import React, { useEffect, useRef, useState } from "react";
import s from "./DeliverySection.module.css";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";
const DEFAULT_CENTER = { lat: 41.6941, lng: 44.8337 };

const Spinner = () => <span className={s.spinner} />;

const DeliverySection = ({ delivery, onChange, selectedCourier, onCourierSelect }) => {
  const mapDivRef   = useRef(null);
  const inputRef    = useRef(null);
  const mapRef      = useRef(null);
  const markerRef   = useRef(null);
  const geocoderRef = useRef(null);

  const [mapsReady, setMapsReady] = useState(false);
  const [couriers, setCouriers]   = useState([]);
  const [loadingC, setLoadingC]   = useState(false);
  const [courierErr, setCourierErr] = useState("");

  /* ── 1. Google Maps SDK load ── */
  useEffect(() => {
    const ready = () => setMapsReady(true);

    if (window.google?.maps) { ready(); return; }

    if (document.getElementById("gm-sdk")) {
      const t = setInterval(() => {
        if (window.google?.maps) { clearInterval(t); ready(); }
      }, 100);
      return () => clearInterval(t);
    }

    const s = document.createElement("script");
    s.id  = "gm-sdk";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&libraries=places`;
    s.async = true;
    s.onload = ready;
    document.head.appendChild(s);
  }, []);

  /* ── 2. Map init (runs once mapsReady) ── */
  useEffect(() => {
    if (!mapsReady || !mapDivRef.current || mapRef.current) return;

    const center = delivery.lat ? { lat: delivery.lat, lng: delivery.lng } : DEFAULT_CENTER;

    const map = new window.google.maps.Map(mapDivRef.current, {
      center,
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_CENTER },
    });

    const marker = new window.google.maps.Marker({
      position: center,
      map,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
    });

    const geocoder = new window.google.maps.Geocoder();
    geocoderRef.current = geocoder;

    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      const lat = pos.lat();
      const lng = pos.lng();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        const streetName = status === "OK" && results[0] ? results[0].formatted_address : "";
        onChange({ lat, lng, streetName });
      });
    });

    mapRef.current    = map;
    markerRef.current = marker;

    /* Places Autocomplete */
    const inp = inputRef.current;
    if (inp && window.google.maps.places) {
      const ac = new window.google.maps.places.Autocomplete(inp, {
        componentRestrictions: { country: "ge" },
        fields: ["formatted_address", "geometry"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place.geometry) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        map.panTo({ lat, lng });
        map.setZoom(16);
        marker.setPosition({ lat, lng });
        onChange({ lat, lng, streetName: place.formatted_address });
      });
    }

    return () => { marker.setMap(null); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady]);

  /* ── 3. Debounced courier fetch ── */
  useEffect(() => {
    if (!delivery.streetName?.trim() || !delivery.lat) {
      setCouriers([]);
      setCourierErr("");
      return;
    }

    const t = setTimeout(async () => {
      setLoadingC(true);
      setCourierErr("");
      onCourierSelect(null);
      try {
        const p = new URLSearchParams({
          toLat:     delivery.lat,
          toLng:     delivery.lng,
          toAddress: delivery.streetName,
          toCity:    delivery.city || "Tbilisi",
        });
        const res = await fetch(`${API_BASE}/quickshipper/fees?${p}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const active = (data.fees || []).filter(c => c.isActive !== false);
        setCouriers(active);
        if (active.length === 0) setCourierErr("ამ მისამართისთვის ხელმისაწვდომი კურიერი ვერ მოიძებნა");
      } catch {
        setCourierErr("ტარიფების ჩატვირთვა ვერ მოხერხდა — სცადეთ მოგვიანებით");
        setCouriers([]);
      } finally {
        setLoadingC(false);
      }
    }, 750);

    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivery.lat, delivery.lng, delivery.streetName]);

  /* ── RENDER ── */
  return (
    <div className={s.wrap}>

      {/* ─── Address header ─── */}
      <div className={s.sectionHead}>
        <span className={s.headIcon}>📍</span>
        <span>მიტანის მისამართი</span>
      </div>

      {/* ─── Search input (ABOVE map) ─── */}
      <div className={s.searchWrap}>
        <svg className={s.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          id="qs-addr-inp"
          type="text"
          className={s.addrInput}
          placeholder="მოძებნეთ მისამართი…"
          value={delivery.streetName}
          onChange={(e) => onChange({ streetName: e.target.value })}
          autoComplete="off"
        />
      </div>

      {/* ─── Map ─── */}
      <div className={s.mapWrap}>
        {!mapsReady && (
          <div className={s.mapOverlay}>
            <Spinner />
            <span>რუკა იტვირთება…</span>
          </div>
        )}
        <div ref={mapDivRef} className={s.map} />
        <p className={s.mapHint}>პინი შეგიძლიათ ხელითაც გადაიტანოთ</p>
      </div>

      {/* ─── Hallway / Floor / Apartment ─── */}
      <div className={s.extraRow}>
        {[
          { key: "hallway",   label: "სადარბაზო",  ph: "მაგ. 2" },
          { key: "floor",     label: "სართული",     ph: "მაგ. 3" },
          { key: "apartment", label: "ბინა",         ph: "მაგ. 14" },
        ].map(({ key, label, ph }) => (
          <div key={key} className={s.extraCol}>
            <label className={s.extraLabel}>{label}</label>
            <input
              type="text"
              className={s.extraInput}
              placeholder={ph}
              value={delivery[key]}
              onChange={(e) => onChange({ [key]: e.target.value })}
            />
          </div>
        ))}
      </div>

      {/* ─── Courier header ─── */}
      <div className={s.sectionHead} style={{ marginTop: "1.4rem" }}>
        <span className={s.headIcon}>🚚</span>
        <span>კურიერის არჩევა</span>
      </div>

      {/* ─── Courier states ─── */}
      {!delivery.streetName?.trim() ? (
        <p className={s.hint}>შეიყვანეთ მისამართი კურიერების სანახავად</p>

      ) : loadingC ? (
        <div className={s.loadRow}>
          <Spinner />
          <span>ტარიფები იტვირთება…</span>
        </div>

      ) : courierErr ? (
        <p className={s.errText}>{courierErr}</p>

      ) : (
        <div className={s.courierList}>
          {couriers.map((c) => {
            const price = c.prices?.[0];
            const isSelected = selectedCourier?.providerId === c.providerId;
            return (
              <div
                key={c.providerId}
                className={`${s.courierCard} ${isSelected ? s.cardSelected : ""}`}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onClick={() => onCourierSelect({
                  providerId:   c.providerId,
                  priceId:      price?.id ?? null,
                  amount:       c.minPrice ?? 0,
                  currency:     price?.currency ?? "₾",
                  speedName:    price?.deliverySpeedName ?? "",
                  providerName: c.providerName,
                  logoUrl:      c.providerLogoUrl,
                })}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.click()}
              >
                {/* Logo */}
                <div className={s.logoBox}>
                  <img
                    src={c.providerLogoUrl}
                    alt={c.providerName}
                    className={s.logo}
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                </div>

                {/* Info */}
                <div className={s.cInfo}>
                  <span className={s.cName}>{c.providerName}</span>
                  {price?.deliverySpeedName && (
                    <span className={s.cSpeed}>{price.deliverySpeedName}</span>
                  )}
                </div>

                {/* Price + check */}
                <div className={s.cRight}>
                  <span className={s.cPrice}>
                    {c.minPrice} {price?.currency ?? "₾"}
                  </span>
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
