const { execSync } = require('child_process');
const fs = require('fs');

const rootDir = 'c:/Users/HGP/Desktop/intern projects/SAAS_Const';

function getCommitDiff(commit, file) {
    try {
        return execSync(`git show ${commit} -- ${JSON.stringify(file)}`, { cwd: rootDir }).toString();
    } catch (e) {
        return e.message;
    }
}

const interestingCommits = [
    { commit: '45e7af04ed83ef442337ddee84c12a847f7ce267', file: 'kaal_backend (1)/routes/companyRoutes.js' },
    { commit: '45e7af04ed83ef442337ddee84c12a847f7ce267', file: 'kaal_backend (1)/controllers/companyController.js' },
    { commit: '45e7af04ed83ef442337ddee84c12a847f7ce267', file: 'kaal_backend (1)/controllers/invoiceController.js' },
    { commit: 'bdaf01ca3f16a494348525590c1d489a13262e4c', file: 'kaal_frontend/src/pages/company-admin/InvoiceDetail.jsx' },
    { commit: 'bdaf01ca3f16a494348525590c1d489a13262e4c', file: 'kaal_frontend/src/pages/company-admin/Invoices.jsx' },
    { commit: 'bdaf01ca3f16a494348525590c1d489a13262e4c', file: 'kaal_frontend/src/pages/company-admin/Settings.jsx' },
    { commit: 'f9395a91f807754dfc7a42c05bcb94ac26eb135e', file: 'kaal_frontend/src/pages/company-admin/DrawingViewer.jsx' },
    { commit: 'f9395a91f807754dfc7a42c05bcb94ac26eb135e', file: 'kaal_frontend/src/pages/company-admin/Photos.jsx' },
    { commit: 'f9395a91f807754dfc7a42c05bcb94ac26eb135e', file: 'kaal_backend (1)/controllers/photoController.js' },
    { commit: 'f72fcff4e6b8994582be00c0a88929da95eb1b3e', file: 'kaal_frontend/src/pages/company-admin/TradeManagement.jsx' },
    { commit: '7c7a3be2f6d7628c77532caada1157d5f8c32d97', file: 'kaal_backend (1)/sync_all_job_progress.js' }
];

let fullReport = '';
interestingCommits.forEach(ic => {
    fullReport += `\n############################################################\n`;
    fullReport += `COMMIT: ${ic.commit} | FILE: ${ic.file}\n`;
    fullReport += `############################################################\n`;
    fullReport += getCommitDiff(ic.commit, ic.file) + '\n';
});

fs.writeFileSync(`${rootDir}/backnd/scratch/feature_diffs.txt`, fullReport);
console.log('Saved feature diffs to scratch/feature_diffs.txt');
