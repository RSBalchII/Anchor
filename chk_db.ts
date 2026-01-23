
import { db } from './engine/src/core/db.js';

async function check() {
    await db.init();
    const res = await db.run('?[]:=*memory{}');
    console.log(`[DB Count] Rows: ${res.rows.length}`);
    process.exit(0);
}

check().catch(console.error);
