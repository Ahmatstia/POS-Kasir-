import React, { useState, useEffect, useMemo, useRef } from 'react';
import { T } from '../../theme';
import { getStoreProfile } from '../../services/settings';
import { updateProduct } from '../../services/database';
import {
  generateUniqueBarcode,
  generateNextSequentialBarcode,
  generateBarcodeSvgString,
  BarcodeSvg
} from '../../utils/BarcodeGenerator';
import { useToast } from '../Toast';
import { formatNominal } from '../../utils/format';

// ─── TEMPLATE PRESETS ────────────────────────────────────────────────────────
export const LABEL_TEMPLATES = [
  {
    id: 'thermal_50x30',
    name: 'Stiker Produk (50 × 30 mm) - Rekomendasi Utama',
    category: 'Stiker Produk (Thermal Roll)',
    width: 50,
    height: 30,
    type: 'product',
    barcodeHeight: 22,
    barcodeWidth: 1.25,
    fontSize: 9,
    description: 'Ukuran paling direkomendasikan untuk printer thermal 203 DPI. Barcode EAN-13 leluasa dengan quiet-zone aman.',
  },
  {
    id: 'thermal_40x30',
    name: 'Stiker Produk Mini (40 × 30 mm)',
    category: 'Stiker Produk (Thermal Roll)',
    width: 40,
    height: 30,
    type: 'product',
    barcodeHeight: 19,
    barcodeWidth: 1.1,
    fontSize: 8.5,
    description: 'Ukuran stiker kecil/kompak untuk produk berukuran mini atau printer resolusi tinggi 300 DPI.',
  },
  {
    id: 'shelf_65x35',
    name: 'Label Harga Rak (65 × 35 mm)',
    category: 'Label Rak Minimarket (Thermal Roll)',
    width: 65,
    height: 35,
    type: 'shelf',
    barcodeHeight: 16,
    barcodeWidth: 1.05,
    fontSize: 8,
    description: 'Standar label rak minimarket / supermarket: angka harga utama sangat besar & mencolok.',
  },
  {
    id: 'shelf_80x40',
    name: 'Label Harga Rak Jumbo (80 × 40 mm)',
    category: 'Label Rak Minimarket (Thermal Roll)',
    width: 80,
    height: 40,
    type: 'shelf',
    barcodeHeight: 18,
    barcodeWidth: 1.2,
    fontSize: 8.5,
    description: 'Ukuran jumbo dengan info kategori, varian grosir pack/dus, & barcode audit pegawai toko.',
  },
  {
    id: 'a4_grid_30',
    name: 'Kertas A4 Grid (3 × 10 = 30 Label/Lembar)',
    category: 'Printer Kantor Biasa (Stiker A4 / HVS)',
    width: 64,
    height: 28,
    type: 'a4_grid',
    cols: 3,
    rows: 10,
    barcodeHeight: 17,
    barcodeWidth: 1.05,
    fontSize: 8,
    description: 'Bisa dicetak di printer kantor inkjet/laser biasa menggunakan kertas stiker Tom & Jerry / A4.',
  },
];

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

