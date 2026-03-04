import React from 'react';
import { T } from '../../theme';
import { NAV } from '../../constants/navigation';
import { LogoIcon, ChevronLeftIcon } from '../Icons/AppIcons';

function Sidebar({ currentPage, setCurrentPage, sidebarOpen, setSidebarOpen }) {
  const sidebarW = sidebarOpen ? 240 : 68;

  return (
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
          <LogoIcon />
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
          <ChevronLeftIcon style={{
            flexShrink: 0,
            transform: sidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.25s ease',
          }} />
          {sidebarOpen && <span>Tutup Sidebar</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
