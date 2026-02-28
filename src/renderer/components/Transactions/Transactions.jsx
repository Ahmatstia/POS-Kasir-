import React, { useState, useEffect } from "react";
import {
  getTransactions,
  getTransactionDetail,
} from "../../services/transactions";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { printReceipt, printThermalReceipt } from "../../utils/PrintUtility";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  bg: "#0E0F11",
  surface: "#161719",
  card: "#1A1B1E",
  border: "#1F2023",
  border2: "#2A2B2F",
  text: "#F0EDE6",
  muted: "#5C5C66",
  sub: "#9998A3",
  accent: "#F5A623",
  green: "#34C98B",
  red: "#E85858",
  blue: "#5B8AF5",
  purple: "#A78BFA",
};

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const fmtDt = (str) => {
  if (!str) return '-';
  const d = new Date(str);
  if (isNaN(d.getTime())) return String(str);
  return format(d, 'dd MMM yyyy · HH:mm', { locale: id });
};

// ─── PAYMENT METHOD ───────────────────────────────────────────────────────────
const METHOD = {
  cash: {
    label: "Tunai",
    color: T.accent,
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <rect
          x="1"
          y="3"
          width="11"
          height="7"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <circle
          cx="6.5"
          cy="6.5"
          r="1.5"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      </svg>
    ),
  },
  debit: {
    label: "Debit",
    color: T.blue,
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <rect
          x="1"
          y="2.5"
          width="11"
          height="8"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path d="M1 5.5h11" stroke="currentColor" strokeWidth="1.3" />
        <rect
          x="2.5"
          y="7.5"
          width="3"
          height="1.5"
          rx="0.5"
          fill="currentColor"
          opacity="0.6"
        />
      </svg>
    ),
  },
  qris: {
    label: "QRIS",
    color: T.purple,
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <rect
          x="1"
          y="1"
          width="4.5"
          height="4.5"
          rx="0.8"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <rect
          x="7.5"
          y="1"
          width="4.5"
          height="4.5"
          rx="0.8"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <rect
          x="1"
          y="7.5"
          width="4.5"
          height="4.5"
          rx="0.8"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <rect x="8" y="8" width="1.5" height="1.5" fill="currentColor" />
        <rect x="10.5" y="8" width="1.5" height="1.5" fill="currentColor" />
        <rect x="8" y="10.5" width="1.5" height="1.5" fill="currentColor" />
        <rect x="10.5" y="10.5" width="1.5" height="1.5" fill="currentColor" />
      </svg>
    ),
  },
};
const getMethod = (m) => METHOD[m] || METHOD.cash;

