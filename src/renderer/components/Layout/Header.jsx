import React from 'react';
import { T } from '../../theme';
import { MenuIcon } from '../Icons/AppIcons';

function Header({ currentPageLabel, sidebarOpen, setSidebarOpen }) {
  return (
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
          <MenuIcon />
        </button>
        <div>
          <p style={{ fontSize: 15, fontWeight: 800, color: T.text }}>
            {currentPageLabel}
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
  );
}

export default Header;
