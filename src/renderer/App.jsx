import React, { useState } from 'react';
import { ToastProvider } from './components/Toast';
import ProductList from './components/Products/ProductList';
import Cashier from './components/Cashier/Cashier';
import Transactions from './components/Transactions/Transactions';
import Dashboard from './components/Dashboard/Dashboard';
import Reports from './components/Reports/Reports';
import CategoryList from './components/Categories/CategoryList';
import InventoryList from './components/Inventory/InventoryList';
import { T } from './theme';

// ─── NAV ITEMS ────────────────────────────────────────────────────────────────
const NAV = [
  {
    id: 'dashboard', label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="2" fill="currentColor" opacity="0.9"/>
        <rect x="11" y="2" width="7" height="7" rx="2" fill="currentColor" opacity="0.5"/>
        <rect x="2" y="11" width="7" height="7" rx="2" fill="currentColor" opacity="0.5"/>
        <rect x="11" y="11" width="7" height="7" rx="2" fill="currentColor" opacity="0.9"/>
      </svg>
    ),
  },
  {
    id: 'cashier', label: 'Kasir',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="4" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M6 10h8M10 7v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'products', label: 'Produk',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6"/>
        <rect x="11" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6"/>
        <rect x="2" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6"/>
        <rect x="11" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6"/>
      </svg>
    ),
  },
  {
    id: 'inventory', label: 'Inventori',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="8" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M5 8V6a5 5 0 0110 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M7 13h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'transactions', label: 'Transaksi',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 5h14M3 10h10M3 15h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'reports', label: 'Laporan',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 16 L7 10 L10 12 L14 6 L17 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'categories', label: 'Kategori',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 5h6l2 2H17v10H3V5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sidebarW = sidebarOpen ? 240 : 68;

  return (
    <ToastProvider>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: ${T.bg};
          color: ${T.text};
          font-family: 'Syne', sans-serif;
          min-height: 100vh;
          overflow: hidden;
        }

        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 5px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.muted}; }

        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin    { to { transform: rotate(360deg); } }

        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: ${T.sidebarText};
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          overflow: hidden;
          text-align: left;
        }
        .sidebar-item:hover {
          background: ${T.sidebarHover};
          color: #FFFFFF;
        }
        .sidebar-item.active {
          background: ${T.sidebarActive};
          color: #FFFFFF;
          font-weight: 700;
          box-shadow: 0 2px 8px ${T.accent}40;
        }

        .page-content {
          animation: fadeIn 0.25s ease both;
        }

        .toggle-btn {
          width: 32px; height: 32px;
          border-radius: 8px;
          border: 1px solid ${T.border};
          background: ${T.surface};
          color: ${T.sub};
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .toggle-btn:hover {
          background: ${T.bg};
          color: ${T.text};
          border-color: ${T.accent};
        }
      `}</style>

      <div style={{ display: 'flex', height: '100vh', background: T.bg }}>

        {/* ── SIDEBAR ── */}
        <aside style={{
          width: sidebarW,
          minWidth: sidebarW,
          background: T.sidebarBg,
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 20,
        }}>
          {/* Logo area */}
          <div style={{
            padding: sidebarOpen ? '20px 18px 16px' : '20px 14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderBottom: `1px solid ${T.sidebarHover}`,
            minHeight: 68,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: T.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="2" width="6" height="6" rx="2" fill="#FFFFFF"/>
                <rect x="10" y="2" width="6" height="6" rx="2" fill="#FFFFFF" opacity="0.6"/>
                <rect x="2" y="10" width="6" height="6" rx="2" fill="#FFFFFF" opacity="0.6"/>
                <rect x="10" y="10" width="6" height="6" rx="2" fill="#FFFFFF"/>
              </svg>
            </div>
            {sidebarOpen && (
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                  Toko Bumbu
                </p>
                <p style={{ fontSize: 9, color: T.sidebarText, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', fontWeight: 600 }}>
                  POS SYSTEM
                </p>
              </div>
            )}
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
            {NAV.map((item) => (
              <button
                key={item.id}
                className={`sidebar-item ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => setCurrentPage(item.id)}
                title={!sidebarOpen ? item.label : undefined}
                style={{
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  padding: sidebarOpen ? '10px 14px' : '10px 0',
                }}
              >
                <span style={{ flexShrink: 0, display: 'flex' }}>{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Bottom: collapse toggle */}
          <div style={{
            padding: '12px 10px 16px',
            borderTop: `1px solid ${T.sidebarHover}`,
          }}>
            <button
              className="sidebar-item"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                padding: sidebarOpen ? '10px 14px' : '10px 0',
                color: T.sidebarText,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{
                flexShrink: 0,
                transform: sidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                transition: 'transform 0.25s ease',
              }}>
                <path d="M13 4L7 10l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {sidebarOpen && <span>Tutup Sidebar</span>}
            </button>
          </div>
        </aside>

        {/* ── MAIN AREA ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Top bar */}
          <header style={{
            height: 56,
            background: T.surface,
            borderBottom: `1px solid ${T.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: T.text }}>
                  {NAV.find(n => n.id === currentPage)?.label}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 12, color: T.sub,
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                {new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 100,
                background: '#DCFCE7', border: '1px solid #BBF7D0',
              }}>
                <div style={{ position: 'relative', width: 7, height: 7 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.green }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: T.green, letterSpacing: '0.06em' }}>ONLINE</span>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            background: T.bg,
          }}>
            <div key={currentPage} className="page-content" style={{ maxWidth: 1400, margin: '0 auto' }}>
              {currentPage === 'dashboard'    && <Dashboard />}
              {currentPage === 'cashier'      && <Cashier />}
              {currentPage === 'products'     && <ProductList />}
              {currentPage === 'transactions' && <Transactions />}
              {currentPage === 'reports'      && <Reports />}
              {currentPage === 'inventory'    && <InventoryList />}
              {currentPage === 'categories'   && <CategoryList />}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;