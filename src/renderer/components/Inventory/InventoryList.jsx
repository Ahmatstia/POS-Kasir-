import React, { useState, useEffect, useMemo } from "react";
import { getInventorySummary, getLowStockProducts, addStock, adjustStock } from "../../services/inventory";
import { getCategories } from "../../services/database";
import { isPrivacyModeEnabled } from "../../services/settings";
import { useToast } from "../Toast";
import { T } from "../../theme";
import { InventoryIcon } from "../Icons/AppIcons";
import { formatNominal, parseNominal } from "../../utils/format";

const fmt    = n => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const numFmt = n => Number(n || 0).toLocaleString('id-ID');

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon, onClick, active }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.surface,
        border: `1px solid ${active ? color : T.border}`,
        borderRadius: 14,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        boxShadow: active ? `0 0 0 1px ${color}40` : 'none',
      }}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          e.currentTarget.style.borderColor = active ? color : T.border;
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: color + '14', border: `1px solid ${color}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{value}</p>
      </div>
    </div>
  );
}

// ─── STOCK IN MODAL ──────────────────────────────────────────────────────────
function StockInModal({ product, onClose, onSuccess, showToast, hideCost }) {
  const [qtyDus, setQtyDus]     = useState('');
  const [qtyPack, setQtyPack]   = useState('');
  const [qtyPcs, setQtyPcs]     = useState('');
  const [qtyKg, setQtyKg]       = useState('');
  const [qtyKarung, setQtyKarung] = useState('');
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const pp = product.pcs_per_pack || 1;
  const pd = product.pack_per_dus || 1;
  const kgPerKarung = product.kg_per_karung || 25;
  
  // Revised Hybrid Detection: use flags from service if available, fallback to prices
  const hasUnitPrices = product.has_unit_price ?? ((Number(product.price_pcs) || 0) > 0 || (Number(product.price_pack) || 0) > 0 || (Number(product.price_dus) || 0) > 0);
  const hasWeightPrices = product.has_weight_price ?? ((Number(product.price_kg) || 0) > 0 || (Number(product.price_karung) || 0) > 0);
  
  const isKgOnly = product?.sell_per_unit === 'kg';
  const isHybrid = hasUnitPrices && hasWeightPrices;

  // Available cost units (Dus, Pack, Pcs or Karung, Kg)
  const costUnitOptions = useMemo(() => {
    if (isKgOnly) {
      const opts = [];
      if (kgPerKarung > 1) opts.push({ key: 'karung', label: 'Per Karung', mult: kgPerKarung });
      opts.push({ key: 'kg', label: 'Per Kg', mult: 1 });
      return opts;
    }
    const opts = [];
    if (pd > 1) opts.push({ key: 'dus', label: `Per ${product?.dus_label || 'Dus'}`, mult: pd * pp });
    if (pp > 1) opts.push({ key: 'pack', label: 'Per Pack', mult: pp });
    opts.push({ key: 'pcs', label: 'Per Pcs', mult: 1 });
    return opts;
  }, [isKgOnly, kgPerKarung, pd, pp, product?.dus_label]);

  const defaultCostUnit = costUnitOptions[0]?.key || (isKgOnly ? 'kg' : 'pcs');
  const [costUnit, setCostUnit] = useState(defaultCostUnit);

  const baseMaster = Number(product?.purchase_price) || 0;
  const initMult = costUnitOptions.find(o => o.key === defaultCostUnit)?.mult || 1;
  const [purchasePrice, setPurchasePrice] = useState(baseMaster > 0 ? String(Math.round(baseMaster * initMult)) : '');

  const handleCostUnitChange = (newUnit) => {
    const curMult = costUnitOptions.find(o => o.key === costUnit)?.mult || 1;
    const newMult = costUnitOptions.find(o => o.key === newUnit)?.mult || 1;
    const curVal = parseNominal(purchasePrice);
    if (curVal > 0) {
      const base = curVal / curMult;
      const converted = Math.round(base * newMult);
      setPurchasePrice(String(converted));
    }
    setCostUnit(newUnit);
  };

  const curMult = costUnitOptions.find(o => o.key === costUnit)?.mult || 1;
  const enteredVal = parseNominal(purchasePrice);
  const computedBasePrice = enteredVal > 0 ? Math.round(enteredVal / curMult) : baseMaster;
  
  const dusVal  = parseInt(qtyDus)  || 0;
  const packVal = parseInt(qtyPack) || 0;
  const pcsVal  = parseInt(qtyPcs)  || 0;
  const kgVal   = parseFloat(qtyKg) || 0;
  
  const totalPcs = (dusVal * pd * pp) + (packVal * pp) + pcsVal;
  const totalKg  = kgVal;

  const isKg = isKgOnly || (totalKg > 0 && totalPcs === 0);

  const totalDisplay = [
    totalKg > 0 ? `${totalKg} Kg` : '',
    totalPcs > 0 ? `${totalPcs} Pcs` : ''
  ].filter(Boolean).join(' & ') || '0 Pcs';

  const handleSave = async () => {
    if (totalPcs <= 0 && totalKg <= 0) { setError('Masukkan jumlah stok yang valid'); return; }
    setError('');
    setSaving(true);
    const res = await addStock(product.id, {
      qty_dus: dusVal, qty_pack: packVal, qty_pcs: pcsVal, qty_kg: kgVal,
      purchase_price: computedBasePrice,
      notes,
    }, product);
    setSaving(false);
    if (res.success) {
      showToast('success', `Stok ${product.name} bertambah ${totalDisplay}`);
      onSuccess(); onClose();
    } else {
      setError('Gagal menyimpan: ' + res.error);
    }
  };

  const inp = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: `1px solid ${T.border2}`, background: T.bg, color: T.text,
    fontFamily: 'JetBrains Mono, monospace', fontSize: 14, outline: 'none',
    transition: 'border-color 0.15s',
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Syne, sans-serif', padding: 20,
    }}>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div style={{
        width: '100%', maxWidth: 500,
        background: T.surface, border: `1px solid ${T.border2}`,
        borderRadius: 20, overflow: 'hidden',
        animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both',
        boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>Barang Masuk / Tambah Stok</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{product.name}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Conversion reference */}
          {(pp > 1 || pd > 1) && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: T.blue + '08', border: `1px solid ${T.blue}20`, display: 'flex', gap: 14 }}>
              <span style={{ fontSize: 11, color: T.blue, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>Konversi:</span>
              <div style={{ display: 'flex', gap: 12 }}>
                {pd > 1 && <span style={{ fontSize: 11, color: T.blue, fontFamily: 'JetBrains Mono, monospace' }}>1 {product?.dus_label || 'Dus'} = {pd} Pk</span>}
                {pp > 1 && <span style={{ fontSize: 11, color: T.blue, fontFamily: 'JetBrains Mono, monospace' }}>1 Pk = {pp} Pcs</span>}
              </div>
            </div>
          )}

          {/* Qty inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(isKgOnly || isHybrid) && (
              <div style={{ padding: 14, background: T.purple + '06', border: `1.5px dashed ${T.purple}30`, borderRadius: 14 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.purple, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  Stok Timbangan (Kg / Karung)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                  <div style={{ position: 'relative' }}>
                    <input type="number" step="0.01" min="0" value={qtyKg} onChange={e => { setQtyKg(e.target.value); setError(''); }}
                      placeholder="0.00" style={{ ...inp, fontSize: 16, padding: '12px 38px 12px 12px' }} autoFocus={isKgOnly} />
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 800, color: T.purple }}>Kg</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input type="number" min="0" value={qtyKarung} onChange={e => { 
                        const val = e.target.value;
                        setQtyKarung(val);
                        const numVal = parseInt(val) || 0;
                        const kgPerKarung = product.kg_per_karung || 25;
                        setQtyKg(String(numVal * kgPerKarung));
                        setError(''); 
                      }}
                      placeholder="Karung" style={{ ...inp, fontSize: 15, padding: '12px' }} />
                  </div>
                </div>
              </div>
            )}
            
            {(!isKgOnly || isHybrid) && (
              <div style={{ padding: 14, background: T.blue + '06', border: `1.5px dashed ${T.blue}30`, borderRadius: 14 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.blue, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  Stok Kemasan (Pcs / Pack / {product?.dus_label || 'Dus'})
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 700, color: T.muted, marginBottom: 5, textAlign: 'center' }}>{(product?.dus_label || 'DUS').toUpperCase()}</p>
                    <input type="number" min="0" value={qtyDus && !isKgOnly ? qtyDus : ''} onChange={e => { setQtyDus(e.target.value); setError(''); }}
                      placeholder="0" style={{ ...inp, opacity: pd > 1 ? 1 : 0.4 }} disabled={pd <= 1} />
                  </div>
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 700, color: T.muted, marginBottom: 5, textAlign: 'center' }}>PACK</p>
                    <input type="number" min="0" value={qtyPack} onChange={e => { setQtyPack(e.target.value); setError(''); }}
                      placeholder="0" style={{ ...inp, opacity: pp > 1 ? 1 : 0.4 }} disabled={pp <= 1} />
                  </div>
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 700, color: T.muted, marginBottom: 5, textAlign: 'center' }}>PCS</p>
                    <input type="number" min="0" value={qtyPcs} onChange={e => { setQtyPcs(e.target.value); setError(''); }}
                      placeholder="0" style={{ ...inp }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Total Summary */}
          <div style={{
            padding: '12px 16px', borderRadius: 12,
            background: (totalPcs > 0 || totalKg > 0) ? T.bg : T.border,
            border: `1.5px solid ${(totalPcs > 0 || totalKg > 0) ? T.green + '40' : T.border2}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: T.sub }}>Akan Ditambahkan:</span>
            <span style={{ fontSize: 17, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: T.green }}>
              {totalDisplay}
            </span>
          </div>

          {/* Purchase Price Input with Auto-Calculator */}
          {!hideCost && (
            <div style={{ background: T.bg2, padding: '14px 16px', borderRadius: 14, border: `1px solid ${T.border2}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ fontSize: 10, fontWeight: 800, color: T.green, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Harga Modal / Beli
                </label>
                {/* Unit Switcher */}
                {costUnitOptions.length > 1 && (
                  <div style={{ display: 'flex', gap: 4, background: T.surface, padding: 3, borderRadius: 8, border: `1px solid ${T.border}` }}>
                    {costUnitOptions.map(opt => {
                      const isSel = costUnit === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleCostUnitChange(opt.key)}
                          style={{
                            padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                            background: isSel ? T.green : 'transparent',
                            color: isSel ? '#fff' : T.sub,
                            border: 'none', cursor: 'pointer', transition: 'all 0.15s'
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: T.muted }}>Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNominal(purchasePrice)}
                  onChange={e => setPurchasePrice(e.target.value.replace(/\D/g, ''))}
                  placeholder="0"
                  style={{ ...inp, paddingLeft: 34, fontSize: 15 }}
                />
              </div>

              {/* Dynamic conversion indicator */}
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.green, fontFamily: 'JetBrains Mono, monospace' }}>
                  Modal Eceran: Rp {formatNominal(computedBasePrice)} / {isKgOnly ? 'Kg' : 'Pcs'}
                </span>
                {curMult > 1 && (
                  <span style={{ fontSize: 10, color: T.muted }}>
                    (Otomatis dibagi {curMult} dari harga {costUnit === 'dus' ? (product?.dus_label || 'Dus').toLowerCase() : costUnit})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Notes Input */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Catatan (Opsional)
            </label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Misal: Dari Toko Makmur / Grosir Jaya" style={inp} />
          </div>

          {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: T.red + '0A', border: `1px solid ${T.red}20`, fontSize: 12, color: T.red, fontWeight: 700 }}>{error}</div>}

          {/* Footer Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: '12px', borderRadius: 12, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Batal
            </button>
            <button 
              type="button"
              onClick={handleSave} 
              disabled={saving || (totalPcs <= 0 && totalKg <= 0)} 
              style={{ 
                padding: '12px', borderRadius: 12, 
                background: (saving || (totalPcs <= 0 && totalKg <= 0)) ? T.border2 : T.accent, 
                color: (saving || (totalPcs <= 0 && totalKg <= 0)) ? T.muted : '#fff', 
                fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, 
                cursor: (saving || (totalPcs <= 0 && totalKg <= 0)) ? 'not-allowed' : 'pointer', 
                border: 'none', transition: 'all 0.2s',
                boxShadow: (saving || (totalPcs <= 0 && totalKg <= 0)) ? 'none' : `0 6px 16px ${T.accent}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}>
              {saving ? (
                <><div style={{ width: 14, height: 14, border: `2px solid #ffffff40`, borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>Menyimpan…</>
              ) : `+ Simpan Stok Masuk`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADJUST MODAL ─────────────────────────────────────────────────────────────
function AdjustModal({ product, onClose, onSuccess, showToast, isKg: isKgProp }) {
  // Preset reasons
  const REASONS = ['Hitung Ulang Isi Rak', 'Barang Rusak / Bocor', 'Barang Hilang / Selisih', 'Koreksi Data', 'Lain-lain'];

  const hasUnitPrices = product.has_unit_price ?? ((Number(product.price_pcs) || 0) > 0 || (Number(product.price_pack) || 0) > 0 || (Number(product.price_dus) || 0) > 0);
  const hasWeightPrices = product.has_weight_price ?? ((Number(product.price_kg) || 0) > 0 || (Number(product.price_karung) || 0) > 0);
  const isHybrid = hasUnitPrices && hasWeightPrices;

  const isKg = isKgProp ?? (product?.sell_per_unit === 'kg');
  const [adjustUnit, setAdjustUnit] = useState(isKg ? 'kg' : 'pcs');
  const currentBase = adjustUnit === 'kg' ? (product.stock_kg || 0) : (product.stock || 0);

  const [newQty, setNewQty]   = useState(String(currentBase));
  const [reason, setReason]   = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const newVal = adjustUnit === 'kg' ? (parseFloat(newQty) || 0) : (parseInt(newQty) || 0);
  const diff   = newVal - currentBase;
  const isPlus = diff > 0;

  useEffect(() => {
    setNewQty(String(currentBase));
  }, [adjustUnit, currentBase]);

  const handleSave = async () => {
    if (!reason.trim()) { setError('Alasan pencocokan stok wajib dipilih/diisi'); return; }
    if (newVal < 0)     { setError('Stok tidak boleh negatif'); return; }
    setError('');
    setSaving(true);
    let res;
    const hppVal = 0;
    import('../../services/inventory').then(async ({ adjustStockKg, adjustStock }) => {
        if (adjustUnit === 'kg') res = await adjustStockKg(product.id, newVal, reason, hppVal);
        else                     res = await adjustStock(product.id, newVal, reason, hppVal);

       setSaving(false);
       if (res.success) {
         showToast('success', `Stok ${product.name} dicocokkan ke ${newVal} ${adjustUnit === 'kg' ? 'Kg' : 'Pcs'}`);
         onSuccess(); onClose();
       } else {
         setError('Gagal: ' + res.error);
       }
    });
  };

  const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border2}`, background: T.bg, color: T.text, fontFamily: 'JetBrains Mono, monospace', fontSize: 14, outline: 'none' };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440, background: T.surface, border: `1px solid ${T.border2}`, borderRadius: 20, overflow: 'hidden', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both', boxShadow: '0 40px 100px rgba(0,0,0,0.7)' }}>
        <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

        <div style={{ padding: '20px 22px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Cocokkan Stok dengan Isi Rak</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{product.name}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Unit Switcher for Hybrid */}
          {isHybrid && (
            <div style={{ display: 'flex', gap: 10, background: T.bg, padding: 4, borderRadius: 12, border: `1px solid ${T.border2}`, marginBottom: 20 }}>
               <button onClick={() => setAdjustUnit('pcs')} style={{ flex: 1, padding: '8px', borderRadius: 9, fontSize: 10, fontWeight: 700, border: 'none', background: adjustUnit === 'pcs' ? T.blue : 'transparent', color: adjustUnit === 'pcs' ? '#fff' : T.sub, cursor: 'pointer', transition: 'all 0.2s' }}>Koreksi PCS</button>
               <button onClick={() => setAdjustUnit('kg')} style={{ flex: 1, padding: '8px', borderRadius: 9, fontSize: 10, fontWeight: 700, border: 'none', background: adjustUnit === 'kg' ? T.purple : 'transparent', color: adjustUnit === 'kg' ? '#fff' : T.sub, cursor: 'pointer', transition: 'all 0.2s' }}>Koreksi KG</button>
            </div>
          )}

          {/* Before / After cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
            <div style={{ padding: '16px', borderRadius: 16, background: T.bg, border: `1px solid ${T.border2}`, textAlign: 'center' }}>
              <p style={{ fontSize: 10, color: T.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Saat Ini</p>
              <p style={{ fontSize: 26, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: T.text, lineHeight: 1 }}>{adjustUnit === 'kg' ? Number(currentBase).toFixed(2) : numFmt(currentBase)}</p>
              <p style={{ fontSize: 11, color: T.sub, fontWeight: 700, marginTop: 4 }}>{adjustUnit === 'kg' ? 'Kg' : 'Pcs'}</p>
            </div>
            <div style={{ fontSize: 20, color: (parseFloat(newQty) - currentBase) !== 0 ? ((parseFloat(newQty) - currentBase) > 0 ? T.green : T.red) : T.muted, fontWeight: 900 }}>→</div>
            <div style={{ 
              padding: '16px', borderRadius: 16, 
              background: (parseFloat(newQty) - currentBase) === 0 ? T.bg : (parseFloat(newQty) - currentBase) > 0 ? T.green + '08' : T.red + '08', 
              border: `1.5px solid ${(parseFloat(newQty) - currentBase) === 0 ? T.border2 : (parseFloat(newQty) - currentBase) > 0 ? T.green + '40' : T.red + '40'}`, 
              textAlign: 'center', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: (parseFloat(newQty) - currentBase) === 0 ? 'none' : (parseFloat(newQty) - currentBase) > 0 ? `0 8px 20px ${T.green}15` : `0 8px 20px ${T.red}15`
            }}>
              <p style={{ fontSize: 10, color: T.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Sesudah</p>
              <p style={{ fontSize: 26, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: (parseFloat(newQty) - currentBase) === 0 ? T.text : (parseFloat(newQty) - currentBase) > 0 ? T.green : T.red, lineHeight: 1 }}>{adjustUnit === 'kg' ? (parseFloat(newQty) || 0).toFixed(2) : numFmt(parseInt(newQty) || 0)}</p>
              <p style={{ fontSize: 11, color: T.sub, fontWeight: 700, marginTop: 4 }}>{adjustUnit === 'kg' ? 'Kg' : 'Pcs'}</p>
            </div>
          </div>

          {/* Diff information */}
          {diff !== 0 && (
            <div style={{ 
              textAlign: 'center', padding: '10px', borderRadius: 12, 
              background: isPlus ? T.green + '05' : T.red + '05', 
              fontSize: 13, fontWeight: 800, color: isPlus ? T.green : T.red, 
              fontFamily: 'JetBrains Mono, monospace', border: `1px dashed ${isPlus ? T.green : T.red}30`
            }}>
              {isPlus ? 'BERTAMBAH' : 'BERKURANG'} {adjustUnit === 'kg' ? Math.abs(diff).toFixed(2) : numFmt(Math.abs(diff))} {adjustUnit === 'kg' ? 'Kg' : 'Pcs'}
            </div>
          )}

          {/* Input section */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Stok Fisik Baru (Total)
            </label>
            <div style={{ position: 'relative' }}>
               <input type="number" step={adjustUnit === 'kg' ? "0.01" : "1"} min="0" value={newQty}
                onChange={e => setNewQty(e.target.value)}
                style={{ ...inp, fontSize: 24, textAlign: 'center', fontWeight: 900, padding: '18px', border: `2px solid ${T.border2}`, borderRadius: 16 }}
                autoFocus
              />
              <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 800, color: T.muted }}>
                {adjustUnit === 'kg' ? 'Kg' : 'Pcs'}
              </div>
            </div>
          </div>

          {/* Reasons */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: error ? T.red : T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Alasan Penyesuaian <span style={{ color: T.red }}>*</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {REASONS.map(r => (
                <button key={r} onClick={() => { setReason(r); setError(''); }} 
                  style={{ 
                    padding: '8px 14px', borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: 'pointer', 
                    border: `1.5px solid ${reason === r ? T.accent : T.border2}`, 
                    background: reason === r ? T.accent + '10' : T.bg, 
                    color: reason === r ? T.accent : T.sub, transition: 'all 0.2s', fontFamily: 'Syne, sans-serif' 
                  }}>
                  {r}
                </button>
              ))}
            </div>
            <input value={reason} onChange={e => { setReason(e.target.value); setError(''); }}
              placeholder="Atau masukkan alasan manual…"
              style={{ ...inp, fontFamily: 'Syne, sans-serif', fontSize: 13, padding: '12px', borderRadius: 12, borderColor: error ? T.red : undefined }}
            />
            {error && <p style={{ fontSize: 11, color: T.red, marginTop: 8, fontWeight: 700 }}>️ {error}</p>}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginTop: 10 }}>
            <button onClick={onClose} style={{ padding: '14px', borderRadius: 14, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Batal</button>
            <button 
              onClick={handleSave} disabled={saving || diff === 0} 
              style={{ 
                padding: '14px', borderRadius: 14, 
                background: (saving || diff === 0) ? T.border2 : T.accent, 
                color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, 
                cursor: (saving || diff === 0) ? 'not-allowed' : 'pointer', border: 'none',
                opacity: diff === 0 ? 0.6 : 1, transition: 'all 0.2s',
                boxShadow: (saving || diff === 0) ? 'none' : `0 8px 20px ${T.accent}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
              }}>
              {saving ? (
                <><div style={{ width: 16, height: 16, border: `2px solid #ffffff40`, borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>Menyimpan…</>
              ) : diff === 0 ? 'Input Stok Baru' : 'Simpan Penyesuaian'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN INVENTORY LIST ──────────────────────────────────────────────────────
function InventoryList() {
  const { showToast } = useToast();
  const [products, setProducts]         = useState([]);
  const [categories, setCategories]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterCat, setFilterCat]       = useState('');
  const [filterUnit, setFilterUnit]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [activeTab, setActiveTab]         = useState('list'); // 'list' or 'log'
  const [logs, setLogs]                   = useState([]);
  const [hideCost, setHideCost]           = useState(false);
  const [stockInProduct, setStockInProduct] = useState(null);
  const [adjustProduct, setAdjustProduct]   = useState(null);

  useEffect(() => { 
    if (activeTab === 'list') load();
    else loadLogs();
  }, [activeTab]);

  const load = async () => {
    setLoading(true);
    const [inv, cats, isPrivacy] = await Promise.all([
      getInventorySummary(), 
      getCategories(),
      isPrivacyModeEnabled()
    ]);
    setProducts(inv);
    setCategories(cats);
    setHideCost(isPrivacy);
    setLoading(false);
  };

  const loadLogs = async () => {
    setLoading(true);
    import('../../services/inventory').then(async ({ getInventoryLog }) => {
      const data = await getInventoryLog(null, 200);
      setLogs(data);
      setLoading(false);
    });
  };

  const filtered = products.filter(p => {
    if (searchTerm && !p.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterCat && p.category_id !== parseInt(filterCat)) return false;
    if (filterUnit) {
      if (filterUnit === 'kemasan' && p.sell_per_unit === 'kg') return false;
      if (filterUnit === 'timbangan' && p.sell_per_unit !== 'kg') return false;
    }

    const hasUnit   = p.has_unit_price   ?? ((Number(p.price_pcs) || 0) > 0 || (Number(p.price_pack) || 0) > 0 || (Number(p.price_dus) || 0) > 0);
    const hasWeight = p.has_weight_price ?? ((Number(p.price_kg) || 0) > 0 || (Number(p.price_karung) || 0) > 0);
    const isHybrid  = hasUnit && hasWeight;
    const isKg      = p.sell_per_unit === 'kg';

    if (isHybrid) {
      const sPcs = p.stock || 0;
      const mPcs = p.min_stock || 0;
      const sKg  = p.stock_kg || 0;
      const mKg  = p.min_stock_kg || 0;
      
      const isPcsEmpty = sPcs <= 0;
      const isKgEmpty  = sKg <= 0;
      const isPcsLow   = sPcs <= mPcs;
      const isKgLow    = sKg <= mKg;

      if (filterStatus === 'habis')   return isPcsEmpty && isKgEmpty;
      if (filterStatus === 'menipis') return ! (isPcsEmpty && isKgEmpty) && (isPcsLow || isKgLow);
      if (filterStatus === 'aman')    return ! (isPcsLow || isKgLow);
    } else {
      const cStock = isKg ? (p.stock_kg || 0) : (p.stock || 0);
      const cMin   = isKg ? (p.min_stock_kg || 0) : (p.min_stock || 0);

      if (filterStatus === 'habis')   return cStock <= 0;
      if (filterStatus === 'menipis') return cStock > 0 && cStock <= cMin;
      if (filterStatus === 'aman')    return cStock > cMin;
    }
    return true;
  });

  // Stats
  const getProductStatus = (p) => {
    const hasUnit   = p.has_unit_price   ?? ((Number(p.price_pcs) || 0) > 0 || (Number(p.price_pack) || 0) > 0 || (Number(p.price_dus) || 0) > 0);
    const hasWeight = p.has_weight_price ?? ((Number(p.price_kg) || 0) > 0 || (Number(p.price_karung) || 0) > 0);
    const isHybrid  = hasUnit && hasWeight;

    if (isHybrid) {
      if ((p.stock || 0) <= 0 && (p.stock_kg || 0) <= 0) return 'habis';
      if ((p.stock || 0) <= (p.min_stock || 0) || (p.stock_kg || 0) <= (p.min_stock_kg || 0)) return 'menipis';
      return 'aman';
    } else {
      const isKg = p.sell_per_unit === 'kg';
      const s = isKg ? (p.stock_kg || 0) : (p.stock || 0);
      const m = isKg ? (p.min_stock_kg || 0) : (p.min_stock || 0);
      if (s <= 0) return 'habis';
      if (s <= m) return 'menipis';
      return 'aman';
    }
  };

  const aman    = products.filter(p => getProductStatus(p) === 'aman').length;
  const menipis = products.filter(p => getProductStatus(p) === 'menipis').length;
  const habis   = products.filter(p => getProductStatus(p) === 'habis').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', fontFamily: 'Syne, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 42, height: 42, border: `3px solid ${T.border2}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite', margin: '0 auto 16px' }} />
          <p style={{ fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Mengambil Data Inventori…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

        .inv-input {
          width: 100%; padding: 9px 12px;
          border-radius: 10px; border: 1px solid ${T.border2};
          background: ${T.bg}; color: ${T.text};
          font-family: 'Syne', sans-serif; font-size: 12px;
          outline: none; transition: border-color 0.15s;
        }
        .inv-input:focus { border-color: ${T.accent}60; box-shadow: 0 0 0 2px ${T.accent}10; }

        /* TABLE view */
        .inv-table { width: 100%; border-collapse: collapse; font-family: 'Syne', sans-serif; }
        .inv-table th {
          padding: 10px 14px; font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: ${T.muted};
          border-bottom: 1px solid ${T.border}; text-align: left; white-space: nowrap;
        }
        .inv-table td {
          padding: 12px 14px; font-size: 12px; color: ${T.sub};
          border-bottom: 1px solid ${T.border}; white-space: nowrap;
        }
        .inv-table tbody tr { transition: background 0.12s; }
        .inv-table tbody tr:hover td { background: ${T.border}40; }
        .inv-table tbody tr:last-child td { border-bottom: none; }

        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 4px; }
      `}</style>

      <div style={{ animation: 'fadeUp 0.4s ease both', fontFamily: 'Syne, sans-serif' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <InventoryIcon />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.01em' }}>Inventori Stok</h2>
          </div>
          <div style={{ display: 'flex', background: T.border, borderRadius: 10, padding: 3, gap: 2 }}>
            {[
              { id: 'list', label: 'Daftar Stok' },
              { id: 'log', label: 'Riwayat Stok (Log)' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none',
                  background: activeTab === tab.id ? T.surface : 'transparent',
                  color: activeTab === tab.id ? T.accent : T.muted,
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Syne, sans-serif', transition: 'all 0.15s',
                  boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 8 }}>
          <StatCard
            label="Total Jenis Barang"
            value={products.length}
            color={T.blue}
            active={filterStatus === ''}
            onClick={() => setFilterStatus('')}
            icon={
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.5" stroke={T.blue} strokeWidth="1.5"/><rect x="10" y="2" width="6" height="6" rx="1.5" stroke={T.blue} strokeWidth="1.5"/><rect x="2" y="10" width="6" height="6" rx="1.5" stroke={T.blue} strokeWidth="1.5"/><rect x="10" y="10" width="6" height="6" rx="1.5" stroke={T.blue} strokeWidth="1.5"/></svg>
            }
          />
          <StatCard
            label="Stok Aman"
            value={aman}
            color={T.green}
            active={filterStatus === 'aman'}
            onClick={() => setFilterStatus(filterStatus === 'aman' ? '' : 'aman')}
            icon={
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9l3.5 3.5L14 5" stroke={T.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            }
          />
          <StatCard
            label="Stok Menipis"
            value={menipis}
            color={T.accent}
            active={filterStatus === 'menipis'}
            onClick={() => setFilterStatus(filterStatus === 'menipis' ? '' : 'menipis')}
            icon={
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L16 14H2L9 2Z" stroke={T.accent} strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 7v3.5M9 12v.5" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round"/></svg>
            }
          />
          <StatCard
            label="Stok Habis"
            value={habis}
            color={T.red}
            active={filterStatus === 'habis'}
            onClick={() => setFilterStatus(filterStatus === 'habis' ? '' : 'habis')}
            icon={
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke={T.red} strokeWidth="1.5"/><path d="M6 9h6" stroke={T.red} strokeWidth="1.8" strokeLinecap="round"/></svg>
            }
          />
        </div>

        {activeTab === 'list' ? (
          <>
            {/* ── FILTER BAR ── */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px 150px auto', gap: 10, alignItems: 'center' }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: 0.35, pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <circle cx="5.5" cy="5.5" r="4" stroke={T.sub} strokeWidth="1.4"/>
                    <path d="M8.5 8.5L11 11" stroke={T.sub} strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  <input
                    type="text" value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Cari nama produk…"
                    className="inv-input"
                    style={{ paddingLeft: 30 }}
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 16, lineHeight: 1 }}>×</button>
                  )}
                </div>

                {/* Category */}
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="inv-input" style={{ cursor: 'pointer' }}>
                  <option value="">Semua Kategori</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                {/* Unit */}
                <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)} className="inv-input" style={{ cursor: 'pointer' }}>
                  <option value="">Semua Satuan</option>
                  <option value="kemasan">Produk Kemasan</option>
                  <option value="timbangan">Produk Timbangan</option>
                </select>

                {/* Status */}
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="inv-input" style={{ cursor: 'pointer' }}>
                  <option value="">Semua Status</option>
                  <option value="aman">Stok Aman</option>
                  <option value="menipis">Stok Menipis</option>
                  <option value="habis">Stok Habis</option>
                </select>

                {/* Reset */}
                <button
                  onClick={() => { setSearchTerm(''); setFilterCat(''); setFilterUnit(''); setFilterStatus(''); }}
                  style={{ padding: '9px 12px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, fontSize: 11, fontWeight: 700, fontFamily: 'Syne, sans-serif', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.border; e.currentTarget.style.color = T.text; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.sub; }}
                >
                  Reset
                </button>
              </div>

              {/* Result count */}
              <div style={{ marginTop: 10, fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
                <span style={{ color: T.accent, fontWeight: 700 }}>{filtered.length}</span>
                <span> / {products.length} produk ditampilkan</span>
                {searchTerm && <span style={{ color: T.sub }}> · "{searchTerm}"</span>}
                {filterStatus && <span style={{ color: filterStatus === 'habis' ? T.red : filterStatus === 'menipis' ? T.accent : T.green }}> · Status: {filterStatus}</span>}
              </div>
            </div>

            {/* ── TABLE ── */}
            {filtered.length === 0 ? (
              <div style={{
                background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
                padding: '48px 24px', textAlign: 'center',
                minHeight: 'calc(100vh - 280px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto 16px', opacity: 0.25 }}>
                  <rect x="6" y="6" width="36" height="36" rx="6" stroke={T.sub} strokeWidth="2"/>
                  <path d="M16 24h16M16 32h10M16 16h6" stroke={T.sub} strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p style={{ fontSize: 14, fontWeight: 700, color: T.muted, marginBottom: 8 }}>Tidak ada produk yang cocok</p>
                <p style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>Coba ubah atau hapus filter</p>
                <button onClick={() => { setSearchTerm(''); setFilterCat(''); setFilterUnit(''); setFilterStatus(''); }} style={{ padding: '9px 18px', borderRadius: 10, border: `1px solid ${T.blue}35`, background: T.blue + '10', color: T.blue, fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Reset Filter</button>
              </div>
            ) : (
              <div style={{
                background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden',
                minHeight: 'calc(100vh - 280px)',
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="inv-table">
                    <thead>
                      <tr>
                        {['Nama Produk', 'Kategori', 'Stok Saat Ini', 'Batas Min', 'Grosir / Kemasan', 'Status', 'Aksi'].map(h => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(product => {
                        const hasUnit   = product.has_unit_price   ?? ((Number(product.price_pcs) || 0) > 0 || (Number(product.price_pack) || 0) > 0 || (Number(product.price_dus) || 0) > 0);
                        const hasWeight = product.has_weight_price ?? ((Number(product.price_kg) || 0) > 0 || (Number(product.price_karung) || 0) > 0);
                        const isHybrid  = hasUnit && hasWeight;
                        const isKg      = product.sell_per_unit === 'kg';

                        let stockDisplay, minDisplay, sc, label;
                        if (isHybrid) {
                          const sPcs = product.stock || 0;
                          const mPcs = product.min_stock || 0;
                          const sKg  = product.stock_kg || 0;
                          const mKg  = product.min_stock_kg || 0;

                          const isOut = sPcs <= 0 && sKg <= 0;
                          const isLow = !isOut && (sPcs <= mPcs || sKg <= mKg);
                          sc = isOut ? T.red : isLow ? T.accent : T.green;
                          label = isOut ? 'Habis' : isLow ? 'Menipis' : 'Aman';
                          stockDisplay = `${sPcs} pcs / ${Number(sKg).toFixed(2)} kg`;
                          minDisplay = `${mPcs} pcs / ${Number(mKg).toFixed(2)} kg`;
                        } else {
                          const s = isKg ? (product.stock_kg || 0) : (product.stock || 0);
                          const m = isKg ? (product.min_stock_kg || 0) : (product.min_stock || 0);
                          const isOut = s <= 0;
                          const isLow = !isOut && s <= m;
                          sc = isOut ? T.red : isLow ? T.accent : T.green;
                          label = isOut ? 'Habis' : isLow ? 'Menipis' : 'Aman';
                          stockDisplay = isKg ? `${Number(s).toFixed(2)} kg` : `${s} pcs`;
                          minDisplay = isKg ? `${Number(m).toFixed(2)} kg` : `${m} pcs`;
                        }

                        const pp = product.pcs_per_pack || 1;
                        const pd = product.pack_per_dus || 1;
                        let packInfo = '—';
                        if (isKg && product.kg_per_karung > 0) {
                          packInfo = `± ${Math.floor((product.stock_kg || 0) / product.kg_per_karung)} Karung`;
                        } else if (!isKg && (pp > 1 || pd > 1)) {
                          const pk = pp > 1 ? `${Math.floor((product.stock || 0) / pp)} Pk` : '';
                          const ds = pd > 1 && (product.stock || 0) >= pp * pd ? ` / ${Math.floor((product.stock || 0) / (pp * pd))} ${product?.dus_label || 'Dus'}` : '';
                          packInfo = (pk + ds) || '—';
                        }

                        return (
                          <tr key={product.id}>
                            <td>
                              <span style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>{product.name}</span>
                            </td>
                            <td>
                              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: T.border, color: T.sub }}>
                                {product.category_name || '—'}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                padding: '2px 9px', borderRadius: 100, fontSize: 11, fontWeight: 800,
                                fontFamily: 'JetBrains Mono, monospace',
                                background: sc + '14', border: `1px solid ${sc}30`, color: sc
                              }}>
                                {stockDisplay}
                              </span>
                            </td>
                            <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: T.muted }}>
                              {minDisplay}
                            </td>
                            <td style={{ fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
                              {packInfo}
                            </td>
                            <td>
                              <span style={{
                                padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                background: sc + '15', color: sc, border: `1px solid ${sc}30`
                              }}>
                                {label}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  onClick={() => setStockInProduct(product)}
                                  title="Tambah Stok Masuk"
                                  style={{
                                    padding: '5px 10px', borderRadius: 7,
                                    border: `1px solid ${T.green}30`, background: T.green + '0C',
                                    color: T.green, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                                    fontFamily: 'Syne, sans-serif', transition: 'all 0.15s',
                                    display: 'flex', alignItems: 'center', gap: 5,
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = T.green + '20'}
                                  onMouseLeave={e => e.currentTarget.style.background = T.green + '0C'}
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                  Stok
                                </button>
                                <button
                                  onClick={() => setAdjustProduct(product)}
                                  title="Sesuaikan Stok / Opname"
                                  style={{
                                    padding: '5px 10px', borderRadius: 7,
                                    border: `1px solid ${T.accent}30`, background: T.accent + '0C',
                                    color: T.accent, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                                    fontFamily: 'Syne, sans-serif', transition: 'all 0.15s',
                                    display: 'flex', alignItems: 'center', gap: 5,
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = T.accent + '20'}
                                  onMouseLeave={e => e.currentTarget.style.background = T.accent + '0C'}
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                  Opname
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Footer */}
                <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
                    <span style={{ color: T.accent, fontWeight: 700 }}>{filtered.length}</span> dari {products.length} produk
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ── LOG VIEW ── */
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="inv-table">
                <thead>
                  <tr>
                    {['Waktu', 'Produk', 'Tipe', 'Perubahan', 'Keterangan'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '48px 24px', textAlign: 'center', color: T.muted, fontSize: 13 }}>
                        Belum ada riwayat pergerakan stok.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, i) => {
                      const isSale = log.type === 'SALE';
                      const isIn   = log.type === 'IN';
                      const isAdj  = log.type === 'ADJUSTMENT';
                      const color  = isIn ? T.green : isSale ? T.blue : isAdj ? T.accent : T.muted;
                      
                      return (
                        <tr key={i}>
                          <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: T.sub }}>
                            {log.created_at ? log.created_at.replace('T', ' ').split('.')[0] : '-'}
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>{log.product_name}</span>
                          </td>
                          <td>
                            <span style={{
                              padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                              background: color + '15', color: color, border: `1px solid ${color}30`
                            }}>
                              {log.type}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 800, color: isIn ? T.green : T.red, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                              {isIn ? '+' : ''}{log.quantity_kg > 0 ? log.quantity_kg + ' Kg' : log.quantity_pcs + ' Pcs'}
                            </span>
                          </td>
                          <td style={{ fontSize: 11, color: T.muted }}>
                            {log.notes || (log.batch_code ? `Batch: ${log.batch_code}` : (log.reference_id ? `Ref: ${log.reference_id}` : '—'))}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
                Menampilkan {logs.length} riwayat pergerakan stok terbaru
              </span>
            </div>
          </div>
        )}
      </div>

      {stockInProduct && <StockInModal product={stockInProduct} hideCost={hideCost} onClose={() => setStockInProduct(null)} onSuccess={load} showToast={showToast} />}
      {adjustProduct  && <AdjustModal  product={adjustProduct} isKg={adjustProduct.sell_per_unit === 'kg'} onClose={() => setAdjustProduct(null)}  onSuccess={load} showToast={showToast} />}
    </>
  );
}

export default InventoryList;
