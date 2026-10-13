// Utility untuk mencetak struk
export const printReceipt = (transaction, items, storeProfile = null) => {
  const store = {
    name: storeProfile?.name || 'TOKO BUMBU',
    address: storeProfile?.address || 'Jl. Imam Bonjol, Muara Sabak Barat, Tanjung Jabung Timur',
    phone: storeProfile?.phone || '0822-8324-8946',
    footer: storeProfile?.footer || 'Selamat Belanja Kembali',
  };

  // Format tanggal - created_at disimpan sebagai waktu lokal WIB
  // Ganti spasi dengan 'T' agar browser tidak salah parse sebagai UTC
  const rawDt = transaction.created_at || '';
  const normalized = typeof rawDt === 'string' ? rawDt.replace(' ', 'T') : rawDt;
  const date = new Date(normalized);
  const formattedDate = isNaN(date.getTime()) ? rawDt : date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Format harga
  const formatPrice = (price) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  const escapeHtml = (text) => {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Buat konten struk HTML
  const receiptContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Struk Pembayaran</title>
      <style>
        @page {
          size: auto;
          margin: 10mm;
        }
        body {
          font-family: 'Courier New', monospace;
          width: 300px;
          margin: 0 auto;
          padding: 20px;
          font-size: 14px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 1px dashed #000;
          padding-bottom: 10px;
        }
        .header h2 {
          margin: 0;
          font-size: 18px;
        }
        .header p {
          margin: 5px 0;
          font-size: 12px;
        }
        .invoice {
          text-align: center;
          margin-bottom: 15px;
        }
        .invoice h3 {
          margin: 0;
          font-size: 16px;
        }
        .items {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .items th {
          text-align: left;
          border-bottom: 1px solid #000;
          padding-bottom: 5px;
        }
        .items td {
          padding: 3px 0;
        }
        .items td:last-child {
          text-align: right;
        }
        .total {
          border-top: 1px solid #000;
          padding-top: 10px;
          margin-top: 10px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .grand-total {
          font-weight: bold;
          font-size: 16px;
          border-top: 1px dashed #000;
          padding-top: 10px;
          margin-top: 10px;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          border-top: 1px dashed #000;
          padding-top: 10px;
          font-size: 12px;
        }
        .thankyou {
          text-align: center;
          margin-top: 10px;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>${escapeHtml(store.name)}</h2>
        ${store.address ? `<p>${escapeHtml(store.address)}</p>` : ''}
        ${store.phone ? `<p>Telp: ${escapeHtml(store.phone)}</p>` : ''}
      </div>
      
      <div class="invoice">
        <h3>STRUK PEMBAYARAN</h3>
        <p>No. ${escapeHtml(transaction.invoice_no)}</p>
        <p>${escapeHtml(formattedDate)}</p>
        ${transaction.customer_name ? `<p>Pelanggan: ${escapeHtml(transaction.customer_name)}</p>` : ''}
      </div>

      <table class="items">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Harga</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${escapeHtml(item.product_name)}</td>
              <td>${item.quantity} ${escapeHtml(item.unit)}</td>
              <td>${formatPrice(item.price_per_unit)}</td>
              <td>${formatPrice(item.subtotal)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="total">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>${formatPrice(transaction.subtotal)}</span>
        </div>
        ${transaction.discount > 0 ? `
        <div class="total-row">
          <span>Diskon:</span>
          <span>-${formatPrice(transaction.discount)}</span>
        </div>` : ''}
        <div class="grand-total total-row">
          <span>TOTAL:</span>
          <span>${formatPrice(transaction.total_amount)}</span>
        </div>
        ${transaction.payment_method === 'kasbon' ? `
        <div class="total-row" style="color: #c00; font-weight: bold; border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px;">
          <span>STATUS NOTA:</span>
          <span>KASBON (BELUM LUNAS)</span>
        </div>
        <div class="total-row">
          <span>Uang Muka / DP:</span>
          <span>${formatPrice(transaction.payment_amount)}</span>
        </div>
        <div class="total-row" style="font-weight: bold;">
          <span>Sisa Kasbon:</span>
          <span>${formatPrice(Math.max(0, transaction.total_amount - transaction.payment_amount))}</span>
        </div>` : `
        <div class="total-row">
          <span>Bayar:</span>
          <span>${formatPrice(transaction.payment_amount)}</span>
        </div>
        <div class="total-row">
          <span>Kembali:</span>
          <span>${formatPrice(transaction.change_amount)}</span>
        </div>`}
      </div>

      <div class="footer">
        <p>Metode: ${transaction.payment_method === 'kasbon' ? 'KASBON (UTANG PELANGGAN)' : transaction.payment_method === 'cash' ? 'TUNAI' : transaction.payment_method === 'debit' ? 'DEBIT' : 'QRIS'}</p>
      </div>

      <div class="thankyou">
        <p>Terima Kasih</p>
        <p>${escapeHtml(store.footer)}</p>
      </div>
    </body>
    </html>
  `;

  // Buka jendela cetak
  const printWindow = window.open('', '_blank');
  printWindow.document.write(receiptContent);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};

// Fungsi untuk cetak struk thermal (ukuran kecil)
export const printThermalReceipt = (transaction, items, storeProfile = null) => {
  const store = {
    name: storeProfile?.name || 'TOKO BUMBU',
    address: storeProfile?.address || '',
    phone: storeProfile?.phone || '',
    footer: storeProfile?.footer || 'Selamat Belanja Kembali',
  };

  // Format tanggal - created_at disimpan sebagai waktu lokal WIB
  const rawDt = transaction.created_at || '';
  const normalized = typeof rawDt === 'string' ? rawDt.replace(' ', 'T') : rawDt;
  const date = new Date(normalized);
  const formattedDate = isNaN(date.getTime()) ? rawDt : date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const formatPrice = (price) => {
    return `Rp${price.toLocaleString('id-ID')}`;
  };

  const escapeHtml = (text) => {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Untuk printer thermal 58mm
  const receiptContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: auto;
          margin: 0mm;
        }
        body {
          font-family: 'Arial', monospace;
          width: 58mm;
          margin: 0;
          padding: 4px;
          font-size: 10px;
        }
        .center {
          text-align: center;
        }
        .line {
          border-top: 1px dashed #000;
          margin: 4px 0;
        }
        table {
          width: 100%;
          font-size: 9px;
        }
        td:last-child {
          text-align: right;
        }
      </style>
    </head>
    <body>
      <div class="center">
        <h3 style="margin:0">${escapeHtml(store.name)}</h3>
        ${store.address ? `<p style="margin:2px 0;font-size:8px">${escapeHtml(store.address)}</p>` : ''}
        ${store.phone ? `<p style="margin:2px 0;font-size:8px">Telp: ${escapeHtml(store.phone)}</p>` : ''}
        <div class="line"></div>
        <p style="margin:2px 0">${escapeHtml(transaction.invoice_no)}</p>
        <p style="margin:2px 0">${formattedDate}</p>
        ${transaction.customer_name ? `<p style="margin:2px 0;font-size:9px">Pelanggan: ${escapeHtml(transaction.customer_name)}</p>` : ''}
      </div>
      <div class="line"></div>
      <table>
        ${items.map(item => `
          <tr>
            <td colspan="2">${escapeHtml(item.product_name)}</td>
          </tr>
          <tr>
            <td>${item.quantity} ${escapeHtml(item.unit)} x ${formatPrice(item.price_per_unit)}</td>
            <td>${formatPrice(item.subtotal)}</td>
          </tr>
        `).join('')}
      </table>
      <div class="line"></div>
      <table>
        <tr><td>Subtotal</td><td>${formatPrice(transaction.subtotal)}</td></tr>
        ${transaction.discount > 0 ? `<tr><td>Diskon</td><td>-${formatPrice(transaction.discount)}</td></tr>` : ''}
        <tr><td><b>TOTAL</b></td><td><b>${formatPrice(transaction.total_amount)}</b></td></tr>
        ${transaction.payment_method === 'kasbon' ? `
        <tr><td colspan="2" style="font-weight:bold;color:#c00">STATUS: KASBON</td></tr>
        <tr><td>Uang Muka / DP</td><td>${formatPrice(transaction.payment_amount)}</td></tr>
        <tr><td><b>Sisa Kasbon</b></td><td><b>${formatPrice(Math.max(0, transaction.total_amount - transaction.payment_amount))}</b></td></tr>
        ` : `
        <tr><td>Tunai</td><td>${formatPrice(transaction.payment_amount)}</td></tr>
        <tr><td>Kembali</td><td>${formatPrice(transaction.change_amount)}</td></tr>
        `}
      </table>
      <div class="center" style="margin-top:6px">
        <p style="margin:2px 0">Metode: ${transaction.payment_method === 'kasbon' ? 'KASBON' : transaction.payment_method.toUpperCase()}</p>
        <p style="margin:2px 0">Terima Kasih</p>
        <p style="margin:2px 0;font-style:italic">${escapeHtml(store.footer)}</p>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(receiptContent);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};

// ─── PRINT BUKTI PEMBAYARAN KASBON ───────────────────────────────────────────
export const printDebtPaymentReceipt = (payment, customer, remainingDebt, storeProfile = null) => {
  const store = {
    name: storeProfile?.name || 'TOKO BUMBU',
    address: storeProfile?.address || 'Jl. Imam Bonjol, Muara Sabak Barat, Tanjung Jabung Timur',
    phone: storeProfile?.phone || '0822-8324-8946',
  };
  const formatPrice = (price) => `Rp ${Number(price || 0).toLocaleString('id-ID')}`;
  const escapeHtml = (text) => text ? String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") : "";

  const receiptContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Bukti Pembayaran Kasbon</title>
      <style>
        @page { size: auto; margin: 10mm; }
        body { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 15px; font-size: 13px; }
        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 12px; }
        .line { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .highlight { font-weight: bold; font-size: 14px; }
        .footer { text-align: center; margin-top: 16px; border-top: 1px dashed #000; padding-top: 8px; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2 style="margin:0;font-size:16px">${escapeHtml(store.name)}</h2>
        ${store.address ? `<p style="margin:2px 0;font-size:11px">${escapeHtml(store.address)}</p>` : ''}
        ${store.phone ? `<p style="margin:2px 0;font-size:11px">Telp: ${escapeHtml(store.phone)}</p>` : ''}
      </div>

      <div style="text-align:center;margin-bottom:10px">
        <h3 style="margin:0;font-size:14px">BUKTI PEMBAYARAN KASBON</h3>
        <p style="margin:2px 0;font-size:11px">${payment.created_at || new Date().toLocaleString('id-ID')}</p>
      </div>

      <div class="line"></div>
      <div class="row"><span>Nama Pelanggan:</span><b>${escapeHtml(customer?.name || '-')}</b></div>
      ${customer?.phone ? `<div class="row"><span>No. HP:</span><span>${escapeHtml(customer.phone)}</span></div>` : ''}
      ${payment.invoice_no ? `<div class="row"><span>Nota Terkait:</span><span>${escapeHtml(payment.invoice_no)}</span></div>` : ''}
      <div class="line"></div>

      <div class="row highlight">
        <span>JUMLAH DIBAYAR:</span>
        <span>${formatPrice(payment.payment_amount)}</span>
      </div>
      <div class="row">
        <span>Metode:</span>
        <span>${payment.payment_method === 'cash' ? 'Tunai' : payment.payment_method?.toUpperCase()}</span>
      </div>
      ${payment.notes ? `<div class="row"><span>Catatan:</span><span>${escapeHtml(payment.notes)}</span></div>` : ''}

      <div class="line"></div>
      <div class="row highlight" style="color:${remainingDebt === 0 ? '#080' : '#b00'}">
        <span>SISA KASBON:</span>
        <span>${formatPrice(remainingDebt)}</span>
      </div>
      <div style="text-align:center;margin-top:4px;font-size:11px">
        ${remainingDebt === 0 ? '🎉 KASBON SUDAH LUNAS' : '⚠️ Masih ada sisa kasbon'}
      </div>

      <div class="footer">
        <p>Simpan tanda terima ini sebagai bukti sah pembayaran.</p>
        <p>Terima Kasih</p>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(receiptContent);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};

// ─── PRINT SHIFT / CASH DRAWER REPORT (STRUK TUTUP KASIR) ────────────────────
export const printShiftReceipt = (shift, summary = null, movements = [], storeProfile = null) => {
  const store = {
    name: storeProfile?.name || 'TOKO BUMBU',
    address: storeProfile?.address || 'Jl. Imam Bonjol, Muara Sabak Barat, Tanjung Jabung Timur',
    phone: storeProfile?.phone || '0822-8324-8946',
  };

  const fmt = (price) => `Rp ${Number(price || 0).toLocaleString('id-ID')}`;
  const escapeHtml = (text) => {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const s = summary || {
    startingCash: shift.starting_cash || 0,
    cashSales: shift.cash_sales || 0,
    nonCashSales: shift.non_cash_sales || 0,
    debtCollected: shift.debt_collected || 0,
    totalCashIn: shift.cash_in || 0,
    totalCashOut: shift.cash_out || 0,
    expectedCash: shift.expected_cash || 0,
    actualCash: shift.actual_cash || 0,
    difference: shift.difference || 0,
  };

  const diff = Number(shift.difference !== undefined ? shift.difference : (s.actualCash - s.expectedCash)) || 0;
  let diffLabel = "PAS (SEIMBANG)";
  let diffColor = "#059669";
  if (diff < 0) {
    diffLabel = `KURANG (${fmt(Math.abs(diff))})`;
    diffColor = "#dc2626";
  } else if (diff > 0) {
    diffLabel = `LEBIH (+${fmt(diff)})`;
    diffColor = "#2563eb";
  }

  const receiptContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Laporan Tutup Kasir - Shift #${shift.id}</title>
      <style>
        @page { size: auto; margin: 4mm; }
        body {
          font-family: 'Courier New', monospace;
          width: 300px;
          margin: 0 auto;
          padding: 12px;
          font-size: 12px;
          color: #000;
        }
        .header { text-align: center; margin-bottom: 12px; }
        .store-name { font-size: 16px; font-weight: bold; margin-bottom: 3px; }
        .store-info { font-size: 10px; color: #333; line-height: 1.3; }
        .title { font-size: 13px; font-weight: bold; margin: 8px 0 4px; text-transform: uppercase; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; }
        .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .line { border-top: 1px dashed #000; margin: 8px 0; }
        .double-line { border-top: 2px solid #000; margin: 8px 0; }
        .highlight { font-weight: bold; font-size: 13px; }
        .box { border: 1px solid #000; padding: 6px; margin: 6px 0; text-align: center; }
        .footer { text-align: center; font-size: 10px; margin-top: 16px; }
        .sign { display: flex; justify-content: space-between; margin-top: 24px; text-align: center; font-size: 10px; }
        .sign-box { width: 45%; }
        .sign-space { height: 40px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="store-name">${escapeHtml(store.name)}</div>
        <div class="store-info">${escapeHtml(store.address)}</div>
        <div class="store-info">Telp: ${escapeHtml(store.phone)}</div>
        <div class="title">REKAP TUTUP KASIR (SHIFT #${shift.id})</div>
      </div>

      <div class="row"><span>Kasir:</span><b>${escapeHtml(shift.cashier_name || 'Kasir')}</b></div>
      <div class="row"><span>Waktu Buka:</span><span>${shift.opened_at || '-'}</span></div>
      <div class="row"><span>Waktu Tutup:</span><span>${shift.closed_at || '(Sedang Berjalan)'}</span></div>
      <div class="row"><span>Status:</span><b>${shift.status === 'CLOSED' ? 'DITUTUP' : 'AKTIF'}</b></div>

      <div class="line"></div>
      <div style="font-weight:bold;margin-bottom:4px">ARUS KAS LACI:</div>
      <div class="row"><span>Modal Awal Laci:</span><span>${fmt(s.startingCash)}</span></div>
      <div class="row"><span>Penjualan Tunai:</span><span>+ ${fmt(s.cashSales)}</span></div>
      ${s.debtCollected > 0 ? `<div class="row"><span>Pelunasan Kasbon:</span><span>+ ${fmt(s.debtCollected)}</span></div>` : ''}
      ${s.totalCashIn > 0 ? `<div class="row"><span>Kas Masuk Lainnya:</span><span>+ ${fmt(s.totalCashIn)}</span></div>` : ''}
      ${s.totalCashOut > 0 ? `<div class="row"><span>Kas Keluar Laci:</span><span>- ${fmt(s.totalCashOut)}</span></div>` : ''}
      
      <div class="line"></div>
      <div class="row highlight">
        <span>UANG SEHARUSNYA:</span>
        <span>${fmt(s.expectedCash)}</span>
      </div>
      <div class="row highlight">
        <span>UANG FISIK LACI:</span>
        <span>${fmt(s.actualCash !== undefined ? s.actualCash : shift.actual_cash)}</span>
      </div>

      <div class="box" style="border-color:${diffColor}">
        <div style="font-size:10px;text-transform:uppercase">HASIL SELISIH KAS:</div>
        <div style="font-size:14px;font-weight:bold;color:${diffColor}">${diffLabel}</div>
      </div>

      <div class="line"></div>
      <div style="font-weight:bold;margin-bottom:4px">NON-TUNAI & TOTAL OMZET:</div>
      <div class="row"><span>Penjualan Non-Tunai:</span><span>${fmt(s.nonCashSales)}</span></div>
      <div class="row"><span>Total Seluruh Omzet:</span><b>${fmt((s.cashSales || 0) + (s.nonCashSales || 0))}</b></div>

      ${shift.notes ? `
        <div class="line"></div>
        <div style="font-size:11px"><b>Catatan:</b> ${escapeHtml(shift.notes)}</div>
      ` : ''}

      <div class="sign">
        <div class="sign-box">
          <div>Kasir</div>
          <div class="sign-space"></div>
          <div>( ${escapeHtml(shift.cashier_name || 'Kasir')} )</div>
        </div>
        <div class="sign-box">
          <div>Pemilik / Spv</div>
          <div class="sign-space"></div>
          <div>( .................... )</div>
        </div>
      </div>

      <div class="footer">
        <p>Laporan dicetak otomatis oleh sistem kasir.</p>
        <p>Waktu Cetak: ${new Date().toLocaleString('id-ID')}</p>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(receiptContent);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};