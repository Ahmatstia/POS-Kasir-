import React from 'react';
import { 
  DashboardIcon, 
  CashierIcon, 
  CustomersIcon,
  PromoIcon,
  ProductsIcon, 
  TransactionsIcon, 
  DebtsIcon,
  ShiftsIcon,
  ReportsIcon, 
  SettingsIcon
} from '../components/Icons/AppIcons';

export const NAV = [
  { id: 'dashboard',    label: 'Beranda',        icon: <DashboardIcon /> },
  { id: 'cashier',      label: 'Kasir',          icon: <CashierIcon /> },
  { id: 'shifts',       label: 'Shift',          icon: <ShiftsIcon /> },
  { id: 'transactions', label: 'Riwayat Nota',   icon: <TransactionsIcon /> },
  { id: 'products',     label: 'Produk',         icon: <ProductsIcon /> },
  { id: 'customers',    label: 'Pelanggan',      icon: <CustomersIcon /> },
  { id: 'promos',       label: 'Promo & Diskon', icon: <PromoIcon /> },
  { id: 'debts',        label: 'Buku Kasbon',    icon: <DebtsIcon /> },
  { id: 'reports',      label: 'Laporan',        icon: <ReportsIcon /> },
  { id: 'settings',     label: 'Pengaturan',     icon: <SettingsIcon /> },
];
