const XLSX = require('xlsx');
const fs = require('fs');

// Baca file Excel
const workbook = XLSX.readFile('Daftar Barang.xlsx');
const sheet = workbook.Sheets['Sheet2'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Data dimulai dari baris ke-4 (indeks 3)
const rows = data.slice(3);

// Fungsi untuk membersihkan format harga (Rp, spasi, titik)
function cleanPrice(price) {
  if (!price) return 0;
  if (typeof price === 'number') return price;
  
  // Hapus 'Rp', spasi, titik, dan ubah ke number
  const cleaned = String(price)
    .replace(/Rp|\.|,| /g, '')
    .replace(/\s/g, '');
  
  const num = parseInt(cleaned);
  return isNaN(num) ? 0 : num;
}

// Tentukan sell_per_unit berdasarkan kolom Satuan
function getSellPerUnit(satuan) {
  if (!satuan) return 'all';
  
  const s = String(satuan).toLowerCase();
  if (s.includes('pcs')) return 'pcs';
  if (s.includes('pack')) return 'pack';
  if (s.includes('kg')) return 'kg';
  if (s.includes('all')) return 'all';
  return 'all'; // default
}

// Hasil konversi
const convertedData = [['Nama Barang', 'Kategori', 'Sell Per Unit', 'Harga Pcs', 'Harga Pack', 'Harga Kg', 'Stok', 'Min Stok', 'Keterangan']];

rows.forEach((row, index) => {
  if (!row[1]) return; // skip jika nama barang kosong
  
  const nama = row[1];
  const kategori = row[2];
  const satuan = row[3];
  const hargaPack = cleanPrice(row[5]);  // Kolom F (index 5)
  const hargaPcs = cleanPrice(row[6]);   // Kolom G (index 6)
  const hargaKg = cleanPrice(row[7]);    // Kolom H (index 7)
  const keterangan = row[9] || '';       // Kolom J (index 9)
  
  const sellPerUnit = getSellPerUnit(satuan);
  
  // Tentukan harga berdasarkan sellPerUnit
  let pricePcs = 0, pricePack = 0, priceKg = 0;
  
  if (sellPerUnit === 'pcs') {
    pricePcs = hargaPcs || hargaPack || hargaKg; // prioritaskan hargaPcs
  } else if (sellPerUnit === 'pack') {
    pricePack = hargaPack || hargaPcs || hargaKg;
  } else if (sellPerUnit === 'kg') {
    priceKg = hargaKg || hargaPack || hargaPcs;
  } else { // 'all'
    pricePcs = hargaPcs || 0;
    pricePack = hargaPack || 0;
    priceKg = hargaKg || 0;
  }
  
  // Handle kasus khusus (contoh: Vanili Kotak dengan "4 /1000")
  if (nama.toLowerCase().includes('vanili kotak')) {
    pricePcs = 1000; // asumsi harga per pcs Rp1000
  }
  
  convertedData.push([
    nama,
    kategori,
    sellPerUnit,
    pricePcs,
    pricePack,
    priceKg,
    0,  // stok default
    0,  // min stok default
    keterangan
  ]);
});

// Buat workbook baru
const newWorkbook = XLSX.utils.book_new();
const newSheet = XLSX.utils.aoa_to_sheet(convertedData);
XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Produk');

// Simpan ke file
XLSX.writeFile(newWorkbook, 'Produk_Siap_Import.xlsx');

console.log('✅ Konversi selesai!');
console.log(`📊 Total data: ${convertedData.length - 1} produk`);
console.log('📁 File: Produk_Siap_Import.xlsx');

// Tampilkan preview 5 data pertama
console.log('\n📋 Preview 5 data:');
for (let i = 1; i <= Math.min(5, convertedData.length - 1); i++) {
  console.log(`${i}. ${convertedData[i][0]} | ${convertedData[i][1]} | ${convertedData[i][2]} | Pcs: ${convertedData[i][3]} | Pack: ${convertedData[i][4]} | Kg: ${convertedData[i][5]}`);
}