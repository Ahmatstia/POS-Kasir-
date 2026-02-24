// Utility untuk mencetak struk
export const printReceipt = (transaction, items) => {
  // Format tanggal
  const date = new Date(transaction.created_at);
  const formattedDate = date.toLocaleDateString('id-ID', {
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

  // Buat konten struk HTML
  const receiptContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Struk Pembayaran</title>
      <style>
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
        <h2>TOKO BUMBU</h2>
        <p>Jl. Contoh No. 123, Kota</p>
        <p>Telp: 0812-3456-7890</p>
      </div>
      
      <div class="invoice">
        <h3>STRUK PEMBAYARAN</h3>
        <p>No. ${transaction.invoice_no}</p>
        <p>${formattedDate}</p>
        <p>Kasir: ${transaction.created_by || 'Admin'}</p>
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
              <td>${item.product_name}</td>
              <td>${item.quantity} ${item.unit}</td>
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
        <div class="total-row">
          <span>Diskon:</span>
          <span>${formatPrice(transaction.discount)}</span>
        </div>
        <div class="grand-total total-row">
          <span>TOTAL:</span>
          <span>${formatPrice(transaction.total_amount)}</span>
        </div>
        <div class="total-row">
          <span>Tunai:</span>
          <span>${formatPrice(transaction.payment_amount)}</span>
        </div>
        <div class="total-row">
          <span>Kembali:</span>
          <span>${formatPrice(transaction.change_amount)}</span>
        </div>
      </div>

      <div class="footer">
        <p>Metode Pembayaran: ${transaction.payment_method.toUpperCase()}</p>
        <p>${transaction.payment_method === 'cash' ? 'Tunai' : transaction.payment_method === 'debit' ? 'Kartu Debit' : 'QRIS'}</p>
      </div>

      <div class="thankyou">
        <p>Terima Kasih</p>
        <p>Selamat Belanja Kembali</p>
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
export const printThermalReceipt = (transaction, items) => {
  const date = new Date(transaction.created_at);
  const formattedDate = date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const formatPrice = (price) => {
    return `Rp${price.toLocaleString('id-ID')}`;
  };

  // Untuk printer thermal 58mm
  const receiptContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Arial', monospace;
          width: 58mm;
          margin: 0;
          padding: 5px;
          font-size: 10px;
        }
        .center {
          text-align: center;
        }
        .line {
          border-top: 1px dashed #000;
          margin: 5px 0;
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
        <h3 style="margin:0">TOKO BUMBU</h3>
        <p style="margin:2px 0">${transaction.invoice_no}</p>
        <p style="margin:2px 0">${formattedDate}</p>
      </div>
      <div class="line"></div>
      <table>
        ${items.map(item => `
          <tr>
            <td colspan="2">${item.product_name}</td>
          </tr>
          <tr>
            <td>${item.quantity} ${item.unit} x ${formatPrice(item.price_per_unit)}</td>
            <td>${formatPrice(item.subtotal)}</td>
          </tr>
        `).join('')}
      </table>
      <div class="line"></div>
      <table>
        <tr><td>Subtotal</td><td>${formatPrice(transaction.subtotal)}</td></tr>
        <tr><td>Diskon</td><td>${formatPrice(transaction.discount)}</td></tr>
        <tr><td><b>TOTAL</b></td><td><b>${formatPrice(transaction.total_amount)}</b></td></tr>
        <tr><td>Tunai</td><td>${formatPrice(transaction.payment_amount)}</td></tr>
        <tr><td>Kembali</td><td>${formatPrice(transaction.change_amount)}</td></tr>
      </table>
      <div class="center">
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