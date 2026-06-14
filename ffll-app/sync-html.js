import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const srcJsDir = path.resolve(__dirname, 'src', 'js');
const wwwDir = path.resolve(__dirname, 'www');
const destJsDir = path.resolve(__dirname, 'www', 'js');

// 1. Ensure directories exist
[wwwDir, destJsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// 2. Copy Web Assets (HTML, Icons) from the root FFIL folder
const rootFiles = fs.readdirSync(rootDir);
rootFiles.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    if (['.html', '.ico', '.png', '.css'].includes(ext)) {
        fs.copyFileSync(path.join(rootDir, file), path.join(wwwDir, file));
        console.log(`Synced Asset: ${file} -> www/`);
    }
});

// 3. Copy JavaScript files from src/js to www/js
if (fs.existsSync(srcJsDir)) {
    const jsFiles = fs.readdirSync(srcJsDir);
    jsFiles.forEach(file => {
        fs.copyFileSync(path.join(srcJsDir, file), path.join(destJsDir, file));
        console.log(`Synced Script: js/${file} -> www/js/`);
    });
}