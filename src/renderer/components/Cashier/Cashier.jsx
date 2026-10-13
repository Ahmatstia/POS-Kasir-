import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { getProducts } from "../../services/database";
import { createTransaction, getLocalDatetimeStr } from "../../services/transactions";
import { getStoreProfile } from "../../services/settings";
import { printReceipt, printThermalReceipt, printShiftReceipt } from "../../utils/PrintUtility";
import { getCurrentShift, getCashMovements } from "../../services/shifts";
import { OpenShiftModal, CashMovementModal, CloseShiftModal, CancelShiftModal } from "../Shifts/ShiftsManagement";
import PaymentModal from "./PaymentModal";
import { useToast } from "../Toast";
import { T } from "../../theme";
import { formatNominal, parseNominal } from "../../utils/format";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

// ─── UNIT CONFIGS ─────────────────────────────────────────────────────────────
const UNITS = [
  { key: 'pcs',    label: 'Pcs',    priceKey: 'price_pcs',    color: T.blue   },
  { key: 'pack',   label: 'Pack',   priceKey: 'price_pack',   color: T.green  },
  { key: 'dus',    label: 'Dus',    priceKey: 'price_dus',    color: T.accent },
  { key: 'kg',     label: 'Kg',     priceKey: 'price_kg',     color: T.purple },
  { key: 'karung', label: 'Karung', priceKey: 'price_karung', color: T.orange },
];

// Calculate how many Pcs a cart item represents
function calcPcs(item, product) {
  if (!product) return item.quantity;
  if (item.unit === 'kg') return 0;
  if (item.unit === 'karung') return 0; // Karung is also weight-based
  const pp = product.pcs_per_pack || 1;
  const pd = product.pack_per_dus || 1;
  if (item.unit === 'pack') return item.quantity * pp;
  if (item.unit === 'dus')  return item.quantity * pd * pp;
  return item.quantity;
}

// ─── WEIGHING MODAL (Kalkulator Timbangan Sembako) ──────────────────────────
function WeighingModal({ product, onClose, onConfirm }) {
  const [tab, setTab] = useState('quick'); // 'quick', 'custom', 'nominal'
  const [customVal, setCustomVal] = useState('');
  const [customUnit, setCustomUnit] = useState('kg'); // 'kg', 'ons', 'gram'
  const [nominalVal, setNominalVal] = useState('');

  const priceKg = product.price_kg || 0;

  // Calculate final Kg and Subtotal
  let finalKg = 0;
  if (tab === 'quick' || tab === 'custom') {
    let v = parseFloat(customVal) || 0;
    if (customUnit === 'ons') v = v / 10;
    else if (customUnit === 'gram') v = v / 1000;
    finalKg = v;
  } else if (tab === 'nominal') {
    let v = parseNominal(nominalVal) || 0;
    finalKg = priceKg > 0 ? (v / priceKg) : 0;
  }

  const handleQuick = (v, u) => {
    setTab('custom');
    setCustomVal(String(v));
    setCustomUnit(u);
  };
  
  const isInvalid = finalKg <= 0 || isNaN(finalKg);
  const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${T.border2}`, background: T.bg, color: T.text, fontFamily: 'JetBrains Mono, monospace', fontSize: 16, outline: 'none' };
  
  const btnStyle = (active) => ({ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 11, fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer', border: `1.5px solid ${active ? T.purple : T.border2}`, background: active ? T.purple + '10' : T.bg, color: active ? T.purple : T.sub, transition: 'all 0.2s', textAlign: 'center' });

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif' }}>
       <style>{`@keyframes modalPop { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }`}</style>
       <div style={{ width: 440, background: T.surface, borderRadius: 24, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.4)', animation: 'modalPop 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
             <div>
                <p style={{ fontSize: 9, fontWeight: 800, color: T.purple, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '2px 8px', background: T.purple + '15', borderRadius: 6, display: 'inline-block', marginBottom: 8 }}>Kalkulator Timbangan</p>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>{product.name}</h3>
                <p style={{ fontSize: 12, color: T.sub, marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>{fmt(priceKg)} <span style={{fontSize: 10}}>/ Kg</span></p>
             </div>
             <button onClick={onClose} style={{ border: 'none', background: T.border2, width: 28, height: 28, borderRadius: '50%', color: T.sub, cursor: 'pointer', fontWeight: 800 }}>×</button>
          </div>

          {/* Menus */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
             <button onClick={() => setTab('quick')}   style={btnStyle(tab === 'quick')}>Cepat</button>
             <button onClick={() => setTab('custom')}  style={btnStyle(tab === 'custom')}>Ketik Bebas</button>
             <button onClick={() => setTab('nominal')} style={btnStyle(tab === 'nominal')}>Nominal Uang</button>
          </div>

          {/* CONTENT QUICK */}
          {tab === 'quick' && (
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                <button onClick={() => handleQuick(1, 'kg')} style={{ padding:'12px', borderRadius: 12, border: `1px solid ${T.border2}`, background: T.bg, color: T.text, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily:'JetBrains Mono, monospace' }}>1 Kg</button>
                <button onClick={() => handleQuick(0.5, 'kg')} style={{ padding:'12px', borderRadius: 12, border: `1px solid ${T.border2}`, background: T.bg, color: T.text, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily:'JetBrains Mono, monospace' }}>1/2 Kg <span style={{fontSize: 9, color:T.muted}}>(0.5)</span></button>
                <button onClick={() => handleQuick(0.25, 'kg')} style={{ padding:'12px', borderRadius: 12, border: `1px solid ${T.border2}`, background: T.bg, color: T.text, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily:'JetBrains Mono, monospace' }}>1/4 Kg <span style={{fontSize: 9, color:T.muted}}>(0.25)</span></button>
                <button onClick={() => handleQuick(1, 'ons')} style={{ padding:'12px', borderRadius: 12, border: `1px solid ${T.border2}`, background: T.bg, color: T.text, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily:'JetBrains Mono, monospace' }}>1 Ons <span style={{fontSize: 9, color:T.muted}}>(0.1)</span></button>
             </div>
          )}

          {/* CONTENT CUSTOM */}
          {tab === 'custom' && (
             <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 20 }}>
                <input type="number" step="0.01" value={customVal} onChange={e => setCustomVal(e.target.value)} placeholder="0.0" style={inputStyle} autoFocus />
                <select value={customUnit} onChange={e => setCustomUnit(e.target.value)} style={{...inputStyle, cursor: 'pointer'}}>
                   <option value="kg">Kg</option>
                   <option value="ons">Ons</option>
                   <option value="gram">Gram</option>
                </select>
             </div>
          )}

          {/* CONTENT NOMINAL */}
          {tab === 'nominal' && (
             <div style={{ marginBottom: 20, position:'relative' }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.1em' }}>Pembeli Bawa Uang (Rp)</label>
                <span style={{ position: 'absolute', left: 14, top: 40, color: T.muted, fontSize: 14, fontWeight: 800 }}>Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNominal(nominalVal)}
                  onChange={e => setNominalVal(e.target.value.replace(/\D/g, ''))}
                  placeholder="10.000"
                  style={{...inputStyle, paddingLeft: 40}}
                  autoFocus
                />
             </div>
          )}

          {/* SUMMARY BOX */}
          <div style={{ padding: 16, borderRadius: 16, background: finalKg > 0 ? T.purple + '10' : T.bg, border: `1px dashed ${finalKg > 0 ? T.purple + '40' : T.border2}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
             <div>
                <p style={{ fontSize: 10, color: T.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing:'0.05em' }}>Otomatis Terhitung</p>
                <p style={{ fontSize: 24, fontWeight: 900, color: finalKg > 0 ? T.purple : T.muted, fontFamily: 'JetBrains Mono, monospace' }}>{finalKg > 0 ? finalKg.toFixed(3).replace(/\.?0+$/, '') : '0'} <span style={{fontSize: 14}}>Kg</span></p>
             </div>
             <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 10, color: T.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing:'0.05em' }}>Harga Akhir</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: finalKg > 0 ? T.text : T.muted, fontFamily: 'JetBrains Mono, monospace' }}>{fmt(finalKg * priceKg)}</p>
             </div>
          </div>

          <button 
             onClick={() => onConfirm(finalKg)}
             disabled={isInvalid}
             style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: isInvalid ? T.border2 : T.purple, color: isInvalid ? T.muted : '#fff', fontWeight: 800, fontSize: 14, fontFamily:'Syne, sans-serif', cursor: isInvalid ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: isInvalid ? 'none' : `0 8px 24px ${T.purple}40` }}
          >
             + Masukkan ke Keranjang
          </button>
       </div>
    </div>
  );
}

