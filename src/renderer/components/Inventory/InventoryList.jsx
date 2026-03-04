import React, { useState, useEffect } from "react";
import { getInventorySummary, getLowStockProducts, addStock, adjustStock } from "../../services/inventory";
import { getCategories } from "../../services/database";
import { useToast } from "../Toast";

const T = {
  bg: '#0E0F11', surface: '#161719', card: '#1A1B1E',
  border: '#1F2023', border2: '#2A2B2F',
  text: '#F0EDE6', muted: '#5C5C66', sub: '#9998A3',
  accent: '#F5A623', green: '#34C98B', red: '#E85858',
  blue: '#5B8AF5', purple: '#A78BFA',
};

const fmt    = n => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const numFmt = n => Number(n || 0).toLocaleString('id-ID');

// ─── STOCK IN MODAL ──────────────────────────────────────────────────────────
function StockInModal({ product, onClose, onSuccess, showToast }) {
  const [step, setStep]         = useState(1); // 1 = quantity, 2 = details
  const [qtyDus, setQtyDus]     = useState('');
  const [qtyPack, setQtyPack]   = useState('');
  const [qtyPcs, setQtyPcs]     = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [expiry, setExpiry]     = useState('');
  const [batchCode, setBatch]   = useState('');
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const pp = product.pcs_per_pack || 1;
  const pd = product.pack_per_dus || 1;
  const dusVal  = parseInt(qtyDus)  || 0;
  const packVal = parseInt(qtyPack) || 0;
  const pcsVal  = parseInt(qtyPcs)  || 0;
  const totalPcs = (dusVal * pd * pp) + (packVal * pp) + pcsVal;

  const handleSave = async () => {
    if (totalPcs <= 0) { setError('Masukkan jumlah stok yang valid'); return; }
    setError('');
    setSaving(true);
    const res = await addStock(product.id, {
      qty_dus: dusVal, qty_pack: packVal, qty_pcs: pcsVal,
      purchase_price: Number(buyPrice) || 0,
      expiry_date: expiry || null,
      batch_code: batchCode,
      notes,
    }, product);
    setSaving(false);
    if (res.success) {
      showToast('success', `✓ Stok ${product.name} bertambah ${totalPcs} Pcs`);
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
                    {s === 1 ? 'Jumlah Stok' : 'Detail Batch'}
                  </span>
                </div>
                {s < 2 && <div style={{ flex: 1, height: 1, background: step > s ? T.accent + '40' : T.border2 }} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {step === 1 && (
            <>
              {/* Conversion reference */}
              {(pp > 1 || pd > 1) && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: T.blue + '0C', border: `1px solid ${T.blue}20`, display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: 10, color: T.blue, fontFamily: 'JetBrains Mono, monospace' }}>Konversi:</span>
                  {pd > 1 && <span style={{ fontSize: 10, color: T.blue, fontFamily: 'JetBrains Mono, monospace' }}>1 Dus = {pd} Pack</span>}
                  {pp > 1 && <span style={{ fontSize: 10, color: T.blue, fontFamily: 'JetBrains Mono, monospace' }}>1 Pack = {pp} Pcs</span>}
                </div>
              )}

              {/* Qty inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: pd > 1 ? T.accent : T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                    Dus {pd <= 1 && <span style={{ color: T.muted, fontWeight: 400, textTransform: 'none' }}>(set:1)</span>}
                  </label>
                  <input type="number" min="0" value={qtyDus} onChange={e => { setQtyDus(e.target.value); setError(''); }}
                    placeholder="0" style={{ ...inp, opacity: pd > 1 ? 1 : 0.5 }} disabled={pd <= 1} />
                  {dusVal > 0 && <p style={{ fontSize: 10, color: T.muted, marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>= {dusVal * pd} Pack</p>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: pp > 1 ? T.green : T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                    Pack {pp <= 1 && <span style={{ color: T.muted, fontWeight: 400, textTransform: 'none' }}>(set:1)</span>}
                  </label>
                  <input type="number" min="0" value={qtyPack} onChange={e => { setQtyPack(e.target.value); setError(''); }}
                    placeholder="0" style={{ ...inp, opacity: pp > 1 ? 1 : 0.5 }} disabled={pp <= 1} />
                  {packVal > 0 && <p style={{ fontSize: 10, color: T.muted, marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>= {packVal * pp} Pcs</p>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: T.blue, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                    Pcs (Ecer)
                  </label>
                  <input type="number" min="0" value={qtyPcs} onChange={e => { setQtyPcs(e.target.value); setError(''); }}
                    placeholder="0" style={inp} autoFocus />
                </div>
              </div>

              {/* Setup hint if all factors are 1 */}
              {pd <= 1 && pp <= 1 && (
                <p style={{ fontSize: 10, color: T.sub, textAlign: 'center', background: T.accent + '08', padding: '8px', borderRadius: 8, border: `1px dashed ${T.accent}30` }}>
                  💡 Ingin input Grosir (Dus/Pack)? <span style={{ color: T.accent, fontWeight: 700 }}>Atur konversi</span> di halaman Produk.
                </p>
              )}

              {/* Total */}
              <div style={{
                padding: '14px 16px', borderRadius: 12,
                background: totalPcs > 0 ? T.green + '0E' : T.border,
                border: `1px solid ${totalPcs > 0 ? T.green + '30' : T.border2}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'all 0.2s',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: totalPcs > 0 ? T.green : T.muted }}>Total yang Masuk</span>
                <span style={{ fontSize: 24, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: totalPcs > 0 ? T.green : T.muted }}>
                  {numFmt(totalPcs)} <span style={{ fontSize: 12 }}>Pcs</span>
                </span>
              </div>

              {error && <div style={{ padding: '8px 12px', borderRadius: 8, background: T.red + '10', border: `1px solid ${T.red}25`, fontSize: 12, color: T.red, fontWeight: 600 }}>⚠ {error}</div>}

              <button
                onClick={() => totalPcs > 0 ? setStep(2) : setError('Masukkan jumlah stok yang valid')}
                style={{ width: '100%', padding: '12px', borderRadius: 12, border: `1px solid ${totalPcs > 0 ? T.accent + '40' : T.border2}`, background: totalPcs > 0 ? T.accent + '16' : T.border, color: totalPcs > 0 ? T.accent : T.muted, fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.2s' }}
              >
                Lanjut → Detail Batch
              </button>
            </>
          )}

          {step === 2 && (
            <>
              {/* Summary from step 1 */}
              <div style={{ padding: '12px 14px', borderRadius: 10, background: T.green + '0A', border: `1px solid ${T.green}25`, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: T.sub }}>Jumlah Stok</span>
                <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: T.green }}>{numFmt(totalPcs)} Pcs</span>
              </div>

              {/* Detail fields */}
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                  Harga Beli / Pcs <span style={{ color: T.green, fontWeight: 400, textTransform: 'none' }}>(HPP — opsional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace', pointerEvents: 'none' }}>Rp</span>
                  <input type="number" value={buyPrice} onChange={e => setBuyPrice(e.target.value)}
                    placeholder="0" style={{ ...inp, paddingLeft: 34 }} autoFocus />
                </div>
                {buyPrice && totalPcs > 0 && (
                  <p style={{ fontSize: 10, color: T.sub, marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                    Total nilai: {fmt(Number(buyPrice) * totalPcs)}
                  </p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Kadaluarsa</label>
                  <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Kode Batch (kosong = auto)</label>
                  <input value={batchCode} onChange={e => setBatch(e.target.value)} placeholder="Misal: MAR-001" style={inp} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Catatan</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opsional…" style={inp} />
              </div>

              {error && <div style={{ padding: '8px 12px', borderRadius: 8, background: T.red + '10', border: `1px solid ${T.red}25`, fontSize: 12, color: T.red, fontWeight: 600 }}>⚠ {error}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <button onClick={() => setStep(1)} style={{ padding: '12px', borderRadius: 12, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>← Kembali</button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '12px', borderRadius: 12, border: `1px solid ${T.green}40`, background: saving ? T.border : T.green + '18', color: saving ? T.muted : T.green, fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, cursor: saving ? 'wait' : 'pointer', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}>
                  {saving ? (
                    <><div style={{ width: 14, height: 14, border: `2px solid ${T.muted}`, borderTopColor: T.green, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>Menyimpan…</>
                  ) : `✓ Simpan +${numFmt(totalPcs)} Pcs`}
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
  const [newQty, setNewQty] = useState(String(product.stock || 0));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const pp = product.pcs_per_pack || 1;
  const pd = product.pack_per_dus || 1;

  const current = product.stock || 0;
  const newVal  = parseInt(newQty) || 0;
  const diff    = newVal - current;
  const isPlus  = diff > 0;
  const isMinus = diff < 0;

  // Preset reasons
  const REASONS = ['Stok opname', 'Barang rusak/hilang', 'Pengembalian barang', 'Koreksi sistem', 'Lain-lain'];

  const handleSave = async () => {
    if (!reason.trim()) { setError('Alasan koreksi wajib diisi'); return; }
    if (newVal < 0)     { setError('Stok tidak boleh negatif'); return; }
    setError('');
    setSaving(true);
    const res = await adjustStock(product.id, newVal, reason);
    setSaving(false);
    if (res.success) {
      showToast('success', `✓ Stok ${product.name} dikoreksi ke ${newVal} Pcs`);
      onSuccess(); onClose();
    } else {
      setError('Gagal: ' + res.error);
    }
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

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Before / After */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
            <div style={{ padding: '12px', borderRadius: 12, background: T.border, textAlign: 'center' }}>
              <p style={{ fontSize: 9, color: T.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Stok Sekarang</p>
              <p style={{ fontSize: 24, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: T.text }}>{numFmt(current)}</p>
              <p style={{ fontSize: 9, color: T.sub }}>Pcs</p>
            </div>
            <div style={{ fontSize: 18, color: diff !== 0 ? (isPlus ? T.green : T.red) : T.muted, fontWeight: 700, transition: 'color 0.2s' }}>→</div>
            <div style={{ padding: '12px', borderRadius: 12, background: diff === 0 ? T.border : isPlus ? T.green + '0E' : T.red + '0E', border: `1px solid ${diff === 0 ? T.border2 : isPlus ? T.green + '30' : T.red + '30'}`, textAlign: 'center', transition: 'all 0.2s' }}>
              <p style={{ fontSize: 9, color: T.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Stok Baru</p>
              <p style={{ fontSize: 24, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: diff === 0 ? T.text : isPlus ? T.green : T.red }}>{numFmt(newVal)}</p>
              <p style={{ fontSize: 9, color: T.sub }}>Pcs</p>
            </div>
          </div>

          {/* Diff badge */}
          {diff !== 0 && (
            <div style={{ textAlign: 'center', padding: '6px', borderRadius: 8, background: isPlus ? T.green + '0C' : T.red + '0C', fontSize: 12, fontWeight: 800, color: isPlus ? T.green : T.red, fontFamily: 'JetBrains Mono, monospace' }}>
              {isPlus ? '+' : ''}{numFmt(diff)} Pcs {isPlus ? 'ditambahkan' : 'dikurangi'}
              {(pp > 1 || pd > 1) && Math.abs(diff) >= pp && (
                <span style={{ color: T.sub, fontWeight: 400 }}>
                  {' '}≈ {pp > 1 ? `${Math.floor(Math.abs(diff) / pp)} Pack` : ''}{pd > 1 && Math.abs(diff) >= pp * pd ? ` / ${Math.floor(Math.abs(diff) / (pp * pd))} Dus` : ''}
                </span>
              )}
            </div>
          )}

          {/* New qty input */}
          <div>
            <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Masukkan Stok Baru (dalam Pcs)
            </label>
            <input type="number" min="0" value={newQty}
              onChange={e => setNewQty(e.target.value)}
              style={{ ...inp, fontSize: 20, textAlign: 'center', fontWeight: 800 }}
              autoFocus
            />
          </div>

          {/* Reason presets */}
          <div>
            <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: error ? T.red : T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Alasan Koreksi <span style={{ color: T.accent }}>*</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {REASONS.map(r => (
                <button key={r} onClick={() => { setReason(r); setError(''); }} style={{ padding: '4px 10px', borderRadius: 100, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: `1px solid ${reason === r ? T.accent + '50' : T.border2}`, background: reason === r ? T.accent + '14' : T.border, color: reason === r ? T.accent : T.sub, transition: 'all 0.15s', fontFamily: 'Syne, sans-serif' }}>
                  {r}
                </button>
              ))}
            </div>
            <input value={reason} onChange={e => { setReason(e.target.value); setError(''); }}
              placeholder="Atau ketik alasan sendiri…"
              style={{ ...inp, fontFamily: 'Syne, sans-serif', fontSize: 12, borderColor: error ? T.red : undefined }}
            />
            {error && <p style={{ fontSize: 10, color: T.red, marginTop: 5, fontWeight: 600 }}>⚠ {error}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '12px', borderRadius: 12, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Batal</button>
            <button onClick={handleSave} disabled={saving || diff === 0} style={{ padding: '12px', borderRadius: 12, border: `1px solid ${T.accent}40`, background: (saving || diff === 0) ? T.border : T.accent + '18', color: (saving || diff === 0) ? T.muted : T.accent, fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, cursor: (saving || diff === 0) ? 'not-allowed' : 'pointer', opacity: diff === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}>
              {saving ? (<><div style={{ width: 14, height: 14, border: `2px solid ${T.muted}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>Menyimpan…</>) : diff === 0 ? 'Tidak Ada Perubahan' : '✓ Simpan Koreksi'}
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
  const [stockInProduct, setStockInProduct] = useState(null);
  const [adjustProduct, setAdjustProduct]   = useState(null);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    const [inv, cats] = await Promise.all([getInventorySummary(), getCategories()]);
    setProducts(inv);
    setCategories(cats);
    setLoading(false);
  };

  const filtered = products.filter(p => {
    if (searchTerm && !p.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterCat && p.category_id !== parseInt(filterCat)) return false;
    if (filterStatus === 'habis'   && (p.stock || 0) > 0) return false;
    if (filterStatus === 'menipis' && ((p.stock || 0) === 0 || (p.stock || 0) > (p.min_stock || 0))) return false;
    if (filterStatus === 'aman'    && (p.stock || 0) <= (p.min_stock || 0)) return false;
    return true;
  });

  // Stats
  const totalValue = products.reduce((sum, p) => sum + (p.total_value || 0), 0);
  const aman    = products.filter(p => (p.stock || 0) > (p.min_stock || 0)).length;
  const menipis = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= (p.min_stock || 0)).length;
  const habis   = products.filter(p => (p.stock || 0) === 0).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 280, fontFamily: 'Syne, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: `2px solid ${T.border2}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 11, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Memuat inventori…</p>
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
        </div>

        {/* ── STAT STRIP ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 18 }}>
          {[
            { label: 'Total Produk', value: products.length, color: T.blue },
            { label: 'Nilai Aset',   value: fmt(totalValue), color: T.purple, isMoney: true },
            { label: 'Stok Aman',    value: aman,            color: T.green },
            { label: 'Stok Menipis', value: menipis,         color: T.accent },
            { label: 'Stok Habis',   value: habis,           color: T.red },
          ].map(s => (
            <div key={s.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 18px', cursor: 'pointer', transition: 'border-color 0.2s' }}
              onClick={() => {
                if (s.isMoney) return;
                setFilterStatus(s.label === 'Total Produk' ? '' : s.label.toLowerCase().split(' ')[1]);
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = s.color + '50'}
              onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
            >
              <p style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</p>
              <p style={{ fontSize: s.isMoney ? 16 : 26, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── FILTER BAR ── */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 160px 180px auto', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: 0.35, pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="5.5" cy="5.5" r="4" stroke={T.sub} strokeWidth="1.4"/>
              <path d="M8.5 8.5L11 11" stroke={T.sub} strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari produk…" className="inv-input" style={{ paddingLeft: 30 }} />
          </div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="inv-input" style={{ cursor: 'pointer' }}>
            <option value="">Semua Kategori</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="inv-input" style={{ cursor: 'pointer' }}>
            <option value="">Semua Status</option>
            <option value="aman">✅ Stok Aman</option>
            <option value="menipis">⚠️ Stok Menipis</option>
            <option value="habis">❌ Stok Habis</option>
          </select>
          <button onClick={() => { setSearchTerm(''); setFilterCat(''); setFilterStatus(''); }} style={{ padding: '9px 12px', borderRadius: 10, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap' }}>Reset</button>
        </div>

        {/* ── TABLE ── */}
        {filtered.length === 0 ? (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: T.muted, marginBottom: 8 }}>Tidak ada produk yang ditemukan</p>
            <button onClick={() => { setSearchTerm(''); setFilterCat(''); setFilterStatus(''); }} style={{ padding: '8px 18px', borderRadius: 10, border: `1px solid ${T.blue}35`, background: T.blue + '10', color: T.blue, fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Reset Filter</button>
          </div>
        ) : (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 130px 110px 180px 160px',
              padding: '10px 18px',
              borderBottom: `1px solid ${T.border}`,
              background: T.bg,
            }}>
              {['Produk', 'Stok (Pcs)', 'Min Stok', 'Level Stok', 'Aksi'].map(h => (
                <p key={h} style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</p>
              ))}
            </div>

            {/* Rows */}
            <div style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
              {filtered.map((product, idx) => {
                const stock   = product.stock || 0;
                const minSt   = product.min_stock || 0;
                const outOf   = stock === 0;
                const low     = !outOf && stock <= minSt;
                const sc      = outOf ? T.red : low ? T.accent : T.green;
                const label   = outOf ? 'Habis'   : low ? 'Menipis' : 'Aman';
                const pct     = minSt > 0 ? Math.min(100, (stock / Math.max(minSt * 2, 1)) * 100) : (stock > 0 ? 100 : 0);
                const pp = product.pcs_per_pack || 1;
                const pd = product.pack_per_dus || 1;

                return (
                  <div
                    key={product.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 130px 110px 180px 160px',
                      padding: '14px 18px',
                      borderBottom: idx < filtered.length - 1 ? `1px solid ${T.border}` : 'none',
                      alignItems: 'center',
                      background: 'transparent',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = T.border + '40'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Product info */}
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: outOf ? T.sub : T.text, marginBottom: 3 }}>{product.name}</p>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: T.sub, fontFamily: 'JetBrains Mono, monospace' }}>
                          {pp > 1 ? `${Math.floor(stock / pp)} Pack ${stock % pp} Pcs` : `${stock} Pcs`}
                          {pd > 1 && stock >= pp * pd ? ` / ${Math.floor(stock / (pp * pd))} Dus` : ''}
                        </span>
                        {product.category_name && (
                          <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 100, background: T.border2, color: T.muted, fontWeight: 600 }}>
                            {product.category_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock number */}
                    <div>
                      <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: sc }}>
                        {numFmt(stock)}
                      </span>
                      <span style={{ fontSize: 10, color: T.muted, marginLeft: 4 }}>Pcs</span>
                    </div>

                    {/* Min stock */}
                    <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: T.sub }}>
                      {minSt > 0 ? `${numFmt(minSt)} Pcs` : '—'}
                    </div>

                    {/* Progress bar + status */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: sc + '14', border: `1px solid ${sc}25`, color: sc }}>
                          {label}
                        </span>
                      </div>
                      <div style={{ height: 5, borderRadius: 5, background: T.border2, overflow: 'hidden', width: '80%' }}>
                        <div style={{ height: '100%', borderRadius: 5, background: sc, width: `${pct}%`, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setStockInProduct(product)}
                        style={{
                          padding: '7px 12px', borderRadius: 9, cursor: 'pointer',
                          border: `1px solid ${T.green}35`, background: T.green + '0E',
                          color: T.green, fontSize: 11, fontWeight: 700,
                          fontFamily: 'Syne, sans-serif', transition: 'all 0.15s',
                          display: 'flex', alignItems: 'center', gap: 5,
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = T.green + '1C'}
                        onMouseLeave={e => e.currentTarget.style.background = T.green + '0E'}
                      >
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                        Stok Masuk
                      </button>
                      <button
                        onClick={() => setAdjustProduct(product)}
                        style={{
                          padding: '7px 10px', borderRadius: 9, cursor: 'pointer',
                          border: `1px solid ${T.border2}`, background: 'transparent',
                          color: T.sub, fontSize: 11, fontWeight: 700,
                          fontFamily: 'Syne, sans-serif', transition: 'all 0.15s',
                          display: 'flex', alignItems: 'center', gap: 5,
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent + '50'; e.currentTarget.style.color = T.accent; e.currentTarget.style.background = T.accent + '0A'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border2; e.currentTarget.style.color = T.sub; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5h7M6.5 3L9 5.5 6.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Koreksi
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
      </div>

      {stockInProduct && <StockInModal product={stockInProduct} onClose={() => setStockInProduct(null)} onSuccess={load} showToast={showToast} />}
      {adjustProduct  && <AdjustModal  product={adjustProduct}  onClose={() => setAdjustProduct(null)}  onSuccess={load} showToast={showToast} />}
    </>
  );
}

export default InventoryList;
