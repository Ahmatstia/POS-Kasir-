import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  getCustomers,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerDebts,
  payDebt,
  getDebtPayments,
  getDebtSummary,
} from "../../services/debts";
import { getStoreProfile } from "../../services/settings";
import { printDebtPaymentReceipt } from "../../utils/PrintUtility";
import { useToast } from "../Toast";
import { T } from "../../theme";
import { DebtsIcon, EditIcon, TrashIcon, CloseIcon, RefreshIcon, PlusIcon } from "../Icons/AppIcons";
import PageHeader from "../Layout/PageHeader";
import { formatNominal, parseNominal } from "../../utils/format";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

function CustomerDebts() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({
    totalUnpaidDebt: 0,
    debtorsCount: 0,
    paidThisMonth: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("unpaid"); // 'unpaid', 'all', 'history'
  const [paymentHistory, setPaymentHistory] = useState([]);

  // Modals state
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [payTargetCustomer, setPayTargetCustomer] = useState(null);
  const [viewInvoicesCustomer, setViewInvoicesCustomer] = useState(null);
  const [previousInvoiceCustomer, setPreviousInvoiceCustomer] = useState(null);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Pay debt form state
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNotes, setPayNotes] = useState("");
  const [payAutoPrint, setPayAutoPrint] = useState(false);
  const [paying, setPaying] = useState(false);

  // Customer form state
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [custDebtLimit, setCustDebtLimit] = useState(0);
  const [custNotes, setCustNotes] = useState("");
  const [savingCust, setSavingCust] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadData();
  }, [searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [custList, sumData, historyData] = await Promise.all([
        getCustomers(searchTerm),
        getDebtSummary(),
        getDebtPayments(),
      ]);
      setCustomers(custList || []);
      setSummary(sumData || { totalUnpaidDebt: 0, debtorsCount: 0, paidThisMonth: 0 });
      setPaymentHistory(historyData || []);
    } catch (e) {
      console.error("Error loading debt data:", e);
      showToast("error", "Gagal memuat data kasbon: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Open Pay Modal
  const openPayModal = (customer, specificDebt = null) => {
    if (viewInvoicesCustomer) {
      setPreviousInvoiceCustomer(viewInvoicesCustomer);
      setViewInvoicesCustomer(null);
    }
    setPayTargetCustomer(customer);
    const amountToPay = specificDebt
      ? specificDebt.remaining_debt
      : customer.total_debt;
    setPayAmount(String(amountToPay || 0));
    setPayNotes(specificDebt ? `Bayar nota ${specificDebt.invoice_no}` : "");
    setPayMethod("cash");
    setPayAutoPrint(false);
  };

  const closePayModal = () => {
    setPayTargetCustomer(null);
    if (previousInvoiceCustomer) {
      openViewInvoices(previousInvoiceCustomer);
      setPreviousInvoiceCustomer(null);
    }
  };

  // Submit Payment
  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!payTargetCustomer || paying) return;

    const amount = parseNominal(payAmount);
    if (amount <= 0) {
      showToast("error", "Nominal pembayaran harus lebih dari Rp 0");
      return;
    }

    const maxDebt = Number(payTargetCustomer.total_debt || 0);
    if (amount > maxDebt) {
      showToast("error", `Nominal melebihi total kasbon! Maksimal pembayaran: ${fmt(maxDebt)}`);
      return;
    }

    setPaying(true);
    try {
      const res = await payDebt({
        customerId: payTargetCustomer.id,
        amount,
        paymentMethod: payMethod,
        notes: payNotes,
      });

      if (res.success) {
        showToast(
          "success",
          `Pembayaran ${fmt(amount)} untuk ${payTargetCustomer.name} berhasil dicatat!`
        );

        if (payAutoPrint) {
          try {
            const store = await getStoreProfile();
            printDebtPaymentReceipt(
              {
                payment_amount: amount,
                payment_method: payMethod,
                notes: payNotes,
                created_at: new Date().toLocaleString("id-ID"),
              },
              payTargetCustomer,
              res.remainingTotalDebt,
              store
            );
          } catch (printErr) {
            console.error("Print receipt error:", printErr);
          }
        }

        const returnCust = previousInvoiceCustomer || viewInvoicesCustomer;
        setPayTargetCustomer(null);
        setPreviousInvoiceCustomer(null);
        if (returnCust) {
          openViewInvoices({ ...returnCust, total_debt: res.remainingTotalDebt });
        }
        await loadData();
      } else {
        showToast("error", "Gagal mencatat pembayaran: " + res.error);
      }
    } catch (err) {
      showToast("error", "Terjadi kesalahan: " + err.message);
    } finally {
      setPaying(false);
    }
  };

  // Open View Invoices
  const openViewInvoices = async (customer) => {
    setViewInvoicesCustomer(customer);
    setInvoicesLoading(true);
    try {
      const invoices = await getCustomerDebts(customer.id);
      setCustomerInvoices(invoices || []);
    } catch (err) {
      showToast("error", "Gagal memuat rincian nota: " + err.message);
    } finally {
      setInvoicesLoading(false);
    }
  };

  // Open Add/Edit Customer
  const openAddCustomer = () => {
    setEditingCustomer(null);
    setCustName("");
    setCustPhone("");
    setCustAddress("");
    setCustDebtLimit(0);
    setCustNotes("");
    setShowAddCustomer(true);
  };

  const openEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setCustName(customer.name || "");
    setCustPhone(customer.phone || "");
    setCustAddress(customer.address || "");
    setCustDebtLimit(customer.debt_limit || 0);
    setCustNotes(customer.notes || "");
    setShowAddCustomer(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!custName.trim() || savingCust) return;

    setSavingCust(true);
    try {
      const payload = {
        name: custName.trim(),
        phone: custPhone.trim(),
        address: custAddress.trim(),
        debt_limit: parseNominal(custDebtLimit),
        notes: custNotes.trim(),
      };

      let res;
      if (editingCustomer) {
        res = await updateCustomer(editingCustomer.id, payload);
      } else {
        res = await addCustomer(payload);
      }

      if (res.success) {
        showToast(
          "success",
          `Data pelanggan "${payload.name}" berhasil ${
            editingCustomer ? "diperbarui" : "ditambahkan"
          }!`
        );
        setShowAddCustomer(false);
        loadData();
      } else {
        showToast("error", "Gagal menyimpan: " + res.error);
      }
    } catch (err) {
      showToast("error", "Terjadi kesalahan: " + err.message);
    } finally {
      setSavingCust(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteTarget) return;
    try {
      const res = await deleteCustomer(deleteTarget.id);
      if (res.success) {
        showToast("success", `Pelanggan "${deleteTarget.name}" berhasil dihapus.`);
        setDeleteTarget(null);
        loadData();
      } else {
        showToast("error", res.error);
      }
    } catch (err) {
      showToast("error", "Gagal menghapus: " + err.message);
    }
  };

  // Filter customers based on active tab
  const displayedCustomers = customers.filter((c) => {
    if (activeTab === "unpaid") return Number(c.total_debt) > 0;
    return true; // 'all'
  });

  return (
    <>
      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn   { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .debt-card { transition: all 0.2s ease; }
        .debt-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.25); border-color: ${T.border2} !important; }
        .tab-btn:hover { background: ${T.border2} !important; }
      `}</style>

      <div style={{ animation: "fadeUp 0.35s ease both", fontFamily: "Syne, sans-serif" }}>
        {/* ── PAGE HEADER ── */}
        <PageHeader
          title="Buku Kasbon"
          description="Pencatatan kasbon pelanggan, pembayaran cicilan, dan tanda terima resmi"
          actions={
            <>
              <button
                onClick={loadData}
                title="Segarkan Data"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: `1px solid ${T.border2}`,
                  background: T.surface,
                  color: T.sub,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = T.accent;
                  e.currentTarget.style.borderColor = T.accent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = T.sub;
                  e.currentTarget.style.borderColor = T.border2;
                }}
              >
                <RefreshIcon size={15} />
              </button>

              <button
                onClick={openAddCustomer}
                style={{
                  padding: "9px 18px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontFamily: "Syne, sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  transition: "all 0.15s",
                  border: "none",
                  background: T.accent,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = T.accentL)}
                onMouseLeave={(e) => (e.currentTarget.style.background = T.accent)}
              >
                <PlusIcon size={14} />
                Tambah Pelanggan Baru
              </button>
            </>
          }
        />

        {/* ── STAT CARDS ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {/* Total Unpaid Debt */}
          <div
            style={{
              background: T.surface,
              border: `1px solid ${summary.totalUnpaidDebt > 0 ? T.orange + "40" : T.border}`,
              borderRadius: 16,
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: T.orange + "16",
                border: `1px solid ${T.orange}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: T.orange,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 4,
                }}
              >
                Total Kasbon Toko (Belum Lunas)
              </p>
              <p
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: summary.totalUnpaidDebt > 0 ? T.orange : T.text,
                  fontFamily: "JetBrains Mono, monospace",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {fmt(summary.totalUnpaidDebt)}
              </p>
            </div>
          </div>

          {/* Debtors Count */}
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: T.blue + "16",
                border: `1px solid ${T.blue}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: T.blue,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 4,
                }}
              >
                Orang Yang Punya Kasbon
              </p>
              <p
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: T.blue,
                  fontFamily: "JetBrains Mono, monospace",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {summary.debtorsCount}{" "}
                <span style={{ fontSize: 13, fontWeight: 700, color: T.sub }}>
                  Pelanggan
                </span>
              </p>
            </div>
          </div>

          {/* Paid This Month */}
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: T.green + "16",
                border: `1px solid ${T.green}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: T.green,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 4,
                }}
              >
                Kasbon Terbayar Bulan Ini
              </p>
              <p
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: T.green,
                  fontFamily: "JetBrains Mono, monospace",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {fmt(summary.paidThisMonth)}
              </p>
            </div>
          </div>
        </div>

        {/* ── TABS & SEARCH BAR ── */}
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Tab buttons */}
          <div style={{ display: "flex", gap: 6, background: T.bg, padding: 4, borderRadius: 12, border: `1px solid ${T.border2}` }}>
            {[
              { id: "unpaid", label: "Belum Lunas", badge: summary.debtorsCount },
              { id: "all", label: "Semua Pelanggan", badge: customers.length },
              { id: "history", label: "Riwayat Pembayaran Kasbon" },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: active ? T.surface : "transparent",
                    color: active ? (tab.id === "unpaid" ? T.orange : T.text) : T.muted,
                    fontSize: 11,
                    fontWeight: active ? 800 : 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: active ? "0 2px 6px rgba(0,0,0,0.2)" : "none",
                    transition: "all 0.15s",
                  }}
                >
                  {tab.label}
                  {tab.badge !== undefined && (
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: 100,
                        fontSize: 9,
                        fontWeight: 800,
                        background: active
                          ? tab.id === "unpaid"
                            ? T.orange + "20"
                            : T.accent + "20"
                          : T.border2,
                        color: active
                          ? tab.id === "unpaid"
                            ? T.orange
                            : T.accent
                          : T.muted,
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search box */}
          {activeTab !== "history" && (
            <div style={{ position: "relative", minWidth: 260 }}>
              <svg
                style={{
                  position: "absolute",
                  left: 11,
                  top: "50%",
                  transform: "translateY(-50%)",
                  opacity: 0.4,
                }}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama atau nomor HP…"
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 32px",
                  borderRadius: 10,
                  border: `1px solid ${T.border2}`,
                  background: T.bg,
                  color: T.text,
                  fontSize: 12,
                  outline: "none",
                  fontFamily: "Syne, sans-serif",
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: T.muted,
                    fontSize: 14,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── TAB 1 & 2: CUSTOMERS LIST ── */}
        {activeTab !== "history" && (
          <div>
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ color: T.muted, fontSize: 13 }}>Memuat data buku kasbon…</p>
              </div>
            ) : displayedCustomers.length === 0 ? (
              <div
                style={{
                  background: T.surface,
                  border: `1px dashed ${T.border2}`,
                  borderRadius: 18,
                  padding: "50px 20px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: T.orange + "14",
                    color: T.orange,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <DebtsIcon />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text, margin: "0 0 6px 0" }}>
                  {activeTab === "unpaid"
                    ? "Alhamdulillah, Tidak Ada Kasbon Belum Lunas!"
                    : "Belum Ada Pelanggan Terdaftar"}
                </h3>
                <p style={{ fontSize: 12, color: T.muted, maxWidth: 400, margin: "0 auto 16px" }}>
                  {activeTab === "unpaid"
                    ? "Semua pelanggan telah melunasi belanjaan mereka, atau belum ada nota kasbon yang dibuat."
                    : "Daftarkan nama tetangga atau langganan warung agar bisa dicatat saat mereka kasbon belanja."}
                </p>
                <button
                  onClick={openAddCustomer}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: "none",
                    background: T.orange,
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  + Tambah Pelanggan Baru
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 14 }}>
                {displayedCustomers.map((c) => {
                  const debt = Number(c.total_debt || 0);
                  const limit = Number(c.debt_limit || 0);
                  const isOverLimit = limit > 0 && debt >= limit;

                  return (
                    <div
                      key={c.id}
                      className="debt-card"
                      style={{
                        background: T.surface,
                        border: `1px solid ${debt > 0 ? (isOverLimit ? T.red + "40" : T.orange + "30") : T.border}`,
                        borderRadius: 16,
                        padding: 18,
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* Top banner if overlimit */}
                      {isOverLimit && (
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 3,
                            background: T.red,
                          }}
                        />
                      )}

                      {/* Header row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 12,
                              background: debt > 0 ? T.orange + "16" : T.green + "16",
                              color: debt > 0 ? T.orange : T.green,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 900,
                              fontSize: 16,
                            }}
                          >
                            {c.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 style={{ fontSize: 16, fontWeight: 800, color: T.text, margin: "0 0 3px 0" }}>
                              {c.name}
                            </h4>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: T.muted }}>
                              {c.phone ? (
                                <span>{c.phone}</span>
                              ) : (
                                <span style={{ fontStyle: "italic" }}>Tanpa nomor HP</span>
                              )}
                              {c.address && <span>· {c.address}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Edit & Delete actions */}
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            onClick={() => openEditCustomer(c)}
                            title="Edit Data Pelanggan"
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              border: `1px solid ${T.border2}`,
                              background: "transparent",
                              color: T.sub,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <EditIcon size={13} />
                          </button>
                          {debt === 0 && (
                            <button
                              onClick={() => setDeleteTarget(c)}
                              title="Hapus Pelanggan"
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                border: `1px solid ${T.border2}`,
                                background: "transparent",
                                color: T.red,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <TrashIcon size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Debt Information Block */}
                      <div
                        style={{
                          background: T.bg,
                          border: `1px solid ${T.border2}`,
                          borderRadius: 12,
                          padding: "12px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <p style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px 0" }}>
                            Sisa Kasbon Belum Lunas
                          </p>
                          <p
                            style={{
                              fontSize: 20,
                              fontWeight: 900,
                              color: debt > 0 ? (isOverLimit ? T.red : T.orange) : T.green,
                              fontFamily: "JetBrains Mono, monospace",
                              margin: 0,
                            }}
                          >
                            {fmt(debt)}
                          </p>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 8px",
                              borderRadius: 6,
                              fontSize: 10,
                              fontWeight: 800,
                              background: debt > 0 ? T.orange + "18" : T.green + "18",
                              color: debt > 0 ? T.orange : T.green,
                              marginBottom: 4,
                            }}
                          >
                            {debt > 0 ? `${c.unpaid_invoices_count || 1} Nota Belum Lunas` : "Lunas / Bersih"}
                          </span>
                          <p style={{ fontSize: 9, color: T.muted, margin: 0 }}>
                            {limit > 0 ? `Batas: ${fmt(limit)}` : "Tanpa Batas Kasbon"}
                          </p>
                        </div>
                      </div>

                      {/* Notes if any */}
                      {c.notes && (
                        <p style={{ fontSize: 11, color: T.muted, margin: 0, fontStyle: "italic" }}>
                          Catatan: {c.notes}
                        </p>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: "grid", gridTemplateColumns: debt > 0 ? "1.5fr 1fr" : "1fr", gap: 8, marginTop: 2 }}>
                        {debt > 0 && (
                          <button
                            onClick={() => openPayModal(c)}
                            style={{
                              padding: "10px",
                              borderRadius: 10,
                              border: `1px solid ${T.green}50`,
                              background: T.green + "18",
                              color: T.green,
                              fontWeight: 800,
                              fontSize: 12,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = T.green + "28")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = T.green + "18")}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="1" x2="12" y2="23"></line>
                              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                            Bayar / Cicil Kasbon
                          </button>
                        )}
                        <button
                          onClick={() => openViewInvoices(c)}
                          style={{
                            padding: "10px",
                            borderRadius: 10,
                            border: `1px solid ${T.border2}`,
                            background: T.bg,
                            color: T.sub,
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          Rincian Nota
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: PAYMENT HISTORY ── */}
        {activeTab === "history" && (
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text, margin: 0 }}>
                Catatan Pembayaran & Cicilan Kasbon
              </h3>
            </div>
            {paymentHistory.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: T.muted }}>
                Belum ada riwayat pembayaran kasbon yang tercatat.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, textAlign: "left", color: T.muted }}>
                      <th style={{ padding: "12px 16px" }}>Waktu Bayar</th>
                      <th style={{ padding: "12px 16px" }}>Pelanggan</th>
                      <th style={{ padding: "12px 16px" }}>Nominal Dibayar</th>
                      <th style={{ padding: "12px 16px" }}>Metode</th>
                      <th style={{ padding: "12px 16px" }}>Nota Terkait</th>
                      <th style={{ padding: "12px 16px" }}>Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((h) => (
                      <tr key={h.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: "12px 16px", color: T.muted, fontFamily: "JetBrains Mono, monospace" }}>
                          {h.created_at}
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 700, color: T.text }}>
                          {h.customer_name}
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 800, color: T.green, fontFamily: "JetBrains Mono, monospace" }}>
                          {fmt(h.payment_amount)}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: 6, background: T.border, fontSize: 10, fontWeight: 700 }}>
                            {h.payment_method?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontFamily: "JetBrains Mono, monospace", color: T.sub }}>
                          {h.invoice_no || "Pelunasan Umum (FIFO)"}
                        </td>
                        <td style={{ padding: "12px 16px", color: T.sub }}>
                          {h.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── MODAL: BAYAR / CICIL KASBON ── */}
        {payTargetCustomer && createPortal(
          <div
            onClick={(e) => e.target === e.currentTarget && closePayModal()}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(15, 23, 42, 0.68)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "fadeIn 0.2s ease both",
              padding: 20,
              fontFamily: "Syne, sans-serif",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 480,
                background: T.surface,
                border: `1px solid ${T.border2}`,
                borderRadius: 20,
                boxShadow: "0 28px 70px rgba(0,0,0,0.45)",
                animation: "popIn 0.25s cubic-bezier(0.16,1,0.3,1) both",
                maxHeight: "calc(100vh - 40px)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "18px 24px 14px",
                  borderBottom: `1px solid ${T.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: T.green,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      margin: "0 0 2px 0",
                    }}
                  >
                    Terima Pembayaran Kasbon
                  </p>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0 }}>
                    {payTargetCustomer.name}
                  </h3>
                </div>
                <button
                  onClick={closePayModal}
                  style={{
                    background: "none",
                    border: `1px solid ${T.border2}`,
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    cursor: "pointer",
                    color: T.muted,
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CloseIcon size={16} />
                </button>
              </div>

              {/* Form & Body */}
              <form
                onSubmit={handleConfirmPayment}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  overflowY: "auto",
                  minHeight: 0,
                }}
              >
                <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Total debt callout */}
                  <div
                    style={{
                      background: T.bg,
                      border: `1px solid ${T.border2}`,
                      borderRadius: 14,
                      padding: "14px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", margin: "0 0 2px 0" }}>
                        Total Kasbon Saat Ini
                      </p>
                      <p style={{ fontSize: 22, fontWeight: 900, color: T.orange, fontFamily: "JetBrains Mono, monospace", margin: 0 }}>
                        {fmt(payTargetCustomer.total_debt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(payTargetCustomer.total_debt))}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: `1px solid ${T.green}40`,
                        background: T.green + "14",
                        color: T.green,
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Bayar Lunas
                    </button>
                  </div>

                  {/* Amount input */}
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                      Jumlah Yang Dibayarkan (Rp) *
                    </label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: T.muted }}>
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNominal(payAmount)}
                        onChange={(e) => setPayAmount(e.target.value.replace(/\D/g, ''))}
                        placeholder="0"
                        autoFocus
                        required
                        style={{
                          width: "100%",
                          padding: "12px 14px 12px 40px",
                          borderRadius: 10,
                          border: `1px solid ${T.border2}`,
                          background: T.bg,
                          color: T.text,
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 18,
                          fontWeight: 800,
                          outline: "none",
                        }}
                      />
                    </div>
                    {parseNominal(payAmount) > (payTargetCustomer.total_debt || 0) && (
                      <p style={{ fontSize: 11, color: T.red, fontWeight: 700, margin: "6px 0 0 0" }}>
                        Nominal melebihi sisa kasbon! Maksimal pembayaran adalah {fmt(payTargetCustomer.total_debt)}.
                      </p>
                    )}
                  </div>

                  {/* Quick amount presets */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    {[10_000, 20_000, 50_000, 100_000].map((amt) => {
                      const isOver = amt > (payTargetCustomer.total_debt || 0);
                      return (
                        <button
                          key={amt}
                          type="button"
                          disabled={isOver}
                          onClick={() => setPayAmount(String(amt))}
                          style={{
                            padding: "6px",
                            borderRadius: 8,
                            border: `1px solid ${isOver ? T.border : T.border2}`,
                            background: isOver ? T.border + "10" : T.bg,
                            color: isOver ? T.muted : T.sub,
                            fontSize: 10,
                            fontWeight: 700,
                            fontFamily: "JetBrains Mono, monospace",
                            cursor: isOver ? "not-allowed" : "pointer",
                            opacity: isOver ? 0.4 : 1,
                          }}
                        >
                          +{fmt(amt).replace("Rp ", "")}
                        </button>
                      );
                    })}
                  </div>

                  {/* Payment method */}
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                      Metode Pembayaran
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      {[
                        { key: "cash", label: "Tunai" },
                        { key: "transfer", label: "Transfer" },
                        { key: "qris", label: "QRIS" },
                      ].map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setPayMethod(m.key)}
                          style={{
                            padding: "8px",
                            borderRadius: 8,
                            border: `1px solid ${payMethod === m.key ? T.accent : T.border2}`,
                            background: payMethod === m.key ? T.accent + "14" : T.bg,
                            color: payMethod === m.key ? T.accent : T.sub,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                      Keterangan (Opsional)
                    </label>
                    <input
                      type="text"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      placeholder="Contoh: Titipan cicilan minggu ke-1"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: `1px solid ${T.border2}`,
                        background: T.bg,
                        color: T.text,
                        fontSize: 12,
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Print receipt checkbox */}
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, color: T.text, marginTop: 4 }}>
                    <input
                      type="checkbox"
                      checked={payAutoPrint}
                      onChange={(e) => setPayAutoPrint(e.target.checked)}
                      style={{ accentColor: T.green, width: 16, height: 16, cursor: "pointer" }}
                    />
                    Cetak Tanda Terima Kwitansi Pembayaran Kasbon
                  </label>
                </div>

                {/* Footer action buttons */}
                <div
                  style={{
                    padding: "14px 24px",
                    borderTop: `1px solid ${T.border}`,
                    background: T.surface,
                    display: "grid",
                    gridTemplateColumns: "1fr 2fr",
                    gap: 10,
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={closePayModal}
                    style={{
                      padding: "11px",
                      borderRadius: 10,
                      border: `1px solid ${T.border2}`,
                      background: T.bg,
                      color: T.sub,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={paying || parseNominal(payAmount) <= 0 || parseNominal(payAmount) > (payTargetCustomer.total_debt || 0)}
                    style={{
                      padding: "11px",
                      borderRadius: 10,
                      border: `1px solid ${T.green}50`,
                      background: (paying || Number(payAmount) <= 0 || Number(payAmount) > (payTargetCustomer.total_debt || 0)) ? T.border : T.green,
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: paying ? "wait" : "pointer",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {paying ? "Menyimpan…" : `Simpan Pembayaran (${fmt(payAmount)})`}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* ── MODAL: RINCIAN NOTA KASBON PELANGGAN ── */}
        {viewInvoicesCustomer && createPortal(
          <div
            onClick={(e) => e.target === e.currentTarget && setViewInvoicesCustomer(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(15, 23, 42, 0.68)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "fadeIn 0.2s ease both",
              padding: 20,
              fontFamily: "Syne, sans-serif",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 680,
                background: T.surface,
                border: `1px solid ${T.border2}`,
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "0 28px 70px rgba(0,0,0,0.45)",
                animation: "popIn 0.25s cubic-bezier(0.16,1,0.3,1) both",
                maxHeight: "calc(100vh - 40px)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  padding: "18px 24px 14px",
                  borderBottom: `1px solid ${T.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: T.orange,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      margin: "0 0 2px 0",
                    }}
                  >
                    Daftar Nota Belanja Kasbon
                  </p>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0 }}>
                    {viewInvoicesCustomer.name} · Sisa Kasbon: {fmt(viewInvoicesCustomer.total_debt)}
                  </h3>
                </div>
                <button
                  onClick={() => setViewInvoicesCustomer(null)}
                  style={{
                    background: "none",
                    border: `1px solid ${T.border2}`,
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    cursor: "pointer",
                    color: T.muted,
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CloseIcon size={16} />
                </button>
              </div>

              <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
                {invoicesLoading ? (
                  <p style={{ textAlign: "center", color: T.muted, padding: 30 }}>Memuat rincian nota…</p>
                ) : customerInvoices.length === 0 ? (
                  <p style={{ textAlign: "center", color: T.muted, padding: 30 }}>Belum ada nota kasbon untuk pelanggan ini.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {customerInvoices.map((inv) => {
                      const isPaid = inv.status === "PAID";
                      const isPartial = inv.status === "PARTIAL";
                      return (
                        <div
                          key={inv.id}
                          style={{
                            background: T.bg,
                            border: `1px solid ${T.border2}`,
                            borderRadius: 12,
                            padding: "14px 16px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: T.accent, fontFamily: "JetBrains Mono, monospace" }}>
                                {inv.invoice_no}
                              </span>
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 800,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: isPaid ? T.green + "18" : isPartial ? T.blue + "18" : T.orange + "18",
                                  color: isPaid ? T.green : isPartial ? T.blue : T.orange,
                                }}
                              >
                                {isPaid ? "LUNAS" : isPartial ? "DICICIL SEBAGIAN" : "BELUM DIBAYAR"}
                              </span>
                            </div>
                            <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>
                              Waktu: {inv.created_at} {inv.notes ? `· Catatan: ${inv.notes}` : ""}
                            </p>
                          </div>

                          <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 14 }}>
                            <div>
                              <p style={{ fontSize: 9, color: T.muted, margin: "0 0 2px 0" }}>
                                Total: {fmt(inv.total_debt)}
                              </p>
                              <p
                                style={{
                                  fontSize: 14,
                                  fontWeight: 800,
                                  color: isPaid ? T.muted : T.orange,
                                  fontFamily: "JetBrains Mono, monospace",
                                  margin: 0,
                                }}
                              >
                                Sisa: {fmt(inv.remaining_debt)}
                              </p>
                            </div>

                            {!isPaid && (
                              <button
                                onClick={() => openPayModal(viewInvoicesCustomer, inv)}
                                style={{
                                  padding: "8px 14px",
                                  borderRadius: 8,
                                  border: `1px solid ${T.green}40`,
                                  background: T.green + "14",
                                  color: T.green,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Bayar Nota Ini
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ── MODAL: TAMBAH / EDIT PELANGGAN ── */}
        {showAddCustomer && createPortal(
          <div
            onClick={(e) => e.target === e.currentTarget && setShowAddCustomer(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(15, 23, 42, 0.68)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "fadeIn 0.2s ease both",
              padding: 20,
              fontFamily: "Syne, sans-serif",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 480,
                background: T.surface,
                border: `1px solid ${T.border2}`,
                borderRadius: 20,
                boxShadow: "0 28px 70px rgba(0,0,0,0.45)",
                animation: "popIn 0.25s cubic-bezier(0.16,1,0.3,1) both",
                maxHeight: "calc(100vh - 40px)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "18px 24px 14px",
                  borderBottom: `1px solid ${T.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: T.orange,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      margin: "0 0 2px 0",
                    }}
                  >
                    {editingCustomer ? "Ubah Data Pelanggan" : "Pendaftaran Pelanggan"}
                  </p>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0 }}>
                    {editingCustomer ? "Edit Pelanggan Kasbon" : "Tambah Pelanggan Kasbon Baru"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddCustomer(false)}
                  style={{
                    background: "none",
                    border: `1px solid ${T.border2}`,
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    cursor: "pointer",
                    color: T.muted,
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CloseIcon size={16} />
                </button>
              </div>

              {/* Form & Body */}
              <form
                onSubmit={handleSaveCustomer}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  overflowY: "auto",
                  minHeight: 0,
                }}
              >
                <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                      Nama Lengkap Pelanggan *
                    </label>
                    <input
                      type="text"
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="Contoh: Pak Budi / Bu Siti Warung Sebelah"
                      required
                      autoFocus
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${T.border2}`,
                        background: T.bg,
                        color: T.text,
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                        Nomor HP / WhatsApp
                      </label>
                      <input
                        type="text"
                        value={custPhone}
                        onChange={(e) => setCustPhone(e.target.value)}
                        placeholder="08xxxxxxxxxx"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: `1px solid ${T.border2}`,
                          background: T.bg,
                          color: T.text,
                          fontSize: 13,
                          outline: "none",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                        Batas Maksimal Kasbon (Rp)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNominal(custDebtLimit)}
                        onChange={(e) => setCustDebtLimit(e.target.value.replace(/\D/g, ''))}
                        placeholder="0 (Tanpa batas)"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: `1px solid ${T.border2}`,
                          background: T.bg,
                          color: T.text,
                          fontSize: 13,
                          outline: "none",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                      Alamat / Patokan Rumah
                    </label>
                    <input
                      type="text"
                      value={custAddress}
                      onChange={(e) => setCustAddress(e.target.value)}
                      placeholder="Contoh: Rumah cat hijau depan musholla"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${T.border2}`,
                        background: T.bg,
                        color: T.text,
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                      Catatan Khusus (Opsional)
                    </label>
                    <input
                      type="text"
                      value={custNotes}
                      onChange={(e) => setCustNotes(e.target.value)}
                      placeholder="Contoh: Langganan warung nasi, gajian tiap tgl 25"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${T.border2}`,
                        background: T.bg,
                        color: T.text,
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                {/* Footer action buttons */}
                <div
                  style={{
                    padding: "14px 24px",
                    borderTop: `1px solid ${T.border}`,
                    background: T.surface,
                    display: "grid",
                    gridTemplateColumns: "1fr 2fr",
                    gap: 10,
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowAddCustomer(false)}
                    style={{
                      padding: "11px",
                      borderRadius: 10,
                      border: `1px solid ${T.border2}`,
                      background: T.bg,
                      color: T.sub,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingCust}
                    style={{
                      padding: "11px",
                      borderRadius: 10,
                      border: "none",
                      background: T.orange,
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: savingCust ? "wait" : "pointer",
                    }}
                  >
                    {savingCust ? "Menyimpan…" : "Simpan Data Pelanggan"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* ── MODAL: CONFIRM DELETE CUSTOMER ── */}
        {deleteTarget && createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(15, 23, 42, 0.68)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "fadeIn 0.2s ease both",
              padding: 20,
              fontFamily: "Syne, sans-serif",
            }}
            onClick={() => setDeleteTarget(null)}
          >
            <div
              style={{
                width: 340,
                background: T.surface,
                borderRadius: 20,
                padding: 24,
                boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
                border: `1px solid ${T.border2}`,
                animation: "popIn 0.25s ease",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: T.red + "15",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: T.red,
                  marginBottom: 16,
                }}
              >
                <TrashIcon size={20} />
              </div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: 16, color: T.text }}>
                Hapus Pelanggan Ini?
              </h3>
              <p style={{ margin: "0 0 20px 0", fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
                Data pelanggan <b>{deleteTarget.name}</b> akan dihapus dari sistem. Pelanggan ini tidak memiliki tunggakan kasbon aktif.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  style={{
                    padding: "10px 0",
                    borderRadius: 10,
                    background: T.bg,
                    border: `1px solid ${T.border2}`,
                    color: T.sub,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteCustomer}
                  style={{
                    padding: "10px 0",
                    borderRadius: 10,
                    background: T.red,
                    border: "none",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </>
  );
}

export default CustomerDebts;
