import React, { useState, useEffect } from "react";
import { getSetting, updateSetting, getStoreProfile, updateStoreProfile } from "../../services/settings";
import { T } from "../../theme";
import { useToast } from "../Toast";
import ActivityLogs from "../Security/ActivityLogs";
import { logActivity, AUDIT_ACTIONS, clearLogs } from "../../services/audit";
import { SettingsIcon, TrashIcon, CloseIcon, CheckIcon } from "../Icons/AppIcons";
import PageHeader from "../Layout/PageHeader";

function Settings() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('general'); // 'general' or 'security'
  const [ignoreStock, setIgnoreStock] = useState(false);
  const [hideCost, setHideCost] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [savingStore, setSavingStore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    (async () => {
      const [isIg, isHi, profile] = await Promise.all([
        getSetting('ignore_stock', '0'),
        getSetting('hide_cost', '0'),
        getStoreProfile(),
      ]);
      setIgnoreStock(isIg === '1');
      setHideCost(isHi === '1');
      setStoreName(profile.name);
      setStoreAddress(profile.address);
      setStorePhone(profile.phone);
      setReceiptFooter(profile.footer);
      setLoading(false);
    })();
  }, []);

  const handleSaveStoreProfile = async (e) => {
    e.preventDefault();
    setSavingStore(true);
    const res = await updateStoreProfile({
      name: storeName,
      address: storeAddress,
      phone: storePhone,
      footer: receiptFooter,
    });
    setSavingStore(false);
    if (res.success) {
      showToast('success', 'Profil toko & identitas struk berhasil disimpan!');
    } else {
      showToast('error', 'Gagal menyimpan profil toko');
    }
  };

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
      const d = new Date();
      const pad = (n) => n.toString().padStart(2, "0");
      const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
      const filename = `pos-backup-${ts}.db`;

      await logActivity(AUDIT_ACTIONS.MANUAL_BACKUP, "Security", filename);
      const res = await window.electronAPI.invoke("db:backup", ts);
      
      if (res.success) {
        showToast('success', 'Database berhasil diamankan: ' + res.filename);
        setRefreshKey(prev => prev + 1);
      } else {
        showToast('error', 'Gagal membuat backup: ' + res.error);
      }
    } catch (e) {
      showToast('error', 'Terjadi kesalahan sistem');
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = async () => {
    const confirm = window.confirm(
      "Peringatan Penting:\n\n" +
      "Proses ini akan MENGHAPUS SEMUA DATA saat ini dan menggantinya dengan data dari file backup.\n" +
      "Aplikasi akan menutup dan memulai ulang (Restart) otomatis setelah proses selesai.\n\n" +
      "Apakah Anda yakin ingin melanjutkan?"
    );

    if (!confirm) return;

    try {
      const res = await window.electronAPI.restoreDatabase();
      if (!res.success && res.error !== "Dibatalkan") {
        showToast('error', 'Gagal memulihkan database: ' + res.error);
      }
    } catch (e) {
      showToast('error', 'Terjadi kesalahan sistem saat pemulihan');
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
        <PageHeader
          title="Pengaturan Sistem"
          description="Konfigurasi identitas toko, struk kasir, pencadangan database, dan keamanan data"
          actions={
            <div style={{ display: 'flex', background: T.surface, padding: 4, borderRadius: 12, border: `1px solid ${T.border}` }}>
              <button onClick={() => setActiveTab('general')} style={{ 
                padding: '8px 16px', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: activeTab === 'general' ? T.accent : 'transparent', color: activeTab === 'general' ? '#fff' : T.sub,
                transition: 'all 0.15s'
              }}>Toko & Mode Jual</button>
              <button onClick={() => setActiveTab('security')} style={{ 
                padding: '8px 16px', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: activeTab === 'security' ? T.accent : 'transparent', color: activeTab === 'security' ? '#fff' : T.sub,
                transition: 'all 0.15s'
              }}>Cadangan Data & Keamanan</button>
            </div>
          }
        />

        {activeTab === 'general' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1000, animation: 'fadeUp 0.3s ease' }}>
            {/* Store Profile Section */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 24 }}>
              <div style={{ marginBottom: 18 }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 4 }}>Profil & Identitas Struk Toko</p>
                <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.5 }}>
                  Atur nama toko, alamat, dan nomor kontak yang akan dicetak pada kepala struk nota belanja.
                </p>
              </div>

              <form onSubmit={handleSaveStoreProfile} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: 6 }}>
                    Nama Toko
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    placeholder="TOKO PLASTIK & KEMASAN"
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: `1px solid ${T.border2}`, background: T.bg, color: T.text,
                      fontSize: 13, fontFamily: 'Syne, sans-serif', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: 6 }}>
                    Nomor Telepon / WA
                  </label>
                  <input
                    type="text"
                    value={storePhone}
                    onChange={e => setStorePhone(e.target.value)}
                    placeholder="0822-xxxx-xxxx"
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: `1px solid ${T.border2}`, background: T.bg, color: T.text,
                      fontSize: 13, fontFamily: 'Syne, sans-serif', outline: 'none'
                    }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: 6 }}>
                    Alamat Lengkap Toko
                  </label>
                  <input
                    type="text"
                    value={storeAddress}
                    onChange={e => setStoreAddress(e.target.value)}
                    placeholder="Jl. Pasar Baru Blok A No. 12"
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: `1px solid ${T.border2}`, background: T.bg, color: T.text,
                      fontSize: 13, fontFamily: 'Syne, sans-serif', outline: 'none'
                    }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: 6 }}>
                    Pesan Kaki Struk (Penutup Nota)
                  </label>
                  <input
                    type="text"
                    value={receiptFooter}
                    onChange={e => setReceiptFooter(e.target.value)}
                    placeholder="Terima Kasih Atas Kunjungan Anda"
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: `1px solid ${T.border2}`, background: T.bg, color: T.text,
                      fontSize: 13, fontFamily: 'Syne, sans-serif', outline: 'none'
                    }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    type="submit"
                    disabled={savingStore || loading}
                    style={{
                      padding: '10px 22px', borderRadius: 10,
                      border: `1px solid ${T.accent}`,
                      background: T.accent, color: '#fff',
                      fontSize: 12, fontWeight: 800, cursor: 'pointer',
                      fontFamily: 'Syne, sans-serif',
                      transition: 'all 0.2s', opacity: savingStore ? 0.6 : 1
                    }}
                  >
                    {savingStore ? 'Menyimpan...' : 'Simpan Profil Toko'}
                  </button>
                </div>
              </form>
            </div>

            {/* General Toggles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Abaikan Stok Toggle */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 4 }}>Boleh Jual Walau Stok Komputer 0</p>
                    <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.5 }}>
                      Jika dinyalakan, kasir tetap bisa melayani penjualan meskipun stok di komputer tercatat kosong.
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
                      Status: {ignoreStock ? 'Jual Bebas (Stok 0 Tetap Bisa Jual)' : 'Validasi Stok Ketat'}
                    </p>
                    <p style={{ fontSize: 11, color: T.sub, lineHeight: 1.4 }}>
                      {ignoreStock 
                        ? 'Kasir diizinkan menjual produk meskipun stok fisik baru datang dan belum diinput ke komputer.' 
                        : 'Aplikasi membatasi kasir jika jumlah barang melebihi sisa stok di komputer.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Privacy Mode Toggle */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 4 }}>Sembunyikan Modal dan Untung</p>
                    <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.5 }}>
                      Sembunyikan harga modal beli dan angka keuntungan dari layar monitor agar aman dari pandangan pembeli.
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
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 800, color: hideCost ? T.red : T.green, marginBottom: 4 }}>
                      Status: {hideCost ? 'Modal & Untung Disembunyikan' : 'Modal & Untung Ditampilkan'}
                    </p>
                    <p style={{ fontSize: 11, color: T.sub, lineHeight: 1.4 }}>
                      {hideCost 
                        ? 'Layar monitor aman dilihat pembeli; angka modal & untung ditutup tanda bintang/titik.' 
                        : 'Semua angka modal dan keuntungan terlihat normal di laporan.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            {/* Backup & Restore Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 24 }}>
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: T.purple + '10', color: T.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: T.text }}>Simpan Cadangan Data</h3>
                <p style={{ fontSize: 12, color: T.sub, marginBottom: 20, lineHeight: 1.5 }}>Amankan seluruh data jualan dan stok toko ke file cadangan (.db).</p>
                <div style={{ display: 'flex', gap: 12, width: '100%', marginBottom: 16 }}>
                  <button 
                    onClick={handleBackup} disabled={backingUp}
                    style={{ 
                      flex: 1, padding: '14px 10px', borderRadius: 14, background: backingUp ? T.border2 : T.purple, color: '#fff', 
                      fontSize: 12, fontWeight: 800, border: 'none', cursor: backingUp ? 'wait' : 'pointer',
                      boxShadow: backingUp ? 'none' : `0 8px 20px ${T.purple}40`, transition: '0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}>
                    {backingUp ? '...' : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        Cadangkan
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => window.electronAPI.openBackupFolder()}
                    style={{ 
                      flex: 1, padding: '14px 10px', borderRadius: 14, background: T.surface, color: T.purple, 
                      fontSize: 12, fontWeight: 700, border: `1px solid ${T.purple}40`, cursor: 'pointer',
                      transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = T.purple + '08'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = T.surface; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                    Buka Folder
                  </button>
                </div>

                <div style={{ height: 1, background: T.border2, width: '100%', marginBottom: 16 }} />

                <button 
                  onClick={handleRestore}
                  style={{ 
                    width: '100%', padding: '12px', borderRadius: 14, background: T.red + '10', color: T.red, 
                    fontSize: 12, fontWeight: 800, border: `1.5px dashed ${T.red}40`, cursor: 'pointer',
                    transition: '0.2s', letterSpacing: '0.02em'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.red; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = T.red + '10'; e.currentTarget.style.color = T.red; }}
                >
                  Pulihkan Data dari Cadangan (.db)
                </button>
              </div>

              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 24, display: 'flex', gap: 20, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: T.text }}>Catatan Kejadian (Audit Trail)</h3>
                  <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.6 }}>Mencatat setiap tindakan penting seperti pembatalan nota belanja, cadangan data, atau hapus database untuk keamanan toko Anda.</p>
                  <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                    <div style={{ padding: '6px 12px', borderRadius: 8, background: T.bg, border: `1px solid ${T.border2}`, fontSize: 11, color: T.sub }}>Pencatatan: <b>Aktif</b></div>
                  </div>
                </div>
                <div style={{ width: 120, height: 120, opacity: 0.1, color: T.accent }}>
                  <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
              </div>
            </div>

            {/* Danger Zone: Hapus Data / Reset Database Card */}
            <div style={{
              background: T.surface,
              border: `1px solid ${T.red}35`,
              borderRadius: 20,
              padding: 24,
              marginBottom: 30,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 20,
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: T.red + '15', color: T.red,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <TrashIcon size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color: T.red, margin: 0 }}>
                      Hapus Seluruh Data / Reset Database
                    </p>
                    <span style={{ fontSize: 9, fontWeight: 800, color: T.red, background: T.red + '18', padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase' }}>
                      Zona Bahaya
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: T.sub, margin: 0, lineHeight: 1.5, maxWidth: 650 }}>
                    Hapus riwayat penjualan atau kosongkan database toko secara menyeluruh jika ingin memulai pembukuan dari nol. Sistem dilengkapi pencadangan otomatis sebelum penghapusan.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                style={{
                  padding: '12px 24px', borderRadius: 12,
                  background: T.red + '15', color: T.red,
                  border: `1.5px solid ${T.red}50`,
                  fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = T.red; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.red + '15'; e.currentTarget.style.color = T.red; }}
              >
                <TrashIcon size={14} />
                Hapus Data...
              </button>
            </div>

            {/* Activity Logs Component */}
            <ActivityLogs key={refreshKey} />
          </div>
        )}
      </div>

      {/* Modal Hapus Data / Reset Database */}
      {showResetModal && (
        <ResetDataModal
          onClose={() => setShowResetModal(false)}
          onSuccess={() => setRefreshKey(prev => prev + 1)}
        />
      )}
    </>
  );
}

