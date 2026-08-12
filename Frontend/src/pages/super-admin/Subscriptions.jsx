import { 
  CheckCircle, XCircle, AlertTriangle, CreditCard, Plus, Loader, 
  Users, Briefcase, Eye, Edit, Trash2, Shield, Zap, Package, Sparkles 
} from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../../components/Modal';

const Subscriptions = () => {
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState({
    active: 0,
    pending: 0,
    canceled: 0,
    past_due: 0
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [failures, setFailures] = useState([]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Active Items
  const [editingPlan, setEditingPlan] = useState(null);
  const [viewingPlan, setViewingPlan] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    period: 'month',
    features: [],
    maxUsers: 10,
    maxProjects: 5,
    isPopular: false
  });

  const [featureInput, setFeatureInput] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, companiesRes, failuresRes] = await Promise.all([
        api.get('/plans'),
        api.get('/companies'),
        api.get('/super-admin/billing/transactions?status=failed').catch(() => ({ data: [] }))
      ]);

      const plansList = Array.isArray(plansRes.data) ? plansRes.data : [];
      setPlans(plansList);
      setFailures(Array.isArray(failuresRes.data) ? failuresRes.data : []);

      // Calculate stats from companies
      const companies = Array.isArray(companiesRes.data) ? companiesRes.data : [];
      const newStats = {
        active: companies.filter(c => c.subscriptionStatus === 'active' || c.status === 'Active').length,
        pending: companies.filter(c => c.subscriptionStatus === 'pending' || c.status === 'Pending').length,
        canceled: companies.filter(c => c.subscriptionStatus === 'canceled' || c.status === 'Canceled').length,
        past_due: companies.filter(c => c.subscriptionStatus === 'past_due' || c.status === 'Past Due').length,
      };
      setStats(newStats);

    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      price: '',
      period: 'month',
      features: [],
      maxUsers: 10,
      maxProjects: 5,
      isPopular: false
    });
    setFeatureInput('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name || '',
      price: plan.price !== undefined ? plan.price : '',
      period: plan.period || 'month',
      features: Array.isArray(plan.features) ? plan.features : [],
      maxUsers: plan.maxUsers || 10,
      maxProjects: plan.maxProjects || 5,
      isPopular: Boolean(plan.isPopular)
    });
    setFeatureInput('');
    setIsModalOpen(true);
  };

  const handleOpenViewModal = (plan) => {
    setViewingPlan(plan);
    setIsViewModalOpen(true);
  };

  const handleOpenDeleteModal = (id) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, featureInput.trim()]
      });
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (index) => {
    const updatedFeatures = [...formData.features];
    updatedFeatures.splice(index, 1);
    setFormData({ ...formData, features: updatedFeatures });
  };

  const handleSubmitPlan = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const planPayload = {
        name: formData.name,
        price: parseFloat(formData.price) || 0,
        period: formData.period,
        features: formData.features,
        maxUsers: parseInt(formData.maxUsers) || 10,
        maxProjects: parseInt(formData.maxProjects) || 5,
        isPopular: Boolean(formData.isPopular)
      };

      const targetId = editingPlan ? (editingPlan._id || editingPlan.id) : null;

      if (targetId) {
        await api.patch(`/plans/${targetId}`, planPayload);
      } else {
        await api.post('/plans', planPayload);
      }

      fetchData();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving plan:', error);
      alert(error.response?.data?.message || 'Error saving subscription plan');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDeletePlan = async () => {
    if (!deletingId) return;
    setActionLoading(true);
    try {
      await api.delete(`/plans/${deletingId}`);
      fetchData();
      setIsDeleteModalOpen(false);
      setDeletingId(null);
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert(error.response?.data?.message || 'Error deleting subscription plan');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 font-sans">
      
      {/* Top Title Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Subscriptions Management</h1>
          <p className="text-slate-500 text-xs font-semibold mt-1">Manage pricing plans, plan features, limits, and billing issues.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition active:scale-95"
        >
          <Plus size={16} /> Create New Plan
        </button>
      </div>

      {/* Subscription Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <CheckCircle className="text-emerald-600" size={22} />
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active</span>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{stats.active}</p>
          <p className="text-xs text-slate-500 font-bold mt-1">Monthly Subscribers</p>
        </div>
        
        <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <AlertTriangle className="text-amber-600" size={22} />
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Pending</span>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{stats.pending}</p>
          <p className="text-xs text-slate-500 font-bold mt-1">Needs Approval</p>
        </div>

        <div className="bg-orange-50 border border-orange-100 p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <XCircle className="text-orange-600" size={22} />
            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Past Due</span>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{stats.past_due}</p>
          <p className="text-xs text-slate-500 font-bold mt-1">Payment Issues</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <Briefcase className="text-slate-600" size={22} />
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Total</span>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{stats.active + stats.pending + stats.canceled + stats.past_due}</p>
          <p className="text-xs text-slate-500 font-bold mt-1">All Registered Companies</p>
        </div>
      </div>

      {/* Pricing Plans Section Header */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pricing Plans & Features</h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">Manage plans live on landing page & enforce system limits</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-xs"
        >
          <Plus size={15} /> Add Plan
        </button>
      </div>

      {/* Plans Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan, index) => (
          <div 
            key={plan._id || plan.id || index} 
            className={`bg-white p-6 rounded-2xl border-2 transition-all flex flex-col justify-between h-full relative group hover:shadow-lg ${
              plan.isPopular ? 'border-blue-500 shadow-blue-500/10' : 'border-slate-200/80 shadow-sm'
            }`}
          >
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                Most Popular
              </div>
            )}

            <div>
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{plan.name}</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {plan._id || plan.id}</p>
                </div>
                <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-xs font-black">
                  ₹{plan.price}/{plan.period || 'month'}
                </span>
              </div>

              {/* Limits Badge Summary */}
              <div className="flex gap-2 my-4">
                <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1">
                  <Zap size={13} className="text-blue-500" /> {plan.maxUsers || 10} Users Max
                </span>
                <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1">
                  <Shield size={13} className="text-emerald-500" /> {plan.maxProjects || 5} Projects Max
                </span>
              </div>

              {/* Features Bullet Points */}
              <ul className="space-y-2.5 mb-6">
                {Array.isArray(plan.features) && plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                    <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons Bar (View, Edit, Delete) */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                {plan.period === '7 Days' ? 'Trial' : 'Subscription'}
              </span>

              <div className="flex items-center gap-2">
                {/* 👁️ View Button */}
                <button
                  onClick={() => handleOpenViewModal(plan)}
                  className="p-2 rounded-xl border border-blue-200 bg-blue-50/60 text-blue-600 hover:bg-blue-100 transition shadow-2xs"
                  title="View Plan Details"
                >
                  <Eye size={16} />
                </button>

                {/* ✏️ Edit Button */}
                <button
                  onClick={() => handleOpenEditModal(plan)}
                  className="p-2 rounded-xl border border-cyan-200 bg-cyan-50/60 text-cyan-700 hover:bg-cyan-100 transition shadow-2xs"
                  title="Edit Plan"
                >
                  <Edit size={16} />
                </button>

                {/* 🗑️ Delete Button */}
                <button
                  onClick={() => handleOpenDeleteModal(plan._id || plan.id)}
                  className="p-2 rounded-xl border border-red-200 bg-red-50/60 text-red-600 hover:bg-red-100 transition shadow-2xs"
                  title="Delete Plan"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

          </div>
        ))}

        {plans.length === 0 && (
          <div className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
            <Package size={48} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No Pricing Plans Found</h3>
            <p className="text-xs text-slate-500 mt-1">Create subscription plans to display on the landing page.</p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition"
            >
              Create Plan
            </button>
          </div>
        )}
      </div>

      {/* Payment Failures Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mt-8">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-black text-slate-900 flex items-center gap-2 text-base">
              <AlertTriangle className="text-red-500" size={18} /> Payment Failures (Last 30 Days)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Failed charges requiring administrator attention.</p>
          </div>
          <button className="text-xs text-blue-600 hover:text-blue-700 font-bold px-3 py-1.5 hover:bg-blue-50 rounded-lg transition">View All</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-slate-700">
            <thead className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-3.5 whitespace-nowrap">Company</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Amount</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Date</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Failure Reason</th>
                <th className="px-6 py-3.5 whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {failures.map((fail) => (
                <tr key={fail._id || fail.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-bold text-slate-900">{fail.companyId?.name || fail.company || 'Unknown Company'}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">₹{fail.amount || '1.00'}</td>
                  <td className="px-6 py-4 text-slate-500">{fail.createdAt ? new Date(fail.createdAt).toLocaleDateString() : (fail.date || 'N/A')}</td>
                  <td className="px-6 py-4 text-red-600 flex items-center gap-1 font-bold">
                    <XCircle size={14} /> {fail.failureReason || fail.reason || 'Card Declined'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-blue-600 hover:underline font-bold">Retry Charge</button>
                  </td>
                </tr>
              ))}
              {failures.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400 font-semibold">
                    No failed payment transactions in the last 30 days.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Plan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? 'Edit Pricing Plan' : 'Create New Pricing Plan'}
      >
        <form onSubmit={handleSubmitPlan} className="space-y-4 text-xs font-semibold">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 mb-1 font-bold">Plan Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
                placeholder="e.g. Starter 1 or Pro 1299"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1 font-bold">Price (₹) <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
                placeholder="1.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 mb-1 font-bold">Period</label>
              <select
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:border-blue-500 outline-none transition cursor-pointer"
              >
                <option value="month">Month</option>
                <option value="year">Year</option>
                <option value="7 Days">7 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 mb-1 font-bold">Max Users</label>
              <input
                type="number"
                value={formData.maxUsers}
                onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1 font-bold">Max Projects</label>
              <input
                type="number"
                value={formData.maxProjects}
                onChange={(e) => setFormData({ ...formData, maxProjects: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
                placeholder="5"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPopular"
              checked={formData.isPopular}
              onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="isPopular" className="text-slate-800 font-bold cursor-pointer">
              Mark as "Most Popular Plan" on Landing Page
            </label>
          </div>

          {/* Dynamic Features List */}
          <div>
            <label className="block text-slate-700 mb-1 font-bold">Included Features & Services</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                placeholder="Type feature bullet point..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:border-blue-500 outline-none transition"
              />
              <button
                type="button"
                onClick={handleAddFeature}
                className="bg-blue-600 text-white px-3.5 py-2 rounded-xl font-bold hover:bg-blue-700 transition flex items-center gap-1"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-100 p-2 rounded-xl bg-slate-50/50">
              {formData.features.map((feat, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 text-slate-800 text-xs">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                    {feat}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(idx)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              ))}
              {formData.features.length === 0 && (
                <p className="text-slate-400 text-center py-2 italic text-[11px]">No features added yet.</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition font-bold"
            >
              {actionLoading ? 'Saving...' : 'Save Plan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Plan Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Pricing Plan Details"
      >
        {viewingPlan && (
          <div className="space-y-4 text-xs font-semibold">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-900">{viewingPlan.name}</h3>
                <p className="text-slate-400 font-mono text-[10px] mt-0.5">ID: {viewingPlan._id || viewingPlan.id}</p>
              </div>
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black">
                ₹{viewingPlan.price}/{viewingPlan.period || 'month'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center gap-2">
                <Zap size={18} className="text-blue-600" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Max User Seats</p>
                  <p className="text-sm font-black text-slate-900">{viewingPlan.maxUsers || 10} Users</p>
                </div>
              </div>
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center gap-2">
                <Shield size={18} className="text-emerald-600" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Max Projects</p>
                  <p className="text-sm font-black text-slate-900">{viewingPlan.maxProjects || 5} Projects</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-slate-500 font-bold uppercase text-[10px] mb-2">Included Services & Features</p>
              <div className="space-y-2 border border-slate-100 p-3 rounded-xl bg-white max-h-48 overflow-y-auto">
                {Array.isArray(viewingPlan.features) && viewingPlan.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-slate-800 text-xs">
                    <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => { setIsViewModalOpen(false); handleOpenEditModal(viewingPlan); }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition flex items-center gap-1.5"
              >
                <Edit size={14} /> Edit Plan
              </button>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Plan Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Plan Deletion"
      >
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Pricing Plan?</h3>
          <p className="text-slate-500 text-xs mb-6">
            Are you sure you want to delete this subscription plan? This plan will be removed from the landing page.
          </p>
          <div className="flex gap-3 w-full text-xs">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-bold"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeletePlan}
              disabled={actionLoading}
              className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition font-bold"
            >
              {actionLoading ? 'Deleting...' : 'Delete Forever'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default Subscriptions;
