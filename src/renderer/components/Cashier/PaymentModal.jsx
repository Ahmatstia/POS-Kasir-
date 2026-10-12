import React, { useState, useEffect, useRef } from "react";
import { T } from "../../theme";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

// ─── PAYMENT METHODS ──────────────────────────────────────────────────────────
const METHODS = [
  {
    key: 'cash',
    label: 'Tunai',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="12" y1="15" x2="12" y2="15"/><line x1="17" y1="15" x2="17" y2="15"/></svg>
    ),
  },
  {
    key: 'debit',
    label: 'Debit',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
    ),
  },
  {
    key: 'qris',
    label: 'QRIS',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    ),
  },
];

function PaymentModal({ total, onClose, onConfirm, loading = false }) {
  const [customerName, setCustomerName]   = useState('');
  const [discount, setDiscount]           = useState('');
  const [payment, setPayment]             = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [autoPrint, setAutoPrint]         = useState(true);
  const [printType, setPrintType]         = useState('thermal'); // 'thermal' or 'normal'
  const inputRef = useRef(null);

  const discountNum = Math.max(0, Number(discount) || 0);
  const finalTotal  = Math.max(0, total - discountNum);
  const paymentNum  = Number(payment) || 0;
  const change      = paymentNum - finalTotal;
  const isValid     = paymentNum >= finalTotal;
  const shortfall   = isValid ? 0 : finalTotal - paymentNum;

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const quickAmounts = [
    { label: 'Uang Pas',  value: finalTotal         },
    { label: '5k',        value: 5_000              },
    { label: '10k',       value: 10_000             },
    { label: '20k',       value: 20_000             },
    { label: '50k',       value: 50_000             },
    { label: '100k',      value: 100_000            },
    { label: '200k',      value: 200_000            },
    { label: '500k',      value: 500_000            },
    { label: '1jt',       value: 1_000_000          },
  ];

  const handleConfirm = () => {
    if (!isValid || loading) return;
    onConfirm({
      payment: paymentNum,
      change,
      method: paymentMethod,
      autoPrint,
      printType,
      discount: discountNum,
      customerName: customerName.trim(),
    });
  };

  // close on backdrop click
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
          width: '100%', maxWidth: 440, maxHeight: '92vh', overflowY: 'auto',
          background: T.surface, border: `1px solid ${T.border2}`,
          borderRadius: 20,
          animation: 'modalIn 0.25s cubic-bezier(0.16,1,0.3,1) both',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}>

          {/* ── HEADER ── */}
          <div style={{
            padding: '18px 22px 16px',
            borderBottom: `1px solid ${T.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            position: 'sticky', top: 0, background: T.surface, zIndex: 2,
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

          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── TOTAL BANNER ── */}
            <div style={{
              borderRadius: 14, padding: '16px 18px',
              background: T.accent + '0E',
              border: `1px solid ${T.accent}28`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.accent + 'AA', marginBottom: 4 }}>
                  {discountNum > 0 ? `Total Tagihan (Diskon -${fmt(discountNum)})` : 'Total Belanja'}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <p style={{ fontSize: 28, fontWeight: 800, color: T.accent, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.02em' }}>
                    {fmt(finalTotal)}
                  </p>
                  {discountNum > 0 && (
                    <span style={{ fontSize: 13, textDecoration: 'line-through', color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
                      {fmt(total)}
                    </span>
                  )}
                </div>
              </div>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: T.accent + '18', border: `1px solid ${T.accent}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="12" y1="15" x2="12" y2="15"/><line x1="17" y1="15" x2="17" y2="15"/></svg>
              </div>
            </div>

            {/* ── PELANGGAN & DISKON ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted, display: 'block', marginBottom: 6 }}>
                  Pelanggan (Opsional)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Nama pembeli / umum"
                  style={{
                    width: '100%', padding: '9px 12px',
                    borderRadius: 9, border: `1px solid ${T.border2}`,
                    background: T.bg, color: T.text,
                    fontSize: 12, outline: 'none',
                    fontFamily: 'Syne, sans-serif'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted, display: 'block', marginBottom: 6 }}>
                  Potongan Diskon (Rp)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 11, fontWeight: 700, color: T.muted, pointerEvents: 'none'
                  }}>Rp</span>
                  <input
                    type="number"
                    value={discount}
                    onChange={e => setDiscount(e.target.value)}
                    placeholder="0"
                    style={{
                      width: '100%', padding: '9px 10px 9px 32px',
                      borderRadius: 9, border: `1px solid ${T.border2}`,
                      background: T.bg, color: T.text,
                      fontSize: 13, fontWeight: 700, outline: 'none',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* ── PAYMENT METHOD ── */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>
                Metode Pembayaran
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {METHODS.map((m) => {
                  const active = paymentMethod === m.key;
                  return (
                    <button
                      key={m.key}
                      className="method-btn"
                      onClick={() => {
                        setPaymentMethod(m.key);
                        if (m.key !== 'cash' && (!payment || payment === '0')) {
                          setPayment(finalTotal.toString());
                        }
                      }}
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
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>
                Nominal Cepat
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {quickAmounts.map((a) => {
                  const isExact  = a.value === finalTotal;
                  const selected = paymentNum === a.value;
                  return (
                    <button
                      key={a.label}
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

            {/* ── AUTO PRINT RECEIPT OPTION ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 12, background: T.bg,
              border: `1px solid ${T.border2}`,
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: T.text }}>
                <input
                  type="checkbox"
                  checked={autoPrint}
                  onChange={e => setAutoPrint(e.target.checked)}
                  style={{ accentColor: T.green, width: 16, height: 16, cursor: 'pointer' }}
                />
                🖨️ Cetak Struk
              </label>

              {autoPrint && (
                <div style={{ display: 'flex', gap: 4, background: T.surface, padding: 3, borderRadius: 8, border: `1px solid ${T.border2}` }}>
                  <button
                    type="button"
                    onClick={() => setPrintType('thermal')}
                    style={{
                      padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                      border: 'none', cursor: 'pointer',
                      background: printType === 'thermal' ? T.accent : 'transparent',
                      color: printType === 'thermal' ? '#fff' : T.muted,
                    }}
                  >
                    Thermal 58mm
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintType('normal')}
                    style={{
                      padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                      border: 'none', cursor: 'pointer',
                      background: printType === 'normal' ? T.accent : 'transparent',
                      color: printType === 'normal' ? '#fff' : T.muted,
                    }}
                  >
                    Standar
                  </button>
                </div>
              )}
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
                disabled={!isValid || loading}
                style={{
                  padding: '12px', borderRadius: 12,
                  border: `1px solid ${isValid && !loading ? T.green + '50' : T.border2}`,
                  background: isValid && !loading ? T.green + '18' : T.border,
                  color: isValid && !loading ? T.green : T.sub,
                  fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800,
                  letterSpacing: '0.04em', cursor: isValid && !loading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: isValid && !loading ? 1 : 0.5,
                }}
                onMouseEnter={e => { if (isValid && !loading) e.currentTarget.style.background = T.green + '28'; }}
                onMouseLeave={e => { if (isValid && !loading) e.currentTarget.style.background = T.green + '18'; }}
              >
                {!loading && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                )}
                {loading ? 'Memproses...' : 'Konfirmasi Bayar'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default PaymentModal;