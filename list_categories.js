const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = 'C:\\Users\\ACER\\AppData\\Roaming\\pos-toko-bumbu\\pos-toko-bumbu.db';
const db = new sqlite3.Database(dbPath);

console.log('Querying categories...');
db.all('SELECT id, name FROM categories', (err, rows) => {
    if (err) {
        console.error('Error:', err);
        fs.writeFileSync('output.txt', 'Error: ' + err.message);
    } else {
        console.log('Categories:', JSON.stringify(rows));
        fs.writeFileSync('output.txt', JSON.stringify(rows, null, 2));
    }
    db.close();
});
