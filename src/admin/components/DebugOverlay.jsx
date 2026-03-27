import React from "react";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.92)",
  color: "#00ff7f",
  zIndex: 9999,
  padding: "16px",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "12px",
  lineHeight: 1.35,
  overflowY: "auto",
  whiteSpace: "pre-wrap",
};

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
  borderBottom: "1px solid #00ff7f",
  paddingBottom: 8,
};

export default function DebugOverlay({ open, logs, onClose, onClear }) {
  if (!open) return null;
  return (
    <div style={overlayStyle}>
      <div style={topBar}>
        <strong>🔎 Debug Overlay — Contacts</strong>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClear} style={{ background: "transparent", color: "#00ff7f", border: "1px solid #00ff7f", padding: "4px 8px", cursor: "pointer" }}>Clear</button>
          <button onClick={onClose} style={{ background: "#00ff7f", color: "#000", border: "none", padding: "4px 8px", cursor: "pointer" }}>Close</button>
        </div>
      </div>
      {logs.length === 0 ? (
        <div>no logs…</div>
      ) : (
        logs.map((l, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div>{l.ts} — <b>{l.tag}</b></div>
            {l.msg && <div>{l.msg}</div>}
            {l.data && (
              <pre style={{ margin: "6px 0 0" }}>
                {typeof l.data === "string" ? l.data : JSON.stringify(l.data, null, 2)}
              </pre>
            )}
          </div>
        ))
      )}
    </div>
  );
}
