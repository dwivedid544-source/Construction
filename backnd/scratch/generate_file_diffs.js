const { execSync } = require('child_process');
const fs = require('fs');

const rootDir = 'c:/Users/HGP/Desktop/intern projects/SAAS_Const';
const commit = 'bdaf01ca3f16a494348525590c1d489a13262e4c';

const files = [
    { name: 'DrawingViewer.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/DrawingViewer.jsx', currentPath: 'Frontend/src/pages/company-admin/DrawingViewer.jsx' },
    { name: 'Drawings.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/Drawings.jsx', currentPath: 'Frontend/src/pages/company-admin/Drawings.jsx' },
    { name: 'Issues.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/Issues.jsx', currentPath: 'Frontend/src/pages/company-admin/Issues.jsx' },
    { name: 'Photos.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/Photos.jsx', currentPath: 'Frontend/src/pages/company-admin/Photos.jsx' },
    { name: 'PurchaseOrderDetail.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/PurchaseOrderDetail.jsx', currentPath: 'Frontend/src/pages/company-admin/PurchaseOrderDetail.jsx' },
    { name: 'PurchaseOrderForm.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/PurchaseOrderForm.jsx', currentPath: 'Frontend/src/pages/company-admin/PurchaseOrderForm.jsx' },
    { name: 'DailyLogs.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/DailyLogs.jsx', currentPath: 'Frontend/src/pages/company-admin/DailyLogs.jsx' },
    { name: 'Timesheets.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/Timesheets.jsx', currentPath: 'Frontend/src/pages/company-admin/Timesheets.jsx' },
    { name: 'TradeManagement.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/TradeManagement.jsx', currentPath: 'Frontend/src/pages/company-admin/TradeManagement.jsx' },
    { name: 'Invoices.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/Invoices.jsx', currentPath: 'Frontend/src/pages/company-admin/Invoices.jsx' },
    { name: 'InvoiceDetail.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/InvoiceDetail.jsx', currentPath: 'Frontend/src/pages/company-admin/InvoiceDetail.jsx' },
    { name: 'Settings.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/Settings.jsx', currentPath: 'Frontend/src/pages/company-admin/Settings.jsx' },
    
    // Backend
    { name: 'drawingController.js', commitPath: 'kaal_backend (1)/controllers/drawingController.js', currentPath: 'backnd/controllers/drawingController.js' },
    { name: 'issueController.js', commitPath: 'kaal_backend (1)/controllers/issueController.js', currentPath: 'backnd/controllers/issueController.js' },
    { name: 'photoController.js', commitPath: 'kaal_backend (1)/controllers/photoController.js', currentPath: 'backnd/controllers/photoController.js' },
    { name: 'purchaseOrder.controller.js', commitPath: 'kaal_backend (1)/controllers/purchaseOrder.controller.js', currentPath: 'backnd/controllers/purchaseOrder.controller.js' },
    { name: 'dailyLogController.js', commitPath: 'kaal_backend (1)/controllers/dailyLogController.js', currentPath: 'backnd/controllers/dailyLogController.js' },
    { name: 'timeLogController.js', commitPath: 'kaal_backend (1)/controllers/timeLogController.js', currentPath: 'backnd/controllers/timeLogController.js' },
    { name: 'vendorController.js', commitPath: 'kaal_backend (1)/controllers/vendorController.js', currentPath: 'backnd/controllers/vendorController.js' },
    { name: 'invoiceController.js', commitPath: 'kaal_backend (1)/controllers/invoiceController.js', currentPath: 'backnd/controllers/invoiceController.js' },
    { name: 'companyController.js', commitPath: 'kaal_backend (1)/controllers/companyController.js', currentPath: 'backnd/controllers/companyController.js' },
    { name: 'Company.js (model)', commitPath: 'kaal_backend (1)/models/Company.js', currentPath: 'backnd/models/Company.js' },
    { name: 'Invoice.js (model)', commitPath: 'kaal_backend (1)/models/Invoice.js', currentPath: 'backnd/models/Invoice.js' }
];

let out = '';
files.forEach(f => {
    out += `\n========================================================================\n`;
    out += `DIFF FOR: ${f.name}\n`;
    out += `========================================================================\n`;
    try {
        const commitText = execSync(`git show ${commit}:${JSON.stringify(f.commitPath)}`, { cwd: rootDir }).toString();
        const currentText = fs.readFileSync(`${rootDir}/${f.currentPath}`, 'utf8');
        if (commitText === currentText) {
            out += 'STATUS: MATCHES CURRENT EXACTLY (100% IDENTICAL)\n';
        } else {
            out += `STATUS: DIFFERS (Commit: ${commitText.length} bytes, Current: ${currentText.length} bytes)\n`;
            // Write temporary files to diff
            fs.writeFileSync(`${rootDir}/backnd/scratch/temp_commit.txt`, commitText);
            fs.writeFileSync(`${rootDir}/backnd/scratch/temp_current.txt`, currentText);
            try {
                const d = execSync(`git diff --no-index backnd/scratch/temp_commit.txt backnd/scratch/temp_current.txt`, { cwd: rootDir }).toString();
                out += d.slice(0, 3000) + (d.length > 3000 ? '\n...[TRUNCATED DIFF]...\n' : '\n');
            } catch (diffErr) {
                if (diffErr.stdout) {
                    const d = diffErr.stdout.toString();
                    out += d.slice(0, 3000) + (d.length > 3000 ? '\n...[TRUNCATED DIFF]...\n' : '\n');
                }
            }
        }
    } catch (err) {
        out += 'ERROR: ' + err.message + '\n';
    }
});

fs.writeFileSync(`${rootDir}/backnd/scratch/diffs_output.txt`, out);
console.log('Diffs output written to scratch/diffs_output.txt');
