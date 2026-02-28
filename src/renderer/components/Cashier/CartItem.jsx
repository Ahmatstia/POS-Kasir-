import React from "react";

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
  purple:  '#A78BFA',
};

const UNIT_COLORS = {
  pcs:  T.blue,
  pack: T.green,
  kg:   T.purple,
};

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

function CartItem({ item, onUpdateQuantity, onRemove }) {
  const unitColor = UNIT_COLORS[item.unit] || T.sub;
  const isMinQty  = item.quantity <= 1;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

        .cart-item-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          margin-bottom: 6px;
          background: ${T.card};
          border: 1px solid ${T.border};
          font-family: 'Syne', sans-serif;
          transition: border-color 0.15s;
        }
        .cart-item-row:hover {
          border-color: ${T.border2};
        }

        .qty-btn {
          width: 26px; height: 26px;
          border-radius: 7px;
          border: 1px solid ${T.border2};
          background: transparent;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; font-weight: 700;
          font-family: 'Syne', sans-serif;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .qty-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .qty-btn.minus { color: ${T.sub}; }
        .qty-btn.minus:not(:disabled):hover {
          background: ${T.border2};
          color: ${T.text};
        }
        .qty-btn.plus { color: ${T.green}; border-color: ${T.green}40; }
        .qty-btn.plus:hover {
          background: ${T.green}18;
        }

        .remove-btn {
          width: 28px; height: 28px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          color: ${T.muted};
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .remove-btn:hover {
          background: ${T.red}12;
          border-color: ${T.red}30;
          color: ${T.red};
        }
      `}</style>

      <div className="cart-item-row">

        {/* Unit badge */}
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: unitColor + '14',
          border: `1px solid ${unitColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 800, color: unitColor,
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          {item.unit}
        </div>

        {/* Name & price */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 12, fontWeight: 700, color: T.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            marginBottom: 2,
          }}>
            {item.name}
          </p>
          <p style={{ fontSize: 10, color: T.sub, fontFamily: 'JetBrains Mono, monospace' }}>
            {fmt(item.price)} <span style={{ color: T.muted }}>/ {item.unit}</span>
          </p>
        </div>

        {/* Qty controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            className="qty-btn minus"
            disabled={isMinQty}
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1, item.unit)}
            aria-label="Kurangi"
          >
            −
          </button>

          <span style={{
            minWidth: 24, textAlign: 'center',
            fontSize: 13, fontWeight: 800, color: T.text,
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {item.quantity}
          </span>

          <button
            className="qty-btn plus"
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1, item.unit)}
            aria-label="Tambah"
          >
            +
          </button>
        </div>

        {/* Subtotal */}
        <div style={{
          minWidth: 84, textAlign: 'right', flexShrink: 0,
          fontSize: 12, fontWeight: 800, color: T.text,
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {fmt(item.subtotal)}
        </div>

        {/* Remove */}
        <button
          className="remove-btn"
          onClick={() => onRemove(item.id)}
          aria-label="Hapus item"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 012 0v1M6 6v4M8 6v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <rect x="3" y="3.5" width="8" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        </button>

      </div>
    </>
  );
}

export default CartItem;