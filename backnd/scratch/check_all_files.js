const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = 'c:/Users/HGP/Desktop/intern projects/SAAS_Const';
const commit = 'bdaf01ca3f16a494348525590c1d489a13262e4c';

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

let breakdown = '';

allModifiedFiles.forEach(f => {
    let target = f;
    if (f.startsWith('kaal_frontend/')) {
        target = f.replace('kaal_frontend/', 'Frontend/');
    } else if (f.startsWith('kaal_backend (1)/')) {
        target = f.replace('kaal_backend (1)/', 'backnd/');
    }

    const absTarget = path.join(rootDir, target);
    const exists = fs.existsSync(absTarget);
    
    // Check if it is an uploaded asset or code
    if (f.includes('/uploads/')) {
        breakdown += `[MEDIA/UPLOAD] ${f} -> ${target} (Exists: ${exists})\n`;
        return;
    }

    let commitContent = '';
    try {
        commitContent = execSync(`git show ${commit}:${JSON.stringify(f)}`, { cwd: rootDir }).toString();
    } catch (e) {
        // Maybe in earlier commit
        for (let c of commits) {
            try {
                commitContent = execSync(`git show ${c}:${JSON.stringify(f)}`, { cwd: rootDir }).toString();
                if (commitContent) break;
            } catch (e2) {}
        }
    }

    let currentContent = '';
    if (exists && !fs.statSync(absTarget).isDirectory()) {
        try {
            currentContent = fs.readFileSync(absTarget, 'utf8');
        } catch (e) {}
    }

    if (!exists) {
        breakdown += `[MISSING FILE] ${target} (from ${f})\n`;
    } else if (commitContent === currentContent) {
        breakdown += `[IDENTICAL] ${target}\n`;
    } else {
        breakdown += `[DIFFERS] ${target} | Commit size: ${commitContent.length}, Current: ${currentContent.length}\n`;
    }
});

fs.writeFileSync(`${rootDir}/backnd/scratch/all_files_status.txt`, breakdown);
console.log('Saved all files status to scratch/all_files_status.txt');
