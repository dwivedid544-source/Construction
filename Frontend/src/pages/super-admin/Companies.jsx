import { useState, useEffect } from 'react';
import {
  Search, Shield, Plus, Trash2, Edit, Eye, AlertTriangle, Briefcase,
  Calendar, DollarSign, Users, CheckCircle, XCircle, FileText,
  TrendingUp, TrendingDown, Download, Check
} from 'lucide-react';
import api from '../../utils/api';
import Modal from '../../components/Modal';

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentTab, setPaymentTab] = useState('All'); // 'All', 'Success', 'Pending', 'Failed'

  // Item states
  const [editingId, setEditingId] = useState(null);
  const [viewingCompany, setViewingCompany] = useState(null);
  const [invoiceCompany, setInvoiceCompany] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [suspendingId, setSuspendingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    startDate: '',
    expireDate: '',
    plan: '',
    planType: 'Monthly',
    password: '',
    confirmPassword: '',
    users: 1,
    status: 'Active',
    revenue: 0,
    storage: '0 GB',
    projects: 0
  });

  useEffect(() => {
    fetchCompanies();
    fetchPlans();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies');
      const rawList = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      const mappedData = rawList.map((comp, index) => {
        const dateObj = comp.createdAt ? new Date(comp.createdAt) : new Date();
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const dateCompact = dateObj.toISOString().slice(0, 10).replace(/-/g, '');

        const displayCompId = String(index + 1).padStart(3, '0');
        const payId = comp.paymentId || comp.orderId || `PAY-${dateCompact}-${String(index + 1).padStart(4, '0')}`;

        let planPrice = 0;
        let planName = 'Starter 1';
        if (typeof comp.subscriptionPlanId === 'object' && comp.subscriptionPlanId) {
          planName = comp.subscriptionPlanId.name || 'Starter 1';
          planPrice = comp.subscriptionPlanId.price || 1;
        } else if (comp.subscriptionPlan) {
          planName = comp.subscriptionPlan.name || 'Starter 1';
          planPrice = comp.subscriptionPlan.price || 1;
        } else {
          planPrice = comp.price || 1;
        }

        const methodStr = comp.paymentMethod || (planPrice > 0 ? 'Razorpay' : 'Free Trial');

        let statusNormalized = 'Success';
        const st = String(comp.subscriptionStatus || comp.status || 'active').toLowerCase();
        if (st === 'pending') {
          statusNormalized = 'Pending';
        } else if (st === 'past_due' || st === 'canceled' || st === 'suspended' || st === 'failed') {
          statusNormalized = 'Failed';
        } else {
          statusNormalized = 'Success';
        }

        return {
          ...comp,
          id: comp.id || comp._id,
          displayId: displayCompId,
          payId: payId,
          formattedDate: formattedDate,
          customerName: comp.name || 'Unknown Company',
          method: methodStr,
          numericAmount: planPrice,
          amountDisplay: `₹${planPrice.toFixed(0)}`,
          paymentStatus: statusNormalized,
          planName: planName
        };
      });

      setCompanies(mappedData);
    } catch (error) {
      console.error("Error fetching companies", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await api.get('/plans');
      setPlans(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching plans", error);
    }
  };

  // Checkbox Selection Logic
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredCompanies.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Filtered List
  const filteredCompanies = companies.filter(c => {
    const matchesSearch =
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.payId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab = paymentTab === 'All' || c.paymentStatus === paymentTab;

    return matchesSearch && matchesTab;
  });

  // Analytics KPI Calculations
  const totalRevenue = companies
    .filter(c => c.paymentStatus === 'Success')
    .reduce((acc, c) => acc + (c.numericAmount || 1), 0);

  const successCount = companies.filter(c => c.paymentStatus === 'Success').length;
  const totalCount = companies.length || 1;
  const successRate = ((successCount / totalCount) * 100).toFixed(1);
  const failedCount = companies.filter(c => c.paymentStatus === 'Failed').length;

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      startDate: '',
      expireDate: '',
      plan: plans.length > 0 ? (plans[0]._id || plans[0].id) : '',
      planType: 'Monthly',
      password: '',
      confirmPassword: '',
      users: 1,
      status: 'Active',
      revenue: 0,
      storage: '0 GB',
      projects: 0
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (!editingId && formData.password !== formData.confirmPassword) {
        alert("Passwords do not match!");
        return;
      }

      const dataToSend = { ...formData };
      if (editingId && !dataToSend.password) {
        delete dataToSend.password;
        delete dataToSend.confirmPassword;
      }

      if (editingId) {
        await api.patch(`/companies/${editingId}`, dataToSend);
      } else {
        await api.post('/companies', formData);
      }
      fetchCompanies();
      closeModal();
    } catch (error) {
      console.error("Error saving company", error);
      alert(error.response?.data?.message || "Error saving company");
    }
  };

  const handleEdit = (company) => {
    setEditingId(company._id || company.id);
    setFormData({
      ...company,
      startDate: company.startDate ? new Date(company.startDate).toISOString().split('T')[0] : '',
      expireDate: company.expireDate ? new Date(company.expireDate).toISOString().split('T')[0] : '',
      plan: company.subscriptionPlanId || '',
      password: '',
      confirmPassword: ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const handleSuspendClick = (id) => {
    setSuspendingId(id);
    setIsSuspendModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/companies/${deletingId}`);
      fetchCompanies();
      setIsDeleteModalOpen(false);
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting company", error);
      alert("Error deleting company");
    }
  };

  const confirmSuspend = () => {
    setCompanies(companies.map(c => (c.id === suspendingId) ? { ...c, subscriptionStatus: 'suspended', paymentStatus: 'Failed' } : c));
    setIsSuspendModalOpen(false);
    setSuspendingId(null);
  };

  const handleView = (company) => {
    setViewingCompany(company);
    setIsViewModalOpen(true);
  };

  const handleInvoiceClick = (company) => {
    setInvoiceCompany(company);
    setIsInvoiceModalOpen(true);
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      startDate: new Date().toISOString().split('T')[0],
      expireDate: '',
      plan: plans.length > 0 ? (plans[0]._id || plans[0].id) : '',
      planType: 'Monthly',
      password: '',
      confirmPassword: '',
      users: 1,
      status: 'Active',
      revenue: 0,
      storage: '0 GB',
      projects: 0
    });
    setIsModalOpen(true);
  };

  const printInvoice = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans bg-[#FAF8F5] p-6 rounded-3xl min-h-screen">

      {/* Top Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Payments & Companies</h1>
          <p className="text-slate-500 font-semibold text-xs mt-1">Manage all your payment transactions & registered companies</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => alert('Exporting payment records to CSV...')}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition active:scale-95"
          >
            <Download size={15} /> Export
          </button>
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition active:scale-95"
          >
            <Plus size={16} /> Add New Company
          </button>
        </div>
      </div>

      {/* Top 3 KPI Summary Cards (Matching Screenshot 2) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Card 1: Total Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-slate-500 text-xs font-bold tracking-wide">Total Revenue</p>
            <h2 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">₹{totalRevenue.toFixed(2)}</h2>
            <p className="text-emerald-600 text-xs font-semibold mt-2 flex items-center gap-1">
              <TrendingUp size={14} /> ↑ from last month
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 shadow-xs">
            <DollarSign size={22} />
          </div>
        </div>

        {/* Card 2: Success Rate */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-slate-500 text-xs font-bold tracking-wide">Success Rate</p>
            <h2 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">{successRate}%</h2>
            <p className="text-emerald-600 text-xs font-semibold mt-2 flex items-center gap-1">
              <TrendingUp size={14} /> ↑ from last month
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
            <CheckCircle size={22} />
          </div>
        </div>

        {/* Card 3: Failed Transactions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-slate-500 text-xs font-bold tracking-wide">Failed Transactions</p>
            <h2 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">{failedCount}</h2>
            <p className="text-slate-400 text-xs font-semibold mt-2 flex items-center gap-1">
              <TrendingDown size={14} /> ↓ from last month
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-xs">
            <AlertTriangle size={22} />
          </div>
        </div>

      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden min-h-[500px]">

        {/* Payment Filter Tabs (Matching Screenshot 2 Terracotta Buttons) */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-2 bg-slate-50/50">
          <button
            onClick={() => setPaymentTab('All')}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition ${paymentTab === 'All'
                ? 'bg-[#ea580c] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            All Payments
          </button>
          <button
            onClick={() => setPaymentTab('Success')}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition ${paymentTab === 'Success'
                ? 'bg-[#ea580c] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            Success
          </button>
          <button
            onClick={() => setPaymentTab('Pending')}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition ${paymentTab === 'Pending'
                ? 'bg-[#ea580c] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            Pending
          </button>
          <button
            onClick={() => setPaymentTab('Failed')}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition ${paymentTab === 'Failed'
                ? 'bg-[#ea580c] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            Failed
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by transaction ID or customer name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-semibold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
        </div>

        {/* Payments Table (Matching Screenshot 2 Layout) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF6F0] border-b border-slate-200/80">
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={filteredCompanies.length > 0 && selectedIds.length === filteredCompanies.length}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-4 text-xs font-black text-slate-700 uppercase tracking-wider">ID</th>
                <th className="p-4 text-xs font-black text-slate-700 uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-black text-slate-700 uppercase tracking-wider">Customer</th>
                <th className="p-4 text-xs font-black text-slate-700 uppercase tracking-wider">Method</th>
                <th className="p-4 text-xs font-black text-slate-700 uppercase tracking-wider">Amount</th>
                <th className="p-4 text-xs font-black text-slate-700 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-black text-slate-700 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500 font-semibold">Loading payment transactions...</td>
                </tr>
              ) : filteredCompanies.length > 0 ? (
                filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(company.id)}
                        onChange={() => handleSelectOne(company.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 font-bold text-slate-800 whitespace-nowrap">
                      {company.payId}
                    </td>
                    <td className="p-4 text-slate-600 font-semibold whitespace-nowrap">
                      {company.formattedDate}
                    </td>
                    <td className="p-4 font-black text-slate-900 whitespace-nowrap">
                      {company.customerName}
                    </td>
                    <td className="p-4 text-slate-600 font-medium whitespace-nowrap">
                      {company.method}
                    </td>
                    <td className="p-4 font-black text-slate-900 whitespace-nowrap">
                      {company.amountDisplay}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${company.paymentStatus === 'Success'
                          ? 'bg-emerald-100 text-emerald-700'
                          : company.paymentStatus === 'Pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                        {company.paymentStatus}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">

                        {/* 📄 PDF / Invoice Action Button */}
                        <button
                          onClick={() => handleInvoiceClick(company)}
                          className="p-1.5 rounded-lg border border-red-200 bg-red-50/40 hover:bg-red-100 text-red-600 transition shadow-2xs"
                          title="Download Invoice / PDF"
                        >
                          <FileText size={15} />
                        </button>

                        {/* 👁️ View Company Details Button */}
                        <button
                          onClick={() => handleView(company)}
                          className="p-1.5 rounded-lg border border-blue-200 bg-blue-50/40 hover:bg-blue-100 text-blue-600 transition shadow-2xs"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>

                        {/* ✏️ Edit Company Button */}
                        <button
                          onClick={() => handleEdit(company)}
                          className="p-1.5 rounded-lg border border-cyan-200 bg-cyan-50/40 hover:bg-cyan-100 text-cyan-700 transition shadow-2xs"
                          title="Edit Company"
                        >
                          <Edit size={15} />
                        </button>

                        {/* 🗑️ Delete Button */}
                        <button
                          onClick={() => handleDeleteClick(company.id)}
                          className="p-1.5 rounded-lg border border-red-200 bg-red-50/40 hover:bg-red-100 text-red-600 transition shadow-2xs"
                          title="Delete Company"
                        >
                          <Trash2 size={15} />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400 font-semibold">
                    No payment records or companies found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Invoice PDF Modal */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Payment Invoice & Receipt"
      >
        {invoiceCompany && (
          <div className="space-y-6 font-sans p-2">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  🏗️ KT Construct
                </h2>
                <p className="text-xs text-slate-500 mt-1">Kiaan Technology Pvt Ltd</p>
              </div>
              <div className="text-right">
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                  {invoiceCompany.paymentStatus?.toUpperCase() || 'PAID'}
                </span>
                <p className="text-xs font-mono font-bold text-slate-700 mt-2">{invoiceCompany.payId}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-bold uppercase text-[10px]">Customer / Company</p>
                <p className="font-black text-slate-900 text-sm mt-1">{invoiceCompany.customerName}</p>
                <p className="text-slate-600 mt-0.5">{invoiceCompany.email || 'N/A'}</p>
                <p className="text-slate-600">{invoiceCompany.phone || 'N/A'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-bold uppercase text-[10px]">Payment Details</p>
                <p className="font-semibold text-slate-800 mt-1"><strong>Date:</strong> {invoiceCompany.formattedDate}</p>
                <p className="font-semibold text-slate-800"><strong>Method:</strong> {invoiceCompany.method}</p>
                <p className="font-semibold text-slate-800"><strong>Plan:</strong> {invoiceCompany.planName}</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">
                      KT Construct SaaS Subscription ({invoiceCompany.planName})
                    </td>
                    <td className="p-3 text-right font-black text-slate-900">
                      {invoiceCompany.amountDisplay}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
              <span className="font-bold text-slate-800 text-sm">Total Paid Amount:</span>
              <span className="text-xl font-black text-emerald-700">{invoiceCompany.amountDisplay}</span>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={printInvoice}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition active:scale-95"
              >
                <Download size={14} /> Print / Download PDF
              </button>
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Company Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Company" : "Add New Company"}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-slate-700 mb-1 font-bold">Company Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
              placeholder="e.g. Acme Construction"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 mb-1 font-bold">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
                placeholder="Enter Email"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1 font-bold">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
                placeholder="Enter Phone Number"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 mb-1 font-bold">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
              placeholder="Enter Address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 mb-1 font-bold">Start Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1 font-bold">Expire Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                value={formData.expireDate}
                onChange={(e) => setFormData({ ...formData, expireDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 mb-1 font-bold">Plan Type <span className="text-red-500">*</span></label>
              <select
                value={formData.planType}
                onChange={(e) => setFormData({ ...formData, planType: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:border-blue-500 outline-none transition cursor-pointer"
              >
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 mb-1 font-bold">Plan <span className="text-red-500">*</span></label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:border-blue-500 outline-none transition cursor-pointer"
              >
                <option value="" disabled>Select Plan</option>
                {plans.map((plan) => (
                  <option key={plan._id || plan.id} value={plan._id || plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 mb-1 font-bold">Password {editingId ? <span className="text-[10px] text-slate-400 font-normal">(Leave blank to keep)</span> : <span className="text-red-500">*</span>}</label>
              <input
                type="password"
                required={!editingId}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
                placeholder="Enter password"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1 font-bold">Confirm Password {editingId ? '' : <span className="text-red-500">*</span>}</label>
              <input
                type="password"
                required={!editingId}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
                placeholder="Confirm password"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
            <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-bold">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition font-bold">Save Company</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Company?</h3>
          <p className="text-slate-500 text-xs mb-6">
            Are you sure you want to delete this company? This action cannot be undone.
          </p>
          <div className="flex gap-3 w-full text-xs">
            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-bold">Cancel</button>
            <button onClick={confirmDelete} className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition font-bold">Delete Forever</button>
          </div>
        </div>
      </Modal>

      {/* Suspend Confirmation Modal */}
      <Modal isOpen={isSuspendModalOpen} onClose={() => setIsSuspendModalOpen(false)} title="Suspend Access">
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 text-orange-600">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Suspend Company?</h3>
          <p className="text-slate-500 text-xs mb-6">
            Are you sure you want to suspend access for this company?
          </p>
          <div className="flex gap-3 w-full text-xs">
            <button onClick={() => setIsSuspendModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-bold">Cancel</button>
            <button onClick={confirmSuspend} className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition font-bold">Suspend Access</button>
          </div>
        </div>
      </Modal>

      {/* View Company Details Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Company Details">
        {viewingCompany && (
          <div className="space-y-6 text-xs">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-xl font-black text-blue-600 border border-slate-100 shadow-xs">
                {viewingCompany.customerName.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">{viewingCompany.customerName}</h3>
                <p className="text-slate-400 text-[10px] font-mono mt-0.5">ID: {viewingCompany.payId}</p>
              </div>
              <div className="ml-auto">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${viewingCompany.paymentStatus === 'Success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                  {viewingCompany.paymentStatus}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-bold uppercase text-[10px]">Contact Info</p>
                <p className="font-semibold text-slate-800 mt-1"><strong>Email:</strong> {viewingCompany.email || 'N/A'}</p>
                <p className="font-semibold text-slate-800"><strong>Phone:</strong> {viewingCompany.phone || 'N/A'}</p>
                <p className="font-semibold text-slate-800"><strong>Address:</strong> {viewingCompany.address || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-bold uppercase text-[10px]">Subscription Details</p>
                <p className="font-semibold text-slate-800 mt-1"><strong>Plan:</strong> {viewingCompany.planName}</p>
                <p className="font-semibold text-slate-800"><strong>Amount:</strong> {viewingCompany.amountDisplay}</p>
                <p className="font-semibold text-slate-800"><strong>Payment Method:</strong> {viewingCompany.method}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => { setIsViewModalOpen(false); handleSuspendClick(viewingCompany.id); }}
                className="px-4 py-2 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl font-bold transition"
              >
                Suspend Company
              </button>
              <button onClick={() => setIsViewModalOpen(false)} className="px-5 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition">Close</button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default Companies;
