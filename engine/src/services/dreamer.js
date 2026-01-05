const { db } = require('../core/db');
const inference = require('./inference');

async function dream() {
    console.log('🌙 Dreamer: Starting self-organization cycle...');
    
    try {
        // 1. Get all unique tags currently in DB
        const tagsQuery = '?[buckets] := *memory{buckets}';
        const tagsResult = await db.run(tagsQuery);
        const allTags = [...new Set(tagsResult.rows.flatMap(r => r[0]))];
        
        // 2. Find memories that need tagging (empty or just 'core')
        const untaggedQuery = `?[id, content, buckets] := *memory{id, content, buckets}`;
        const allMemories = await db.run(untaggedQuery);
        
        const untaggedRows = allMemories.rows.filter(row => {
            const buckets = row[2];
            return !buckets || buckets.length === 0 || (buckets.length === 1 && buckets[0] === 'core');
        });
        
        console.log(`🌙 Dreamer: Found ${untaggedRows.length} memories to analyze.`);
        
        let updatedCount = 0;
        for (const row of untaggedRows) {
            const [id, content] = row;
            try {
                const newTags = await inference.generateTags(content, allTags);
                
                if (Array.isArray(newTags) && newTags.length > 0) {
                    // Update DB
                    const updateQuery = `?[id, buckets] <- $data :update memory {id, buckets}`;
                    await db.run(updateQuery, { data: [[id, newTags]] });
                    updatedCount++;
                    
                    // Add new tags to our local list to help future tagging in this cycle
                    newTags.forEach(t => { 
                        if (typeof t === 'string' && !allTags.includes(t)) {
                            allTags.push(t); 
                        }
                    });
                }
            } catch (innerError) {
                console.error(`🌙 Dreamer: Failed to process memory ${id}:`, innerError.message || innerError);
                // Continue to next memory
            }
        }
        
        return {
            status: 'success',
            analyzed: untaggedRows.length,
            updated: updatedCount,
            total_tags: allTags.length
        };
    } catch (error) {
        console.error('🌙 Dreamer Fatal Error:', error.stack || error.message || error);
        throw error;
    }
}

module.exports = { dream };
