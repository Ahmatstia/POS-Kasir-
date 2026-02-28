import React, { useState } from 'react';
import ProductList from './components/Products/ProductList';
import Cashier from './components/Cashier/Cashier';
import Transactions from './components/Transactions/Transactions';
import Dashboard from './components/Dashboard/Dashboard';
import Reports from './components/Reports/Reports';

// ─── DESIGN TOKENS (sama persis dengan Dashboard) ─────────────────────────────
const T = {
  bg:      '#0E0F11',
  surface: '#161719',
  border:  '#1F2023',
  border2: '#2A2B2F',
  text:    '#F0EDE6',
  muted:   '#5C5C66',
  sub:     '#9998A3',
  accent:  '#F5A623',
  green:   '#34C98B',
  blue:    '#5B8AF5',
};

// ─── NAV ITEMS ────────────────────────────────────────────────────────────────
const NAV = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9"/>
      </svg>
    ),
  },
  {
    id: 'cashier',
    label: 'Kasir',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M5 8h6M8 6v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'products',
    label: 'Produk',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    id: 'transactions',
    label: 'Transaksi',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'reports',
    label: 'Laporan',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 13 L5 8 L8 10 L11 5 L14 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: ${T.bg};
          color: ${T.text};
          font-family: 'Syne', sans-serif;
          min-height: 100vh;
        }

        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 4px; }

        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }

        .nav-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          color: ${T.sub};
          font-family: 'Syne', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          position: relative;
          text-transform: uppercase;
        }
        .nav-btn:hover {
          color: ${T.text};
          background: ${T.surface};
          border-color: ${T.border2};
        }
        .nav-btn.active {
          color: ${T.accent};
          background: ${T.accent}12;
          border-color: ${T.accent}35;
        }
        .nav-btn.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 2px;
          border-radius: 2px;
          background: ${T.accent};
        }

        .page-content {
          animation: fadeIn 0.3s ease both;
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column' }}>

        {/* ── TOPBAR ── */}
        <header style={{
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
          position: 'sticky',
          top: 0,
          zIndex: 50,
          animation: 'fadeDown 0.4s ease both',
        }}>
          <div style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '0 24px',
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9,
                background: T.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <rect x="1.5" y="1.5" width="5" height="5" rx="1.5" fill="#0E0F11"/>
                  <rect x="8.5" y="1.5" width="5" height="5" rx="1.5" fill="#0E0F11"/>
                  <rect x="1.5" y="8.5" width="5" height="5" rx="1.5" fill="#0E0F11"/>
                  <rect x="8.5" y="8.5" width="5" height="5" rx="1.5" fill="#0E0F11"/>
                </svg>
              </div>
              <div>
                <span style={{ fontSize: 15, fontWeight: 800, color: T.text, letterSpacing: '-0.01em', display: 'block', lineHeight: 1.1 }}>
                  Toko Bumbu
                </span>
                <span style={{ fontSize: 10, color: T.muted, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em' }}>
                  POS SYSTEM
                </span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 28, background: T.border, flexShrink: 0 }} />

            {/* Navigation */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, overflowX: 'auto' }}>
              {NAV.map((item) => (
                <button
                  key={item.id}
                  className={`nav-btn ${currentPage === item.id ? 'active' : ''}`}
                  onClick={() => setCurrentPage(item.id)}
                >
                  <span style={{ opacity: currentPage === item.id ? 1 : 0.7, flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Right side — live indicator */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px',
              borderRadius: 100,
              background: T.green + '12',
              border: `1px solid ${T.green}28`,
              flexShrink: 0,
            }}>
              <div style={{ position: 'relative', width: 7, height: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.green }} />
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: T.green,
                  animation: 'pulse-ring 1.5s ease-out infinite',
                }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.green, letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace' }}>
                LIVE
              </span>
            </div>
          </div>

          {/* Active page breadcrumb strip */}
          <div style={{
            maxWidth: 1280, margin: '0 auto', padding: '0 24px',
            height: 28, display: 'flex', alignItems: 'center', gap: 6,
            borderTop: `1px solid ${T.border}`,
          }}>
            <span style={{ fontSize: 10, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
              /
            </span>
            <span style={{ fontSize: 10, color: T.accent, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
              {NAV.find((n) => n.id === currentPage)?.label.toLowerCase()}
            </span>
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main style={{ flex: 1, maxWidth: 1280, width: '100%', margin: '0 auto', padding: '28px 24px' }}>
          <div key={currentPage} className="page-content">
            {currentPage === 'dashboard'     && <Dashboard />}
            {currentPage === 'cashier'       && <Cashier />}
            {currentPage === 'products'      && <ProductList />}
            {currentPage === 'transactions'  && <Transactions />}
            {currentPage === 'reports'       && <Reports />}
          </div>
        </main>

        {/* ── FOOTER BAR ── */}
        <footer style={{
          borderTop: `1px solid ${T.border}`,
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
            v1.0.0
          </span>
          <span style={{ fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
            {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </footer>

      </div>
    </>
  );
}

export default App;