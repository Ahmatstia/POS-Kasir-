import React, { useState, useEffect } from "react";
import { getInventorySummary, getLowStockProducts, addStock, adjustStock } from "../../services/inventory";
import { getCategories } from "../../services/database";
import { useToast } from "../Toast";
import { T } from "../../theme";

const fmt    = n => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const numFmt = n => Number(n || 0).toLocaleString('id-ID');

// ─── STOCK IN MODAL ──────────────────────────────────────────────────────────
function StockInModal({ product, onClose, onSuccess, showToast }) {
  const [step, setStep]         = useState(1); // 1 = quantity, 2 = details
  const [qtyDus, setQtyDus]     = useState('');
  const [qtyPack, setQtyPack]   = useState('');
  const [qtyPcs, setQtyPcs]     = useState('');
  const [qtyKg, setQtyKg]       = useState('');
  const [expiry, setExpiry]     = useState('');
  const [batchCode, setBatch]   = useState('');
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const pp = product.pcs_per_pack || 1;
  const pd = product.pack_per_dus || 1;
  const isKg = product?.sell_per_unit === 'kg';
  
  const dusVal  = parseInt(qtyDus)  || 0;
  const packVal = parseInt(qtyPack) || 0;
  const pcsVal  = parseInt(qtyPcs)  || 0;
  const kgVal   = parseFloat(qtyKg) || 0;
  const totalPcs = (dusVal * pd * pp) + (packVal * pp) + pcsVal;
  const totalKg  = kgVal;
  const totalDisplay = isKg ? `${totalKg > 0 ? totalKg + ' Kg' : ''} ${totalPcs > 0 ? totalPcs + ' Pcs' : ''}`.trim() : `${totalPcs} Pcs`;

  const handleSave = async () => {
    if (totalPcs <= 0 && totalKg <= 0) { setError('Masukkan jumlah stok yang valid'); return; }
    setError('');
    setSaving(true);
    const res = await addStock(product.id, {
      qty_dus: dusVal, qty_pack: packVal, qty_pcs: pcsVal, qty_kg: kgVal,
      purchase_price: 0,
      expiry_date: expiry || null,
      batch_code: batchCode,
      notes,
    }, product);
    setSaving(false);
    if (res.success) {
      showToast('success', `✓ Stok ${product.name} bertambah ${totalDisplay}`);
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
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; opacity:1; transform:translateY(0); } }`}</style>
      <div style={{
        width: '100%', maxWidth: 500,
        background: T.surface, border: `1px solid ${T.border2}`,
        borderRadius: 20, overflow: 'hidden',
        animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both',
        boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 22px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Stok Masuk</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{product.name}</p>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {[1, 2].map(s => (
              <React.Fragment key={s}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, cursor: s < step ? 'pointer' : 'default',
                }} onClick={() => s < step && setStep(s)}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: s <= step ? T.accent + '20' : T.border2,
                    border: `1.5px solid ${s <= step ? T.accent : T.border2}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800,
                    color: s <= step ? T.accent : T.muted,
                    transition: 'all 0.2s',
                  }}>
                    {s < step ? '✓' : s}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: s <= step ? T.text : T.muted }}>
                    {s === 1 ? 'Jumlah Stok' : 'Harga & Detail'}
                  </span>
                </div>
                {s < 2 && <div style={{ flex: 1, height: 1, background: step > s ? T.accent + '40' : T.border2 }} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {step === 1 && (
            <>
              {/* Conversion reference */}
              {(pp > 1 || pd > 1) && (
                <div style={{ padding: '12px 16px', borderRadius: 12, background: T.blue + '08', border: `1px solid ${T.blue}20`, display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: 11, color: T.blue, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>Konversi:</span>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {pd > 1 && <span style={{ fontSize: 11, color: T.blue, fontFamily: 'JetBrains Mono, monospace' }}>1 Dus = {pd} Pk</span>}
                    {pp > 1 && <span style={{ fontSize: 11, color: T.blue, fontFamily: 'JetBrains Mono, monospace' }}>1 Pk = {pp} Pcs</span>}
                  </div>
                </div>
              )}

              {/* Qty inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: isKg ? '1fr' : 'repeat(3, 1fr)', gap: 12 }}>
                {isKg && (
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.purple, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                      Jumlah Masuk (Kg)
                    </label>
                    <input type="number" step="0.01" min="0" value={qtyKg} onChange={e => { setQtyKg(e.target.value); setError(''); }}
                      placeholder="0.00" style={{ ...inp, fontSize: 18, padding: '14px' }} autoFocus />
                  </div>
                )}
                {(!isKg) && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: pd > 1 ? T.accent : T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                        DUS
                      </label>
                      <input type="number" min="0" value={qtyDus} onChange={e => { setQtyDus(e.target.value); setError(''); }}
                        placeholder="0" style={{ ...inp, opacity: pd > 1 ? 1 : 0.4, padding: '12px' }} disabled={pd <= 1} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: pp > 1 ? T.green : T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                        PACK
                      </label>
                      <input type="number" min="0" value={qtyPack} onChange={e => { setQtyPack(e.target.value); setError(''); }}
                        placeholder="0" style={{ ...inp, opacity: pp > 1 ? 1 : 0.4, padding: '12px' }} disabled={pp <= 1} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.blue, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                        PCS
                      </label>
                      <input type="number" min="0" value={qtyPcs} onChange={e => { setQtyPcs(e.target.value); setError(''); }}
                        placeholder="0" style={{ ...inp, padding: '12px' }} />
                    </div>
                  </>
                )}
              </div>

              {/* Total Summary */}
              <div style={{
                padding: '18px', borderRadius: 16,
                background: (totalPcs > 0 || totalKg > 0) ? T.bg : T.border,
                border: `1.5px solid ${(totalPcs > 0 || totalKg > 0) ? T.green + '40' : T.border2}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: (totalPcs > 0 || totalKg > 0) ? `0 4px 15px ${T.green}10` : 'none',
              }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: T.sub }}>Akan Ditambahkan:</span>
                <span style={{ fontSize: 22, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: T.green }}>
                  {totalDisplay || '0 Pcs'}
                </span>
              </div>

              {error && <div style={{ padding: '12px', borderRadius: 12, background: T.red + '0A', border: `1px solid ${T.red}20`, fontSize: 13, color: T.red, fontWeight: 700 }}>⚠ {error}</div>}

              <button
                onClick={() => (totalPcs > 0 || totalKg > 0) ? setStep(2) : setError('Masukkan jumlah stok yang valid')}
                style={{ 
                  width: '100%', padding: '16px', borderRadius: 14, 
                  background: (totalPcs > 0 || totalKg > 0) ? T.accent : T.border2, 
                  color: (totalPcs > 0 || totalKg > 0) ? '#fff' : T.muted, 
                  fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, 
                  cursor: (totalPcs > 0 || totalKg > 0) ? 'pointer' : 'not-allowed', border: 'none', transition: 'all 0.2s',
                  boxShadow: (totalPcs > 0 || totalKg > 0) ? `0 8px 20px ${T.accent}40` : 'none'
                }}
              >
                Lanjut ke Input Harga →
              </button>
            </>
          )}

          {step === 2 && (
            <>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                <div>
                   <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Tgl Kadaluarsa</label>
                   <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Kode Batch</label>
                  <input value={batchCode} onChange={e => setBatch(e.target.value)} placeholder="Misal: B-001" style={inp} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Catatan</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Misal: Barang bagus, diterima oleh..." style={inp} />
              </div>

              {error && <div style={{ padding: '12px', borderRadius: 12, background: T.red + '0A', border: `1px solid ${T.red}20`, fontSize: 13, color: T.red, fontWeight: 700 }}>⚠ {error}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginTop: 8 }}>
                <button onClick={() => setStep(1)} style={{ padding: '14px', borderRadius: 14, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>← Kembali</button>
                <button 
                  onClick={handleSave} disabled={saving} 
                  style={{ 
                    padding: '14px', borderRadius: 14, background: saving ? T.border2 : T.green, 
                    color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, 
                    cursor: saving ? 'wait' : 'pointer', border: 'none', transition: 'all 0.2s',
                    boxShadow: saving ? 'none' : `0 8px 20px ${T.green}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                  }}>
                  {saving ? (
                    <><div style={{ width: 16, height: 16, border: `2px solid #ffffff40`, borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>Menyimpan…</>
                  ) : `Konfirmasi & Simpan`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ADJUST MODAL ─────────────────────────────────────────────────────────────
function AdjustModal({ product, onClose, onSuccess, showToast }) {
  const isKg = product?.sell_per_unit === 'kg';
  const currentBase = isKg ? (product.stock_kg || 0) : (product.stock || 0);

  const [newQty, setNewQty]   = useState(String(currentBase));
  const [reason, setReason]   = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const pp = product.pcs_per_pack || 1;
  const pd = product.pack_per_dus || 1;

  const current = currentBase;
  const newVal  = isKg ? (parseFloat(newQty) || 0) : (parseInt(newQty) || 0);
  const diff    = isKg ? Number((newVal - current).toFixed(2)) : (newVal - current);
  const isPlus  = diff > 0;
  const isMinus = diff < 0;

  // Preset reasons
  const REASONS = ['Stok opname', 'Barang rusak/hilang', 'Pengembalian barang', 'Koreksi sistem', 'Lain-lain'];

  const handleSave = async () => {
    if (!reason.trim()) { setError('Alasan koreksi wajib diisi'); return; }
    if (newVal < 0)     { setError('Stok tidak boleh negatif'); return; }
    setError('');
    setSaving(true);
    let res;
    const hppVal = 0;
    import('../../services/inventory').then(async ({ adjustStockKg, adjustStock }) => {
       if (isKg) res = await adjustStockKg(product.id, newVal, reason, hppVal);
       else      res = await adjustStock(product.id, newVal, reason, hppVal);

       setSaving(false);
       if (res.success) {
         showToast('success', `✓ Stok ${product.name} dikoreksi ke ${newVal} ${isKg ? 'Kg' : 'Pcs'}`);
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
            <p style={{ fontSize: 9, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Koreksi Stok</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{product.name}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Before / After cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
            <div style={{ padding: '16px', borderRadius: 16, background: T.bg, border: `1px solid ${T.border2}`, textAlign: 'center' }}>
              <p style={{ fontSize: 10, color: T.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Saat Ini</p>
              <p style={{ fontSize: 26, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: T.text, lineHeight: 1 }}>{isKg ? Number(current).toFixed(2) : numFmt(current)}</p>
              <p style={{ fontSize: 11, color: T.sub, fontWeight: 700, marginTop: 4 }}>{isKg ? 'Kg' : 'Pcs'}</p>
            </div>
            <div style={{ fontSize: 20, color: diff !== 0 ? (isPlus ? T.green : T.red) : T.muted, fontWeight: 900 }}>→</div>
            <div style={{ 
              padding: '16px', borderRadius: 16, 
              background: diff === 0 ? T.bg : isPlus ? T.green + '08' : T.red + '08', 
              border: `1.5px solid ${diff === 0 ? T.border2 : isPlus ? T.green + '40' : T.red + '40'}`, 
              textAlign: 'center', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: diff === 0 ? 'none' : isPlus ? `0 8px 20px ${T.green}15` : `0 8px 20px ${T.red}15`
            }}>
              <p style={{ fontSize: 10, color: T.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Sesudah</p>
              <p style={{ fontSize: 26, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: diff === 0 ? T.text : isPlus ? T.green : T.red, lineHeight: 1 }}>{isKg ? Number(newVal).toFixed(2) : numFmt(newVal)}</p>
              <p style={{ fontSize: 11, color: T.sub, fontWeight: 700, marginTop: 4 }}>{isKg ? 'Kg' : 'Pcs'}</p>
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
              {isPlus ? 'BERTAMBAH' : 'BERKURANG'} {isKg ? Math.abs(diff).toFixed(2) : numFmt(Math.abs(diff))} {isKg ? 'Kg' : 'Pcs'}
            </div>
          )}

          {/* Input section */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Stok Fisik Baru (Total)
            </label>
            <div style={{ position: 'relative' }}>
               <input type="number" step={isKg ? "0.01" : "1"} min="0" value={newQty}
                onChange={e => setNewQty(e.target.value)}
                style={{ ...inp, fontSize: 24, textAlign: 'center', fontWeight: 900, padding: '18px', border: `2px solid ${T.border2}`, borderRadius: 16 }}
                autoFocus
              />
              <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 800, color: T.muted }}>
                {isKg ? 'Kg' : 'Pcs'}
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
            {error && <p style={{ fontSize: 11, color: T.red, marginTop: 8, fontWeight: 700 }}>⚠️ {error}</p>}
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
              ) : diff === 0 ? 'Input Stok Baru' : '✓ Simpan Penyesuaian'}
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
  const [filterStatus, setFilterStatus] = useState('');
  const [activeTab, setActiveTab]         = useState('list'); // 'list' or 'log'
  const [logs, setLogs]                   = useState([]);
  const [stockInProduct, setStockInProduct] = useState(null);
  const [adjustProduct, setAdjustProduct]   = useState(null);

  useEffect(() => { 
    if (activeTab === 'list') load();
    else loadLogs();
  }, [activeTab]);

  const load = async () => {
    setLoading(true);
    const [inv, cats] = await Promise.all([getInventorySummary(), getCategories()]);
    setProducts(inv);
    setCategories(cats);
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
    
    const isKg = p.sell_per_unit === 'kg';
    const cStock = isKg ? (p.stock_kg || 0) : (p.stock || 0);
    const cMin = isKg ? (p.min_stock_kg || 0) : (p.min_stock || 0);

    if (filterStatus === 'habis'   && cStock > 0) return false;
    if (filterStatus === 'menipis' && (cStock === 0 || cStock > cMin)) return false;
    if (filterStatus === 'aman'    && cStock <= cMin) return false;
    return true;
  });

  // Stats

  const aman    = products.filter(p => {
    const isKg = p.sell_per_unit === 'kg';
    return isKg ? (p.stock_kg || 0) > (p.min_stock_kg || 0) : (p.stock || 0) > (p.min_stock || 0);
  }).length;
  const menipis = products.filter(p => {
    const isKg = p.sell_per_unit === 'kg';
    const s = isKg ? (p.stock_kg || 0) : (p.stock || 0);
    const m = isKg ? (p.min_stock_kg || 0) : (p.min_stock || 0);
    return s > 0 && s <= m;
  }).length;
  const habis   = products.filter(p => {
    return p.sell_per_unit === 'kg' ? (p.stock_kg || 0) <= 0 : (p.stock || 0) <= 0;
  }).length;

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
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .inv-input {
          width: 100%; padding: 9px 12px; border-radius: 10px;
          border: 1px solid ${T.border2}; background: ${T.bg}; color: ${T.text};
          font-family: 'Syne', sans-serif; font-size: 12px; outline: none;
        }
        .inv-input:focus { border-color: ${T.accent}60; box-shadow: 0 0 0 2px ${T.accent}10; }
        .inv-row { transition: background 0.12s; }
        .inv-row:hover td { background: ${T.border}40; }
      `}</style>

      <div style={{ animation: 'fadeUp 0.4s ease both', fontFamily: 'Syne, sans-serif' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Manajemen</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.01em' }}>Inventori Stok</h2>
          </div>
          <div style={{ display: 'flex', background: T.surface, padding: 4, borderRadius: 12, border: `1px solid ${T.border}` }}>
            <button onClick={() => setActiveTab('list')} style={{ 
              padding: '8px 16px', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: activeTab === 'list' ? T.accent : 'transparent', color: activeTab === 'list' ? '#fff' : T.sub,
              transition: 'all 0.2s'
            }}>Daftar Produk</button>
            <button onClick={() => setActiveTab('log')} style={{ 
              padding: '8px 16px', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: activeTab === 'log' ? T.accent : 'transparent', color: activeTab === 'log' ? '#fff' : T.sub,
              transition: 'all 0.2s'
            }}>Riwayat Stok (Log)</button>
          </div>
        </div>

        {/* ── STAT STRIP ── */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { label: 'Total Produk', value: products.length, color: T.blue, sub: 'Item aktif' },

            { label: 'Stok Aman',    value: aman,            color: T.green, sub: 'Normal' },
            { label: 'Stok Menipis', value: menipis,         color: T.accent, sub: 'Perlu restok' },
            { label: 'Stok Habis',   value: habis,           color: T.red, sub: 'Segera beli' },
          ].map((s, i) => (
            <div key={s.label} 
              style={{ 
                flex: 1, minWidth: 160,
                background: `linear-gradient(135deg, ${T.surface} 0%, ${T.bg} 100%)`, 
                border: `1px solid ${T.border}`, 
                borderRadius: 16, padding: '16px 20px', 
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: `0 4px 20px -8px rgba(0,0,0,0.3)`,
              }}
              onClick={() => {
                if (s.isMoney) return;
                setFilterStatus(s.label === 'Total Produk' ? '' : s.label.toLowerCase().split(' ')[1]);
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = s.color + '60';
                e.currentTarget.style.boxShadow = `0 12px 30px -10px ${s.color}30`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = T.border;
                e.currentTarget.style.boxShadow = `0 4px 20px -8px rgba(0,0,0,0.3)`;
              }}
            >
              <div style={{ position: 'absolute', top: -10, right: -10, width: 60, height: 60, background: s.color, opacity: 0.03, borderRadius: '50%' }} />
              <p style={{ fontSize: 9, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{s.label}</p>
              <p style={{ fontSize: s.isMoney ? 18 : 28, fontWeight: 900, color: s.color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
              <p style={{ fontSize: 10, color: T.sub, fontWeight: 600 }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {activeTab === 'list' ? (
          <>
            {/* ── FILTER BAR ── */}
            <div style={{ 
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, 
              padding: '16px', marginBottom: 20, 
              display: 'grid', gridTemplateColumns: '1fr 180px 200px auto', gap: 12, alignItems: 'center',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
            }}>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none', color: T.accent }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input 
                  type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
                  placeholder="Cari nama produk…" 
                  className="inv-input" 
                  style={{ padding: '12px 14px 12px 42px', backgroundColor: T.bg, border: `1px solid ${T.border2}`, borderRadius: 12, fontSize: 13 }} 
                />
              </div>
              <select 
                value={filterCat} onChange={e => setFilterCat(e.target.value)} 
                className="inv-input" 
                style={{ cursor: 'pointer', padding: '12px', borderRadius: 12, backgroundColor: T.bg, border: `1px solid ${T.border2}` }}
              >
                <option value="">Semua Kategori</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select 
                value={filterStatus} onChange={e => setFilterStatus(e.target.value)} 
                className="inv-input" 
                style={{ cursor: 'pointer', padding: '12px', borderRadius: 12, backgroundColor: T.bg, border: `1px solid ${T.border2}` }}
              >
                <option value="">Semua Status Stok</option>
                <option value="aman">✅ Stok Aman</option>
                <option value="menipis">⚠️ Stok Menipis</option>
                <option value="habis">❌ Stok Habis</option>
              </select>
              <button 
                onClick={() => { setSearchTerm(''); setFilterCat(''); setFilterStatus(''); }} 
                style={{ 
                  padding: '12px 20px', borderRadius: 12, border: `1px solid ${T.border2}`, 
                  background: T.bg, color: T.sub, fontSize: 12, fontWeight: 700, 
                  cursor: 'pointer', fontFamily: 'Syne, sans-serif', transition: 'all 0.2s' 
                }}
                onMouseEnter={e => { e.currentTarget.style.background = T.border; e.currentTarget.style.color = T.text; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.bg; e.currentTarget.style.color = T.sub; }}
              >
                Bersihkan
              </button>
            </div>

            {/* ── TABLE ── */}
            {filtered.length === 0 ? (
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: T.muted, marginBottom: 8 }}>Tidak ada produk yang ditemukan</p>
                <button onClick={() => { setSearchTerm(''); setFilterCat(''); setFilterStatus(''); }} style={{ padding: '8px 18px', borderRadius: 10, border: `1px solid ${T.blue}35`, background: T.blue + '10', color: T.blue, fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Reset Filter</button>
              </div>
            ) : (
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
                {/* Table header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2.5fr 140px 120px 200px 180px',
                  padding: '16px 24px',
                  borderBottom: `1px solid ${T.border}`,
                  background: `linear-gradient(to bottom, ${T.bg}, ${T.surface})`,
                }}>
                  {['Informasi Produk', 'Jumlah Stok', 'Ambang Batas', 'Kesehatan Stok', 'Aksi'].map(h => (
                    <p key={h} style={{ fontSize: 10, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{h}</p>
                  ))}
                </div>

                {/* Rows */}
                <div style={{ maxHeight: 'calc(100vh - 430px)', overflowY: 'auto', padding: '0 8px' }}>
                  {filtered.map((product, idx) => {
                    const isKg    = product.sell_per_unit === 'kg';
                    const stock   = isKg ? (product.stock_kg || 0) : (product.stock || 0);
                    const minSt   = isKg ? (product.min_stock_kg || 0) : (product.min_stock || 0);
                    const outOf   = stock <= 0;
                    const low     = !outOf && stock <= minSt;
                    const sc      = outOf ? T.red : low ? T.accent : T.green;
                    const label   = outOf ? 'Stok Habis' : low ? 'Hampir Habis' : 'Stok Aman';
                    const pct     = minSt > 0 ? Math.min(100, (stock / Math.max(minSt * 2, 1)) * 100) : (stock > 0 ? 100 : 0);
                    const pp      = product.pcs_per_pack || 1;
                    const pd      = product.pack_per_dus || 1;

                    return (
                      <div
                        key={product.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2.5fr 140px 120px 200px 180px',
                          padding: '20px 16px',
                          margin: '8px 0',
                          borderRadius: 16,
                          alignItems: 'center',
                          background: 'transparent',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = T.border + '30';
                          e.currentTarget.style.transform = 'scale(1.005)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {/* Product info */}
                        <div style={{ paddingLeft: 8 }}>
                          <p style={{ fontSize: 15, fontWeight: 800, color: outOf ? T.sub : T.text, marginBottom: 6 }}>{product.name}</p>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: T.sub, fontFamily: 'JetBrains Mono, monospace', background: T.bg, padding: '2px 8px', borderRadius: 6, border: `1px solid ${T.border2}` }}>
                              {product.category_name || 'Tanpa Kategori'}
                            </span>
                            {!isKg && (pp > 1 || pd > 1) && (
                               <span style={{ fontSize: 9, color: T.muted }}>
                                 {pp > 1 ? `${Math.floor(stock / pp)} Pack` : ''} 
                                 {pd > 1 && stock >= pp * pd ? ` / ${Math.floor(stock / (pp * pd))} Dus` : ''}
                               </span>
                            )}
                          </div>
                        </div>

                        {/* Stock number */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                            <span style={{ fontSize: 24, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: sc, letterSpacing: '-0.02em' }}>
                              {isKg ? Number(stock).toFixed(2) : numFmt(stock)}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase' }}>{isKg ? 'Kg' : 'Pcs'}</span>
                          </div>
                        </div>

                        {/* Min stock */}
                        <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: T.sub, fontWeight: 600 }}>
                          {minSt > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ opacity: 0.6 }}>min</span>
                              <span>{isKg ? minSt : numFmt(minSt)}</span>
                            </div>
                          ) : '—'}
                        </div>

                        {/* Progress bar + status */}
                        <div style={{ paddingRight: 20 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: sc, letterSpacing: '0.05em' }}>
                              {label}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 800, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>{Math.round(pct)}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 10, background: T.border2, overflow: 'hidden', position: 'relative' }}>
                            <div style={{ 
                              height: '100%', borderRadius: 10, background: sc, width: `${pct}%`, 
                              transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
                              boxShadow: `0 0 10px ${sc}40`
                            }} />
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            onClick={() => setStockInProduct(product)}
                            style={{
                              padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                              border: `1px solid ${T.green}40`, background: T.green + '14',
                              color: T.green, fontSize: 11, fontWeight: 800,
                              fontFamily: 'Syne, sans-serif', transition: 'all 0.2s',
                              display: 'flex', alignItems: 'center', gap: 6,
                              whiteSpace: 'nowrap',
                              boxShadow: `0 4px 12px ${T.green}15`
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = T.green; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = T.green + '14'; e.currentTarget.style.color = T.green; }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Stok
                          </button>
                          <button
                            onClick={() => setAdjustProduct(product)}
                            style={{
                              padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                              border: `1px solid ${T.border2}`, background: T.bg,
                              color: T.sub, fontSize: 11, fontWeight: 800,
                              fontFamily: 'Syne, sans-serif', transition: 'all 0.2s',
                              display: 'flex', alignItems: 'center', gap: 6,
                              whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; e.currentTarget.style.background = T.accent + '10'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border2; e.currentTarget.style.color = T.sub; e.currentTarget.style.background = T.bg; }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div style={{ padding: '10px 18px', borderTop: `1px solid ${T.border}`, background: T.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
                    <span style={{ color: T.accent, fontWeight: 700 }}>{filtered.length}</span> / {products.length} produk
                  </span>
                  <div style={{ fontSize: 10, color: T.muted }}>
                  Klik stat di atas untuk filter cepat
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ── LOG VIEW ── */
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
             <div style={{
              display: 'grid', gridTemplateColumns: '150px 1.5fr 100px 100px 1fr',
              padding: '16px 24px', borderBottom: `1px solid ${T.border}`,
              background: `linear-gradient(to bottom, ${T.bg}, ${T.surface})`,
            }}>
              {['Waktu', 'Produk', 'Tipe', 'Perubahan', 'Keterangan'].map(h => (
                <p key={h} style={{ fontSize: 10, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{h}</p>
              ))}
            </div>
            <div style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
              {logs.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 13 }}>Belum ada riwayat pergerakan stok.</div>
              ) : (
                logs.map((log, i) => {
                  const isSale = log.type === 'SALE';
                  const isIn   = log.type === 'IN';
                  const isAdj  = log.type === 'ADJUSTMENT';
                  const color  = isIn ? T.green : isSale ? T.blue : isAdj ? T.accent : T.muted;
                  
                  return (
                    <div key={i} style={{ 
                      display: 'grid', gridTemplateColumns: '150px 1.5fr 100px 100px 1fr',
                      padding: '14px 24px', borderBottom: i < logs.length-1 ? `1px solid ${T.border2}` : 'none',
                      alignItems: 'center', fontSize: 12, color: T.sub
                    }}>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                        {log.created_at ? log.created_at.replace('T', ' ').split('.')[0] : '-'}
                      </div>
                      <div style={{ fontWeight: 700, color: T.text }}>{log.product_name}</div>
                      <div>
                        <span style={{ 
                          padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800,
                          background: color + '15', color: color, border: `1px solid ${color}30`
                        }}>
                          {log.type}
                        </span>
                      </div>
                      <div style={{ fontWeight: 800, color: isIn ? T.green : T.red, fontFamily: 'JetBrains Mono, monospace' }}>
                        {isIn ? '+' : ''}{log.quantity_kg > 0 ? log.quantity_kg + ' Kg' : log.quantity_pcs + ' Pcs'}
                      </div>
                      <div style={{ fontSize: 11, color: T.muted, fontStyle: 'italic' }}>
                        {log.notes || (log.batch_code ? `Batch: ${log.batch_code}` : (log.reference_id ? `Ref: ${log.reference_id}` : '-'))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ padding: '12px 24px', background: T.bg, borderTop: `1px solid ${T.border}`, fontSize: 10, color: T.muted }}>
              Menampilkan {logs.length} riwayat terbaru.
            </div>
          </div>
        )}
      </div>

      {stockInProduct && <StockInModal product={stockInProduct} onClose={() => setStockInProduct(null)} onSuccess={load} showToast={showToast} />}
      {adjustProduct  && <AdjustModal  product={adjustProduct}  onClose={() => setAdjustProduct(null)}  onSuccess={load} showToast={showToast} />}
    </>
  );
}

export default InventoryList;
