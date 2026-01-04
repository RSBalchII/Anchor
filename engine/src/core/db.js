const fs = require('fs');
const path = require('path');
const { DB_PATH, BACKUPS_DIR, LOGS_DIR } = require('../config/paths');
const { hydrate } = require('../hydrate');
const { CozoDb } = require('./cozo_loader');

// Ensure logs directory exists for error reporting
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Initialize CozoDB with RocksDB backend
const db = new CozoDb('rocksdb', DB_PATH);

async function initializeDb() {
  try {
    // Check if the memory relation already exists
    const checkQuery = '::relations';
    const relations = await db.run(checkQuery);

    // Only create the memory table if it doesn't already exist
    if (!relations.rows.some(row => row[0] === 'memory')) {
        const schemaQuery = ':create memory {id: String => timestamp: Int, content: String, source: String, type: String, hash: String, bucket: String}';
        await db.run(schemaQuery);
        console.log('Database schema initialized');
    } else {
        console.log('Database schema already exists');
    }

    // Try to create FTS index
    try {
      const ftsQuery = `::fts create memory:content_fts {extractor: content, tokenizer: Simple, filters: [Lowercase]}`;
      await db.run(ftsQuery);
      console.log('FTS index created');
    } catch (e) {
      if (e.message && e.message.includes('already exists')) {
        console.log('FTS index already exists');
      } else {
        console.log('FTS creation failed (optional feature):', e.message);
      }
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

async function autoHydrate() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    console.log('No backups directory found, skipping auto-hydration.');
    return;
  }

  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map(f => ({
        name: f,
        path: path.join(BACKUPS_DIR, f),
        mtime: fs.statSync(path.join(BACKUPS_DIR, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > 0) {
      const latest = files[0];
      console.log(`🔄 Stateless Mode: Reloading from latest backup: ${latest.name}`);
      
      // Clear existing memories to ensure a clean reload
      await db.run('~memory :rm');
      
      await hydrate(db, latest.path);
      console.log(`✅ Database reloaded from backup. Current session is temporary unless you 'Eject' (Backup).`);
    } else {
      console.log('No snapshots found in backups directory. Starting with current database state.');
    }
  } catch (error) {
    console.error('Auto-hydration failed:', error);
  }
}

async function init() {
    await initializeDb();
    // Small delay to ensure DB is ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    await autoHydrate();
}

module.exports = {
    db,
    init
};
