import React from 'react';

export const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="2" width="7" height="7" rx="2" fill="currentColor" opacity="0.9"/>
    <rect x="11" y="2" width="7" height="7" rx="2" fill="currentColor" opacity="0.5"/>
    <rect x="2" y="11" width="7" height="7" rx="2" fill="currentColor" opacity="0.5"/>
    <rect x="11" y="11" width="7" height="7" rx="2" fill="currentColor" opacity="0.9"/>
  </svg>
);

export const CashierIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="4" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M6 10h8M10 7v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

export const ProductsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6"/>
    <rect x="11" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6"/>
    <rect x="2" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6"/>
    <rect x="11" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6"/>
  </svg>
);

export const InventoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="8" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M5 8V6a5 5 0 0110 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M7 13h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

export const TransactionsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M3 5h14M3 10h10M3 15h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

export const ReportsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M3 16 L7 10 L10 12 L14 6 L17 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CategoriesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M3 5h6l2 2H17v10H3V5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
  </svg>
);

export const LogoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="6" height="6" rx="2" fill="#FFFFFF"/>
    <rect x="10" y="2" width="6" height="6" rx="2" fill="#FFFFFF" opacity="0.6"/>
    <rect x="2" y="10" width="6" height="6" rx="2" fill="#FFFFFF" opacity="0.6"/>
    <rect x="10" y="10" width="6" height="6" rx="2" fill="#FFFFFF"/>
  </svg>
);

export const ChevronLeftIcon = ({ style }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={style}>
    <path d="M13 4L7 10l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const MenuIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
