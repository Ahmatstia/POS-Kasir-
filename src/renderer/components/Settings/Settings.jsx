import React, { useState, useEffect } from "react";
import { getSetting, updateSetting } from "../../services/settings";
import { T } from "../../theme";
import { useToast } from "../Toast";
import ActivityLogs from "../Security/ActivityLogs";
import { logActivity, AUDIT_ACTIONS } from "../../services/audit";

function Settings() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('general'); // 'general' or 'security'
  const [ignoreStock, setIgnoreStock] = useState(false);
  const [hideCost, setHideCost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    (async () => {
      const isIg = await getSetting('ignore_stock', '0');
      const isHi = await getSetting('hide_cost', '0');
      setIgnoreStock(isIg === '1');
      setHideCost(isHi === '1');
      setLoading(false);
    })();
  }, []);

  const handleToggleIgnore = async () => {
    const newVal = !ignoreStock;
    setIgnoreStock(newVal);
    const res = await updateSetting('ignore_stock', newVal ? '1' : '0');
    if (res.success) {
      showToast('success', `Mode Abaikan Stok ${newVal ? 'diaktifkan' : 'dinonaktifkan'}`);
    } else {
      showToast('error', 'Gagal update pengaturan');
      setIgnoreStock(ignoreStock); // rollback on error
    }
  };

  const handleTogglePrivacy = async () => {
    const newVal = !hideCost;
    setHideCost(newVal);
    const res = await updateSetting('hide_cost', newVal ? '1' : '0');
    if (res.success) {
      showToast('success', `Mode Privasi ${newVal ? 'diaktifkan' : 'dinonaktifkan'}`);
    } else {
      showToast('error', 'Gagal update pengaturan');
      setHideCost(hideCost); // rollback on error
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const res = await window.electronAPI.invoke("db:backup");
      if (res.success) {
        showToast('success', '✅ Database berhasil diamankan ke folder "backups"');
        logActivity(AUDIT_ACTIONS.MANUAL_BACKUP, "Security", "Created manual database backup");
      } else {
        showToast('error', 'Gagal membuat backup: ' + res.error);
      }
    } catch (e) {
      showToast('error', 'Terjadi kesalahan sistem');
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 26px;
        }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background-color: ${T.border2};
          transition: .3s;
          border-radius: 34px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
        }
        input:checked + .slider { background-color: ${T.accent}; }
        input:checked + .slider:before { transform: translateX(24px); }
      `}</style>

      <div style={{ animation: 'fadeUp 0.4s ease both', fontFamily: 'Syne, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Konfigurasi Aplikasi</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Pengaturan</h2>
          </div>
          <div style={{ display: 'flex', background: T.surface, padding: 4, borderRadius: 12, border: `1px solid ${T.border}` }}>
            <button onClick={() => setActiveTab('general')} style={{ 
              padding: '8px 16px', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: activeTab === 'general' ? T.accent : 'transparent', color: activeTab === 'general' ? '#fff' : T.sub,
              transition: 'all 0.2s'
            }}>Umum</button>
            <button onClick={() => setActiveTab('security')} style={{ 
              padding: '8px 16px', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: activeTab === 'security' ? T.accent : 'transparent', color: activeTab === 'security' ? '#fff' : T.sub,
              transition: 'all 0.2s'
            }}>Database & Keamanan</button>
          </div>
        </div>

        {activeTab === 'general' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 1000, animation: 'fadeUp 0.3s ease' }}>
            {/* Abaikan Stok Toggle */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 4 }}>Mode Abaikan Stok (Unlimited)</p>
                  <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.5 }}>
                    Jika dinyalakan, kasir bisa melakukan transaksi meskipun stok kosong (Unlimited).
                  </p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={ignoreStock} onChange={handleToggleIgnore} disabled={loading} />
                  <span className="slider"></span>
                </label>
              </div>

              <div style={{ 
                marginTop: 20, padding: 16, borderRadius: 14, 
                background: ignoreStock ? T.accent + '0A' : T.green + '0A',
                border: `1px solid ${ignoreStock ? T.accent + '25' : T.green + '25'}`,
                display: 'flex', gap: 12, alignItems: 'flex-start'
              }}>
                <div style={{ 
                  width: 32, height: 32, borderRadius: 8, 
                  background: ignoreStock ? T.accent + '15' : T.green + '15',
                  color: ignoreStock ? T.accent : T.green,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 12V9M9 6h.01M16 9A7 7 0 112 9a7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: ignoreStock ? T.accent : T.green, marginBottom: 4 }}>
                    Status: {ignoreStock ? 'Mode Abaikan Stok Aktif' : 'Mode Validasi Stok Aktif'}
                  </p>
                  <p style={{ fontSize: 11, color: T.sub, lineHeight: 1.4 }}>
                    {ignoreStock 
                      ? 'Kasir dizinkan menjual produk meskipun stok di sistem Nol.' 
                      : 'Aplikasi akan memvalidasi sisa stok saat transaksi.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy Mode Toggle */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 4 }}>Mode Privasi (Sembunyikan Modal)</p>
                  <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.5 }}>
                    Sembunyikan Harga Beli, Modal, dan Laba dari layar Kasir & Laporan.
                  </p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={hideCost} onChange={handleTogglePrivacy} disabled={loading} />
                  <span className="slider"></span>
                </label>
              </div>

              <div style={{ 
                marginTop: 20, padding: 16, borderRadius: 14, 
                background: hideCost ? T.red + '0A' : T.green + '0A',
                border: `1px solid ${hideCost ? T.red + '25' : T.green + '25'}`,
                display: 'flex', gap: 12, alignItems: 'flex-start'
              }}>
                <div style={{ 
                  width: 32, height: 32, borderRadius: 8, 
                  background: hideCost ? T.red + '15' : T.green + '15',
                  color: hideCost ? T.red : T.green,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: hideCost ? T.red : T.green, marginBottom: 4 }}>
                    Status: {hideCost ? 'Mode Privasi Aktif' : 'Mode Transparan Aktif'}
                  </p>
                  <p style={{ fontSize: 11, color: T.sub, lineHeight: 1.4 }}>
                    {hideCost 
                      ? 'Data modal & keuntungan tidak tampil di layar.' 
                      : 'Semua data keuangan (modal & laba) dapat dilihat di laporan.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
             {/* Security Controls */}
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 30 }}>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                   <div style={{ width: 60, height: 60, borderRadius: '50%', background: T.purple + '10', color: T.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                   </div>
                   <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Cadangan Database</h3>
                   <p style={{ fontSize: 12, color: T.sub, marginBottom: 20, lineHeight: 1.5 }}>Simpan salinan data Anda sekarang untuk menjaga keamanan informasi toko.</p>
                   <button 
                    onClick={handleBackup} disabled={backingUp}
                    style={{ 
                      width: '100%', padding: '14px', borderRadius: 14, background: backingUp ? T.border2 : T.purple, color: '#fff', 
                      fontSize: 13, fontWeight: 800, border: 'none', cursor: backingUp ? 'wait' : 'pointer',
                      boxShadow: backingUp ? 'none' : `0 8px 20px ${T.purple}40`, transition: '0.2s'
                    }}>
                      {backingUp ? 'Proses Backup...' : 'Backup Sekarang (Manual)'}
                   </button>
                </div>

                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 24, display: 'flex', gap: 20, alignItems: 'center' }}>
                   <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Keamanan Audit</h3>
                      <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.6 }}>System Audit Trail akan mencatat setiap tindakan penting seperti penghapusan transaksi dan perubahan stok. Ini membantu Anda melacak jika ada ketidaksesuaian data.</p>
                      <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                         <div style={{ padding: '6px 12px', borderRadius: 8, background: T.bg, border: `1px solid ${T.border2}`, fontSize: 11, color: T.sub }}>Status: <b>AKTIF</b></div>
                         <div style={{ padding: '6px 12px', borderRadius: 8, background: T.bg, border: `1px solid ${T.border2}`, fontSize: 11, color: T.sub }}>Rotasi: <b>5 File</b></div>
                      </div>
                   </div>
                   <div style={{ width: 120, height: 120, opacity: 0.1, color: T.accent }}>
                      <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                   </div>
                </div>
             </div>

             {/* Activity Logs Component */}
             <ActivityLogs />
          </div>
        )}
      </div>
    </>
  );
}

export default Settings;
