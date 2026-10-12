# Gap Analysis POS Toko Kelontong: Sistem Saat Ini vs Kebutuhan Nyata

Oct 13, 2026 · @lexa

## Ringkasan

Sistemmu sudah menyelesaikan masalah yang membedakan toko kelontong dari minimarket (satuan bertingkat, timbangan curah, stok per batch, offline), tetapi belum menyelesaikan sisi uangnya. Lima celah terbesar, berurutan:

1. **Kasbon dan piutang pelanggan.** Skema database tidak punya tabel pelanggan maupun pencatatan utang, padahal menurut BukuWarung hampir semua jenis UMKM memberi utang ke pelanggan.
2. **Kas harian dan shift.** Hitung kas laci dan selisihnya tidak tercantum, sehingga uang di laci tidak bisa dicocokkan dengan laporan.
3. **Biaya dan laba bersih.** Laporan berhenti di laba kotor, dan rumus yang dilabeli "Margin Bersih" sebenarnya margin kotor.
4. **Supplier, pembelian, hutang dagang.** Stok masuk tercatat, tetapi utang ke supplier tidak.
5. **Kontrol akses dan backup di luar komputer.** Tanpa peran, aksi seperti hapus semua transaksi dan restore tampaknya terbuka untuk siapa saja di kasir, dan backup hanya ada di komputer yang sama.

Urutan kerja yang disarankan ada di bagian roadmap. Analisis ini membandingkan dokumen, bukan kode, karena source tidak ikut terkirim.

## Cara kerja toko kelontong yang sebenarnya

Toko kelontong berjalan di atas enam arus kerja: kas harian, kasbon pelanggan, pembelian stok dari grosir, harga jual yang sering berubah, stok fisik, dan barang digital. Pencatatan manual membuat keenamnya mudah meleset.

