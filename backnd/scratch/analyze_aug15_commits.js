const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const commit = 'bdaf01ca3f16a494348525590c1d489a13262e4c';

// Specifically, let's find all files modified in the 6 commits:
const commits = [
    'f9395a91f807754dfc7a42c05bcb94ac26eb135e',
    'f72fcff4e6b8994582be00c0a88929da95eb1b3e',
    '7c7a3be2f6d7628c77532caada1157d5f8c32d97',
    '2795d7f787961c1a45b271f7301df39e78482baf',
    '45e7af04ed83ef442337ddee84c12a847f7ce267',
    'bdaf01ca3f16a494348525590c1d489a13262e4c'
];

const allModifiedFiles = new Set();
commits.forEach(c => {
    const raw = execSync('git diff-tree --no-commit-id --name-only -r ' + c).toString();
    raw.split('\n').filter(Boolean).forEach(f => allModifiedFiles.add(f.trim()));
});

console.log('Total unique files modified in the 6 commits: ' + allModifiedFiles.size + '\n');

const results = [];

const rootDir = 'c:/Users/HGP/Desktop/intern projects/SAAS_Const';

allModifiedFiles.forEach(f => {
    let target = f;
    if (f.startsWith('kaal_frontend/')) {
        target = f.replace('kaal_frontend/', 'Frontend/');
    } else if (f.startsWith('kaal_backend (1)/')) {
        target = f.replace('kaal_backend (1)/', 'backnd/');
    }

    const absTarget = path.join(rootDir, target);
    const exists = fs.existsSync(absTarget);
    let commitContent = '';
    try {
        commitContent = execSync(`git show ${commit}:${JSON.stringify(f)}`, { cwd: rootDir }).toString();
    } catch (e) {}

    let currentContent = '';
    if (exists && !fs.statSync(absTarget).isDirectory()) {
        try {
            currentContent = fs.readFileSync(absTarget, 'utf8');
        } catch (e) {}
    }

    results.push({
        fileInCommit: f,
        targetFile: target,
        absTarget,
        exists,
        isSame: exists && commitContent === currentContent,
        commitSize: commitContent.length,
        currentSize: currentContent.length
    });
});

console.log('--- MODIFIED FILES COMPARISON ---');
results.forEach(r => {
    if (!r.exists) {
        console.log(`[MISSING IN CURRENT]: ${r.targetFile} (was in commit ${r.fileInCommit})`);
    } else if (!r.isSame) {
        console.log(`[DIFFERS]: ${r.targetFile} (Commit: ${r.commitSize} bytes, Current: ${r.currentSize} bytes)`);
    } else {
        console.log(`[IDENTICAL]: ${r.targetFile}`);
    }
});
