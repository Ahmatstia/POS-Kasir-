import React, { useState, useEffect } from "react";
import { getSetting, updateSetting } from "../../services/settings";
import { T } from "../../theme";
import { useToast } from "../Toast";

function Settings() {
  const { showToast } = useToast();
  const [ignoreStock, setIgnoreStock] = useState(false);
  const [hideCost, setHideCost] = useState(false);
  const [loading, setLoading] = useState(true);

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
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Konfigurasi Aplikasi</p>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Pengaturan</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 1000 }}>
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
      </div>
    </>
  );
}

export default Settings;
