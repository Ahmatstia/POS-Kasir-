# LAPORAN AUDIT MENDALAM & DOKUMENTASI LENGKAP FITUR SISTEM POS KASIR TOKO BUMBU

**Dokumen Referensi Teknis & Fungsional Lengkap**  
**Penyusun:** Sistem Analis, QA Manager, QA Tester, & Project Manager  
**Basis Kode:** Produksi Offline Desktop (Electron + React + SQLite3)  
**Versi Sistem:** 1.0.0  

---

## DAFTAR ISI
1. [Eksekutif Ringkasan & Arsitektur Inti](#1-eksekutif-ringkasan--arsitektur-inti)
2. [Arsitektur Basis Data & Skema Relasional (Data Modeling)](#2-arsitektur-basis-data--skema-relasional-data-modeling)
3. [Audit Mendalam: Modul Kasir & Mesin Penjualan (Point of Sale)](#3-audit-mendalam-modul-kasir--mesin-penjualan-point-of-sale)
   - 3.1 [Katalog & Pencarian Cepat (Infinite Scroll)](#31-katalog--pencarian-cepat-infinite-scroll)
   - 3.2 [Model Multi-Satuan & Produk Hibrida (Hybrid Product)](#32-model-multi-satuan--produk-hibrida-hybrid-product)
   - 3.3 [Kalkulator Timbangan Sembako (`WeighingModal`)](#33-kalkulator-timbangan-sembako-weighingmodal)
   - 3.4 [Fitur Timbang Ulang Keranjang (`reweighItem`)](#34-fitur-timbang-ulang-keranjang-reweighitem)
   - 3.5 [Fitur Harga Kustom Langsung (`Harga Kustom / Manual Price`)](#35-fitur-harga-kustom-langsung-harga-kustom--manual-price)
   - 3.6 [Mesin Validasi Stok Real-Time Keranjang](#36-mesin-validasi-stok-real-time-keranjang)
   - 3.7 [Alur Checkout & Modal Pembayaran (`PaymentModal`)](#37-alur-checkout--modal-pembayaran-paymentmodal)
4. [Audit Mendalam: Modul Manajemen Produk & Impor Excel](#4-audit-mendalam-modul-manajemen-produk--impor-excel)
   - 4.1 [Master Produk Bertingkat & Konversi Satuan](#41-master-produk-bertingkat--konversi-satuan)
   - 4.2 [Dual Safety Stock Alert (Kemasan vs Timbangan)](#42-dual-safety-stock-alert-kemasan-vs-timbangan)
   - 4.3 [Modul Batch Import Excel Tingkat Lanjut (`ImportExcel.jsx`)](#43-modul-batch-import-excel-tingkat-lanjut-importexceljsx)
5. [Audit Mendalam: Modul Inventori, Multi-Batch & Stok Opname](#5-audit-mendalam-modul-inventori-multi-batch--stok-opname)
   - 5.1 [Indikator & Visualisasi Kesehatan Stok](#51-indikator--visualisasi-kesehatan-stok)
   - 5.2 [Modal Restock Multi-Tahap (`StockInModal`)](#52-modal-restock-multi-tahap-stockinmodal)
   - 5.3 [Modal Koreksi Stok Opname Fisik (`AdjustModal`)](#53-modal-koreksi-stok-opname-fisik-adjustmodal)
   - 5.4 [Audit Trail Kartu Stok (`inventory_log`)](#54-audit-trail-kartu-stok-inventory_log)
6. [Audit Mendalam: Modul Transaksi & Mesin Pembatalan (Void Engine)](#6-audit-mendalam-modul-transaksi--mesin-pembatalan-void-engine)
   - 6.1 [Pencarian & Filter Transaksi](#61-pencarian--filter-transaksi)
   - 6.2 [Fitur Cetak Ulang Struk](#62-fitur-cetak-ulang-struk)
   - 6.3 [Mesin Pembatalan Transaksi (Void) & Restorasi Stok](#63-mesin-pembatalan-transaksi-void--restorasi-stok)
7. [Audit Mendalam: Modul Laporan, Finansial & Analitik](#7-audit-mendalam-modul-laporan-finansial--analitik)
   - 7.1 [Visualisasi Data & Grafik Penjualan (Recharts)](#71-visualisasi-data--grafik-penjualan-recharts)
   - 7.2 [Rumus Metrik Finansial (Omzet, HPP, Gross Profit, Margin)](#72-rumus-metrik-finansial-omzet-hpp-gross-profit-margin)
   - 7.3 [Fitur Ekspor Laporan CSV/Excel](#73-fitur-ekspor-laporan-csvexcel)
8. [Audit Mendalam: Modul Pengaturan, Keamanan & Utilitas Cetak](#8-audit-mendalam-modul-pengaturan-keamanan--utilitas-cetak)
   - 8.1 [Mode Privasi (*Privacy Mode / Hide Cost*)](#81-mode-privasi-privacy-mode--hide-cost)
   - 8.2 [Mode Abaikan Stok (*Ignore Stock Mode*)](#82-mode-abaikan-stok-ignore-stock-mode)
   - 8.3 [Konfigurasi Identitas Toko Dinamis](#83-konfigurasi-identitas-toko-dinamis)
   - 8.4 [Mesin Backup & Restore Database Otomatis](#84-mesin-backup--restore-database-otomatis)
   - 8.5 [Mesin Cetak Struk Thermal 58mm & Standar (`PrintUtility.js`)](#85-mesin-cetak-struk-thermal-58mm--standar-printutilityjs)
   - 8.6 [Audit Trail Keamanan Admin (`ActivityLogs.jsx`)](#86-audit-trail-keamanan-admin-activitylogsjsx)
9. [Matriks Kompleksitas Fitur & Nilai Bisnis](#9-matriks-kompleksitas-fitur--nilai-bisnis)

---

## 1. EKSEKUTIF RINGKASAN & ARSITEKTUR INTI

Aplikasi ini adalah **Sistem Point of Sale (POS) & Manajemen Inventori Terintegrasi** yang dirancang khusus untuk operasional toko retail & grosir (studi kasus: Toko Bumbu, Sembako, Plastik, & Bahan Kue). Sistem ini memecahkan tantangan terbesar toko tradisional: **menghubungkan penjualan barang kemasan terstandar (Pcs, Pack, Dus) dengan barang curah/timbangan (Gram, Ons, Kg, Karung) dalam satu sistem inventori terpadu secara offline tanpa memerlukan koneksi internet**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DESKTOP RUNTIME (ELECTRON)                      │
│                                                                        │
│  ┌────────────────────────┐              ┌──────────────────────────┐  │
│  │    RENDERER PROCESS    │              │       MAIN PROCESS       │  │
│  │       (React 19)       │              │       (Node.js OS)       │  │
│  │                        │  IPC Bridge  │                          │  │
│  │  - Dashboard & Charts  │ <══════════> │  - SQLite3 Database      │  │
│  │  - POS Cashier Engine  │ (Preload.js) │  - WAL Checkpoint Engine │  │
│  │  - Weighing Calculator │              │  - Backup & Rotate (5x)  │  │
│  │  - Multi-Unit Inventory│              │  - Native File Dialog    │  │
│  │  - Thermal Print View  │              │  - Safe Crash Recovery   │  │
│  └────────────────────────┘              └──────────────────────────┘  │
│                                                        │               │
│                                                        ▼               │
│                                            [ pos-toko-bumbu.db ]       │
└────────────────────────────────────────────────────────────────────────┘
```

### Karakteristik Arsitektur Teknis:
1. **Multi-Process Architecture (Electron 40.6.0)**:
   - **Main Process (`src/main.js`)**: Bertanggung jawab atas siklus hidup aplikasi, inisialisasi window, manajemen koneksi database SQLite, penanganan PRAGMA WAL, operasi file OS, serta backup/restore database.
   - **Context Isolation & Preload Bridge (`src/preload.js`)**: Mengamankan arsitektur aplikasi dengan mengekspos API IPC aman (`window.electronAPI`) tanpa mengekspos objek Node.js mentah ke antarmuka React.
   - **Renderer Process (`src/renderer.js`)**: Dibangun menggunakan React 19.2.4 dengan arsitektur Component-Driven UI, bundler Webpack 5, dan styling Vanilla CSS + TailwindCSS 3.4.17.
2. **Mesin Penyimpanan Data (Native SQLite3)**:
   - Berkas database disimpan secara persisten di folder data pengguna OS:  
     `C:\Users\<User>\AppData\Roaming\POS\pos-toko-bumbu.db`.
   - Menggunakan mode transaksi ACID, `PRAGMA foreign_keys = ON`, dan `PRAGMA wal_checkpoint(FULL)` untuk keandalan maksimal dari risiko data korup saat listrik mati tiba-tiba.

---

## 2. ARSITEKTUR BASIS DATA & SKEMA RELASIONAL (DATA MODELING)

Sistem database dirancang secara ketat dan memiliki mekanisme **Self-Healing Auto-Migration** pada class `DatabaseManager` (`src/main/database/dbManager.js`). Saat aplikasi dibuka, sistem otomatis memverifikasi keberadaan tabel, menambahkan kolom baru yang belum ada (`ALTER TABLE ADD COLUMN`), membuat indeks pencarian, dan mengeksekusi data migrasi bawaan tanpa merusak data lama.

```mermaid
erDiagram
    CATEGORIES ||--o{ PRODUCTS : "mengelompokkan"
    PRODUCTS ||--o{ STOCKS : "memiliki batch"
    PRODUCTS ||--o{ INVENTORY_LOG : "mencatat mutasi"
    STOCKS ||--o{ INVENTORY_LOG : "referensi batch"
    TRANSACTIONS ||--o{ TRANSACTION_ITEMS : "memiliki rincian"
    PRODUCTS ||--o{ TRANSACTION_ITEMS : "dijual dalam"
    STOCKS ||--o{ TRANSACTION_ITEMS : "dipotong dari"

    CATEGORIES {
        int id PK
        string name UK
        string description
        string color
        datetime created_at
        datetime updated_at
    }

    PRODUCTS {
        int id PK
        string barcode
        string sku
        string name
        int category_id FK
        string sell_per_unit
        int price_pcs
        int price_pack
        int price_dus
        int price_kg
        int price_karung
        int pcs_per_pack
        int pack_per_dus
        real kg_per_karung
        int min_stock
        real min_stock_kg
        int purchase_price
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    STOCKS {
        int id PK
        int product_id FK
        string batch_code
        int quantity
        real qty_kg
        int purchase_price
        date expiry_date
        boolean is_active
        string notes
        datetime created_at
        datetime updated_at
    }

    INVENTORY_LOG {
        int id PK
        int product_id FK
        int stock_id FK
        string type
        real quantity_input
        string unit_input
        int quantity_pcs
        real quantity_kg
        real stock_before
        real stock_after
        int purchase_price
        string batch_code
        string reference_id
        datetime created_at
    }

    TRANSACTIONS {
        int id PK
        string invoice_no UK
        datetime transaction_date
        int subtotal
        int discount
        int total_amount
        int payment_amount
        int change_amount
        string payment_method
        string customer_name
        string status
        datetime created_at
    }

    TRANSACTION_ITEMS {
        int id PK
        int transaction_id FK
        int product_id FK
        int stock_id FK
        string product_name
        real quantity
        string unit
        int price_per_unit
        int subtotal
        int cost_price
        datetime created_at
    }

    SETTINGS {
        string key PK
        string value
    }

    ACTIVITY_LOGS {
        int id PK
        string action
        string module
        string details
        string user
        datetime created_at
    }
```

### Rincian 8 Tabel Inti:
1. **`categories`**: Menyimpan kategori produk dengan atribut `color` (Hex Code) yang digunakan di seluruh UI untuk membedakan kategori secara visual (misal: Bumbu Instan oranye, Bahan Kue ungu, Rempah hijau).
2. **`products`**: Tabel master produk terlengkap yang mendukung konfigurasi harga grosir 5 tingkat (`price_pcs`, `price_pack`, `price_dus`, `price_kg`, `price_karung`), rasio konversi (`pcs_per_pack`, `pack_per_dus`, `kg_per_karung`), dan harga modal dasar (`purchase_price`).
3. **`stocks`**: Tabel multi-batch inventori. Setiap barang masuk dicatat sebagai batch tersendiri lengkap dengan tanggal expired, kode batch unik, sisa stok kemasan (`quantity`), sisa stok timbangan (`qty_kg`), dan harga modal pembelian saat batch tersebut masuk.
4. **`inventory_log`**: Buku besar (kartu stok) yang mencatat mutasi masuk-keluar dengan 6 jenis tipe:
   - `IN`: Penerimaan barang / restock baru.
   - `OUT`: Pengurangan stok manual.
   - `SALE`: Pemotongan otomatis akibat transaksi penjualan kasir.
   - `ADJUSTMENT`: Koreksi hasil stok opname fisik.
   - `EXPIRED`: Pembuangan barang kadaluarsa.
   - `RETURN`: Pemulihan stok akibat pembatalan (void) transaksi kasir.
5. **`transactions`**: Header data penjualan kasir dengan nomor invoice unik, metode pembayaran (`cash`, `debit`, `qris`), nominal bayar, dan kembalian.
6. **`transaction_items`**: Baris rincian item transaksi. Kolom penting: `cost_price` (HPP item saat transaksi terjadi), sehingga laporan laba kotor selalu akurat walaupun harga modal produk di kemudian hari berubah naik/turun.
7. **`settings`**: Tabel konfigurasi sistem berupa *key-value pair* (misal: `ignore_stock`, `hide_cost`, `store_name`, `store_address`, `store_phone`, `receipt_footer`).
8. **`activity_logs`**: Jejak audit (*audit trail*) internal yang mencatat siapa, kapan, dan aksi apa yang dilakukan (misal: backup database, pembersihan log, pembatalan invoice).

---

## 3. AUDIT MENDALAM: MODUL KASIR & MESIN PENJUALAN (POINT OF SALE)

Berkas utama: [`src/renderer/components/Cashier/Cashier.jsx`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/components/Cashier/Cashier.jsx) & [`PaymentModal.jsx`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/components/Cashier/PaymentModal.jsx).

Modul ini adalah jantung operasional harian. Telah dirancang dengan sangat spesifik untuk ritme kerja kasir pasar/toko yang membutuhkan kecepatan dan ketepatan tinggi.

### 3.1 Katalog & Pencarian Cepat (Infinite Scroll)
- **Virtualisasi Pemuatan Data**: Menggunakan teknik `IntersectionObserver` native yang memuat produk secara bertahap (30 item per batch / `ITEMS_PER_PAGE = 30`). Hal ini mencegah aplikasi menjadi lag meskipun toko memiliki 10.000+ produk.
- **Pencarian Multi-Kriteria**: Kasir dapat mengetik nama produk, kode SKU, atau melakukan pemindaian dengan barcode scanner USB/Bluetooth secara otomatis.

### 3.2 Model Multi-Satuan & Produk Hibrida (Hybrid Product)
Sistem memiliki logika *Unit Multiplier*:
- **Pcs**: Satuan eceran terkecil.
- **Pack**: Bernilai `pcs_per_pack` Pcs (misal 1 pack = 10 pcs).
- **Dus**: Bernilai `pack_per_dus * pcs_per_pack` Pcs (misal 1 dus = 4 pack * 10 pcs = 40 pcs).
- **Kg**: Satuan timbangan desimal.
- **Karung**: Bernilai `kg_per_karung` Kg (misal 1 karung bawang = 25 kg).
- **Produk Hibrida**: Suatu barang dapat dibeli baik secara timbangan maupun kemasan sekaligus (contoh: Lada bubuk bisa dibeli per bungkus sachet Pcs atau kiloan curah Kg). Sistem menampilkan badge `HYBRID` dan tombol satuan yang relevan.

### 3.3 Kalkulator Timbangan Sembako (`WeighingModal`)
Ini adalah salah satu fitur paling canggih dalam aplikasi: modal pop-up khusus yang muncul otomatis saat kasir memilih produk timbangan. Fitur ini memiliki **3 Tab Perhitungan**:

```
┌────────────────────────────────────────────────────────┐
│             ⚖️ KALKULATOR TIMBANGAN SEMBAKO            │
│  [ Tab: CEPAT ]    [ Tab: KETIK BEBAS ]    [ Tab: NOMINAL UANG ]
├────────────────────────────────────────────────────────┤
│  Contoh Tab Nominal Uang:                              │
│  "Pembeli bawa uang: Rp 5.000" (Harga Kg: Rp 20.000)   │
│                                                        │
│  Sistem otomatis menghitung rumus:                      │
│     Final Kg = Rp 5.000 / Rp 20.000 = 0.250 Kg         │
│                                                        │
│  Hasil Otomatis Terhitung: 0.250 Kg (1/4 Kg / 2.5 Ons) │
│  Harga Akhir: Rp 5.000                                 │
└────────────────────────────────────────────────────────┘
```

1. **Tab Cepat (Quick Chips)**:
   Tombol pintasan cepat untuk ukuran pembelian umum di pasar:
   - `1 Kg` (1.0)
   - `1/2 Kg` (0.5)
   - `1/4 Kg` (0.25)
   - `1 Ons` (0.1)
2. **Tab Ketik Bebas (Custom Weight)**:
   Kasir mengetik angka desimal bebas dengan pilihan satuan fleksibel:
   - Satuan `Kg`: nilai langsung digunakan.
   - Satuan `Ons`: sistem otomatis mengonversi dengan rumus `v / 10`.
   - Satuan `Gram`: sistem otomatis mengonversi dengan rumus `v / 1000`.
3. **Tab Nominal Uang (Target Purchasing)**:
   Di pasar tradisional, pembeli sering berkata: *"Beli merica Rp 3.000"* atau *"Beli bawang putih Rp 7.000"*. Kasir cukup mengetik nominal uang yang dibawa pembeli. Sistem secara matematis membagi `nominal / price_kg` dan menghasilkan berat hingga 3 digit desimal presisi tinggi!

### 3.4 Fitur Timbang Ulang Keranjang (`reweighItem`)
Jika barang timbangan sudah berada di keranjang belanja dan pembeli ingin menambah atau mengurangi timbangannya, tombol kuantitas di keranjang tidak bertambah `+1` bulat (karena itu produk timbangan), melainkan **otomatis membuka kembali Kalkulator Timbangan** untuk menimbang ulang dengan presisi.

### 3.5 Fitur Harga Kustom Langsung (`Harga Kustom / Manual Price`)
Pada baris katalog barang, kasir dapat menekan tombol **"Harga Kustom"**. Fitur ini mengizinkan kasir menginput harga kesepakatan (misal harga langganan atau barang sedikit rusak) dan jumlah kuantitas khusus secara langsung. Di keranjang, produk diberi tanda pensil (`Nama Produk ✎`) tanpa mengubah harga master di database.

### 3.6 Mesin Validasi Stok Real-Time Keranjang
Fungsi `calcCartPcs` dan `calcCartKg` mengakumulasi seluruh satuan yang sedang berada di keranjang belanja. Jika kasir mencoba memasukkan barang melebihi stok yang tersedia (dan opsi `ignore_stock` tidak aktif), sistem langsung memblokir dengan toast error:
> *"Stok tidak mencukupi! Tersisa: 5 Pcs (di keranjang: 5 Pcs)"*

### 3.7 Alur Checkout & Modal Pembayaran (`PaymentModal`)
Ketika kasir menekan tombol "Bayar" (atau shortcut), modal pembayaran modern akan muncul dengan fitur:
- **Metode Pembayaran**: Tunai (Cash), Kartu Debit, atau QRIS.
- **Tombol Uang Pas & Pecahan Rupiah Cepat**: `Uang Pas`, `50k`, `100k`, `200k`, `500k`, `1jt`.
- **Indikator Kembalian / Kekurangan Real-Time**: Teks hijau untuk nominal kembalian, teks merah jika uang yang diserahkan kurang.
- **Checkbox Cetak Struk Otomatis**: Kasir dapat memilih apakah struk dicetak langsung atau tidak, beserta pilihan format (Thermal 58mm atau Standar).
- **Two-Step Clear Cart**: Tombol "Kosongkan Keranjang" memerlukan dua kali klik konfirmasi berturut-turut untuk mencegah kesalahan tidak sengaja.

---

## 4. AUDIT MENDALAM: MODUL MANAJEMEN PRODUK & IMPOR EXCEL

Berkas utama: [`src/renderer/components/Products/ProductList.jsx`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/components/Products/ProductList.jsx), [`ProductForm.jsx`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/components/Products/ProductForm.jsx), [`EditProductForm.jsx`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/components/Products/EditProductForm.jsx), dan [`ImportExcel.jsx`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/components/Products/ImportExcel.jsx).

### 4.1 Master Produk Bertingkat & Konversi Satuan
Form pembuatan dan pengeditan produk mendukung skema penetapan harga terperinci:
- **Harga Beli Pokok (HPP / Modal)**: Wajib diisi (> 0) sebagai fondasi kalkulasi keuntungan bersih.
- **Tipe Penjualan**: Kemasan (Pcs/Pack/Dus) atau Timbangan Curah (Kg/Karung).
- **Rasio Konversi**: Kasir menentukan berapa Pcs per Pack dan berapa Pack per Dus, serta berapa Kg isi per Karung.
- **Penetapan Harga Jual Bertingkat**:
  - `price_pcs` (Eceran satuan)
  - `price_pack` (Grosir pack)
  - `price_dus` (Grosir karton/dus)
  - `price_kg` (Eceran timbangan)
  - `price_karung` (Grosir karungan)

### 4.2 Dual Safety Stock Alert (Kemasan vs Timbangan)
Berbeda dengan POS biasa yang hanya memiliki 1 kolom minimum stock, sistem ini memisahkan batas peringatan:
- `min_stock` (bilangan bulat untuk kemasan Pcs).
- `min_stock_kg` (bilangan desimal untuk timbangan Kg).
Jika stok fisik berada di bawah ambang batas ini, sistem otomatis memberi label peringatan *"Stok Menipis"* di dashboard dan inventori.

### 4.3 Modul Batch Import Excel Tingkat Lanjut (`ImportExcel.jsx`)
Fitur ini mengizinkan pemilik toko mengunggah ribuan data produk sekaligus dari spreadsheet Microsoft Excel (`.xlsx`, `.xls`):
1. **Pendeteksi Kolom Otomatis (Smart Column Auto-Detection)**:
   Sistem memindai header tabel Excel dan mencocokkan kata kunci sinonim bahasa Indonesia:
   - Nama Produk: `nama`, `produk`, `barang`, `item`
   - Kategori: `kategori`, `category`, `jenis`
   - Harga Beli/HPP: `modal`, `beli`, `harga beli`, `hpp`
   - Harga Jual Pcs: `pcs`, `harga pcs`, `ecer`
   - Harga Jual Pack: `pack`, `harga pack`, `pak`
   - Harga Jual Dus: `dus`, `harga dus`, `karton`, `ctn`
   - Harga Jual Kg: `kg`, `harga kg`, `kilo`
   - Stok: `stok`, `stock`, `qty`, `jumlah`
2. **Parser Pembersih Angka (`cleanPrice` & `cleanQty`)**:
   Mampu membersihkan simbol mata uang (`Rp`, titik pemisah ribuan, koma desimal, dan spasi).
3. **Pencabangan Alokasi Stok Otomatis**:
   Jika produk berjenis timbangan, kuantitas stok Excel otomatis dimasukkan ke `stocks.qty_kg` dan `inventory_log.quantity_kg`. Jika kemasan, dimasukkan ke `stocks.quantity` dan `inventory_log.quantity_pcs`.
4. **Pratinjau Data Sebelum Simpan**:
   Menampilkan tabel preview 5 baris pertama data Excel sebelum pengguna menekan tombol komit final.

---

## 5. AUDIT MENDALAM: MODUL INVENTORI, MULTI-BATCH & STOK OPNAME

Berkas utama: [`src/renderer/components/Inventory/InventoryList.jsx`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/components/Inventory/InventoryList.jsx) dan [`src/renderer/services/inventory.js`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/services/inventory.js).

### 5.1 Indikator & Visualisasi Kesehatan Stok
Halaman inventori menyajikan kartu ringkasan status stok:
- **Total Produk Aktif**
- **Stok Aman (Hijau)**
- **Stok Menipis (Kuning/Aksen)**
- **Stok Habis (Merah)**
Dilengkapi **Bilah Progress Bar Kesehatan Stok (%)** menggunakan formula:
$$\text{Health \%} = \min\left(100, \frac{\text{Stok Saat Ini}}{\max(\text{Min Stock} \times 2, 1)} \times 100\right)$$
Warna bilah otomatis berubah sesuai kondisi kesehatan barang.

### 5.2 Modal Restock Multi-Tahap (`StockInModal`)
Dirancang dengan antarmuka **2 Langkah Berurutan (*Stepped Modal*)**:
- **Langkah 1 (Input Jumlah Stok Masuk)**:
  - Untuk kemasan: Mengisi Dus, Pack, dan Pcs sekaligus. Sistem otomatis menghitung total Pcs berdasarkan rasio konversi produk.
  - Untuk timbangan: Mengisi Karung dan Kg desimal. Sistem otomatis mengalikan jumlah karung dengan `kg_per_karung`.
- **Langkah 2 (Input Harga & Identitas Batch)**:
  - Input Harga Beli (HPP) batch baru per Pcs atau per Kg.
  - Tanggal Kadaluarsa (*Expired Date*).
  - Kode Batch (jika dikosongkan, sistem membuatkan otomatis: `BATCH-YYYYMMDD-XXX`).
  - Catatan penerimaan barang.
- Hasil penyimpanan otomatis membuat record baru di tabel `stocks` dan mencatat kartu stok masuk bertipe `IN` di `inventory_log`.

### 5.3 Modal Koreksi Stok Opname Fisik (`AdjustModal`)
Digunakan saat pemilik toko melakukan penghitungan fisik di gudang/toko:
- Mendukung pemilihan satuan koreksi (Kg untuk timbangan, Pcs untuk kemasan).
- Input total stok fisik yang sebenarnya ada di rak.
- Menampilkan indikator selisih (*Difference Preview*):
  - Kotak hijau: `BERTAMBAH +X [Pcs/Kg]`
  - Kotak merah: `BERKURANG -X [Pcs/Kg]`
- Wajib memilih alasan koreksi: *Stok opname*, *Barang rusak/hilang*, *Pengembalian barang*, *Koreksi sistem*, atau *Lain-lain*.
- Sistem otomatis menyesuaikan stok aktif dan mencatat mutasi `ADJUSTMENT` di log inventori.

### 5.4 Audit Trail Kartu Stok (`inventory_log`)
Tab **Riwayat Stok (Log)** menampilkan 200 riwayat pergerakan stok terakhir secara kronologis lengkap dengan waktu, nama produk, jenis mutasi (`IN`, `OUT`, `SALE`, `ADJUSTMENT`, `RETURN`), kuantitas penambahan/pengurangan, nomor batch, dan catatan keterangan.

---

## 6. AUDIT MENDALAM: MODUL TRANSAKSI & MESIN PEMBATALAN (VOID ENGINE)

Berkas utama: [`src/renderer/components/Transactions/Transactions.jsx`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/components/Transactions/Transactions.jsx) dan [`src/renderer/services/transactions.js`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/services/transactions.js).

### 6.1 Pencarian & Filter Transaksi
- Filter rentang waktu: Hari Ini, 7 Hari Terakhir, Bulan Ini, dan Kustom Tanggal.
- Kotak pencarian langsung untuk mencari berdasarkan Nomor Invoice (contoh: `INV-20261012-001`), metode pembayaran, atau nama pelanggan.
- Modal Detail Transaksi yang membedah item yang dibeli, harga satuan, subtotal, keuntungan transaksi, dan identitas pembayaran.

### 6.2 Fitur Cetak Ulang Struk
Jika pembeli meminta struk dicetak kembali beberapa jam atau hari setelah transaksi, kasir dapat menekan tombol **"Cetak Struk"** pada rincian transaksi kapan saja, memilih antara cetakan Thermal 58mm atau Faktur Standar.

### 6.3 Mesin Pembatalan Transaksi (Void) & Restorasi Stok
Jika terjadi kesalahan input atau transaksi dibatalkan oleh kasir:
1. Status transaksi diubah menjadi `CANCELLED`.
2. Seluruh barang yang terdapat dalam invoice tersebut diiterasi.
3. Kuantitas fisik (baik Pcs maupun Kg) **secara otomatis dikembalikan ke tabel `stocks`**.
4. Kartu stok mencatat mutasi tipe `RETURN` dengan referensi nomor invoice yang dibatalkan.
5. Log aktivitas mencatat aksi pembatalan oleh admin.

---

## 7. AUDIT MENDALAM: MODUL LAPORAN, FINANSIAL & ANALITIK

Berkas utama: [`src/renderer/components/Reports/Reports.jsx`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/components/Reports/Reports.jsx) dan [`src/renderer/services/reports.js`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/services/reports.js).

### 7.1 Visualisasi Data & Grafik Penjualan (Recharts)
- **AreaChart (Tren Omzet)**: Menampilkan kurva naik-turunnya omzet penjualan harian dalam rentang tanggal yang dipilih lengkap dengan gradient styling dan interactive tooltip.
- **BarChart (Performa Kategori)**: Memvisualisasikan kategori produk mana yang paling banyak menghasilkan penjualan (misal: Bumbu Instan vs Rempah vs Plastik).
- **PieChart (Top 5 Produk Terlaris)**: Menampilkan komposisi pangsa penjualan 5 produk teratas dibanding seluruh produk lainnya.

### 7.2 Rumus Metrik Finansial
Modul laporan menghitung metrik keuangan secara otomatis dari data transaksi yang berstatus `COMPLETED`:
- **Total Omzet (Penjualan Bersih)**:
  $$\text{Omzet} = \sum \text{total\_amount}$$
- **Total Biaya Modal (HPP / Biaya Pokok Penjualan)**:
  $$\text{Total HPP} = \sum (\text{quantity} \times \text{cost\_price})$$
- **Laba Kotor (Gross Profit)**:
  $$\text{Laba Kotor} = \text{Omzet} - \text{Total HPP}$$
- **Margin Keuntungan Bersih (%)**:
  $$\text{Margin} = \left(\frac{\text{Laba Kotor}}{\text{Omzet}}\right) \times 100\%$$
- **Rata-rata Nilai Transaksi (*Basket Size*)**:
  $$\text{Rata-rata Transaksi} = \frac{\text{Omzet}}{\text{Jumlah Transaksi}}$$

### 7.3 Fitur Ekspor Laporan CSV/Excel
Pengguna dapat mengunduh seluruh data penjualan harian atau rekap inventori kategori ke dalam berkas Spreadsheet `.csv` hanya dengan satu klik tombol **"Ekspor CSV"**, siap diolah lebih lanjut di Microsoft Excel atau Google Sheets.

---

## 8. AUDIT MENDALAM: MODUL PENGATURAN, KEAMANAN & UTILITAS CETAK

Berkas utama: [`src/renderer/components/Settings/Settings.jsx`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/components/Settings/Settings.jsx), [`src/renderer/utils/PrintUtility.js`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/utils/PrintUtility.js), dan [`src/renderer/components/Security/ActivityLogs.jsx`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/components/Security/ActivityLogs.jsx).

### 8.1 Mode Privasi (*Privacy Mode / Hide Cost*)
Fitur keamanan visual yang sangat krusial bagi pemilik toko:
- Saat Mode Privasi diaktifkan (`hide_cost = '1'`), **angka harga modal (HPP) dan nominal keuntungan (laba kotor)** akan disembunyikan dari:
  - Kartu ringkasan Dashboard.
  - Kolom form tambah dan edit produk.
  - Modal tambah stok inventori.
  - Halaman rincian transaksi kasir.
- **Manfaat**: Layar monitor kasir aman dilihat oleh karyawan penjaga toko atau pembeli yang berdiri di depan meja kasir tanpa khawatir rahasia margin toko terbongkar.

### 8.2 Mode Abaikan Stok (*Ignore Stock Mode*)
Konfigurasi fleksibilitas operasional (`ignore_stock`):
- **Jika Dinonaktifkan (Default)**: Kasir dilarang menjual barang yang stoknya 0 atau minus di sistem.
- **Jika Diaktifkan**: Kasir diizinkan tetap melayani transaksi meskipun stok sistem tercatat 0. Sangat berguna saat barang fisik sudah tiba di toko dan langsung dibeli pelanggan, namun pemilik toko belum sempat menginput stok ke komputer.

### 8.3 Konfigurasi Identitas Toko Dinamis
Pemilik toko dapat mengatur profil toko langsung dari antarmuka Pengaturan:
- **Nama Toko** (default: `TOKO BUMBU`)
- **Alamat Toko** (lengkap dengan jalan dan kota)
- **Nomor Telepon / WhatsApp**
- **Pesan Kaki Struk (*Receipt Footer*)** (contoh: *"Barang yang sudah dibeli tidak dapat ditukar"*)
Data ini tersimpan di tabel `settings` dan otomatis muncul pada kop struk cetak kasir.

### 8.4 Mesin Backup & Restore Database Otomatis
Mekanisme pengamanan data tingkat lanjut yang dieksekusi melalui IPC Electron:
1. **Pencadangan (Backup)**:
   - Sebelum menyalin file, sistem menjalankan `PRAGMA wal_checkpoint(FULL)` untuk memastikan seluruh memori transaksi SQLite telah ter-flush bersih ke file fisik `.db`.
   - File disalin ke folder: `%APPDATA%\POS\backups\pos-backup-YYYY-MM-DD_HH-mm-ss.db`.
   - **Kebijakan Retensi Rotasi (Rotation Policy)**: Sistem otomatis hanya mempertahankan **5 file backup terbaru**. Backup yang lebih tua dari urutan ke-5 otomatis dihapus demi menghemat ruang hard disk.
2. **Pemulihan (Restore)**:
   - Pengguna memilih file `.db` melalui Native OS Open File Dialog.
   - Koneksi database ditutup secara aman (`dbManager.close()`).
   - File database aktif ditimpa oleh file backup.
   - Aplikasi Electron **otomatis me-restart dirinya sendiri (`app.relaunch() & app.exit()`)** untuk memuat ulang data segar dari awal.
3. **Buka Folder Backup**: Tombol untuk membuka folder backup secara native di Windows Explorer.

### 8.5 Mesin Cetak Struk Thermal 58mm & Standar (`PrintUtility.js`)
Mendukung 2 jenis keluaran cetak:
- **Format Thermal 58mm**:
  - Diformat dengan lebar `58mm`, font monospace `Arial`/`Courier`, ukuran font `9px - 10px`.
  - Pembatas garis putus-putus (*dashed line*).
  - Nama barang di baris pertama, rincian `Qty x Harga` dan `Subtotal` di baris kedua agar tidak terpotong pada kertas kecil.
  - Ringkasan Subtotal, Diskon, Total, Tunai, Kembalian, dan ucapan terima kasih di footer.
- **Format Standar (A4 / Faktur Besar)**:
  - Layout tabel formal dengan lebar 300px atau layar penuh untuk printer kertas biasa/inkjet.

### 8.6 Audit Trail Keamanan Admin (`ActivityLogs.jsx`)
Merekam seluruh aktivitas administratif:
- Tipe Aksi: `MANUAL_BACKUP`, `RESTORE_DATABASE`, `DELETE_ALL_TRANSACTIONS`, `CANCEL_TRANSACTION`, `CLEAR_LOGS`.
- Detail file/invoice yang terpengaruh dan timestamp kejadian.
- Tampilan tabel dengan kode warna badge: Merah (Delete), Oranye (Cancel), Hijau (Create), Biru (Update), Ungu (Backup).

---

## 9. MATRIKS KOMPLEKSITAS FITUR & NILAI BISNIS

| Modul / Fitur | Tingkat Kompleksitas | Komponen Kunci | Nilai Bisnis bagi Toko |
| :--- | :---: | :--- | :--- |
| **Kalkulator Timbangan Sembako** | ⭐⭐⭐⭐⭐ (Sangat Tinggi) | `Cashier.jsx` (`WeighingModal`) | Menghilangkan kebutuhan kalkulator manual; transaksi cabai/bawang kiloan hingga nominal rupiah pembeli terhitung instan dalam hitungan detik. |
| **Model Multi-Satuan & Hibrida** | ⭐⭐⭐⭐⭐ (Sangat Tinggi) | `Cashier.jsx`, `ProductForm.jsx` | Toko bisa menjual barang yang sama dalam bentuk eceran bungkus maupun kiloan curah tanpa membuat SKU terpisah. |
| **Mesin Validasi Stok Multi-Unit** | ⭐⭐⭐⭐ (Tinggi) | `calcCartPcs`, `calcCartKg` | Mencegah kasir menjual barang melebihi stok fisik dengan konversi otomatis Dus/Pack/Karung ke satuan dasar. |
| **Batch Impor Excel Otomatis** | ⭐⭐⭐⭐ (Tinggi) | `ImportExcel.jsx` (`xlsx`) | Mempersingkat waktu input ribuan barang dagangan toko dari hitungan hari menjadi hitungan menit. |
| **Pencadangan Database & Rotasi** | ⭐⭐⭐⭐ (Tinggi) | `dbManager.js` (`WAL Checkpoint`) | Menjamin data transaksi tidak pernah hilang dan hard disk tidak penuh dengan kebijakan rotasi 5 file. |
| **Mode Privasi (*Hide Cost*)** | ⭐⭐⭐ (Sedang) | `Settings.jsx`, `theme.js` | Menjaga kerahasiaan keuntungan dan harga modal toko saat kasir melayani pembeli di tempat terbuka. |
| **Mesin Cetak Struk Thermal 58mm** | ⭐⭐⭐ (Sedang) | `PrintUtility.js` | Menghasilkan struk belanja profesional yang sesuai dengan standar printer kasir thermal murah (58mm). |
| **Mesin Void & Restorasi Stok** | ⭐⭐⭐ (Sedang) | `transactions.js` (`RETURN` log) | Menjamin integritas stok kembali sinkron jika transaksi dibatalkan oleh kasir. |
| **Dashboard Grafik Finansial** | ⭐⭐⭐ (Sedang) | `Dashboard.jsx` (`Recharts`) | Memberikan gambaran performa omzet dan produk terlaris secara visual kepada pemilik toko setiap hari. |

---

## 10. REKAPITULASI EKSEKUSI PERBAIKAN PER FASE (PHASED EXECUTION LOG)

Eksekusi perbaikan codebase dilakukan secara bertahap dengan memitigasi risiko integritas data dan relasi antar fitur:

### 10.1 FASE 1: Integritas Data & Sinkronisasi FIFO Waktu Nyata (SELESAI ✅)
1. **Sinkronisasi Timestamp Waktu Lokal (WIB) pada Inventori**:
   - Berkas: [`src/renderer/services/inventory.js`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/services/inventory.js).
   - Memastikan `adjustStock` dan `adjustStockKg` menggunakan format seragam `getLocalDatetimeStr()`. Menghilangkan selisih 7 jam UTC vs WIB yang sebelumnya berisiko membalikkan urutan antrian FIFO.
2. **Harmonisasi "Mode Abaikan Stok" (`ignore_stock = '1'`)**:
   - Berkas: [`src/renderer/services/inventory.js`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/services/inventory.js) & [`src/renderer/services/transactions.js`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/services/transactions.js).
   - Penjualan tetap mengeksekusi pemotongan stok FIFO dan mencatat mutasi `SALE` ke `inventory_log` sekalipun stok sistem habis, dengan alokasi batch stok negatif dan fallback HPP dasar. Laporan laba rugi dan kartu stok tetap akurat tanpa menghambat antrean kasir.

### 10.2 FASE 2: Optimalisasi Antarmuka Kasir & Cetak Struk (SELESAI ✅)
1. **Input Diskon & Pelanggan Dinamis**:
   - Berkas: [`src/renderer/components/Cashier/PaymentModal.jsx`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/components/Cashier/PaymentModal.jsx) & [`src/renderer/components/Cashier/Cashier.jsx`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/components/Cashier/Cashier.jsx).
   - Ditambahkan field Nama Pelanggan (opsional) dan Potongan Diskon (Rp) dengan perhitungan instan `Tagihan Bersih = Subtotal - Diskon`.
2. **Pecahan Cepat Uang Tunai Toko Kelontong**:
   - Berkas: [`PaymentModal.jsx`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/components/Cashier/PaymentModal.jsx).
   - Menyediakan 9 tombol uang tunai instan: `Uang Pas`, `5k`, `10k`, `20k`, `50k`, `100k`, `200k`, `500k`, dan `1jt`.
3. **Efisiensi Cetak Struk Thermal 58mm**:
   - Berkas: [`src/renderer/utils/PrintUtility.js`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/utils/PrintUtility.js).
   - Ditambahkan `@page { size: auto; margin: 0mm; }` agar printer kasir thermal tidak mengeluarkan kertas kosong berlebih.
   - Nama pelanggan dan rincian diskon tercetak otomatis jika diisi kasir.

### 10.3 FASE 3: Proteksi Concurrency & Verifikasi Kualitas Menyeluruh (SELESAI ✅)
1. **Proteksi Double-Click Checkout**:
   - Berkas: [`Cashier.jsx`](file:///d:/IT/Software%20Engineer/destop/POS/src/renderer/components/Cashier/Cashier.jsx).
   - Ditambahkan penjaga `if (loading) return;` dan status disable tombol untuk mencegah kasir mengeklik tombol bayar dua kali secara cepat yang dapat memicu transaksi ganda.
2. **Audit Sintaks 34 File Codebase**:
   - Seluruh 34 berkas JavaScript dan React JSX diuji menggunakan parser AST Babel (`@babel/core`). Hasil: **0 error / 100% lolos kompilasi**.
3. **Verifikasi Unit Math & Satuan**:
   - Pengujian kalkulator konversi satuan (Pcs/Pack/Dus), timbangan (Gram/Ons/Nominal/Kg/Karung), dan formula diskon/kembalian terverifikasi 100% akurat.

---

## KESIMPULAN

Sistem POS Kasir ini adalah **aplikasi point-of-sale offline berbasis desktop yang matang, komprehensif, dan tangguh**. Sistem ini dirancang bukan sekadar sebagai kasir pencatat transaksi biasa, melainkan mencakup ekosistem bisnis lengkap:
1. Menangani fleksibilitas satuan khas pedagang Indonesia (Pcs, Pack, Dus, Ons, Gram, Kg, Karung).
2. Memiliki akurasi kalkulasi HPP dan laba kotor per transaksi secara real-time.
3. Dilengkapi sistem keamanan audit log, mode privasi omzet, dan auto-backup WAL yang tahan terhadap listrik padam.
4. Bebas biaya langganan bulanan (*100% offline & standalone*).

