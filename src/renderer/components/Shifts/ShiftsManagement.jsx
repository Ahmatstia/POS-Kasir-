import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { T } from "../../theme";
import {
  getCurrentShift,
  openShift,
  closeShift,
  recordCashMovement,
  getCashMovements,
  getShiftHistory,
  getShiftById,
  cancelOrDeleteShift,
} from "../../services/shifts";
import { getStoreProfile } from "../../services/settings";
import { printShiftReceipt } from "../../utils/PrintUtility";
import { useToast } from "../Toast";
import { formatNominal, parseNominal } from "../../utils/format";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function ShiftsManagement() {
  const { showToast } = useToast();

  const [activeShift, setActiveShift] = useState(null);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [storeProfile, setStoreProfile] = useState(null);

  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState("OUT"); // "IN" or "OUT"
  const [selectedShiftDetail, setSelectedShiftDetail] = useState(null);

  useEffect(() => {
    loadData();
    getStoreProfile().then((p) => setStoreProfile(p));
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const current = await getCurrentShift();
      setActiveShift(current);

      if (current) {
        const movs = await getCashMovements(current.id);
        setMovements(movs);
      } else {
        setMovements([]);
      }

      const history = await getShiftHistory(30);
      setShiftHistory(history);
    } catch (err) {
      console.error("Gagal memuat data shift:", err);
      showToast("error", "Gagal memuat data shift");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (shift, summary = null, movs = []) => {
    printShiftReceipt(shift, summary, movs, storeProfile);
    showToast("success", "Mencetak struk rekap shift...");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      {/* ─── HEADER ─── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: T.text,
              margin: "0 0 6px",
              fontFamily: "Syne, sans-serif",
            }}
          >
            Shift Kasir
          </h1>
          <p style={{ fontSize: 13, color: T.sub, margin: 0 }}>
            Kelola modal awal kembalian, pantau uang laci real-time, dan cocokkan fisik uang saat tutup toko.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {activeShift ? (
            <>
              <button
                onClick={() => {
                  setMovementType("IN");
                  setShowMovementModal(true);
                }}
                style={{
                  padding: "9px 15px",
                  borderRadius: 10,
                  border: `1px solid ${T.accent}40`,
                  background: T.accentBg,
                  color: T.accent,
                  fontFamily: "Syne, sans-serif",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s",
                }}
              >
                💸 Catat Kas Masuk / Keluar
              </button>
              {((activeShift.summary?.transactionCount || 0) === 0 && (activeShift.summary?.debtCollected || 0) === 0) && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  title="Batalkan pembukaan shift ini jika salah input (hanya bisa jika belum ada transaksi belanja)"
                  style={{
                    padding: "9px 14px",
                    borderRadius: 10,
                    border: `1px solid ${T.muted}40`,
                    background: "transparent",
                    color: T.muted,
                    fontFamily: "Syne, sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = T.red;
                    e.currentTarget.style.borderColor = T.red + "50";
                    e.currentTarget.style.background = T.red + "10";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = T.muted;
                    e.currentTarget.style.borderColor = T.muted + "40";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  ✕ Batal Buka Shift
                </button>
              )}
              <button
                onClick={() => setShowCloseModal(true)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: T.red,
                  color: "#fff",
                  fontFamily: "Syne, sans-serif",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: `0 4px 14px ${T.red}40`,
                  transition: "all 0.15s",
                }}
              >
                🔒 Tutup Kasir & Hitung Laci
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowOpenModal(true)}
              style={{
                padding: "11px 20px",
                borderRadius: 12,
                border: "none",
                background: T.green,
                color: "#fff",
                fontFamily: "Syne, sans-serif",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: `0 4px 16px ${T.green}40`,
                transition: "all 0.15s",
              }}
            >
            Buka Shift Kasir Baru
            </button>
          )}
        </div>
      </div>

      {/* ─── ACTIVE SHIFT CARD / HERO ─── */}
      {activeShift ? (
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border2}`,
            borderRadius: 18,
            padding: 24,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
          }}
        >
          {/* Status Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 12px",
                  borderRadius: 100,
                  background: T.green + "18",
                  border: `1px solid ${T.green}40`,
                  color: T.green,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Shift Sedang Aktif (#{activeShift.id})
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                Petugas: <b style={{ color: T.accent }}>{activeShift.cashier_name}</b>
              </span>
              <span style={{ fontSize: 12, color: T.muted }}>
                Dibuka: {activeShift.opened_at}
              </span>
            </div>

            <button
              onClick={() => handlePrint(activeShift, activeShift.summary, movements)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: `1px solid ${T.border2}`,
                background: T.bg,
                color: T.sub,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              🖨 Cetak Rekap Berjalan
            </button>
          </div>

          {/* Metric Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {/* Modal Awal */}
            <div
              style={{
                padding: "16px 18px",
                borderRadius: 14,
                background: T.bg,
                border: `1px solid ${T.border}`,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 800, color: T.sub, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Modal Awal Kembalian
              </span>
              <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 800, color: T.text, fontFamily: "JetBrains Mono, monospace" }}>
                {fmt(activeShift.summary?.startingCash)}
              </p>
            </div>

            {/* Penjualan Tunai */}
            <div
              style={{
                padding: "16px 18px",
                borderRadius: 14,
                background: T.bg,
                border: `1px solid ${T.border}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: T.sub, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Penjualan Tunai (+)
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, color: T.green, background: T.green + "15", padding: "1px 6px", borderRadius: 6 }}>
                  {activeShift.summary?.cashTxCount || 0} nota
                </span>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 800, color: T.green, fontFamily: "JetBrains Mono, monospace" }}>
                {fmt(activeShift.summary?.cashSales)}
              </p>
            </div>

            {/* Kas Masuk / Keluar Laci */}
            <div
              style={{
                padding: "16px 18px",
                borderRadius: 14,
                background: T.bg,
                border: `1px solid ${T.border}`,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 800, color: T.sub, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Arus Kas Laci Lainnya
              </span>
              <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                <div>
                  <span style={{ fontSize: 10, color: T.blue }}>Masuk: </span>
                  <b style={{ fontSize: 13, color: T.blue, fontFamily: "JetBrains Mono, monospace" }}>
                    +{fmt(activeShift.summary?.totalCashIn)}
                  </b>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: T.orange }}>Keluar: </span>
                  <b style={{ fontSize: 13, color: T.orange, fontFamily: "JetBrains Mono, monospace" }}>
                    -{fmt(activeShift.summary?.totalCashOut)}
                  </b>
                </div>
              </div>
            </div>

            {/* Total Uang Seharusnya di Laci */}
            <div
              style={{
                padding: "16px 18px",
                borderRadius: 14,
                background: `linear-gradient(135deg, ${T.accent}12, ${T.accent}05)`,
                border: `1.5px solid ${T.accent}45`,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 800, color: T.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                💵 Uang Seharusnya di Laci
              </span>
              <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 900, color: T.accent, fontFamily: "JetBrains Mono, monospace" }}>
                {fmt(activeShift.summary?.expectedCash)}
              </p>
            </div>
          </div>

          {/* Sub Info: Non-Tunai & Kasbon */}
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: T.bg,
              border: `1px solid ${T.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              fontSize: 12,
            }}
          >
            <div style={{ display: "flex", gap: 20 }}>
              <span style={{ color: T.text, fontWeight: 600 }}>
                Penjualan Non-Tunai (QRIS/Debit):{" "}
                <b style={{ color: T.purple, fontFamily: "JetBrains Mono, monospace" }}>
                  {fmt(activeShift.summary?.nonCashSales)}
                </b>{" "}
                <span style={{ color: T.sub, fontWeight: 500 }}>({activeShift.summary?.nonCashTxCount || 0} nota)</span>
              </span>
              {activeShift.summary?.debtCollected > 0 && (
                <span style={{ color: T.text, fontWeight: 600 }}>
                  📒 Pembayaran Kasbon Masuk:{" "}
                  <b style={{ color: T.green, fontFamily: "JetBrains Mono, monospace" }}>
                    +{fmt(activeShift.summary?.debtCollected)}
                  </b>
                </span>
              )}
            </div>
            <span style={{ color: T.sub, fontSize: 11, fontWeight: 600 }}>
              💡 Non-tunai langsung masuk rekening/e-wallet, tidak memengaruhi fisik laci.
            </span>
          </div>

          {/* Mutasi Uang Laci Terkini */}
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text, margin: 0 }}>
                Catatan Uang Masuk / Keluar Laci (Shift Ini)
              </h3>
              <span style={{ fontSize: 11, color: T.muted }}>{movements.length} catatan</span>
            </div>

            {movements.length === 0 ? (
              <p style={{ fontSize: 12, color: T.muted, fontStyle: "italic", margin: "8px 0" }}>
                Belum ada pengeluaran atau pemasukan uang di luar transaksi belanja.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {movements.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: m.type === "IN" ? T.blue + "15" : T.orange + "15",
                          color: m.type === "IN" ? T.blue : T.orange,
                          border: `1px solid ${m.type === "IN" ? T.blue : T.orange}35`,
                        }}
                      >
                        {m.type === "IN" ? "KAS MASUK" : "KAS KELUAR"}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
                        {m.reason}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ fontSize: 11, color: T.muted }}>
                        {m.created_at?.split(" ")[1] || m.created_at}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          fontFamily: "JetBrains Mono, monospace",
                          color: m.type === "IN" ? T.blue : T.orange,
                        }}
                      >
                        {m.type === "IN" ? "+" : "-"}
                        {fmt(m.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty Active Shift Banner */
        <div
          style={{
            background: T.surface,
            border: `1px dashed ${T.border2}`,
            borderRadius: 18,
            padding: "36px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: T.accent + "15",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
            }}
          >
            🏪
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0 }}>
            Belum Ada Shift Kasir yang Buka
          </h2>
          <p style={{ fontSize: 13, color: T.sub, maxWidth: 480, margin: 0 }}>
            Buka shift kasir terlebih dahulu dengan memasukkan modal uang kembalian di laci sebelum memulai melayani pelanggan di kasir.
          </p>
          <button
            onClick={() => setShowOpenModal(true)}
            style={{
              marginTop: 6,
              padding: "11px 22px",
              borderRadius: 12,
              border: "none",
              background: T.green,
              color: "#fff",
              fontFamily: "Syne, sans-serif",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: `0 4px 16px ${T.green}40`,
            }}
          >
          Buka Shift Kasir Sekarang
          </button>
        </div>
      )}

      {/* ─── SHIFT HISTORY TABLE ─── */}
      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 18,
          padding: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: T.text, margin: 0 }}>
              Riwayat Tutup Kasir & Shift Terdahulu
            </h2>
            <p style={{ fontSize: 12, color: T.sub, margin: "2px 0 0" }}>
              Rekam jejak uang modal, hasil jualan, dan selisih kas laci setiap shift.
            </p>
          </div>
          <button
            onClick={loadData}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: `1px solid ${T.border2}`,
              background: T.bg,
              color: T.sub,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ↻ Segarkan
          </button>
        </div>

        {shiftHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: T.muted }}>
            <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>📋</span>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Belum ada riwayat shift yang tercatat.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}`, color: T.sub }}>
                  <th style={{ padding: "10px 12px", fontWeight: 800, textTransform: "uppercase", fontSize: 11 }}>Shift #</th>
                  <th style={{ padding: "10px 12px", fontWeight: 800, textTransform: "uppercase", fontSize: 11 }}>Kasir</th>
                  <th style={{ padding: "10px 12px", fontWeight: 800, textTransform: "uppercase", fontSize: 11 }}>Waktu</th>
                  <th style={{ padding: "10px 12px", fontWeight: 800, textTransform: "uppercase", fontSize: 11 }}>Modal Awal</th>
                  <th style={{ padding: "10px 12px", fontWeight: 800, textTransform: "uppercase", fontSize: 11 }}>Penjualan Tunai</th>
                  <th style={{ padding: "10px 12px", fontWeight: 800, textTransform: "uppercase", fontSize: 11 }}>Uang Seharusnya</th>
                  <th style={{ padding: "10px 12px", fontWeight: 800, textTransform: "uppercase", fontSize: 11 }}>Uang Fisik Dihitung</th>
                  <th style={{ padding: "10px 12px", fontWeight: 800, textTransform: "uppercase", fontSize: 11 }}>Selisih Kas</th>
                  <th style={{ padding: "10px 12px", fontWeight: 800, textTransform: "uppercase", fontSize: 11, textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {shiftHistory.map((s) => {
                  const isClosed = s.status === "CLOSED";
                  const diff = Number(s.difference) || 0;
                  let diffColor = T.green;
                  let diffText = "Pas (Rp 0)";
                  if (diff < 0) {
                    diffColor = T.red;
                    diffText = `Kurang (${fmt(Math.abs(diff))})`;
                  } else if (diff > 0) {
                    diffColor = T.blue;
                    diffText = `Lebih (+${fmt(diff)})`;
                  }

                  return (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: `1px solid ${T.border}`,
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = T.bg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "12px", fontWeight: 800, color: T.accent }}>
                        #{s.id}
                        {!isClosed && (
                          <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: T.green + "20", color: T.green }}>
                            AKTIF
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px", fontWeight: 700, color: T.text }}>
                        {s.cashier_name}
                      </td>
                      <td style={{ padding: "12px", color: T.sub, fontSize: 11 }}>
                        <div style={{ fontWeight: 600 }}>{s.opened_at?.split(" ")[0]}</div>
                        <div style={{ color: T.muted }}>
                          {s.opened_at?.split(" ")[1]} s/d {s.closed_at ? s.closed_at.split(" ")[1] : "sekarang"}
                        </div>
                      </td>
                      <td style={{ padding: "12px", fontFamily: "JetBrains Mono, monospace", color: T.text, fontWeight: 700 }}>
                        {fmt(s.starting_cash)}
                      </td>
                      <td style={{ padding: "12px", fontFamily: "JetBrains Mono, monospace", color: T.green, fontWeight: 800 }}>
                        {fmt(s.cash_sales)}
                      </td>
                      <td style={{ padding: "12px", fontFamily: "JetBrains Mono, monospace", color: isClosed ? T.text : T.muted, fontWeight: 700 }}>
                        {isClosed ? fmt(s.expected_cash) : "-"}
                      </td>
                      <td style={{ padding: "12px", fontFamily: "JetBrains Mono, monospace", color: isClosed ? T.text : T.muted, fontWeight: 800 }}>
                        {isClosed ? fmt(s.actual_cash) : "-"}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isClosed ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: diffColor,
                              padding: "3px 8px",
                              borderRadius: 6,
                              background: diffColor + "15",
                              border: `1px solid ${diffColor}30`,
                            }}
                          >
                            {diffText}
                          </span>
                        ) : (
                          <span style={{ color: T.accent, background: T.accent + '15', fontWeight: 700, fontSize: 10, padding: '3px 8px', borderRadius: 6 }}>Sedang Berjalan</span>
                        )}
                      </td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button
                            onClick={async () => {
                              const full = await getShiftById(s.id);
                              setSelectedShiftDetail(full);
                            }}
                            style={{
                              padding: "5px 10px",
                              borderRadius: 7,
                              border: `1px solid ${T.border2}`,
                              background: T.bg,
                              color: T.sub,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Detail
                          </button>
                          <button
                            onClick={async () => {
                              const full = await getShiftById(s.id);
                              handlePrint(s, null, full?.movements || []);
                            }}
                            title="Cetak Struk Rekap Shift"
                            style={{
                              padding: "5px 8px",
                              borderRadius: 7,
                              border: `1px solid ${T.accent}35`,
                              background: T.accent + "10",
                              color: T.accent,
                              fontSize: 11,
                              cursor: "pointer",
                            }}
                          >
                            🖨
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODALS ─── */}
      {showOpenModal && (
        <OpenShiftModal
          onClose={() => setShowOpenModal(false)}
          onSuccess={() => {
            setShowOpenModal(false);
            loadData();
            showToast("success", "Shift kasir berhasil dibuka!");
          }}
        />
      )}

      {showMovementModal && activeShift && (
        <CashMovementModal
          shiftId={activeShift.id}
          initialType={movementType}
          onClose={() => setShowMovementModal(false)}
          onSuccess={() => {
            setShowMovementModal(false);
            loadData();
            showToast("success", "Catatan uang laci berhasil disimpan!");
          }}
        />
      )}

      {showCloseModal && activeShift && (
        <CloseShiftModal
          shift={activeShift}
          movements={movements}
          onClose={() => setShowCloseModal(false)}
          onSuccess={(closedData) => {
            setShowCloseModal(false);
            loadData();
            showToast("success", "Shift kasir resmi ditutup!");
            if (closedData.autoPrint) {
              handlePrint(closedData.shift, closedData.summary, movements);
            }
          }}
        />
      )}

      {showCancelModal && activeShift && (
        <CancelShiftModal
          shift={activeShift}
          onClose={() => setShowCancelModal(false)}
          onSuccess={() => {
            setShowCancelModal(false);
            loadData();
            showToast("info", "Pembukaan shift kasir berhasil dibatalkan.");
          }}
        />
      )}

      {selectedShiftDetail && (
        <ShiftDetailModal
          shift={selectedShiftDetail}
          onClose={() => setSelectedShiftDetail(null)}
          onPrint={() => handlePrint(selectedShiftDetail, null, selectedShiftDetail.movements)}
        />
      )}
    </div>
  );
}