| Arus kerja | Yang terjadi sehari-hari | Dampak kalau tidak tercatat |
| --- | --- | --- |
| Kas harian | Hasil jualan langsung diputar jadi modal, dan uang usaha sering bercampur dengan uang pribadi ([UKM Indonesia](https://ukmindonesia.id/baca-deskripsi-posts/8-cara-mengelola-kas-harian-di-toko-kelontong-agar-modal-tidak-bocor), [Univ. Galuh](https://proceedings.conference.unpas.ac.id/index.php/pkm/article/download/349/269)) | Laba sebenarnya tidak diketahui, modal "bocor" |
| Kasbon pelanggan | Menurut BukuWarung, hampir semua jenis UMKM memberi utang ke pelanggan, dengan pelunasan yang pada satu contoh baru seminggu sampai dua minggu kemudian ([Bisnis.com](https://finansial.bisnis.com/read/20210810/563/1428325/umkm-suka-ngutangin-pembeli-aplikasi-bukuwarung-bisa-bantu-jadi-pengingat-tagihan)) | Piutang menumpuk dan mengganggu likuiditas ([UTP](https://ejournal.utp.ac.id/index.php/ganesha/article/download/4858/520522989)) |
| Pembelian stok | Stok dibeli dari grosir, dan marketplace grosir menawarkan bayar tempo ke warung ([Kontan](https://industri.kontan.co.id/news/beri-layanan-pay-later-bagi-mitra-blibli-luncurkan-fitur-pembayaran-tempo), [Industry.co.id](https://www.industry.co.id/read/58888/modalku-tokopedia-luncurkan-fitur-tempo-lancarkan-arus-kas-pedagang-warung)) | Utang ke supplier dan HPP tidak sinkron |
| Harga jual | Harga eceran dan grosir berjalan berdampingan, dan harga naik-turun mengikuti supplier ([HashMicro](https://www.hashmicro.com/id/blog/aplikasi-kasir-toko-sembako/)) | Margin tergerus tanpa disadari |
| Stok fisik | Banyak pemilik mengandalkan ingatan atau cek langsung ke rak ([Ilmudata](https://journal.ilmudata.co.id/index.php/RIGGS/article/download/11877/8689)); pencatatan manual membuat stok sulit dipantau dan laporan telat ([PNJ](https://prosiding.pnj.ac.id/index.php/SNAM/article/download/5433/3134/27242)) | Barang kosong atau menumpuk tanpa terdeteksi |
| Barang digital | Permintaan pengguna warung mendorong BukuWarung menambah penjualan pulsa, listrik, dan tagihan ([Bisnis.com](https://finansial.bisnis.com/read/20210810/563/1428325/umkm-suka-ngutangin-pembeli-aplikasi-bukuwarung-bisa-bantu-jadi-pengingat-tagihan)) | Omzet dan margin tidak lengkap |

Dari sini, urutan kebutuhan pemilik adalah: tahu laba hari ini, tahu siapa berutang berapa, tahu apa yang harus dibeli dan ke siapa berutang, dan menjaga harga tetap mutakhir. Urutan ini dipakai sebagai skala prioritas di gap analysis.

## Standar POS profesional untuk retail dan grosir

POS retail yang umum dipakai UMKM Indonesia mencakup tujuh kelompok kemampuan. Toko yang juga menjual grosir menambah lima lagi: harga per pelanggan, kredit pelanggan, pembelian ke supplier, multi-satuan, dan kontrol akses.

| Kemampuan | Isi standarnya | Sumber |
| --- | --- | --- |
| Transaksi dan pembayaran | Barcode/SKU, diskon, split payment, refund terkontrol, QRIS/e-wallet/kartu | [HashMicro](https://www.hashmicro.com/id/blog/aplikasi-kasir-toko-terbaik-untuk-membantu-bisnis-anda/), [Kasir Pintar](https://apps.apple.com/app/id1594336570) |
| Stok | Stok berkurang otomatis saat jual, batas min-max atau reorder point, multi-gudang | [HashMicro](https://www.hashmicro.com/id/blog/aplikasi-kasir-toko-terbaik-untuk-membantu-bisnis-anda/) |
| Harga dan promo | Price book, diskon bertingkat, voucher, paket bundling | [HashMicro](https://www.hashmicro.com/id/blog/aplikasi-kasir-toko-terbaik-untuk-membantu-bisnis-anda/) |
| Retur, tukar, hold | Retur dengan kode alasan, tukar barang, suspend transaksi saat antrean padat | [HashMicro](https://www.hashmicro.com/id/blog/aplikasi-kasir-toko-terbaik-untuk-membantu-bisnis-anda/) |
| Pelanggan | Database pelanggan, riwayat belanja, poin dan voucher | [HashMicro](https://www.hashmicro.com/id/blog/aplikasi-kasir-toko-terbaik-untuk-membantu-bisnis-anda/), [Majoo](https://majoo.id/blog/detail/bisnis-maju-dengan-aplikasi-toko-kelontong-modern?amp=1) |
| Kas dan shift | Buka/tutup shift, hitung kas, petty cash, rekonsiliasi selisih; hitungan laci sebaiknya "buta" agar kasir tidak melihat target | [HashMicro](https://www.hashmicro.com/id/blog/aplikasi-kasir-toko-terbaik-untuk-membantu-bisnis-anda/), [ERPNext POS Shift](https://ecosire.com/apps/erpnext/erpnext-pos-shift-cash-management) |
| Offline | Tetap bisa jualan tanpa internet | [Majoo](https://majoo.id/blog/detail/bisnis-maju-dengan-aplikasi-toko-kelontong-modern?amp=1) |
| Multi-satuan | Tiap satuan punya harga sendiri, stok dihitung lewat konversi | [Odoo POS Multi UOM](https://apps.odoo.com/apps/modules/19.0/ywt_pos_multi_uom) |
| Harga grosir | Harga bertingkat per jumlah dan price book per pelanggan | [Lightspeed](https://www.lightspeedhq.com/blog/how-pos-support-wholesale-business/), [HashMicro](https://www.hashmicro.com/id/blog/aplikasi-kasir-toko-sembako/) |
| Kredit pelanggan | Limit kredit dan termin bayar per klien; kasbon disebut sering luput di perbandingan aplikasi umum | [Lightspeed](https://www.lightspeedhq.com/blog/how-pos-support-wholesale-business/), [HashMicro](https://www.hashmicro.com/id/blog/aplikasi-kasir-toko-sembako/) |
| Pembelian dan supplier | Purchase order ke supplier, hutang dagang, laporan margin per produk | [HashMicro](https://www.hashmicro.com/id/blog/aplikasi-kasir-toko-sembako/), [Kasir Pintar](https://prosiding.pnj.ac.id/index.php/SNAM/article/download/5433/3134/27242) |
| Kontrol akses | Peran kasir/supervisor/pemilik, PIN manajer untuk void, diskon, dan refund, laporan per kasir | [Ecosire POS Staff](https://ecosire.com/de/apps/magento-2/magento-2-pos-staff-permissions-shifts) |

Riwayat rilis Kasir Pintar mencatat perbaikan bug pada keuntungan dan retur barang multisatuan ([App Store](https://apps.apple.com/app/id1594336570)). Artinya konversi satuan memang area yang gampang salah, termasuk di produk komersial.

Dari ketiga dokumen yang kamu kirim, dua hal terlihat sebagai pembeda sistemmu: kalkulator timbangan dengan input nominal uang, dan konversi lima satuan dengan HPP per batch. Saya belum membandingkannya satu per satu dengan tiap kompetitor.

## Gap analysis: sistemmu vs kebutuhan

Fondasi sistemmu kuat di satuan dan stok, tetapi belum menyentuh sisi uang yang paling sering bermasalah di toko kelontong: kasbon, kas harian, biaya, dan hutang ke supplier. Kolom "Kondisi sistemmu" saya ambil dari kedua dokumen yang kamu kirim, belum dari kode, jadi "tidak tercantum" berarti tidak disebut di dokumen.

| Area | Kondisi sistemmu | Yang dibutuhkan | Status dan prioritas |
| --- | --- | --- | --- |
| Kasbon dan piutang pelanggan | Tidak tercantum. Tidak ada tabel pelanggan, `customer_name` hanya teks di transaksi, dan metode bayar hanya tunai, debit, QRIS | Catat siapa berutang berapa, cicilan, jatuh tempo, pengingat tagih, limit per pelanggan | Belum ada. **Kritis** |
| Kas dan shift | Tidak tercantum | Buka/tutup shift, hitung uang di laci, selisih kas | Belum ada. **Tinggi** |
| Biaya operasional dan laba bersih | Laporan berhenti di laba kotor (omzet dikurangi HPP) | Catat biaya (listrik, plastik, ongkos) dan prive, hitung laba bersih | Belum ada. **Tinggi** |
| Supplier, pembelian, hutang dagang | Stok masuk mencatat harga beli, batch, dan kedaluwarsa. Master supplier, nota pembelian, dan hutang tempo tidak tercantum | Master supplier, nota pembelian, hutang dengan jatuh tempo, riwayat harga beli | Sebagian. **Tinggi** |
| Peran dan kontrol akses | Tidak tercantum login atau peran. Log aktivitas punya kolom `user`. Hapus semua transaksi, restore, dan mode privasi ada sebagai fitur tanpa penjaga akses yang tercantum | Peran pemilik dan kasir, PIN pemilik untuk void, hapus, restore, dan ubah harga | Belum ada. **Tinggi** |
| Cadangan data | Backup otomatis dan manual ke folder di komputer, rotasi 5 file | Salinan di luar komputer toko (flashdisk atau cloud) | Sebagian. **Tinggi** |
| Retur | Pembatalan satu invoice penuh mengembalikan stok. Retur sebagian per item dan retur ke supplier tidak tercantum | Retur sebagian dengan alasan, retur ke supplier, dampaknya ke kas, stok, dan laporan | Sebagian. **Tinggi** |
| Kedaluwarsa | Batch punya tanggal kedaluwarsa dan ada mutasi EXPIRED. Pemotongan disebut FIFO, peringatan hampir kedaluwarsa tidak tercantum | FEFO: yang paling dekat kedaluwarsa dijual dulu ([contoh penerapan](https://journal.unilak.ac.id/index.php/zn/article/view/24995)), plus daftar barang hampir kedaluwarsa | Sebagian. **Tinggi** untuk barang berumur pendek |
| Laporan untuk keputusan | Omzet, HPP, laba kotor, margin, tren, top 5 produk, kategori, ekspor CSV | Daftar belanja dari stok menipis, nilai persediaan, laporan piutang dan hutang, ringkasan per shift | Sebagian. **Sedang** |
| Pembayaran | Tunai, debit, QRIS dicatat sebagai metode. Tidak ada bayar terpisah dan biaya QRIS | Bayar sebagian tunai sebagian QRIS, pelunasan piutang, biaya QRIS masuk laporan (0,3% untuk usaha mikro, 0,7% untuk segmen usaha lain, per [BI via CNN Indonesia](https://www.cnnindonesia.com/ekonomi/20230714133152-78-973456/alasan-transaksi-qris-usaha-wong-cilik-kena-biaya-03-persen)) | Sebagian. **Sedang** |
| Tahan transaksi | Tidak tercantum | Tahan satu keranjang saat pelanggan lain dilayani ([HashMicro](https://www.hashmicro.com/id/blog/aplikasi-kasir-toko-terbaik-untuk-membantu-bisnis-anda/)) | Belum ada. **Sedang** |
| Diskon dan harga langganan | Satu kolom diskon per transaksi dan Harga Kustom per item. Harga mengikuti satuan, belum per pelanggan atau per jumlah | Harga langganan, diskon per item, harga turun jika beli banyak | Sebagian. **Sedang** |
| Barang digital | Tidak tercantum | Pulsa, token listrik, tagihan, jika tokomu menjualnya | Belum ada. **Opsional**, tanyakan ke pemilik toko |
| Banyak kasir atau cabang | Satu komputer dengan database lokal | Sinkronisasi antar perangkat | Belum ada. **Rendah** sampai ada kebutuhan |
| Multi-satuan dan timbangan | Lima satuan, produk hibrida, kalkulator timbangan tiga tab, stok per batch | Pengujian otomatis agar konversi dan pembulatan terjamin | Sudah ada, kuat. Perlu diuji |
| Offline dan struk | Offline penuh, struk thermal 58 mm dan standar, identitas toko dari pengaturan |  | Sudah ada |

## Sudut pandang per peran

Semua peran sampai pada satu kesimpulan: tambah fitur uang dulu, tetapi lewat jalur yang tidak menambah utang teknis. Kolom "Jenis" memisahkan fakta dari dokumen, kekurangan desain, risiko berindikasi (belum terbukti tanpa kode), dan usulan.

| Peran | Temuan | Jenis | Rekomendasi |
| --- | --- | --- | --- |
| Project Manager | Laporan audit sebelumnya menyatakan "Production Ready", padahal tes otomatis 0% dan dua bug (BUG-07 crash startup, BUG-08 error di modal tambah stok) baru tercatat selesai sehari setelah tanggal laporan | Fakta dari dokumen | Anggap siap pakai terbatas sampai ada tes untuk jalur uang dan stok |
| Business Analyst | Alur kasbon, pembelian ke supplier, dan hutang dagang tidak ada, sehingga laba di laporan tidak bisa dicocokkan dengan uang di laci | Kekurangan desain | Wawancarai pemilik: berapa persen penjualan berupa kasbon, siapa supplier utama, apakah jual pulsa atau gas |
| Software Architect | Fitur uang baru akan menyentuh banyak tabel, sementara SQL mentah masih dirakit di renderer (dicatat sendiri di audit sebagai tugas Sprint 3) | Utang teknis | Tulis fitur baru lewat lapisan data di main process, jangan menambah SQL mentah baru di renderer |
| Senior Engineer | Tanpa kode saya tidak bisa menilai. Titik baca pertama: pembulatan tab nominal uang ke kg, FIFO lintas batch, pengembalian stok saat void | Risiko berindikasi | Kirim file service dan modal kasir agar bisa diuji dengan skrip |
| Database Engineer | Piutang dan hutang cocok dimodelkan sebagai buku besar (tiap utang dan tiap pembayaran satu baris, saldo dijumlahkan). Migrasi sekarang berupa `ALTER TABLE` tanpa nomor versi skema | Kekurangan desain | Tambah nomor versi skema sebelum menambah tabel pelanggan, supplier, pembelian, shift, biaya |
| Finance Specialist | Rumus "Margin Bersih" sebenarnya laba kotor dibagi omzet. Begitu kasbon ada, penjualan kasbon akan masuk omzet padahal uangnya belum masuk | Fakta dari dokumen, dan kekurangan desain | Pisahkan omzet, kas masuk, piutang, laba kotor, dan laba bersih. Ubah labelnya |
| Inventory Specialist | FIFO menilai HPP, sedangkan FEFO mengatur barang fisik mana yang keluar dulu ([MRPeasy](https://www.mrpeasy.com/blog/fefo-first-expired-first-out/)). Retur sebagian dan daftar belanja otomatis belum ada | Kekurangan desain | Urutkan pemotongan stok dengan kedaluwarsa terdekat, tambah retur sebagian, tambah daftar barang yang perlu dibeli |
| QA Architect | Tidak ada script `test` di `package.json`, `lint` hanya `echo` | Fakta dari dokumen | Mulai dari tes konversi satuan, pembulatan timbangan, FIFO lintas batch, void; setiap fitur baru lahir dengan kriteria uji |
| QA Tester | Skenario nyata yang belum pernah dijalankan: pelanggan ngutang tiga kali lalu bayar sebagian; nominal Rp 5.000 pada harga Rp 18.000/kg; retur sebagian setelah tutup toko; listrik padam saat pembayaran | Usulan skenario | Jadikan daftar uji manual sebelum tes otomatis siap |
| Security Engineer | Dokumen tidak menyebut login. Siapa pun di kasir tampak bisa hapus semua transaksi, restore, dan mematikan mode privasi. Renderer mengirim SQL mentah lewat IPC. Versi `xlsx` 0.18.5 setahu saya punya advisori keamanan, perlu dicek ulang | Risiko berindikasi | PIN pemilik untuk aksi berbahaya, validasi file import, cek versi `xlsx` sebelum rilis |
| UI/UX Auditor | Konfirmasi dua langkah untuk kosongkan keranjang sudah baik. Belum ada tahan transaksi untuk antrean, dan layar kasbon harus bisa dicari nama dalam dua ketukan | Usulan | Tambah tahan transaksi, pakai konfirmasi PIN untuk aksi destruktif |
| Performance dan Reliability | Backup hanya di komputer yang sama. Perilaku saat printer atau database gagal tidak tercantum | Risiko berindikasi | Salin backup otomatis ke flashdisk, tampilkan status backup terakhir di dashboard |
| Build dan Release | `package.json` versi 1.0.0, laporan menyebut 1.0.1. Tidak ada mekanisme pembaruan. Fix `sqlite3` dengan `externals` perlu diuji pada hasil `npm run make`, bukan hanya `npm start` | Fakta dari dokumen, dan risiko berindikasi | Uji installer di komputer bersih, sinkronkan nomor versi |
| Documentation Auditor | Jumlah tabel (7 vs 8) dan versi berbeda antar dokumen. `PANDUAN_PENGGUNAAN.txt` belum saya terima | Fakta dari dokumen | Satu sumber kebenaran, tambah changelog |
| Tech Lead | Arsitek ingin refaktor dulu, PM ingin fitur dulu. Bukti: setiap fitur uang menulis ke tabel baru dan ke laporan laba, jadi laporan harus didefinisikan ulang sekali saja | Keputusan | Fitur baru dibangun lewat lapisan data baru, kode lama dirapikan bertahap, jangan refaktor total dulu |

## Prioritas dan roadmap

Mulai dari kasbon, karena itu yang paling sering bermasalah di toko dan menjadi dasar fase lain lewat tabel pelanggan.

&#91;embedded content: roadmap · 4 fase, 3 gerbang\]

PIN pemilik dan backup ke luar komputer ikut fase 1 karena melindungi data kasbon sejak hari pertama. Laporan laba didefinisikan ulang sekali di fase 2, supaya tidak dibongkar dua kali. Tes untuk tiap fitur ditulis bersamaan dengan fiturnya, bukan menunggu fase 4.

## Batasan analisis dan sumber

- Kondisi sistemmu saya ambil dari `package.json` dan dua dokumen audit. Kode, database, dan `PANDUAN_PENGGUNAAN.txt` belum diperiksa, jadi "tidak tercantum" tidak sama dengan "tidak ada".
- Tidak ada pengujian yang dijalankan. Semua temuan berjenis "risiko berindikasi" masih perlu dibuktikan dengan kode.
- Studi toko kelontong yang saya temukan umumnya berskala satu toko. Beberapa sumber adalah blog vendor (HashMicro, Majoo, Ecosire) yang berkepentingan menjual produk, jadi saya memakainya untuk daftar fitur, bukan untuk klaim manfaat.
- Sebagian besar sumber saya baca dari cuplikan hasil pencarian. Hanya satu halaman HashMicro yang dibuka penuh.
- Tarif QRIS 0,3% dan 0,7% berasal dari liputan 2023. Cek ke penyedia QRIS-mu untuk tarif terbaru.
- Catatan keamanan tentang `xlsx` 0.18.5 berasal dari pengetahuan saya, belum saya verifikasi lewat pencarian.

**Sumber**

- [UKM Indonesia: kas harian toko kelontong](https://ukmindonesia.id/baca-deskripsi-posts/8-cara-mengelola-kas-harian-di-toko-kelontong-agar-modal-tidak-bocor)
- [Universitas Galuh: format akuntansi sederhana toko kelontong](https://proceedings.conference.unpas.ac.id/index.php/pkm/article/download/349/269)
- [Bisnis.com: BukuWarung dan pengingat utang-piutang](https://finansial.bisnis.com/read/20210810/563/1428325/umkm-suka-ngutangin-pembeli-aplikasi-bukuwarung-bisa-bantu-jadi-pengingat-tagihan)
- [UTP: pendampingan buku kas digital Toko Ilham](https://ejournal.utp.ac.id/index.php/ganesha/article/download/4858/520522989)
- [Kontan: Pembayaran Tempo Blibli Mitra](https://industri.kontan.co.id/news/beri-layanan-pay-later-bagi-mitra-blibli-luncurkan-fitur-pembayaran-tempo)
- [Industry.co.id: fitur Tempo Modalku dan Tokopedia](https://www.industry.co.id/read/58888/modalku-tokopedia-luncurkan-fitur-tempo-lancarkan-arus-kas-pedagang-warung)
- [HashMicro: aplikasi kasir toko sembako](https://www.hashmicro.com/id/blog/aplikasi-kasir-toko-sembako/)
- [HashMicro: 17 aplikasi kasir toko](https://www.hashmicro.com/id/blog/aplikasi-kasir-toko-terbaik-untuk-membantu-bisnis-anda/)
- [Ilmudata: BukuWarung di Warung Kelontong Fitri](https://journal.ilmudata.co.id/index.php/RIGGS/article/download/11877/8689)
- [PNJ: Kasir Pintar di Toko Kelontong Mas Soni](https://prosiding.pnj.ac.id/index.php/SNAM/article/download/5433/3134/27242)
- [Majoo: aplikasi toko kelontong modern](https://majoo.id/blog/detail/bisnis-maju-dengan-aplikasi-toko-kelontong-modern?amp=1)
- [Lightspeed: POS untuk bisnis grosir](https://www.lightspeedhq.com/blog/how-pos-support-wholesale-business/)
- [Odoo: POS Multi UOM](https://apps.odoo.com/apps/modules/19.0/ywt_pos_multi_uom)
- [Ecosire: POS Shift and Cash Management untuk ERPNext](https://ecosire.com/apps/erpnext/erpnext-pos-shift-cash-management)
- [Ecosire: POS Staff Roles, Permissions and Shifts](https://ecosire.com/de/apps/magento-2/magento-2-pos-staff-permissions-shifts)
- [App Store: Kasir Pintar POS, riwayat rilis](https://apps.apple.com/app/id1594336570)
- [Unilak: penerapan FEFO di UD Erni](https://journal.unilak.ac.id/index.php/zn/article/view/24995)
- [MRPeasy: FEFO](https://www.mrpeasy.com/blog/fefo-first-expired-first-out/)
- [CNN Indonesia: tarif QRIS usaha mikro](https://www.cnnindonesia.com/ekonomi/20230714133152-78-973456/alasan-transaksi-qris-usaha-wong-cilik-kena-biaya-03-persen)
