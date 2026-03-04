import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const T = {
  surface: '#1A1B1E',
  border:  '#2A2B2F',
  text:    '#F0EDE6',
  muted:   '#5C5C66',
  accent:  '#F5A623',
  green:   '#34C98B',
  red:     '#E85858',
  blue:    '#5B8AF5',
};

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

function ToastItem({ id, type, message, onRemove }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // mount → slide in
    const t1 = setTimeout(() => setVisible(true), 10);
    // auto-dismiss
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(id), 350);
    }, 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const config = {
    success: { color: T.green,  icon: '✓', label: 'Berhasil' },
    error:   { color: T.red,    icon: '✕', label: 'Error'    },
    warning: { color: T.accent, icon: '!', label: 'Perhatian' },
    info:    { color: T.blue,   icon: 'i', label: 'Info'      },
  }[type] || { color: T.blue, icon: 'i', label: 'Info' };

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 14px',
        background: T.surface,
        border: `1px solid ${config.color}35`,
        borderLeft: `3px solid ${config.color}`,
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        fontFamily: 'Syne, sans-serif',
        maxWidth: 340,
        width: '100%',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.35s ease',
        willChange: 'transform, opacity',
        cursor: 'default',
      }}
    >
      {/* Icon badge */}
      <div style={{
        width: 24, height: 24, borderRadius: 7, flexShrink: 0,
        background: config.color + '18', border: `1px solid ${config.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, color: config.color,
      }}>
        {config.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: config.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
          {config.label}
        </p>
        <p style={{ fontSize: 12, color: T.text, lineHeight: 1.4 }}>
          {message}
        </p>
      </div>

      {/* Close */}
      <button
        onClick={() => { setVisible(false); setTimeout(() => onRemove(id), 350); }}
        style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
          border: 'none', background: 'transparent', color: T.muted,
          cursor: 'pointer', fontSize: 14, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map(toast => (
          <div key={toast.id} style={{ pointerEvents: 'all' }}>
            <ToastItem
              id={toast.id}
              type={toast.type}
              message={toast.message}
              onRemove={removeToast}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
