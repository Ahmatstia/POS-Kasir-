import React, { useState, useEffect, useRef } from "react";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  bg:      '#0E0F11',
  surface: '#161719',
  card:    '#1A1B1E',
  border:  '#1F2023',
  border2: '#2A2B2F',
  text:    '#F0EDE6',
  muted:   '#5C5C66',
  sub:     '#9998A3',
  accent:  '#F5A623',
  green:   '#34C98B',
  red:     '#E85858',
  blue:    '#5B8AF5',
};

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

// ─── PAYMENT METHODS ──────────────────────────────────────────────────────────
const METHODS = [
  {
    key: 'cash',
    label: 'Tunai',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="4" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M4 9h.5M13.5 9H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: 'debit',
    label: 'Debit',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="3" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M1 7h16" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="3" y="10" width="4" height="2" rx="0.5" fill="currentColor" opacity="0.6"/>
      </svg>
    ),
  },
  {
    key: 'qris',
    label: 'QRIS',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="10" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2" y="10" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="10.5" y="10.5" width="2" height="2" fill="currentColor"/>
        <rect x="14" y="10.5" width="2" height="2" fill="currentColor"/>
        <rect x="10.5" y="14" width="2" height="2" fill="currentColor"/>
        <rect x="14" y="14" width="2" height="2" fill="currentColor"/>
      </svg>
    ),
  },
];

