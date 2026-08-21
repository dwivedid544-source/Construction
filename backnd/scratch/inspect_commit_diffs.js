const { execSync } = require('child_process');
const fs = require('fs');

const commits = [
    { hash: 'f9395a91f807754dfc7a42c05bcb94ac26eb135e', name: 'Commit 1 (ts)' },
    { hash: 'f72fcff4e6b8994582be00c0a88929da95eb1b3e', name: 'Commit 2 (k)' },
    { hash: '7c7a3be2f6d7628c77532caada1157d5f8c32d97', name: 'Commit 3 (????)' },
    { hash: '2795d7f787961c1a45b271f7301df39e78482baf', name: 'Commit 4 (///??)' },
    { hash: '45e7af04ed83ef442337ddee84c12a847f7ce267', name: 'Commit 5 (ramm)' },
    { hash: 'bdaf01ca3f16a494348525590c1d489a13262e4c', name: 'Commit 6 (///???)' }
];

let fullReport = '';

commits.forEach(c => {
    fullReport += `\n========================================================================\n`;
    fullReport += `  ${c.name}: ${c.hash}\n`;
    fullReport += `========================================================================\n\n`;

    const diff = execSync(`git show --compact-summary ${c.hash}`).toString();
    fullReport += diff + '\n';
});

fs.writeFileSync('c:/Users/HGP/Desktop/intern projects/SAAS_Const/backnd/scratch/aug15_summary.txt', fullReport);
console.log('Summary saved to scratch/aug15_summary.txt');