export default function BarcodeLabelModal({
  products = [],
  categories = [],
  initialProductId = null,
  onClose,
  onProductsUpdated,
}) {
  const { showToast } = useToast();

  // Default to 50x30mm as recommended by 203 DPI thermal calculation
  const [selectedTemplateId, setSelectedTemplateId] = useState('thermal_50x30');
  const [storeName, setStoreName]                   = useState('TOKO BUMBU');
  const [selectedItems, setSelectedItems]           = useState({}); // { [productId]: count }
  const [searchTerm, setSearchTerm]                 = useState('');
  const [filterCat, setFilterCat]                   = useState('');
  const [includeStoreName, setIncludeStoreName]     = useState(true);
  const [includePrice, setIncludePrice]             = useState(true);
  const [includeBarcode, setIncludeBarcode]         = useState(true);
  const [isPrinting, setIsPrinting]                 = useState(false);
  const [activeTab, setActiveTab]                   = useState('selection'); // 'selection' | 'preview'

  // Auto generated barcodes cache in memory for products without barcode
  const [generatedCodes, setGeneratedCodes] = useState({});

  useEffect(() => {
    getStoreProfile().then(p => {
      if (p?.name) setStoreName(p.name);
    });
  }, []);

  // Initialize selected product if passed
  useEffect(() => {
    if (initialProductId) {
      setSelectedItems({ [initialProductId]: 1 });
      setActiveTab('preview');
    }
  }, [initialProductId]);

  const activeTemplate = useMemo(() => {
    return LABEL_TEMPLATES.find(t => t.id === selectedTemplateId) || LABEL_TEMPLATES[0];
  }, [selectedTemplateId]);

  // Get barcode for product (single barcode)
  const getProductBarcode = (prod) => {
    if (prod.barcode && prod.barcode.trim()) return prod.barcode.trim();
    if (generatedCodes[prod.id]) return generatedCodes[prod.id];
    const newCode = generateUniqueBarcode();
    setGeneratedCodes(prev => ({ ...prev, [prod.id]: newCode }));
    return newCode;
  };

  // Get price and unit label for product
  const getUnitPriceInfo = (prod) => {
    if (prod.sell_per_unit === 'kg') {
      return { price: prod.price_kg || 0, unitLabel: 'Kg' };
    }
    return { price: prod.price_pcs || 0, unitLabel: 'Pcs' };
  };

  // Filtered products list for modal search
  const modalProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !searchTerm.trim() ||
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCat = !filterCat || String(p.category_id) === String(filterCat);
      return matchSearch && matchCat;
    });
  }, [products, searchTerm, filterCat]);

  // Total label count
  const totalLabels = useMemo(() => {
    return Object.values(selectedItems).reduce((sum, count) => sum + (Number(count) || 0), 0);
  }, [selectedItems]);

  // Flat list of all label objects to print/preview
  const labelList = useMemo(() => {
    const list = [];
    for (const [prodIdStr, count] of Object.entries(selectedItems)) {
      const qty = Number(count) || 0;
      if (qty <= 0) continue;
      const product = products.find(p => String(p.id) === prodIdStr);
      if (!product) continue;

      const barcode = getProductBarcode(product);
      const { price, unitLabel } = getUnitPriceInfo(product);
      const catObj = categories.find(c => c.id === product.category_id);

      for (let i = 0; i < qty; i++) {
        list.push({
          productId: product.id,
          name: product.name,
          rawName: product.name,
          barcode,
          price,
          unit: unitLabel,
          categoryName: catObj?.name || 'Umum',
          activeUnit: product.sell_per_unit === 'kg' ? 'kg' : 'pcs',
          index: i + 1,
          totalForProd: qty,
        });
      }
    }
    return list;
  }, [selectedItems, products, categories, generatedCodes]);

  // Quantity controllers
  const setQuantity = (prodId, qty) => {
    const n = Math.max(0, parseInt(qty, 10) || 0);
    setSelectedItems(prev => {
      const next = { ...prev };
      if (n === 0) {
        delete next[prodId];
      } else {
        next[prodId] = n;
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const next = { ...selectedItems };
    modalProducts.forEach(p => {
      if (!next[p.id]) next[p.id] = 1;
    });
    setSelectedItems(next);
  };

  const handleSetQtyToStock = () => {
    const next = { ...selectedItems };
    modalProducts.forEach(p => {
      const stock = Math.max(1, p.sell_per_unit === 'kg' ? Math.round(p.stock_kg || 1) : (p.stock || 1));
      next[p.id] = stock;
    });
    setSelectedItems(next);
  };

  const handleClearSelection = () => {
    setSelectedItems({});
  };

  // Save auto-generated barcodes to DB if any products lacked barcodes
  const handlePersistAutoBarcodes = async () => {
    const entries = Object.entries(generatedCodes);
    if (entries.length === 0) return;
    let saved = 0;
    for (const [prodIdStr, code] of entries) {
      const prod = products.find(p => String(p.id) === prodIdStr);
      if (prod && !prod.barcode) {
        await updateProduct(prod.id, { ...prod, barcode: code });
        saved++;
      }
    }
    if (saved > 0) {
      showToast('success', `${saved} barcode otomatis berhasil disimpan ke database produk!`);
      if (onProductsUpdated) onProductsUpdated();
    }
  };

  // Print execution via invisible iframe with pure vector SVG
  const handlePrint = () => {
    if (labelList.length === 0) {
      showToast('error', 'Pilih minimal satu produk untuk dicetak!');
      return;
    }

    setIsPrinting(true);

    try {
      const isA4 = activeTemplate.type === 'a4_grid';
      const wMm = activeTemplate.width;
      const hMm = activeTemplate.height;

      // Generate HTML items
      const itemsHtml = labelList.map(label => {
        const svgBarcodeHtml = includeBarcode
          ? generateBarcodeSvgString(label.barcode, {
              width: activeTemplate.barcodeWidth,
              height: activeTemplate.barcodeHeight,
              fontSize: activeTemplate.fontSize,
              displayValue: true,
            })
          : '';

        if (activeTemplate.type === 'shelf') {
          // ─── SHELF EDGE TAG TEMPLATE (Rak Minimarket) ───
          return `
            <div class="label-shelf" style="width: ${wMm}mm; height: ${hMm}mm;">
              <div class="shelf-header">
                <span class="shelf-cat">${escapeHtml(label.categoryName)}</span>
                <span class="shelf-store">${includeStoreName ? escapeHtml(storeName) : ''}</span>
              </div>
              <div class="shelf-body">
                <div class="shelf-info">
                  <div class="shelf-name">${escapeHtml(label.rawName)}</div>
                  <div class="shelf-price-box">
                    <span class="currency">Rp</span>
                    <span class="price-val">${Number(label.price).toLocaleString('id-ID')}</span>
                    <span class="price-unit">/${label.unit}</span>
                  </div>
                  ${label.pricePack > 0 ? `<div class="shelf-grosir">Pack: Rp ${Number(label.pricePack).toLocaleString('id-ID')} (${label.pcsPerPack} Pcs)</div>` : ''}
                </div>
                <div class="shelf-barcode-side">
                  ${svgBarcodeHtml}
                </div>
              </div>
            </div>
          `;
        } else if (isA4) {
          // ─── A4 GRID ITEM ───
          return `
            <div class="label-a4-cell">
              ${includeStoreName ? `<div class="p-store">${escapeHtml(storeName)}</div>` : ''}
              <div class="p-name">${escapeHtml(label.name)}</div>
              ${includePrice ? `<div class="p-price">Rp ${Number(label.price).toLocaleString('id-ID')} <span class="p-unit">/${label.unit}</span></div>` : ''}
              <div class="p-barcode">${svgBarcodeHtml}</div>
            </div>
          `;
        } else {
          // ─── PRODUCT STICKER (50x30 / 40x30 mm) ───
          return `
            <div class="label-product" style="width: ${wMm}mm; height: ${hMm}mm;">
              ${includeStoreName ? `<div class="p-store">${escapeHtml(storeName)}</div>` : ''}
              <div class="p-name">${escapeHtml(label.name)}</div>
              ${includePrice ? `<div class="p-price">Rp ${Number(label.price).toLocaleString('id-ID')} <span class="p-unit">/${label.unit}</span></div>` : ''}
              <div class="p-barcode">${svgBarcodeHtml}</div>
            </div>
          `;
        }
      });

      // Construct print page structure
      let bodyHtml = '';
      if (isA4) {
        const pageSize = 30;
        const pages = [];
        for (let i = 0; i < itemsHtml.length; i += pageSize) {
          pages.push(itemsHtml.slice(i, i + pageSize));
        }
        bodyHtml = pages.map(pageItems => `
          <div class="a4-page">
            <div class="a4-grid">
              ${pageItems.join('')}
            </div>
          </div>
        `).join('');
      } else {
        bodyHtml = itemsHtml.join('');
      }

      const printStyles = `
        @page {
          size: ${isA4 ? 'A4 portrait' : `${wMm}mm ${hMm}mm`};
          margin: ${isA4 ? '8mm 6mm' : '0'};
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #000000;
        }

        /* ── THERMAL STICKER (PRODUCT) ── */
        .label-product {
          box-sizing: border-box;
          padding: 1.5mm 2.5mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          text-align: center;
          page-break-after: always;
          break-after: page;
          overflow: hidden;
        }
        .p-store {
          font-size: 7pt;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #333;
          line-height: 1;
          margin-bottom: 0.8mm;
        }
        .p-name {
          font-size: 8.5pt;
          font-weight: 800;
          line-height: 1.15;
          max-height: 2.3em;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          margin-bottom: 0.8mm;
        }
        .p-price {
          font-size: 10.5pt;
          font-weight: 900;
          font-family: 'JetBrains Mono', monospace, Arial;
          line-height: 1;
          margin-bottom: 1mm;
        }
        .p-unit {
          font-size: 7pt;
          font-weight: 700;
          color: #444;
        }
        .p-barcode {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
        }
        .p-barcode svg {
          max-width: 100%;
          height: auto;
          display: block;
        }

        /* ── SHELF EDGE TAG (LABEL RAK) ── */
        .label-shelf {
          box-sizing: border-box;
          padding: 2mm 3.5mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          page-break-after: always;
          break-after: page;
          overflow: hidden;
          border: 1px solid #000000;
        }
        .shelf-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1.5px solid #000;
          padding-bottom: 1mm;
          margin-bottom: 1.5mm;
        }
        .shelf-cat {
          font-size: 7.5pt;
          font-weight: 800;
          text-transform: uppercase;
          background: #000;
          color: #fff;
          padding: 0.5mm 1.5mm;
          border-radius: 1mm;
        }
        .shelf-store {
          font-size: 7pt;
          font-weight: 700;
          text-transform: uppercase;
          color: #333;
        }
        .shelf-body {
          display: flex;
          gap: 2mm;
          align-items: center;
          justify-content: space-between;
          flex: 1;
        }
        .shelf-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .shelf-name {
          font-size: 10pt;
          font-weight: 800;
          line-height: 1.15;
          margin-bottom: 1.5mm;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        .shelf-price-box {
          font-family: 'JetBrains Mono', monospace, Arial;
          line-height: 1;
          display: flex;
          align-items: baseline;
          gap: 1mm;
        }
        .currency {
          font-size: 9pt;
          font-weight: 800;
        }
        .price-val {
          font-size: 17pt;
          font-weight: 900;
          letter-spacing: -0.03em;
        }
        .price-unit {
          font-size: 8pt;
          font-weight: 700;
          color: #444;
        }
        .shelf-grosir {
          font-size: 6.5pt;
          font-weight: 700;
          color: #444;
          margin-top: 1mm;
        }
        .shelf-barcode-side {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          max-width: 28mm;
        }
        .shelf-barcode-side svg {
          max-width: 100%;
          height: auto;
        }

        /* ── A4 GRID LAYOUT ── */
        .a4-page {
          width: 100%;
          page-break-after: always;
          break-after: page;
          box-sizing: border-box;
        }
        .a4-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-auto-rows: 27mm;
          gap: 2mm 3mm;
          width: 100%;
        }
        .label-a4-cell {
          box-sizing: border-box;
          border: 0.5px dashed #bbb;
          padding: 1.5mm 2mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          text-align: center;
          overflow: hidden;
        }
      `;

      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Cetak Label Barcode - ${escapeHtml(storeName)}</title>
          <style>${printStyles}</style>
        </head>
        <body>
          ${bodyHtml}
        </body>
        </html>
      `;

      // Use hidden iframe to avoid intrusive popup blocks
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow.document;
      frameDoc.open();
      frameDoc.write(fullHtml);
      frameDoc.close();

      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setIsPrinting(false);
        showToast('success', `${labelList.length} label berhasil dikirim ke printer!`);

        // Automatically persist any auto-generated barcodes in background
        handlePersistAutoBarcodes();

        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }, 400);

    } catch (err) {
      console.error('Gagal mencetak label:', err);
      showToast('error', 'Gagal memproses cetak label: ' + err.message);
      setIsPrinting(false);
    }
  };

  const escapeHtml = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 120,
        background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Syne, sans-serif', animation: 'fadeOverlay 0.2s ease both',
        padding: 16,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 1060, height: '92vh',
        background: T.surface, border: `1px solid ${T.border2}`,
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.65)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* ─── MODAL HEADER ─── */}
        <div style={{
          padding: '16px 22px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, background: T.bg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: T.accent + '15', border: `1px solid ${T.accent}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.accent,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5v14M6 5v14M9 5v14M13 5v14M16 5v14M20 5v14"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.accent, margin: 0 }}>
                Fitur Pencetakan Toko Profesional
              </p>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: T.text, margin: 0 }}>
                Cetak Label Harga Rak & Barcode Multi-Satuan
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              padding: '6px 12px', borderRadius: 8, background: T.surface,
              border: `1px solid ${T.border2}`, fontSize: 11, fontWeight: 700, color: T.sub,
            }}>
              Ukuran Kertas: <span style={{ color: T.accent }}>{activeTemplate.name}</span>
            </div>

            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border2}`,
                background: 'transparent', color: T.sub, cursor: 'pointer', fontSize: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* ─── MODAL TABS ─── */}
        <div style={{
          padding: '0 22px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: T.card, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setActiveTab('selection')}
              style={{
                padding: '12px 16px', background: 'transparent', border: 'none',
                borderBottom: `2px solid ${activeTab === 'selection' ? T.accent : 'transparent'}`,
                color: activeTab === 'selection' ? T.accent : T.muted,
                fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span>1. Pilih Produk, Satuan & Jumlah</span>
              <span style={{
                padding: '2px 7px', borderRadius: 100, fontSize: 10, fontWeight: 800,
                background: totalLabels > 0 ? T.accent + '25' : T.border,
                color: totalLabels > 0 ? T.accent : T.muted,
              }}>
                {totalLabels}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              style={{
                padding: '12px 16px', background: 'transparent', border: 'none',
                borderBottom: `2px solid ${activeTab === 'preview' ? T.accent : 'transparent'}`,
                color: activeTab === 'preview' ? T.accent : T.muted,
                fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span>2. Format & Pratinjau Cetak</span>
              <span style={{
                padding: '2px 7px', borderRadius: 100, fontSize: 10, fontWeight: 800,
                background: T.green + '20', color: T.green,
              }}>
                WYSIWYG
              </span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: T.sub }}>Siap Cetak: <strong style={{ color: T.text }}>{labelList.length} Lembar</strong></span>
            <button
              onClick={handlePrint}
              disabled={isPrinting || labelList.length === 0}
              style={{
                padding: '8px 18px', borderRadius: 10,
                border: `1px solid ${labelList.length > 0 ? T.green + '50' : T.border2}`,
                background: labelList.length > 0 ? T.green : T.border,
                color: labelList.length > 0 ? '#0B120E' : T.muted,
                fontSize: 12, fontWeight: 800, cursor: labelList.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              {isPrinting ? 'Menyiapkan…' : 'Cetak Label Sekarang'}
            </button>
          </div>
        </div>

        {/* ─── TAB 1: PRODUCT SELECTION & QUANTITIES ─── */}
        {activeTab === 'selection' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Toolbar filter */}
            <div style={{
              padding: '12px 22px', borderBottom: `1px solid ${T.border}`,
              background: T.surface, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Cari nama produk atau scan barcode…"
                  style={{
                    width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8,
                    border: `1px solid ${T.border2}`, background: T.bg, color: T.text,
                    fontFamily: 'Syne, sans-serif', fontSize: 12, outline: 'none',
                  }}
                />
                <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>

              <select
                value={filterCat}
                onChange={e => setFilterCat(e.target.value)}
                style={{
                  padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border2}`,
                  background: T.bg, color: T.text, fontSize: 12, outline: 'none', cursor: 'pointer',
                }}
              >
                <option value="">Semua Kategori</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  style={{
                    padding: '7px 12px', borderRadius: 8, border: `1px solid ${T.blue}35`,
                    background: T.blue + '12', color: T.blue, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  + Pilih Semua ({modalProducts.length})
                </button>
                <button
                  type="button"
                  onClick={handleSetQtyToStock}
                  style={{
                    padding: '7px 12px', borderRadius: 8, border: `1px solid ${T.purple}35`,
                    background: T.purple + '12', color: T.purple, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}
                  title="Otomatis isi jumlah cetak per barang sesuai jumlah stok saat ini di toko"
                >
                  ⚡ Sesuai Jumlah Stok
                </button>
                {totalLabels > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    style={{
                      padding: '7px 12px', borderRadius: 8, border: `1px solid ${T.red}35`,
                      background: T.red + '12', color: T.red, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Table of products */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: T.surface, zIndex: 2 }}>
                  <tr style={{ borderBottom: `1px solid ${T.border}`, fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 8px' }}>Pilih</th>
                    <th style={{ padding: '12px 8px' }}>Nama Produk</th>
                    <th style={{ padding: '12px 8px' }}>Satuan</th>
                    <th style={{ padding: '12px 8px' }}>Barcode</th>
                    <th style={{ padding: '12px 8px' }}>Harga Cetak</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center' }}>Jumlah Lembar</th>
                  </tr>
                </thead>
                <tbody>
                  {modalProducts.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>
                        Tidak ada produk yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    modalProducts.map(prod => {
                      const qty = selectedItems[prod.id] || 0;
                      const isSelected = qty > 0;
                      const isKg = prod.sell_per_unit === 'kg';
                      const { price, unitLabel } = getUnitPriceInfo(prod);
                      const barcodeVal = getProductBarcode(prod);

                      return (
                        <tr
                          key={prod.id}
                          style={{
                            borderBottom: `1px solid ${T.border}`,
                            background: isSelected ? T.accent + '08' : 'transparent',
                            transition: 'background 0.1s',
                          }}
                        >
                          <td style={{ padding: '10px 8px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => setQuantity(prod.id, e.target.checked ? 1 : 0)}
                              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: T.accent }}
                            />
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{prod.name}</div>
                            <div style={{ fontSize: 10, color: T.muted }}>
                              {categories.find(c => c.id === prod.category_id)?.name || 'Umum'} · Stok: {isKg ? `${Number(prod.stock_kg || 0).toFixed(2)} Kg` : `${prod.stock || 0} Pcs`}
                            </div>
                          </td>

                          {/* Satuan Badge */}
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{
                              display: 'inline-block', padding: '3px 8px', borderRadius: 6,
                              fontSize: 10, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
                              background: isKg ? T.purple + '15' : T.blue + '15',
                              color: isKg ? T.purple : T.blue,
                            }}>
                              {unitLabel}
                            </span>
                          </td>

                          <td style={{ padding: '10px 8px' }}>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: T.text, fontWeight: 700 }}>
                              {barcodeVal}
                            </span>
                          </td>

                          <td style={{ padding: '10px 8px' }}>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: T.text }}>
                              {fmt(price)}
                            </span>
                            <span style={{ fontSize: 10, color: T.muted, marginLeft: 3 }}>/{unitLabel}</span>
                          </td>

                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => setQuantity(prod.id, qty - 1)}
                                style={{
                                  width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.border2}`,
                                  background: T.surface, color: T.sub, cursor: 'pointer', fontSize: 14, fontWeight: 700,
                                }}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={qty}
                                onChange={e => setQuantity(prod.id, e.target.value)}
                                style={{
                                  width: 48, padding: '4px', textAlign: 'center', borderRadius: 6,
                                  border: `1px solid ${isSelected ? T.accent : T.border2}`, background: T.bg,
                                  color: T.text, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700,
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setQuantity(prod.id, qty + 1)}
                                style={{
                                  width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.border2}`,
                                  background: T.surface, color: T.sub, cursor: 'pointer', fontSize: 14, fontWeight: 700,
                                }}
                              >
                                +
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom bar in selection tab */}
            <div style={{
              padding: '12px 22px', borderTop: `1px solid ${T.border}`,
              background: T.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: T.sub }}>
                {Object.keys(selectedItems).length} produk terpilih · Total {totalLabels} lembar stiker/label
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                disabled={totalLabels === 0}
                style={{
                  padding: '9px 18px', borderRadius: 10,
                  border: `1px solid ${totalLabels > 0 ? T.accent + '40' : T.border2}`,
                  background: totalLabels > 0 ? T.accent : T.border,
                  color: totalLabels > 0 ? '#FFFFFF' : T.muted,
                  fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 800, cursor: totalLabels > 0 ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                Lanjut ke Pratinjau Desain →
              </button>
            </div>
          </div>
        )}

        {/* ─── TAB 2: TEMPLATE SETTINGS & LIVE WYSIWYG PREVIEW ─── */}
        {activeTab === 'preview' && (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '330px 1fr', minHeight: 0 }}>
            {/* Left Controls Panel */}
            <div style={{
              padding: 18, borderRight: `1px solid ${T.border}`,
              overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, background: T.surface,
            }}>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>
                  Pilih Format Template Kertas
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {LABEL_TEMPLATES.map(tmpl => {
                    const active = selectedTemplateId === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => setSelectedTemplateId(tmpl.id)}
                        style={{
                          padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                          border: `1.5px solid ${active ? T.accent : T.border2}`,
                          background: active ? T.accent + '10' : T.bg,
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: active ? T.accent : T.text }}>
                            {tmpl.name}
                          </span>
                        </div>
                        <p style={{ fontSize: 9.5, color: T.sub, margin: 0, lineHeight: 1.3 }}>
                          {tmpl.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Store & Content Options */}
              <div style={{ padding: '12px 14px', borderRadius: 12, background: T.bg, border: `1px solid ${T.border2}` }}>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>
                  Pengaturan Konten Label
                </label>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 9, color: T.sub, marginBottom: 4 }}>Nama Toko Header:</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    style={{
                      width: '100%', padding: '6px 10px', borderRadius: 6,
                      border: `1px solid ${T.border2}`, background: T.surface, color: T.text,
                      fontSize: 11, fontFamily: 'Syne, sans-serif', outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: T.text, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includeStoreName}
                      onChange={e => setIncludeStoreName(e.target.checked)}
                      style={{ accentColor: T.accent }}
                    />
                    Tampilkan Nama Toko
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: T.text, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includePrice}
                      onChange={e => setIncludePrice(e.target.checked)}
                      style={{ accentColor: T.accent }}
                    />
                    Tampilkan Harga Jual
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: T.text, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includeBarcode}
                      onChange={e => setIncludeBarcode(e.target.checked)}
                      style={{ accentColor: T.accent }}
                    />
                    Tampilkan Gambar Barcode SVG
                  </label>
                </div>
              </div>

              {/* Material information note */}
              <div style={{
                padding: '10px 12px', borderRadius: 10, background: T.blue + '10',
                border: `1px solid ${T.blue}25`, fontSize: 10, color: T.blue, lineHeight: 1.45,
              }}>
                <strong style={{ display: 'block', marginBottom: 3 }}>💡 Edukasi Jenis Kertas:</strong>
                Kertas <em>Direct Thermal</em> (tanpa pita ribbon) peka terhadap panas/cahaya dan tahan ± 6–12 bulan (sangat cocok untuk label rak yang harganya berkala diperbarui). Untuk stiker kemasan produk jangka panjang di gudang, gunakan kertas <em>Thermal Transfer</em> (dengan ribbon) atau kertas stiker HVS A4.
              </div>
            </div>

            {/* Right WYSIWYG Preview Stage */}
            <div style={{
              flex: 1, padding: 24, overflowY: 'auto',
              background: '#0D1117', display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <div style={{ marginBottom: 16, textAlign: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: T.accent, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Pratinjau Nyata (WYSIWYG)
                </span>
                <p style={{ fontSize: 12, color: T.muted, margin: '2px 0 0 0' }}>
                  Label akan dicetak presisi dalam vektor murni tanpa blur
                </p>
              </div>

              {labelList.length === 0 ? (
                <div style={{
                  padding: 40, border: `1px dashed ${T.border2}`, borderRadius: 16,
                  color: T.muted, textAlign: 'center', maxWidth: 360,
                }}>
                  <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Belum ada produk yang dipilih</p>
                  <button
                    onClick={() => setActiveTab('selection')}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.accent}`,
                      background: T.accent + '15', color: T.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    Kembali & Pilih Produk
                  </button>
                </div>
              ) : activeTemplate.type === 'a4_grid' ? (
                /* ── A4 GRID PREVIEW ── */
                <div style={{
                  width: 595, minHeight: 842, background: '#FFFFFF', color: '#000000',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)', padding: '24px 18px',
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px 8px',
                  borderRadius: 2, boxSizing: 'border-box',
                }}>
                  {labelList.slice(0, 30).map((label, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: '1px dashed #CCCCCC', padding: '6px 8px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'space-between', textAlign: 'center', height: 75,
                        boxSizing: 'border-box',
                      }}
                    >
                      {includeStoreName && (
                        <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', color: '#444' }}>
                          {storeName}
                        </div>
                      )}
                      <div style={{ fontSize: 9, fontWeight: 800, lineHeight: 1.15, maxHeight: '2.2em', overflow: 'hidden' }}>
                        {label.name}
                      </div>
                      {includePrice && (
                        <div style={{ fontSize: 11, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace' }}>
                          Rp {Number(label.price).toLocaleString('id-ID')}
                          <span style={{ fontSize: 8, fontWeight: 600, color: '#555', marginLeft: 2 }}>/{label.unit}</span>
                        </div>
                      )}
                      {includeBarcode && (
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                          <BarcodeSvg value={label.barcode} width={1.0} height={16} fontSize={8} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : activeTemplate.type === 'shelf' ? (
                /* ── SHELF EDGE TAG PREVIEW ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {labelList.slice(0, 6).map((label, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: activeTemplate.width * 5.5,
                        height: activeTemplate.height * 5.5,
                        background: '#FFFFFF', color: '#000000',
                        border: '2px solid #000000', borderRadius: 4,
                        padding: '10px 14px', boxSizing: 'border-box',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #000', paddingBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, background: '#000', color: '#FFF', padding: '1px 6px', borderRadius: 3, textTransform: 'uppercase' }}>
                          {label.categoryName}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#444' }}>
                          {includeStoreName ? storeName : ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1, gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                            {label.rawName}
                          </div>
                          {includePrice && (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, fontFamily: 'JetBrains Mono, monospace' }}>
                              <span style={{ fontSize: 11, fontWeight: 800 }}>Rp</span>
                              <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em' }}>
                                {Number(label.price).toLocaleString('id-ID')}
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#444' }}>/{label.unit}</span>
                            </div>
                          )}
                          {label.pricePack > 0 && (
                            <div style={{ fontSize: 9, fontWeight: 700, color: '#555', marginTop: 2 }}>
                              Pack: Rp {Number(label.pricePack).toLocaleString('id-ID')} ({label.pcsPerPack} Pcs)
                            </div>
                          )}
                        </div>
                        {includeBarcode && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 140 }}>
                            <BarcodeSvg value={label.barcode} width={1.05} height={18} fontSize={8} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {labelList.length > 6 && (
                    <div style={{ color: T.muted, fontSize: 11, textAlign: 'center' }}>
                      + {labelList.length - 6} label lainnya akan dicetak berurutan
                    </div>
                  )}
                </div>
              ) : (
                /* ── PRODUCT STICKER PREVIEW (50x30 / 40x30 mm) ── */
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
                  {labelList.slice(0, 8).map((label, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: activeTemplate.width * 5.2,
                        height: activeTemplate.height * 5.2,
                        background: '#FFFFFF', color: '#000000',
                        borderRadius: 6, padding: '8px 10px', boxSizing: 'border-box',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'space-between', textAlign: 'center',
                        boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      {includeStoreName && (
                        <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#444', lineHeight: 1 }}>
                          {storeName}
                        </div>
                      )}
                      <div style={{
                        fontSize: 10.5, fontWeight: 800, lineHeight: 1.2,
                        maxHeight: '2.4em', overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {label.name}
                      </div>
                      {includePrice && (
                        <div style={{ fontSize: 12.5, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
                          Rp {Number(label.price).toLocaleString('id-ID')}
                          <span style={{ fontSize: 8.5, fontWeight: 700, color: '#555', marginLeft: 2 }}>/{label.unit}</span>
                        </div>
                      )}
                      {includeBarcode && (
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                          <BarcodeSvg
                            value={label.barcode}
                            width={activeTemplate.barcodeWidth}
                            height={activeTemplate.barcodeHeight}
                            fontSize={activeTemplate.fontSize}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  {labelList.length > 8 && (
                    <div style={{ width: '100%', color: T.muted, fontSize: 11, textAlign: 'center' }}>
                      + {labelList.length - 8} label lainnya akan dicetak secara berurutan
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
