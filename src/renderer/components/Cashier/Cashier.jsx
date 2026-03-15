import React, { useState, useEffect, useRef, useCallback } from "react";
import { getProducts } from "../../services/database";
import { createTransaction } from "../../services/transactions";
import CartItem from "./CartItem";
import PaymentModal from "./PaymentModal";
import { useToast } from "../Toast";
import { T } from "../../theme";

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
    let v = parseFloat(nominalVal) || 0;
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
                <input type="number" min="0" value={nominalVal} onChange={e => setNominalVal(e.target.value)} placeholder="10000" style={{...inputStyle, paddingLeft: 40}} autoFocus />
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

// ─── PRODUCT ITEM ─────────────────────────────────────────────────────────────
function ProductItem({ product, addToCart, addManualToCart, isLast, lastRef }) {
  const [showManual, setShowManual] = useState(false);
  const [manualPrice, setManualPrice] = useState('');
  const [manualQty, setManualQty]   = useState(1);
  const [manualUnit, setManualUnit] = useState('pcs');

  // Tentukan status stok berdasarkan unit jual
  const isKgProduct = product.sell_per_unit === 'kg';
  const currentStock = isKgProduct ? (product.stock_kg || 0) : (product.stock || 0);
  const minStock     = isKgProduct ? (product.min_stock_kg || 0) : (product.min_stock || 0);
  const outOfStock = currentStock <= 0;
  const lowStock   = !outOfStock && currentStock <= minStock;

  const handleManualAdd = () => {
    const price = parseFloat(manualPrice);
    const qty   = parseFloat(manualQty);
    if (isNaN(price) || price <= 0 || isNaN(qty) || qty <= 0) return;
    addManualToCart(product, { price, quantity: qty, unit: manualUnit });
    setShowManual(false);
    setManualPrice('');
    setManualQty(1);
  };

  const availableUnits = UNITS.filter(u => {
    if (product.sell_per_unit === 'all') {
      return u.key !== 'kg' && u.key !== 'karung' && product[u.priceKey] > 0;
    }
    if (product.sell_per_unit === 'kg') {
      if (u.key === 'kg') return product[u.priceKey] > 0;
      if (u.key === 'karung') return product[u.priceKey] > 0;
      return false;
    }
    return product.sell_per_unit === u.key && product[u.priceKey] > 0;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
          <p style={{
            fontSize: 13, fontWeight: 700, color: outOfStock ? T.muted : T.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            marginBottom: 4,
          }}>
            {product.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
              color: outOfStock ? T.red : lowStock ? T.accent : T.green,
            }}>
            {outOfStock ? 'HABIS' : `${currentStock}${isKgProduct ? ' kg' : ' stok'}`}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
              padding: '1px 7px', borderRadius: 100,
              background: T.border2, color: T.sub,
            }}>
              {product.sell_per_unit || 'all'}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowManual(v => !v)}
          style={{
            padding: '4px 10px', borderRadius: 7, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
            transition: 'all 0.15s',
            border: showManual ? `1px solid ${T.red}40`   : `1px solid ${T.border2}`,
            background: showManual ? T.red + '12'          : T.border,
            color:      showManual ? T.red                 : T.sub,
            flexShrink: 0,
          }}
        >
          {showManual ? '✕ Batal' : 'Harga Kustom'}
        </button>
      </div>

      {/* Unit buttons */}
      {!showManual && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {availableUnits.map(u => (
            <button
              key={u.key}
              disabled={outOfStock}
              onClick={() => addToCart(product, u.key)}
              style={{
                padding: '5px 12px', borderRadius: 8,
                fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                cursor: outOfStock ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                border: `1px solid ${outOfStock ? T.border2 : u.color + '40'}`,
                background: outOfStock ? T.border : u.color + '12',
                color: outOfStock ? T.muted : u.color,
                opacity: outOfStock ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!outOfStock) e.currentTarget.style.background = u.color + '25'; }}
              onMouseLeave={e => { if (!outOfStock) e.currentTarget.style.background = u.color + '12'; }}
            >
              {u.label} · {fmt(product[u.priceKey])}
            </button>
          ))}

          {availableUnits.length === 0 && !outOfStock && (
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
                type="number"
                min="0"
                placeholder="0"
                value={manualPrice}
                onChange={e => setManualPrice(e.target.value)}
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
              Subtotal: <span style={{ color: T.accent, fontWeight: 700 }}>{fmt(parseFloat(manualPrice || 0) * parseFloat(manualQty || 0))}</span>
            </div>
          )}

          <button
            onClick={handleManualAdd}
            disabled={!manualPrice || parseFloat(manualPrice) <= 0}
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
          onClick={() => (item.quantity <= 1 && item.unit !== 'kg') ? onRemove(item.id) : onUpdate(item.id, item.quantity - 1)}
          style={qtyBtnStyle((item.quantity <= 1 && item.unit !== 'kg') ? T.red : T.border2, (item.quantity <= 1 && item.unit !== 'kg') ? T.red : T.sub)}
        >
          {(item.quantity <= 1 && item.unit !== 'kg') ? '×' : '−'}
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
function Cashier() {
  const { showToast } = useToast();

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
  // "Kosongkan" two-step confirm
  const [confirmClear, setConfirmClear]             = useState(false);
  const ITEMS_PER_PAGE = 30;

  const observer = useRef();
  const lastProductRef = useCallback((node) => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) loadMoreProducts();
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore]);

  useEffect(() => { loadProducts(); }, []);

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
    const u = UNITS.find(x => x.key === unit);
    const price = product[u.priceKey];
    if (!price || price <= 0) return;

    // Use Weighing Scale Modal for KG products
    if (unit === 'kg') {
      setWeighingProduct(product);
      return;
    }

    if (unit === 'karung') {
       const kgPerKarung = product.kg_per_karung || 25;
       const currentKgInCart = calcCartKg(product.id);
       if (currentKgInCart + kgPerKarung > (product.stock_kg || 0)) {
          showToast('error', `Stok Kg tidak mencukupi! Tersisa: ${product.stock_kg || 0} Kg (di keranjang: ${currentKgInCart.toFixed(2)} Kg)`);
          return;
       }
    } else if (unit !== 'kg') {
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
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * price }
          : item
      ));
    } else {
      setCart([...cart, {
        id: Date.now() + Math.random(),
        product_id: product.id,
        name: product.name,
        unit, price,
        quantity: 1,
        subtotal: price * 1,
      }]);
    }
  };

  const addKgToCartConfirm = (product, kgQty) => {
    const currentKgInCart = calcCartKg(product.id);
    if (currentKgInCart + kgQty > (product.stock_kg || 0)) {
       showToast('error', `Stok Kg tidak mencukupi! Tersisa: ${product.stock_kg || 0} Kg (di keranjang: ${currentKgInCart} Kg)`);
       return;
    }
    
    setCart([...cart, {
       id: Date.now() + Math.random(),
       product_id: product.id,
       name: product.name,
       unit: 'kg', price: product.price_kg,
       quantity: kgQty,
       subtotal: product.price_kg * kgQty,
    }]);
    setWeighingProduct(null);
  };

  const addManualToCart = (product, { price, quantity, unit }) => {
    // Check Kg vs Pcs
    if (unit === 'kg') {
      const currentKgInCart = calcCartKg(product.id);
      if (currentKgInCart + parseFloat(quantity) > (product.stock_kg || 0)) {
        showToast('error', `Stok Kg tidak mencukupi! Tersisa: ${product.stock_kg || 0} Kg (di keranjang: ${currentKgInCart} Kg)`);
        return;
      }
    } else {
      const pp = product.pcs_per_pack || 1;
      const pd = product.pack_per_dus || 1;
      let pcsNeeded = quantity;
      if (unit === 'pack') pcsNeeded = quantity * pp;
      else if (unit === 'dus')  pcsNeeded = quantity * pd * pp;

      const currentPcsInCart = calcCartPcs(product.id);
      if (currentPcsInCart + pcsNeeded > (product.stock || 0)) {
        showToast('error', `Stok tidak mencukupi! Tersisa: ${product.stock || 0} Pcs (di keranjang: ${currentPcsInCart} Pcs)`);
        return;
      }
    }

    setCart([...cart, {
      id: 'manual-' + Date.now() + Math.random(),
      product_id: product.id,
      name: `${product.name} ✎`,
      unit, price, quantity,
      subtotal: price * quantity,
    }]);
    // Do NOT reset searchTerm
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

    const product = allProducts.find(p => p.id === item.product_id);
    if (product) {
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

    setCart(cart.map(i => i.id === itemId ? { ...i, quantity: newQty, subtotal: newQty * i.price } : i));
  };

  const removeFromCart = (itemId) => setCart(cart.filter(item => item.id !== itemId));
  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const handlePayment = async (paymentData) => {
    setLoading(true);
    const result = await createTransaction({
      items: cart, subtotal: total, discount: 0, total,
      payment: paymentData.payment, change: paymentData.change,
      paymentMethod: paymentData.method, customerName: '', notes: '',
    });
    if (result.success) {
      setCart([]);
      setShowPayment(false);
      // Refresh product list to show updated stock
      loadProducts();
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

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 420px',
        gap: 16, height: 'calc(100vh - 140px)',
        fontFamily: 'Syne, sans-serif',
        animation: 'fadeUp 0.4s ease both',
      }}>

        {/* ── LEFT: PRODUCT LIST ── */}
        <div style={{
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 2 }}>
                  Daftar Produk
                </p>
                <p style={{ fontSize: 12, color: T.sub, fontFamily: 'JetBrains Mono, monospace' }}>
                  {displayedProducts.length}
                  <span style={{ color: T.muted }}> / {allProducts.length}</span>
                  {searchTerm && <span style={{ color: T.accent }}> · "{searchTerm}"</span>}
                </p>
              </div>
              <div style={{
                padding: '4px 12px', borderRadius: 100,
                background: T.blue + '12', border: `1px solid ${T.blue}30`,
                fontSize: 10, fontWeight: 700, color: T.blue, letterSpacing: '0.06em',
              }}>
                {allProducts.filter(p => p.sell_per_unit === 'kg' ? (p.stock_kg || 0) > 0 : (p.stock || 0) > 0).length} TERSEDIA
              </div>
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke={T.sub} strokeWidth="1.5"/>
                <path d="M9.5 9.5L12 12" stroke={T.sub} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
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
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" opacity="0.3">
                  <circle cx="16" cy="16" r="10" stroke={T.sub} strokeWidth="2"/>
                  <path d="M24 24L30 30" stroke={T.sub} strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 16h8M16 12v8" stroke={T.sub} strokeWidth="2" strokeLinecap="round"/>
                </svg>
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
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>
                Keranjang
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {cart.length > 0 && !confirmClear && (
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
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity="0.2">
                  <path d="M8 8h4l5 22h18l4-14H14" stroke={T.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="20" cy="36" r="2" fill={T.sub}/>
                  <circle cx="34" cy="36" r="2" fill={T.sub}/>
                </svg>
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
            <div style={{ borderTop: `1px solid ${T.border}`, padding: '16px 20px' }}>
              {/* Item count breakdown */}
              <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: T.sub, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: 8 }}>
                      {item.name} ×{item.quantity}
                    </span>
                    <span style={{ fontSize: 11, color: T.sub, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                      {fmt(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: T.border, marginBottom: 12 }} />

              {/* Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.sub, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: T.text, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.02em' }}>
                  {fmt(total)}
                </span>
              </div>

              {/* Checkout button */}
              <button
                onClick={() => setShowPayment(true)}
                style={{
                  width: '100%', padding: '12px',
                  borderRadius: 12, border: `1px solid ${T.green}40`,
                  background: T.green + '18',
                  color: T.green, fontFamily: 'Syne, sans-serif',
                  fontSize: 13, fontWeight: 800, letterSpacing: '0.04em',
                  cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = T.green + '28'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.green + '18'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="4" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5 4V3a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="8" cy="8.5" r="1.5" fill="currentColor"/>
                </svg>
                Proses Pembayaran
              </button>
            </div>
          )}
        </div>
      </div>

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
            const otherKg = calcCartKg(reweighItem.product.id, reweighItem.itemId);
            if (kgVal + otherKg > (reweighItem.product.stock_kg || 0)) {
               showToast('error', `Stok Kg tidak mencukupi! Tersisa: ${reweighItem.product.stock_kg || 0} Kg`);
               return;
            }
            setCart(cart.map(i => i.id === reweighItem.itemId ? { ...i, quantity: kgVal, subtotal: kgVal * i.price } : i));
            setReweighItem(null);
          }}
        />
      )}
    </>
  );
}

export default Cashier;