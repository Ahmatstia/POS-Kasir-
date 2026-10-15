import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { T } from "../../theme";
import { getCustomers } from "../../services/debts";
import { formatNominal, parseNominal } from "../../utils/format";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

// ─── PAYMENT METHODS ──────────────────────────────────────────────────────────
const METHODS = [
  {
    key: "cash",
    label: "Tunai",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="12" y1="15" x2="12" y2="15" />
        <line x1="17" y1="15" x2="17" y2="15" />
      </svg>
    ),
  },
  {
    key: "debit",
    label: "Debit",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    key: "qris",
    label: "QRIS",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    key: "kasbon",
    label: "Kasbon",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
];

function PaymentModal({
  total,
  subtotal = total,
  promoDiscount = 0,
  appliedPromo = null,
  selectedCustomer = null,
  onClose,
  onConfirm,
  loading = false,
}) {
  const [customerName, setCustomerName] = useState(selectedCustomer?.name || "");
  const [discount, setDiscount] = useState(promoDiscount > 0 ? formatNominal(promoDiscount) : "");
  const [payment, setPayment] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [autoPrint, setAutoPrint] = useState(false);
  const [printType, setPrintType] = useState("thermal"); // 'thermal' or 'normal'
  const [notes, setNotes] = useState("");

  // Customer debt state
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(selectedCustomer?.id ? String(selectedCustomer.id) : "");
  const [isManualCustomer, setIsManualCustomer] = useState(false);

  const inputRef = useRef(null);

  const discountNum = Math.max(0, parseNominal(discount));
  const finalTotal = Math.max(0, subtotal - discountNum);
  const paymentNum = parseNominal(payment);
  const change = paymentNum - finalTotal;

  // Kasbon calculations
  const isKasbon = paymentMethod === "kasbon";
  const remainingDebt = Math.max(0, finalTotal - paymentNum);
  const selectedCustomerObj = customers.find(
    (c) => String(c.id) === String(selectedCustomerId)
  );

  const isKasbonValid =
    isKasbon &&
    (selectedCustomerId || customerName.trim().length > 0) &&
    paymentNum <= finalTotal;

  const isValid = isKasbon ? isKasbonValid : paymentNum >= finalTotal;
  const shortfall = isValid ? 0 : finalTotal - paymentNum;

  // Check debt limit
  const currentTotalDebt = Number(selectedCustomerObj?.total_debt || 0);
  const debtLimit = Number(selectedCustomerObj?.debt_limit || 0);
  const willExceedLimit =
    debtLimit > 0 && currentTotalDebt + remainingDebt > debtLimit;

  useEffect(() => {
    getCustomers().then((data) => {
      setCustomers(data || []);
    });
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const handleCustomerSelect = (id) => {
    setSelectedCustomerId(id);
    if (!id) {
      setCustomerName("");
      return;
    }
    const found = customers.find((c) => String(c.id) === String(id));
    if (found) {
      setCustomerName(found.name);
    }
  };

  const quickAmounts = isKasbon
    ? [
        { label: "Tanpa DP (Rp 0)", value: 0 },
        { label: "DP 10k", value: 10_000 },
        { label: "DP 20k", value: 20_000 },
        { label: "DP 50k", value: 50_000 },
        { label: "DP 100k", value: 100_000 },
        { label: "Bayar Lunas", value: finalTotal },
      ]
    : [
        { label: "Uang Pas", value: finalTotal },
        { label: "5k", value: 5_000 },
        { label: "10k", value: 10_000 },
        { label: "20k", value: 20_000 },
        { label: "50k", value: 50_000 },
        { label: "100k", value: 100_000 },
        { label: "200k", value: 200_000 },
        { label: "500k", value: 500_000 },
        { label: "1jt", value: 1_000_000 },
      ];

  const handleConfirm = () => {
    if (!isValid || loading) return;
    onConfirm({
      payment: paymentNum,
      change: isKasbon ? 0 : change,
      method: paymentMethod,
      autoPrint,
      printType,
      discount: discountNum,
      customerName: customerName.trim() || selectedCustomer?.name || "Walk-in Guest",
      customerId: selectedCustomerId ? Number(selectedCustomerId) : (selectedCustomer?.id || null),
      promoId: appliedPromo?.id || null,
      promoCode: appliedPromo?.code || null,
      notes: notes.trim(),
    });
  };

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes fadeOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }

        .pay-input:focus {
          border-color: ${T.accent}80 !important;
          box-shadow: 0 0 0 3px ${T.accent}12;
        }
        .method-btn:hover { opacity: 0.85; }
        .quick-btn:hover  { background: ${T.border2} !important; color: ${T.text} !important; }
      `}</style>

      {/* Overlay */}
      {createPortal(
        <div
          onClick={handleBackdrop}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.68)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Syne, sans-serif",
            animation: "fadeOverlay 0.2s ease both",
            padding: 20,
          }}
        >
          {/* Modal card */}
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              background: T.surface,
              border: `1px solid ${T.border2}`,
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 28px 70px rgba(0,0,0,0.6)",
              animation: "modalIn 0.25s cubic-bezier(0.16,1,0.3,1) both",
              maxHeight: "calc(100vh - 40px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
          {/* Header */}
          <div
            style={{
              padding: "16px 22px 14px",
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: isKasbon ? T.orange : T.muted,
                  marginBottom: 2,
                }}
              >
                {isKasbon ? "Buku Kasbon Pelanggan" : "Proses Pembayaran"}
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: T.text }}>
                {isKasbon ? "Catat Kasbon Belanja" : "Bayar Transaksi"}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                border: `1px solid ${T.border2}`,
                background: "transparent",
                color: T.sub,
                cursor: "pointer",
                fontSize: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
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
              ×
            </button>
          </div>

          {/* Body */}
          <div
            style={{
              padding: "18px 22px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* ── TOTAL DISPLAY ── */}
            <div
              style={{
                background: isKasbon ? T.orange + "0D" : T.bg,
                border: `1px solid ${isKasbon ? T.orange + "30" : T.border2}`,
                borderRadius: 14,
                padding: "14px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: T.muted,
                    marginBottom: 4,
                  }}
                >
                  Total Tagihan Belanja
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: isKasbon ? T.orange : T.text,
                      fontFamily: "JetBrains Mono, monospace",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {fmt(finalTotal)}
                  </span>
                  {discountNum > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        color: T.muted,
                        textDecoration: "line-through",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {fmt(subtotal)}
                    </span>
                  )}
                </div>
                {(selectedCustomer || appliedPromo) && (
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    {selectedCustomer && (
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "#EA580C14", border: "1px solid #EA580C30", color: "#EA580C", fontWeight: 700 }}>
                        👤 {selectedCustomer.name}
                      </span>
                    )}
                    {appliedPromo && (
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: T.green + "14", border: `1px solid ${T.green}30`, color: T.green, fontWeight: 700 }}>
                        🏷️ {appliedPromo.code} (-{fmt(discountNum)})
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: (isKasbon ? T.orange : T.accent) + "18",
                  border: `1px solid ${(isKasbon ? T.orange : T.accent)}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isKasbon ? T.orange : T.accent,
                }}
              >
                {isKasbon ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="12" y1="15" x2="12" y2="15" />
                    <line x1="17" y1="15" x2="17" y2="15" />
                  </svg>
                )}
              </div>
            </div>

            {/* ── PAYMENT METHOD TABS ── */}
            <div>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: T.muted,
                  marginBottom: 8,
                }}
              >
                Metode Pembayaran
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {METHODS.map((m) => {
                  const active = paymentMethod === m.key;
                  const activeColor = m.key === "kasbon" ? T.orange : T.blue;
                  return (
                    <button
                      key={m.key}
                      className="method-btn"
                      onClick={() => {
                        setPaymentMethod(m.key);
                        if (m.key === "kasbon") {
                          setPayment("0"); // default no DP
                        } else if (!payment || payment === "0") {
                          setPayment(finalTotal.toString());
                        }
                      }}
                      style={{
                        padding: "10px 6px",
                        borderRadius: 11,
                        border: `1px solid ${active ? activeColor + "60" : T.border2}`,
                        background: active ? activeColor + "14" : T.bg,
                        color: active ? activeColor : T.sub,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <span style={{ opacity: active ? 1 : 0.6 }}>{m.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.02em" }}>
                        {m.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── KASBON CUSTOMER SELECTOR / REGULAR CUSTOMER ── */}
            {isKasbon ? (
              <div
                style={{
                  background: T.orange + "0A",
                  border: `1px solid ${T.orange}25`,
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: 10, fontWeight: 800, color: T.orange, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Pelanggan Kasbon (Wajib Dipilih) *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualCustomer(!isManualCustomer);
                      setSelectedCustomerId("");
                      setCustomerName("");
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: T.orange,
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    {isManualCustomer ? "Pilih dari Daftar Pelanggan" : "+ Ketik Nama Baru"}
                  </button>
                </div>

                {!isManualCustomer ? (
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${!selectedCustomerId ? T.orange + "60" : T.border2}`,
                      background: T.surface,
                      color: T.text,
                      fontSize: 13,
                      fontFamily: "Syne, sans-serif",
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    <option value="">-- Pilih Nama Pelanggan Kasbon --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ""}{" "}
                        {c.total_debt > 0 ? `· Utang: ${fmt(c.total_debt)}` : "· Bersih"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ketik nama pelanggan baru…"
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${!customerName ? T.orange + "60" : T.border2}`,
                      background: T.surface,
                      color: T.text,
                      fontSize: 13,
                      fontFamily: "Syne, sans-serif",
                      outline: "none",
                    }}
                  />
                )}

                {/* Customer debt preview */}
                {selectedCustomerObj && (
                  <div
                    style={{
                      background: T.surface,
                      borderRadius: 9,
                      padding: "8px 12px",
                      border: `1px solid ${T.border2}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 11,
                    }}
                  >
                    <div>
                      <span style={{ color: T.muted }}>Kasbon Aktif Sekarang: </span>
                      <b style={{ color: currentTotalDebt > 0 ? T.red : T.green }}>
                        {fmt(currentTotalDebt)}
                      </b>
                    </div>
                    <div>
                      <span style={{ color: T.muted }}>Batas Maksimal: </span>
                      <b>{debtLimit > 0 ? fmt(debtLimit) : "Tanpa Batas"}</b>
                    </div>
                  </div>
                )}

                {willExceedLimit && (
                  <div
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: T.red + "15",
                      border: `1px solid ${T.red}30`,
                      color: T.red,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    Peringatan: Tambahan kasbon ini melebihi batas utang pelanggan ({fmt(debtLimit)})!
                  </div>
                )}
              </div>
            ) : (
              /* Regular Customer & Discount */
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: T.muted,
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Pelanggan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama pembeli / umum"
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 9,
                      border: `1px solid ${T.border2}`,
                      background: T.bg,
                      color: T.text,
                      fontSize: 12,
                      outline: "none",
                      fontFamily: "Syne, sans-serif",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: T.muted,
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Potongan Diskon (Rp)
                  </label>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.muted,
                        pointerEvents: "none",
                      }}
                    >
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNominal(discount)}
                      onChange={(e) => setDiscount(e.target.value.replace(/\D/g, ''))}
                      placeholder="0"
                      style={{
                        width: "100%",
                        padding: "9px 10px 9px 32px",
                        borderRadius: 9,
                        border: `1px solid ${T.border2}`,
                        background: T.bg,
                        color: T.text,
                        fontSize: 13,
                        fontWeight: 700,
                        outline: "none",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── QUICK AMOUNTS ── */}
            <div>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: T.muted,
                  marginBottom: 8,
                }}
              >
                {isKasbon ? "Pilihan DP / Pembayaran Awal" : "Nominal Cepat"}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: isKasbon ? "repeat(3, 1fr)" : "repeat(3, 1fr)", gap: 6 }}>
                {quickAmounts.map((a) => {
                  const isExact = a.value === finalTotal;
                  const selected = paymentNum === a.value;
                  return (
                    <button
                      key={a.label}
                      className="quick-btn"
                      onClick={() => setPayment(a.value.toString())}
                      style={{
                        padding: "7px 6px",
                        borderRadius: 9,
                        cursor: "pointer",
                        border: `1px solid ${selected ? T.accent + "50" : T.border2}`,
                        background: selected ? T.accent + "12" : T.border,
                        color: selected ? T.accent : isExact ? T.green : T.sub,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "JetBrains Mono, monospace",
                        transition: "all 0.15s",
                        letterSpacing: isExact ? "0.02em" : "0",
                      }}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── PAYMENT INPUT ── */}
            <div>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: T.muted,
                  marginBottom: 8,
                }}
              >
                {isKasbon ? "Uang Muka / Titip Bayar Dulu (Rp)" : "Jumlah Dibayar (Rp)"}
              </p>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 12,
                    fontWeight: 700,
                    color: T.muted,
                    fontFamily: "JetBrains Mono, monospace",
                    pointerEvents: "none",
                  }}
                >
                  Rp
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  value={formatNominal(payment)}
                  onChange={(e) => setPayment(e.target.value.replace(/\D/g, ''))}
                  placeholder="0"
                  className="pay-input"
                  style={{
                    width: "100%",
                    padding: "12px 14px 12px 40px",
                    borderRadius: 11,
                    border: `1px solid ${T.border2}`,
                    background: T.bg,
                    color: T.text,
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 20,
                    fontWeight: 800,
                    letterSpacing: "-0.01em",
                    outline: "none",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                />
              </div>
            </div>

            {/* ── CHANGE OR DEBT SUMMARY BOX ── */}
            {isKasbon ? (
              <div
                style={{
                  borderRadius: 12,
                  padding: "12px 16px",
                  background: T.orange + "0E",
                  border: `1px solid ${T.orange}35`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: T.orange,
                      marginBottom: 2,
                    }}
                  >
                    Sisa Kasbon Dicatat
                  </p>
                  <p style={{ fontSize: 11, color: T.sub }}>
                    {paymentNum > 0 ? `DP masuk: ${fmt(paymentNum)}` : "Tanpa uang muka (Utang Penuh)"}
                  </p>
                </div>
                <p
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    fontFamily: "JetBrains Mono, monospace",
                    color: T.orange,
                  }}
                >
                  {fmt(remainingDebt)}
                </p>
              </div>
            ) : (
              <div
                style={{
                  borderRadius: 12,
                  padding: "14px 16px",
                  background: isValid ? T.green + "0E" : payment ? T.red + "0E" : T.border,
                  border: `1px solid ${
                    isValid ? T.green + "30" : payment ? T.red + "30" : T.border2
                  }`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "all 0.2s",
                }}
              >
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: isValid ? T.green + "AA" : payment ? T.red + "AA" : T.muted,
                  }}
                >
                  {isValid ? "Kembalian" : "Kekurangan"}
                </p>
                <p
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    fontFamily: "JetBrains Mono, monospace",
                    color: isValid ? T.green : payment ? T.red : T.muted,
                    transition: "color 0.2s",
                  }}
                >
                  {payment ? (isValid ? fmt(change) : fmt(shortfall)) : "—"}
                </p>
              </div>
            )}

            {/* ── NOTES / CATATAN (OPTIONAL) ── */}
            {isKasbon && (
              <div>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: T.muted,
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  Catatan Janji Bayar / Keterangan
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Janji bayar tgl 25 / waktu gajian"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 9,
                    border: `1px solid ${T.border2}`,
                    background: T.bg,
                    color: T.text,
                    fontSize: 12,
                    outline: "none",
                    fontFamily: "Syne, sans-serif",
                  }}
                />
              </div>
            )}

            {/* ── AUTO PRINT RECEIPT OPTION ── */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: 12,
                background: T.bg,
                border: `1px solid ${T.border2}`,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.text,
                }}
              >
                <input
                  type="checkbox"
                  checked={autoPrint}
                  onChange={(e) => setAutoPrint(e.target.checked)}
                  style={{ accentColor: T.green, width: 16, height: 16, cursor: "pointer" }}
                />
                Cetak Struk
              </label>

              {autoPrint && (
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    background: T.surface,
                    padding: 3,
                    borderRadius: 8,
                    border: `1px solid ${T.border2}`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setPrintType("thermal")}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      background: printType === "thermal" ? T.accent : "transparent",
                      color: printType === "thermal" ? "#fff" : T.muted,
                    }}
                  >
                    Thermal 58mm
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintType("normal")}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      background: printType === "normal" ? T.accent : "transparent",
                      color: printType === "normal" ? "#fff" : T.muted,
                    }}
                  >
                    Standar
                  </button>
                </div>
              )}
            </div>

            {/* ── ACTION BUTTONS ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <button
                onClick={onClose}
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  border: `1px solid ${T.border2}`,
                  background: "transparent",
                  color: T.sub,
                  fontFamily: "Syne, sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s",
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
                Batal
              </button>
              <button
                onClick={handleConfirm}
                disabled={!isValid || loading}
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  border: `1px solid ${
                    isValid && !loading
                      ? (isKasbon ? T.orange : T.green) + "60"
                      : T.border2
                  }`,
                  background:
                    isValid && !loading
                      ? (isKasbon ? T.orange : T.green) + "18"
                      : T.border,
                  color:
                    isValid && !loading
                      ? isKasbon
                        ? T.orange
                        : T.green
                      : T.sub,
                  fontFamily: "Syne, sans-serif",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  cursor: isValid && !loading ? "pointer" : "not-allowed",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: isValid && !loading ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (isValid && !loading)
                    e.currentTarget.style.background =
                      (isKasbon ? T.orange : T.green) + "28";
                }}
                onMouseLeave={(e) => {
                  if (isValid && !loading)
                    e.currentTarget.style.background =
                      (isKasbon ? T.orange : T.green) + "18";
                }}
              >
                {!loading && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
                {loading
                  ? "Memproses..."
                  : isKasbon
                  ? `Catat Nota Kasbon (${fmt(remainingDebt)})`
                  : "Konfirmasi Bayar"}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}
  </>
);
}

export default PaymentModal;