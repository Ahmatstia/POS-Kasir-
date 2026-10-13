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
      </div>
    </header>
  );
}

export default Header;
