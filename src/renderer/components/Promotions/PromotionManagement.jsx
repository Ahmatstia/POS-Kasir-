import React, { useState, useEffect } from 'react';
import { 
  getPromotions, 
  addPromotion, 
  updatePromotion, 
  togglePromotionStatus, 
  deletePromotion 
} from '../../services/promotions';
import { useToast } from '../Toast';
import { T } from '../../theme';
import { formatNominal, parseNominal } from '../../utils/format';

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

// ─── MODAL: TAMBAH / EDIT PROMO (Screenshot 1 & 2) ───────────────────────────
export function PromotionFormModal({ promo = null, onClose, onSuccess }) {
  const { showToast } = useToast();
  const isEdit = Boolean(promo?.id);

  const [name, setName]                   = useState(promo?.name || '');
  const [code, setCode]                   = useState(promo?.code || '');
  const [isManuallyEdited, setIsManuallyEdited] = useState(isEdit);
  const [existingPromos, setExistingPromos] = useState([]);
  const [discountType, setDiscountType]   = useState(promo?.discount_type || 'nominal'); // 'nominal' | 'percent'
  const [discountValue, setDiscountValue] = useState(promo?.discount_value ? (promo.discount_type === 'percent' ? String(promo.discount_value) : formatNominal(promo.discount_value)) : '');
  const [minSpend, setMinSpend]           = useState(promo?.min_spend ? formatNominal(promo.min_spend) : '0');
  const [isPermanent, setIsPermanent]     = useState(!promo?.start_date && !promo?.end_date);
  const [startDate, setStartDate]         = useState(promo?.start_date || '');
  const [endDate, setEndDate]             = useState(promo?.end_date || '');
  const [isActive, setIsActive]           = useState(promo ? Boolean(promo.is_active) : true);
  const [submitting, setSubmitting]       = useState(false);

  useEffect(() => {
    getPromotions().then(data => setExistingPromos(data || []));
  }, []);

  // Helper to make guaranteed unique code from name
  const makeUniqueCode = (rawName, promoList = existingPromos, currentId = promo?.id) => {
    const clean = (rawName || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) return '';
    const isTaken = promoList.some(p => p.code?.toUpperCase() === clean && p.id !== currentId);
    if (!isTaken) return clean;

    let suffix = 1;
    let candidate = `${clean}-${suffix}`;
    while (promoList.some(p => p.code?.toUpperCase() === candidate && p.id !== currentId)) {
      suffix++;
      candidate = `${clean}-${suffix}`;
    }
    return candidate;
  };

  // Helper to make unique code with random suffix
  const makeRandomUniqueCode = (rawName, promoList = existingPromos, currentId = promo?.id) => {
    let clean = (rawName || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) clean = 'PROMO';
    if (clean.length > 10) clean = clean.substring(0, 10);

    let candidate = `${clean}-${Math.floor(100 + Math.random() * 900)}`;
    while (promoList.some(p => p.code?.toUpperCase() === candidate && p.id !== currentId)) {
      candidate = `${clean}-${Math.floor(100 + Math.random() * 900)}`;
    }
    return candidate;
  };

  const handleNameChange = (val) => {
    setName(val);
    if (!isManuallyEdited) {
      setCode(makeUniqueCode(val));
    }
  };

  const isCodeTaken = Boolean(
    code.trim() && 
    existingPromos.some(p => p.code?.toUpperCase() === code.trim().toUpperCase() && p.id !== promo?.id)
  );

  const handleValueChange = (val) => {
    if (discountType === 'percent') {
      const num = parseFloat(val.replace(/[^\d.]/g, '')) || 0;
      setDiscountValue(num > 100 ? '100' : String(num));
    } else {
      setDiscountValue(formatNominal(val));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Nama promo wajib diisi');
      return;
    }
    if (!code.trim()) {
      showToast('error', 'Kode promo (unik) wajib diisi');
      return;
    }
    if (isCodeTaken) {
      showToast('error', `Kode promo "${code}" sudah digunakan. Silakan buat kode unik lain.`);
      return;
    }

    const valNum = discountType === 'percent' 
      ? parseFloat(discountValue) || 0 
      : parseNominal(discountValue);

    if (valNum <= 0) {
      showToast('error', 'Nilai potongan harus lebih besar dari 0');
      return;
    }

    if (discountType === 'percent' && valNum > 100) {
      showToast('error', 'Diskon persen tidak boleh melebihi 100%');
      return;
    }

    const minSpendNum = parseNominal(minSpend);

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: valNum,
        min_spend: minSpendNum,
        start_date: isPermanent ? null : (startDate || null),
        end_date: isPermanent ? null : (endDate || null),
        is_active: isActive ? 1 : 0,
      };

      if (isEdit) {
        await updatePromotion(promo.id, payload);
        showToast('success', `Promo "${name}" berhasil diperbarui`);
      } else {
        await addPromotion(payload);
        showToast('success', `Promo "${name}" (${code.toUpperCase()}) berhasil dibuat!`);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast('error', err.message || 'Terjadi kesalahan saat menyimpan promo');
    } finally {
      setSubmitting(false);
    }
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
        borderRadius: 22, width: '100%', maxWidth: 480,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
        overflow: 'hidden', animation: 'scaleUp 0.2s ease',
      }}>
        {/* Header (Screenshot 1) */}
        <div style={{
          padding: '24px 24px 18px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: '#EA580C', color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(234,88,12,0.3)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.text, letterSpacing: '-0.02em' }}>
                {isEdit ? 'Edit Promo & Diskon' : 'Tambah Promo Baru'}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: T.muted }}>
                Buat kode diskon baru untuk pelanggan.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '22px 24px', maxHeight: '78vh', overflowY: 'auto' }}>
          {/* Field: Nama Promo * */}
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>
              Nama Promo <span style={{ color: '#EA580C' }}>*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Contoh: Tahun baru, Berkah Jumat..."
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                border: `1.5px solid ${T.border2}`, background: T.bg,
                color: T.text, fontSize: 13, fontFamily: 'Syne, sans-serif',
                outline: 'none', transition: 'border-color 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#EA580C'}
              onBlur={e => e.currentTarget.style.borderColor = T.border2}
            />
          </div>

          {/* Field: Kode Promo (Unik) * (Auto-generated from Name) */}
          <div style={{ marginBottom: 15 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
                Kode Promo (Unik) <span style={{ color: '#EA580C' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsManuallyEdited(false);
                    setCode(makeUniqueCode(name));
                  }}
                  title="Samakan kode dengan nama promo (terjamin unik)"
                  style={{
                    padding: '2px 8px', borderRadius: 6,
                    border: `1px solid ${T.border2}`, background: T.card,
                    color: T.sub, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  ✨ Sesuai Nama
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsManuallyEdited(true);
                    setCode(makeRandomUniqueCode(name));
                  }}
                  title="Buat kode unik acak"
                  style={{
                    padding: '2px 8px', borderRadius: 6,
                    border: '1px solid #EA580C30', background: '#EA580C12',
                    color: '#EA580C', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  🎲 Acak Unik
                </button>
              </div>
            </div>

            <input
              type="text"
              required
              value={code}
              onChange={e => {
                setIsManuallyEdited(true);
                setCode(e.target.value.toUpperCase().replace(/\s+/g, ''));
              }}
              placeholder="Otomatis terisi unik dari nama promo…"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                border: `1.5px solid ${isCodeTaken ? T.red : (code ? T.green : T.border2)}`,
                background: T.bg,
                color: T.text, fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.08em', fontWeight: 800,
                outline: 'none', transition: 'border-color 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#EA580C'}
              onBlur={e => e.currentTarget.style.borderColor = isCodeTaken ? T.red : (code ? T.green : T.border2)}
            />

            {/* Uniqueness feedback */}
            <div style={{ marginTop: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {isCodeTaken ? (
                <span style={{ fontSize: 11, color: T.red, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚠️ Kode sudah terpakai promo lain!
                  <button
                    type="button"
                    onClick={() => setCode(makeUniqueCode(name))}
                    style={{ background: 'none', border: 'none', color: '#EA580C', textDecoration: 'underline', cursor: 'pointer', fontSize: 11, padding: 0, fontWeight: 700 }}
                  >
                    Bikin Unik Otomatis
                  </button>
                </span>
              ) : code ? (
                <span style={{ fontSize: 11, color: T.green, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  Kode unik & siap dipakai
                </span>
              ) : (
                <span style={{ fontSize: 10, color: T.muted }}>
                  Ketik nama promo di atas untuk auto-generate kode
                </span>
              )}
            </div>
          </div>

          {/* Field: Tipe Diskon (Screenshot 1 & 2 dropdown) */}
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>
              Tipe Diskon <span style={{ color: '#EA580C' }}>*</span>
            </label>
            <select
              value={discountType}
              onChange={e => {
                setDiscountType(e.target.value);
                setDiscountValue('');
              }}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                border: `1.5px solid ${T.border2}`, background: T.bg,
                color: T.text, fontSize: 13, fontFamily: 'Syne, sans-serif',
                fontWeight: 700, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="nominal">Nominal (Rp)</option>
              <option value="percent">Persen (%)</option>
            </select>
          </div>

          {/* Field: Nilai Potongan (Rp / %) * */}
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>
              Nilai Potongan ({discountType === 'percent' ? '%' : 'Rp'}) <span style={{ color: '#EA580C' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={discountValue}
              onChange={e => handleValueChange(e.target.value)}
              placeholder={discountType === 'percent' ? '10' : '12.000'}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                border: `1.5px solid ${T.border2}`, background: T.bg,
                color: T.text, fontSize: 14, fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 800, outline: 'none', transition: 'border-color 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#EA580C'}
              onBlur={e => e.currentTarget.style.borderColor = T.border2}
            />
          </div>

          {/* Field: Minimal Belanja (Rp) */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>
              Minimal Belanja (Rp)
            </label>
            <input
              type="text"
              value={minSpend}
              onChange={e => setMinSpend(formatNominal(e.target.value))}
              placeholder="0"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                border: `1.5px solid ${T.border2}`, background: T.bg,
                color: T.text, fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
                outline: 'none', transition: 'border-color 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#EA580C'}
              onBlur={e => e.currentTarget.style.borderColor = T.border2}
            />
            <p style={{ margin: '4px 0 0', fontSize: 10, color: T.muted }}>
              Isi 0 jika tidak ada syarat minimal belanja nota
            </p>
          </div>

          {/* Field: Tanggal Mulai & Tanggal Berakhir (Screenshot 1) */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
                Periode Berlaku
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', color: T.sub }}>
                <input
                  type="checkbox"
                  checked={isPermanent}
                  onChange={e => setIsPermanent(e.target.checked)}
                  style={{ accentColor: '#EA580C' }}
                />
                Berlaku Selamanya
              </label>
            </div>

            {isPermanent ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{
                  padding: '11px 14px', borderRadius: 12, background: T.card,
                  border: `1px solid ${T.border}`, color: T.muted, fontSize: 12, textAlign: 'center',
                }}>
                  Selamanya
                </div>
                <div style={{
                  padding: '11px 14px', borderRadius: 12, background: T.card,
                  border: `1px solid ${T.border}`, color: T.muted, fontSize: 12, textAlign: 'center',
                }}>
                  Selamanya
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <span style={{ fontSize: 10, color: T.muted, display: 'block', marginBottom: 3 }}>Tanggal Mulai</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      border: `1px solid ${T.border2}`, background: T.bg,
                      color: T.text, fontSize: 12, fontFamily: 'Syne, sans-serif',
                    }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: 10, color: T.muted, display: 'block', marginBottom: 3 }}>Tanggal Berakhir</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      border: `1px solid ${T.border2}`, background: T.bg,
                      color: T.text, fontSize: 12, fontFamily: 'Syne, sans-serif',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Toggle Switch: Promo Aktif (Screenshot 1) */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 12, background: T.card,
            border: `1px solid ${T.border}`, marginBottom: 22,
          }}>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              style={{
                width: 44, height: 24, borderRadius: 100,
                background: isActive ? '#EA580C' : T.border2,
                border: 'none', position: 'relative', cursor: 'pointer',
                transition: 'background 0.2s', padding: 2,
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#FFFFFF',
                transform: isActive ? 'translateX(20px)' : 'translateX(0)',
                transition: 'transform 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }} />
            </button>
            <div>
              <span style={{ fontSize: 13, fontWeight: 800, color: T.text, display: 'block' }}>
                Promo Aktif
              </span>
              <span style={{ fontSize: 10, color: T.muted }}>
                {isActive ? 'Promo dapat digunakan langsung di kasir' : 'Promo sedang dinonaktifkan'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '11px 20px', borderRadius: 12,
                border: `1px solid ${T.border2}`, background: 'transparent',
                color: T.sub, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Syne, sans-serif',
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '11px 26px', borderRadius: 12, border: 'none',
                background: '#EA580C', color: '#FFFFFF',
                fontSize: 13, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: 'Syne, sans-serif', boxShadow: '0 4px 14px rgba(234,88,12,0.4)',
                transition: 'all 0.15s', opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Menyimpan…' : 'Simpan Promo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT: PROMOTION MANAGEMENT ─────────────────────────────────────
export default function PromotionManagement() {
  const { showToast } = useToast();
  const [promotions, setPromotions]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [searchTerm, setSearchTerm]   = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [deletingId, setDeletingId]   = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPromotions(searchTerm);
      setPromotions(data || []);
    } catch (e) {
      console.error(e);
      showToast('error', 'Gagal memuat daftar promo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchTerm]);

  const handleToggle = async (promo) => {
    const nextStatus = promo.is_active ? 0 : 1;
    try {
      await togglePromotionStatus(promo.id, nextStatus);
      showToast('info', `Promo "${promo.name}" ${nextStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleDelete = async (promo) => {
    if (!window.confirm(`Yakin ingin menghapus promo "${promo.name}" (${promo.code})?`)) return;
    setDeletingId(promo.id);
    try {
      await deletePromotion(promo.id);
      showToast('success', `Promo "${promo.name}" berhasil dihapus`);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: 'Syne, sans-serif' }}>
      {/* Top Header Bar */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 18, padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: '-0.02em' }}>
            Promo & Diskon
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: T.muted }}>
            Kelola kode diskon, voucher belanja, dan potongan harga spesial toko
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '10px 18px', borderRadius: 12, border: 'none',
            background: '#EA580C', color: '#FFFFFF',
            fontSize: 12, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 7,
            boxShadow: '0 4px 14px rgba(234,88,12,0.35)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          + Promo
        </button>
      </div>

      {/* Search Input Bar */}
      <div style={{ position: 'relative', width: '100%' }}>
        <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.45 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Cari nama promo atau kode diskon…"
          style={{
            width: '100%', padding: '12px 14px 12px 42px',
            borderRadius: 14, border: `1px solid ${T.border2}`,
            background: T.surface, color: T.text,
            fontSize: 13, fontFamily: 'Syne, sans-serif', outline: 'none',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: T.muted, cursor: 'pointer',
              fontSize: 16, fontWeight: 700,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Promotions Table / Cards */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: T.muted }}>
            Memuat daftar promo…
          </div>
        ) : promotions.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: '#EA580C18',
              color: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: T.text }}>
              {searchTerm ? 'Tidak ada promo yang cocok' : 'Belum ada promo diskon'}
            </p>
            <p style={{ margin: '4px 0 16px', fontSize: 12, color: T.muted }}>
              {searchTerm ? 'Coba cari dengan kata kunci lain' : 'Klik tombol "+ Promo" di atas untuk membuat kode diskon baru'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  padding: '9px 18px', borderRadius: 10, border: 'none',
                  background: '#EA580C', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                + Buat Promo Pertama
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead>
                <tr style={{ background: T.card, borderBottom: `1px solid ${T.border}`, color: T.sub, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>
                  <th style={{ padding: '14px 18px' }}>Kode & Nama Promo</th>
                  <th style={{ padding: '14px 18px' }}>Potongan Diskon</th>
                  <th style={{ padding: '14px 18px' }}>Syarat Belanja</th>
                  <th style={{ padding: '14px 18px' }}>Periode Berlaku</th>
                  <th style={{ padding: '14px 18px' }}>Status</th>
                  <th style={{ padding: '14px 18px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((p) => {
                  const isPercent = p.discount_type === 'percent';
                  const discountFormatted = isPercent 
                    ? `${p.discount_value}%` 
                    : fmt(p.discount_value);

                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = T.bg}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Code & Name */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            padding: '6px 10px', borderRadius: 8,
                            background: '#EA580C14', border: '1px solid #EA580C30',
                            color: '#EA580C', fontFamily: 'JetBrains Mono, monospace',
                            fontWeight: 800, fontSize: 12, letterSpacing: '0.05em',
                          }}>
                            {p.code}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: 10, color: T.muted }}>
                              ID #{p.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Nilai Diskon */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 8,
                          background: T.green + '14', border: `1px solid ${T.green}30`,
                          color: T.green, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 12,
                        }}>
                          {discountFormatted}
                        </span>
                      </td>

                      {/* Minimal Belanja */}
                      <td style={{ padding: '14px 18px', fontFamily: 'JetBrains Mono, monospace', color: T.sub }}>
                        {p.min_spend > 0 ? (
                          <span>Min. {fmt(p.min_spend)}</span>
                        ) : (
                          <span style={{ color: T.muted }}>Tanpa minimal</span>
                        )}
                      </td>

                      {/* Periode */}
                      <td style={{ padding: '14px 18px', color: T.sub, fontSize: 11 }}>
                        {!p.start_date && !p.end_date ? (
                          <span style={{ color: T.muted, fontStyle: 'italic' }}>Selamanya</span>
                        ) : (
                          <span>{p.start_date || 'Awal'} s/d {p.end_date || 'Seterusnya'}</span>
                        )}
                      </td>

                      {/* Status Toggle Switch */}
                      <td style={{ padding: '14px 18px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggle(p)}
                          style={{
                            width: 38, height: 20, borderRadius: 100,
                            background: p.is_active ? '#EA580C' : T.border2,
                            border: 'none', position: 'relative', cursor: 'pointer',
                            transition: 'background 0.2s', padding: 2,
                          }}
                          title={p.is_active ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                        >
                          <div style={{
                            width: 16, height: 16, borderRadius: '50%', background: '#FFFFFF',
                            transform: p.is_active ? 'translateX(18px)' : 'translateX(0)',
                            transition: 'transform 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          }} />
                        </button>
                      </td>

                      {/* Action buttons */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => setEditingPromo(p)}
                            style={{
                              padding: '6px 10px', borderRadius: 8,
                              border: `1px solid ${T.border2}`, background: T.surface,
                              color: T.sub, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            disabled={deletingId === p.id}
                            style={{
                              padding: '6px 9px', borderRadius: 8,
                              border: `1px solid ${T.red}30`, background: T.red + '0C',
                              color: T.red, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            {deletingId === p.id ? '…' : 'Hapus'}
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

      {/* MODAL TAMBAH PROMO */}
      {showAddModal && (
        <PromotionFormModal
          onClose={() => setShowAddModal(false)}
          onSuccess={loadData}
        />
      )}

      {/* MODAL EDIT PROMO */}
      {editingPromo && (
        <PromotionFormModal
          promo={editingPromo}
          onClose={() => setEditingPromo(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
