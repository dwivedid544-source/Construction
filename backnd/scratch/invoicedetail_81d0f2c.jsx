import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Printer, Download, FileText } from 'lucide-react';
import api, { getServerUrl } from '../../utils/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../../assets/images/Logo.png';

const InvoiceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchInvoice = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/invoices/${id}`);
            setInvoice(res.data);
        } catch (error) {
            console.error('Error fetching invoice details:', error);
            alert('Failed to load invoice details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoice();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    const getVendorDetails = (inv) => {
        if (!inv) return { name: 'Vendor', email: '', phone: '', address: '' };
        if (inv.poId) {
            const vName = inv.poId.vendorName || inv.poId.vendorId?.name || 'Vendor';
            const vEmail = inv.poId.vendorEmail || inv.poId.vendorId?.email || '';
            const vPhone = inv.poId.vendorId?.phone || '';
            const vAddr = inv.poId.vendorId?.address || '';
            return { name: vName, email: vEmail, phone: vPhone, address: vAddr };
        }
        if (inv.clientId) {
            return {
                name: inv.clientId.fullName || 'Client',
                email: inv.clientId.email || '',
                phone: inv.clientId.phone || '',
                address: typeof inv.clientId.address === 'object' ? (inv.clientId.address.address || JSON.stringify(inv.clientId.address)) : (inv.clientId.address || '')
            };
        }
        return { name: 'Vendor / Client', email: '', phone: '', address: '' };
    };

    const getShippingAddress = (inv) => {
        if (!inv) return 'N/A';
        const project = inv.projectId;
        if (project) {
            if (typeof project.location === 'object' && project.location?.address) {
                return project.location.address;
            }
            if (typeof project.location === 'string' && project.location.trim()) {
                return project.location;
            }
            if (project.address) {
                return typeof project.address === 'object' ? (project.address.address || JSON.stringify(project.address)) : project.address;
            }
        }
        if (inv.clientId?.address) {
            return typeof inv.clientId.address === 'object' ? (inv.clientId.address.address || JSON.stringify(inv.clientId.address)) : inv.clientId.address;
        }
        return 'Project Site Address';
    };

    const getCompanyDetails = (inv) => {
        // Priority 1: Organization/Company linked to the project
        const projectComp = (typeof inv?.projectId?.companyId === 'object' && inv?.projectId?.companyId !== null)
            ? inv.projectId.companyId
            : null;
        // Priority 2: Direct Company linked to the invoice
        const directComp = (typeof inv?.companyId === 'object' && inv?.companyId !== null)
            ? inv.companyId
            : null;
        
        const comp = projectComp || directComp || {};
        const invSettings = comp.invoiceSettings || projectComp?.invoiceSettings || directComp?.invoiceSettings || {};

        let orgName = invSettings.companyName || projectComp?.name || directComp?.name || 'KT Construction Ltd';
        if (orgName === 'Kaal Construction Ltd') orgName = 'KT Construction Ltd';

        const orgEmail = invSettings.email || projectComp?.email || directComp?.email || 'company@gmail.com';
        const orgPhone = invSettings.phone || projectComp?.phone || directComp?.phone || '1234567890';
        const orgAddress = invSettings.address || projectComp?.address || directComp?.address || '14/608, Sudama Nagar, Indore, MP';
        const orgTaxNumber = invSettings.taxNumber || '';

        return {
            name: orgName,
            email: orgEmail,
            phone: orgPhone,
            address: orgAddress,
            taxNumber: orgTaxNumber,
            notes: invSettings.notes || '',
            terms: invSettings.terms || ''
        };
    };

    const handleDownloadPDF = () => {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;

            const company = getCompanyDetails(invoice);
            const vendor = getVendorDetails(invoice);
            const shippingAddress = getShippingAddress(invoice);

            // 1. Header Section
            // Company Logo
            const img = new Image();
            img.src = logo;
            doc.addImage(img, 'PNG', 20, 15, 25, 25);

            // Company Info (Left)
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text(company.name, 20, 48);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            let yPos = 54;
            if (company.email) { doc.text(company.email, 20, yPos); yPos += 5; }
            if (company.phone) { doc.text(company.phone, 20, yPos); yPos += 5; }
            if (company.address) { doc.text(company.address, 20, yPos); yPos += 5; }
            if (company.taxNumber) { doc.text(`Tax ID: ${company.taxNumber}`, 20, yPos); yPos += 5; }

            // Invoice Title & Info (Right)
            doc.setFontSize(28);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('INVOICE', pageWidth - 20, 25, { align: 'right' });

            doc.setFontSize(10);
            const statusColor = invoice.status === 'paid' ? [16, 185, 129] : [239, 68, 68];
            doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
            doc.text(invoice.status?.toUpperCase() || 'UNPAID', pageWidth - 20, 32, { align: 'right' });

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100);
            doc.text(`Number: #${invoice.invoiceNumber}`, pageWidth - 20, 40, { align: 'right' });
            doc.text(`Issue: ${invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-US') : 'N/A'}`, pageWidth - 20, 45, { align: 'right' });
            doc.text(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-US') : 'N/A'}`, pageWidth - 20, 50, { align: 'right' });

            doc.setDrawColor(241, 245, 249);
            doc.line(20, 75, pageWidth - 20, 75);

            // 2. Billing Section
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(148, 163, 184);
            doc.text('BILL TO:', 20, 85);
            doc.text('SHIP TO:', pageWidth - 20, 85, { align: 'right' });

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(vendor.name, 20, 93);
            doc.text(shippingAddress, pageWidth - 20, 93, { align: 'right' });

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            if (vendor.address) doc.text(vendor.address, 20, 99);
            else if (vendor.email) doc.text(vendor.email, 20, 99);

            // 3. Table Section
            const tableColumn = ["ITEM DESCRIPTION", "QTY", "UNIT PRICE", "TOTAL"];
            let tableRows = [];

            if (invoice.items && invoice.items.length > 0) {
                tableRows = invoice.items.map(item => [
                    { content: item.description || 'Item', styles: { fontStyle: 'bold' } },
                    item.quantity || 1,
                    `$${(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                    `$${(item.total || ((item.quantity || 1) * (item.unitPrice || 0))).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                ]);
            } else {
                tableRows.push([
                    { content: 'Invoice Amount', styles: { fontStyle: 'bold' } },
                    1,
                    `$${(invoice.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                    `$${(invoice.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                ]);
            }

            autoTable(doc, {
                startY: 110,
                head: [tableColumn],
                body: tableRows,
                theme: 'plain',
                headStyles: {
                    fillColor: [30, 41, 59], // Slate-800
                    textColor: [255, 255, 255],
                    fontSize: 8,
                    fontStyle: 'bold',
                    cellPadding: 4,
                },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { halign: 'center', fontStyle: 'bold' },
                    2: { halign: 'right', fontStyle: 'bold' },
                    3: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 6,
                    lineColor: [226, 232, 240], // Slate-200
                    lineWidth: 0.1
                },
            });

            const hasItems = invoice.items && invoice.items.length > 0;
            const computedSubtotal = hasItems 
                ? invoice.items.reduce((acc, it) => acc + (Number(it.total) || (Number(it.quantity || 1) * Number(it.unitPrice || 0))), 0)
                : (invoice.totalAmount || 0);
            const displaySubtotal = (invoice.subtotal !== undefined && invoice.subtotal !== null && invoice.subtotal > 0) ? invoice.subtotal : computedSubtotal;
            const displayTax = (invoice.tax !== undefined && invoice.tax !== null) ? invoice.tax : 0;
            const displayTotal = invoice.totalAmount || (displaySubtotal + displayTax);
            const taxRate = invoice.taxRate || 0;

            // 4. Summary Section
            const finalY = doc.lastAutoTable.finalY + 15;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(148, 163, 184);
            doc.text('Subtotal', pageWidth - 85, finalY);
            doc.setTextColor(15, 23, 42);
            doc.text(`$${displaySubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY, { align: 'right' });

            doc.setTextColor(148, 163, 184);
            doc.text(`Estimated Tax (${taxRate}%)`, pageWidth - 85, finalY + 8);
            doc.setTextColor(15, 23, 42);
            doc.text(`$${displayTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY + 8, { align: 'right' });

            doc.setDrawColor(241, 245, 249);
            doc.line(pageWidth - 90, finalY + 14, pageWidth - 20, finalY + 14);

            doc.setFontSize(12);
            doc.setTextColor(15, 23, 42);
            doc.text('GRAND TOTAL', pageWidth - 85, finalY + 25);
            doc.setFontSize(16);
            doc.setTextColor(37, 99, 235); // Blue-600
            doc.text(`$${displayTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY + 25, { align: 'right' });

            // 5. Footer Notes
            const footerY = 240;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('Notes', 20, footerY);

            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            const notes = "This accounting software is designed to assist users in managing financial data such as invoices, expenses, payments, reports, and tax-related records. All information and reports generated by the system depend on the data entered by the user, and users should verify details before final submission. The software may receive updates, improvements, or feature changes to enhance performance, accuracy, and security. Regular data backups are recommended to avoid potential data loss.";
            const splitNotes = doc.splitTextToSize(notes, pageWidth - 40);
            doc.text(splitNotes, 20, footerY + 8);

            doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Failed to generate PDF. Check console.');
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-2xl font-bold text-slate-800">Invoice not found</h2>
                <button
                    onClick={() => navigate('/company-admin/invoices')}
                    className="mt-4 text-blue-600 hover:underline flex items-center gap-2 justify-center mx-auto font-semibold"
                >
                    <ChevronLeft size={20} /> Back to Invoices
                </button>
            </div>
        );
    }

    const company = getCompanyDetails(invoice);
    const vendor = getVendorDetails(invoice);
    const shippingAddress = getShippingAddress(invoice);
    const hasItems = invoice.items && invoice.items.length > 0;
    const computedSubtotal = hasItems 
        ? invoice.items.reduce((acc, it) => acc + (Number(it.total) || (Number(it.quantity || 1) * Number(it.unitPrice || 0))), 0)
        : (invoice.totalAmount || 0);
    const displaySubtotal = (invoice.subtotal !== undefined && invoice.subtotal !== null && invoice.subtotal > 0) ? invoice.subtotal : computedSubtotal;
    const displayTax = (invoice.tax !== undefined && invoice.tax !== null) ? invoice.tax : 0;
    const displayTotal = invoice.totalAmount || (displaySubtotal + displayTax);
    const displayTaxRate = invoice.taxRate || 0;

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Action Bar */}
            <div className="flex justify-between items-center print:hidden">
                <button
                    onClick={() => navigate('/company-admin/invoices')}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition shadow-sm font-semibold"
                >
                    <ChevronLeft size={18} />
                    Back
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition shadow-sm font-bold"
                    >
                        <Download size={18} />
                        Download PDF
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition shadow-lg shadow-slate-200 font-bold"
                    >
                        <Printer size={18} />
                        Print
                    </button>
                </div>
            </div>

            {/* Invoice Document Style Card */}
            <div 
                className="bg-white max-w-4xl mx-auto shadow-md border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-0"
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', minHeight: '1122px', padding: '60px 80px' }}
            >
                <div className="font-sans text-slate-800">
                    
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        {/* Left Company Details */}
                        <div className="space-y-4">
                            {invoice.companyId?.logo ? (
                                <img src={getServerUrl(invoice.companyId.logo)} alt="Company Logo" className="h-16 w-auto object-contain" />
                            ) : (
                                <img src={logo} alt="Company Logo" className="h-16 w-auto object-contain" />
                            )}
                            <div className="mt-4">
                                <h2 className="text-[17px] font-bold text-slate-900">{company.name}</h2>
                                <div className="text-xs text-slate-500 mt-1 space-y-0.5 font-medium">
                                    {company.email && <p>{company.email}</p>}
                                    {company.phone && <p>{company.phone}</p>}
                                    {company.address && <p>{company.address}</p>}
                                    {company.taxNumber && <p>Tax ID: {company.taxNumber}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Right Invoice Info */}
                        <div className="text-right">
                            <h1 className="text-4xl font-bold text-slate-900 tracking-tight uppercase">INVOICE</h1>
                            <div className="mt-2 flex justify-end">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${invoice.status === 'paid' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {invoice.status || 'UNPAID'}
                                </span>
                            </div>
                            <div className="grid grid-cols-[auto_auto] gap-x-2 text-[11px] justify-end text-slate-500 mt-6 font-medium">
                                <span className="text-right">Number:</span>
                                <span className="text-slate-800">#{invoice.invoiceNumber}</span>

                                <span className="text-right">Issue:</span>
                                <span className="text-slate-800">
                                    {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-US') : 'N/A'}
                                </span>

                                <span className="text-right">Due Date:</span>
                                <span className="text-slate-800">
                                    {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-US') : 'N/A'}
                                </span>
                                {invoice.poId && (
                                    <>
                                        <span className="text-right font-bold text-blue-600">PO Ref:</span>
                                        <span className="text-blue-600 font-bold">{invoice.poId.poNumber || 'PO Details'}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 mt-8 mb-6"></div>

                    {/* Billing Details */}
                    <div className="flex justify-between items-start">
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-bold tracking-widest uppercase text-slate-400">BILL TO:</h3>
                            <div className="space-y-1">
                                <p className="font-bold text-slate-900 text-sm">{vendor.name}</p>
                                {vendor.address && <p className="text-xs text-slate-500">{vendor.address}</p>}
                                {vendor.email && <p className="text-xs text-slate-400">{vendor.email}</p>}
                                {vendor.phone && <p className="text-xs text-slate-400">{vendor.phone}</p>}
                            </div>
                        </div>
                        <div className="space-y-3 text-right">
                            <h3 className="text-[10px] font-bold tracking-widest uppercase text-slate-400">SHIP TO:</h3>
                            <div className="space-y-1">
                                <p className="font-bold text-slate-900 text-sm">{shippingAddress}</p>
                                {invoice.projectId?.name && (
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                                        Project: {invoice.projectId.name}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Invoice Image / Uploaded File Section */}
                    {invoice.invoiceImage && (
                        <div className="mt-8 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Uploaded Invoice:</h3>
                                <a 
                                    href={getServerUrl(invoice.invoiceImage)} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    <FileText size={14} /> View Original
                                </a>
                            </div>
                            <div className="rounded-2xl border border-slate-100 overflow-hidden bg-slate-50 p-4 flex justify-center">
                                <img 
                                    src={getServerUrl(invoice.invoiceImage)} 
                                    alt="Invoice" 
                                    className="max-h-[600px] w-auto shadow-sm rounded-lg object-contain"
                                />
                            </div>
                        </div>
                    )}

                    {/* Line Items Table */}
                    <div className="mt-10 border border-slate-200 overflow-hidden rounded-lg">
                        <table className="w-full text-left">
                            <thead className="bg-slate-800 text-white">
                                <tr>
                                    <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-wider">ITEM DESCRIPTION</th>
                                    <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-wider text-center border-l border-slate-700 w-24">QTY</th>
                                    <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-wider text-center border-l border-slate-700 w-32">UNIT PRICE</th>
                                    <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-wider text-center border-l border-slate-700 w-32">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {invoice.items && invoice.items.length > 0 ? (
                                    invoice.items.map((item, idx) => (
                                        <tr key={idx} className="bg-white">
                                            <td className="py-4 px-4 font-bold text-slate-800 text-xs">
                                                {item.description || 'Item'}
                                            </td>
                                            <td className="py-4 px-4 text-center font-bold text-slate-800 text-xs border-l border-slate-200">
                                                {item.quantity}
                                            </td>
                                            <td className="py-4 px-4 text-center font-bold text-slate-800 text-xs border-l border-slate-200">
                                                ${(item.unitPrice || 0).toFixed(2)}
                                            </td>
                                            <td className="py-4 px-4 text-center font-bold text-slate-900 text-xs border-l border-slate-200">
                                                ${(item.total || ((item.quantity || 1) * (item.unitPrice || 0))).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr className="bg-white">
                                        <td className="py-4 px-4 font-bold text-slate-800 text-xs">Invoice Total</td>
                                        <td className="py-4 px-4 text-center font-bold text-slate-800 text-xs border-l border-slate-200">1</td>
                                        <td className="py-4 px-4 text-center font-bold text-slate-800 text-xs border-l border-slate-200">${(invoice.totalAmount || 0).toFixed(2)}</td>
                                        <td className="py-4 px-4 text-center font-bold text-slate-900 text-xs border-l border-slate-200">${(invoice.totalAmount || 0).toFixed(2)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end pt-6">
                        <div className="w-64 space-y-3">
                            <div className="flex justify-between text-[11px] font-medium text-slate-400">
                                <span>Subtotal</span>
                                <span className="text-slate-800 font-bold">${displaySubtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-slate-400">Estimated Tax ({displayTaxRate}%)</span>
                                <span className="font-bold text-amber-600">+${displayTax.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-slate-200 pt-4 mt-2 flex justify-between items-center">
                                <span className="font-bold text-slate-900 text-[13px] tracking-wide">GRAND TOTAL</span>
                                <span className="text-xl font-bold text-blue-600">${displayTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div className="mt-24 space-y-3">
                        <h3 className="text-[15px] font-bold text-slate-900">Notes</h3>
                        <p className="text-[8px] leading-relaxed text-slate-400 text-justify">
                            This accounting software is designed to assist users in managing financial data such as invoices, expenses, payments, reports, and tax-related records. All information and reports generated by the system depend on the data entered by the user, and users should verify details before final submission. The software may receive updates, improvements, or feature changes to enhance performance, accuracy, and security. Regular data backups are recommended to avoid potential data loss.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default InvoiceDetail;
