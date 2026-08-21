const { execSync } = require('child_process');
const fs = require('fs');

const rootDir = 'c:/Users/HGP/Desktop/intern projects/SAAS_Const';
const commit = 'bdaf01ca3f16a494348525590c1d489a13262e4c';

const filesToInspect = [
    { name: 'DrawingViewer.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/DrawingViewer.jsx', currentPath: 'Frontend/src/pages/company-admin/DrawingViewer.jsx' },
    { name: 'Drawings.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/Drawings.jsx', currentPath: 'Frontend/src/pages/company-admin/Drawings.jsx' },
    { name: 'Issues.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/Issues.jsx', currentPath: 'Frontend/src/pages/company-admin/Issues.jsx' },
    { name: 'Photos.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/Photos.jsx', currentPath: 'Frontend/src/pages/company-admin/Photos.jsx' },
    { name: 'PurchaseOrderDetail.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/PurchaseOrderDetail.jsx', currentPath: 'Frontend/src/pages/company-admin/PurchaseOrderDetail.jsx' },
    { name: 'PurchaseOrderForm.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/PurchaseOrderForm.jsx', currentPath: 'Frontend/src/pages/company-admin/PurchaseOrderForm.jsx' },
    { name: 'PurchaseOrders.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/PurchaseOrders.jsx', currentPath: 'Frontend/src/pages/company-admin/PurchaseOrders.jsx' },
    { name: 'DailyLogs.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/DailyLogs.jsx', currentPath: 'Frontend/src/pages/company-admin/DailyLogs.jsx' },
    { name: 'Timesheets.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/Timesheets.jsx', currentPath: 'Frontend/src/pages/company-admin/Timesheets.jsx' },
    { name: 'TradeManagement.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/TradeManagement.jsx', currentPath: 'Frontend/src/pages/company-admin/TradeManagement.jsx' },
    { name: 'Invoices.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/Invoices.jsx', currentPath: 'Frontend/src/pages/company-admin/Invoices.jsx' },
    { name: 'InvoiceDetail.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/InvoiceDetail.jsx', currentPath: 'Frontend/src/pages/company-admin/InvoiceDetail.jsx' },
    { name: 'Settings.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/Settings.jsx', currentPath: 'Frontend/src/pages/company-admin/Settings.jsx' },
    { name: 'Tasks.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/Tasks.jsx', currentPath: 'Frontend/src/pages/company-admin/Tasks.jsx' },
    { name: 'Team.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/Team.jsx', currentPath: 'Frontend/src/pages/company-admin/Team.jsx' },
    { name: 'Payroll.jsx', commitPath: 'kaal_frontend/src/pages/company-admin/Payroll.jsx', currentPath: 'Frontend/src/pages/company-admin/Payroll.jsx' },
    { name: 'JobDetails.jsx', commitPath: 'kaal_frontend/src/pages/jobs/JobDetails.jsx', currentPath: 'Frontend/src/pages/jobs/JobDetails.jsx' },
    
    // Backend files
    { name: 'drawingController.js', commitPath: 'kaal_backend (1)/controllers/drawingController.js', currentPath: 'backnd/controllers/drawingController.js' },
    { name: 'issueController.js', commitPath: 'kaal_backend (1)/controllers/issueController.js', currentPath: 'backnd/controllers/issueController.js' },
    { name: 'photoController.js', commitPath: 'kaal_backend (1)/controllers/photoController.js', currentPath: 'backnd/controllers/photoController.js' },
    { name: 'purchaseOrder.controller.js', commitPath: 'kaal_backend (1)/controllers/purchaseOrder.controller.js', currentPath: 'backnd/controllers/purchaseOrder.controller.js' },
    { name: 'dailyLogController.js', commitPath: 'kaal_backend (1)/controllers/dailyLogController.js', currentPath: 'backnd/controllers/dailyLogController.js' },
    { name: 'timeLogController.js', commitPath: 'kaal_backend (1)/controllers/timeLogController.js', currentPath: 'backnd/controllers/timeLogController.js' },
    { name: 'vendorController.js', commitPath: 'kaal_backend (1)/controllers/vendorController.js', currentPath: 'backnd/controllers/vendorController.js' },
    { name: 'invoiceController.js', commitPath: 'kaal_backend (1)/controllers/invoiceController.js', currentPath: 'backnd/controllers/invoiceController.js' },
    { name: 'companyController.js', commitPath: 'kaal_backend (1)/controllers/companyController.js', currentPath: 'backnd/controllers/companyController.js' },
    { name: 'jobTaskController.js', commitPath: 'kaal_backend (1)/controllers/jobTaskController.js', currentPath: 'backnd/controllers/jobTaskController.js' },
    { name: 'payrollController.js', commitPath: 'kaal_backend (1)/controllers/payrollController.js', currentPath: 'backnd/controllers/payrollController.js' },
    { name: 'taskController.js', commitPath: 'kaal_backend (1)/controllers/taskController.js', currentPath: 'backnd/controllers/taskController.js' },
    { name: 'reportController.js', commitPath: 'kaal_backend (1)/controllers/reportController.js', currentPath: 'backnd/controllers/reportController.js' },
    { name: 'Company.js (model)', commitPath: 'kaal_backend (1)/models/Company.js', currentPath: 'backnd/models/Company.js' },
    { name: 'Invoice.js (model)', commitPath: 'kaal_backend (1)/models/Invoice.js', currentPath: 'backnd/models/Invoice.js' }
];

let report = '';

filesToInspect.forEach(f => {
    let commitContent = '';
    try {
        commitContent = execSync(`git show ${commit}:${JSON.stringify(f.commitPath)}`, { cwd: rootDir }).toString();
    } catch (e) {
        commitContent = 'ERROR_FETCHING';
    }

    let currentContent = '';
    try {
        currentContent = fs.readFileSync(`${rootDir}/${f.currentPath}`, 'utf8');
    } catch (e) {
        currentContent = 'ERROR_READING_CURRENT';
    }

    report += `\n########################################################################\n`;
    report += `FILE: ${f.name} [${f.currentPath}]\n`;
    report += `Commit size: ${commitContent.length} | Current size: ${currentContent.length} | Equal: ${commitContent === currentContent}\n`;
    report += `########################################################################\n`;
});

fs.writeFileSync(`${rootDir}/backnd/scratch/detailed_report.txt`, report);
console.log('Saved detailed report to scratch/detailed_report.txt');
