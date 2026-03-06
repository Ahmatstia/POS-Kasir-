const sqlite3 = require('sqlite3');
const dbPath = 'C:\\Users\\ACER\\AppData\\Roaming\\POS\\pos-toko-bumbu.db';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
        if (err) console.error('Error counting products:', err);
        else console.log('Products:', row.count);
    });
    db.get('SELECT COUNT(*) as count FROM categories', (err, row) => {
        if (err) console.error('Error counting categories:', err);
        else console.log('Categories:', row.count);
        db.close();
    });
});
    