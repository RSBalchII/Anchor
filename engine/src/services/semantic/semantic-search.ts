
/**
 * Semantic Search Integration for ECE (Semantic Shift Architecture)
 * 
 * Provides a bridge between the new semantic search functionality and the existing search API
 * ensuring backward compatibility while enabling enhanced relationship-focused search.
 */

import { db } from '../../core/db.js';
import { SemanticCategory } from '../../types/taxonomy.js';
import { parseNaturalLanguage, expandQuery } from '../nlp/query-parser.js';
import { ContextInflator } from '../search/context-inflator.js';


interface SearchResult {
  id: string;
  content: string;
  source: string;
  timestamp: number;
  buckets: string[];
  tags: string[];
  epochs: string;
  provenance: string;
  score: number;
  molecular_signature?: string;
  semanticCategories?: SemanticCategory[];
  relatedEntities?: string[];
  // Inflation fields
  compound_id?: string;
  start_byte?: number;
  end_byte?: number;
  is_inflated?: boolean;
}

export async function executeSemanticSearch(
  query: string,
  buckets?: string[],
  maxChars: number = 5242,
  provenance: 'internal' | 'external' | 'quarantine' | 'all' = 'all',
  explicitTags: string[] = []
): Promise<{
  context: string;
  results: SearchResult[];
  toAgentString: () => string;
  strategy?: string;
  splitQueries?: string[];
  metadata?: any;
}> {

  console.log(`[SemanticSearch] executeSemanticSearch called with query: "${query}", provenance: ${provenance}`);

  // Extract potential entities from the query
  const queryEntities = extractEntitiesFromQuery(query);
  const scopeTags = [...explicitTags];

  // Parse the query for natural language elements
  // Sanitize for FTS: Remove punctuation that causes syntax errors (like ?)
  const parsedQuery = parseNaturalLanguage(query).replace(/[?*:|!<>(){}[\]^"~]/g, ' ');
  const expansionTags = await expandQuery(parsedQuery);
  const searchTerms = [...new Set([...parsedQuery.split(/\s+/), ...expansionTags])];

  // Detect potential entity pairs for relationship search
  const entityPairs: string[] = [];
  if (searchTerms.length >= 2) {
    // Look for relationship indicators in the search terms
    const relationshipIndicators = ['and', 'with', 'met', 'told', 'said', 'visited', 'called', 'texted', 'about', 'relationship'];
    for (let i = 0; i < searchTerms.length - 1; i++) {
      if (relationshipIndicators.includes(searchTerms[i].toLowerCase())) {
        // Found a potential relationship: [person1] [indicator] [person2]
        if (i > 0 && i < searchTerms.length - 1) {
          entityPairs.push(`${searchTerms[i - 1]}_${searchTerms[i + 1]}`);
          entityPairs.push(`${searchTerms[i + 1]}_${searchTerms[i - 1]}`); // Bidirectional
        }
      }
    }
  }

  // Build the search query to find semantic molecules using proper SQL FTS syntax
  // Updated to include molecular coordinates from molecules table for Context Inflation
  // Use OR-based logic (|) on filtered keywords to allow conversational queries ("fuzzy" match)
  const tsQueryString = searchTerms.filter(t => t.trim().length > 0).join(' | ');

  // NOTE: optimization - we do NOT select a.content to prevent fetching massive blobs.
  // We read from disk using coordinates.
  let searchQuery = `SELECT a.id, a.source_path as source, a.timestamp, a.buckets, a.tags, a.epochs, a.provenance, a.simhash,
         0 as score,
         COALESCE(m.compound_id, a.compound_id) as compound_id,
         COALESCE(m.start_byte, a.start_byte) as start_byte,
         COALESCE(m.end_byte, a.end_byte) as end_byte
    FROM atoms a
    LEFT JOIN molecules m ON a.id = m.id
    WHERE to_tsvector('simple', substring(a.content from 1 for 1000)) @@ to_tsquery('simple', $1)`;


  // Build query filters and parameters
  const queryFilters: string[] = [];
  const sqlParams: any[] = [tsQueryString]; // Start with the constructed TS query parameter
  let paramCounter = 1; // Start with $2 since $1 is already used

  // Add provenance filter
  if (provenance !== 'all') {
    paramCounter++;
    queryFilters.push(`a.provenance = $${paramCounter}`);
    sqlParams.push(provenance);
  }

  // Add bucket filters if specified
  if (buckets && buckets.length > 0) {
    paramCounter++;
    queryFilters.push(`EXISTS(
    SELECT 1 FROM unnest(a.buckets) as bucket WHERE bucket = ANY($${paramCounter})
  )`);
    sqlParams.push(buckets);
  }

  // Add tag filters if specified
  if (scopeTags.length > 0) {
    paramCounter++;
    queryFilters.push(`EXISTS(
    SELECT 1 FROM unnest(a.tags) as tag WHERE tag = ANY($${paramCounter})
  )`);
    sqlParams.push(scopeTags);
  }

  // Combine all filter clauses with AND
  if (queryFilters.length > 0) {
    searchQuery += ` AND ${queryFilters.join(' AND ')} `;
  }

  // Complete the query with ordering and limit
  searchQuery += ` ORDER BY score DESC, timestamp DESC LIMIT 50`;

  try {
    const result = await db.run(searchQuery, sqlParams);
    const rows = result.rows || [];

    // Process results and apply semantic scoring
    const processedResults: SearchResult[] = [];

    for (const row of rows) {
      // Ensure row has the expected structure
      // Indices shifted because a.content (was index 1) is removed
      // 0: id
      // 1: source
      // 2: timestamp
      // 3: buckets
      // 4: tags
      // 5: epochs
      // 6: provenance
      // 7: simhash
      // 8: score
      // 9: compound_id
      // 10: start_byte
      // 11: end_byte

      if (row.length < 12) continue; // Skip malformed rows

      const id = String(row[0] || '');
      const source = String(row[1] || '');
      const startByte = typeof row[10] === 'number' ? row[10] : Number(row[10]);
      const endByte = typeof row[11] === 'number' ? row[11] : Number(row[11]);

      let content = '';
      // Content hydration is now handled by ContextInflator reading from disk.

      const rowBuckets = Array.isArray(row[3]) ? row[3] as string[] : (typeof row[3] === 'string' ? [row[3]] : []);
      const rowTags = Array.isArray(row[4]) ? row[4] as string[] : (typeof row[4] === 'string' ? [row[4]] : []);

      // Calculate semantic relevance score
      let score = calculateSemanticScore(content, queryEntities, searchTerms, entityPairs);

      // Apply provenance boost
      if (provenance === 'internal' && String(row[6] || '') === 'internal') {
        score *= 2.0;
      } else if (provenance === 'external' && String(row[6] || '') !== 'internal') {
        score *= 1.5;
      }

      // Check for relationship patterns in the content
      const relationshipEntities = findEntityPairs(content, queryEntities);
      const semanticCategories = determineSemanticCategories(content, relationshipEntities);

      // Create result object with proper structure
      const searchResult: SearchResult = {
        id: id,
        content: content,
        source: source,
        timestamp: typeof row[2] === 'number' ? row[2] : Date.now(),
        buckets: rowBuckets,
        tags: rowTags,
        epochs: String(row[5] || ''),
        provenance: String(row[6] || ''),
        molecular_signature: String(row[7] || ''),
        score: typeof row[8] === 'number' ? row[8] : 0,
        semanticCategories,
        relatedEntities: relationshipEntities.length > 0 ? relationshipEntities : undefined,
        // Inflation Metadata
        compound_id: String(row[9] || ''),
        start_byte: startByte,
        end_byte: endByte
      };

      processedResults.push(searchResult);
    }

    // Sort by score descending (before inflation merge)
    processedResults.sort((a, b) => (b.score || 0) - (a.score || 0));

    // --- CONTEXT INFLATION ---
    // Inflate separate molecules into coherent windows and slice content to budget
    console.log(`[SemanticSearch] Inflating ${processedResults.length} raw semantic results...`);

    // Cast to any[] if needed by strict TS, but interface should match
    const inflatedResults = await ContextInflator.inflate(processedResults, maxChars);

    console.log(`[SemanticSearch] Inflated into ${inflatedResults.length} windows.`);

    // Build context string from INFLATED results
    let totalChars = 0;
    let context = '';

    // Filter to token/char budget logic using inflated content
    const finalResults: SearchResult[] = [];

    for (const res of inflatedResults) {
      // Get content from the result - it should already have content from inflation or original
      const contentToUse = res.content || '';

      if (contentToUse && contentToUse.length > 0) {
        let finalContent = contentToUse;
        const remainingBudget = maxChars - totalChars;

        if (remainingBudget <= 0) break; // Budget full

        // Truncate if too large for remaining budget
        if (finalContent.length > remainingBudget) {
          finalContent = finalContent.substring(0, remainingBudget) + '...';
        }

        context += `[Source: ${res.source || 'unknown'}](Timestamp: ${new Date(res.timestamp).toISOString()
          }) \n${finalContent} \n\n`;
        totalChars += finalContent.length;

        // Push modified result with truncated content
        finalResults.push({
          ...res,
          content: finalContent
        });
      }
    }

    console.log(`[SemanticSearch] Found ${finalResults.length} results with total ${totalChars} characters`);

    return {
      context,
      results: finalResults,
      toAgentString: () => {
        return finalResults.map(r => `[${r.source}] ${r.content} `).join('\n\n');
      },
      strategy: 'semantic_relationship',
      splitQueries: entityPairs,
      metadata: {
        query,
        queryEntities,
        entityPairs,
        resultsCount: finalResults.length,
        totalCharacters: totalChars,
        semanticCategories: [...new Set(finalResults.flatMap(r => r.semanticCategories || []))]
      }
    };
  } catch (error) {
    console.error('[SemanticSearch] Search error:', error);
    // Return empty results instead of throwing to prevent frontend crashes
    return {
      context: '',
      results: [],
      toAgentString: () => '',
      strategy: 'semantic_relationship',
      splitQueries: [],
      metadata: {
        query,
        queryEntities: [],
        entityPairs: [],
        resultsCount: 0,
        totalCharacters: 0,
        semanticCategories: []
      }
    };
  }
}

/**
 * Extract potential entities from a query string
 */
function extractEntitiesFromQuery(query: string): string[] {
  // Simple entity extraction - could be enhanced with NER
  const words = query.toLowerCase().split(/\s+/);
  const potentialEntities: string[] = [];

  // Look for capitalized words (potential names)
  const capitalizedWords = query.split(/\s+/).filter(word =>
    word.length > 1 && /^[A-Z]/.test(word) && !isCommonCapitalizedWord(word)
  );

  potentialEntities.push(...capitalizedWords);

  return [...new Set(potentialEntities)];
}

/**
 * Check if a word is a common capitalized word that's not likely an entity
 */
function isCommonCapitalizedWord(word: string): boolean {
  const commonWords = ['The', 'And', 'For', 'Are', 'Is', 'In', 'On', 'At', 'To', 'With', 'By', 'A', 'An', 'Of', 'As', 'The', 'This', 'That', 'These', 'Those', 'Have', 'Has', 'Had', 'Do', 'Does', 'Did', 'Will', 'Would', 'Could', 'Should', 'May', 'Might', 'Must', 'Can', 'Shall'];
  return commonWords.includes(word);
}

/**
 * Calculate semantic relevance score based on entity co-occurrence and relationship patterns
 */
function calculateSemanticScore(content: string, queryEntities: string[], searchTerms: string[], entityPairs: string[]): number {
  let score = 0;
  const contentLower = content.toLowerCase();

  // Boost for query term matches
  for (const term of searchTerms) {
    if (contentLower.includes(term.toLowerCase())) {
      score += 10;
    }
  }

  // Significant boost for entity pair relationships (relationship detection)
  for (const pair of entityPairs) {
    const [entity1, entity2] = pair.split('_');
    if (contentLower.includes(entity1.toLowerCase()) && contentLower.includes(entity2.toLowerCase())) {
      score += 100; // Strong boost for relationship content
    }
  }

  // Additional boost if content contains relationship indicators
  const relationshipIndicators = ['relationship', 'with', 'and', 'met', 'told', 'said', 'visited', 'called', 'texted', 'about', 'love', 'knows', 'friend', 'partner', 'couple', 'together'];
  for (const indicator of relationshipIndicators) {
    if (contentLower.includes(indicator)) {
      score += 5;
    }
  }

  // Boost for temporal indicators if looking for narratives
  const temporalIndicators = ['when', 'then', 'later', 'before', 'after', 'during', 'while', 'yesterday', 'today', 'tomorrow', 'morning', 'afternoon', 'evening', 'night'];
  for (const indicator of temporalIndicators) {
    if (contentLower.includes(indicator)) {
      score += 3;
    }
  }

  return score;
}

/**
 * Find pairs of entities that appear together in content
 */
function findEntityPairs(content: string, queryEntities: string[]): string[] {
  const contentLower = content.toLowerCase();
  const foundEntities = queryEntities.filter(entity =>
    contentLower.includes(entity.toLowerCase())
  );

  // Create pairs of entities found together
  const pairs: string[] = [];
  for (let i = 0; i < foundEntities.length; i++) {
    for (let j = i + 1; j < foundEntities.length; j++) {
      pairs.push(`${foundEntities[i]}_${foundEntities[j]} `);
      pairs.push(`${foundEntities[j]}_${foundEntities[i]} `); // Bidirectional
    }
  }

  return [...new Set(pairs)];
}

/**
 * Determine semantic categories based on content analysis
 */
function determineSemanticCategories(content: string, entityPairs: string[]): SemanticCategory[] {
  const categories: SemanticCategory[] = [];
  const contentLower = content.toLowerCase();

  // Check for relationship indicators
  if (entityPairs.length > 0 ||
    /relationship|friend|partner|love|met|told|said|visited|called|texted|together|dating|couple|family|wife|husband|girlfriend|boyfriend|with|and/.test(contentLower)) {
    categories.push(SemanticCategory.RELATIONSHIP);
  }

  // Check for narrative/story indicators
  if (/(when|then|later|before|after|during|while|first|next|finally|meanwhile|suddenly|story|remember|recall|yesterday|today|tomorrow|morning|afternoon|evening|night)/.test(contentLower)) {
    categories.push(SemanticCategory.NARRATIVE);
  }

  // Check for technical indicators
  if (/(function|class|method|variable|code|api|database|server|client|library|framework|module|component|system|architecture|node\.js|typescript|javascript)/.test(contentLower)) {
    categories.push(SemanticCategory.TECHNICAL);
  }

  // Check for location indicators
  if (/(in|at|near|by|city|town|country|state|street|avenue|road|building|home|office|address|albuquerque|bernalillo|sandia|los alamos|nm|tx|ca|ny|fl)/.test(contentLower)) {
    categories.push(SemanticCategory.LOCATION);
  }

  // Check for emotional indicators
  if (/(happy|sad|angry|excited|frustrated|anxious|joy|fear|love|hate|regret|hope|despair|grateful|felt|emotions|feelings|heart|soul|spirit)/.test(contentLower)) {
    categories.push(SemanticCategory.EMOTIONAL);
  }

  return categories;
}