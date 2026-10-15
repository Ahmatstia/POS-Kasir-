import React, { useState, useEffect } from 'react';
import { 
  getCustomers, 
  addCustomer, 
  updateCustomer, 
  deleteCustomer, 
  getCustomerTransactions 
} from '../../services/customers';
import { useToast } from '../Toast';
import { T } from '../../theme';
import { formatNominal } from '../../utils/format';

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

// Helper initials avatar
export function getCustomerInitials(name) {
  if (!name || !name.trim()) return 'WG';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// ─── MODAL: TAMBAH / EDIT PELANGGAN ──────────────────────────────────────────
export function CustomerFormModal({ customer = null, onClose, onSuccess }) {
  const { showToast } = useToast();
  const isEdit = Boolean(customer?.id);

  const [name, setName]         = useState(customer?.name || '');
  const [phone, setPhone]       = useState(customer?.phone || '');
  const [notes, setNotes]       = useState(customer?.notes || '');
  const [debtLimit, setDebtLimit] = useState(customer?.debt_limit ? String(customer.debt_limit) : '0');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Nama lengkap pelanggan wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        const res = await updateCustomer(customer.id, {
          name: name.trim(),
          phone: phone.trim(),
          address: customer.address || '',
          debt_limit: Math.max(0, parseInt(debtLimit, 10) || 0),
          notes: notes.trim(),
        });
        if (!res.success) throw new Error(res.error || 'Gagal update data');
        showToast('success', `Data pelanggan "${name}" berhasil diperbarui`);
      } else {
        const res = await addCustomer({
          name: name.trim(),
          phone: phone.trim(),
          address: '',
          debt_limit: Math.max(0, parseInt(debtLimit, 10) || 0),
          notes: notes.trim(),
        });
        if (!res.success) throw new Error(res.error || 'Gagal menambah pelanggan');
        showToast('success', `Pelanggan baru "${name}" berhasil disimpan!`);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast('error', err.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

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
      }}>
        {/* Header (Screenshot 3 style) */}
        <div style={{
          padding: '24px 24px 18px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: '#EA580C', color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(234,88,12,0.3)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.text, letterSpacing: '-0.02em' }}>
                {isEdit ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: T.muted }}>
                Simpan data kontak pelanggan untuk riwayat transaksi.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '22px 24px' }}>
          {/* Field: Nama Lengkap Pelanggan */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 7 }}>
              Nama Lengkap Pelanggan <span style={{ color: '#EA580C' }}>*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                border: `1.5px solid ${T.border2}`, background: T.bg,
                color: T.text, fontSize: 13, fontFamily: 'Syne, sans-serif',
                outline: 'none', transition: 'border-color 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#EA580C'}
              onBlur={e => e.currentTarget.style.borderColor = T.border2}
            />
          </div>

          {/* Field: Nomor HP / WhatsApp */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 7 }}>
              Nomor HP / WhatsApp
            </label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0812xxxxxx"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                border: `1.5px solid ${T.border2}`, background: T.bg,
                color: T.text, fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
                outline: 'none', transition: 'border-color 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#EA580C'}
              onBlur={e => e.currentTarget.style.borderColor = T.border2}
            />
          </div>

          {/* Field: Catatan Preferensi */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 7 }}>
              Catatan Preferensi
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Contoh: Langganan warung pecel, suka bubuk cabai super pedas..."
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                border: `1.5px solid ${T.border2}`, background: T.bg,
                color: T.text, fontSize: 12, fontFamily: 'Syne, sans-serif',
                resize: 'none', outline: 'none', transition: 'border-color 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#EA580C'}
              onBlur={e => e.currentTarget.style.borderColor = T.border2}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '11px 20px', borderRadius: 12,
                border: `1px solid ${T.border2}`, background: 'transparent',
                color: T.sub, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Syne, sans-serif',
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '11px 26px', borderRadius: 12, border: 'none',
                background: '#EA580C', color: '#FFFFFF',
                fontSize: 13, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: 'Syne, sans-serif', boxShadow: '0 4px 14px rgba(234,88,12,0.4)',
                transition: 'all 0.15s', opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Menyimpan…' : 'Simpan Pelanggan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── MODAL: RIWAYAT TRANSAKSI PELANGGAN ────────────────────────────────────────
