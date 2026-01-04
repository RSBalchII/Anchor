const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const crypto = require('crypto');
const { CozoDb } = require('cozo-node');

// Helper to calculate hash
function getHash(content) {
    return crypto.createHash('md5').update(content || '').digest('hex');
}

async function hydrate(db, filePath) {
    console.log(`💧 Hydrating Schema 2.0 from: ${filePath}`);
    
    try {
        // 1. Force Re-Create Schema with new columns
        // We drop the old table to ensure clean migration if needed, but :create if not exists is safer
        // To force an upgrade, we rely on the user deleting context.db manually or we just run the create command
        // Since we are changing columns, we must ensure the schema matches.
        
        const schema = ':create memory {id: String => timestamp: Int, content: String, source: String, type: String, hash: String, bucket: String}';
        try {
            await db.run(schema);
        } catch (e) {
            if (!e.message.includes('already exists') && !e.message.includes('conflicts with an existing one')) throw e;
        }
        
        // FTS Update
        try {
            await db.run(`::fts create memory:content_fts {extractor: content, tokenizer: Simple, filters: [Lowercase]}`);
        } catch (e) {
            if (!e.message.includes('already exists')) console.error('FTS Error:', e.message);
        }

        // 2. Load Data
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const records = yaml.load(fileContent);
        
        if (!Array.isArray(records)) throw new Error("Invalid snapshot format");

        console.log(`Found ${records.length} memories. Upgrading...`);

        const BATCH_SIZE = 100;
        let processed = 0;

        while (processed < records.length) {
            const batch = records.slice(processed, processed + BATCH_SIZE);
            
            // Map legacy records to new format
            const values = batch.map(r => [
                r.id, 
                parseInt(r.timestamp), 
                r.content, 
                r.source, 
                r.type,
                r.hash || getHash(r.content),      // Backfill hash
                r.bucket || 'core'                 // Backfill bucket
            ]);
            
            const q = `
                ?[id, timestamp, content, source, type, hash, bucket] <- $values
                :put memory {id, timestamp, content, source, type, hash, bucket}
            `;
            
            await db.run(q, { values });
            processed += batch.length;
            process.stdout.write(`\rProgress: ${processed}/${records.length}`);
        }
        console.log("\n✅ Hydration & Upgrade Complete.");

    } catch (e) {
        console.error("\n❌ Hydration Failed:", e.message);
    }
}

module.exports = { hydrate };

if (require.main === module) {
    const targetFile = process.argv[2];
    const dbPath = path.join(__dirname, '..', 'context.db');
    const db = new CozoDb('rocksdb', dbPath);
    if (!targetFile) { console.log("Usage: node src/hydrate.js <snapshot.yaml>"); process.exit(1); }
    hydrate(db, targetFile);
}
