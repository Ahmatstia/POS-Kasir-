import React, { useState, useEffect } from 'react';
import ProductList from './ProductList';
import InventoryList from '../Inventory/InventoryList';
import CategoryList from '../Categories/CategoryList';
import { ProductsIcon, InventoryIcon, CategoriesIcon } from '../Icons/AppIcons';
import { T } from '../../theme';

function GoodsHub({ defaultTab = 'products' }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const tabs = [
    {
      id: 'products',
      label: 'Daftar Barang',
      sublabel: 'Master harga & satuan',
      icon: <ProductsIcon />,
    },
    {
      id: 'inventory',
      label: 'Barang Masuk & Stok Rak',
      sublabel: 'Catat stok masuk & cocokkan rak',
      icon: <InventoryIcon />,
    },
    {
      id: 'categories',
      label: 'Kategori Barang',
      sublabel: 'Kelompok jenis barang',
      icon: <CategoriesIcon />,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── SUB-NAVIGATION TABS ── */}
      <div style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: '8px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        flexWrap: 'wrap',
      }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 18px',
                borderRadius: 12,
                border: `1px solid ${isActive ? T.accent + '40' : 'transparent'}`,
                background: isActive ? T.accent + '15' : 'transparent',
                color: isActive ? T.accent : T.sub,
                cursor: 'pointer',
                fontFamily: 'Syne, sans-serif',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = T.border;
                  e.currentTarget.style.color = T.text;
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = T.sub;
                }
              }}
            >
              <span style={{ display: 'flex', opacity: isActive ? 1 : 0.65 }}>
                {tab.icon}
              </span>
              <div style={{ textAlign: 'left' }}>
                <p style={{
                  fontSize: 13,
                  fontWeight: 800,
                  margin: 0,
                  color: isActive ? T.accent : T.text,
                  letterSpacing: '0.01em',
                }}>
                  {tab.label}
                </p>
                <p style={{
                  fontSize: 10,
                  fontWeight: 600,
                  margin: 0,
                  color: isActive ? T.accent + 'B0' : T.muted,
                  letterSpacing: '0.02em',
                }}>
                  {tab.sublabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT ── */}
      <div>
        {activeTab === 'products'   && <ProductList />}
        {activeTab === 'inventory'  && <InventoryList />}
        {activeTab === 'categories' && <CategoryList />}
      </div>
    </div>
  );
}

export default GoodsHub;
