import React, { useState, useEffect } from "react";
import {
  getSalesReport,
  getStockReport,
  exportToCSV,
} from "../../services/reports";
import { isPrivacyModeEnabled } from "../../services/settings";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { T } from "../../theme";
import { ReportsIcon } from "../Icons/AppIcons";

const PALETTE = [
  T.accent,
  T.blue,
  T.green,
  T.purple,
  T.red,
  "#EC4899",
  "#14B8A6",
];

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const fmtNum = (n) => Number(n || 0).toLocaleString("id-ID");
const fmtD = (str) => {
  if (!str) return '-';
  // created_at kini disimpan sebagai waktu lokal WIB, parse langsung
  const normalized = typeof str === 'string' ? str.replace(' ', 'T') : str;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return String(str);
  return format(d, 'dd MMM yyyy', { locale: id });
};
const fmtShort = (v) =>
  v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `${(v / 1_000).toFixed(0)}K`
      : v;

// ─── SUBCOMPONENTS ────────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 18,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: T.muted,
        }}
      >
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  );
}

function StatCard({ label, value, sub, accent, index = 0 }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: "20px",
        position: "relative",
        overflow: "hidden",
        animation: `fadeUp 0.4s ease ${index * 60}ms both`,
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -16,
          top: -16,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: accent + "12",
          border: `1px solid ${accent}20`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 8,
          top: 8,
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: accent + "10",
        }}
      />
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
        {label}
      </p>
      <p
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: T.text,
          fontVariantNumeric: "tabular-nums",
          marginBottom: 6,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      {sub && <p style={{ fontSize: 10, color: T.sub }}>{sub}</p>}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${accent}, transparent)`,
        }}
      />
    </div>
  );
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border2}`,
        borderRadius: 10,
        padding: "10px 14px",
        fontFamily: "Syne, sans-serif",
      }}
    >
      <p style={{ fontSize: 10, color: T.sub, marginBottom: 4 }}>{label}</p>
      <p
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: T.accent,
          fontFamily: "JetBrains Mono, monospace",
        }}
      >
        {fmt(payload[0].payload.omzet || payload[0].value)}
      </p>
    </div>
  );
};

