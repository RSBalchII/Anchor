import { db } from '../src/core/db.js';
import { executeSearch, runTraditionalSearch } from '../src/services/search/search.js';

async function run() {
    console.log("Initializing DB...");
    await db.init();

    // Clean up stale data from previous failed runs
    try {
        await db.run(`?[id] := *memory{id}, starts_with(id, 'test_') :rm memory {id}`);
        console.log("Cleaned up stale test data.");
    } catch (e) {
        console.log("No stale data to clean or cleanup failed.");
    }

    const idSovereign = `test_sov_${Date.now()}`;
    const idExternal = `test_ext_${Date.now()}`;
    const idNeighbor = `test_neigh_${Date.now()}`;

    // Anchor content has keywords
    const content = "provenance test content unique phrase";
    // Neighbor content has NO keywords, but shares tags
    const neighborContent = "this is a hidden connection found via tags";

    console.log("Ingesting test data...");

    // Sovereign Item (Anchor)
    await db.run(
        `?[id, timestamp, content, source, source_id, sequence, type, hash, buckets, tags, epochs, provenance, embedding] <- $data 
         :insert memory {id, timestamp, content, source, source_id, sequence, type, hash, buckets, tags, epochs, provenance, embedding}`,
        {
            data: [[
                idSovereign, Date.now(), content, 'Test', 'src_sov', 0, 'text', 'hash_sov', ['test'], ['#bridge_tag'], [], 'sovereign', new Array(768).fill(0.1)
            ]]
        }
    );

    // External Item (Anchor)
    await db.run(
        `?[id, timestamp, content, source, source_id, sequence, type, hash, buckets, tags, epochs, provenance, embedding] <- $data 
         :insert memory {id, timestamp, content, source, source_id, sequence, type, hash, buckets, tags, epochs, provenance, embedding}`,
        {
            data: [[
                idExternal, Date.now(), content, 'Test', 'src_ext', 0, 'text', 'hash_ext', ['test'], ['#bridge_tag'], [], 'external', new Array(768).fill(0.1)
            ]]
        }
    );

    // Neighbor Item (Hidden)
    await db.run(
        `?[id, timestamp, content, source, source_id, sequence, type, hash, buckets, tags, epochs, provenance, embedding] <- $data 
         :insert memory {id, timestamp, content, source, source_id, sequence, type, hash, buckets, tags, epochs, provenance, embedding}`,
        {
            data: [[
                idNeighbor, Date.now(), neighborContent, 'Test', 'src_neigh', 0, 'text', 'hash_neigh', ['test'], ['#bridge_tag'], [], 'sovereign', new Array(768).fill(0.1)
            ]]
        }
    );

    try {
        console.log("\n--- TEST CASE 1: Sovereign Bias (Frontend Toggle ON) ---");
        let resSov = await executeSearch(content, undefined, ['test'], 2000, false, 'sovereign');
        console.log(`Results: ${resSov.results.length}`);
        resSov.results.forEach(r => console.log(`[${r.id}] Score: ${r.score}`));

        console.log("\n--- TEST CASE 2: Neutral Bias (Frontend Toggle OFF) ---");
        let resAll = await executeSearch(content, undefined, ['test'], 2000, false, 'all');
        console.log(`Results: ${resAll.results.length}`);
        resAll.results.forEach(r => console.log(`[${r.id}] Score: ${r.score}`));

    } catch (e) {
        console.error("Test execution failed:", e);
    }

    try {
        console.log("Testing Provenance: ALL (Tag-Walker)");
        // We expect Anchors (Sovereign + External) via FTS
        // AND Neighbor via Tag-Walk (Phase 3)
        let res = await executeSearch(content, undefined, ['test'], 2000, false, 'all');

        console.log("Results Found:", res.results.length);
        res.results.forEach(r => {
            console.log(`[${r.id}] ${r.content.substring(0, 30)}... (Score: ${r.score})`);
        });

        const neighborFound = res.results.find(r => r.id === idNeighbor);
        if (neighborFound) {
            console.log("SUCCESS: Neighbor found via Tag-Walker!");
        } else {
            console.error("FAILURE: Neighbor NOT found.");
        }

    } catch (e) {
        console.error("Test execution failed:", e);
    }

    // Cleanup
    const ids = [idSovereign, idExternal, idNeighbor];
    await db.run(`?[id] := *memory{id}, id in $ids :rm memory {id}`, { ids });
    await db.close();
}

run().catch(console.error);