// ─── MODAL HAPUS DATA / RESET DATABASE ─────────────────────────────────────────
function ResetDataModal({ onClose, onSuccess }) {
  const { showToast } = useToast();
  const [mode, setMode] = useState('all'); // 'all' or 'transactions_only'
  const [confirmInput, setConfirmInput] = useState('');
  const [loading, setLoading] = useState(false);

  const isConfirmed = confirmInput.trim().toUpperCase() === 'HAPUS';

  const handleExecuteReset = async () => {
    if (!isConfirmed || loading) return;
    setLoading(true);

    try {
      const res = await window.electronAPI.resetData(mode);
      if (res && res.success) {
        showToast(
          'success',
          mode === 'all'
            ? 'Seluruh data toko berhasil di-reset bersih! Cadangan otomatis telah disimpan.'
            : 'Seluruh riwayat transaksi & operasional berhasil dihapus (Master produk & kategori dipertahankan)!'
        );
        onSuccess();
        onClose();
      } else {
        showToast('error', `Gagal mereset data: ${res?.error || 'Kesalahan sistem'}`);
      }
    } catch (err) {
      showToast('error', `Terjadi error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && !loading && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, fontFamily: 'Syne, sans-serif'
      }}
    >
      <div style={{
        width: '100%', maxWidth: 540, background: T.surface,
        borderRadius: 22, border: `1px solid ${T.red}40`,
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)', overflow: 'hidden',
        animation: 'fadeUp 0.25s ease both'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
        }}>
          <div>
            <span style={{
              fontSize: 9, fontWeight: 800, color: T.red,
              background: T.red + '15', padding: '3px 8px', borderRadius: 6,
              textTransform: 'uppercase', letterSpacing: '0.1em'
            }}>
              Zona Berbahaya / Hapus Data
            </span>
            <h3 style={{ margin: '8px 0 4px', fontSize: 18, fontWeight: 800, color: T.text }}>
              Hapus Data & Reset Database
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: T.sub, lineHeight: 1.4 }}>
              Pilih cakupan data yang ingin dihapus. Sistem akan otomatis membuat file cadangan (.db) sebelum proses dimulai.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: T.border, border: 'none', color: T.sub,
              width: 30, height: 30, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <CloseIcon size={14} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Mode Option 1: Reset Total */}
          <div
            onClick={() => !loading && setMode('all')}
            style={{
              padding: 16, borderRadius: 14, cursor: loading ? 'default' : 'pointer',
              border: `1.5px solid ${mode === 'all' ? T.red : T.border2}`,
              background: mode === 'all' ? T.red + '0C' : T.bg,
              transition: 'all 0.2s', display: 'flex', gap: 14, alignItems: 'flex-start'
            }}
          >
            <input
              type="radio"
              name="resetMode"
              checked={mode === 'all'}
              onChange={() => setMode('all')}
              style={{ marginTop: 3, accentColor: T.red, cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: mode === 'all' ? T.red : T.text }}>
                Hapus Seluruh Data (Reset Total Pabrik)
              </p>
              <p style={{ margin: 0, fontSize: 11, color: T.sub, lineHeight: 1.45 }}>
                Mengosongkan <b>SEMUA</b> data: Produk, Kategori, Stok Fisik, Transaksi Penjualan, Shift Kasir, Pelanggan, dan Hutang Kasbon. Database kembali bersih seperti baru dipasang.
              </p>
            </div>
          </div>

          {/* Mode Option 2: Transaksi Saja */}
          <div
            onClick={() => !loading && setMode('transactions_only')}
            style={{
              padding: 16, borderRadius: 14, cursor: loading ? 'default' : 'pointer',
              border: `1.5px solid ${mode === 'transactions_only' ? T.accent : T.border2}`,
              background: mode === 'transactions_only' ? T.accent + '0C' : T.bg,
              transition: 'all 0.2s', display: 'flex', gap: 14, alignItems: 'flex-start'
            }}
          >
            <input
              type="radio"
              name="resetMode"
              checked={mode === 'transactions_only'}
              onChange={() => setMode('transactions_only')}
              style={{ marginTop: 3, accentColor: T.accent, cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: mode === 'transactions_only' ? T.accent : T.text }}>
                Hapus Transaksi Saja (Pertahankan Produk & Kategori)
              </p>
              <p style={{ margin: 0, fontSize: 11, color: T.sub, lineHeight: 1.45 }}>
                Hanya menghapus riwayat penjualan, shift kasir, kas masuk/keluar, buku kasbon, dan log mutasi. <b>Daftar Master Produk & Kategori Anda tetap aman</b>, stok barang di-reset ke 0.
              </p>
            </div>
          </div>

          {/* Safety Backup Callout */}
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: T.green + '0C', border: `1px solid ${T.green}25`,
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <div style={{ color: T.green, flexShrink: 0 }}>
              <CheckIcon size={16} />
            </div>
            <p style={{ margin: 0, fontSize: 11, color: T.text, lineHeight: 1.4 }}>
              <b>Perlindungan Otomatis:</b> File cadangan database darurat (<span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: T.green }}>pos-backup-SEBELUM-RESET...db</span>) akan dibuat otomatis sebelum penghapusan.
            </p>
          </div>

          {/* Type Confirmation */}
          <div style={{ marginTop: 4 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 6 }}>
              Ketik kata <span style={{ color: T.red, fontWeight: 800 }}>HAPUS</span> di bawah untuk membuka kunci tombol:
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={e => setConfirmInput(e.target.value)}
              placeholder="Ketik HAPUS di sini..."
              disabled={loading}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: `1.5px solid ${isConfirmed ? T.red : T.border2}`,
                background: T.bg, color: T.text,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 800,
                letterSpacing: '0.1em', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Action Footer */}
        <div style={{
          padding: '16px 24px', borderTop: `1px solid ${T.border}`,
          background: T.bg, display: 'flex', justifyContent: 'flex-end', gap: 12
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '10px 18px', borderRadius: 10,
              border: `1px solid ${T.border2}`, background: 'transparent',
              color: T.sub, fontSize: 12, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleExecuteReset}
            disabled={!isConfirmed || loading}
            style={{
              padding: '10px 22px', borderRadius: 10, border: 'none',
              background: isConfirmed ? T.red : T.border2,
              color: isConfirmed ? '#fff' : T.muted,
              fontSize: 12, fontWeight: 800,
              cursor: isConfirmed && !loading ? 'pointer' : 'not-allowed',
              opacity: isConfirmed && !loading ? 1 : 0.6,
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: isConfirmed ? `0 4px 15px ${T.red}40` : 'none',
              transition: 'all 0.2s'
            }}
          >
            {loading ? (
              'Sedang Menghapus...'
            ) : (
              <>
                <TrashIcon size={14} />
                {mode === 'all' ? 'Hapus Seluruh Data Sekarang' : 'Hapus Transaksi Saja'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
