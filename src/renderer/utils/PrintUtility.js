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