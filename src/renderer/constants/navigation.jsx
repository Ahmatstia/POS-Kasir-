import React from 'react';
import { 
  DashboardIcon, 
  CashierIcon, 
  ProductsIcon, 
  TransactionsIcon, 
  DebtsIcon,
  ShiftsIcon,
  ReportsIcon, 
  SettingsIcon
} from '../components/Icons/AppIcons';

export const NAV = [
  { id: 'dashboard',    label: 'Beranda',       icon: <DashboardIcon /> },
  { id: 'cashier',      label: 'Jual (Kasir)',  icon: <CashierIcon /> },
  { id: 'shifts',       label: 'Kas & Shift',   icon: <ShiftsIcon /> },
  { id: 'products',     label: 'Barang',        icon: <ProductsIcon /> },
  { id: 'transactions', label: 'Riwayat Nota',  icon: <TransactionsIcon /> },
  { id: 'debts',        label: 'Buku Kasbon',   icon: <DebtsIcon /> },
  { id: 'reports',      label: 'Laporan',       icon: <ReportsIcon /> },
  { id: 'settings',     label: 'Pengaturan',    icon: <SettingsIcon /> },
];
