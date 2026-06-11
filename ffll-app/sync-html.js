#!/usr/bin/env node

/**
 * Sync HTML files from ffll-app/src to the root directory
 * Automatically detects all HTML files - no need to maintain a list!
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.join(__dirname, 'www');

// Files/directories to ignore
const IGNORE_PATTERNS = ['node_modules', '.git', 'dist', 'build', 'ffll-app'];

function isIgnored(filePath) {
  return IGNORE_PATTERNS.some(pattern => filePath.split(path.sep).includes(pattern));
}

function getProjectFiles(dir) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const relativePath = path.relative(SRC_DIR, fullPath);
      
      // Skip ignored directories/files
      if (isIgnored(fullPath)) return;
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Copy directories like js, css, assets
        const destDir = path.join(ROOT_DIR, item);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.cpSync(fullPath, destDir, { recursive: true });
        console.log(`📁 Synced directory: ${item}`);
      } else if (stat.isFile()) {
        if (item.endsWith('.html') || item.endsWith('.ico') || item.endsWith('.png')) {
          files.push(item);
        }
      }
    });
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return files.sort();
}

function syncFiles() {
  console.log('🔄 Syncing HTML files from ffll-app/src to root...');
  
  const htmlFiles = getProjectFiles(SRC_DIR);
  
  // Ensure destination directory exists
  if (!fs.existsSync(ROOT_DIR)) {
    fs.mkdirSync(ROOT_DIR, { recursive: true });
  }

  if (htmlFiles.length === 0) {
    console.warn('⚠️  No HTML files found in src directory');
    return;
  }
  
  let syncedCount = 0;
  let errorCount = 0;

  htmlFiles.forEach(file => {
    const srcPath = path.join(SRC_DIR, file);
    
    // Force lowercase index.html for Capacitor compatibility
    const fileName = file.toLowerCase() === 'index.html' ? 'index.html' : file;
    const destPath = path.join(ROOT_DIR, fileName);

    try {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ ${file}`);
      syncedCount++;
    } catch (error) {
      console.error(`❌ Error syncing ${file}:`, error.message);
      errorCount++;
    }
  });

  console.log(`\n✨ Sync complete: ${syncedCount} files synced${errorCount > 0 ? `, ${errorCount} errors` : ''}`);
  
  if (errorCount > 0) {
    process.exit(1);
  }
}

// Watch mode
const watchMode = process.argv.includes('--watch');

if (watchMode) {
  console.log('👀 Watching for changes in src directory...\n');
  syncFiles(); // Initial sync
  
  fs.watch(SRC_DIR, { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith('.html') && !isIgnored(filename)) {
      console.log(`\n📝 ${filename} changed, syncing...`);
      syncFiles();
    }
  });
} else {
  syncFiles();
}