// ─── HOLD CART MODAL ──────────────────────────────────────────────────────────
function HoldCartModal({ itemCount, total, onClose, onConfirm }) {
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(customerName, note);
  };

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.68)', backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, fontFamily: 'Syne, sans-serif',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 440,
        background: T.surface, border: `1px solid ${T.border2}`,
        borderRadius: 20, padding: 24,
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.45)',
        animation: 'modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: T.orange }}>⏸</span> Tahan Nota Sementara
            </h3>
            <p style={{ fontSize: 12, color: T.sub, margin: '4px 0 0' }}>
              Simpan belanjaan ini agar kasir bisa melayani pembeli berikutnya.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: T.muted,
              fontSize: 18, cursor: 'pointer', padding: '4px 8px', borderRadius: 8,
            }}
          >✕</button>
        </div>

        {/* Ringkasan Belanjaan */}
        <div style={{
          padding: '12px 14px', borderRadius: 12,
          background: T.bg, border: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16,
        }}>
          <div>
            <span style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Isi Belanjaan</span>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.text }}>{itemCount} macam barang</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Nota</span>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: T.accent, fontFamily: 'JetBrains Mono, monospace' }}>
              {fmt(total)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Nama atau Ciri Pembeli
            </label>
            <input
              ref={inputRef}
              type="text"
              placeholder="Contoh: Ibu baju merah, Mas Agus, dll"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                background: T.bg, border: `1px solid ${T.border2}`,
                color: T.text, fontSize: 13, outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Catatan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Mengambil kecap manis dulu"
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                background: T.bg, border: `1px solid ${T.border2}`,
                color: T.text, fontSize: 13, outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '12px', borderRadius: 10,
                border: `1px solid ${T.border2}`, background: 'transparent',
                color: T.sub, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              style={{
                flex: 1.5, padding: '12px', borderRadius: 10,
                border: 'none', background: T.orange,
                color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                boxShadow: `0 4px 14px ${T.orange}40`,
              }}
            >
              Simpan & Tahan
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── HELD CARTS LIST MODAL ───────────────────────────────────────────────────
function HeldCartsListModal({ heldCarts, onClose, onRestore, onDelete }) {
  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.68)', backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, fontFamily: 'Syne, sans-serif',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 540, maxHeight: '85vh',
        background: T.surface, border: `1px solid ${T.border2}`,
        borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.45)',
        animation: 'modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: T.orange }}>📂</span> Daftar Nota Tertahan ({heldCarts.length})
            </h3>
            <p style={{ fontSize: 12, color: T.sub, margin: '4px 0 0' }}>
              Klik "Buka Nota" untuk melanjutkan pembayaran transaksi pembeli.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: T.muted,
              fontSize: 18, cursor: 'pointer', padding: '4px 8px', borderRadius: 8,
            }}
          >✕</button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
          {heldCarts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: T.muted }}>
              <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>🧺</span>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Tidak ada transaksi yang sedang ditahan.</p>
            </div>
          ) : (
            heldCarts.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '14px 16px', borderRadius: 14,
                  background: T.bg, border: `1px solid ${T.border2}`,
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.text }}>
                      {item.customerName}
                    </h4>
                    <span style={{ fontSize: 11, color: T.muted, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      ⏱ Ditahan jam {item.heldAt} • {item.items?.length || 0} barang
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: T.accent, fontFamily: 'JetBrains Mono, monospace' }}>
                      {fmt(item.total)}
                    </span>
                  </div>
                </div>

                {item.note && (
                  <div style={{ fontSize: 12, color: T.sub, fontStyle: 'italic', background: T.surface, padding: '4px 8px', borderRadius: 6 }}>
                    💬 {item.note}
                  </div>
                )}

                <div style={{ fontSize: 11, color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {(item.items || []).map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <button
                    onClick={() => onDelete(item.id)}
                    style={{
                      padding: '6px 12px', borderRadius: 8,
                      border: `1px solid ${T.red}35`, background: T.red + '10',
                      color: T.red, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Hapus
                  </button>
                  <button
                    onClick={() => onRestore(item.id)}
                    style={{
                      padding: '6px 16px', borderRadius: 8,
                      border: 'none', background: T.green,
                      color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                      boxShadow: `0 2px 8px ${T.green}40`,
                    }}
                  >
                    Buka Nota →
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '10px', borderRadius: 10,
              border: `1px solid ${T.border2}`, background: T.surface,
              color: T.text, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── PRODUCT ITEM ─────────────────────────────────────────────────────────────
function ProductItem({ product, addToCart, addManualToCart, isLast, lastRef, ignoreStock }) {
  const [showManual, setShowManual] = useState(false);
  const [manualPrice, setManualPrice] = useState('');
  const [manualQty, setManualQty]   = useState(1);
  const [manualUnit, setManualUnit] = useState('pcs');

  // Tentukan status stok berdasarkan unit jual (Hybrid aware)
  const isHybrid = product.has_unit_price && product.has_weight_price;
  const isKgProduct = product.sell_per_unit === 'kg';
  
  let isOut, isLow, stockDisplay;
  if (isHybrid) {
    isOut = product.stock <= 0 && product.stock_kg <= 0;
    isLow = !isOut && (product.stock <= product.min_stock || product.stock_kg <= product.min_stock_kg);
    stockDisplay = `${product.stock} pcs / ${Number(product.stock_kg || 0).toFixed(2)} kg`;
  } else {
    const current = isKgProduct ? (product.stock_kg || 0) : (product.stock || 0);
    const min     = isKgProduct ? (product.min_stock_kg || 0) : (product.min_stock || 0);
    isOut = current <= 0;
    isLow = !isOut && current <= min;
    stockDisplay = isOut ? 'HABIS' : `${isKgProduct ? Number(current).toFixed(2) : current}${isKgProduct ? ' kg' : ' stok'}`;
  }

  const handleManualAdd = () => {
    const price = parseNominal(manualPrice);
    const qty   = parseFloat(manualQty);
    
    if (!manualPrice || isNaN(price) || price <= 0) {
      showToast('error', 'Harga tidak boleh kosong atau Rp 0');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      showToast('error', 'Jumlah/Qty tidak boleh kosong atau 0');
      return;
    }

    const result = addManualToCart(product, { price, quantity: qty, unit: manualUnit });
    if (result) {
      setShowManual(false);
      setManualPrice('');
      setManualQty(1);
    }
  };

  const availableUnits = UNITS.filter(u => {
    // Show all units that have a price registered (> 0)
    // This allows "Hybrid" products (e.g. sold by Pack AND Kg)
    return product[u.priceKey] !== undefined && product[u.priceKey] !== null && Number(product[u.priceKey]) > 0;
  });


  return (
    <div
      ref={isLast ? lastRef : null}
      style={{
        padding: '14px 16px',
        borderBottom: `1px solid ${T.border}`,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = T.border + '50'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
          <p style={{
            fontSize: 13, fontWeight: 700, color: (!ignoreStock && isOut) ? T.muted : T.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            margin: 0,
          }}>
            {product.name}
          </p>
          {!ignoreStock && (
            <div style={{ marginTop: 2 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                color: isOut ? T.red : isLow ? T.orange : T.sub,
              }}>
                {isOut ? '● HABIS' : isLow ? `● Sisa ${stockDisplay}` : stockDisplay}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowManual(v => !v)}
          style={{
            padding: '4px 9px', borderRadius: 6, fontSize: 10, fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.15s',
            border: showManual ? `1px solid ${T.red}40` : `1px solid ${T.border2}`,
            background: showManual ? T.red + '12' : T.bg,
            color: showManual ? T.red : T.sub,
            flexShrink: 0,
          }}
        >
          {showManual ? '✕ Batal' : '✏️ Kustom'}
        </button>
      </div>

      {/* Unit buttons */}
      {!showManual && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {availableUnits.map(u => {
            const isButtonDisabled = !ignoreStock && isOut;
            return (
              <button
                key={u.key}
                disabled={isButtonDisabled}
                onClick={() => addToCart(product, u.key)}
                style={{
                  padding: '5px 12px', borderRadius: 8,
                  fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                  cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  border: `1px solid ${isButtonDisabled ? T.border2 : u.color + '40'}`,
                  background: isButtonDisabled ? T.border : u.color + '12',
                  color: isButtonDisabled ? T.muted : u.color,
                  opacity: isButtonDisabled ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!isButtonDisabled) e.currentTarget.style.background = u.color + '25'; }}
                onMouseLeave={e => { if (!isButtonDisabled) e.currentTarget.style.background = u.color + '12'; }}
              >
                {u.label} · {fmt(product[u.priceKey])}
              </button>
            );
          })}

          {availableUnits.length === 0 && !isOut && (
            <span style={{ fontSize: 11, color: T.muted, fontStyle: 'italic' }}>Gunakan mode Harga Kustom</span>
          )}
        </div>
      )}

      {/* Manual / Harga Kustom form */}
      {showManual && (
        <div style={{
          marginTop: 4, padding: '12px', borderRadius: 10,
          background: T.bg, border: `1px solid ${T.border2}`,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px', gap: 8, marginBottom: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>
                Harga / Unit (Rp)
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={formatNominal(manualPrice)}
                onChange={e => setManualPrice(e.target.value.replace(/\D/g, ''))}
                autoFocus
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>
                {manualUnit === 'kg' ? 'Jml (Kg)' : 'Qty'}
              </label>
              <input type="number" step={manualUnit === 'kg' ? "0.01" : "1"} min="0" value={manualQty} onChange={e => setManualQty(e.target.value)}
                placeholder={manualUnit === 'kg' ? "0.0" : "1"} style={{ ...inputStyle, textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>
                Unit
              </label>
              <select
                value={manualUnit}
                onChange={e => setManualUnit(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="pcs">Pcs</option>
                <option value="pack">Pack</option>
                <option value="dus">Dus</option>
                <option value="kg">Kg</option>
                <option value="karung">Karung</option>
              </select>
            </div>
          </div>

          {/* Preview total */}
          {manualPrice && manualQty && (
            <div style={{ marginBottom: 8, fontSize: 11, color: T.sub, fontFamily: 'JetBrains Mono, monospace' }}>
              Subtotal: <span style={{ color: T.accent, fontWeight: 700 }}>{fmt(parseNominal(manualPrice) * parseFloat(manualQty || 0))}</span>
            </div>
          )}

          <button
            onClick={handleManualAdd}
            style={{
              width: '100%', padding: '8px', borderRadius: 8,
              background: T.accent + '18', border: `1px solid ${T.accent}40`,
              color: T.accent, fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.accent + '28'}
            onMouseLeave={e => e.currentTarget.style.background = T.accent + '18'}
          >
            + Tambah ke Keranjang
          </button>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '7px 10px',
  borderRadius: 8, border: `1px solid ${T.border2}`,
  background: T.surface, color: T.text,
  fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
  outline: 'none', transition: 'border-color 0.15s',
};

// ─── CART ROW ─────────────────────────────────────────────────────────────────
function CartRow({ item, onUpdate, onRemove }) {
  const unit = UNITS.find(u => u.key === item.unit) || UNITS[0];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', borderRadius: 10, marginBottom: 6,
      background: T.card, border: `1px solid ${T.border}`,
      transition: 'border-color 0.15s',
    }}>
      {/* Unit badge */}
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: unit.color + '15', border: `1px solid ${unit.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 800, color: unit.color,
        letterSpacing: '0.05em', textTransform: 'uppercase',
      }}>
        {unit.label}
      </div>

      {/* Name & price */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
          {item.name}
        </p>
        <p style={{ fontSize: 10, color: T.sub, fontFamily: 'JetBrains Mono, monospace' }}>
          {fmt(item.price)} / {item.unit}
        </p>
      </div>

      {/* Qty control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <button
          onClick={() => (item.quantity <= 1) ? onRemove(item.id) : onUpdate(item.id, item.quantity - 1)}
          style={qtyBtnStyle((item.quantity <= 1) ? T.red : T.border2, (item.quantity <= 1) ? T.red : T.sub)}
        >
          {(item.quantity <= 1) ? '×' : '−'}
        </button>
        <span style={{ minWidth: 22, textAlign: 'center', fontSize: 13, fontWeight: 800, color: T.text, fontFamily: 'JetBrains Mono, monospace' }}>
          {item.quantity}
        </span>
        <button
          onClick={() => onUpdate(item.id, item.quantity + 1)}
          style={qtyBtnStyle(T.green + '40', T.green)}
        >
          +
        </button>
      </div>

      {/* Subtotal */}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: T.text, fontFamily: 'JetBrains Mono, monospace' }}>
          {fmt(item.subtotal)}
        </p>
      </div>
    </div>
  );
}


const qtyBtnStyle = (borderColor, color) => ({
  width: 26, height: 26, borderRadius: 7,
  border: `1px solid ${borderColor}`,
  background: 'transparent', color,
  fontSize: 14, fontWeight: 700, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s', fontFamily: 'Syne, sans-serif',
});

// ─── MAIN CASHIER ─────────────────────────────────────────────────────────────
function Cashier({ setCurrentPage }) {
  const { showToast } = useToast();

  const [activeShift, setActiveShift]               = useState(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showMovementModal, setShowMovementModal]   = useState(false);
  const [movementType, setMovementType]             = useState('OUT');
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showCancelShiftModal, setShowCancelShiftModal] = useState(false);
  const [shiftMovements, setShiftMovements]         = useState([]);
  const [allProducts, setAllProducts]               = useState([]);
  const [displayedProducts, setDisplayedProducts]   = useState([]);
  const [searchTerm, setSearchTerm]                 = useState('');
  const [cart, setCart]                             = useState([]);
  const [showPayment, setShowPayment]               = useState(false);
  const [weighingProduct, setWeighingProduct]       = useState(null); // the product to weigh
  const [reweighItem, setReweighItem]               = useState(null); // { itemId, product }
  const [loading, setLoading]                       = useState(false);
  const [loadingMore, setLoadingMore]               = useState(false);
  const [hasMore, setHasMore]                       = useState(true);
  const [page, setPage]                             = useState(1);
  const [ignoreStock, setIgnoreStock]               = useState(false);
  // "Kosongkan" two-step confirm
  const [confirmClear, setConfirmClear]             = useState(false);
  const ITEMS_PER_PAGE = 30;

  // ─── TAHAN NOTA (HOLD CART) ───
  const [heldCarts, setHeldCarts] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_held_carts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showHeldListModal, setShowHeldListModal] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('pos_held_carts', JSON.stringify(heldCarts));
    } catch (e) {
      console.error('Gagal menyimpan nota tertahan', e);
    }
  }, [heldCarts]);

  const observer = useRef();
  const lastProductRef = useCallback((node) => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) loadMoreProducts();
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore]);

  const checkShift = async () => {
    try {
      const s = await getCurrentShift();
      setActiveShift(s);
      return s;
    } catch (e) {
      console.error("Gagal cek shift kasir:", e);
      return null;
    }
  };

  const handleOpenMovement = (type) => {
    if (!activeShift) {
      showToast('error', 'Buka shift kasir terlebih dahulu!');
      setShowOpenShiftModal(true);
      return;
    }
    setMovementType(type);
    setShowMovementModal(true);
  };

  const handleOpenCloseShift = async () => {
    if (!activeShift) return;
    try {
      const movs = await getCashMovements(activeShift.id);
      setShiftMovements(movs);
    } catch (e) {
      console.error("Gagal memuat catatan uang laci:", e);
      setShiftMovements([]);
    }
    setShowCloseShiftModal(true);
  };

  useEffect(() => { 
    (async () => {
      const res = await window.electronAPI.query("SELECT value FROM settings WHERE key = 'ignore_stock'");
      const isIgnore = (res[0]?.value === '1');
      setIgnoreStock(isIgnore);
      loadProducts(); 
      checkShift();
    })();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setDisplayedProducts(allProducts.slice(0, ITEMS_PER_PAGE));
      setHasMore(allProducts.length > ITEMS_PER_PAGE);
      setPage(1);
    } else {
      const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setDisplayedProducts(filtered);
      setHasMore(false);
    }
  }, [searchTerm, allProducts]);

  const loadProducts = async () => {
    setLoading(true);
    const data = await getProducts();
    setAllProducts(data);
    setDisplayedProducts(data.slice(0, ITEMS_PER_PAGE));
    setHasMore(data.length > ITEMS_PER_PAGE);
    setLoading(false);
  };

  const loadMoreProducts = () => {
    if (loadingMore || !hasMore || searchTerm !== '') return;
    setLoadingMore(true);
    setTimeout(() => {
      const nextPage = page + 1;
      const end = nextPage * ITEMS_PER_PAGE;
      setDisplayedProducts(allProducts.slice(0, end));
      setPage(nextPage);
      setHasMore(allProducts.length > end);
      setLoadingMore(false);
    }, 300);
  };

  // Helper: calculate total pcs already in cart for a product (excluding one specific item id)
  const calcCartPcs = (productId, excludeItemId = null) => {
    return cart
      .filter(item => item.product_id === productId && item.id !== excludeItemId)
      .reduce((sum, item) => {
        const p = allProducts.find(x => x.id === item.product_id);
        return sum + calcPcs(item, p);
      }, 0);
  };

  // Helper: calculate total kg already in cart for a product
  const calcCartKg = (productId, excludeItemId = null) => {
    return cart
      .filter(item => item.product_id === productId && item.id !== excludeItemId && (item.unit === 'kg' || item.unit === 'karung'))
      .reduce((sum, item) => {
        if (item.unit === 'kg') return sum + parseFloat(item.quantity || 0);
        // If karung, convert to kg
        const p = allProducts.find(x => x.id === item.product_id);
        const kgPerKarung = p ? (p.kg_per_karung || 25) : 25;
        return sum + (parseFloat(item.quantity || 0) * kgPerKarung);
      }, 0);
  };

  const addToCart = (product, unit) => {
    if (!activeShift) {
      showToast('error', 'Buka shift kasir terlebih dahulu sebelum melayani penjualan!');
      setShowOpenShiftModal(true);
      return;
    }
    const u = UNITS.find(x => x.key === unit);
    const price = product[u.priceKey];
    if (!price || price <= 0) return;

    // Use Weighing Scale Modal for KG products
    if (unit === 'kg') {
      setWeighingProduct(product);
      return;
    }

    if (unit === 'karung' && !ignoreStock) {
       const kgPerKarung = product.kg_per_karung || 25;
       const currentKgInCart = calcCartKg(product.id);
       if (currentKgInCart + kgPerKarung > (product.stock_kg || 0)) {
          showToast('error', `Stok Kg tidak mencukupi! Tersisa: ${product.stock_kg || 0} Kg (di keranjang: ${currentKgInCart.toFixed(2)} Kg)`);
          return;
       }
    } else if (unit !== 'kg' && unit !== 'karung' && !ignoreStock) {
      const pp = product.pcs_per_pack || 1;
      const pd = product.pack_per_dus || 1;
      let pcsNeeded = 1;
      
      if (unit === 'pack') pcsNeeded = pp;
      if (unit === 'dus')  pcsNeeded = pd * pp;
      const currentPcsInCart = calcCartPcs(product.id);
      if (currentPcsInCart + pcsNeeded > (product.stock || 0)) {
         showToast('error', `Stok tidak mencukupi! Tersisa: ${product.stock || 0} Pcs (di keranjang: ${currentPcsInCart} Pcs)`);
         return;
      }
    }

    const existing = cart.find(item => item.product_id === product.id && item.unit === unit);
    if (existing) {
      setCart(cart.map(item =>
        item.product_id === product.id && item.unit === unit
          ? { ...item, quantity: item.quantity + 1, subtotal: Math.round((item.quantity + 1) * price) }
          : item
      ));
    } else {
      setCart([...cart, {
        id: Date.now() + Math.random(),
        product_id: product.id,
        name: product.name,
        unit, price,
        quantity: 1,
        subtotal: Math.round(price * 1),
      }]);
    }
  };

  const addKgToCartConfirm = (product, kgQty) => {
    if (!ignoreStock) {
      const currentKgInCart = calcCartKg(product.id);
      if (currentKgInCart + kgQty > (product.stock_kg || 0)) {
        showToast('error', `Stok Kg tidak mencukupi! Tersisa: ${product.stock_kg || 0} Kg (di keranjang: ${currentKgInCart} Kg)`);
        return;
      }
    }
    
    const cleanKg = Math.round(kgQty * 1000) / 1000;
    setCart([...cart, {
       id: Date.now() + Math.random(),
       product_id: product.id,
       name: product.name,
       unit: 'kg', price: product.price_kg,
       quantity: cleanKg,
       subtotal: Math.round(product.price_kg * cleanKg),
    }]);
    setWeighingProduct(null);
  };

  const addManualToCart = (product, { price, quantity, unit }) => {
    if (!activeShift) {
      showToast('error', 'Buka shift kasir terlebih dahulu sebelum melayani penjualan!');
      setShowOpenShiftModal(true);
      return false;
    }
    // Check Kg vs Pcs
    if (!ignoreStock) {
      if (unit === 'kg' || unit === 'karung') {
        const kgPerUnit = unit === 'karung' ? (product.kg_per_karung || 25) : 1;
        const qtyKg = parseFloat(quantity) * kgPerUnit;
        const currentKgInCart = calcCartKg(product.id);
        if (currentKgInCart + qtyKg > (product.stock_kg || 0)) {
          showToast('error', `Gagal: Stok Kg tidak mencukupi! Tersisa: ${product.stock_kg || 0} Kg (di keranjang: ${currentKgInCart.toFixed(2)} Kg)`);
          return false;
        }
      } else {
        const pp = product.pcs_per_pack || 1;
        const pd = product.pack_per_dus || 1;
        let pcsNeeded = quantity;
        if (unit === 'pack') pcsNeeded = quantity * pp;
        else if (unit === 'dus')  pcsNeeded = quantity * pd * pp;

        const currentPcsInCart = calcCartPcs(product.id);
        if (currentPcsInCart + pcsNeeded > (product.stock || 0)) {
          showToast('error', `Gagal: Stok Pcs tidak mencukupi! Tersisa: ${product.stock || 0} Pcs (di keranjang: ${currentPcsInCart} Pcs)`);
          return false;
        }
      }
    }

    setCart([...cart, {
      id: 'manual-' + Date.now() + Math.random(),
      product_id: product.id,
      name: `${product.name} ✎`,
      unit, price, quantity,
      subtotal: Math.round(price * quantity),
    }]);
    return true;
  };

  const updateQuantity = (itemId, newQty) => {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;

    if (item.unit === 'kg') {
       const product = allProducts.find(p => p.id === item.product_id);
       if (product) {
         setReweighItem({ itemId, product });
       } else {
         showToast('error', 'Produk tidak ditemukan di database.');
       }
       return;
    }

    // Remove item if quantity drops to 0 or below
    if (newQty <= 0) {
      removeFromCart(itemId);
      return;
    }

    const product = allProducts.find(p => p.id === item.product_id);
    if (product && !ignoreStock) {
      if (item.unit === 'karung') {
        const kgPerKarung = product.kg_per_karung || 25;
        const otherKg = calcCartKg(product.id, itemId);
        if ((newQty * kgPerKarung) + otherKg > (product.stock_kg || 0)) {
          showToast('error', `Stok Kg tidak mencukupi! Tersisa: ${product.stock_kg || 0} Kg`);
          return;
        }
      } else {
        const fakeItem = { ...item, quantity: newQty };
        const pcsNeeded = calcPcs(fakeItem, product);
        const otherPcs  = calcCartPcs(product.id, itemId);
        if (pcsNeeded + otherPcs > (product.stock || 0)) {
          showToast('error', `Stok tidak mencukupi! Tersisa: ${product.stock || 0} Pcs`);
          return;
        }
      }
    }

    setCart(cart.map(i => i.id === itemId ? { ...i, quantity: newQty, subtotal: Math.round(newQty * i.price) } : i));
  };

  const removeFromCart = (itemId) => setCart(cart.filter(item => item.id !== itemId));
  const total = Math.round(cart.reduce((sum, item) => sum + (item.subtotal || 0), 0));

  const handleHoldCart = (customerName, note) => {
    if (cart.length === 0) {
      showToast('error', 'Keranjang masih kosong, tidak ada yang ditahan.');
      return;
    }
    const currentTotal = cart.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const newHold = {
      id: 'HOLD-' + Date.now(),
      heldAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      customerName: customerName.trim() || `Pelanggan #${heldCarts.length + 1}`,
      note: note ? note.trim() : '',
      items: [...cart],
      total: currentTotal,
      itemCount: cart.length
    };
    setHeldCarts(prev => [newHold, ...prev]);
    setCart([]);
    setShowHoldModal(false);
    showToast('info', `Nota disimpan sementara (${newHold.customerName})`);
  };

  const handleRestoreHeldCart = (holdId) => {
    if (!activeShift) {
      showToast('error', 'Buka shift kasir terlebih dahulu sebelum memuat nota tersimpan!');
      setShowOpenShiftModal(true);
      return;
    }
    const target = heldCarts.find(h => h.id === holdId);
    if (!target) return;

    if (cart.length > 0) {
      const currentTotal = cart.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      const autoHold = {
        id: 'HOLD-' + Date.now(),
        heldAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        customerName: `Nota Sebelumnya (${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})`,
        note: 'Ditahan otomatis saat membuka nota lain',
        items: [...cart],
        total: currentTotal,
        itemCount: cart.length
      };
      setHeldCarts(prev => [autoHold, ...prev.filter(h => h.id !== holdId)]);
    } else {
      setHeldCarts(prev => prev.filter(h => h.id !== holdId));
    }

    setCart(target.items);
    setShowHeldListModal(false);
    showToast('success', `Nota ${target.customerName} berhasil dimuat kembali!`);
  };

  const handleDeleteHeldCart = (holdId) => {
    setHeldCarts(prev => prev.filter(h => h.id !== holdId));
    showToast('info', 'Nota tertahan dihapus.');
  };

  const handlePayment = async (paymentData) => {
    if (loading) return;
    setLoading(true);
    const cartSnapshot = [...cart];
    const subtotalSnapshot = total;
    const discountSnapshot = Number(paymentData.discount) || 0;
    const finalTotal = Math.max(0, subtotalSnapshot - discountSnapshot);

    const result = await createTransaction({
      items: cartSnapshot,
      subtotal: subtotalSnapshot,
      discount: discountSnapshot,
      total: finalTotal,
      payment: paymentData.payment,
      change: paymentData.change,
      paymentMethod: paymentData.method,
      customerName: paymentData.customerName || '',
      customerId: paymentData.customerId || null,
      notes: paymentData.notes || '',
    });
    if (result.success) {
      if (paymentData.autoPrint) {
        try {
          const store = await getStoreProfile();
          const txData = {
            invoice_no: result.invoiceNo,
            created_at: getLocalDatetimeStr(),
            customer_name: paymentData.customerName || '',
            subtotal: subtotalSnapshot,
            discount: discountSnapshot,
            total_amount: finalTotal,
            payment_amount: paymentData.payment,
            change_amount: paymentData.change,
            payment_method: paymentData.method,
          };
          const itemsData = cartSnapshot.map(item => ({
            product_name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            price_per_unit: item.price,
            subtotal: item.subtotal,
          }));
          if (paymentData.printType === 'normal') {
            printReceipt(txData, itemsData, store);
          } else {
            printThermalReceipt(txData, itemsData, store);
          }
        } catch (printErr) {
          console.error("Gagal cetak struk otomatis:", printErr);
        }
      }
      setCart([]);
      setShowPayment(false);
      // Refresh product list to show updated stock
      loadProducts();
      checkShift();
      showToast('success', `Transaksi berhasil! Invoice: ${result.invoiceNo} | Kembalian: ${fmt(paymentData.change)}`);
    } else {
      showToast('error', 'Transaksi gagal: ' + result.error);
    }
    setLoading(false);
  };

  if (loading && allProducts.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 36, height: 36, border: `2px solid ${T.border2}`,
            borderTopColor: T.accent, borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          <p style={{ fontSize: 12, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Memuat produk…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`

        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }

        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }

        input:focus, select:focus {
          border-color: ${T.accent}80 !important;
          box-shadow: 0 0 0 2px ${T.accent}15;
        }

        .prod-scroll::-webkit-scrollbar { width: 3px; }
        .prod-scroll::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 3px; }
        .cart-scroll::-webkit-scrollbar { width: 3px; }
        .cart-scroll::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 3px; }
      `}</style>

      {/* ─── SHIFT STATUS STRIP DI KASIR ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderRadius: 12, marginBottom: 12,
        background: activeShift ? T.surface : T.orange + '10',
        border: `1px solid ${activeShift ? T.border : T.orange + '35'}`,
        fontFamily: 'Syne, sans-serif',
        flexWrap: 'wrap', gap: 10,
      }}>
        {activeShift ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 800, color: T.green,
              background: T.green + '15', border: `1px solid ${T.green}30`,
              padding: '3px 10px', borderRadius: 100, textTransform: 'uppercase'
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, display: 'inline-block' }} />
              Shift #{activeShift.id}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
              Kasir: <b style={{ color: T.accent }}>{activeShift.cashier_name}</b>
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: T.sub }}>
              Uang di Laci: <b style={{ color: T.green, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 800 }}>{fmt(activeShift.summary?.expectedCash || activeShift.starting_cash)}</b>
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.orange }}>
              Laci kasir belum dibuka. Masukkan modal awal kembalian untuk membuka akses penjualan.
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {activeShift ? (
            <>
              <button
                onClick={() => handleOpenMovement('IN')}
                title="Catat uang masuk atau keluar dari laci di luar belanja nota"
                style={{
                  padding: '7px 13px', borderRadius: 8,
                  border: `1px solid ${T.accent}35`,
                  background: T.accentBg,
                  color: T.accent,
                  fontSize: 11, fontWeight: 800, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  transition: 'all 0.15s',
                }}
              >
                💸 Kas Masuk / Keluar
              </button>
              {((activeShift.summary?.transactionCount || 0) === 0 && (activeShift.summary?.debtCollected || 0) === 0) && (
                <button
                  onClick={() => setShowCancelShiftModal(true)}
                  title="Batalkan pembukaan shift ini jika salah input (hanya bisa jika belum ada transaksi belanja)"
                  style={{
                    padding: '6px 11px', borderRadius: 8,
                    border: `1px solid ${T.muted}35`,
                    background: 'transparent',
                    color: T.muted,
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = T.red; e.currentTarget.style.borderColor = T.red + '50'; e.currentTarget.style.background = T.red + '10'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.muted + '35'; e.currentTarget.style.background = 'transparent'; }}
                >
                  ✕ Batal Buka Shift
                </button>
              )}
              <button
                onClick={handleOpenCloseShift}
                title="Tutup shift kasir & hitung fisik uang di laci"
                style={{
                  padding: '7px 14px', borderRadius: 8,
                  border: `1px solid ${T.red}40`,
                  background: T.red + '15',
                  color: T.red,
                  fontSize: 11, fontWeight: 800, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  transition: 'all 0.15s',
                }}
              >
                🔒 Tutup Shift
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowOpenShiftModal(true)}
              style={{
                padding: '7px 16px', borderRadius: 8,
                border: 'none',
                background: T.green,
                color: '#fff',
                fontSize: 12, fontWeight: 800, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: `0 2px 10px ${T.green}40`,
                transition: 'all 0.15s',
              }}
            >
            Buka Shift Kasir Sekarang
            </button>
          )}
        </div>
      </div>

      {!activeShift ? (
        <div style={{
          background: T.surface,
          border: `1px solid ${T.border2}`,
          borderRadius: 20,
          padding: '44px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: 'calc(100vh - 200px)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.12)',
          animation: 'fadeUp 0.35s ease both',
          fontFamily: 'Syne, sans-serif',
        }}>
          <div style={{
            width: 76, height: 76, borderRadius: '50%',
            background: T.orange + '15', border: `2px solid ${T.orange}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34, marginBottom: 18,
          }}>
            🔒
          </div>  

          <h2 style={{ fontSize: 24, fontWeight: 900, color: T.text, margin: '0 0 8px' }}>
            Shift Kasir Belum Dibuka
          </h2>

          <p style={{ fontSize: 13, color: T.sub, maxWidth: 540, lineHeight: 1.6, margin: '0 0 24px' }}>
            Untuk memastikan uang di laci tidak tercecer dan selisih kas fisik terhitung akurat, 
            silakan buka shift kasir dan catat modal awal kembalian sebelum mulai melayani pembeli.
          </p>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => setShowOpenShiftModal(true)}
              style={{
                padding: '13px 26px', borderRadius: 12, border: 'none',
                background: T.green, color: '#fff', fontSize: 14, fontWeight: 800,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: `0 6px 20px ${T.green}45`, transition: 'all 0.15s',
              }}
            >
            Buka Shift Kasir Sekarang
            </button>

            {setCurrentPage && (
              <button
                onClick={() => setCurrentPage('shifts')}
                style={{
                  padding: '13px 20px', borderRadius: 12,
                  border: `1px solid ${T.border2}`, background: T.bg,
                  color: T.sub, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                Buka Menu Shift
              </button>
            )}
          </div>

          {/* 3 Value propositions */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16, width: '100%', maxWidth: 760, textAlign: 'left',
          }}>
            <div style={{
              padding: '16px 18px', borderRadius: 14, background: T.bg,
              border: `1px solid ${T.border}`,
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 4 }}>
                Modal Uang Pecahan
              </div>
              <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
                Catat uang kembalian (misal Rp 200.000) yang disiapkan di laci agar tidak tercampur modal pribadi.
              </div>
            </div>

            <div style={{
              padding: '16px 18px', borderRadius: 14, background: T.bg,
              border: `1px solid ${T.border}`,
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 4 }}>
                Hitungan Kas Otomatis
              </div>
              <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
                Setiap nota tunai, QRIS, cicilan kasbon, dan uang kembalian terhitung rapi per nama kasir.
              </div>
            </div>

            <div style={{
              padding: '16px 18px', borderRadius: 14, background: T.bg,
              border: `1px solid ${T.border}`,
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 4 }}>
                Cek Selisih Saat Tutup
              </div>
              <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
                Saat tutup toko, sistem otomatis membandingkan uang fisik di laci dengan hitungan sistem komputer.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 420px',
          gap: 16, height: 'calc(100vh - 195px)',
          fontFamily: 'Syne, sans-serif',
          animation: 'fadeUp 0.4s ease both',
        }}>

        {/* ── LEFT: PRODUCT LIST ── */}
        <div style={{
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: T.text, margin: 0 }}>
                Daftar Produk
                <span style={{ fontSize: 11, fontWeight: 600, color: T.sub, marginLeft: 8, fontFamily: 'JetBrains Mono, monospace' }}>
                  ({displayedProducts.length})
                </span>
              </p>
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Cari nama produk…"
                style={{
                  width: '100%', padding: '9px 36px',
                  borderRadius: 10, border: `1px solid ${T.border2}`,
                  background: T.bg, color: T.text,
                  fontFamily: 'Syne, sans-serif', fontSize: 13,
                  outline: 'none', transition: 'border-color 0.15s',
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: T.muted, fontSize: 16, lineHeight: 1, padding: 2,
                  }}
                >×</button>
              )}
            </div>
          </div>

          {/* Product list */}
          <div className="prod-scroll" style={{ flex: 1, overflowY: 'auto' }}>
            {displayedProducts.length > 0 ? (
              <>
                {displayedProducts.map((product, index) => (
                  <ProductItem
                    key={product.id}
                    product={product}
                    addToCart={addToCart}
                    addManualToCart={addManualToCart}
                    ignoreStock={ignoreStock}
                    isLast={!searchTerm && index === displayedProducts.length - 1}
                    lastRef={lastProductRef}
                  />
                ))}

                {loadingMore && (
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{
                      width: 20, height: 20,
                      border: `2px solid ${T.border2}`, borderTopColor: T.accent,
                      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                      margin: '0 auto 8px',
                    }} />
                    <p style={{ fontSize: 11, color: T.muted }}>Memuat lebih banyak…</p>
                  </div>
                )}

                {!hasMore && !searchTerm && (
                  <div style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{ fontSize: 10, color: T.muted, letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace' }}>
                      ── END OF LIST ──
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8 }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <p style={{ fontSize: 12, color: T.muted }}>
                  {searchTerm ? `Tidak ada produk "${searchTerm}"` : 'Tidak ada produk'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: CART ── */}
        <div style={{
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Cart header */}
          <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, margin: 0 }}>
                  Keranjang
                </p>
                {heldCarts.length > 0 && (
                  <button
                    onClick={() => setShowHeldListModal(true)}
                    title="Buka daftar nota yang ditahan"
                    style={{
                      fontSize: 10, fontWeight: 800, color: T.orange,
                      background: T.orange + '18', border: `1px solid ${T.orange}40`,
                      padding: '2px 8px', borderRadius: 100, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = T.orange + '28'}
                    onMouseLeave={e => e.currentTarget.style.background = T.orange + '18'}
                  >
                    <span>📂</span> {heldCarts.length} Tertahan
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {cart.length > 0 && !confirmClear && (
                  <>
                    <button
                      onClick={() => setShowHoldModal(true)}
                      title="Tahan transaksi belanja ini sementara untuk layani pembeli lain"
                      style={{
                        fontSize: 10, fontWeight: 700, color: T.orange, letterSpacing: '0.04em',
                        background: T.orange + '12', border: `1px solid ${T.orange}30`,
                        padding: '3px 9px', borderRadius: 100, cursor: 'pointer',
                        transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: 4
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = T.orange + '22'}
                      onMouseLeave={e => e.currentTarget.style.background = T.orange + '12'}
                    >
                      ⏸ Tahan
                    </button>
                    <button
                      onClick={() => setConfirmClear(true)}
                      style={{
                        fontSize: 10, fontWeight: 700, color: T.red, letterSpacing: '0.06em',
                        background: T.red + '10', border: `1px solid ${T.red}25`,
                        padding: '3px 10px', borderRadius: 100, cursor: 'pointer',
                        transition: 'all 0.15s', textTransform: 'uppercase',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = T.red + '20'}
                      onMouseLeave={e => e.currentTarget.style.background = T.red + '10'}
                    >
                      Kosongkan
                    </button>
                  </>
                )}
                <span style={{
                  fontSize: 12, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
                  padding: '3px 10px', borderRadius: 100,
                  background: T.accent + '15', border: `1px solid ${T.accent}30`, color: T.accent,
                }}>
                  {cart.length}
                </span>
              </div>
            </div>

            {/* Inline confirm clear */}
            {confirmClear && (
              <div style={{
                marginTop: 10, padding: '10px 12px', borderRadius: 10,
                background: T.red + '0C', border: `1px solid ${T.red}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 11, color: T.red, fontWeight: 600 }}>Yakin kosongkan keranjang?</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setConfirmClear(false)}
                    style={{ padding: '4px 10px', borderRadius: 7, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >Batal</button>
                  <button
                    onClick={() => { setCart([]); setConfirmClear(false); }}
                    style={{ padding: '4px 10px', borderRadius: 7, border: `1px solid ${T.red}40`, background: T.red + '15', color: T.red, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >Ya, Kosongkan</button>
                </div>
              </div>
            )}
          </div>

          {/* Cart items */}
          <div className="cart-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
            {cart.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                <p style={{ fontSize: 13, fontWeight: 700, color: T.muted }}>Keranjang kosong</p>
                <p style={{ fontSize: 11, color: T.muted + '80' }}>Pilih produk dari panel kiri</p>
              </div>
            ) : (
              cart.map(item => (
                <CartRow
                  key={item.id}
                  item={item}
                  onUpdate={updateQuantity}
                  onRemove={removeFromCart}
                />
              ))
            )}
          </div>

          {/* Summary & checkout */}
          {cart.length > 0 && (
            <div style={{ borderTop: `1px solid ${T.border}`, padding: '16px 20px', background: T.surface }}>
              {/* Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: T.sub, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Total ({cart.reduce((sum, i) => sum + (parseFloat(i.quantity) || 1), 0)} item)
                </span>
                <span style={{ fontSize: 24, fontWeight: 900, color: T.text, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.02em' }}>
                  {fmt(total)}
                </span>
              </div>

              {/* Action buttons (Tahan & Bayar) */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowHoldModal(true)}
                  title="Tahan nota ini sementara (misal pembeli ambil barang tambahan)"
                  style={{
                    padding: '12px 14px', borderRadius: 12,
                    border: `1px solid ${T.orange}40`, background: T.orange + '15',
                    color: T.orange, fontFamily: 'Syne, sans-serif',
                    fontSize: 12, fontWeight: 800, cursor: 'pointer',
                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = T.orange + '25'}
                  onMouseLeave={e => e.currentTarget.style.background = T.orange + '15'}
                >
                  ⏸ Tahan
                </button>
                <button
                  onClick={() => setShowPayment(true)}
                  style={{
                    flex: 1, padding: '13px 18px',
                    borderRadius: 12, border: 'none',
                    background: T.green,
                    color: '#FFFFFF', fontFamily: 'Syne, sans-serif',
                    fontSize: 14, fontWeight: 800, letterSpacing: '0.02em',
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: `0 4px 14px ${T.green}45`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 18px ${T.green}60`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 14px ${T.green}45`; }}
                >
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="4" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6"/>
                    <path d="M5 4V3a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    <circle cx="8" cy="8.5" r="1.5" fill="currentColor"/>
                  </svg>
                  Bayar Sekarang
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {showPayment && (
        <PaymentModal
          total={total}
          onClose={() => setShowPayment(false)}
          onConfirm={handlePayment}
          loading={loading}
        />
      )}

      {/* WEIGHING MODAL */}
      {weighingProduct && (
        <WeighingModal 
          product={weighingProduct}
          onClose={() => setWeighingProduct(null)}
          onConfirm={(kgQty) => addKgToCartConfirm(weighingProduct, kgQty)}
        />
      )}

      {/* REWEIGH MODAL (Update Qty Kg di Keranjang) */}
      {reweighItem && (
        <WeighingModal 
          product={reweighItem.product}
          onClose={() => setReweighItem(null)}
          onConfirm={(kgQty) => {
            const kgVal = parseFloat(kgQty);
            if (isNaN(kgVal) || kgVal <= 0) {
              if (kgVal === 0) removeFromCart(reweighItem.itemId);
              else showToast('error', 'Jumlah harus lebih besar dari 0.');
              setReweighItem(null);
              return;
            }
            const cleanKg = Math.round(kgVal * 1000) / 1000;
            if (!ignoreStock) {
              const otherKg = calcCartKg(reweighItem.product.id, reweighItem.itemId);
              if (cleanKg + otherKg > (reweighItem.product.stock_kg || 0)) {
                 showToast('error', `Stok Kg tidak mencukupi! Tersisa: ${reweighItem.product.stock_kg || 0} Kg`);
                 return;
              }
            }
            setCart(cart.map(i => i.id === reweighItem.itemId ? { ...i, quantity: cleanKg, subtotal: Math.round(cleanKg * i.price) } : i));
            setReweighItem(null);
          }}
        />
      )}

      {/* MODAL TAHAN NOTA */}
      {showHoldModal && (
        <HoldCartModal
          itemCount={cart.length}
          total={total}
          onClose={() => setShowHoldModal(false)}
          onConfirm={handleHoldCart}
        />
      )}

      {/* MODAL DAFTAR NOTA TERTAHAN */}
      {showHeldListModal && (
        <HeldCartsListModal
          heldCarts={heldCarts}
          onClose={() => setShowHeldListModal(false)}
          onRestore={handleRestoreHeldCart}
          onDelete={handleDeleteHeldCart}
        />
      )}

      {/* ─── MODAL BUKA SHIFT KASIR ─── */}
      {showOpenShiftModal && (
        <OpenShiftModal
          onClose={() => setShowOpenShiftModal(false)}
          onSuccess={async () => {
            setShowOpenShiftModal(false);
            const s = await checkShift();
            showToast('success', `Shift kasir #${s?.id || ''} berhasil dibuka! Selamat bertugas.`);
          }}
        />
      )}

      {/* ─── MODAL KAS MASUK / KELUAR LACI ─── */}
      {showMovementModal && activeShift && (
        <CashMovementModal
          shiftId={activeShift.id}
          initialType={movementType}
          onClose={() => setShowMovementModal(false)}
          onSuccess={async () => {
            setShowMovementModal(false);
            await checkShift();
            showToast('success', 'Catatan mutasi uang kas berhasil disimpan!');
          }}
        />
      )}

      {/* ─── MODAL TUTUP KASIR & HITUNG LACI ─── */}
      {showCloseShiftModal && activeShift && (
        <CloseShiftModal
          shift={activeShift}
          movements={shiftMovements}
          onClose={() => setShowCloseShiftModal(false)}
          onSuccess={async (closedData) => {
            setShowCloseShiftModal(false);
            setActiveShift(null);
            setCart([]);
            showToast('success', 'Shift kasir resmi ditutup & laporan tersimpan!');
            if (closedData?.autoPrint) {
              try {
                const store = await getStoreProfile();
                printShiftReceipt(closedData.shift, closedData.summary, shiftMovements, store);
              } catch (printErr) {
                console.error("Gagal cetak rekap shift:", printErr);
              }
            }
            await checkShift();
          }}
        />
      )}

      {/* ─── MODAL BATALKAN PEMBUKAAN SHIFT ─── */}
      {showCancelShiftModal && activeShift && (
        <CancelShiftModal
          shift={activeShift}
          onClose={() => setShowCancelShiftModal(false)}
          onSuccess={async () => {
            setShowCancelShiftModal(false);
            setActiveShift(null);
            setCart([]);
            showToast('info', 'Pembukaan shift kasir dibatalkan. Meja kasir kembali terkunci.');
            await checkShift();
          }}
        />
      )}
    </>
  );
}

export default Cashier;

