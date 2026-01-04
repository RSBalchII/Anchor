const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { CozoDb } = require('cozo-node');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const crypto = require('crypto');
const { createReadStream } = require('fs');
const { join } = require('path');
const { hydrate } = require('./hydrate');

// Initialize CozoDB with RocksDB backend
const db = new CozoDb('rocksdb', path.join(__dirname, '..', 'context.db'));

// Set up Express app
const app = express();
const PORT = 3000;

// Serve static files from interface directory
app.use(express.static(join(__dirname, '..', '..', 'interface')));

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize database schema
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

    // Try to create FTS index (optional, may not be supported in all builds)
    try {
      // Create FTS index for content field - using correct CozoDB syntax
      // We use a simpler syntax and handle existing index gracefully
      const ftsQuery = `::fts create memory:content_fts {extractor: content, tokenizer: Simple, filters: [Lowercase]}`;
      await db.run(ftsQuery);
      console.log('FTS index created');
    } catch (e) {
      // FTS might not be supported in this build or index might already exist
      if (e.message && e.message.includes('already exists')) {
        console.log('FTS index already exists');
      } else {
        console.log('FTS creation failed (optional feature):', e.message);
      }
    }
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Automatically hydrate from the latest snapshot in the backups folder
async function autoHydrate() {
  const backupsDir = path.join(__dirname, '..', '..', 'backups');
  if (!fs.existsSync(backupsDir)) {
    console.log('No backups directory found at ' + backupsDir + ', skipping auto-hydration.');
    return;
  }

  try {
    // Check if the database already has data
    const countQuery = '?[count(id)] := *memory{id}';
    const countResult = await db.run(countQuery);
    const count = countResult.rows[0][0];

    if (count > 0) {
      console.log(`📡 Database already contains ${count} memories. Skipping auto-hydration.`);
      console.log(`💡 To force re-hydration, delete the 'engine/context.db' folder or clear the 'memory' relation.`);
      return;
    }

    const files = fs.readdirSync(backupsDir)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map(f => ({
        name: f,
        path: path.join(backupsDir, f),
        mtime: fs.statSync(path.join(backupsDir, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > 0) {
      const latest = files[0];
      console.log(`🔄 Auto-hydration: Found ${files.length} snapshots. Picking latest: ${latest.name}`);
      await hydrate(db, latest.path);
      console.log(`✅ Auto-hydration complete.`);
    } else {
      console.log('No snapshots found in backups directory.');
    }
  } catch (error) {
    console.error('Auto-hydration failed:', error);
  }
}

// POST /v1/ingest endpoint
app.post('/v1/ingest', async (req, res) => {
  try {
    const { content, filename, source, type = 'text', bucket = 'core' } = req.body;
    
    if (!content) return res.status(400).json({ error: 'Content required' });
    
    // 1. Calculate Hash
    const hash = crypto.createHash('md5').update(content).digest('hex');

    // 2. Check for Duplicates (Deduplication)
    const checkQuery = `?[id] := *memory{id, hash: $hash, bucket: $bucket}`;
    const checkResult = await db.run(checkQuery, { hash, bucket });

    if (checkResult.ok && checkResult.rows.length > 0) {
        return res.json({ 
            status: 'skipped', 
            id: checkResult.rows[0][0], 
            message: 'Duplicate content detected. Skipped.' 
        });
    }
    
    // 3. Insert New Memory
    const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const timestamp = Date.now();
    
    const query = `?[id, timestamp, content, source, type, hash, bucket] <- $data :insert memory {id, timestamp, content, source, type, hash, bucket}`;
    const params = {
      data: [[ id, timestamp, content, source || filename || 'unknown', type, hash, bucket ]]
    };
    
    await db.run(query, params);
    
    res.json({ status: 'success', id, message: 'Ingested.' });
  } catch (error) {
    console.error('Ingest error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/query endpoint
app.post('/v1/query', async (req, res) => {
  try {
    const { query, params = {} } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await db.run(query, params);

    res.json(result);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Basic search function as fallback when FTS fails
async function basicSearch(query, max_chars = 5000, buckets) {
  try {
    // Simple search implementation - retrieve all memory entries
    const useBuckets = Array.isArray(buckets) && buckets.length > 0;
    const searchQuery = useBuckets 
      ? `?[id, timestamp, content, source, type, bucket] := *memory{id, timestamp, content, source, type, bucket}, is_in(bucket, $b)`
      : `?[id, timestamp, content, source, type, bucket] := *memory{id, timestamp, content, source, type, bucket}`;
    
    const result = await db.run(searchQuery, useBuckets ? { b: buckets } : {});

    let context = '';
    let charCount = 0;

    if (result.rows) {
      // Filter rows that contain the query term (case insensitive)
      const filteredRows = result.rows.filter(row => {
        const [id, timestamp, content, source, type, b] = row;
        return content.toLowerCase().includes(query.toLowerCase()) ||
               source.toLowerCase().includes(query.toLowerCase());
      });

      // Sort by relevance (rows with query in content first, then in source)
      filteredRows.sort((a, b) => {
        const [a_id, a_timestamp, a_content, a_source, a_type, a_b] = a;
        const [b_id, b_timestamp, b_content, b_source, b_type, b_b] = b;

        const aContentMatch = a_content.toLowerCase().includes(query.toLowerCase());
        const bContentMatch = b_content.toLowerCase().includes(query.toLowerCase());

        // Prioritize content matches over source matches
        if (aContentMatch && !bContentMatch) return -1;
        if (!aContentMatch && bContentMatch) return 1;
        return 0;
      });

      for (const row of filteredRows) {
        const [id, timestamp, content, source, type, b] = row;
        const entryText = `### Source: ${source}\n${content}\n\n`;
        if (charCount + entryText.length > max_chars) {
          // Add partial content if we're near the limit
          const remainingChars = max_chars - charCount;
          context += entryText.substring(0, remainingChars);
          break;
        }
        context += entryText;
        charCount += entryText.length;
      }
    }

    return { context: context || 'No results found.' };
  } catch (error) {
    console.error('Basic search error:', error);
    return { context: 'Search failed' };
  }
}

// POST /v1/memory/search endpoint (for context.html)
app.post('/v1/memory/search', async (req, res) => {
  try {
    const { query, max_chars = 5000, bucket, buckets, deep = false } = req.body;
    if (!query) return res.status(400).json({ error: 'Query required' });

    // Support both single 'bucket' and array 'buckets'
    const targetBuckets = buckets || (bucket ? [bucket] : null);

    // 1. FTS Search (Get Candidates)
    // If buckets are provided, filter by them. Otherwise search all.
    const useBuckets = Array.isArray(targetBuckets) && targetBuckets.length > 0;
    
    // Scale k based on max_chars to ensure we have enough candidates to fill the requested context
    // Roughly 1 candidate per 500 chars, with a minimum of 30 (or 200 for deep)
    const baseK = deep ? 200 : 30;
    const k = Math.max(baseK, Math.ceil(max_chars / 500));

    const ftsQuery = useBuckets 
      ? `?[id, score] := ~memory:content_fts{id | query: $q, k: ${k}, bind_score: s}, *memory{id, bucket: b}, is_in(b, $b), score = s`
      : `?[id, score] := ~memory:content_fts{id | query: $q, k: ${k}, bind_score: s}, score = s`;

    const ftsParams = useBuckets ? { q: query, b: targetBuckets } : { q: query };
    let ftsResult;
    
    try {
        ftsResult = await db.run(ftsQuery, ftsParams);
    } catch (e) {
        // Fallback if FTS fails
        console.error('FTS Error, falling back to basic:', e.message);
        return res.json(await basicSearch(query, max_chars, targetBuckets));
    }

    if (ftsResult.rows.length === 0) {
        return res.json(await basicSearch(query, max_chars, targetBuckets));
    }

    // 2. Fetch Content for Candidates
    const ids = ftsResult.rows.map(row => row[0]);
    const scores = Object.fromEntries(ftsResult.rows);
    
    const contentQuery = `
      ?[id, content, source] := 
        *memory{id, content, source},
        is_in(id, $ids)
    `;
    
    const contentResult = await db.run(contentQuery, { ids });
    
    // 3. Elastic Window Processing
    let allHits = [];
    const searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

    for (const row of contentResult.rows) {
        const [id, content, source] = row;
        let match;
        searchRegex.lastIndex = 0; 
        while ((match = searchRegex.exec(content)) !== null) {
            allHits.push({
                id, source, content, 
                start: match.index,
                end: match.index + match[0].length,
                score: scores[id]
            });
        }
    }

    if (allHits.length === 0) {
        return res.json(await basicSearch(query, max_chars));
    }

    // 4. Budgeting (Optimized)
    // Increase Min Window to 300 chars for better context
    const rawWindowSize = Math.floor(max_chars / allHits.length);
    const windowSize = Math.min(Math.max(rawWindowSize, 300), 1500); 
    const padding = Math.floor(windowSize / 2);

    // 5. Grouping & Merging
    const docsMap = {};

    for (const hit of allHits) {
        if (!docsMap[hit.id]) {
            docsMap[hit.id] = { 
                source: hit.source, 
                score: hit.score, 
                ranges: [], 
                content: hit.content 
            };
        }
        
        const start = Math.max(0, hit.start - padding);
        const end = Math.min(hit.content.length, hit.end + padding);
        docsMap[hit.id].ranges.push({ start, end });
    }

    // 6. Build Final Context (Grouped)
    let finalContext = "";
    let totalCharsUsed = 0;
    
    // Sort files by relevance score
    const sortedDocs = Object.values(docsMap).sort((a, b) => b.score - a.score);

    for (const doc of sortedDocs) {
        if (totalCharsUsed >= max_chars) break;

        // Sort ranges and merge overlaps within this file
        doc.ranges.sort((a, b) => a.start - b.start);
        const merged = [];
        if (doc.ranges.length > 0) {
            let current = doc.ranges[0];
            for (let i = 1; i < doc.ranges.length; i++) {
                if (doc.ranges[i].start <= current.end + 50) { // Merge if close (50 chars)
                    current.end = Math.max(current.end, doc.ranges[i].end);
                } else {
                    merged.push(current);
                    current = doc.ranges[i];
                }
            }
            merged.push(current);
        }

        // Header (Printed Once)
        const header = `### Source: ${doc.source} (Score: ${Math.round(doc.score)})\n`;
        if (totalCharsUsed + header.length > max_chars) break;
        finalContext += header;
        totalCharsUsed += header.length;

        // Snippets
        for (const range of merged) {
            const snippet = doc.content.substring(range.start, range.end).replace(/\n/g, ' ');
            const entry = `...${snippet}...\n\n`;
            
            if (totalCharsUsed + entry.length > max_chars) break;
            finalContext += entry;
            totalCharsUsed += entry.length;
        }
        
        finalContext += "---\n"; // Separator between files
    }

    res.json({ context: finalContext });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/system/spawn_shell endpoint (for index.html)
app.post('/v1/system/spawn_shell', async (req, res) => {
  try {
    // For now, just return success - spawning a shell is complex and platform-dependent
    // In a real implementation, this would spawn a PowerShell terminal
    res.json({ success: true, message: "Shell spawned successfully" });
  } catch (error) {
    console.error('Spawn shell error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /v1/backup endpoint
app.get('/v1/backup', async (req, res) => {
  try {
    console.log("[Backup] Starting full database export...");

    // 1. Query EVERYTHING from the memory relation
    // We explicitly select columns to ensure order
    const query = `?[id, timestamp, content, source, type, hash, bucket] := *memory{id, timestamp, content, source, type, hash, bucket}`;
    const result = await db.run(query);

    // 2. Format as a clean List of Objects
    const records = result.rows.map(row => ({
      id: row[0],
      timestamp: row[1],
      content: row[2],
      source: row[3],
      type: row[4],
      hash: row[5],
      bucket: row[6]
    }));

    // 3. Convert to YAML (Block style for readability)
    const yamlStr = yaml.dump(records, {
      lineWidth: -1,        // Don't wrap long lines
      noRefs: true,         // No aliases
      quotingType: '"',     // Force quotes for safety
      forceQuotes: false
    });

    // 4. Save to local backups directory for safety
    const filename = `cozo_memory_snapshot_${new Date().toISOString().replace(/[:.]/g, '-')}.yaml`;
    const backupPath = path.join(__dirname, '../../backups', filename);
    
    try {
      fs.writeFileSync(backupPath, yamlStr);
      console.log(`[Backup] Local copy saved to ${backupPath}`);
    } catch (fsErr) {
      console.error('[Backup] Failed to save local copy:', fsErr.message);
    }

    // 5. Send as Downloadable File
    res.setHeader('Content-Type', 'text/yaml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(yamlStr);

    console.log(`[Backup] Exported ${records.length} memories to ${filename}`);

  } catch (error) {
    console.error('[Backup] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /v1/buckets endpoint
app.get('/v1/buckets', async (req, res) => {
  try {
    const query = '?[bucket] := *memory{bucket}';
    const result = await db.run(query);
    let buckets = [...new Set(result.rows.map(row => row[0]))].sort();
    if (buckets.length === 0) buckets = ['core'];
    res.json(buckets);
  } catch (error) {
    console.error('Buckets error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'Sovereign',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Set up file watcher for context directory
function setupFileWatcher() {
  const contextDir = path.join(__dirname, '..', '..', 'context');

  // Ensure context directory exists
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
  }
  
  const watcher = chokidar.watch(contextDir, {
    ignored: [
      /(^|[\/\\])\../, // ignore dotfiles
      /cozo_memory_snapshot_.*\.yaml$/
    ],
    persistent: true,
    ignoreInitial: false, // Ingest existing files on startup
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

async function handleFileChange(filePath) {
  // Skip backup files
  if (filePath.includes('cozo_memory_snapshot_')) return;

  try {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) return;
    
    if (stats.size > 10 * 1024 * 1024) { // Skip files > 10MB
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
    
    const relPath = path.relative(
      path.join(__dirname, '..', '..', 'context'),
      filePath
    );
    
    // Auto-Bucket Logic: Top-level folder name = Bucket
    const pathParts = relPath.split(path.sep);
    const bucket = pathParts.length > 1 ? pathParts[0] : 'core';

    // Deduplication Check
    const checkQuery = `?[id] := *memory{id, hash: $hash, bucket: $bucket}`;
    const check = await db.run(checkQuery, { hash, bucket });
    
    if (check.ok && check.rows.length > 0) {
        // Content exists. Optionally update the path/source if it moved, but for now skip.
        // console.log(`Skipping duplicate: ${filePath}`);
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

// Initialize and start server
async function startServer() {
  try {
    await initializeDb();
    
    // Small delay to ensure DB is ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await autoHydrate();
    setupFileWatcher();
    
    app.listen(PORT, () => {
      console.log(`Sovereign Context Engine listening on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  try {
    await db.close();
  } catch (e) {
    console.error('Error closing database:', e);
  }
  process.exit(0);
});

// Start the server
startServer();

module.exports = { db, app };