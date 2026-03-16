import React, { useState, useEffect } from "react";
import { getSetting, updateSetting } from "../../services/settings";
import { T } from "../../theme";
import { useToast } from "../Toast";

function Settings() {
  const { showToast } = useToast();
  const [ignoreStock, setIgnoreStock] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const val = await getSetting('ignore_stock', '0');
      setIgnoreStock(val === '1');
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

        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 24, maxWidth: 600 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 4 }}>Mode Abaikan Stok (Unlimited)</p>
              <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.5 }}>
                Jika dinyalakan, kasir bisa melakukan transaksi meskipun stok kosong (Unlimited). Cocok untuk toko yang tidak mencatat stok masuk.
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
                Status: {ignoreStock ? 'Mode Abaikan Stok Aktif (Bebas)' : 'Mode Validasi Stok Aktif (Ketat)'}
              </p>
              <p style={{ fontSize: 11, color: T.sub, lineHeight: 1.4 }}>
                {ignoreStock 
                  ? 'Kasir dizinkan menjual produk meskipun stok di sistem Nol. Laporan laba dihitung dari estimasi Harga Beli di data produk.' 
                  : 'Sistem akan memvalidasi sisa stok saat transaksi. Anda tidak bisa menjual barang yang stoknya sudah habis di sistem.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Settings;
