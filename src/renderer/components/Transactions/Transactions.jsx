import React, { useState, useEffect } from "react";
import {
  getTransactions,
  getTransactionDetail,
} from "../../services/transactions";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { printReceipt, printThermalReceipt } from "../../utils/PrintUtility";
import { T } from "../../theme";

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

  // Date filters
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  useEffect(() => {
    loadTransactions();
  }, [startDate, endDate]);

  const loadTransactions = async () => {
    setLoading(true);
    const data = await getTransactions(500, startDate, endDate);
    setTransactions(data);
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
              padding: "20px 24px 16px",
              borderBottom: `1px solid ${T.border}`,
              background: `linear-gradient(to bottom, ${T.bg}, ${T.surface})`,
            }}
          >
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  onClick={() => {
                    setStartDate(todayStr);
                    setEndDate(todayStr);
                  }}
                  style={{
                    padding: "6px 12px", borderRadius: 10, border: `1px solid ${startDate === todayStr && endDate === todayStr ? T.accent + '40' : T.border2}`,
                    background: startDate === todayStr && endDate === todayStr ? T.accent + '10' : 'transparent',
                    color: startDate === todayStr && endDate === todayStr ? T.accent : T.sub,
                    fontSize: 10, fontWeight: 800, cursor: 'pointer', fontFamily: 'Syne, sans-serif'
                  }}
                >
                  HARI INI
                </button>
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  style={{
                    padding: "6px 12px", borderRadius: 10, border: `1px solid ${!startDate ? T.accent + '40' : T.border2}`,
                    background: !startDate ? T.accent + '10' : 'transparent',
                    color: !startDate ? T.accent : T.sub,
                    fontSize: 10, fontWeight: 800, cursor: 'pointer', fontFamily: 'Syne, sans-serif'
                  }}
                >
                  SEMUA
                </button>
                <div style={{ width: 1, height: 16, background: T.border2, margin: '0 4px' }} />
                <button
                  onClick={loadTransactions}
                  style={{
                    width: 32, height: 32, borderRadius: 10, border: `1px solid ${T.border2}`,
                    background: 'transparent', color: T.sub, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border2; e.currentTarget.style.color = T.sub; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                </button>
              </div>
            </div>

            {/* Filters Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: 10, marginBottom: 14 }}>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 8, fontWeight: 800, color: T.muted, marginBottom: 4, textTransform: 'uppercase' }}>Mulai</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} 
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: `1px solid ${T.border2}`, background: T.bg, color: T.text, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} />
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 8, fontWeight: 800, color: T.muted, marginBottom: 4, textTransform: 'uppercase' }}>Sampai</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} 
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: `1px solid ${T.border2}`, background: T.bg, color: T.text, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} />
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 8, fontWeight: 800, color: T.muted, marginBottom: 4, textTransform: 'uppercase' }}>Cari Nama / Inv</label>
                <div style={{ position: 'relative' }}>
                  <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="3"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Invoice/Pelanggan..." 
                    style={{ width: '100%', padding: '8px 10px 8px 28px', borderRadius: 10, border: `1px solid ${T.border2}`, background: T.bg, color: T.text, fontSize: 11, fontFamily: 'Syne, sans-serif' }} />
                </div>
              </div>
          </div>

          {/* List */}
          <div className="scroll-pane" style={{ flex: 1, overflowY: "auto", padding: '4px 12px 12px' }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 300,
                  gap: 12,
                }}
              >
                <div style={{ padding: 20, borderRadius: '50%', background: T.border2 + '20' }}>
                   <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: T.muted, marginBottom: 4 }}>
                    Tidak ada transaksi ditemukan
                  </p>
                  <p style={{ fontSize: 11, color: T.sub }}>
                    Coba ubah rentang tanggal atau kata kunci pencarian
                  </p>
                </div>
              </div>
            ) : (
              filtered.map((t, idx) => {
                const m = getMethod(t.payment_method);
                const isActive = selected?.transaction?.id === t.id;
                return (
                  <div
                    key={t.id}
                    className={`tx-item ${isActive ? "active" : ""}`}
                    onClick={() => viewDetail(t.id)}
                    style={{
                      padding: "16px 18px",
                      margin: '6px 0',
                      borderRadius: 14,
                      border: `1px solid ${isActive ? T.accent + '35' : 'transparent'}`,
                      background: isActive ? T.accent + "08" : T.bg + '50',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    onMouseEnter={e => {
                      if(!isActive) {
                        e.currentTarget.style.background = T.border + '30';
                        e.currentTarget.style.transform = 'scale(1.005)';
                      }
                    }}
                    onMouseLeave={e => {
                      if(!isActive) {
                        e.currentTarget.style.background = T.bg + '50';
                        e.currentTarget.style.transform = 'scale(1)';
                      }
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 10,
                      }}
                    >
                      {/* Invoice + date */}
                      <div>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 900,
                            color: isActive ? T.accent : T.text,
                            fontFamily: "JetBrains Mono, monospace",
                            marginBottom: 4,
                            letterSpacing: '-0.01em'
                          }}
                        >
                          {t.invoice_no}
                        </p>
                        <p style={{ fontSize: 10, fontWeight: 600, color: T.sub, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          {fmtDt(t.created_at)}
                        </p>
                      </div>
                      {/* Amount + method */}
                      <div style={{ textAlign: "right" }}>
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 900,
                            color: T.text,
                            fontFamily: "JetBrains Mono, monospace",
                            marginBottom: 6,
                          }}
                        >
                          {fmt(t.total_amount)}
                        </p>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "3px 10px",
                            borderRadius: 100,
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            background: m.color + "14",
                            border: `1px solid ${m.color}25`,
                            color: m.color,
                          }}
                        >
                          {m.icon}
                          {m.label}
                        </span>
                      </div>
                    </div>
                    {t.customer_name && (
                       <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '6px 10px', background: T.border2 + '10', borderRadius: 8, border: `1px solid ${T.border2}20` }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                          <p style={{ fontSize: 10, color: T.sub, fontWeight: 700 }}>{t.customer_name}</p>
                       </div>
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
