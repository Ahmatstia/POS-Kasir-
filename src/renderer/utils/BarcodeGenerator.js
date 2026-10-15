import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

/**
 * Menghitung check digit untuk format EAN-13
 * @param {string} code12 - 12 digit pertama barcode
 * @returns {number} 1 digit check digit (0-9)
 */
export function calculateEan13CheckDigit(code12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code12[i], 10) || 0;
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Membuat nomor barcode internal toko otomatis (EAN-13) berurutan (Sequential Counter)
 * Menggunakan prefix '20' (standar GS1 untuk in-store circulation / nomor internal toko)
 * Ditambah 10 digit counter berurutan + 1 digit check digit resmi EAN-13.
 * Contoh hasil: 2000000001017, 2000000001024
 */
export async function generateNextSequentialBarcode() {
  try {
    let currentSeq = 101;
    if (typeof window !== 'undefined' && window.electronAPI) {
      const rows = await window.electronAPI.query("SELECT value FROM settings WHERE key = 'last_barcode_seq'");
      if (rows && rows.length > 0 && rows[0].value) {
        currentSeq = parseInt(rows[0].value, 10) + 1;
      }
      await window.electronAPI.run(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('last_barcode_seq', ?)",
        [String(currentSeq)]
      );
    }
    const padded = String(currentSeq).padStart(10, '0');
    const base12 = `20${padded}`;
    const checkDigit = calculateEan13CheckDigit(base12);
    return `${base12}${checkDigit}`;
  } catch (e) {
    console.error('Error generating sequential barcode, falling back to deterministic:', e);
    return generateUniqueBarcode();
  }
}

/**
 * Fallback generator barcode EAN-13 cepat
 * @returns {string} 13 digit string barcode EAN-13 valid
 */
export function generateUniqueBarcode() {
  const timeStr = String(Date.now()).slice(-8); // 8 digit
  const randomStr = String(Math.floor(10 + Math.random() * 90)); // 2 digit
  const base12 = `20${timeStr}${randomStr}`;
  const checkDigit = calculateEan13CheckDigit(base12);
  return `${base12}${checkDigit}`;
}

/**
 * Menghasilkan string HTML <svg> barcode untuk keperluan cetak / thermal print
 * @param {string} value - Kode barcode yang akan di-render
 * @param {object} options - Opsi ukuran, tinggi, dan tampilan
 * @returns {string} SVG HTML string
 */
export function generateBarcodeSvgString(value, options = {}) {
  if (!value || typeof document === 'undefined') return '';
  const valStr = String(value).trim();
  if (!valStr) return '';

  const format = options.format || (valStr.length === 13 && /^\d+$/.test(valStr) ? 'EAN13' : 'CODE128');

  try {
    const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svgNode, valStr, {
      format,
      width: options.width || 1.6,
      height: options.height || 36,
      displayValue: options.displayValue !== undefined ? options.displayValue : true,
      fontSize: options.fontSize || 11,
      font: options.font || 'JetBrains Mono, monospace',
      textMargin: options.textMargin || 2,
      margin: options.margin || 0,
      background: 'transparent',
      lineColor: '#000000',
    });
    return svgNode.outerHTML;
  } catch (err) {
    // Fallback otomatis ke CODE128 jika EAN13 gagal validasi
    try {
      const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      JsBarcode(svgNode, valStr, {
        format: 'CODE128',
        width: options.width || 1.4,
        height: options.height || 36,
        displayValue: options.displayValue !== undefined ? options.displayValue : true,
        fontSize: options.fontSize || 10,
        font: options.font || 'JetBrains Mono, monospace',
        textMargin: options.textMargin || 2,
        margin: options.margin || 0,
        background: 'transparent',
        lineColor: '#000000',
      });
      return svgNode.outerHTML;
    } catch (e) {
      console.error('Gagal generate barcode SVG:', e);
      return '';
    }
  }
}

/**
 * Komponen React Barcode SVG
 * Menampilkan barcode secara real-time pada UI React
 */
export function BarcodeSvg({
  value,
  width = 1.6,
  height = 36,
  displayValue = true,
  fontSize = 11,
  style = {},
  className = '',
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    const valStr = String(value).trim();
    if (!valStr) return;

    const format = (valStr.length === 13 && /^\d+$/.test(valStr)) ? 'EAN13' : 'CODE128';

    try {
      JsBarcode(svgRef.current, valStr, {
        format,
        width,
        height,
        displayValue,
        fontSize,
        font: 'JetBrains Mono, monospace',
        textMargin: 2,
        margin: 0,
        background: 'transparent',
        lineColor: '#000000',
      });
    } catch (err) {
      try {
        JsBarcode(svgRef.current, valStr, {
          format: 'CODE128',
          width: Math.max(1, width - 0.2),
          height,
          displayValue,
          fontSize: Math.max(9, fontSize - 1),
          font: 'JetBrains Mono, monospace',
          textMargin: 2,
          margin: 0,
          background: 'transparent',
          lineColor: '#000000',
        });
      } catch (e) {
        console.error('BarcodeSvg error:', e);
      }
    }
  }, [value, width, height, displayValue, fontSize]);

  if (!value) return null;

  return (
    <svg
      ref={svgRef}
      className={className}
      style={{ display: 'block', maxWidth: '100%', height: 'auto', ...style }}
    />
  );
}

/**
 * Efek Suara Beep Scanner Kasir (Web Audio API)
 * Memutar suara beep 'bip' pendek yang memuaskan saat barcode sukses discan
 */
export function playScannerBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1750, ctx.currentTime); // 1.75 kHz (frekuensi scanner supermarket)
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    // Ignore audio error if audio blocked by browser policy
  }
}
