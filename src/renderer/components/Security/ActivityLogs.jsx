import React, { useState, useEffect } from "react";
import { getActivityLogs } from "../../services/audit";
import { T } from "../../theme";

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getActionColor = (action) => {
  if (action?.includes('DELETE')) return T.red;
  if (action?.includes('CANCEL')) return T.orange;
  if (action?.includes('CREATE') || action?.includes('ADD')) return T.green;
  if (action?.includes('UPDATE') || action?.includes('ADJUST')) return T.blue;
  if (action?.includes('BACKUP')) return T.purple;
  return T.sub;
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const data = await getActivityLogs(200);
    setLogs(data);
    setLoading(false);
  };

  return (
    <div style={{ animation: 'fadeUp 0.4s ease both' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .log-row:hover { background: ${T.border}40 !important; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Keamanan & Audit</p>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.01em' }}>Log Aktivitas</h2>
        </div>
        <button 
          onClick={loadLogs}
          style={{ 
            padding: '10px 18px', borderRadius: 12, border: `1px solid ${T.border2}`, 
            background: T.surface, color: T.text, fontSize: 12, fontWeight: 700, 
            cursor: 'pointer', fontFamily: 'Syne, sans-serif', display: 'flex', alignItems: 'center', gap: 8 
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: T.muted }}>Memuat log...</div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20 }}>
          <p style={{ fontWeight: 700, color: T.muted }}>Belum ada aktivitas yang tercatat</p>
        </div>
      ) : (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                {['Waktu', 'Aksi', 'Modul', 'Detail', 'User'].map(h => (
                  <th key={h} style={{ padding: '14px 20px', fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="log-row" style={{ borderBottom: `1px solid ${T.border}`, transition: '0.2s' }}>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: T.sub, fontFamily: 'JetBrains Mono, monospace' }}>{formatDate(log.created_at)}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ 
                      fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 6,
                      background: getActionColor(log.action) + '15',
                      color: getActionColor(log.action),
                      border: `1px solid ${getActionColor(log.action)}30`
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, color: T.text }}>{log.module}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: T.sub }}>{log.details}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: T.accent }}>{log.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
