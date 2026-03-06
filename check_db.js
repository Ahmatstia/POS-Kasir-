const sqlite3 = require('sqlite3');
const fs = require('fs');
const dbPath = 'C:\\Users\\ACER\\AppData\\Roaming\\POS\\pos-toko-bumbu.db';
const db = new sqlite3.Database(dbPath);

console.log('Checking database...');
db.serialize(() => {
    db.get('SELECT COUNT(*) as count FROM products', (err, prodRow) => {
        db.get('SELECT COUNT(*) as count FROM categories', (err2, catRow) => {
            const result = {
                products: prodRow ? prodRow.count : 'Error/Empty',
                categories: catRow ? catRow.count : 'Error/Empty',
                error: (err || err2) ? { prod: err?.message, cat: err2?.message } : null
            };
            fs.writeFileSync('db_check_results.txt', JSON.stringify(result, null, 2));
            console.log('Results written to db_check_results.txt');
            db.close();
        });
    });
});
