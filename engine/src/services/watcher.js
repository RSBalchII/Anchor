const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db } = require('../core/db');
const { CONTEXT_DIR } = require('../config/paths');

async function handleFileChange(filePath) {
  // Skip backup files
  if (filePath.includes('cozo_memory_snapshot_')) return;

  try {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) return;
    
    if (stats.size > 100 * 1024 * 1024) { // Skip files > 100MB
      console.log(`Skipping large file: ${filePath} (${stats.size} bytes)`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const textExtensions = ['.txt', '.md', '.json', '.yaml', '.yml', '.js', '.ts', '.py', '.html', '.css', '.bat', '.ps1', '.sh'];
    if (!textExtensions.includes(ext) && ext !== '') {
      return;
    }

    console.log(`Processing: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    const hash = crypto.createHash('md5').update(content).digest('hex');
    
    const relPath = path.relative(CONTEXT_DIR, filePath);
    
    // Auto-Bucket Logic: Top-level folder name = Bucket
    const pathParts = relPath.split(path.sep);
    const bucket = pathParts.length > 1 ? pathParts[0] : 'core';

    // Deduplication Check
    const checkQuery = `?[id] := *memory{id, hash: $hash, bucket: $bucket}`;
    const check = await db.run(checkQuery, { hash, bucket });
    
    if (check.ok && check.rows.length > 0) {
        return; 
    }

    // Use a stable ID based on the relative path to allow updates
    const id = `file_${Buffer.from(relPath).toString('base64').replace(/=/g, '')}`;
    
    // Using :put to update if ID matches (file edit) but hash changed
    const query = `?[id, timestamp, content, source, type, hash, bucket] <- $data :put memory {id, timestamp, content, source, type, hash, bucket}`;
    const params = {
      data: [[ id, Date.now(), content, relPath, ext || 'text', hash, bucket ]]
    };
    
    await db.run(query, params);
    console.log(`Ingested: ${relPath}`);
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

function setupFileWatcher() {
  // Ensure context directory exists
  if (!fs.existsSync(CONTEXT_DIR)) {
    fs.mkdirSync(CONTEXT_DIR, { recursive: true });
  }
  
  const watcher = chokidar.watch(CONTEXT_DIR, {
    ignored: [
      /(^|[\/\\])\../, // ignore dotfiles
      /cozo_memory_snapshot_.*\.yaml$/
    ],
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });

  watcher
    .on('add', filePath => handleFileChange(filePath))
    .on('change', filePath => handleFileChange(filePath))
    .on('error', error => console.error('Watcher error:', error));
    
  console.log('File watcher initialized for context directory');
}

module.exports = {
    setupFileWatcher
};
