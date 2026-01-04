const crypto = require('crypto');
const { db } = require('../core/db');

async function ingestContent(content, filename, source, type = 'text', bucket = 'core') {
  if (!content) throw new Error('Content required');
  
  const hash = crypto.createHash('md5').update(content).digest('hex');

  const checkQuery = `?[id] := *memory{id, hash: $hash, bucket: $bucket}`;
  const checkResult = await db.run(checkQuery, { hash, bucket });

  if (checkResult.ok && checkResult.rows.length > 0) {
      return { 
          status: 'skipped', 
          id: checkResult.rows[0][0], 
          message: 'Duplicate content detected. Skipped.' 
      };
  }
  
  const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const timestamp = Date.now();
  
  const query = `?[id, timestamp, content, source, type, hash, bucket] <- $data :insert memory {id, timestamp, content, source, type, hash, bucket}`;
  const params = {
    data: [[ id, timestamp, content, source || filename || 'unknown', type, hash, bucket ]]
  };
  
  await db.run(query, params);
  
  return { status: 'success', id, message: 'Ingested.' };
}

module.exports = {
    ingestContent
};