// ─── UNIT COLORS ──────────────────────────────────────────────────────────────
const UNIT_COLOR = { pcs: T.blue, pack: T.green, kg: T.purple };

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    setTransactions(await getTransactions(100));
    setLoading(false);
  };

  const viewDetail = async (id) => {
    setDetailLoading(true);
    setSelected(await getTransactionDetail(id));
    setDetailLoading(false);
  };

  const handlePrint = (type = "normal") => {
    if (!selected) return;
    type === "thermal"
      ? printThermalReceipt(selected.transaction, selected.items)
      : printReceipt(selected.transaction, selected.items);
  };

  const filtered = transactions.filter(
    (t) =>
      t.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.customer_name &&
        t.customer_name.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 280,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: `2px solid ${T.border2}`,
              borderTopColor: T.accent,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <p
            style={{
              fontSize: 11,
              color: T.muted,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontFamily: "Syne, sans-serif",
            }}
          >
            Memuat transaksi…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px);} to {opacity:1;transform:translateY(0);} }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }

        .tx-item { transition: background 0.12s, border-color 0.12s; cursor: pointer; }
        .tx-item:hover { background: ${T.border}40 !important; }
        .tx-item.active { background: ${T.accent}08 !important; border-color: ${T.accent}35 !important; }

        .print-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }

        .scroll-pane::-webkit-scrollbar { width: 3px; }
        .scroll-pane::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 3px; }

        .search-input:focus {
          border-color: ${T.accent}60 !important;
          box-shadow: 0 0 0 2px ${T.accent}10;
        }
        .search-input::placeholder { color: ${T.muted}; }
      `}</style>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 420px",
          gap: 16,
          height: "calc(100vh - 140px)",
          fontFamily: "Syne, sans-serif",
          animation: "fadeUp 0.4s ease both",
        }}
      >
        {/* ── LEFT: TRANSACTION LIST ── */}
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "18px 20px 14px",
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: T.muted,
                    marginBottom: 2,
                  }}
                >
                  Riwayat
                </p>
                <p style={{ fontSize: 14, fontWeight: 800, color: T.text }}>
                  Transaksi
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: T.muted,
                      marginLeft: 8,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    ({filtered.length})
                  </span>
                </p>
              </div>
              <button
                onClick={loadTransactions}
                style={{
                  padding: "5px 12px",
                  borderRadius: 9,
                  border: `1px solid ${T.border2}`,
                  background: "transparent",
                  color: T.sub,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = T.border;
                  e.currentTarget.style.color = T.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = T.sub;
                }}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path
                    d="M1.5 5.5A4 4 0 115 1.7"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M1.5 2.5v3h3"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Refresh
              </button>
            </div>

            {/* Search */}
            <div style={{ position: "relative" }}>
              <svg
                style={{
                  position: "absolute",
                  left: 11,
                  top: "50%",
                  transform: "translateY(-50%)",
                  opacity: 0.4,
                  pointerEvents: "none",
                }}
                width="13"
                height="13"
                viewBox="0 0 13 13"
                fill="none"
              >
                <circle
                  cx="5.5"
                  cy="5.5"
                  r="4"
                  stroke={T.sub}
                  strokeWidth="1.4"
                />
                <path
                  d="M8.5 8.5L11 11"
                  stroke={T.sub}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari invoice atau customer…"
                className="search-input"
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 32px",
                  borderRadius: 10,
                  border: `1px solid ${T.border2}`,
                  background: T.bg,
                  color: T.text,
                  fontFamily: "Syne, sans-serif",
                  fontSize: 12,
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: T.muted,
                    fontSize: 16,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="scroll-pane" style={{ flex: 1, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 200,
                  gap: 8,
                }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 40 40"
                  fill="none"
                  opacity="0.2"
                >
                  <rect
                    x="6"
                    y="4"
                    width="28"
                    height="32"
                    rx="3"
                    stroke={T.sub}
                    strokeWidth="2"
                  />
                  <path
                    d="M13 14h14M13 20h10M13 26h8"
                    stroke={T.sub}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <p style={{ fontSize: 12, color: T.muted }}>
                  Tidak ada transaksi
                </p>
              </div>
            ) : (
              filtered.map((t) => {
                const m = getMethod(t.payment_method);
                const isActive = selected?.transaction?.id === t.id;
                return (
                  <div
                    key={t.id}
                    className={`tx-item ${isActive ? "active" : ""}`}
                    onClick={() => viewDetail(t.id)}
                    style={{
                      padding: "13px 18px",
                      borderBottom: `1px solid ${T.border}`,
                      border: isActive ? `1px solid ${T.accent}35` : undefined,
                      background: isActive ? T.accent + "08" : "transparent",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 6,
                      }}
                    >
                      {/* Invoice + date */}
                      <div>
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: isActive ? T.accent : T.text,
                            fontFamily: "JetBrains Mono, monospace",
                            marginBottom: 3,
                          }}
                        >
                          {t.invoice_no}
                        </p>
                        <p style={{ fontSize: 10, color: T.muted }}>
                          {fmtDt(t.created_at)}
                        </p>
                      </div>
                      {/* Amount + method */}
                      <div style={{ textAlign: "right" }}>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: T.text,
                            fontFamily: "JetBrains Mono, monospace",
                            marginBottom: 4,
                          }}
                        >
                          {fmt(t.total_amount)}
                        </p>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 8px",
                            borderRadius: 100,
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            background: m.color + "12",
                            border: `1px solid ${m.color}30`,
                            color: m.color,
                          }}
                        >
                          {m.icon}
                          {m.label}
                        </span>
                      </div>
                    </div>
                    {t.customer_name && (
                      <p style={{ fontSize: 10, color: T.muted }}>
                        <span style={{ color: T.muted + "80" }}>
                          Customer:{" "}
                        </span>
                        {t.customer_name}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: DETAIL ── */}
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "18px 20px 14px",
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: T.muted,
                marginBottom: 2,
              }}
            >
              Detail
            </p>
            <p style={{ fontSize: 14, fontWeight: 800, color: T.text }}>
              Transaksi
            </p>
          </div>

          {detailLoading ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  border: `2px solid ${T.border2}`,
                  borderTopColor: T.accent,
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            </div>
          ) : selected ? (
            <div
              className="scroll-pane"
              style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}
            >
              {/* Invoice meta */}
              <div
                style={{
                  background: T.bg,
                  border: `1px solid ${T.border2}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 14,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Accent stripe */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: `linear-gradient(90deg, ${T.accent}, transparent)`,
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: T.muted,
                        marginBottom: 4,
                      }}
                    >
                      Invoice
                    </p>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: T.accent,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {selected.transaction.invoice_no}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: T.muted,
                        marginBottom: 4,
                      }}
                    >
                      Tanggal
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: T.sub,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {fmtDt(selected.transaction.created_at)}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  {/* Method */}
                  {(() => {
                    const m = getMethod(selected.transaction.payment_method);
                    return (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "4px 10px",
                          borderRadius: 100,
                          fontSize: 10,
                          fontWeight: 700,
                          background: m.color + "12",
                          border: `1px solid ${m.color}30`,
                          color: m.color,
                        }}
                      >
                        {m.icon} {m.label}
                      </span>
                    );
                  })()}
                  {/* Customer */}
                  {selected.transaction.customer_name && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 10px",
                        borderRadius: 100,
                        fontSize: 10,
                        fontWeight: 700,
                        background: T.border,
                        border: `1px solid ${T.border2}`,
                        color: T.sub,
                      }}
                    >
                      {selected.transaction.customer_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Items */}
              <div style={{ marginBottom: 14 }}>
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: T.muted,
                    marginBottom: 10,
                  }}
                >
                  Item Belanja{" "}
                  <span style={{ fontWeight: 400 }}>
                    ({selected.items.length})
                  </span>
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {selected.items.map((item) => {
                    const uc = UNIT_COLOR[item.unit] || T.sub;
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 10,
                          background: T.bg,
                          border: `1px solid ${T.border}`,
                        }}
                      >
                        {/* Unit badge */}
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            flexShrink: 0,
                            background: uc + "14",
                            border: `1px solid ${uc}30`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 8,
                            fontWeight: 800,
                            color: uc,
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                          }}
                        >
                          {item.unit}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: T.text,
                              marginBottom: 2,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {item.product_name}
                          </p>
                          <p
                            style={{
                              fontSize: 10,
                              color: T.sub,
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          >
                            {item.quantity} × {fmt(item.price_per_unit)}
                          </p>
                        </div>
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: T.text,
                            fontFamily: "JetBrains Mono, monospace",
                            flexShrink: 0,
                          }}
                        >
                          {fmt(item.subtotal)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals */}
              <div
                style={{
                  background: T.bg,
                  border: `1px solid ${T.border2}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 16,
                }}
              >
                {[
                  {
                    label: "Subtotal",
                    val: selected.transaction.subtotal,
                    color: T.sub,
                  },
                  {
                    label: "Diskon",
                    val: selected.transaction.discount,
                    color:
                      selected.transaction.discount > 0 ? T.green : T.muted,
                  },
                ].map(({ label, val, color }) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: 11, color: T.sub }}>{label}</span>
                    <span
                      style={{
                        fontSize: 11,
                        color,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {fmt(val)}
                    </span>
                  </div>
                ))}

                <div
                  style={{ height: 1, background: T.border2, margin: "10px 0" }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: T.sub,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Total
                  </span>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: T.text,
                      fontFamily: "JetBrains Mono, monospace",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {fmt(selected.transaction.total_amount)}
                  </span>
                </div>

                {[
                  {
                    label: "Dibayar",
                    val: selected.transaction.payment_amount,
                    color: T.sub,
                  },
                  {
                    label: "Kembalian",
                    val: selected.transaction.change_amount,
                    color: T.green,
                  },
                ].map(({ label, val, color }) => (
                  <div
                    key={label}
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span style={{ fontSize: 11, color: T.muted }}>
                      {label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {fmt(val)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Print actions */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                {[
                  {
                    type: "normal",
                    label: "Cetak Struk",
                    color: T.blue,
                    icon: (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                      >
                        <path
                          d="M4 1h6v4H4V1z"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinejoin="round"
                        />
                        <rect
                          x="1"
                          y="5"
                          width="12"
                          height="6"
                          rx="1.5"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                        <path
                          d="M4 10v3h6v-3"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="10.5"
                          cy="7.5"
                          r="0.75"
                          fill="currentColor"
                        />
                      </svg>
                    ),
                  },
                  {
                    type: "thermal",
                    label: "Thermal 58mm",
                    color: T.green,
                    icon: (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                      >
                        <path
                          d="M5 1h4v4H5V1z"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinejoin="round"
                        />
                        <rect
                          x="2"
                          y="5"
                          width="10"
                          height="6"
                          rx="1.5"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                        <path
                          d="M5 11v2h4v-2"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ),
                  },
                ].map(({ type, label, color, icon }) => (
                  <button
                    key={type}
                    className="print-btn"
                    onClick={() => handlePrint(type)}
                    style={{
                      padding: "11px 10px",
                      borderRadius: 12,
                      cursor: "pointer",
                      border: `1px solid ${color}40`,
                      background: color + "14",
                      color,
                      fontFamily: "Syne, sans-serif",
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.03em",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                    }}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <svg
                width="52"
                height="52"
                viewBox="0 0 52 52"
                fill="none"
                opacity="0.18"
              >
                <rect
                  x="10"
                  y="6"
                  width="32"
                  height="40"
                  rx="3"
                  stroke={T.sub}
                  strokeWidth="2"
                />
                <path
                  d="M18 18h16M18 26h12M18 34h8"
                  stroke={T.sub}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <p style={{ fontSize: 13, fontWeight: 700, color: T.muted }}>
                Pilih transaksi
              </p>
              <p style={{ fontSize: 11, color: T.muted + "80" }}>
                Klik item di sebelah kiri untuk melihat detail
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Transactions;
