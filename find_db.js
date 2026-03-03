const fs = require('fs');
const path = require('path');
const os = require('os');

function findFile(startDir, fileName) {
    let results = [];
    try {
        const files = fs.readdirSync(startDir);
        for (const file of files) {
            const fullPath = path.join(startDir, file);
            const stat = fs.lstatSync(fullPath);
            if (stat.isDirectory()) {
                if (file !== 'node_modules' && !file.startsWith('.')) {
                    results = results.concat(findFile(fullPath, fileName));
                }
            } else if (file === fileName) {
                results.push(fullPath);
            }
        }
    } catch (e) {}
    return results;
}

const roaming = path.join(os.homedir(), 'AppData', 'Roaming');
console.log(`Searching for pos-toko-bumbu.db in ${roaming}...`);
const found = findFile(roaming, 'pos-toko-bumbu.db');
if (found.length > 0) {
    console.log("Found database(s):");
    found.forEach(p => console.log(p));
} else {
    console.log("Not found in Roaming, searching Local...");
    const local = path.join(os.homedir(), 'AppData', 'Local');
    const foundLocal = findFile(local, 'pos-toko-bumbu.db');
    if (foundLocal.length > 0) {
        console.log("Found database(s):");
        foundLocal.forEach(p => console.log(p));
    } else {
        console.log("Database not found in common AppData locations.");
    }
}
