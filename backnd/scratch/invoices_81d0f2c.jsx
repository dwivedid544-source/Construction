import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Plus, Download, Search, Filter, DollarSign,
    Trash2, CreditCard, Send, MoreHorizontal, Save, Loader, Eye, Upload,
    CheckCircle, Clock, AlertTriangle, Edit, SlidersHorizontal
} from 'lucide-react';
import Modal from '../../components/Modal';
import api, { getServerUrl } from '../../utils/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../../assets/images/Logo.png';

const Invoices = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [projects, setProjects] = useState([]);
    const [clients, setClients] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [file, setFile] = useState(null);

    // Form State
    const [formData, setFormData] = useState({ 
        projectId: '', 
        clientId: '', 
        poId: '',
        dueDate: '', 
        invoiceNumber: '', 
        status: 'unpaid', 
        subtotal: '',
        tax: '',
        taxRate: 15,
        totalAmount: '',
        items: []
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [invRes, projRes, clientRes, poRes] = await Promise.all([
                api.get('/invoices'),
                api.get('/projects'),
                api.get('/auth/users?role=CLIENT'),
                api.get('/purchase-orders').catch(() => ({ data: [] }))
            ]);
            setInvoices(invRes.data || []);
            setProjects(projRes.data || []);
            setClients(clientRes.data || []);
            setPurchaseOrders(poRes.data || []);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            alert('Failed to load data: ' + (error.response?.data?.message || error.message) + '. Please try logging out and back in.');
        } finally {
            setLoading(false);
        }
    };

    const generateNextInvoiceNumber = (currentInvoices) => {
        const invList = currentInvoices || invoices;
        if (invList.length === 0) return 'INV-001';

        const numbers = invList
            .map(inv => {
                const numPart = inv.invoiceNumber?.split('-')[1];
                return numPart ? parseInt(numPart) : 0;
            })
            .filter(num => !isNaN(num));

        const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
        const nextNum = maxNum + 1;
        return `INV-${String(nextNum).padStart(3, '0')}`;
    };

    const handlePOSelect = (selectedPoId) => {
        if (!selectedPoId) {
            setFormData(prev => ({
                ...prev,
                poId: '',
                items: [],
                subtotal: '',
                tax: '',
                taxRate: 15,
                totalAmount: ''
            }));
            return;
        }

        const po = purchaseOrders.find(p => p._id === selectedPoId);
        if (!po) return;

        const associatedProjectId = po.projectId?._id || po.projectId || formData.projectId;
        const project = projects.find(p => p._id === associatedProjectId);
        const associatedClientId = project?.clientId?._id || project?.clientId || formData.clientId;

        const poItems = (po.items || []).map(item => ({
            description: item.itemName || item.description || 'Material Item',
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            total: Number(item.total) || ((Number(item.quantity) || 1) * (Number(item.unitPrice) || 0))
        }));

        const computedSubtotal = Number(po.subtotal) || poItems.reduce((acc, it) => acc + it.total, 0);
        let computedTax = Number(po.tax);
        if (isNaN(computedTax) || computedTax === 0) {
            if (po.totalAmount && po.totalAmount > computedSubtotal) {
                computedTax = Number((po.totalAmount - computedSubtotal).toFixed(2));
            } else {
                computedTax = Number((computedSubtotal * 0.15).toFixed(2));
            }
        }
        const computedTaxRate = computedSubtotal > 0 ? Number(((computedTax / computedSubtotal) * 100).toFixed(0)) : 15;
        const totalAmt = Number(po.totalAmount) || Number((computedSubtotal + computedTax).toFixed(2));

        setFormData(prev => ({
            ...prev,
            poId: po._id,
            projectId: associatedProjectId,
            clientId: associatedClientId,
            dueDate: po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toISOString().split('T')[0] : prev.dueDate,
            items: poItems,
            subtotal: computedSubtotal.toFixed(2),
            tax: computedTax.toFixed(2),
            taxRate: computedTaxRate,
            totalAmount: totalAmt.toFixed(2)
        }));
    };

    const openCreateModal = () => {
        setEditingInvoice(null);
        setFile(null);
        const nextNumber = generateNextInvoiceNumber();
        setFormData({ 
            projectId: '', 
            clientId: '', 
            poId: '',
            dueDate: '', 
            invoiceNumber: nextNumber, 
            status: 'unpaid', 
            subtotal: '',
            tax: '',
            taxRate: 15,
            totalAmount: '',
            items: []
        });
        setIsModalOpen(true);
    };

    const openEditModal = (inv) => {
        setEditingInvoice(inv);
        setFile(null);
        setFormData({
            projectId: inv.projectId?._id || inv.projectId || '',
            clientId: inv.clientId?._id || inv.clientId || '',
            poId: inv.poId?._id || inv.poId || '',
            dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
            invoiceNumber: inv.invoiceNumber,
            status: inv.status || 'unpaid',
            subtotal: inv.subtotal ? String(inv.subtotal) : '',
            tax: inv.tax ? String(inv.tax) : '',
            taxRate: inv.taxRate || 15,
            totalAmount: inv.totalAmount || '',
            items: inv.items || []
        });
        setIsModalOpen(true);
    };

    useEffect(() => {
        fetchData();
    }, [isModalOpen]);

    const handleSave = async () => {
        try {
            if (!formData.projectId || !formData.clientId) {
                alert('Please select both a Project and a Client.');
                return;
            }
            setIsSubmitting(true);

            if (file) {
                const uploadFormData = new FormData();
                uploadFormData.append('projectId', formData.projectId);
                uploadFormData.append('clientId', formData.clientId);
                if (formData.poId) uploadFormData.append('poId', formData.poId);
                if (formData.dueDate) uploadFormData.append('dueDate', formData.dueDate);
                uploadFormData.append('invoiceNumber', formData.invoiceNumber);
                uploadFormData.append('status', formData.status);
                uploadFormData.append('subtotal', Number(formData.subtotal) || 0);
                uploadFormData.append('tax', Number(formData.tax) || 0);
                uploadFormData.append('taxRate', Number(formData.taxRate) || 0);
                uploadFormData.append('totalAmount', Number(formData.totalAmount) || 0);
                uploadFormData.append('items', JSON.stringify(formData.items || []));
                uploadFormData.append('image', file);

                if (editingInvoice) {
                    await api.patch(`/invoices/${editingInvoice._id}`, uploadFormData);
                } else {
                    await api.post('/invoices', uploadFormData);
                }
            } else {
                const payload = {
                    projectId: formData.projectId,
                    clientId: formData.clientId,
                    poId: formData.poId || undefined,
                    dueDate: formData.dueDate,
                    invoiceNumber: formData.invoiceNumber,
                    status: formData.status,
                    subtotal: Number(formData.subtotal) || 0,
                    tax: Number(formData.tax) || 0,
                    taxRate: Number(formData.taxRate) || 0,
                    totalAmount: Number(formData.totalAmount) || 0,
                    items: formData.items || []
                };

                if (editingInvoice) {
                    await api.patch(`/invoices/${editingInvoice._id}`, payload);
                } else {
                    await api.post('/invoices', payload);
                }
            }

            await fetchData();
            setIsModalOpen(false);
            setEditingInvoice(null);
            setFile(null);
            setFormData({ 
                projectId: '', 
                clientId: '', 
                poId: '',
                dueDate: '', 
                invoiceNumber: '', 
                status: 'unpaid', 
                subtotal: '',
                tax: '',
                taxRate: 15,
                totalAmount: '',
                items: []
            });
        } catch (error) {
            console.error('Error saving invoice:', error);
            alert('Error saving invoice: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const getVendorDetails = (inv) => {
        if (!inv) return { name: 'Vendor', email: '', phone: '' };
        if (inv.poId) {
            const vName = inv.poId.vendorName || inv.poId.vendorId?.name || 'Vendor';
            const vEmail = inv.poId.vendorEmail || inv.poId.vendorId?.email || '';
            const vPhone = inv.poId.vendorId?.phone || '';
            return { name: vName, email: vEmail, phone: vPhone };
        }
        if (inv.clientId) {
            return {
                name: inv.clientId.fullName || 'Client',
                email: inv.clientId.email || '',
                phone: inv.clientId.phone || ''
            };
        }
        return { name: 'Vendor', email: '', phone: '' };
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
        const projectComp = (typeof inv?.projectId?.companyId === 'object' && inv?.projectId?.companyId !== null)
            ? inv.projectId.companyId
            : null;
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

    const handleDownloadPDF = (inv) => {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;

            const company = getCompanyDetails(inv);
            const vendor = getVendorDetails(inv);
            const shippingAddress = getShippingAddress(inv);

            // 1. Header Section
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
            doc.text(company.email || 'company@gmail.com', 20, 54);
            doc.text(company.phone || '1234567890', 20, 59);
            doc.text(company.address || 'Corporate Office Address', 20, 64);
            if (company.taxNumber) {
                doc.text(`Tax ID: ${company.taxNumber}`, 20, 69);
            }

            // Invoice Title & Info (Right)
            doc.setFontSize(28);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('INVOICE', pageWidth - 20, 25, { align: 'right' });

            doc.setFontSize(10);
            const statusColor = inv.status === 'paid' ? [16, 185, 129] : [239, 68, 68];
            doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
            doc.text(inv.status?.toUpperCase() || 'UNPAID', pageWidth - 20, 32, { align: 'right' });

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100);
            doc.text(`Number: #${inv.invoiceNumber}`, pageWidth - 20, 40, { align: 'right' });
            doc.text(`Issue: ${inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'N/A'}`, pageWidth - 20, 45, { align: 'right' });
            doc.text(`Due Date: ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}`, pageWidth - 20, 50, { align: 'right' });

            doc.setDrawColor(241, 245, 249);
            doc.line(20, 75, pageWidth - 20, 75);

            // 2. Billing Section
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(148, 163, 184);
            doc.text('VENDOR:', 20, 85);
            doc.text('SHIP TO:', pageWidth - 20, 85, { align: 'right' });

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(vendor.name, 20, 93);
            doc.text(shippingAddress, pageWidth - 20, 93, { align: 'right' });

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            if (vendor.email) doc.text(vendor.email, 20, 99);

            // 3. Table Section
            const tableColumn = ["ITEM DESCRIPTION", "QTY", "UNIT PRICE", "TOTAL"];
            let tableRows = [];
            if (inv.items && inv.items.length > 0) {
                tableRows = inv.items.map(item => [
                    { content: item.description || 'Item', styles: { fontStyle: 'bold' } },
                    item.quantity || 1,
                    `$${(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                    `$${(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                ]);
            } else {
                tableRows = [
                    [{ content: 'Invoice Amount', styles: { fontStyle: 'bold' } }, 1, `$${(inv.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, `$${(inv.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`]
                ];
            }

            autoTable(doc, {
                startY: 110,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                headStyles: {
                    fillColor: [30, 41, 59],
                    textColor: [255, 255, 255],
                    fontSize: 8,
                    fontStyle: 'bold',
                    halign: (index) => index > 0 ? 'center' : 'left'
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
                    lineColor: [226, 232, 240],
                    lineWidth: 0.1
                },
            });

            const hasItems = inv.items && inv.items.length > 0;
            const displaySubtotal = (inv.subtotal !== undefined && inv.subtotal !== null && inv.subtotal > 0) ? inv.subtotal : (inv.totalAmount || 0);
            const displayTax = (inv.tax !== undefined && inv.tax !== null) ? inv.tax : 0;
            const displayTotal = inv.totalAmount || (displaySubtotal + displayTax);

            // 4. Summary Section
            const finalY = doc.lastAutoTable.finalY + 15;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(148, 163, 184);
            doc.text('Subtotal', pageWidth - 85, finalY);
            doc.setTextColor(15, 23, 42);
            doc.text(`$${displaySubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY, { align: 'right' });

            doc.setTextColor(148, 163, 184);
            doc.text(`Estimated Tax (${inv.taxRate || 0}%)`, pageWidth - 85, finalY + 8);
            doc.setTextColor(15, 23, 42);
            doc.text(`$${displayTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY + 8, { align: 'right' });

            doc.setDrawColor(241, 245, 249);
            doc.line(pageWidth - 90, finalY + 14, pageWidth - 20, finalY + 14);

            doc.setFontSize(12);
            doc.setTextColor(15, 23, 42);
            doc.text('GRAND TOTAL', pageWidth - 85, finalY + 25);
            doc.setFontSize(16);
            doc.setTextColor(37, 99, 235);
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

            doc.save(`Invoice_${inv.invoiceNumber}.pdf`);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Failed to generate PDF. Please check the console for details.');
        }
    };

    const handleDelete = (inv) => {
        setInvoiceToDelete(inv);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!invoiceToDelete) return;
        try {
            setIsSubmitting(true);
            await api.delete(`/invoices/${invoiceToDelete._id}`);
            setInvoices(invoices.filter(inv => inv._id !== invoiceToDelete._id));
            setIsDeleteModalOpen(false);
            setInvoiceToDelete(null);
        } catch (error) {
            console.error('Error deleting invoice:', error);
            alert('Failed to delete invoice');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Derived Stats
    const stats = {
        total: invoices.length,
        paid: invoices.filter(i => i.status === 'paid').length,
        unpaid: invoices.filter(i => ['unpaid', 'partially_paid'].includes(i.status)).length,
        overdue: invoices.filter(i => i.status === 'overdue').length
    };

    const formatStatus = (status) => {
        if (!status) return '---';
        return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Invoices <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full ml-2">Digital Tracking</span></h1>
                    <p className="text-slate-500 text-sm">Create and manage client invoices.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/company-admin/settings?tab=invoice')}
                        className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition shadow-sm font-semibold text-sm"
                    >
                        <SlidersHorizontal size={16} className="text-blue-600" />
                        Invoice Template Settings
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 font-semibold text-sm"
                    >
                        <Plus size={18} /> Create Invoice
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <FileText size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Total Invoice</p>
                        <p className="text-2xl font-black text-slate-800 leading-none">{stats.total}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <CheckCircle size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Total Paid</p>
                        <p className="text-2xl font-black text-slate-800 leading-none">{stats.paid}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Unpaid</p>
                        <p className="text-2xl font-black text-slate-800 leading-none">{stats.unpaid}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Overdue</p>
                        <p className="text-2xl font-black text-slate-800 leading-none">{stats.overdue}</p>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search invoice #"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>
                <div className="flex gap-2">
                    <button className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-2 text-sm">
                        <Filter size={18} /> Filter
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Invoice #</th>
                                <th className="px-6 py-4">Project</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Due Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoices.filter(i => i.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || i.projectId?.name?.toLowerCase().includes(searchTerm.toLowerCase())).map((inv) => (
                                <tr
                                    key={inv._id}
                                    className="hover:bg-slate-50 transition cursor-pointer group"
                                    onClick={() => inv.invoiceImage && window.open(getServerUrl(inv.invoiceImage), '_blank')}
                                >
                                    <td className="px-6 py-4 font-bold text-slate-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{inv.invoiceNumber}</td>
                                    <td className="px-6 py-4">{inv.projectId?.name || '---'}</td>
                                    <td className="px-6 py-4">{inv.clientId?.fullName || '---'}</td>
                                    <td className="px-6 py-4">{new Date(inv.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '---'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold 
                            ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                                    ['unpaid', 'partially_paid'].includes(inv.status) ? 'bg-orange-100 text-orange-700' :
                                                        'bg-slate-100 text-slate-600'}`}>
                                            {formatStatus(inv.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/company-admin/invoices/${inv._id}`);
                                            }}
                                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                            title="View Invoice"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openEditModal(inv);
                                            }}
                                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                            title="Edit Invoice"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownloadPDF(inv);
                                            }}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            title="Download PDF"
                                        >
                                            <Download size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(inv)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingInvoice(null); }} title={editingInvoice ? "Edit Invoice" : "Create New Invoice"}>
                <div className="space-y-6">
                    {/* Purchase Order Selector (Autofills details) */}
                    <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                            <span>Select Purchase Order</span>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Auto-fetches details</span>
                        </label>
                        <select
                            value={formData.poId}
                            onChange={e => handlePOSelect(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                        >
                            <option value="">-- Optional: Select Purchase Order to autofill --</option>
                            {purchaseOrders.map(po => (
                                <option key={po._id} value={po._id}>
                                    {po.poNumber} — {po.vendorName || 'Vendor'} (${Number(po.totalAmount || 0).toLocaleString()}) {po.projectId?.name ? `[${po.projectId.name}]` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                            <select
                                required
                                value={formData.projectId}
                                onChange={e => {
                                    const selectedProjectId = e.target.value;
                                    const project = projects.find(p => p._id === selectedProjectId);
                                    const associatedClientId = project?.clientId?._id || project?.clientId || '';
                                    setFormData(prev => ({
                                        ...prev,
                                        projectId: selectedProjectId,
                                        clientId: associatedClientId
                                    }));
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                            >
                                <option value="">Select Project</option>
                                {projects.map(p => (
                                    <option key={p._id} value={p._id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
                            <select
                                required
                                value={formData.clientId}
                                onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                            >
                                <option value="">Select Client</option>
                                {clients.map(c => (
                                    <option key={c._id} value={c._id}>{c.fullName}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Number</label>
                            <input
                                type="text"
                                required
                                readOnly
                                value={formData.invoiceNumber}
                                className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 outline-none text-slate-500 cursor-not-allowed font-mono font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                            <input
                                type="date"
                                required
                                value={formData.dueDate}
                                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                        >
                            <option value="unpaid">Unpaid</option>
                            <option value="partially_paid">Partially Paid</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>

                    {/* Optional File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Document / Image (Optional)</label>
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={e => setFile(e.target.files[0])}
                                className="hidden"
                                id="invoice-upload-modal"
                            />
                            <label
                                htmlFor="invoice-upload-modal"
                                className="flex items-center justify-center gap-3 w-full bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 cursor-pointer hover:bg-slate-100 transition text-slate-500 text-sm group"
                            >
                                <div className="p-2 bg-white rounded-full shadow-sm group-hover:scale-110 transition duration-300">
                                    <Upload size={18} className="text-blue-600" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="font-bold text-slate-700">{file ? file.name : 'Select or replace document'}</span>
                                    <span className="text-xs text-slate-400">PDF or Image up to 10MB</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Financial Summary & Breakdown */}
                    <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                Subtotal ($)
                            </label>
                            <input
                                type="number"
                                step="any"
                                value={formData.subtotal}
                                onChange={e => {
                                    const sub = Number(e.target.value) || 0;
                                    const tx = Number(formData.tax) || 0;
                                    setFormData(prev => ({
                                        ...prev,
                                        subtotal: e.target.value,
                                        totalAmount: (sub + tx).toFixed(2)
                                    }));
                                }}
                                placeholder="0.00"
                                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                                <span>Tax ($)</span>
                                {formData.taxRate > 0 && <span className="text-[10px] text-amber-600 font-bold">({formData.taxRate}%)</span>}
                            </label>
                            <input
                                type="number"
                                step="any"
                                value={formData.tax}
                                onChange={e => {
                                    const tx = Number(e.target.value) || 0;
                                    const sub = Number(formData.subtotal) || 0;
                                    setFormData(prev => ({
                                        ...prev,
                                        tax: e.target.value,
                                        totalAmount: (sub + tx).toFixed(2)
                                    }));
                                }}
                                placeholder="0.00"
                                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                Total Amount ($)
                            </label>
                            <input
                                type="number"
                                step="any"
                                value={formData.totalAmount}
                                onChange={e => setFormData({ ...formData, totalAmount: e.target.value })}
                                placeholder="0.00"
                                className="w-full bg-blue-50/70 border border-blue-200 rounded-xl p-2.5 text-sm font-black text-blue-700 outline-none focus:border-blue-500 shadow-sm"
                            />
                        </div>
                    </div>

                    {/* PO Line Items Summary Preview if PO is selected */}
                    {formData.items && formData.items.length > 0 && (
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                                    Fetched PO Items ({formData.items.length})
                                </span>
                                <span className="text-xs font-black text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                                    {purchaseOrders.find(p => p._id === formData.poId)?.poNumber || 'PO Details'}
                                </span>
                            </div>
                            <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 uppercase text-[9px] tracking-wider">
                                        <tr>
                                            <th className="p-2.5">Description</th>
                                            <th className="p-2.5 text-center">Qty</th>
                                            <th className="p-2.5 text-right">Price</th>
                                            <th className="p-2.5 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {formData.items.map((it, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2.5 font-medium">{it.description}</td>
                                                <td className="p-2.5 text-center font-bold text-slate-600">{it.quantity}</td>
                                                <td className="p-2.5 text-right">${Number(it.unitPrice || 0).toFixed(2)}</td>
                                                <td className="p-2.5 text-right font-bold text-slate-900">${Number(it.total || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Tax & Total Summary Breakdown Card */}
                            <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs font-semibold">
                                <div className="flex justify-between text-slate-500">
                                    <span>Items Subtotal:</span>
                                    <span>${Number(formData.subtotal || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-500">
                                    <span className="flex items-center gap-1.5">
                                        <span>Tax ({formData.taxRate || 15}%):</span>
                                    </span>
                                    <span className="text-amber-600 font-bold">+${Number(formData.tax || 0).toFixed(2)}</span>
                                </div>
                                <div className="border-t border-slate-100 pt-1.5 flex justify-between items-center">
                                    <span className="font-black text-slate-900 uppercase text-[10px] tracking-wider">Grand Total:</span>
                                    <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">
                                        ${Number(formData.totalAmount || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button
                            onClick={handleSave}
                            disabled={isSubmitting}
                            className="bg-blue-600 text-white px-8 py-2.5 rounded-xl hover:bg-blue-700 font-bold transition flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-200"
                        >
                            {isSubmitting ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
                            {isSubmitting ? 'Saving...' : (editingInvoice ? 'Update Invoice' : 'Generate Invoice')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Invoice">
                <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-red-50 rounded-[28px] flex items-center justify-center text-red-500 mx-auto border border-red-100 shadow-sm transform -rotate-6 transition-transform hover:rotate-0 duration-500">
                        <Trash2 size={40} />
                    </div>

                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Delete Invoice?</h3>
                        <p className="text-slate-500 font-bold text-sm mt-2 leading-relaxed px-4">
                            Are you sure you want to delete <span className="text-red-600 font-black underline italic">"{invoiceToDelete?.invoiceNumber}"</span>?<br />
                            This data will be removed permanently.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2 font-black uppercase tracking-widest text-[10px]">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl transition active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={isSubmitting}
                            className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition shadow-lg shadow-red-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader size={16} className="animate-spin" /> : "Confirm Delete"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Invoices;
