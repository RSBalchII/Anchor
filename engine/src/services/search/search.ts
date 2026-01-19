/**
 * Search Service with Engram Layer and Provenance Boosting
 *
 * Implements:
 * 1. Engram Layer (Fast Lookup) - O(1) lookup for known entities
 * 2. Provenance Boosting - Sovereign content gets boost
 * 3. Tag-Walker Protocol - Graph-based associative retrieval (Replacing Vector Search)
 */

import { db } from '../../core/db.js';
import { createHash } from 'crypto';
import { getEmbedding } from '../llm/provider.js';
import { composeRollingContext } from '../../core/inference/context_manager.js';

interface SearchResult {
  id: string;
  content: string;
  source: string;
  timestamp: number;
  buckets: string[];
  tags: string;
  epochs: string;
  provenance: string;
  score: number;
}

/**
 * Create or update an engram (lexical sidecar) for fast entity lookup
 */
export async function createEngram(key: string, memoryIds: string[]): Promise<void> {
  const normalizedKey = key.toLowerCase().trim();
  const engramId = createHash('md5').update(normalizedKey).digest('hex');

  const insertQuery = `?[key, value] <- $data :put engrams {key, value}`;
  await db.run(insertQuery, {
    data: [[engramId, JSON.stringify(memoryIds)]]
  });
}

/**
 * Lookup memories by engram key (O(1) operation)
 */
export async function lookupByEngram(key: string): Promise<string[]> {
  const normalizedKey = key.toLowerCase().trim();
  const engramId = createHash('md5').update(normalizedKey).digest('hex');

  const query = `?[value] := *engrams{key, value}, key = $engramId`;
  const result = await db.run(query, { engramId });

  if (result.rows && result.rows.length > 0) {
    return JSON.parse(result.rows[0][0] as string);
  }

  return [];
}

/**
 * Perform Graph-Based Associative "Neighbor Walk"
 * Phase 3 of Tag-Walker Algorithm
 */
async function neighborWalk(
  sourceTags: string[],
  excludeIds: Set<string>,
  count: number = 5
): Promise<SearchResult[]> {
  if (sourceTags.length === 0) return [];

  // Deduplicate tags and simple sanitization
  const uniqueTags = [...new Set(sourceTags)].filter(t => t.length > 0);
  if (uniqueTags.length === 0) return [];

  // Query: Select items where intersection(tags, $sourceTags) is not empty.
  // Using Cozo's set intersection
  const queryCozo = `
    ?[id, content, source, timestamp, buckets, tags, epochs, provenance] := 
    *memory{id, content, source, timestamp, buckets, tags, epochs, provenance},
    length(intersection(tags, $tags)) > 0,
    :limit ${count * 2} 
  `;

  try {
    const result = await db.run(queryCozo, { tags: uniqueTags });
    if (!result.rows) return [];

    let neighbors = result.rows.map((row: any[]) => ({
      id: row[0],
      content: row[1],
      source: row[2],
      timestamp: row[3],
      buckets: row[4],
      tags: row[5],
      epochs: row[6],
      provenance: row[7],
      score: 1.0 // Base score for association
    }));

    // Filter excluded
    neighbors = neighbors.filter((n: SearchResult) => !excludeIds.has(n.id));

    // Calculate Associative Score (Jaccard Index-ish: count common tags)
    neighbors.forEach((n: SearchResult) => {
      // row[5] is tags which comes as array/list from Cozo
      const nTags = Array.isArray(n.tags) ? n.tags : [];
      // Casting to string[] for filter
      const common = (nTags as any[]).filter((t: string) => uniqueTags.includes(t)).length;
      n.score = 50 + (common * 10); // Base 50 + 10 per shared tag
    });

    return neighbors.slice(0, count);

  } catch (e) {
    console.error('[Search] Neighbor Walk failed:', e);
    return [];
  }
}

/**
 * Execute search with Tag-Walker Protocol
 */
