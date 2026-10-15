import React, { useState, useEffect } from "react";
import {
  getTransactions,
  getTransactionDetail,
  deleteTransaction,
  deleteAllTransactions,
} from "../../services/transactions";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { printReceipt, printThermalReceipt } from "../../utils/PrintUtility";
import { T } from "../../theme";
import { useToast } from "../Toast";
import { isPrivacyModeEnabled, getStoreProfile } from "../../services/settings";
import { TransactionsIcon, RefreshIcon } from "../Icons/AppIcons";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

const fmtDt = (str) => {
  if (!str) return "-";
  const normalized = typeof str === "string" ? str.replace(" ", "T") : str;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return String(str);
  return format(d, "dd MMM yyyy · HH:mm", { locale: id });
};

const fmtTime = (str) => {
  if (!str) return "";
  const normalized = typeof str === "string" ? str.replace(" ", "T") : str;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return "";
  return format(d, "HH:mm");
};

const fmtDateShort = (str) => {
  if (!str) return "-";
  const normalized = typeof str === "string" ? str.replace(" ", "T") : str;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return String(str);
  return format(d, "dd MMM yyyy", { locale: id });
};

// ─── PAYMENT METHOD TOKENS ────────────────────────────────────────────────────
const METHOD = {
  cash: {
    label: "Tunai",
    color: T.green,
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  debit: {
    label: "Debit / EDC",
    color: T.blue,
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
  qris: {
    label: "QRIS",
    color: T.purple,
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  kasbon: {
    label: "Kasbon",
    color: T.orange,
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
};
const getMethod = (m) => METHOD[m] || METHOD.cash;

// ─── STAT KPI CARD ────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        transition: "all 0.2s",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 11,
          flexShrink: 0,
          background: color + "14",
          border: `1px solid ${color}30`,
          color: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: T.sub, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px" }}>
          {label}
        </p>
        <p style={{ fontSize: 18, fontWeight: 900, color: color, fontFamily: "JetBrains Mono, monospace", margin: 0, lineHeight: 1.1 }}>
          {value}
        </p>
        {sub && <p style={{ fontSize: 10, color: T.muted, margin: "3px 0 0" }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
function Transactions() {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [hideCost, setHideCost] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [filterMethod, setFilterMethod] = useState("all");
  const [copiedInvoice, setCopiedInvoice] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Date filters
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [activeDatePreset, setActiveDatePreset] = useState("today"); // 'today' | '7days' | 'month' | 'all' | 'custom'

  useEffect(() => {
    loadTransactions();
    checkPrivacy();
  }, [startDate, endDate]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterMethod, startDate, endDate]);

  const checkPrivacy = async () => {
    setHideCost(await isPrivacyModeEnabled());
  };

  const loadTransactions = async () => {
    setLoading(true);
    const data = await getTransactions(500, startDate, endDate);
    setTransactions(data || []);
    setLoading(false);
  };

  const setPreset = (preset) => {
    setActiveDatePreset(preset);
    const now = new Date();
    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "7days") {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 7);
      setStartDate(format(d7, "yyyy-MM-dd"));
      setEndDate(todayStr);
    } else if (preset === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(format(firstDay, "yyyy-MM-dd"));
      setEndDate(todayStr);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  const viewDetail = async (id) => {
    setDetailLoading(true);
    setShowDetail(true);
    const detail = await getTransactionDetail(id);
    setSelected(detail);
    setDetailLoading(false);
  };

  const handlePrint = async (type = "thermal", targetTx = null) => {
    const target = targetTx || selected;
    if (!target) return;
    const store = await getStoreProfile();
    if (type === "thermal") {
      printThermalReceipt(target.transaction, target.items, store);
    } else {
      printReceipt(target.transaction, target.items, store);
    }
    showToast("success", "Mencetak struk penjualan...");
  };

  const handleCopyInvoice = (inv, e) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(inv);
    setCopiedInvoice(inv);
    showToast("info", `Nomor nota ${inv} disalin`);
    setTimeout(() => setCopiedInvoice(null), 2000);
  };

  const filtered = transactions.filter((t) => {
    const inv = (t.invoice_no || "").toLowerCase();
    const cust = (t.customer_name || "").toLowerCase();
    const query = searchTerm.toLowerCase().trim();
    const matchSearch = !query || inv.includes(query) || cust.includes(query);
    const matchMethod = filterMethod === "all" || t.payment_method === filterMethod;
    return matchSearch && matchMethod;
  });

  const handleDelete = async () => {
    if (!deleteDialog) return;
    setLoading(true);
    let res;
    if (deleteDialog.type === "single") {
      res = await deleteTransaction(deleteDialog.id);
    } else if (deleteDialog.type === "all") {
      res = await deleteAllTransactions();
    }
    setLoading(false);

    if (res?.success) {
      setDeleteDialog(null);
      if (deleteDialog.type === "single" && selected?.transaction?.id === deleteDialog.id) {
        setSelected(null);
        setShowDetail(false);
      }
      showToast("success", deleteDialog.type === "all" ? "Seluruh riwayat nota berhasil dihapus" : "Nota berhasil dibatalkan");
      loadTransactions();
    } else {
      showToast("error", "Gagal membatalkan nota: " + (res?.error || "Unknown"));
    }
  };

  // Calculations for summary KPI cards
  const completedList = filtered.filter((t) => t.status !== "CANCELLED");
  const totalOmzet = completedList.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
  const cashOmzet = completedList
    .filter((t) => t.payment_method === "cash")
    .reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
  const nonCashOmzet = totalOmzet - cashOmzet;
  const cancelledCount = filtered.filter((t) => t.status === "CANCELLED").length;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (loading && transactions.length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 320 }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 38,
              height: 38,
              border: `2px solid ${T.border2}`,
              borderTopColor: T.accent,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <p style={{ fontSize: 11, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Syne, sans-serif" }}>
            Memuat riwayat transaksi…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .tx-table { width: 100%; border-collapse: collapse; font-family: 'Syne', sans-serif; }
        .tx-table th {
          padding: 11px 14px; font-size: 10px; font-weight: 800; letter-spacing: 0.1em;
          text-transform: uppercase; color: ${T.muted};
          border-bottom: 1px solid ${T.border}; text-align: left; white-space: nowrap;
          background: ${T.surface};
        }
        .tx-table td {
          padding: 10px 14px; font-size: 12px; color: ${T.sub};
          border-bottom: 1px solid ${T.border}; white-space: nowrap;
          transition: background 0.12s;
        }
        .tx-table tbody tr { cursor: pointer; transition: background 0.12s; }
        .tx-table tbody tr:hover td { background: ${T.border}45 !important; }
        .tx-table tbody tr.active td { background: ${T.accent}12 !important; border-bottom-color: ${T.accent}30; }

        .compact-card {
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid ${T.border};
          background: ${T.bg};
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .compact-card:hover {
          background: ${T.border}40;
          border-color: ${T.border2};
          transform: translateY(-1px);
        }
        .compact-card.active {
          background: ${T.accent}12;
          border-color: ${T.accent}50;
        }

        .filter-pill {
          padding: 6px 12px;
          border-radius: 9px;
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }

        .receipt-container {
          background: #ffffff;
          color: #111827;
          border-radius: 14px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.25);
          font-family: 'Courier New', Courier, monospace;
          position: relative;
        }

        .btn-action {
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          font-family: 'Syne', sans-serif;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: all 0.15s;
          border: 1px solid transparent;
        }

        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 4px; }
      `}</style>

      <div style={{ animation: "fadeUp 0.35s ease both", fontFamily: "Syne, sans-serif", display: "flex", flexDirection: "column", gap: 14 }}>
        
        {/* ─── TOP HEADER ─── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: T.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: `0 4px 12px ${T.accent}35`,
              }}
            >
              <TransactionsIcon />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: 0, letterSpacing: "-0.01em" }}>
                Riwayat Nota & Transaksi
              </h2>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setDeleteDialog({ type: "all" })}
              disabled={transactions.length === 0}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                cursor: transactions.length === 0 ? "not-allowed" : "pointer",
                border: `1px solid ${T.red}35`,
                background: T.red + "10",
                color: T.red,
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "Syne, sans-serif",
                opacity: transactions.length === 0 ? 0.4 : 1,
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { if (transactions.length > 0) e.currentTarget.style.background = T.red + "20"; }}
              onMouseLeave={(e) => { if (transactions.length > 0) e.currentTarget.style.background = T.red + "10"; }}
              title="Bersihkan semua nota riwayat transaksi"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              Hapus Semua Riwayat
            </button>

            <button
              onClick={loadTransactions}
              title="Segarkan Data"
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: `1px solid ${T.border2}`,
                background: T.surface,
                color: T.text,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "Syne, sans-serif",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border2; e.currentTarget.style.color = T.text; }}
            >
              <RefreshIcon size={13} />
              Segarkan
            </button>
          </div>
        </div>

        {/* ─── SUMMARY KPI CARDS ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <StatCard
            label="Total Nota"
            value={`${filtered.length} Nota`}
            sub={cancelledCount > 0 ? `${cancelledCount} dibatalkan` : "Semua selesai"}
            color={T.accent}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            }
          />
          <StatCard
            label="Total Omzet (Laku)"
            value={fmt(totalOmzet)}
            sub="Dari transaksi selesai"
            color={T.green}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
          />
          <StatCard
            label="Penjualan Tunai"
            value={fmt(cashOmzet)}
            sub="Uang fisik di laci"
            color={T.blue}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            }
          />
          <StatCard
            label="Non-Tunai & Kasbon"
            value={fmt(nonCashOmzet)}
            sub="QRIS / Debit / Kasbon"
            color={T.purple}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            }
          />
        </div>

        {/* ─── FILTERS & CONTROLS TOOLBAR ─── */}
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {/* Row 1: Search + Quick Date Presets */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {/* Search Input */}
            <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
              <svg
                style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", opacity: 0.4, pointerEvents: "none" }}
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke={T.sub}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari No. Nota, invoice, atau nama pelanggan…"
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 32px",
                  borderRadius: 10,
                  border: `1px solid ${T.border2}`,
                  background: T.bg,
                  color: T.text,
                  fontFamily: "Syne, sans-serif",
                  fontSize: 12,
                  outline: "none",
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 16, lineHeight: 1 }}
                >
                  ×
                </button>
              )}
            </div>

            {/* Quick Date Presets */}
            <div style={{ display: "flex", gap: 5, background: T.bg, padding: 3, borderRadius: 10, border: `1px solid ${T.border2}` }}>
              {[
                ["today", "Hari Ini"],
                ["7days", "7 Hari"],
                ["month", "Bulan Ini"],
                ["all", "Semua"],
              ].map(([key, label]) => {
                const isAct = activeDatePreset === key;
                return (
                  <button
                    key={key}
                    onClick={() => setPreset(key)}
                    className="filter-pill"
                    style={{
                      padding: "5px 11px",
                      background: isAct ? T.accent + "20" : "transparent",
                      color: isAct ? T.accent : T.muted,
                      border: isAct ? `1px solid ${T.accent}40` : "1px solid transparent",
                      fontWeight: isAct ? 800 : 600,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Custom Date Pickers */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActiveDatePreset("custom");
                }}
                style={{
                  padding: "6px 9px",
                  borderRadius: 9,
                  border: `1px solid ${T.border2}`,
                  background: T.bg,
                  color: T.text,
                  fontSize: 11,
                  fontFamily: "JetBrains Mono, monospace",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: 11, color: T.muted }}>s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActiveDatePreset("custom");
                }}
                style={{
                  padding: "6px 9px",
                  borderRadius: 9,
                  border: `1px solid ${T.border2}`,
                  background: T.bg,
                  color: T.text,
                  fontSize: 11,
                  fontFamily: "JetBrains Mono, monospace",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Row 2: Payment Method Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 4, borderTop: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 4 }}>
              Metode:
            </span>
            {[
              ["all", "Semua Metode", T.sub],
              ["cash", "Tunai", T.green],
              ["debit", "Debit / EDC", T.blue],
              ["qris", "QRIS", T.purple],
              ["kasbon", "Kasbon", T.orange],
            ].map(([key, label, col]) => {
              const isAct = filterMethod === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilterMethod(key)}
                  className="filter-pill"
                  style={{
                    padding: "4px 10px",
                    borderRadius: 8,
                    fontSize: 11,
                    background: isAct ? col + "18" : "transparent",
                    color: isAct ? col : T.muted,
                    border: isAct ? `1px solid ${col}45` : `1px solid ${T.border}`,
                    fontWeight: isAct ? 800 : 600,
                  }}
                >
                  {label}
                </button>
              );
            })}

            <div style={{ marginLeft: "auto", fontSize: 11, color: T.muted, fontFamily: "JetBrains Mono, monospace" }}>
              <span style={{ color: T.accent, fontWeight: 700 }}>{filtered.length}</span> nota ditampilkan
            </div>
          </div>
        </div>

        {/* ─── MAIN CONTENT: MASTER-DETAIL / COMPACT TABLE ─── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: showDetail ? "1fr 430px" : "1fr",
            gap: 14,
            alignItems: "flex-start",
            transition: "all 0.3s ease",
          }}
        >
          {/* ─── LEFT: COMPACT TRANSACTIONS LIST / TABLE ─── */}
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              overflow: "hidden",
              minHeight: 460,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {filtered.length === 0 ? (
              <div style={{ padding: "64px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: T.border2 + "25", display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, marginBottom: 12 }}>
                  <TransactionsIcon />
                </div>
                <p style={{ fontSize: 14, fontWeight: 800, color: T.muted, margin: "0 0 4px" }}>Tidak Ada Nota Ditemukan</p>
                <p style={{ fontSize: 11, color: T.sub, margin: 0 }}>Coba ubah tanggal atau bersihkan kata kunci pencarian.</p>
              </div>
            ) : showDetail ? (
              /* COMPACT SPLIT LIST (When Receipt Inspector is OPEN) */
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: 6, maxHeight: "calc(100vh - 360px)", overflowY: "auto" }}>
                  {paginated.map((t) => {
                    const m = getMethod(t.payment_method);
                    const isAct = selected?.transaction?.id === t.id;
                    const isCancelled = t.status === "CANCELLED";
                    return (
                      <div
                        key={t.id}
                        className={`compact-card ${isAct ? "active" : ""}`}
                        onClick={() => viewDetail(t.id)}
                        style={{
                          opacity: isCancelled ? 0.6 : 1,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 800, fontFamily: "JetBrains Mono, monospace", color: isAct ? T.accent : T.text }}>
                                {t.invoice_no}
                              </span>
                              {isCancelled && (
                                <span style={{ fontSize: 9, fontWeight: 800, color: T.red, background: T.red + "15", padding: "1px 5px", borderRadius: 4 }}>
                                  BATAL
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: 10, color: T.muted, fontFamily: "JetBrains Mono, monospace" }}>
                              {fmtDt(t.created_at)}
                            </span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span style={{ fontSize: 13, fontWeight: 900, fontFamily: "JetBrains Mono, monospace", color: T.text, display: "block" }}>
                              {fmt(t.total_amount)}
                            </span>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 9,
                                fontWeight: 800,
                                color: m.color,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: m.color + "12",
                              }}
                            >
                              {m.label}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: T.sub }}>
                          <span>Pelanggan: <strong>{t.customer_name || "Umum"}</strong></span>
                          <span style={{ color: T.accent, fontWeight: 700, fontSize: 10 }}>Lihat Struk ›</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderTop: `1px solid ${T.border}`, background: T.surface, marginTop: "auto" }}>
                    <span style={{ fontSize: 10, color: T.muted }}>Hal {page} dari {totalPages} ({filtered.length} nota)</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "3px 8px", fontSize: 10, borderRadius: 6, border: `1px solid ${T.border2}`, background: page === 1 ? T.bg : T.surface, color: page === 1 ? T.muted : T.text, cursor: page === 1 ? "default" : "pointer" }}>‹</button>
                      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "3px 8px", fontSize: 10, borderRadius: 6, border: `1px solid ${T.border2}`, background: page === totalPages ? T.bg : T.surface, color: page === totalPages ? T.muted : T.text, cursor: page === totalPages ? "default" : "pointer" }}>›</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* CLEAN FULL TABLE (Default wide view, dense & elegant) */
              <div>
                <div style={{ overflowX: "auto" }}>
                  <table className="tx-table">
                    <thead>
                      <tr>
                        {["No. Nota / Waktu", "Pelanggan", "Metode", "Status", "Total Belanja", "Aksi"].map((h, i) => (
                          <th key={h} style={{ textAlign: i === 4 ? "right" : i === 5 ? "center" : "left" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((t) => {
                        const m = getMethod(t.payment_method);
                        const isCancelled = t.status === "CANCELLED";
                        return (
                          <tr key={t.id} onClick={() => viewDetail(t.id)}>
                            {/* Invoice & Time */}
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontWeight: 800, color: T.accent, fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>
                                    {t.invoice_no}
                                  </span>
                                  <button
                                    onClick={(e) => handleCopyInvoice(t.invoice_no, e)}
                                    title="Salin No. Nota"
                                    style={{
                                      background: "transparent",
                                      border: "none",
                                      color: copiedInvoice === t.invoice_no ? T.green : T.muted,
                                      cursor: "pointer",
                                      padding: 2,
                                    }}
                                  >
                                    {copiedInvoice === t.invoice_no ? (
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                    ) : (
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                    )}
                                  </button>
                                </div>
                                <span style={{ fontSize: 10, color: T.muted, fontFamily: "JetBrains Mono, monospace" }}>
                                  {fmtDt(t.created_at)}
                                </span>
                              </div>
                            </td>

                            {/* Customer */}
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.border2 + "30", display: "flex", alignItems: "center", justifyContent: "center", color: T.sub }}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                </div>
                                <span style={{ fontWeight: 700, color: t.customer_name ? T.text : T.sub, fontSize: 12 }}>
                                  {t.customer_name || "Walk-in Guest"}
                                </span>
                              </div>
                            </td>

                            {/* Payment Method */}
                            <td>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "3px 9px",
                                  borderRadius: 7,
                                  fontSize: 10,
                                  fontWeight: 800,
                                  background: m.color + "14",
                                  border: `1px solid ${m.color}35`,
                                  color: m.color,
                                }}
                              >
                                {m.icon}
                                {m.label}
                              </span>
                            </td>

                            {/* Status */}
                            <td>
                              {isCancelled ? (
                                <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, background: T.red + "15", color: T.red, border: `1px solid ${T.red}30` }}>
                                  BATAL
                                </span>
                              ) : (
                                <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, background: T.green + "12", color: T.green, border: `1px solid ${T.green}30` }}>
                                  SELESAI
                                </span>
                              )}
                            </td>

                            {/* Total Amount */}
                            <td style={{ textAlign: "right" }}>
                              <span style={{ fontSize: 13, fontWeight: 900, fontFamily: "JetBrains Mono, monospace", color: isCancelled ? T.muted : T.text }}>
                                {fmt(t.total_amount)}
                              </span>
                            </td>

                            {/* Actions */}
                            <td style={{ textAlign: "center" }}>
                              <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => viewDetail(t.id)}
                                  className="btn-action"
                                  style={{ background: T.accent + "15", border: `1px solid ${T.accent}35`, color: T.accent }}
                                  title="Buka Detail Struk Belanja"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                  Rincian
                                </button>

                                <button
                                  onClick={async () => {
                                    const detail = await getTransactionDetail(t.id);
                                    handlePrint("thermal", detail);
                                  }}
                                  className="btn-action"
                                  style={{ background: T.green + "12", border: `1px solid ${T.green}35`, color: T.green }}
                                  title="Cetak Cepat Struk Thermal 58mm"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                                  Cetak
                                </button>

                                {!isCancelled && (
                                  <button
                                    onClick={() => setDeleteDialog({ type: "single", id: t.id })}
                                    className="btn-action"
                                    style={{ background: T.red + "10", border: `1px solid ${T.red}30`, color: T.red, padding: "6px 8px" }}
                                    title="Batalkan Nota (Kembalikan Stok)"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /></svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer / Pagination */}
                <div
                  style={{
                    padding: "10px 16px",
                    borderTop: `1px solid ${T.border}`,
                    background: T.surface,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: T.muted }}>
                    <span>
                      Menampilkan <strong>{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</strong> - <strong>{Math.min(filtered.length, page * pageSize)}</strong> dari <strong>{filtered.length}</strong> transaksi
                    </span>
                    <span style={{ color: T.border2 }}>|</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Baris per hal:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setPage(1);
                        }}
                        style={{
                          padding: "3px 8px",
                          borderRadius: 6,
                          border: `1px solid ${T.border2}`,
                          background: T.bg,
                          color: T.text,
                          fontSize: 11,
                          outline: "none",
                          fontFamily: "JetBrains Mono, monospace",
                          cursor: "pointer",
                        }}
                      >
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  {totalPages > 1 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        style={{
                          padding: "5px 11px",
                          borderRadius: 8,
                          border: `1px solid ${T.border2}`,
                          background: page === 1 ? T.bg : T.surface,
                          color: page === 1 ? T.muted : T.text,
                          cursor: page === 1 ? "not-allowed" : "pointer",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        ‹ Sebelumnya
                      </button>

                      <span style={{ padding: "0 10px", fontSize: 11, fontWeight: 800, color: T.accent, fontFamily: "JetBrains Mono, monospace" }}>
                        {page} / {totalPages}
                      </span>

                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        style={{
                          padding: "5px 11px",
                          borderRadius: 8,
                          border: `1px solid ${T.border2}`,
                          background: page === totalPages ? T.bg : T.surface,
                          color: page === totalPages ? T.muted : T.text,
                          cursor: page === totalPages ? "not-allowed" : "pointer",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        Berikutnya ›
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ─── RIGHT: MODERN RECEIPT INSPECTOR (Panel Detail Struk) ─── */}
          {showDetail && (
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                position: "sticky",
                top: 0,
                boxShadow: "0 14px 30px rgba(0,0,0,0.3)",
                animation: "fadeUp 0.25s ease both",
              }}
            >
              {/* Header Panel */}
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: `1px solid ${T.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: `linear-gradient(to bottom, ${T.bg}, ${T.surface})`,
                }}
              >
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text, margin: 0 }}>
                    Rincian Struk Nota
                  </h3>
                  <span style={{ fontSize: 10, color: T.muted }}>Inspektur Transaksi & Pencetakan</span>
                </div>
                <button
                  onClick={() => {
                    setShowDetail(false);
                    setSelected(null);
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: `1px solid ${T.border2}`,
                    background: "transparent",
                    color: T.muted,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = T.accent; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border2; }}
                  title="Tutup Panel Struk"
                >
                  ✕
                </button>
              </div>

              {detailLoading ? (
                <div style={{ padding: "80px 20px", textAlign: "center" }}>
                  <div style={{ width: 32, height: 32, border: `2px solid ${T.border2}`, borderTopColor: T.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 11, color: T.muted }}>Memuat struk…</p>
                </div>
              ) : selected ? (
                <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "calc(100vh - 240px)", overflowY: "auto" }}>
                  
                  {/* Digital Receipt Card */}
                  <div
                    style={{
                      background: T.bg,
                      border: `1px solid ${T.border2}`,
                      borderRadius: 12,
                      padding: "16px",
                      position: "relative",
                    }}
                  >
                    {/* Invoice header & copy */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <span style={{ fontSize: 9, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block" }}>
                          Nomor Nota
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 900, color: T.accent, fontFamily: "JetBrains Mono, monospace" }}>
                            {selected.transaction.invoice_no}
                          </span>
                          <button
                            onClick={(e) => handleCopyInvoice(selected.transaction.invoice_no, e)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: T.sub, padding: 0 }}
                            title="Salin nomor nota"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                          </button>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block" }}>
                          Waktu Transaksi
                        </span>
                        <span style={{ fontSize: 11, color: T.sub, fontFamily: "JetBrains Mono, monospace", marginTop: 2, display: "block" }}>
                          {fmtDt(selected.transaction.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Status & Method Badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: T.surface, borderRadius: 8, marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {(() => {
                          const m = getMethod(selected.transaction.payment_method);
                          return (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, color: m.color, background: m.color + "14" }}>
                              {m.icon} {m.label}
                            </span>
                          );
                        })()}
                        {selected.transaction.customer_name && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>
                            {selected.transaction.customer_name}
                          </span>
                        )}
                      </div>

                      {selected.transaction.status === "CANCELLED" ? (
                        <span style={{ fontSize: 10, fontWeight: 800, color: T.red, background: T.red + "15", padding: "2px 8px", borderRadius: 6 }}>
                          DIBATALKAN
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 800, color: T.green, background: T.green + "12", padding: "2px 8px", borderRadius: 6 }}>
                          SELESAI
                        </span>
                      )}
                    </div>

                    {/* Itemized list */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, paddingBottom: 4, borderBottom: `1px solid ${T.border}` }}>
                        <span>Item Belanja ({selected.items?.length || 0})</span>
                        <span>Subtotal</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {selected.items?.map((item) => (
                          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: 11 }}>
                            <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                              <span style={{ fontWeight: 700, color: T.text, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {item.product_name}
                              </span>
                              <span style={{ fontSize: 10, color: T.muted, fontFamily: "JetBrains Mono, monospace" }}>
                                {item.quantity} {item.unit || "pcs"} × {fmt(item.price_per_unit)}
                              </span>
                            </div>
                            <span style={{ fontWeight: 800, color: T.text, fontFamily: "JetBrains Mono, monospace", flexShrink: 0 }}>
                              {fmt(item.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Financial summary */}
                    <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.sub }}>
                        <span>Subtotal:</span>
                        <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{fmt(selected.transaction.subtotal)}</span>
                      </div>
                      {Number(selected.transaction.discount) > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.green }}>
                          <span>Diskon Promo:</span>
                          <span style={{ fontFamily: "JetBrains Mono, monospace" }}>-{fmt(selected.transaction.discount)}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, paddingTop: 6, borderTop: `1px dashed ${T.border2}` }}>
                        <span style={{ fontSize: 12, fontWeight: 900, color: T.text }}>TOTAL:</span>
                        <span style={{ fontSize: 16, fontWeight: 900, color: T.accent, fontFamily: "JetBrains Mono, monospace" }}>
                          {fmt(selected.transaction.total_amount)}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.muted, marginTop: 2 }}>
                        <span>Dibayar:</span>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", color: T.sub }}>{fmt(selected.transaction.payment_amount)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.muted }}>
                        <span>{selected.transaction.payment_method === "kasbon" ? "Sisa Kasbon:" : "Kembalian:"}</span>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", color: selected.transaction.payment_method === "kasbon" ? T.orange : T.green }}>
                          {selected.transaction.payment_method === "kasbon"
                            ? fmt(Math.max(0, selected.transaction.total_amount - selected.transaction.payment_amount))
                            : fmt(selected.transaction.change_amount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Print & Action Buttons */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button
                      onClick={() => handlePrint("thermal")}
                      style={{
                        padding: "10px",
                        borderRadius: 10,
                        border: `1px solid ${T.green}40`,
                        background: T.green + "14",
                        color: T.green,
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: "pointer",
                        fontFamily: "Syne, sans-serif",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = T.green + "24")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = T.green + "14")}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                      Struk Thermal 58mm
                    </button>

                    <button
                      onClick={() => handlePrint("normal")}
                      style={{
                        padding: "10px",
                        borderRadius: 10,
                        border: `1px solid ${T.blue}40`,
                        background: T.blue + "14",
                        color: T.blue,
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: "pointer",
                        fontFamily: "Syne, sans-serif",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = T.blue + "24")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = T.blue + "14")}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                      Struk Standar (A4)
                    </button>
                  </div>

                  {selected.transaction.status !== "CANCELLED" && (
                    <button
                      onClick={() => setDeleteDialog({ type: "single", id: selected.transaction.id })}
                      style={{
                        padding: "9px",
                        borderRadius: 10,
                        border: `1px solid ${T.red}35`,
                        background: T.red + "10",
                        color: T.red,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "Syne, sans-serif",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = T.red + "20")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = T.red + "10")}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /></svg>
                      Batalkan Nota & Kembalikan Stok Rak
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ─── CANCEL / DELETE CONFIRMATION MODAL ─── */}
      {deleteDialog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Syne, sans-serif",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            style={{
              background: T.surface,
              width: 380,
              borderRadius: 20,
              padding: 24,
              boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
              border: `1px solid ${T.border2}`,
              textAlign: "center",
              animation: "fadeUp 0.3s ease",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: T.red + "15",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: T.red,
                margin: "0 auto 16px",
                border: `1px solid ${T.red}30`,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 17, fontWeight: 800, color: T.text }}>
              {deleteDialog.type === "all" ? "Hapus Seluruh Riwayat Nota?" : "Batalkan Nota Belanja Ini?"}
            </h3>
            <p style={{ margin: "0 0 22px 0", fontSize: 12, color: T.sub, lineHeight: 1.5 }}>
              {deleteDialog.type === "all"
                ? "Seluruh riwayat nota penjualan akan dibersihkan dari database. Tindakan ini biasanya dilakukan sebelum mulai production hari pertama."
                : "Nota ini akan dibatalkan, dan seluruh item belanja akan otomatis dikembalikan ke kartu stok rak toko."}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                onClick={() => setDeleteDialog(null)}
                style={{
                  padding: "11px",
                  borderRadius: 10,
                  background: "transparent",
                  border: `1px solid ${T.border2}`,
                  color: T.sub,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                style={{
                  padding: "11px",
                  borderRadius: 10,
                  background: T.red,
                  border: "none",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: "pointer",
                  boxShadow: `0 4px 12px ${T.red}40`,
                }}
              >
                {deleteDialog.type === "all" ? "Ya, Hapus Semua" : "Ya, Batalkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Transactions;
