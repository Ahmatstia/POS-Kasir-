const sqlite3 = require('sqlite3');
const fs = require('fs');

const dbPath = 'C:\\Users\\ACER\\AppData\\Roaming\\POS\\pos-toko-bumbu.db';
const db = new sqlite3.Database(dbPath);

const rawData = `
Maizena 100g Bahan Kue Pcs Rp5.000
Maizena 3000 Bahan Kue Pcs Rp10.000
Maizena Kiloan Bahan Kue Pcs Rp20.000
Vanili Cair Bahan Kue Pcs Rp28.000 Rp5.000
Vanili Bubuk Bahan Kue Pcs Rp30.000 Rp6.000
Vanili Kotak Bahan Kue Pcs Rp20.000 4 /1000
Induk Roti Fermipan Bahan Kue Pcs Rp15.000 Rp5.000
Induk Roti Dry Baker Yeast Bahan Kue Pcs Rp14.000 Rp4.000
Induk Roti Prime Bahan Kue Pcs Rp40.000 10000/Ons
Tepung Segitiga Biru Kemasan Bahan Kue Pcs Rp13.000
Tepung Segitiga Biru Kiloan Bahan Kue Kg Rp11.000
Tepung Beras Bahan Kue Pcs Rp8.000
Tepung Ketan Bahan Kue Pcs Rp12.000
Tepung Sagu Tani Bahan Kue Pcs Rp8.000
Agar-agar Satelit Bahan Kue Pcs Rp40.000 Rp4.000
Agar-agar Nutrigel Bahan Kue Pcs Rp25.000 Rp3.000
SP Bahan Kue Pcs Rp32.000 Rp7.000
TBM Bahan Kue Pcs Rp32.000 Rp7.000
Soda Botol Bahan Kue Pcs Rp25.000 Rp5.000
Bikarbonat Bahan Kue Pcs Rp25.000 Rp5.000
Baking Powder Bahan Kue Pcs Rp30.000 Rp6.000
Srikaya Bubuk Bahan Kue Pcs Rp25.000
Minyak Pisang Bahan Kue Pcs Rp75.000 Rp7.000
Pasta Bahan Kue Pcs Rp28.000 Rp5.000
Coklat Bubuk Bahan Kue Pcs Rp70.000 Rp4.000
Coklat Batang Bahan Kue Pcs Rp15.000
Pewarna Cair Bahan Kue Pcs Rp25.000 Rp5.000
Gincu Bubuk Bahan Kue Pack/Pcs Rp17.000 Rp2.000
Keju Bahan Kue Pcs Rp13.000
Anti Basi Bahan Kue Kg Rp60.000
Gula Es Bahan Kue Kg Rp45.000
Maizena Kiloan Bahan Kue Kg Rp50.000
Soda Kiloan Bahan Kue Kg Rp20.000
Soda As Kiloan Bahan Kue Kg Rp35.000
SP Kiloan Bahan Kue Kg Rp60.000
TBM Kiloan Bahan Kue Kg Rp60.000
Seres Bahan Kue Kg Rp28.000
Sagu Mutiara Bahan Kue Kg Rp28.000
Wijen Bahan Kue Kg Rp60.000
Susu Bubuk Bahan Kue Kg Rp35.000
Kemiri Rempah-rempah Kg Rp60.000
Ketumbar Rempah-rempah Kg Rp30.000
Pala Rempah-rempah Kg Rp120.000
Kayu manis Rempah-rempah Kg Rp120.000
merica Rempah-rempah Kg Rp180.000
pekkah (Bunga Lawang) Rempah-rempah Kg Rp140.000
kapulaga Rempah-rempah Kg Rp180.000
cengkeh Rempah-rempah Kg Rp200.000
adas manis Rempah-rempah Kg Rp100.000
jintan Rempah-rempah Kg Rp100.000
kembang pala Rempah-rempah Kg Rp300.000
Asam Kandis Rempah-rempah Kg Rp50.000
Rendang bubuk Rempah-rempah Kg Rp80.000
Semur bubuk Rempah-rempah Kg Rp80.000
Gulai bubuk Rempah-rempah Kg Rp80.000
Kacang Tanah Bahan Pangan Kg Rp32.000
Kacang Merah Bahan Pangan Kg Rp28.000
Kacang Hijau Bahan Pangan Kg Rp26.000
Ketan Putih Bahan Pangan Kg Rp20.000
Ketan Hitam Bahan Pangan Kg Rp28.000
Tepung Panir Bahan Pangan Kg Rp18.000
Cup Oval 12oz Cup/Gelas Pack Rp17.000
Cup Oval 14oz Cup/Gelas Pack Rp17.000
Cup Oval 16oz Cup/Gelas Pack Rp17.000
Cup Oval 18oz Cup/Gelas Pack Rp18.000
Cup Oval 22oz Cup/Gelas Pack Rp18.000
Cup Flat 12oz Cup/Gelas Pack Rp10.000
Cup Flat 14oz Cup/Gelas Pack Rp10.000
Cup Flat 16oz Cup/Gelas Pack Rp10.000
Cup Flat 18oz Cup/Gelas Pack Rp18.000
Cup Flat 22oz Cup/Gelas Pack Rp18.000
Cup Kopi Cup/Gelas Pack Rp15.000
Cup Puding Cup/Gelas Pack Rp6.000
Cup Pet 30ml (cup pakai tutup) Cup/Gelas Pack Rp10.000
Cup Pet 60ml (cup pakai tutup) Cup/Gelas Pack Rp10.000
Cup Pet 70ml (cup pakai tutup) Cup/Gelas Pack Rp10.000
Cup bola-bola Besar Cup/Gelas Pack Rp10.000
Cup bola-bola Kecil Cup/Gelas Pack Rp6.000
Mika Jumbo Mika Pcs Rp95.000 Rp2.000
Mika 1A Mika Pcs Rp65.000 Rp1.500
Mika 2A Mika Pcs Rp35.000 Rp1.000
Mika 3A Mika Pcs Rp25.000
Mika 4A Mika Pcs Rp20.000
Mika 5A Mika Pcs Rp18.000
Mika 7C Mika Pcs Rp7.000
Mika Bulat TX22 Mika Pcs Rp75.000 Rp2.000
Mika Bulat TX18 Mika Pcs Rp65.000 Rp1.500
Mika Bulat TX16 Mika Pcs Rp50.000 Rp1.000
Mika T18 Mika Sekat 4 Mika Pcs Rp13.000
Mika T20 Mika Sekat 5 Mika Pcs Rp15.000
Mika Brownis S Mika Pcs Rp60.000 Rp1.500
Mika Brownis M Mika Pcs Rp70.000 Rp1.500
Mika Brownis L Mika Pcs Rp80.000 Rp2.000
Mika Burger Mika Pcs Rp18.000
Thinwall Kotak 250ml Thinwall Pack Rp20.000
Thinwall Kotak 650ml Thinwall Pack Rp30.000
Thinwall Kotak 750ml Thinwall Pack Rp30.000
Thinwall Kotak 1000ml Thinwall Pack Rp35.000
Thinwall Kotak 1500ml Thinwall Pack Rp40.000
Thinwall Bulat 300ml Thinwall Pack Rp20.000
Thinwall Bulat 400ml Thinwall Pack Rp25.000
Botol Petak 250ml Botol Pcs Rp3.000
Botol Petak 500ml Botol Pcs Rp6.000
Botol Bulat 250ml Botol Pcs Rp3.000
Botol Bulat 1000ml Botol Pcs Rp7.000
Pipet Lurus Pipet Pack Rp15.000
Pipet Bengkok Pipet Pack Rp15.000
Pipet Pop Ice Pipet Pack Rp10.000
Pipet Steril Kecil Pipet Pack Rp15.000
Pipet Steril Besar Pipet Pack Rp15.000
Plastik PE Singa Laut (10x17) Plastik Pack Rp30.000
Plastik PE Singa Laut (13x21) Plastik Pack Rp30.000
Plastik PE Singa Laut (15x28) Plastik Pack Rp30.000
Plastik PE Singa Laut (20x34) Plastik Pack Rp30.000
Plastik PE Mahkota (10x17) Plastik Pack Rp9.000
Plastik PE Mahkota (13x21) Plastik Pack Rp9.000
Plastik PE Mahkota (15x28) Plastik Pack Rp9.000
Plastik PE Mahkota (20x34) Plastik Pack Rp9.000
Plastik PE Kharisma (10x17) Plastik Pack Rp9.000
Plastik PE Kharisma (13x21) Plastik Pack Rp9.000
Plastik PE Kharisma (15x28) Plastik Pack Rp9.000
Plastik PE Kharisma (20x34) Plastik Pack Rp9.000
Plastik HD Idola (10x17) Plastik Pack Rp10.000
Plastik HD Idola (13x21) Plastik Pack Rp10.000
Plastik HD Idola (12x22) Plastik Pack Rp10.000
Plastik HD Idola (15x28) Plastik Pack Rp10.000
Plastik HD Idola (20x34) Plastik Pack Rp10.000
Plastik PP Idola (5x8) Plastik Pack Rp10.000
Plastik PP Idola (6x10) Plastik Pack Rp10.000
Plastik PP Idola (7x12) Plastik Pack Rp10.000
Plastik PP Idola (8x13) Plastik Pack Rp10.000
Plastik PP Idola (9x15) Plastik Pack Rp10.000
Plastik PP Idola (10x17) Plastik Pack Rp10.000
Plastik PP Idola (13x21) Plastik Pack Rp10.000
Plastik PP Idola (15x28) Plastik Pack Rp10.000
Plastik PP Idola (20x34) Plastik Pack Rp10.000
Plastik PP Bawang (5x8) Plastik Pack Rp10.000
Plastik PP Bawang (6x10) Plastik Pack Rp10.000
Plastik PP Bawang (7x12) Plastik Pack Rp10.000
Plastik PP Bawang (8x13) Plastik Pack Rp10.000
Plastik PP Bawang (9x15) Plastik Pack Rp10.000
Plastik PP Bawang (10x17) Plastik Pack Rp10.000
Plastik PP Bawang (13x21) Plastik Pack Rp10.000
Plastik PP Bawang (15x28) Plastik Pack Rp10.000
Plastik PP Bawang (20x34) Plastik Pack Rp10.000
Plastik Lilin Kharisma (3x18) Plastik Pack Rp5.000
Plastik Lilin Kharisma (4x20) Plastik Pack Rp5.000
Plastik Lilin Kharisma (5x20) Plastik Pack Rp5.000
Plastik Sampah (60x100) Plastik Pack Rp12.000
Plastik Sampah (90x120) Plastik Pack Rp12.000
Plastik OPP 25 Plastik Pack Rp25.000
Plastik OPP 28 Plastik Pack Rp25.000
Plastik OPP 35 Plastik Pack Rp25.000
Plastik Klip (4x6) Plastik Pack Rp3.000
Plastik Klip (5x8) Plastik Pack Rp4.000
Plastik Klip (6x10) Plastik Pack Rp5.000
Plastik Klip (7x10) Plastik Pack Rp6.000
Plastik Klip (8x12) Plastik Pack Rp7.000
Idola Biru 15 Kantong Plastik Pack Rp10.000
Idola Biru 19 Kantong Plastik Pack Rp10.000
Idola Biru 24 Kantong Plastik Pack Rp10.000
Idola Biru 28 Kantong Plastik Pack Rp10.000
Idola Biru 35 Kantong Plastik Pack Rp10.000
Idola Ungu 15 Kantong Plastik Pack Rp8.000
Idola Ungu 19 Kantong Plastik Pack Rp8.000
Idola Ungu 24 Kantong Plastik Pack Rp8.000
Idola Ungu 28 Kantong Plastik Pack Rp8.000
Idola Ungu 35 Kantong Plastik Pack Rp8.000
Matahari 15 Kantong Plastik Pack Rp10.000
Matahari 19 Kantong Plastik Pack Rp10.000
Matahari 24 Kantong Plastik Pack Rp10.000
Matahari 28 Kantong Plastik Pack Rp10.000
Matahari 35 Kantong Plastik Pack Rp10.000
Koni 15 Kantong Plastik Pack Rp8.000
Koni 19 Kantong Plastik Pack Rp8.000
Koni 24 Kantong Plastik Pack Rp8.000
Koni 28 Kantong Plastik Pack Rp8.000
Koni 35 Kantong Plastik Pack Rp8.000
Angsa 15 Kantong Plastik Pack Rp25.000
Angsa 19 Kantong Plastik Pack Rp25.000
Angsa 24 Kantong Plastik Pack Rp25.000
Angsa 28 Kantong Plastik Pack Rp25.000
Angsa 35 Kantong Plastik Pack Rp25.000
Cap Singko 15 Kantong Plastik Pack Rp8.000
Cap Singko 19 Kantong Plastik Pack Rp8.000
Cap Singko 24 Kantong Plastik Pack Rp8.000
Cap Singko 28 Kantong Plastik Pack Rp8.000
Cap Singko 35 Kantong Plastik Pack Rp8.000
Kotak Kue (12x12) Kotak Makan Pack Rp60.000
Kotak Kue (12x14) Kotak Makan Pack Rp60.000
Kotak Kue (12x16) Kotak Makan Pack Rp65.000
Kotak Nasi (18x18) Kotak Makan Pack Rp100.000
Kotak Nasi (20x20) Kotak Makan Pack Rp105.000
Sterofom besar Kotak Makan Pack Rp48.000
Sterofom Kecil Kotak Makan Pack Rp38.000
Paper Box S Kotak Makan Pack Rp45.000
Paper Box M Kotak Makan Pack Rp55.000
paper Box L Kotak Makan Pack Rp60.000
Tutup Cup Puding Tutup Cup Pack Rp2.000
Tutup Cup Pop Ice Flat Tutup Cup Pack Rp3.000
Tutup Cup Pop Ice Cembung Tutup Cup Pack Rp7.000
Tutup Cup Kopi Tutup Cup Pack Rp10.000
Sendok Bebek Sendok Pack Rp8.000
Sendok Puding Sendok Pack 5000
Sendok Makan Sendok Pack 10000
Gula Pasir Kiloan Gula Kg Rp19.000
Gulan Pasir Kemasan Gula Kg Rp20.000
Gula Batok Gula Kg Rp24.000
Gula Merah Batok Kecil Gula Kg Rp20.000
Gula Merah Biasa (Peti Kayu) Gula Kg Rp18.000
Gula Merah Biasa (Dus) Gula Kg Rp18.000
Gula Aren Daun Gula Pcs Rp7.000
Kecap ABC Botol 130ml Kecap Pcs Rp9.000
Kecap ABC Botol 275ml Kecap Pcs Rp18.000
Kecap ABC 600ml Kecap Pcs Rp20.000
Kecap Sedap 725ml Kecap Pcs Rp23.000
Kecap Indofood 725ml Kecap Pcs Rp17.000
Kecap Kepiting 600ml Kecap Pcs Rp11.000
Kecap Hoki 520ml Kecap Pcs Rp18.000
Kecap Asin ABC Botol 131ml Kecap Pcs Rp8.000
Saos Sambal ABC Botol 130ml Saus Pcs Rp8.000
Saos Sambal ABC Botol 270ml Saus Pcs Rp16.000
Saos Sambal ABC 1kg Saus Pcs Rp28.000
Saus Tomat ABC Botol 135ml Saus Pcs Rp7.000
Saus Tomat ABC Botol 270ml Saus Pcs Rp15.000
Saus Tomat ABC 1kg Saus Pcs Rp25.000
Saus Kelong Saus Pcs Rp5.000
Saus Chicken Indofood 8ml (Sachet) Saus Pcs Rp5.000
Saori Saus Tiram Botol 133ml Saus Pcs Rp12.000
Saori Saus Tiram Botol 270ml Saus Pcs Rp22.000
Sajiku Serbaguna Bumbu Instan Pcs Rp28.000 Rp3.000
Sajiku Ayam Goreng Bumbu Instan Pcs Rp20.000 Rp2.000
Sajiku Ikan Goreng Bumbu Instan Pcs Rp20.000 Rp2.000
Sajiku Sayur Sop Bumbu Instan Pcs Rp20.000 Rp2.000
Sajiku Nasi Goreng Bumbu Instan Pcs Rp20.000 Rp2.000
Sajiku Nasi Goreng Pedas Bumbu Instan Pcs Rp20.000 Rp2.000
Racik Ayam Goreng Bumbu Instan Pcs Rp18.000 Rp2.000
Racik Ikan Goreng Bumbu Instan Pcs Rp18.000 Rp2.000
Racik Sayur Sop Bumbu Instan Pcs Rp18.000 Rp2.000
Racik Sayur Asem Bumbu Instan Pcs Rp18.000 Rp2.000
Racik Tempe & Tahu Goreng Bumbu Instan Pcs Rp18.000 Rp2.000
Mama Suka Soto Bumbu Instan Pcs Rp20.000 Rp2.500
Mama Suka Rendang Bumbu Instan Pcs Rp20.000 Rp2.500
Mama Suka Nasi Goreng Bumbu Instan Pcs Rp20.000 Rp2.000
Desaku Ladaku Bumbu Instan Pcs Rp11.000 Rp1.000
Desaku Ketumbar Bubuk Bumbu Instan Pcs Rp11.000 Rp1.000
Desaku Kunyit Bubuk Bumbu Instan Pcs Rp11.000 Rp1.000
Desaku Marinasi Bumbu Instan Pcs Rp11.000 Rp1.000
Desaku Cabe Bubuk Bumbu Instan Pcs Rp20.000 Rp2.500
Masako Ayam Sachet Bumbu Instan Pcs Rp5.000
Masako Ayam 250g Bumbu Instan Pcs Rp10.000
Masako Sapi Sachet Bumbu Instan Pcs Rp5.000
Masako Sapi 250g Bumbu Instan Pcs Rp10.000
Royco Ayam Sachet Bumbu Instan Pcs Rp5.000
Royco Ayam 250g Bumbu Instan Pcs Rp11.000
Miwon 50g Bumbu Instan Pcs Rp58.000 Rp4.000
Miwon 100g Bumbu Instan Pcs Rp55.000 Rp60.000
Miwon 250g Bumbu Instan Pcs Rp115.000 Rp13.000
Ultra Balado 100g Bumbu Instan Pcs Rp20.000 Rp5.000
Ultra Jagung Manis 100g Bumbu Instan Pcs Rp20.000 Rp5.000
Ultra Balado Pedas Manis 100g Bumbu Instan Pcs Rp20.000 Rp5.000
Kuah Bakso 100g Bumbu Instan Pcs Rp5.000
Veksin Bumbu Instan Pcs Rp4.000
Bumbu Kambing Cap Udang Bumbu Instan Pcs Rp4.000
Nikma Sate Bumbu Instan Pcs Rp4.000
Nikma Gulai Bumbu Instan Pcs Rp4.000
Nikma Rendang Bumbu Instan Pcs Rp4.000
Nikma Kari Bumbu Instan Pcs Rp4.000
Minyak Kita 1000L Bumbu Instan Pcs Rp18.000
Minyak Kita 2000L Bumbu Instan Pcs Rp36.000
Bawang Goreng Plastik Bumbu Instan Kg Rp70.000
Bawan Goreng Dus Bumbu Instan Kg Rp60.000
Tali Lainnya Pcs Rp10.000
Kertas Nasi Lainnya Pack Rp32.000
Kertas Nasi Bulat Lainnya Pack Rp20.000
Tisu Makan Lainnya Pcs Rp3.000
Tusuk Gigi Lainnya Pcs Rp25.000 Rp3.000
Aluminium Foil Lainnya Pack Rp14.000
Plastik Wrap Lainnya Pack Rp14.000
`;