const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border2}`,
        borderRadius: 10,
        padding: "10px 14px",
        fontFamily: "Syne, sans-serif",
      }}
    >
      <p style={{ fontSize: 10, color: T.sub, marginBottom: 4 }}>{label}:00</p>
      {payload.map((p, i) => (
        <p
          key={i}
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: p.color,
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {p.name}: {p.name === "Total" ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// Report table
function ReportTable({ headers, rows }) {
  return (
    <div
      style={{
        overflowX: "auto",
        border: `1px solid ${T.border}`,
        borderRadius: 12,
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: "Syne, sans-serif",
        }}
      >
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: T.muted,
                  borderBottom: `1px solid ${T.border}`,
                  background: T.bg,
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              style={{ transition: "background 0.12s" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = T.border + "60")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: "11px 14px",
                    fontSize: 12,
                    borderBottom: `1px solid ${T.border}`,
                    color: cell?.highlight ? cell.color || T.accent : T.sub,
                    fontWeight: cell?.bold ? 800 : 500,
                    fontFamily: cell?.mono
                      ? "JetBrains Mono, monospace"
                      : "Syne, sans-serif",
                    whiteSpace: cell?.noWrap ? "nowrap" : "normal",
                    maxWidth: cell?.maxWidth || "none",
                  }}
                  className={cell?.truncate ? "text-truncate" : ""}
                  title={cell?.truncate ? (cell?.label || cell) : ""}
                >
                  {cell?.label ?? cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── DATE PRESETS ─────────────────────────────────────────────────────────────
const DATE_PRESETS = [
  { label: "Hari Ini", key: "today" },
  { label: "Kemarin", key: "yesterday" },
  { label: "7 Hari", key: "7d" },
  { label: "30 Hari", key: "30d" },
  { label: "Bulan Ini", key: "month" },
  { label: "Bulan Lalu", key: "lastMonth" },
];

function applyPreset(key) {
  const today = new Date();
  
  // Create a helper to return a Date with only the local year, month, and day info
  // and set time to noon to avoid daylight saving or timezone edge cases when doing math
  const getLocalMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);

  let start = getLocalMidnight(today);
  let end = getLocalMidnight(today);

  if (key === "yesterday") {
    start.setDate(start.getDate() - 1);
    end = new Date(start);
  } else if (key === "7d") {
    start.setDate(start.getDate() - 6);
  } else if (key === "30d") {
    start.setDate(start.getDate() - 29);
  } else if (key === "month") {
    start = new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0);
  } else if (key === "lastMonth") {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1, 12, 0, 0);
    end = new Date(today.getFullYear(), today.getMonth(), 0, 12, 0, 0);
  }
  
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  };
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
function Reports() {
  const [tab, setTab] = useState("sales");
  const [loading, setLoading] = useState(false);
  const [salesReport, setSalesReport] = useState(null);
  const [stockReport, setStockReport] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(new Date().setDate(1)), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [hideCost, setHideCost] = useState(false);

  const loadSalesReport = async (range = dateRange) => {
    setLoading(true);
    setSalesReport(await getSalesReport(range.startDate, range.endDate));
    setLoading(false);
  };

  useEffect(() => {
    loadSalesReport();
    checkPrivacy();
  }, []);

  const checkPrivacy = async () => {
    setHideCost(await isPrivacyModeEnabled());
  };

  const loadStockReport = async () => {
    setLoading(true);
    setStockReport(await getStockReport());
    setLoading(false);
  };

  const handleTabChange = (t) => {
    setTab(t);
    if (t === "sales" && !salesReport) loadSalesReport();
    if (t === "stock" && !stockReport) loadStockReport();
  };

  const handlePreset = (key) => {
    const range = applyPreset(key);
    setDateRange(range);
    setShowDatePicker(false);
    loadSalesReport(range);
  };

  const handleExport = () => {
    if (tab === "sales" && salesReport?.dailySales)
      exportToCSV(
        salesReport.dailySales,
        `laporan_penjualan_${dateRange.startDate}_${dateRange.endDate}`,
      );
    else if (tab === "stock" && stockReport?.stockByCategory)
      exportToCSV(stockReport.stockByCategory, "laporan_stok");
  };

  const s = salesReport?.summary;
  const sk = stockReport?.summary;

  return (
    <>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

        .tab-btn { transition: all 0.15s; cursor: pointer; }
        .tab-btn:hover { color: ${T.text} !important; }
        .action-btn { transition: all 0.15s; cursor: pointer; display:inline-flex; align-items:center; gap:7px; }
        .date-preset:hover { background: ${T.border2} !important; color: ${T.text} !important; }
        .r-scroll::-webkit-scrollbar { width:3px; height:3px; }
        .r-scroll::-webkit-scrollbar-thumb { background:${T.border2}; border-radius:3px; }
        input[type=date] { color-scheme: dark; }
        .text-truncate {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @media print {
          body { margin: 0; padding: 0; background: #fff !important; color: #000 !important; }
          * { visibility: hidden; }
          .report-container, .report-container * {
            visibility: visible;
            color: #000 !important;
            background: #fff !important;
            border-color: #ddd !important;
            box-shadow: none !important;
          }
          .report-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 10px !important;
            margin: 0 !important;
          }
          .no-print, .no-print * {
            display: none !important;
          }
          /* Hide charts on print for cleaner table look */
          .recharts-wrapper { display: none !important; }
        }
      `}</style>

      <div
        className="report-container"
        style={{
          fontFamily: "Syne, sans-serif",
          animation: "fadeUp 0.4s ease both",
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <ReportsIcon />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.01em' }}>Laporan</h1>
          </div>
          <div className="no-print" style={{ display: "flex", gap: 8 }}>
            <button
              className="action-btn"
              onClick={handleExport}
              style={{
                padding: "7px 14px",
                borderRadius: 9,
                border: `1px solid ${T.green}35`,
                background: T.green + "10",
                color: T.green,
                fontFamily: "Syne, sans-serif",
                fontSize: 11,
                fontWeight: 700,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = T.green + "20")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = T.green + "10")
              }
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Export CSV
            </button>
            <button
              className="action-btn"
              onClick={() => window.print()}
              style={{
                padding: "7px 14px",
                borderRadius: 9,
                border: `1px solid ${T.blue}35`,
                background: T.blue + "10",
                color: T.blue,
                fontFamily: "Syne, sans-serif",
                fontSize: 11,
                fontWeight: 700,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = T.blue + "20")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = T.blue + "10")
              }
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              Cetak
            </button>
          </div>
        </div>

        {/* ── TABS ── */}
        <div
          style={{
            display: "flex",
            gap: 4,
            borderBottom: `1px solid ${T.border}`,
            marginBottom: 20,
          }}
        >
          {[
            {
              key: "sales",
              label: "Penjualan",
              icon: (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2 11L5 7l2.5 2.5L11 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ),
            },
            {
              key: "stock",
              label: "Stok",
              icon: (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect
                    x="1"
                    y="8"
                    width="3"
                    height="5"
                    rx="1"
                    fill="currentColor"
                    opacity="0.5"
                  />
                  <rect
                    x="5.5"
                    y="5"
                    width="3"
                    height="8"
                    rx="1"
                    fill="currentColor"
                    opacity="0.8"
                  />
                  <rect
                    x="10"
                    y="2"
                    width="3"
                    height="11"
                    rx="1"
                    fill="currentColor"
                  />
                </svg>
              ),
            },
          ].map(({ key, label, icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                className="tab-btn"
                onClick={() => handleTabChange(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "10px 16px",
                  borderRadius: "10px 10px 0 0",
                  border: "none",
                  borderBottom: `2px solid ${active ? T.accent : "transparent"}`,
                  background: active ? T.accent + "08" : "transparent",
                  color: active ? T.accent : T.sub,
                  fontFamily: "Syne, sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </div>

        {/* ── DATE PICKER (sales) ── */}
        {tab === "sales" && (
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {/* Preset chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.key}
                  className="date-preset"
                  onClick={() => handlePreset(p.key)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 8,
                    border: `1px solid ${T.border2}`,
                    background: T.bg,
                    color: T.sub,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    fontFamily: "Syne, sans-serif",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ width: 1, height: 20, background: T.border2 }} />

            {/* Custom range toggle */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowDatePicker((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "6px 13px",
                  borderRadius: 9,
                  border: `1px solid ${showDatePicker ? T.accent + "50" : T.border2}`,
                  background: showDatePicker ? T.accent + "0E" : T.bg,
                  color: showDatePicker ? T.accent : T.sub,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect
                    x="1"
                    y="2"
                    width="10"
                    height="9"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                  <path
                    d="M4 1v2M8 1v2M1 5h10"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
                {fmtD(dateRange.startDate)} → {fmtD(dateRange.endDate)}
              </button>

              {showDatePicker && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    zIndex: 50,
                    background: T.surface,
                    border: `1px solid ${T.border2}`,
                    borderRadius: 12,
                    padding: "16px",
                    width: 220,
                    boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                    animation: "fadeUp 0.2s ease both",
                  }}
                >
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
                    Pilih Manual
                  </p>
                  {["startDate", "endDate"].map((k) => (
                    <div key={k} style={{ marginBottom: 10 }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 9,
                          color: T.muted,
                          marginBottom: 5,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        {k === "startDate" ? "Dari" : "Sampai"}
                      </label>
                      <input
                        type="date"
                        value={dateRange[k]}
                        onChange={(e) =>
                          setDateRange((prev) => ({
                            ...prev,
                            [k]: e.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          borderRadius: 8,
                          border: `1px solid ${T.border2}`,
                          background: T.bg,
                          color: T.text,
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 12,
                          outline: "none",
                        }}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      loadSalesReport();
                      setShowDatePicker(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: 9,
                      border: `1px solid ${T.accent}40`,
                      background: T.accent + "14",
                      color: T.accent,
                      fontFamily: "Syne, sans-serif",
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Terapkan
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => loadSalesReport()}
              style={{
                padding: "6px 14px",
                borderRadius: 9,
                marginLeft: "auto",
                border: `1px solid ${T.accent}35`,
                background: T.accent + "12",
                color: T.accent,
                fontFamily: "Syne, sans-serif",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = T.accent + "22")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = T.accent + "12")
              }
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle
                  cx="5"
                  cy="5"
                  r="3.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M8 8l2.5 2.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              Tampilkan
            </button>
          </div>
        )}

        {/* ── LOADING ── */}
        {loading && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: 240,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
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
                }}
              >
                Memuat laporan…
              </p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            SALES REPORT
        ══════════════════════════════════════════════ */}
        {tab === "sales" && salesReport && !loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Stat cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: hideCost ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
                gap: 14,
              }}
            >
              <StatCard
                index={0}
                label="Total Penjualan"
                accent={T.accent}
                value={`Rp ${fmtShort(s.total_sales)}`}
                sub="Periode terpilih"
              />
              <StatCard
                index={1}
                label="Jumlah Transaksi"
                accent={T.green}
                value={fmtNum(s.total_transactions)}
                sub="Transaksi selesai"
              />
              {!hideCost && (
                <>
                  <StatCard
                    index={2}
                    label="Rata-rata Transaksi"
                    accent={T.blue}
                    value={`Rp ${fmtShort(s.average_sales)}`}
                    sub="Per transaksi"
                  />
                  <StatCard
                    index={3}
                    label="Hari Aktif"
                    accent={T.purple}
                    value={`${s.active_days} hari`}
                    sub="Ada transaksi"
                  />
                </>
              )}
            </div>

            {/* Area chart + Pie chart */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 300px",
                gap: 14,
              }}
            >
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 14,
                  padding: "20px 22px",
                }}
              >
                <SectionTitle>Tren Penjualan Harian</SectionTitle>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart
                    data={salesReport.dailySales}
                    margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={T.accent}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor={T.accent}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="2 6"
                      stroke={T.border}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={fmtD}
                      tick={{
                        fill: T.muted,
                        fontSize: 10,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={fmtShort}
                      tick={{
                        fill: T.muted,
                        fontSize: 10,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{
                        stroke: T.accent,
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="omzet"
                      stroke={T.accent}
                      strokeWidth={2.5}
                      fill="url(#gS)"
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: T.accent,
                        stroke: T.bg,
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Payment pie */}
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 14,
                  padding: "20px 18px",
                }}
              >
                <SectionTitle>Metode Bayar</SectionTitle>
                <ResponsiveContainer width="100%" height={160}>
                  <RePieChart>
                    <Pie
                      data={salesReport.paymentMethods}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      dataKey="count"
                      paddingAngle={4}
                      startAngle={90}
                      endAngle={-270}
                    >
                      {salesReport.paymentMethods.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PALETTE[i % PALETTE.length]}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: T.surface,
                        border: `1px solid ${T.border2}`,
                        borderRadius: 10,
                        fontFamily: "Syne, sans-serif",
                        fontSize: 12,
                      }}
                      itemStyle={{ color: T.text }}
                      labelStyle={{ color: T.sub }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  {salesReport.paymentMethods.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: PALETTE[i % PALETTE.length],
                            display: "inline-block",
                          }}
                        />
                        <span
                          style={{
                            fontSize: 11,
                            color: T.sub,
                            textTransform: "capitalize",
                          }}
                        >
                          {m.name}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: T.text,
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        {m.count}x
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Peak hours bar */}
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: "20px 22px",
              }}
            >
              <SectionTitle>Jam Sibuk</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={salesReport.peakHours}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="2 6"
                    stroke={T.border}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(h) => `${h}:00`}
                    tick={{
                      fill: T.muted,
                      fontSize: 10,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="l"
                    orientation="left"
                    tick={{ fill: T.muted, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="r"
                    orientation="right"
                    tick={{ fill: T.muted, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={fmtShort}
                  />
                  <Tooltip content={<BarTooltip />} />
                  <Bar
                    yAxisId="l"
                    dataKey="transaction_count"
                    name="Transaksi"
                    fill={T.blue}
                    radius={[4, 4, 0, 0]}
                  />
                  {!hideCost && (
                    <Bar
                      yAxisId="r"
                      dataKey="omzet"
                      name="Total"
                      fill={T.accent}
                      radius={[4, 4, 0, 0]}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top products table */}
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: "20px 22px",
              }}
            >
              <SectionTitle>10 Produk Terlaris</SectionTitle>
              <ReportTable
                headers={
                  hideCost
                    ? ["#", "Produk", "Terjual", "Frekuensi"]
                    : ["#", "Produk", "Terjual", "Frekuensi", "Total Penjualan"]
                }
                rows={salesReport.topProducts.map((p, i) => {
                  const baseRow = [
                    { label: i + 1, mono: true, color: T.muted },
                    { label: p.product_name, bold: true, color: T.text, truncate: true, maxWidth: 200 },
                    { label: `${p.total_quantity} item`, mono: true },
                    { label: `${p.times_sold}×`, mono: true },
                  ];
                  if (!hideCost) {
                    baseRow.push({
                      label: fmt(p.total_sales),
                      highlight: true,
                      mono: true,
                      bold: true,
                    });
                  }
                  return baseRow;
                })}
              />
            </div>

            {/* Top categories table */}
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: "20px 22px",
              }}
            >
              <SectionTitle>Penjualan per Kategori</SectionTitle>
              <ReportTable
                headers={
                  hideCost
                    ? ["Kategori", "Produk", "Item Terjual"]
                    : ["Kategori", "Produk", "Item Terjual", "Total Penjualan"]
                }
                rows={salesReport.topCategories.map((c) => {
                  const baseRow = [
                    { label: c.category_name, bold: true, color: T.text, truncate: true, maxWidth: 180 },
                    { label: `${c.product_count} produk`, mono: true },
                    { label: `${c.total_quantity} item`, mono: true },
                  ];
                  if (!hideCost) {
                    baseRow.push({
                      label: fmt(c.total_sales),
                      highlight: true,
                      mono: true,
                      bold: true,
                    });
                  }
                  return baseRow;
                })}
              />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            STOCK REPORT
        ══════════════════════════════════════════════ */}
        {tab === "stock" && stockReport && !loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Stat cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 14,
              }}
            >
              <StatCard
                index={0}
                label="Total Produk"
                accent={T.blue}
                value={fmtNum(sk.total_products)}
                sub="Produk terdaftar"
              />
              <StatCard
                index={1}
                label="Total Stok (Pcs)"
                accent={T.green}
                value={`${fmtNum(sk.total_stock)} pcs`}
                sub="Item satuan"
              />
              <StatCard
                index={2}
                label="Total Stok (Kg)"
                accent={T.purple}
                value={`${Number(sk.total_stock_kg || 0).toFixed(2)} kg`}
                sub="Item timbangan"
              />
              <StatCard
                index={3}
                label="Stok Menipis"
                accent={T.accent}
                value={sk.low_stock_count}
                sub={`${sk.out_of_stock_count} habis`}
              />
            </div>

            {/* Stock by category */}
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: "20px 22px",
              }}
            >
              <SectionTitle>Stok per Kategori</SectionTitle>
              <ReportTable
                headers={[
                  "Kategori",
                  "Produk",
                  "Total Stok",
                ]}
                rows={stockReport.stockByCategory.map((c) => [
                  { label: c.category_name, bold: true, color: T.text, truncate: true, maxWidth: 180 },
                  { label: `${c.product_count}`, mono: true },
                  { label: `${c.total_stock} pcs / ${Number(c.total_stock_kg || 0).toFixed(2)} kg`, mono: true },
                ])}
              />
            </div>

            {/* Low stock table */}
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: "20px 22px",
              }}
            >
              <SectionTitle>Produk Stok Menipis / Habis</SectionTitle>

              {stockReport.lowStock.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <svg
                    width="44"
                    height="44"
                    viewBox="0 0 44 44"
                    fill="none"
                    style={{ margin: "0 auto 10px", opacity: 0.2 }}
                  >
                    <rect
                      x="6"
                      y="6"
                      width="32"
                      height="32"
                      rx="4"
                      stroke={T.sub}
                      strokeWidth="2"
                    />
                    <path
                      d="M14 22h16M22 14v16"
                      stroke={T.sub}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <p style={{ fontSize: 13, fontWeight: 700, color: T.muted }}>
                    Semua stok aman
                  </p>
                </div>
              ) : (
                <ReportTable
                  headers={["Produk", "Kategori", "Stok Tersedia", "Ambang Batas", "Status"]}
                  rows={stockReport.lowStock.map((p) => {
                    const isHybrid = p.has_unit_price && p.has_weight_price;
                    const isKg = p.sell_per_unit === 'kg';
                    
                    let currentLabel, minLabel, isOut;
                    
                    if (isHybrid) {
                      isOut = p.total_stock <= 0 && p.total_stock_kg <= 0;
                      currentLabel = `${p.total_stock} pcs / ${Number(p.total_stock_kg || 0).toFixed(2)} kg`;
                      minLabel = `${p.min_stock} pcs / ${Number(p.min_stock_kg || 0).toFixed(2)} kg`;
                    } else {
                      const current = isKg ? p.total_stock_kg : p.total_stock;
                      const min = isKg ? p.min_stock_kg : p.min_stock;
                      const unit = isKg ? 'kg' : 'pcs';
                      isOut = current <= 0;
                      currentLabel = `${isKg ? Number(current || 0).toFixed(2) : current} ${unit}`;
                      minLabel = `${isKg ? Number(min || 0).toFixed(2) : min} ${unit}`;
                    }

                    return [
                      { label: p.name, bold: true, color: T.text, truncate: true, maxWidth: 220 },
                      { label: p.category_name, truncate: true, maxWidth: 150 },
                      {
                        label: currentLabel,
                        mono: true,
                        highlight: true,
                        color: isOut ? T.red : T.accent,
                        bold: true,
                        noWrap: true
                      },
                      { label: minLabel, mono: true, noWrap: true },
                      {
                        label: (
                          <span
                            style={{
                              padding: "2px 9px",
                              borderRadius: 100,
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              background: isOut
                                ? T.red + "12"
                                : T.accent + "12",
                              border: `1px solid ${isOut ? T.red : T.accent}30`,
                              color: isOut ? T.red : T.accent,
                            }}
                          >
                            {isOut ? "Habis" : "Menipis"}
                          </span>
                        ),
                      },
                    ];
                  })}
                />
              )}
            </div>
          </div>
        )}

        {/* Empty state when no data loaded yet */}
        {!loading &&
          ((tab === "sales" && !salesReport) ||
            (tab === "stock" && !stockReport)) && (
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 24px",
                gap: 12,
              }}
            >
              <svg
                width="52"
                height="52"
                viewBox="0 0 52 52"
                fill="none"
                opacity="0.18"
              >
                <path
                  d="M10 40V20l16-12 16 12v20H10z"
                  stroke={T.sub}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 40V28h12v12"
                  stroke={T.sub}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
              <p style={{ fontSize: 14, fontWeight: 700, color: T.muted }}>
                Belum ada data
              </p>
              <p style={{ fontSize: 11, color: T.muted + "80" }}>
                {tab === "sales"
                  ? "Pilih rentang tanggal dan klik Tampilkan"
                  : "Klik Muat Laporan untuk melihat data stok"}
              </p>
              {tab === "stock" && (
                <button
                  onClick={loadStockReport}
                  style={{
                    marginTop: 4,
                    padding: "9px 18px",
                    borderRadius: 10,
                    border: `1px solid ${T.accent}35`,
                    background: T.accent + "12",
                    color: T.accent,
                    fontFamily: "Syne, sans-serif",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Muat Laporan Stok
                </button>
              )}
            </div>
          )}
      </div>
    </>
  );
}

export default Reports;
