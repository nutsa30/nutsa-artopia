import React from "react";
import s from "./DeliverySection.module.css";
import { courierDeliveryInfo } from "../../utils/pricing";
import { TruckIcon, PinIcon } from "./icons";

const CITIES_GE = [
  "თბილისი",
  "ბათუმი",
  "რუსთავი",
  "ქუთაისი",
  "გორი",
  "ფოთი",
  "ზუგდიდი",
  "მარნეული",
  "ხაშური",
  "სამტრედია",
  "ზესტაფონი",
  "თელავი",
  "ქობულეთი",
  "ახალციხე",
  "სენაკი",
  "ოზურგეთი",
  "კასპი",
  "ჭიათურა",
  "გარდაბანი",
  "ბორჯომი",
  "საგარეჯო",
  "ყვარელი",
  "ბოლნისი",
  "ტყიბული",
  "ხონი",
  "წყალტუბო",
  "ახალქალაქი",
  "მცხეთა",
  "გურჯაანი",
  "დუშეთი",
  "ქარელი",
  "ლანჩხუთი",
  "ახმეტა",
  "ლაგოდეხი",
  "საჩხერე",
  "დედოფლისწყარო",
  "ვალე",
  "თერჯოლა",
  "წნორი",
  "თეთრიწყარო",
  "აბაშა",
  "მარტვილი",
  "ნინოწმინდა",
  "წალკა",
  "ვანი",
  "ხობი",
  "დმანისი",
  "წალენჯიხა",
  "ბაღდათი",
  "ონი",
  "ჩხოროწყუ",
  "ამბროლაური",
  "სიღნაღი",
  "ჯვარი",
  "ცაგერი",
];

const fmt = (n) => Number(n ?? 0).toFixed(2);

const DeliverySection = ({ delivery, onChange, subtotal = 0 }) => {
  const info = courierDeliveryInfo(delivery.city, subtotal);
  const needed = Math.max(0, +(info.freeThreshold - subtotal).toFixed(2));

  return (
    <div className={s.wrap}>
      <div className={s.sectionHead}>
        <PinIcon width={20} height={20} />
        <span>მიტანის დეტალები</span>
      </div>

      <select
        className={s.addrInput}
        style={{ paddingLeft: 14, marginBottom: 10 }}
        value={delivery.city || "თბილისი"}
        onChange={(e) => onChange({ city: e.target.value })}
      >
        {CITIES_GE.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <input
        className={s.addrInput}
        style={{ paddingLeft: 14, paddingRight: 14, marginBottom: 10 }}
        type="text"
        placeholder="მისამართი (ქუჩა, ნომერი)"
        value={delivery.address || ""}
        onChange={(e) => onChange({ address: e.target.value })}
      />

      <div className={s.extraRow}>
        {[
          { key: "hallway",   label: "სადარბაზო", ph: "მაგ. 2"  },
          { key: "floor",     label: "სართული",   ph: "მაგ. 3"  },
          { key: "apartment", label: "ბინა",       ph: "მაგ. 14" },
        ].map(({ key, label, ph }) => (
          <div key={key} className={s.extraCol}>
            <label className={s.extraLabel}>{label}</label>
            <input type="text" className={s.extraInput} placeholder={ph}
              value={delivery[key] || ""}
              onChange={(e) => onChange({ [key]: e.target.value })} />
          </div>
        ))}
      </div>

      <div className={s.loadRow} style={{ justifyContent: "space-between", marginTop: 10 }}>
        {info.waived ? (
          <span style={{ color: "#4ade80", fontWeight: 700 }}>
            <TruckIcon /> მიტანა უფასოა{" "}
            <span style={{ textDecoration: "line-through", color: "#94a3b8", fontWeight: 400 }}>
              {fmt(info.baseFee)}₾
            </span>
          </span>
        ) : (
          <span style={{ color: "#f1faee" }}>
            <TruckIcon /> მიტანის საფასური: <strong>{fmt(info.fee)}₾</strong>
            {needed > 0 && (
              <span style={{ color: "#94a3b8" }}> · კიდევ {fmt(needed)}₾ და მიტანა უფასო იქნება</span>
            )}
          </span>
        )}
      </div>
      <p className={s.hint} style={{ padding: "4px 0 0", textAlign: "left" }}>
        მიტანის ვადა: {info.etaLabel}
      </p>
    </div>
  );
};

export default DeliverySection;
