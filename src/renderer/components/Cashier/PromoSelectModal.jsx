import React, { useState, useEffect } from 'react';
import { getActivePromotions, getPromotionByCode, calculatePromoDiscount } from '../../services/promotions';
import { useToast } from '../Toast';
import { T } from '../../theme';

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

export default function PromoSelectModal({
  subtotal = 0,
  appliedPromo = null,
  onApplyPromo,
  onRemovePromo,
  onClose,
}) {
  const { showToast } = useToast();
  const [promotions, setPromotions] = useState([]);
  const [codeQuery, setCodeQuery]   = useState('');
  const [loading, setLoading]       = useState(true);
  const [applying, setApplying]     = useState(false);

  useEffect(() => {
    getActivePromotions()
      .then(res => setPromotions(res || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleApplyByCode = async (e) => {
    e?.preventDefault();
    const clean = codeQuery.trim().toUpperCase();
    if (!clean) {
      showToast('error', 'Masukkan kode promo terlebih dahulu');
      return;
    }

    setApplying(true);
    try {
      const found = await getPromotionByCode(clean);
      if (!found) {
        showToast('error', `Kode promo "${clean}" tidak ditemukan atau sudah tidak aktif`);
        return;
      }
      const calc = calculatePromoDiscount(found, subtotal);
      if (!calc.valid) {
        showToast('error', calc.reason);
        return;
      }
      onApplyPromo(found, calc.discount);
      showToast('success', `Promo "${found.name}" berhasil diterapkan! (Hemat ${fmt(calc.discount)})`);
      onClose();
    } catch (err) {
      showToast('error', err.message || 'Gagal menerapkan promo');
    } finally {
      setApplying(false);
    }
  };

  const handleSelectPromo = (promo) => {
    const calc = calculatePromoDiscount(promo, subtotal);
    if (!calc.valid) {
      showToast('error', calc.reason);
      return;
    }
    onApplyPromo(promo, calc.discount);
    showToast('success', `Promo "${promo.name}" diterapkan! (Hemat ${fmt(calc.discount)})`);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1050, padding: 20, fontFamily: 'Syne, sans-serif',
    }}>
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 22, width: '100%', maxWidth: 460,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
        overflow: 'hidden', animation: 'scaleUp 0.2s ease',
        display: 'flex', flexDirection: 'column', maxHeight: '85vh',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 22px 16px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: '#EA580C', color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>
                Pilih Promo & Diskon
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: T.muted }}>
                Subtotal Belanja: <strong style={{ color: T.text, fontFamily: 'JetBrains Mono, monospace' }}>{fmt(subtotal)}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: T.card, border: `1px solid ${T.border2}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: T.sub, fontSize: 16, fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>

        {/* Input Manual Kode Promo */}
        <form onSubmit={handleApplyByCode} style={{ padding: '16px 20px 10px', display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={codeQuery}
            onChange={e => setCodeQuery(e.target.value.toUpperCase())}
            placeholder="Ketik kode promo (misal: TAHUNBARU)"
            style={{
              flex: 1, padding: '11px 14px', borderRadius: 12,
              border: `1.5px solid ${T.border2}`, background: T.bg,
              color: T.text, fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 800, letterSpacing: '0.05em', outline: 'none',
            }}
            onFocus={e => e.currentTarget.style.borderColor = '#EA580C'}
            onBlur={e => e.currentTarget.style.borderColor = T.border2}
          />
          <button
            type="submit"
            disabled={applying || !codeQuery.trim()}
            style={{
              padding: '0 16px', borderRadius: 12, border: 'none',
              background: '#EA580C', color: '#FFFFFF',
              fontSize: 12, fontWeight: 800, cursor: codeQuery.trim() ? 'pointer' : 'not-allowed',
              opacity: codeQuery.trim() ? 1 : 0.6,
            }}
          >
            {applying ? 'Cek…' : 'Terapkan'}
          </button>
        </form>

        {/* Currently Applied Promo Warning / Clear */}
        {appliedPromo && (
          <div style={{
            margin: '0 20px 10px', padding: '10px 14px', borderRadius: 12,
            background: T.green + '12', border: `1px solid ${T.green}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: T.green }}>
                Promo Terpasang: {appliedPromo.code}
              </div>
              <div style={{ fontSize: 10, color: T.sub }}>
                {appliedPromo.name}
              </div>
            </div>
            <button
              onClick={() => { onRemovePromo(); onClose(); }}
              style={{
                padding: '5px 10px', borderRadius: 8, border: `1px solid ${T.red}35`,
                background: T.red + '10', color: T.red, fontSize: 11, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Hapus Promo
            </button>
          </div>
        )}

        {/* List of Available Promos */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
            Promo Tersedia
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: T.muted, fontSize: 12 }}>
              Memuat promo…
            </div>
          ) : promotions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: T.muted }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Belum Ada Promo Aktif</p>
              <p style={{ margin: '4px 0 0', fontSize: 11 }}>Tambahkan promo baru di menu Promo & Diskon</p>
            </div>
          ) : (
            promotions.map((p) => {
              const calc = calculatePromoDiscount(p, subtotal);
              const isSelected = appliedPromo?.id === p.id;
              const isEligible = calc.valid;
              const isPercent = p.discount_type === 'percent';
              const discountText = isPercent ? `${p.discount_value}%` : fmt(p.discount_value);

              return (
                <div
                  key={p.id}
                  onClick={() => { if (isEligible) handleSelectPromo(p); }}
                  style={{
                    padding: '12px 14px', borderRadius: 14,
                    border: `1.5px solid ${isSelected ? '#EA580C' : isEligible ? T.border2 : T.border}`,
                    background: isSelected ? '#EA580C0D' : isEligible ? T.surface : T.card,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: isEligible ? 'pointer' : 'not-allowed',
                    opacity: isEligible ? 1 : 0.65,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (isEligible && !isSelected) e.currentTarget.style.background = T.bg; }}
                  onMouseLeave={e => { if (isEligible && !isSelected) e.currentTarget.style.background = T.surface; }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 6,
                        background: '#EA580C15', color: '#EA580C',
                        fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 11,
                      }}>
                        {p.code}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>
                        {p.name}
                      </span>
                    </div>

                    <div style={{ fontSize: 11, color: isEligible ? T.sub : T.red }}>
                      {p.min_spend > 0 ? (
                        <span>Min. belanja {fmt(p.min_spend)} {isEligible ? '✓' : `(kurang ${fmt(p.min_spend - subtotal)})`}</span>
                      ) : (
                        <span>Tanpa syarat belanja minimum</span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 800, color: T.green,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}>
                      Potongan {discountText}
                    </div>
                    {isEligible && (
                      <span style={{ fontSize: 10, color: '#EA580C', fontWeight: 800 }}>
                        {isSelected ? '✓ Terpasang' : 'Gunakan →'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
