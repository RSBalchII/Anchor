const { CozoDb } = require('cozo-node');

async function test() {
    const db = new CozoDb('rocksdb', 'test_fts.db'); // Use rocksdb
    try {
        await db.run(':create test_mem {id: String => content: String}');
        await db.run('::fts create test_mem:idx {extractor: content, tokenizer: Simple}');
        await db.run('?[id, content] <- [["1", "hello world"], ["2", "foo bar"]] :put test_mem');
        
        console.log("Testing Option 1 (index.js style): ?[id, score] := ~test_mem:idx{content | query: 'hello', k: 1, bind_score: s}, score = s");
        try {
            const res1 = await db.run("?[id, score] := ~test_mem:idx{content | query: 'hello', k: 1, bind_score: s}, score = s");
            console.log("Option 1 result:", JSON.stringify(res1));
        } catch (e) {
            console.log("Option 1 failed:", e.message);
        }

        console.log("Testing Option 11: ?[id] := *test_mem{id, content}, ~test_mem:idx{content | query: 'hello', k: 1}");
        try {
            const res11 = await db.run("?[id] := *test_mem{id, content}, ~test_mem:idx{content | query: 'hello', k: 1}");
            console.log("Option 11 result:", JSON.stringify(res11));
        } catch (e) {
            console.log("Option 11 failed:", e.message);
        }

        console.log("\nTesting Option 3: ?[id] := ~test_mem:idx{content | query: 'hello', k: 1}, *test_mem{id}");
        try {
            const res3 = await db.run("?[id] := ~test_mem:idx{content | query: 'hello', k: 1}, *test_mem{id}");
            console.log("Option 3 result:", JSON.stringify(res3));
        } catch (e) {
            console.log("Option 3 failed:", e.message);
        }

    } catch (e) {
        console.error("Setup failed:", e);
    }
}

test();
