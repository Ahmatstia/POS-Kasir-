import React, { useState, useEffect } from 'react';
import { getCustomers } from '../../services/customers';
import { CustomerFormModal, getCustomerInitials } from '../Customers/CustomerManagement';
import { T } from '../../theme';

export default function CustomerSelectModal({
  selectedCustomer = null, // null means Walk-in Guest (Umum)
  onSelectCustomer,
  onClose,
}) {
  const [customers, setCustomers]       = useState([]);
  const [searchTerm, setSearchTerm]     = useState('');
  const [loading, setLoading]           = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getCustomers(searchTerm);
      setCustomers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchTerm]);

  const isWalkIn = !selectedCustomer || !selectedCustomer.id;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1050, padding: 20, fontFamily: 'Syne, sans-serif',
    }}>
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 22, width: '100%', maxWidth: 460,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
        overflow: 'hidden', animation: 'scaleUp 0.2s ease',
        display: 'flex', flexDirection: 'column', maxHeight: '85vh',
      }}>
        {/* Header (Screenshot 5) */}
        <div style={{
          padding: '20px 22px 16px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: '#EA580C', color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" opacity="0.6" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" opacity="0.6" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>
                Pilih Pelanggan
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: T.muted }}>
                Kaitkan nota transaksi dengan akun pembeli
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: T.card, border: `1px solid ${T.border2}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: T.sub, fontSize: 16, fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>

        {/* Search Bar & Tambah Pelanggan Button */}
        <div style={{ padding: '16px 20px 10px', display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Ketik nama atau nomor HP…"
              style={{
                width: '100%', padding: '10px 12px 10px 36px',
                borderRadius: 12, border: `1.5px solid ${T.border2}`,
                background: T.bg, color: T.text, fontSize: 12,
                fontFamily: 'Syne, sans-serif', outline: 'none',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#EA580C'}
              onBlur={e => e.currentTarget.style.borderColor = T.border2}
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            title="Tambah pelanggan baru"
            style={{
              padding: '0 14px', borderRadius: 12, border: 'none',
              background: '#EA580C15', color: '#EA580C', border: '1px solid #EA580C35',
              fontSize: 11, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
            }}
          >
            + Baru
          </button>
        </div>

        {/* Customer List (Screenshot 5) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Option 1: Walk-in Guest (Umum) */}
          <div
            onClick={() => { onSelectCustomer(null); onClose(); }}
            style={{
              padding: '12px 14px', borderRadius: 14,
              border: `1.5px solid ${isWalkIn ? '#EA580C' : T.border2}`,
              background: isWalkIn ? '#EA580C0D' : T.surface,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!isWalkIn) e.currentTarget.style.background = T.bg; }}
            onMouseLeave={e => { if (!isWalkIn) e.currentTarget.style.background = T.surface; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: '#EA580C', color: '#FFFFFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 12, letterSpacing: '0.05em',
              }}>
                WG
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>
                  Walk-in Guest (Umum)
                </div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>
                  Pelanggan langsung tanpa data kontak
                </div>
              </div>
            </div>

            {isWalkIn && (
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: '#EA580C', color: '#FFFFFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </div>

          {/* List of Registered Customers */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: T.muted, fontSize: 12 }}>
              Mencari pelanggan…
            </div>
          ) : customers.length === 0 && searchTerm ? (
            <div style={{ textAlign: 'center', padding: '24px 10px', color: T.muted }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>Tidak ditemukan</p>
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  marginTop: 8, padding: '6px 12px', borderRadius: 8,
                  border: 'none', background: '#EA580C', color: '#fff',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}
              >
                + Tambah "{searchTerm}" Sekarang
              </button>
            </div>
          ) : (
            customers.map((c) => {
              const isSelected = selectedCustomer?.id === c.id;
              const initials = getCustomerInitials(c.name);

              return (
                <div
                  key={c.id}
                  onClick={() => { onSelectCustomer(c); onClose(); }}
                  style={{
                    padding: '12px 14px', borderRadius: 14,
                    border: `1.5px solid ${isSelected ? '#EA580C' : T.border2}`,
                    background: isSelected ? '#EA580C0D' : T.surface,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.bg; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = T.surface; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: '#EA580C', color: '#FFFFFF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 12, letterSpacing: '0.05em',
                    }}>
                      {initials}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>
                        {c.phone || c.notes || 'Pelanggan Terdaftar'}
                      </div>
                    </div>
                  </div>

                  {isSelected ? (
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: '#EA580C', color: '#FFFFFF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      {showAddModal && (
        <CustomerFormModal
          onClose={() => setShowAddModal(false)}
          onSuccess={async () => {
            setShowAddModal(false);
            await loadData();
          }}
        />
      )}
    </div>
  );
}
