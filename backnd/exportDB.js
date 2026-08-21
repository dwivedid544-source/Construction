require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'construction_saas';
const OUTPUT_DIR = path.join(__dirname, 'db_export');

async function exportDB() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    const db = mongoose.connection.db;

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections:\n`);

    let totalDocs = 0;
    for (const col of collections) {
        const name = col.name;
        const docs = await db.collection(name).find({}).toArray();
        const filePath = path.join(OUTPUT_DIR, `${name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
        console.log(`  ✓ ${name.padEnd(35)} — ${docs.length} documents → ${name}.json`);
        totalDocs += docs.length;
    }

    // Write a manifest
    const manifest = {
        exportedAt: new Date().toISOString(),
        database: DB_NAME,
        totalCollections: collections.length,
        totalDocuments: totalDocs,
        collections: collections.map(c => c.name)
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, '_manifest.json'), JSON.stringify(manifest, null, 2));

    console.log(`\n✅ Export complete!`);
    console.log(`   Total Documents : ${totalDocs}`);
    console.log(`   Total Collections: ${collections.length}`);
    console.log(`   Output Folder   : ${OUTPUT_DIR}`);
    await mongoose.disconnect();
}

exportDB().catch(e => {
    console.error('❌ Export failed:', e.message);
    process.exit(1);
});