export async function executeSearch(
  query: string,
  bucket?: string,
  buckets?: string[],
  maxChars: number = 524288,
  _deep: boolean = false,
  provenance: 'sovereign' | 'external' | 'all' = 'all'
): Promise<{ context: string; results: SearchResult[]; toAgentString: () => string; metadata?: any }> {
  console.log(`[Search] executeSearch (Tag-Walker) called with maxChars: ${maxChars}, provenance: ${provenance}`);

  // Budget Split (Approximate by count, assuming ~500 chars/atom)
  const totalTarget = Math.ceil(maxChars / 500);
  const phase1Target = Math.ceil(totalTarget * 0.70); // 70% Anchor
  const phase3Target = Math.ceil(totalTarget * 0.30); // 30% Neighbor

  // 1. ENGRAM LOOKUP
  const engramResults = await lookupByEngram(query);
  let finalResults: SearchResult[] = [];
  const includedIds = new Set<string>();

  if (engramResults.length > 0) {
    console.log(`[Search] Found ${engramResults.length} results via Engram lookup for: ${query}`);
    const engramContextQuery = `?[id, content, source, timestamp, buckets, tags, epochs, provenance] := *memory{id, content, source, timestamp, buckets, tags, epochs, provenance}, id in $ids`;
    const engramContentResult = await db.run(engramContextQuery, { ids: engramResults });
    if (engramContentResult.rows) {
      engramContentResult.rows.forEach((row: any[]) => {
        if (!includedIds.has(row[0])) {
          finalResults.push({
            id: row[0], content: row[1], source: row[2], timestamp: row[3], buckets: row[4], tags: row[5], epochs: row[6], provenance: row[7], score: 100
          });
          includedIds.add(row[0]);
        }
      });
    }
  }

  // 2. PHASE 1: ANCHOR SEARCH (FTS)
  const targetBuckets = buckets || (bucket ? [bucket] : []);

  // Note: runTraditionalSearch returns raw matches. We boost and sort them here.
  const anchorResults = await runTraditionalSearch(query, targetBuckets);

  // Provenance Boosting (Phase 1)
  anchorResults.forEach(r => {
    // Apply Sovereign Bias
    if (provenance === 'sovereign') {
      if (r.provenance === 'sovereign') r.score *= 3.0;
      else r.score *= 0.5;
    } else if (provenance === 'external') {
      if (r.provenance !== 'sovereign') r.score *= 1.5;
    } else {
      if (r.provenance === 'sovereign') r.score *= 2.0;
    }
  });

  // Sort and Select Anchors
  anchorResults.sort((a, b) => b.score - a.score);
  const topAnchors = anchorResults.slice(0, Math.max(10, phase1Target * 2)); // Grab enough candidates

  // Add Anchors to Final
  topAnchors.forEach(r => {
    if (!includedIds.has(r.id)) {
      finalResults.push(r);
      includedIds.add(r.id);
    }
  });

  // 3. PHASE 2: TAG HARVEST
  const harvestedTags = new Set<string>();
  finalResults.forEach(r => {
    if (Array.isArray(r.tags)) r.tags.forEach((t: any) => harvestedTags.add(String(t)));
    if (Array.isArray(r.buckets)) r.buckets.forEach((b: any) => harvestedTags.add(String(b)));
  });

  // 4. PHASE 3: NEIGHBOR WALK
  let neighbors: SearchResult[] = [];
  if (harvestedTags.size > 0 && phase3Target > 0) {
    console.log(`[Search] Phase 2: Harvested ${harvestedTags.size} tags. Walking...`);
    neighbors = await neighborWalk(Array.from(harvestedTags), includedIds, phase3Target);
  }

  // Provenance Boost Neighbors and Add
  neighbors.forEach(r => {
    if (provenance === 'sovereign' && r.provenance === 'sovereign') r.score *= 1.5;

    if (!includedIds.has(r.id)) {
      finalResults.push(r);
      includedIds.add(r.id);
    }
  });

  console.log(`[Search] Results: ${finalResults.length} (Anchors: ${anchorResults.length}, Neighbors: ${neighbors.length})`);

  // Final Sort by Score
  finalResults.sort((a, b) => b.score - a.score);

  return formatResults(finalResults, maxChars);
}