function CustomerHistoryModal({ customer, onClose }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    if (customer?.id) {
      getCustomerTransactions(customer.id)
        .then(res => setTransactions(res || []))
        .finally(() => setLoading(false));
    }
  }, [customer]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1050, padding: 20, fontFamily: 'Syne, sans-serif',
    }}>
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 22, width: '100%', maxWidth: 580,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
        overflow: 'hidden', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '20px 24px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>
              Riwayat Transaksi: {customer.name}
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: T.muted }}>
              {customer.phone || 'Tanpa nomor telepon'} • {transactions.length} transaksi tercatat
            </p>
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

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: T.muted, padding: 30 }}>Memuat riwayat…</p>
          ) : transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: T.muted }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Belum Ada Transaksi</p>
              <p style={{ margin: '4px 0 0', fontSize: 12 }}>Pelanggan ini belum pernah menyelesaikan transaksi kasir.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {transactions.map(t => (
                <div key={t.id} style={{
                  padding: '12px 14px', borderRadius: 12,
                  background: T.card, border: `1px solid ${T.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: T.accent, fontFamily: 'JetBrains Mono, monospace' }}>
                      {t.invoice_no}
                    </span>
                    <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                      {t.created_at || t.transaction_date} • {t.payment_method?.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: T.text, fontFamily: 'JetBrains Mono, monospace' }}>
                      {fmt(t.total_amount)}
                    </div>
                    {t.discount > 0 && (
                      <span style={{ fontSize: 10, color: T.green, fontWeight: 700 }}>
                        Diskon {fmt(t.discount)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT: CUSTOMER MANAGEMENT ─────────────────────────────────────
export default function CustomerManagement() {
  const { showToast } = useToast();
  const [customers, setCustomers]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [searchTerm, setSearchTerm]   = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [historyCustomer, setHistoryCustomer] = useState(null);
  const [deletingId, setDeletingId]   = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getCustomers(searchTerm);
      setCustomers(data || []);
    } catch (e) {
      console.error(e);
      showToast('error', 'Gagal memuat daftar pelanggan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchTerm]);

  const handleDelete = async (customer) => {
    if (!window.confirm(`Yakin ingin menghapus pelanggan "${customer.name}"?`)) return;
    setDeletingId(customer.id);
    try {
      const res = await deleteCustomer(customer.id);
      if (!res.success) {
        showToast('error', res.error || 'Gagal menghapus pelanggan');
        return;
      }
      showToast('success', `Pelanggan "${customer.name}" berhasil dihapus`);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: 'Syne, sans-serif' }}>
      {/* Top Header Bar (Screenshot 3) */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 18, padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: '-0.02em' }}>
            Pelanggan
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: T.muted }}>
            Kelola data kontak pelanggan, riwayat belanja, dan preferensi toko
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '10px 18px', borderRadius: 12, border: 'none',
            background: '#EA580C', color: '#FFFFFF',
            fontSize: 12, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 7,
            boxShadow: '0 4px 14px rgba(234,88,12,0.35)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          + Tambah
        </button>
      </div>

      {/* Search Input Bar (Screenshot 3) */}
      <div style={{
        position: 'relative', width: '100%',
      }}>
        <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.45 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Cari nama, telepon, atau catatan pelanggan…"
          style={{
            width: '100%', padding: '12px 14px 12px 42px',
            borderRadius: 14, border: `1px solid ${T.border2}`,
            background: T.surface, color: T.text,
            fontSize: 13, fontFamily: 'Syne, sans-serif', outline: 'none',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: T.muted, cursor: 'pointer',
              fontSize: 16, fontWeight: 700,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Customer List / Table */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: T.muted }}>
            Memuat data pelanggan…
          </div>
        ) : customers.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: '#EA580C18',
              color: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: T.text }}>
              {searchTerm ? 'Tidak ada pelanggan yang cocok' : 'Belum ada data pelanggan'}
            </p>
            <p style={{ margin: '4px 0 16px', fontSize: 12, color: T.muted }}>
              {searchTerm ? 'Coba cari dengan kata kunci lain' : 'Klik tombol "+ Tambah" di atas untuk menyimpan pelanggan baru'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  padding: '9px 18px', borderRadius: 10, border: 'none',
                  background: '#EA580C', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                + Tambah Pelanggan Pertama
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead>
                <tr style={{ background: T.card, borderBottom: `1px solid ${T.border}`, color: T.sub, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>
                  <th style={{ padding: '14px 18px' }}>Pelanggan</th>
                  <th style={{ padding: '14px 18px' }}>Nomor HP / WhatsApp</th>
                  <th style={{ padding: '14px 18px' }}>Catatan / Preferensi</th>
                  <th style={{ padding: '14px 18px' }}>Status Kasbon</th>
                  <th style={{ padding: '14px 18px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const initials = getCustomerInitials(c.name);
                  const hasDebt = Number(c.total_debt || 0) > 0;

                  return (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = T.bg}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Pelanggan avatar & name */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: '50%',
                            background: '#EA580C', color: '#FFFFFF',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 800, flexShrink: 0,
                            letterSpacing: '0.05em',
                          }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>
                              {c.name}
                            </div>
                            <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>
                              ID #{c.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td style={{ padding: '14px 18px', fontFamily: 'JetBrains Mono, monospace', color: T.text }}>
                        {c.phone ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span>{c.phone}</span>
                            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6, background: T.green + '15', color: T.green, fontWeight: 700 }}>WA</span>
                          </span>
                        ) : (
                          <span style={{ color: T.muted, fontStyle: 'italic' }}>—</span>
                        )}
                      </td>

                      {/* Notes / Preferences */}
                      <td style={{ padding: '14px 18px', color: T.sub, maxWidth: 260 }}>
                        {c.notes ? (
                          <span style={{ fontSize: 11, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {c.notes}
                          </span>
                        ) : (
                          <span style={{ color: T.muted, fontStyle: 'italic', fontSize: 11 }}>Belum ada catatan</span>
                        )}
                      </td>

                      {/* Kasbon Status */}
                      <td style={{ padding: '14px 18px' }}>
                        {hasDebt ? (
                          <span style={{
                            padding: '4px 10px', borderRadius: 8,
                            background: T.red + '12', border: `1px solid ${T.red}35`,
                            color: T.red, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 11,
                          }}>
                            Kasbon: {fmt(c.total_debt)}
                          </span>
                        ) : (
                          <span style={{
                            padding: '4px 10px', borderRadius: 8,
                            background: T.green + '12', border: `1px solid ${T.green}30`,
                            color: T.green, fontWeight: 700, fontSize: 10,
                          }}>
                            Lancar / Bebas Kasbon
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => setHistoryCustomer(c)}
                            title="Lihat Riwayat Belanja"
                            style={{
                              padding: '6px 10px', borderRadius: 8,
                              border: `1px solid ${T.accent}30`, background: T.accent + '0C',
                              color: T.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            Nota
                          </button>
                          <button
                            onClick={() => setEditingCustomer(c)}
                            title="Edit Data Pelanggan"
                            style={{
                              padding: '6px 10px', borderRadius: 8,
                              border: `1px solid ${T.border2}`, background: T.surface,
                              color: T.sub, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            disabled={deletingId === c.id}
                            title="Hapus Pelanggan"
                            style={{
                              padding: '6px 9px', borderRadius: 8,
                              border: `1px solid ${T.red}30`, background: T.red + '0C',
                              color: T.red, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            {deletingId === c.id ? '…' : 'Hapus'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL TAMBAH PELANGGAN */}
      {showAddModal && (
        <CustomerFormModal
          onClose={() => setShowAddModal(false)}
          onSuccess={loadData}
        />
      )}

      {/* MODAL EDIT PELANGGAN */}
      {editingCustomer && (
        <CustomerFormModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSuccess={loadData}
        />
      )}

      {/* MODAL RIWAYAT BELANJA */}
      {historyCustomer && (
        <CustomerHistoryModal
          customer={historyCustomer}
          onClose={() => setHistoryCustomer(null)}
        />
      )}
    </div>
  );
}