// ─── MODAL BATALKAN PEMBUKAAN SHIFT ──────────────────────────────────────────
export function CancelShiftModal({ shift, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const txCount = (shift.summary?.transactionCount || 0);
  const debtColl = (shift.summary?.debtCollected || 0);
  const canCancel = txCount === 0 && debtColl === 0;

  const handleConfirm = async () => {
    if (loading || !canCancel) return;
    setLoading(true);
    const res = await cancelOrDeleteShift(shift.id);
    setLoading(false);
    if (res.success) {
      onSuccess();
    } else {
      alert(res.message);
    }
  };

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "Syne, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: T.surface,
          border: `1px solid ${T.border2}`,
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.45)",
          animation: "modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: canCancel ? T.orange + "15" : T.red + "15",
              border: `1px solid ${canCancel ? T.orange : T.red}35`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            {canCancel ? "⚠️" : "🚫"}
          </div>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: T.text, margin: 0 }}>
              {canCancel ? "Batalkan Pembukaan Shift?" : "Shift Tidak Dapat Dibatalkan"}
            </h3>
            <p style={{ fontSize: 11, color: T.muted, margin: "2px 0 0" }}>
              Shift #{shift.id} • Petugas: {shift.cashier_name}
            </p>
          </div>
        </div>

        <div
          style={{
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 18,
            fontSize: 12,
            lineHeight: 1.6,
            color: T.sub,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span>Modal Terinput:</span>
            <b style={{ color: T.text, fontFamily: "JetBrains Mono, monospace" }}>
              {fmt(shift.summary?.startingCash || shift.starting_cash)}
            </b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span>Waktu Dibuka:</span>
            <b style={{ color: T.text }}>{shift.opened_at}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Jumlah Transaksi:</span>
            {canCancel ? (
              <b style={{ color: T.green }}>0 transaksi (Aman dibatalkan)</b>
            ) : (
              <b style={{ color: T.red }}>{txCount} transaksi {debtColl > 0 ? '+ cicilan kasbon' : ''} (Terkunci)</b>
            )}
          </div>
        </div>

        {canCancel ? (
          <p style={{ fontSize: 12, color: T.muted, margin: "0 0 20px", lineHeight: 1.5 }}>
            💡 Pembatalan ini akan <b>menghapus catatan shift</b> yang belum dipakai belanja, sehingga laporan keuangan tidak kotor. Meja kasir akan kembali terkunci.
          </p>
        ) : (
          <div style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: T.red + "12",
            border: `1px solid ${T.red}35`,
            color: T.red,
            fontSize: 12,
            lineHeight: 1.5,
            marginBottom: 20,
          }}>
            ❌ Shift ini sudah memiliki catatan transaksi belanja! Untuk menjaga akurasi pembukuan dan uang kas, shift ini tidak boleh dibatalkan. Silakan gunakan tombol <b>"Tutup Kasir & Hitung Laci"</b>.
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: 10,
              border: `1px solid ${T.border2}`,
              background: "transparent",
              color: T.sub,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {canCancel ? "Kembali" : "Tutup Dialog"}
          </button>
          {canCancel && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              style={{
                flex: 1.4,
                padding: "11px",
                borderRadius: 10,
                border: "none",
                background: T.red,
                color: "#fff",
                fontSize: 13,
                fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: `0 4px 14px ${T.red}40`,
              }}
            >
              {loading ? "Membatalkan..." : "Ya, Batalkan Shift"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── MODAL BUKA SHIFT KASIR ───────────────────────────────────────────────────
export function OpenShiftModal({ onClose, onSuccess }) {
  const [cashierName, setCashierName] = useState("Kasir 1");
  const [startingCash, setStartingCash] = useState(200000);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const quickAmounts = [100000, 200000, 300000, 500000];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const res = await openShift({
      cashier_name: cashierName,
      starting_cash: parseNominal(startingCash),
      notes,
    });
    setSubmitting(false);

    if (res.success) {
      onSuccess();
    } else {
      alert(res.message);
    }
  };

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.68)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "Syne, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: T.surface,
          border: `1px solid ${T.border2}`,
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.45)",
          animation: "modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: T.green }}>🟢</span> Buka Shift Kasir Baru
            </h3>
            <p style={{ fontSize: 12, color: T.sub, margin: "4px 0 0" }}>
              Masukkan uang modal kembalian yang dimasukkan ke laci kasir.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: T.muted,
              fontSize: 18,
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: 8,
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Petugas Kasir */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 6, textTransform: "uppercase" }}>
              Nama Petugas Kasir
            </label>
            <input
              type="text"
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              placeholder="Contoh: Budi, Mbak Siti, Kasir Pagi"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                background: T.bg,
                border: `1px solid ${T.border2}`,
                color: T.text,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Modal Awal Laci */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 6, textTransform: "uppercase" }}>
              Modal Awal Laci (Uang Kembalian)
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={formatNominal(startingCash)}
              onChange={(e) => setStartingCash(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                background: T.bg,
                border: `1px solid ${T.border2}`,
                color: T.accent,
                fontSize: 18,
                fontWeight: 800,
                fontFamily: "JetBrains Mono, monospace",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            {/* Quick buttons */}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setStartingCash(amt)}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    borderRadius: 7,
                    border: `1px solid ${startingCash === amt ? T.accent : T.border2}`,
                    background: startingCash === amt ? T.accent + "18" : T.bg,
                    color: startingCash === amt ? T.accent : T.sub,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {fmt(amt)}
                </button>
              ))}
            </div>
          </div>

          {/* Catatan */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 6, textTransform: "uppercase" }}>
              Catatan (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Shift pagi 07:00 - 15:00"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                background: T.bg,
                border: `1px solid ${T.border2}`,
                color: T.text,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 10,
                border: `1px solid ${T.border2}`,
                background: "transparent",
                color: T.sub,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1.5,
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: T.green,
                color: "#fff",
                fontSize: 13,
                fontWeight: 800,
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: `0 4px 14px ${T.green}40`,
              }}
            >
              {submitting ? "Membuka..." : "Buka Shift Sekarang"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── MODAL KAS MASUK / KELUAR LACI ───────────────────────────────────────────
export function CashMovementModal({ shiftId, initialType, onClose, onSuccess }) {
  const [type, setType] = useState(initialType);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const quickReasons =
    type === "OUT"
      ? ["Beli es batu warung", "Beli kantong kresek", "Beli air galon", "Setoran ke bos / brankas", "Uang makan kasir"]
      : ["Tambahan uang kembalian", "Suntikan modal kas", "Kembalian dari bos"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const cleanAmt = parseNominal(amount);
    if (!cleanAmt || cleanAmt <= 0) {
      alert("Nominal uang harus lebih dari Rp 0");
      return;
    }
    if (!reason.trim()) {
      alert("Keterangan keperluan wajib diisi");
      return;
    }

    setSubmitting(true);
    const res = await recordCashMovement({
      shift_id: shiftId,
      type,
      amount: cleanAmt,
      reason,
    });
    setSubmitting(false);

    if (res.success) {
      onSuccess();
    } else {
      alert(res.message);
    }
  };

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.68)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "Syne, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: T.surface,
          border: `1px solid ${T.border2}`,
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.45)",
          animation: "modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0 }}>
              {type === "IN" ? "📥 Catat Kas Masuk Laci" : "📤 Catat Uang Keluar Laci"}
            </h3>
            <p style={{ fontSize: 12, color: T.sub, margin: "4px 0 0" }}>
              Catat uang tunai yang masuk atau diambil dari laci di luar belanja nota.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: T.muted,
              fontSize: 18,
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: 8,
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Jenis */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setType("OUT")}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 10,
              border: `1.5px solid ${type === "OUT" ? T.orange : T.border2}`,
              background: type === "OUT" ? T.orange + "15" : T.bg,
              color: type === "OUT" ? T.orange : T.sub,
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            📤 Uang Keluar (Ambil Kasir)
          </button>
          <button
            type="button"
            onClick={() => setType("IN")}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 10,
              border: `1.5px solid ${type === "IN" ? T.blue : T.border2}`,
              background: type === "IN" ? T.blue + "15" : T.bg,
              color: type === "IN" ? T.blue : T.sub,
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            📥 Kas Masuk (Tambah Modal)
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Nominal */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 6, textTransform: "uppercase" }}>
              Nominal Uang (Rp)
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={formatNominal(amount)}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                background: T.bg,
                border: `1px solid ${T.border2}`,
                color: type === "IN" ? T.blue : T.orange,
                fontSize: 18,
                fontWeight: 800,
                fontFamily: "JetBrains Mono, monospace",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Keperluan / Alasan */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 6, textTransform: "uppercase" }}>
              Keperluan / Alasan Pengambilan
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Beli es batu, beli kantong kresek"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                background: T.bg,
                border: `1px solid ${T.border2}`,
                color: T.text,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            {/* Quick reason pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {quickReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: `1px solid ${T.border}`,
                    background: T.bg,
                    color: T.sub,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 10,
                border: `1px solid ${T.border2}`,
                background: "transparent",
                color: T.sub,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1.5,
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: type === "IN" ? T.blue : T.orange,
                color: "#fff",
                fontSize: 13,
                fontWeight: 800,
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: `0 4px 14px ${(type === "IN" ? T.blue : T.orange)}40`,
              }}
            >
              {submitting ? "Menyimpan..." : "Simpan Mutasi Kas"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── MODAL TUTUP KASIR & HITUNG FISIK LACI (BLIND RECONCILIATION) ─────────────
export function CloseShiftModal({ shift, movements, onClose, onSuccess }) {
  const [mode, setMode] = useState("calculator"); // "calculator" or "direct"
  const [directAmount, setDirectAmount] = useState("");
  const [autoPrint, setAutoPrint] = useState(false);
  const [closingNotes, setClosingNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Kalkulator pecahan uang kertas & koin Indonesia
  const [breakdown, setBreakdown] = useState({
    100000: 0,
    50000: 0,
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
    coins: 0,
  });

  const DENOMS = [
    { value: 100000, label: "Rp 100.000", color: "#e11d48" },
    { value: 50000, label: "Rp 50.000", color: "#2563eb" },
    { value: 20000, label: "Rp 20.000", color: "#059669" },
    { value: 10000, label: "Rp 10.000", color: "#7c3aed" },
    { value: 5000, label: "Rp 5.000", color: "#d97706" },
    { value: 2000, label: "Rp 2.000", color: "#64748b" },
    { value: 1000, label: "Rp 1.000", color: "#78716c" },
  ];

  // Hitung total fisik dari kalkulator pecahan
  const calcTotal = Object.entries(breakdown).reduce((sum, [denom, count]) => {
    if (denom === "coins") return sum + (Number(count) || 0);
    return sum + Number(denom) * (Number(count) || 0);
  }, 0);

  const actualCash = mode === "calculator" ? calcTotal : parseNominal(directAmount);
  const expectedCash = shift.summary?.expectedCash || 0;
  const difference = actualCash - expectedCash;

  let diffBadge = {
    color: T.green,
    text: "PAS & SEIMBANG (Rp 0)",
    desc: "Uang laci cocok dengan catatan penjualan sistem.",
  };
  if (difference < 0) {
    diffBadge = {
      color: T.red,
      text: `KURANG (${fmt(Math.abs(difference))})`,
      desc: "Uang laci kurang. Pastikan tidak ada pengeluaran atau nota yang belum tercatat.",
    };
  } else if (difference > 0) {
    diffBadge = {
      color: T.blue,
      text: `LEBIH (+${fmt(difference)})`,
      desc: "Uang laci lebih dari perhitungan sistem.",
    };
  }

  const handleCloseConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);

    const res = await closeShift({
      shift_id: shift.id,
      actual_cash: actualCash,
      notes: closingNotes,
    });
    setSubmitting(false);

    if (res.success) {
      onSuccess({
        shift: res.shift,
        summary: res.summary,
        autoPrint,
      });
    } else {
      alert(res.message);
    }
  };

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.68)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "Syne, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 580,
          maxHeight: "90vh",
          overflowY: "auto",
          background: T.surface,
          border: `1px solid ${T.border2}`,
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.45)",
          animation: "modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: T.red }}>🔒</span> Tutup Kasir & Hitung Uang Laci
            </h3>
            <p style={{ fontSize: 12, color: T.sub, margin: "4px 0 0" }}>
              Hitung uang fisik yang ada di laci kasir saat toko tutup atau pergantian shift.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: T.muted,
              fontSize: 18,
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: 8,
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Mode Hitung */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setMode("calculator")}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: 8,
              border: `1.5px solid ${mode === "calculator" ? T.accent : T.border2}`,
              background: mode === "calculator" ? T.accent + "15" : T.bg,
              color: mode === "calculator" ? T.accent : T.sub,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🧮 Kalkulator Pecahan Lembar & Koin
          </button>
          <button
            type="button"
            onClick={() => setMode("direct")}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: 8,
              border: `1.5px solid ${mode === "direct" ? T.accent : T.border2}`,
              background: mode === "direct" ? T.accent + "15" : T.bg,
              color: mode === "direct" ? T.accent : T.sub,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ✍️ Masukkan Total Langsung
          </button>
        </div>

        {/* Kalkulator Pecahan */}
        {mode === "calculator" ? (
          <div
            style={{
              background: T.bg,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              {DENOMS.map((d) => (
                <div
                  key={d.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: d.color }}>{d.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10, color: T.muted }}>×</span>
                    <input
                      type="number"
                      min="0"
                      value={breakdown[d.value] || ""}
                      onChange={(e) =>
                        setBreakdown({
                          ...breakdown,
                          [d.value]: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      placeholder="0"
                      style={{
                        width: 50,
                        padding: "4px 6px",
                        borderRadius: 6,
                        border: `1px solid ${T.border2}`,
                        background: T.bg,
                        color: T.text,
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: "JetBrains Mono, monospace",
                        textAlign: "center",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Input Total Koin / Receh */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: 8,
                background: T.surface,
                border: `1px solid ${T.border}`,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: T.sub }}>🪙 Total Koin / Pecahan Receh (Rp)</span>
              <input
                type="text"
                inputMode="numeric"
                value={formatNominal(breakdown.coins)}
                onChange={(e) =>
                  setBreakdown({
                    ...breakdown,
                    coins: parseNominal(e.target.value),
                  })
                }
                placeholder="0"
                style={{
                  width: 100,
                  padding: "5px 8px",
                  borderRadius: 6,
                  border: `1px solid ${T.border2}`,
                  background: T.bg,
                  color: T.text,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "JetBrains Mono, monospace",
                  textAlign: "right",
                  outline: "none",
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 6, textTransform: "uppercase" }}>
              Total Uang Fisik Nyata di Laci (Rp)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNominal(directAmount)}
              onChange={(e) => setDirectAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              autoFocus
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                background: T.bg,
                border: `1px solid ${T.border2}`,
                color: T.accent,
                fontSize: 20,
                fontWeight: 800,
                fontFamily: "JetBrains Mono, monospace",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}

        {/* ── REKONSILIASI KAS RESULT CARD ── */}
        <div
          style={{
            padding: 16,
            borderRadius: 14,
            background: T.bg,
            border: `1px solid ${T.border}`,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.sub }}>Uang Seharusnya di Laci (Sistem):</span>
            <b style={{ fontSize: 13, fontFamily: "JetBrains Mono, monospace", color: T.text }}>
              {fmt(expectedCash)}
            </b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: T.sub }}>Uang Fisik Nyata Hasil Hitungan:</span>
            <b style={{ fontSize: 15, fontFamily: "JetBrains Mono, monospace", color: T.accent }}>
              {fmt(actualCash)}
            </b>
          </div>

          <div style={{ height: 1, background: T.border, marginBottom: 12 }} />

          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: diffBadge.color + "12",
              border: `1px solid ${diffBadge.color}40`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span style={{ fontSize: 10, fontWeight: 800, color: diffBadge.color, textTransform: "uppercase" }}>
                Status Selisih Kas
              </span>
              <p style={{ margin: 0, fontSize: 11, color: T.sub }}>{diffBadge.desc}</p>
            </div>
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: diffBadge.color,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {diffBadge.text}
            </span>
          </div>
        </div>

        {/* Catatan Penutupan */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 6, textTransform: "uppercase" }}>
            Catatan Penutupan Kasir (Opsional)
          </label>
          <input
            type="text"
            value={closingNotes}
            onChange={(e) => setClosingNotes(e.target.value)}
            placeholder="Contoh: Selisih uang koin kembalian, toko tutup tepat jam 21:00"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              background: T.bg,
              border: `1px solid ${T.border2}`,
              color: T.text,
              fontSize: 12,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Checkbox Cetak Struk */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <input
            type="checkbox"
            id="autoprint-shift"
            checked={autoPrint}
            onChange={(e) => setAutoPrint(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: T.accent, cursor: "pointer" }}
          />
          <label htmlFor="autoprint-shift" style={{ fontSize: 12, fontWeight: 600, color: T.text, cursor: "pointer" }}>
            Cetak Struk Rekap Tutup Kasir otomatis ke printer thermal
          </label>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 10,
              border: `1px solid ${T.border2}`,
              background: "transparent",
              color: T.sub,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Batal
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleCloseConfirm}
            style={{
              flex: 1.5,
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: T.red,
              color: "#fff",
              fontSize: 13,
              fontWeight: 800,
              cursor: submitting ? "not-allowed" : "pointer",
              boxShadow: `0 4px 14px ${T.red}40`,
            }}
          >
            {submitting ? "Menutup..." : "Ya, Tutup Shift Kasir"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── MODAL DETAIL SHIFT ───────────────────────────────────────────────────────
function ShiftDetailModal({ shift, onClose, onPrint }) {
  const diff = Number(shift.difference) || 0;
  let diffBadgeColor = T.green;
  let diffBadgeText = "Pas (Rp 0)";
  if (diff < 0) {
    diffBadgeColor = T.red;
    diffBadgeText = `Kurang (${fmt(Math.abs(diff))})`;
  } else if (diff > 0) {
    diffBadgeColor = T.blue;
    diffBadgeText = `Lebih (+${fmt(diff)})`;
  }

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.68)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "Syne, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 500,
          background: T.surface,
          border: `1px solid ${T.border2}`,
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.45)",
          animation: "modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0 }}>
              Detail Shift #{shift.id}
            </h3>
            <p style={{ fontSize: 12, color: T.sub, margin: "4px 0 0" }}>
              Kasir: <b>{shift.cashier_name}</b> • {shift.opened_at}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: T.muted,
              fontSize: 18,
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: 8,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ background: T.bg, borderRadius: 12, padding: 14, border: `1px solid ${T.border}`, marginBottom: 16, fontSize: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: T.sub }}>Modal Awal Kembalian:</span>
            <b style={{ fontFamily: "JetBrains Mono, monospace" }}>{fmt(shift.starting_cash)}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: T.sub }}>Penjualan Tunai (+):</span>
            <b style={{ color: T.green, fontFamily: "JetBrains Mono, monospace" }}>+{fmt(shift.cash_sales)}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: T.sub }}>Pelunasan Kasbon Tunai (+):</span>
            <b style={{ color: T.green, fontFamily: "JetBrains Mono, monospace" }}>+{fmt(shift.debt_collected)}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: T.sub }}>Kas Masuk Lainnya (+):</span>
            <b style={{ color: T.blue, fontFamily: "JetBrains Mono, monospace" }}>+{fmt(shift.cash_in)}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ color: T.sub }}>Kas Keluar Laci (-):</span>
            <b style={{ color: T.orange, fontFamily: "JetBrains Mono, monospace" }}>-{fmt(shift.cash_out)}</b>
          </div>

          <div style={{ height: 1, background: T.border, marginBottom: 10 }} />

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: T.sub }}>Uang Seharusnya:</span>
            <b style={{ fontFamily: "JetBrains Mono, monospace" }}>{fmt(shift.expected_cash)}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: T.sub }}>Uang Fisik Dihitung:</span>
            <b style={{ fontFamily: "JetBrains Mono, monospace", color: T.accent }}>{fmt(shift.actual_cash)}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: T.text }}>Selisih Kas:</span>
            <span style={{ fontWeight: 800, color: diffBadgeColor, background: diffBadgeColor + "15", padding: "2px 8px", borderRadius: 6 }}>
              {diffBadgeText}
            </span>
          </div>
        </div>

        {shift.movements && shift.movements.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", margin: "0 0 6px" }}>
              Mutasi Uang Laci ({shift.movements.length})
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 120, overflowY: "auto" }}>
              {shift.movements.map((m) => (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, background: T.bg, padding: "6px 10px", borderRadius: 8 }}>
                  <span>{m.reason} ({m.type === "IN" ? "Masuk" : "Keluar"})</span>
                  <b style={{ color: m.type === "IN" ? T.blue : T.orange }}>{fmt(m.amount)}</b>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 10,
              border: `1px solid ${T.border2}`,
              background: "transparent",
              color: T.sub,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={onPrint}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 10,
              border: "none",
              background: T.accent,
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            🖨 Cetak Struk Rekap
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
