import React from 'react';
import { 
  DashboardIcon, 
  CashierIcon, 
  ProductsIcon, 
  InventoryIcon, 
  TransactionsIcon, 
  ReportsIcon, 
  CategoriesIcon 
} from '../components/Icons/AppIcons';

export const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { id: 'cashier', label: 'Kasir', icon: <CashierIcon /> },
  { id: 'products', label: 'Produk', icon: <ProductsIcon /> },
  { id: 'inventory', label: 'Inventori', icon: <InventoryIcon /> },
  { id: 'transactions', label: 'Transaksi', icon: <TransactionsIcon /> },
  { id: 'reports', label: 'Laporan', icon: <ReportsIcon /> },
  { id: 'categories', label: 'Kategori', icon: <CategoriesIcon /> },
];