const categoriesNames = [
  'Bahan Kue', 'Rempah-rempah', 'Bahan Pangan', 'Cup/Gelas', 'Mika', 'Thinwall',
  'Botol', 'Pipet', 'Plastik', 'Kantong Plastik', 'Kotak Makan', 'Tutup Cup',
  'Sendok', 'Gula', 'Kecap', 'Saus', 'Bumbu Instan', 'Lainnya'
];

async function migrate() {
    console.log('Starting migration...');

    // Clear old data
    await runSQL('DELETE FROM products');
    await runSQL('DELETE FROM stocks');
    await runSQL('DELETE FROM inventory_log');
    await runSQL('DELETE FROM transaction_items');
    await runSQL('DELETE FROM transactions');
    console.log('Tables cleared.');

    // Ensure categories exist and get mapping
    const categoryMap = {};
    for (const name of categoriesNames) {
        await runSQL('INSERT OR IGNORE INTO categories (name) VALUES (?)', [name]);
        const rows = await querySQL('SELECT id FROM categories WHERE name = ?', [name]);
        categoryMap[name] = rows[0].id;
    }
    console.log('Categories mapped:', categoryMap);

    const lines = rawData.trim().split('\n');
    for (const line of lines) {
        if (!line.trim()) continue;

        // Extract category first to help parsing
        let category = '';
        let matchedCategory = '';
        for (const catName of categoriesNames) {
            if (line.includes(catName)) {
                // Pick the longest match to avoid "Plastik" matching "Kantong Plastik"
                if (catName.length > matchedCategory.length) {
                    matchedCategory = catName;
                }
            }
        }
        category = matchedCategory;

        if (!category) {
            console.warn('No category found for line:', line);
            continue;
        }

        const parts = line.split(category);
        const name = parts[0].trim();
        const remaining = parts[1].trim();

        // Remaining looks like: "Pcs Rp5.000" or "Kg Rp180.000" or "Pcs Rp28.000 Rp5.000"
        const remainingParts = remaining.split(/\s+/);
        const unit = remainingParts[0]; // Pcs, Kg, Pack, etc.
        
        const prices = remainingParts.slice(1).map(p => {
            return parseInt(p.replace(/Rp|\./g, '')) || 0;
        });

        // Heuristics for prices
        let pricePcs = 0;
        let pricePack = 0;
        let priceKg = 0;
        let sellPerUnit = 'pcs';

        if (unit.toLowerCase() === 'pcs') {
            if (prices.length === 2) {
                pricePack = prices[0];
                pricePcs = prices[1];
            } else {
                pricePcs = prices[0] || 0;
            }
            sellPerUnit = 'pcs';
        } else if (unit.toLowerCase() === 'kg') {
            priceKg = prices[0] || 0;
            sellPerUnit = 'kg';
        } else if (unit.toLowerCase() === 'pack' || unit.toLowerCase() === 'pack/pcs') {
            if (prices.length === 2) {
                pricePack = prices[0];
                pricePcs = prices[1];
            } else {
                pricePack = prices[0] || 0;
            }
            sellPerUnit = 'pack';
        }

        const sql = `
            INSERT INTO products (name, category_id, sell_per_unit, price_pcs, price_pack, price_kg)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const params = [name, categoryMap[category], sellPerUnit, pricePcs, pricePack, priceKg];
        
        await runSQL(sql, params);
        console.log(`Imported: ${name} (${category})`);
    }

    console.log('Migration complete!');
    db.close();
}

function runSQL(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function querySQL(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    db.close();
});