function PaymentModal({ total, onClose, onConfirm }) {
  const [payment, setPayment]           = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const inputRef = useRef(null);

  const paymentNum = parseInt(payment) || 0;
  const change     = paymentNum - total;
  const isValid    = paymentNum >= total;
  const shortfall  = isValid ? 0 : total - paymentNum;

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const quickAmounts = [
    { label: 'Uang Pas',  value: total              },
    { label: '50k',       value: 50_000             },
    { label: '100k',      value: 100_000            },
    { label: '200k',      value: 200_000            },
    { label: '500k',      value: 500_000            },
    { label: '1jt',       value: 1_000_000          },
  ];

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm({ payment: paymentNum, change, method: paymentMethod });
  };

  // close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

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
      <div
        onClick={handleBackdrop}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif',
          animation: 'fadeOverlay 0.2s ease both',
        }}
      >
        {/* Modal card */}
        <div style={{
          width: '100%', maxWidth: 420,
          background: T.surface, border: `1px solid ${T.border2}`,
          borderRadius: 20, overflow: 'hidden',
          animation: 'modalIn 0.25s cubic-bezier(0.16,1,0.3,1) both',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}>

          {/* ── HEADER ── */}
          <div style={{
            padding: '18px 22px 16px',
            borderBottom: `1px solid ${T.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, marginBottom: 2 }}>
                Proses Pembayaran
              </p>
              <p style={{ fontSize: 14, fontWeight: 800, color: T.text }}>
                Konfirmasi Transaksi
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 9,
                border: `1px solid ${T.border2}`,
                background: 'transparent', color: T.sub,
                cursor: 'pointer', fontSize: 16, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = T.border2; e.currentTarget.style.color = T.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.sub; }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* ── TOTAL BANNER ── */}
            <div style={{
              borderRadius: 14, padding: '16px 18px',
              background: T.accent + '0E',
              border: `1px solid ${T.accent}28`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.accent + 'AA', marginBottom: 4 }}>
                  Total Belanja
                </p>
                <p style={{ fontSize: 28, fontWeight: 800, color: T.accent, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.02em' }}>
                  {fmt(total)}
                </p>
              </div>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: T.accent + '18', border: `1px solid ${T.accent}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect x="2" y="5" width="18" height="13" rx="2.5" stroke={T.accent} strokeWidth="1.6"/>
                  <circle cx="11" cy="11.5" r="3" stroke={T.accent} strokeWidth="1.6"/>
                  <path d="M5 11.5h.5M16.5 11.5H17" stroke={T.accent} strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </div>
            </div>

            {/* ── PAYMENT METHOD ── */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 10 }}>
                Metode Pembayaran
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {METHODS.map((m) => {
                  const active = paymentMethod === m.key;
                  return (
                    <button
                      key={m.key}
                      className="method-btn"
                      onClick={() => setPaymentMethod(m.key)}
                      style={{
                        padding: '10px 8px', borderRadius: 11,
                        border: `1px solid ${active ? T.blue + '50' : T.border2}`,
                        background: active ? T.blue + '14' : T.bg,
                        color: active ? T.blue : T.sub,
                        cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 6,
                      }}
                    >
                      <span style={{ opacity: active ? 1 : 0.6 }}>{m.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── QUICK AMOUNTS ── */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 10 }}>
                Nominal Cepat
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {quickAmounts.map((a) => {
                  const isExact  = a.value === total;
                  const selected = paymentNum === a.value;
                  return (
                    <button
                      key={a.value}
                      className="quick-btn"
                      onClick={() => setPayment(a.value.toString())}
                      style={{
                        padding: '7px 6px', borderRadius: 9, cursor: 'pointer',
                        border: `1px solid ${selected ? T.accent + '50' : T.border2}`,
                        background: selected ? T.accent + '12' : T.border,
                        color: selected ? T.accent : isExact ? T.green : T.sub,
                        fontSize: 11, fontWeight: 700,
                        fontFamily: 'JetBrains Mono, monospace',
                        transition: 'all 0.15s',
                        letterSpacing: isExact ? '0.02em' : '0',
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
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>
                Jumlah Dibayar
              </p>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 12, fontWeight: 700, color: T.muted,
                  fontFamily: 'JetBrains Mono, monospace', pointerEvents: 'none',
                }}>Rp</span>
                <input
                  ref={inputRef}
                  type="number"
                  value={payment}
                  onChange={e => setPayment(e.target.value)}
                  placeholder="0"
                  className="pay-input"
                  style={{
                    width: '100%', padding: '12px 14px 12px 40px',
                    borderRadius: 11, border: `1px solid ${T.border2}`,
                    background: T.bg, color: T.text,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em',
                    outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                />
              </div>
            </div>

            {/* ── CHANGE DISPLAY ── */}
            <div style={{
              borderRadius: 12, padding: '14px 16px',
              background: isValid ? T.green + '0E' : payment ? T.red + '0E' : T.border,
              border: `1px solid ${isValid ? T.green + '30' : payment ? T.red + '30' : T.border2}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              transition: 'all 0.2s',
            }}>
              <p style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: isValid ? T.green + 'AA' : payment ? T.red + 'AA' : T.muted,
              }}>
                {isValid ? 'Kembalian' : 'Kekurangan'}
              </p>
              <p style={{
                fontSize: 20, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
                color: isValid ? T.green : payment ? T.red : T.muted,
                transition: 'color 0.2s',
              }}>
                {payment
                  ? (isValid ? fmt(change) : fmt(shortfall))
                  : '—'}
              </p>
            </div>

            {/* ── ACTION BUTTONS ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
              <button
                onClick={onClose}
                style={{
                  padding: '12px', borderRadius: 12,
                  border: `1px solid ${T.border2}`,
                  background: 'transparent', color: T.sub,
                  fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = T.border; e.currentTarget.style.color = T.text; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.sub; }}
              >
                Batal
              </button>
              <button
                onClick={handleConfirm}
                disabled={!isValid}
                style={{
                  padding: '12px', borderRadius: 12,
                  border: `1px solid ${isValid ? T.green + '50' : T.border2}`,
                  background: isValid ? T.green + '18' : T.border,
                  color: isValid ? T.green : T.muted,
                  fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800,
                  letterSpacing: '0.04em', cursor: isValid ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: isValid ? 1 : 0.5,
                }}
                onMouseEnter={e => { if (isValid) e.currentTarget.style.background = T.green + '28'; }}
                onMouseLeave={e => { if (isValid) e.currentTarget.style.background = T.green + '18'; }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Konfirmasi Bayar
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default PaymentModal;