// Helper for FTS
export async function runTraditionalSearch(query: string, buckets: string[]): Promise<SearchResult[]> {
  const sanitizedQuery = query
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (!sanitizedQuery) return [];

  let queryCozo = '';
  // Use single-line query format to avoid parser issues
  if (buckets.length > 0) {
    queryCozo = `?[id, score, content, source, timestamp, buckets, tags, epochs, provenance] := ~memory:content_fts{id | query: $q, k: 500, bind_score: score}, *memory{id, content, source, timestamp, buckets, tags, epochs, provenance}, length(intersection(buckets, $buckets)) > 0`;
  } else {
    queryCozo = `?[id, score, content, source, timestamp, buckets, tags, epochs, provenance] := ~memory:content_fts{id | query: $q, k: 500, bind_score: score}, *memory{id, content, source, timestamp, buckets, tags, epochs, provenance}`;
  }

  try {
    const result = await db.run(queryCozo, { q: sanitizedQuery, buckets });

    if (!result.rows) return [];

    return result.rows.map((row: any[]) => ({
      id: row[0],
      score: row[1],
      content: row[2],
      source: row[3],
      timestamp: row[4],
      buckets: row[5],
      tags: row[6],
      epochs: row[7],
      provenance: row[8]
    }));

  } catch (e) {
    console.error('[Search] FTS failed', e);
    return [];
  }
}

/**
 * Format search results within character budget
 */
function formatResults(results: SearchResult[], maxChars: number): { context: string; results: SearchResult[]; toAgentString: () => string; metadata?: any } {
  // Convert SearchResult to ContextAtom
  const candidates = results.map(r => ({
    id: r.id,
    content: r.content,
    source: r.source,
    timestamp: r.timestamp,
    score: r.score
  }));

  const tokenBudget = Math.floor(maxChars / 4);
  const rollingContext = composeRollingContext("query_placeholder", candidates, tokenBudget);

  const sortedResults = results.sort((a, b) => b.score - a.score);

  return {
    context: rollingContext.prompt || 'No results found.',
    results: sortedResults,
    toAgentString: () => {
      // Safe substring in case content is missing (though our types enforce it)
      return sortedResults.map(r => `[${r.provenance}] ${r.source}: ${(r.content || "").substring(0, 200)}...`).join('\n');
    },
    metadata: rollingContext.stats
  };
}

export function parseQuery(query: string): { phrases: string[]; temporal: string[]; buckets: string[]; keywords: string[]; } {
  const result = { phrases: [] as string[], temporal: [] as string[], buckets: [] as string[], keywords: [] as string[] };
  const phraseRegex = /"([^"]+)"/g;
  let phraseMatch;
  while ((phraseMatch = phraseRegex.exec(query)) !== null) result.phrases.push(phraseMatch[1]);
  let remainingQuery = query.replace(/"[^"]+"/g, '');
  const temporalRegex = /@(\w+)/g;
  let temporalMatch;
  while ((temporalMatch = temporalRegex.exec(remainingQuery)) !== null) result.temporal.push(temporalMatch[1]);
  remainingQuery = remainingQuery.replace(/@\w+/g, '');
  const bucketRegex = /#(\w+)/g;
  let bucketMatch;
  while ((bucketMatch = bucketRegex.exec(remainingQuery)) !== null) result.buckets.push(bucketMatch[1]);
  remainingQuery = remainingQuery.replace(/#\w+/g, '');
  result.keywords = remainingQuery.split(/\s+/).filter(kw => kw.length > 0);
  return result;
}