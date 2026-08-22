import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    DollarSign, Clock, Download, Send, Search, Filter,
    Eye, Printer, ArrowUpRight, MoreHorizontal, CheckCircle,
    AlertCircle, ChevronRight, Banknote, Wallet, FileText, X,
    Calendar, Briefcase, Loader2, ShieldCheck, User, Building2,
    CheckSquare, Image as ImageIcon, Check, ExternalLink, ChevronDown, ChevronUp,
    AlertTriangle, Camera, UploadCloud, Plus, Trash2
} from 'lucide-react';
import api, { getServerUrl } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, sub, icon: Icon, color, trend }) => (
    <div className="bg-white p-6 rounded-[28px] shadow-sm border border-slate-200/60 flex items-center gap-5 hover:shadow-lg transition-all duration-300 group">
        <div className={`p-4 rounded-2xl ${color} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
            <Icon size={26} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">{title}</p>
            <p className="text-2xl font-black text-slate-900 leading-tight tracking-tighter">{value}</p>
            {sub && <p className="text-[11px] font-bold text-slate-400 mt-0.5">{sub}</p>}
        </div>
        {trend && (
            <div className="flex items-center gap-1 text-xs font-black px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600">
                <ArrowUpRight size={14} />{trend}
            </div>
        )}
    </div>
);

const StatusBadge = ({ status, isLive }) => {
    if (isLive || status === 'active') {
        return (
            <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm bg-emerald-500 text-white border-emerald-400 inline-flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                ACTIVE
            </span>
        );
    }
    const map = {
        paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        pending: 'bg-orange-50  text-orange-700  border-orange-100',
        processing: 'bg-blue-50    text-blue-700    border-blue-100',
        held: 'bg-red-50     text-red-700     border-red-100',
    };
    return (
        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm ${map[status] || map.pending}`}>
            {status || 'preview'}
        </span>
    );
};

const formatHours = (hours) => {
    if (!hours || hours <= 0) return '0.0h';
    const totalMinutes = Math.round(hours * 60);
    if (hours < 1) {
        return `${Number(hours.toFixed(2))}h (${totalMinutes}m)`;
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${Number(hours.toFixed(1))}h`;
    return `${Number(hours.toFixed(2))}h (${h}h ${m}m)`;
};

const Payroll = () => {
    const { socket } = useAuth();
    // Mode: 'employee' or 'job'
    const [viewMode, setViewMode] = useState('job');

    // ── Employee Payroll State ─────────────────────────────────────────────────
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [period, setPeriod] = useState('this-week');
    const [modal, setModal] = useState(false);
    const [step, setStep] = useState(1);
    const [selected, setSelected] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');

    // Detail Modal state
    const [detailModal, setDetailModal] = useState(false);
    const [detailRecord, setDetailRecord] = useState(null);
    const [detailLogs, setDetailLogs] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);

    // ── Job Payroll State ──────────────────────────────────────────────────────
    const [jobsPayroll, setJobsPayroll] = useState([]);
    const [jobLoading, setJobLoading] = useState(false);
    const [jobSearch, setJobSearch] = useState('');
    const [jobStatusFilter, setJobStatusFilter] = useState('all');
    const [uploadingJobId, setUploadingJobId] = useState(null);

    // Job Payout Modal State
    const [jobPayoutModal, setJobPayoutModal] = useState(false);
    const [jobPayoutTarget, setJobPayoutTarget] = useState(null); // { job, member }
    const [jobPayoutStep, setJobPayoutStep] = useState(1);
    const [isJobPayoutSubmitting, setIsJobPayoutSubmitting] = useState(false);

    // Image Lightbox State
    const [lightboxImage, setLightboxImage] = useState(null);

    const getDates = (p) => {
        const now = new Date();
        let start, end;
        const d = new Date(now);

        if (p === 'this-week') {
            const day = d.getDay();
            const diff = d.getDate() - day;
            start = new Date(d.setDate(diff));
            start.setHours(0, 0, 0, 0);
            end = new Date();
        } else if (p === 'last-week') {
            const day = d.getDay();
            const diff = d.getDate() - day - 7;
            start = new Date(d.setDate(diff));
            start.setHours(0, 0, 0, 0);
            
            const e = new Date(start);
            e.setDate(start.getDate() + 6);
            e.setHours(23, 59, 59, 999);
            end = e;
        } else if (p === 'this-month') {
            start = new Date(d.getFullYear(), d.getMonth(), 1);
            end = new Date();
        } else if (p === 'last-month') {
            start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
            end = new Date(d.getFullYear(), d.getMonth(), 0);
            end.setHours(23, 59, 59, 999);
        }
        
        return { 
            start: start.toISOString().split('T')[0], 
            end: end.toISOString().split('T')[0],
            display: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        };
    };

    // ── Fetch Employee Payroll ─────────────────────────────────────────────────
    const fetchPayroll = async () => {
        setLoading(true);
        try {
            const { start, end } = getDates(period);
            const r = await api.get(`/payroll/preview?startDate=${start}&endDate=${end}`);
            setRows(r.data || []);
        } catch (e) {
            console.error(e);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    // ── Fetch Job Payroll ──────────────────────────────────────────────────────
    const fetchJobPayroll = async () => {
        setJobLoading(true);
        try {
            const res = await api.get('/payroll/jobs');
            setJobsPayroll(res.data || []);
        } catch (e) {
            console.error('Failed to load job payroll:', e);
            setJobsPayroll([]);
        } finally {
            setJobLoading(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'employee') {
            fetchPayroll();
        } else {
            fetchJobPayroll();
        }

        // Live polling every 15 seconds so active clocked-in employees increment live in real time
        const interval = setInterval(() => {
            if (viewMode === 'employee') fetchPayroll();
            else fetchJobPayroll();
        }, 15000);

        return () => clearInterval(interval);
    }, [viewMode, period]);

    // Socket real-time synchronization
    useEffect(() => {
        if (!socket) return;
        const onRefresh = () => {
            if (viewMode === 'employee') fetchPayroll();
            else fetchJobPayroll();
        };

        socket.on('timelog_created', onRefresh);
        socket.on('timelog_updated', onRefresh);
        socket.on('payroll_updated', onRefresh);
        socket.on('task_updated', onRefresh);
        socket.on('photo_created', onRefresh);

        return () => {
            socket.off('timelog_created', onRefresh);
            socket.off('timelog_updated', onRefresh);
            socket.off('payroll_updated', onRefresh);
            socket.off('task_updated', onRefresh);
            socket.off('photo_created', onRefresh);
        };
    }, [viewMode, period, socket]);

    // ── Action: Upload Site Work Proof Photos Right from Job Payroll ───────────
    const handleUploadProofPhotos = async (job, e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        
        const pId = String(job.projectId?._id || job.projectId || '');
        const jId = String(job.jobId?._id || job.jobId || job._id || '');

        const formData = new FormData();
        if (pId) formData.append('projectId', pId);
        if (jId) formData.append('jobId', jId);
        formData.append('description', `Site work proof for ${job.jobName || 'Job'}`);
        files.forEach(file => {
            formData.append('images', file);
        });

        setUploadingJobId(jId);
        const toastId = toast.loading(`Uploading ${files.length} site work proof photo(s)...`);
        try {
            await api.post('/photos/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Site work proof photo(s) uploaded successfully!', { id: toastId });
            await fetchJobPayroll();
        } catch (err) {
            console.error('Failed to upload proof photos:', err);
            toast.error(err.response?.data?.message || 'Failed to upload photos. Please try again.', { id: toastId });
        } finally {
            setUploadingJobId(null);
            if (e.target) e.target.value = '';
        }
    };

    // ── Action: Remove Site Work Proof Photo ───────────────────────────────────
    const [deletingPhotoId, setDeletingPhotoId] = useState(null);
    const handleDeleteProofPhoto = async (photo, e) => {
        if (e) e.stopPropagation();
        const photoId = typeof photo === 'object' ? (photo._id || photo.id) : photo;
        if (!photoId) return;

        if (!window.confirm('Are you sure you want to remove this site work proof photo?')) return;

        setDeletingPhotoId(photoId);
        const toastId = toast.loading('Removing proof photo...');
        try {
            await api.delete(`/photos/${photoId}`);
            toast.success('Proof photo removed successfully!', { id: toastId });
            setLightboxImage(prev => {
                if (!prev) return null;
                const prevId = typeof prev === 'object' ? (prev._id || prev.id) : prev;
                return prevId === photoId ? null : prev;
            });
            await fetchJobPayroll();
        } catch (err) {
            console.error('Failed to remove proof photo:', err);
            toast.error(err.response?.data?.message || 'Failed to remove proof photo. Please try again.', { id: toastId });
        } finally {
            setDeletingPhotoId(null);
        }
    };

    // ── Action: View Detail Modal ──────────────────────────────────────────────
    const handleView = async (row) => {
        setDetailRecord(row);
        setDetailLogs([]);
        setDetailModal(true);
        setDetailLoading(true);
        try {
            const { start, end } = getDates(period);
            const res = await api.get(`/payroll/details?userId=${row.userId}&startDate=${start}&endDate=${end}`);
            setDetailLogs(res.data || []);
        } catch (e) {
            console.error('Failed to load payroll details', e);
        } finally {
            setDetailLoading(false);
        }
    };

    // ── Action: Download / Print Payslip ───────────────────────────────────────
    const handleDownload = (row) => {
        const { start, end } = getDates(period);
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Payslip – ${row.name}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 680px; margin: 40px auto; color: #1e293b; }
    h1 { font-size: 26px; font-weight: 900; letter-spacing: -1px; margin: 0 0 4px; }
    .sub { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 32px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 32px; }
    .info-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; }
    .info-item small { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: .1em; color: #94a3b8; margin-bottom: 2px; font-weight: 700; }
    .info-item strong { font-size: 15px; font-weight: 900; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; letter-spacing: .1em; color: #64748b; font-weight: 900; padding: 10px 12px; text-align: left; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .total-row { background: #0f172a; color: white; font-weight: 900; font-size: 15px; }
    .total-row td { padding: 14px 12px; border: none; }
    .deductions { color: #ef4444; }
    .positive { color: #10b981; }
    footer { margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>PAYSLIP</h1>
  <div class="sub">Pay Period: ${start} → ${end}</div>
  <div class="info-grid">
    <div class="info-item"><small>Employee</small><strong>${row.name}</strong></div>
    <div class="info-item"><small>Role</small><strong>${row.role}</strong></div>
    <div class="info-item"><small>Total Hours</small><strong>${row.totalHours?.toFixed(2)}h</strong></div>
    <div class="info-item"><small>Hourly Rate</small><strong>$${row.rate}/hr</strong></div>
  </div>
  <table>
    <thead><tr><th>Description</th><th>Amount</th></tr></thead>
    <tbody>
      <tr><td>Gross Pay</td><td>$${row.grossPay?.toFixed(2)}</td></tr>
      <tr class="deductions"><td>CPP Deduction</td><td>−$${row.cpp?.toFixed(2)}</td></tr>
      <tr class="deductions"><td>EI Deduction</td><td>−$${row.ei?.toFixed(2)}</td></tr>
      <tr class="deductions"><td>Federal Tax</td><td>−$${row.federalTax?.toFixed(2)}</td></tr>
      <tr><td>WCB (Employer)</td><td>$${row.wcb?.toFixed(2)}*</td></tr>
      <tr class="total-row"><td>NET PAY</td><td class="positive">$${row.netPay?.toFixed(2)}</td></tr>
    </tbody>
  </table>
  <p style="font-size:11px;color:#94a3b8;">* WCB is an employer contribution and is not deducted from your pay.</p>
  <footer>Generated on ${new Date().toLocaleDateString()} · Ref: PAY-${Date.now().toString().slice(-8)}</footer>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url);
        if (win) {
            win.addEventListener('load', () => {
                win.focus();
                win.print();
            });
        }
    };

    // ── Employee Payroll Run ───────────────────────────────────────────────────
    const handleRunPayroll = async () => {
        setSubmitting(true);
        try {
            const { start, end } = getDates(period);
            const targetIds = selected.length > 0 ? selected : rows.map(r => r.userId);
            const targetRows = rows.filter(r => targetIds.includes(r.userId));
            await api.post('/payroll/run', {
                records: targetRows,
                startDate: start,
                endDate: end
            });
            setRows(prev => prev.map(r =>
                targetIds.includes(r.userId) ? { ...r, status: 'paid' } : r
            ));
            setStep(3);
        } catch (e) {
            alert('Failed to run payroll. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Action: Open Job Payout Modal ──────────────────────────────────────────
    const handleOpenJobPayout = (job, member) => {
        if (!job.proofPhotos || job.proofPhotos.length === 0) {
            toast.error('Site work proof photos are required before releasing job payout. Please upload photos above.');
            return;
        }
        setJobPayoutTarget({ job, member });
        setJobPayoutStep(1);
        setJobPayoutModal(true);
    };

    // ── Action: Execute Job Payout ─────────────────────────────────────────────
    const handleExecuteJobPayout = async () => {
        if (!jobPayoutTarget) return;
        setIsJobPayoutSubmitting(true);
        try {
            const { job, member } = jobPayoutTarget;
            const payoutAmt = Number(member.contractPayout || member.grossPay || job.budget || 0);

            await api.post('/payroll/job-payout', {
                jobId: job.jobId,
                workerId: member.userId,
                totalHours: member.totalHours,
                hourlyRate: member.hourlyRate,
                grossPay: payoutAmt,
                netPay: member.netPay || payoutAmt,
                proofPhotos: job.proofPhotos
            });

            // Update local state immediately
            setJobsPayroll(prev => prev.map(j => {
                if (j.jobId === job.jobId) {
                    return {
                        ...j,
                        members: j.members.map(m => m.userId === member.userId ? { ...m, payoutStatus: 'paid', paidAt: new Date() } : m)
                    };
                }
                return j;
            }));

            setJobPayoutStep(3);
            toast.success(`Job payout of $${payoutAmt.toLocaleString()} released to ${member.fullName}!`);
        } catch (err) {
            console.error('Job payout error:', err);
            toast.error(err.response?.data?.message || 'Failed to process job payout.');
        } finally {
            setIsJobPayoutSubmitting(false);
        }
    };

    // Filters for Employees
    const filtered = rows.filter(r => {
        const matchesSearch = (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
                            (r.role || '').toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || (r.status || 'pending') === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const toggleRow = uid => setSelected(p => p.includes(uid) ? p.filter(x => x !== uid) : [...p, uid]);
    const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(r => r.userId));

    const modalTargetRows = selected.length > 0 ? rows.filter(r => selected.includes(r.userId)) : rows;
    const mGross = modalTargetRows.reduce((s, r) => s + (r.grossPay || 0), 0);
    const mNet = modalTargetRows.reduce((s, r) => s + (r.netPay || 0), 0);
    const mTax = modalTargetRows.reduce((s, r) => s + (r.cpp || 0) + (r.ei || 0) + (r.federalTax || 0), 0);
    const mHours = modalTargetRows.reduce((s, r) => s + (r.totalHours || 0), 0);

    const totGross = rows.reduce((s, r) => s + (r.grossPay || 0), 0);
    const totNet = rows.reduce((s, r) => s + (r.netPay || 0), 0);
    const totCPP = rows.reduce((s, r) => s + (r.cpp || 0), 0);
    const totEI = rows.reduce((s, r) => s + (r.ei || 0), 0);
    const totTax = rows.reduce((s, r) => s + (r.federalTax || 0), 0);
    const totWCB = rows.reduce((s, r) => s + (r.wcb || 0), 0);
    const totHours = rows.reduce((s, r) => s + (r.totalHours || 0), 0);

    // Filters for Jobs
    const filteredJobs = jobsPayroll.filter(job => {
        const matchesSearch = (job.jobName || '').toLowerCase().includes(jobSearch.toLowerCase()) ||
                              (job.projectName || '').toLowerCase().includes(jobSearch.toLowerCase());
        if (jobStatusFilter === 'all') return matchesSearch;
        if (jobStatusFilter === 'completed') return matchesSearch && (job.jobStatus === 'completed' || job.jobProgress === 100);
        if (jobStatusFilter === 'ready') return matchesSearch && job.members?.some(m => m.payoutStatus === 'ready_for_payout');
        if (jobStatusFilter === 'paid') return matchesSearch && job.members?.every(m => m.payoutStatus === 'paid');
        return matchesSearch;
    });

    // Active jobs: only jobs in progress / not 100% and not completed
    const activeJobsCount = jobsPayroll.filter(j => j.jobStatus !== 'completed' && Number(j.jobProgress || 0) < 100).length;
    const completedJobsCount = jobsPayroll.filter(j => j.jobStatus === 'completed' || Number(j.jobProgress || 0) >= 100).length;
    const totalProofPhotos = jobsPayroll.reduce((sum, j) => sum + (j.proofPhotosCount || 0), 0);
    const totalReadyPayouts = jobsPayroll.reduce((sum, j) => sum + (j.members?.filter(m => m.payoutStatus === 'ready_for_payout').length || 0), 0);
    const totalJobContractValue = jobsPayroll.reduce((sum, j) => sum + (Number(j.budget || j.totalContractPayout || 0)), 0);

    const periods = [
        { v: 'this-week', l: 'This Week' }, { v: 'last-week', l: 'Last Week' },
        { v: 'this-month', l: 'This Month' }, { v: 'last-month', l: 'Last Month' },
    ];

    return (
        <div className="space-y-8 animate-fade-in pb-12">

            {/* Header with Mode Toggle */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Payroll &amp; Payouts</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-slate-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                            <Banknote size={14} className="text-blue-600" /> Crew compensation &amp; Direct Job Contract Payouts
                        </p>
                        <span className="text-slate-300">•</span>
                        <p className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 shadow-sm">
                            {getDates(period).display}
                        </p>
                    </div>
                </div>

                {/* View Mode Toggle Switch */}
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                    <button
                        onClick={() => setViewMode('employee')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 ${viewMode === 'employee' ? 'bg-white text-blue-600 shadow-md scale-100' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <User size={16} /> By Employee
                    </button>
                    <button
                        onClick={() => setViewMode('job')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 ${viewMode === 'job' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 scale-100' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <Building2 size={16} /> By Job
                        {totalReadyPayouts > 0 && (
                            <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none">
                                {totalReadyPayouts}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════════ */}
            {/* VIEW 1: BY EMPLOYEE (Standard Payroll View)                           */}
            {/* ══════════════════════════════════════════════════════════════════════ */}
            {viewMode === 'employee' && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <StatCard title="Total Gross" value={`$${totGross.toFixed(2)}`} sub="this pay period" icon={DollarSign} color="bg-blue-600" />
                        <StatCard title="Total Net Pay" value={`$${totNet.toFixed(2)}`} sub="after deductions" icon={Wallet} color="bg-emerald-500" />
                        <StatCard title="Deductions" value={`$${(totCPP + totEI + totTax + totWCB).toFixed(2)}`} sub="CPP, EI, Tax, WCB" icon={FileText} color="bg-orange-400" />
                        <StatCard title="Total Hours" value={totHours < 1 && totHours > 0 ? `${totHours.toFixed(2)}h (${Math.round(totHours * 60)}m)` : `${totHours.toFixed(1)}h`} sub={`${rows.length} employees`} icon={Clock} color="bg-indigo-500" />
                    </div>

                    {/* Toolbar */}
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
                            {periods.map(p => (
                                <button key={p.v} onClick={() => setPeriod(p.v)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${period === p.v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                    {p.l}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="text" placeholder="Search employee or role..." value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 text-sm font-bold text-slate-700 placeholder:text-slate-400" />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="flex-1 md:flex-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-sm font-bold text-slate-700 appearance-none cursor-pointer hover:border-slate-300 transition-all"
                            >
                                <option value="all">All Status</option>
                                <option value="paid">Paid</option>
                                <option value="pending">Pending</option>
                            </select>
                            {selected.length > 0 && (
                                <button
                                    onClick={() => { setStep(1); setModal(true); }}
                                    className="flex-1 md:flex-none px-5 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-100">
                                    <Send size={16} /> Pay {selected.length}
                                </button>
                            )}
                            <button onClick={() => { setStep(1); setModal(true); }}
                                className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 font-black text-sm uppercase tracking-tight">
                                <Send size={18} /> Run Payroll
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-[40px] shadow-sm border border-slate-200/60 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-8 py-5">
                                            <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0}
                                                onChange={toggleAll} className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                                        </th>
                                        {['Employee', 'Role', 'Hours', 'Rate/hr', 'Gross', 'CPP', 'EI', 'Fed Tax', 'WCB', 'Net Pay', 'Status', 'ACTION'].map(h => (
                                            <th key={h} className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? [...Array(5)].map((_, i) => (
                                        <tr key={i}>{[...Array(13)].map((_, j) => (
                                            <td key={j} className="px-6 py-5"><div className="h-4 bg-slate-100 rounded-lg animate-pulse" /></td>
                                        ))}</tr>
                                    )) : filtered.length === 0 ? (
                                        <tr><td colSpan="13" className="px-8 py-24 text-center">
                                            <div className="flex flex-col items-center gap-4 text-slate-300">
                                                <DollarSign size={48} className="opacity-30" />
                                                <p className="font-bold uppercase tracking-widest text-[11px]">No payroll records found</p>
                                                <p className="text-[11px] text-slate-400">No approved time logs found for this period.</p>
                                            </div>
                                        </td></tr>
                                    ) : filtered.map(row => (
                                        <tr key={row.userId} className={`hover:bg-slate-50/50 transition-colors group ${selected.includes(row.userId) ? 'bg-blue-50/30' : ''}`}>
                                            <td className="px-8 py-5">
                                                <input type="checkbox" checked={selected.includes(row.userId)} onChange={() => toggleRow(row.userId)}
                                                    className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-sm group-hover:scale-110 transition-transform">
                                                        {(row.name || '?').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="font-black text-slate-900 leading-tight">{row.name}</p>
                                                            {row.isLive && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 animate-pulse">
                                                                    <span className="w-1 h-1 rounded-full bg-emerald-500"></span> LIVE
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] font-bold text-slate-400">{formatHours(row.totalHours)} worked</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-tight">{row.role}</span>
                                            </td>
                                            <td className="px-6 py-5 font-black text-slate-900">{formatHours(row.totalHours)}</td>
                                            <td className="px-6 py-5 font-bold text-slate-500">${row.rate}</td>
                                            <td className="px-6 py-5 font-black text-slate-900">${(row.grossPay || 0).toFixed(2)}</td>
                                            <td className="px-6 py-5 text-red-400 font-bold">-${(row.cpp || 0).toFixed(2)}</td>
                                            <td className="px-6 py-5 text-red-400 font-bold">-${(row.ei || 0).toFixed(2)}</td>
                                            <td className="px-6 py-5 text-red-400 font-bold">-${(row.federalTax || 0).toFixed(2)}</td>
                                            <td className="px-6 py-5 text-orange-400 font-bold">${(row.wcb || 0).toFixed(2)}*</td>
                                            <td className="px-6 py-5"><span className="font-black text-emerald-600 text-base">${(row.netPay || 0).toFixed(2)}</span></td>
                                            <td className="px-6 py-5"><StatusBadge status={row.status || 'pending'} isLive={row.isLive} /></td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        title="View time log breakdown"
                                                        onClick={() => handleView(row)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        title="Download / Print payslip"
                                                        onClick={() => handleDownload(row)}
                                                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                    <button
                                                        title="Mark as paid"
                                                        onClick={() => { setSelected([row.userId]); setStep(1); setModal(true); }}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                    >
                                                        <MoreHorizontal size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {!loading && filtered.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-slate-900 text-white">
                                            <td className="px-8 py-5" colSpan="5">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pay Period Totals</span>
                                            </td>
                                            <td className="px-6 py-5 font-black">${totGross.toFixed(2)}</td>
                                            <td className="px-6 py-5 font-black text-red-400">-${totCPP.toFixed(2)}</td>
                                            <td className="px-6 py-5 font-black text-red-400">-${totEI.toFixed(2)}</td>
                                            <td className="px-6 py-5 font-black text-red-400">-${totTax.toFixed(2)}</td>
                                            <td className="px-6 py-5 font-black text-orange-400">${totWCB.toFixed(2)}</td>
                                            <td className="px-6 py-5 font-black text-emerald-400 text-base">${totNet.toFixed(2)}</td>
                                            <td colSpan="2" />
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ══════════════════════════════════════════════════════════════════════ */}
            {/* VIEW 2: BY JOB (Direct Job Contract Payout & Site Proof Photo Upload)  */}
            {/* ══════════════════════════════════════════════════════════════════════ */}
            {viewMode === 'job' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Job Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <StatCard title="Active Jobs" value={activeJobsCount} sub="in-progress on sites" icon={Building2} color="bg-blue-600" />
                        <StatCard title="Completed Jobs" value={completedJobsCount} sub="100% progress verified" icon={CheckSquare} color="bg-emerald-500" />
                        <StatCard title="Verified Site Photos" value={totalProofPhotos} sub="uploaded work proofs" icon={ImageIcon} color="bg-indigo-500" />
                        <StatCard title="Total Contract Value" value={`$${totalJobContractValue.toLocaleString()}`} sub="job contract budgets" icon={DollarSign} color="bg-emerald-600" />
                    </div>

                    {/* Job Toolbar */}
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex-1 relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by job name or project..."
                                value={jobSearch}
                                onChange={e => setJobSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 text-sm font-bold text-slate-700 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <select 
                                value={jobStatusFilter}
                                onChange={(e) => setJobStatusFilter(e.target.value)}
                                className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-sm font-bold text-slate-700 appearance-none cursor-pointer hover:border-slate-300 transition-all"
                            >
                                <option value="all">All Jobs</option>
                                <option value="completed">Completed Jobs (100%)</option>
                                <option value="ready">Ready for Payout (Proof Verified)</option>
                                <option value="paid">Fully Settled / Paid</option>
                            </select>
                        </div>
                    </div>

                    {/* Jobs List */}
                    {jobLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-48 bg-white rounded-3xl border border-slate-200 animate-pulse" />
                            ))}
                        </div>
                    ) : filteredJobs.length === 0 ? (
                        <div className="bg-white rounded-[36px] p-16 text-center border border-slate-200/60 shadow-sm">
                            <Building2 size={48} className="mx-auto text-slate-300 mb-3 opacity-40" />
                            <p className="font-black text-slate-800 text-lg">No jobs found</p>
                            <p className="text-slate-400 text-xs mt-1">Try changing your search or filter parameters.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {filteredJobs.map(job => {
                                const isJobComplete = job.jobProgress === 100 || job.jobStatus === 'completed';
                                const hasProof = job.hasProofPhotos;
                                const isUploadingThis = uploadingJobId === job.jobId;

                                return (
                                    <div key={job.jobId} className="bg-white rounded-[36px] shadow-sm border border-slate-200/70 overflow-hidden hover:shadow-md transition-all">
                                        {/* Job Header */}
                                        <div className="p-6 bg-slate-50/70 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-sm shrink-0 ${isJobComplete ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                                                    <Building2 size={22} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2.5 flex-wrap">
                                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{job.jobName}</h3>
                                                        <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                                                            isJobComplete ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-blue-100 text-blue-800 border-blue-200'
                                                        }`}>
                                                            {isJobComplete ? '● Completed' : '● In Progress'}
                                                        </span>
                                                        <span className="bg-slate-200/70 text-slate-700 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                            Project: {job.projectName}
                                                        </span>
                                                        {/* Total Job Contract Price Badge */}
                                                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-0.5 rounded-full text-xs font-black tracking-tight">
                                                            Total Contract Payout: ${Number(job.budget || job.totalContractPayout || 0).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-400 text-xs font-bold mt-1">
                                                        Location: {job.location || 'Site Location Not Specified'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Progress Bar & Badges */}
                                            <div className="flex items-center gap-6 min-w-[240px]">
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-xs font-black mb-1.5">
                                                        <span className="text-slate-400 uppercase tracking-widest text-[10px]">Job Progress</span>
                                                        <span className={isJobComplete ? 'text-emerald-600' : 'text-blue-600'}>{job.jobProgress}%</span>
                                                    </div>
                                                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${isJobComplete ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                                            style={{ width: `${job.jobProgress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Site Work Proof Photos Preview & Upload Bar */}
                                        <div className="px-6 py-4 bg-slate-50/40 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <div className="flex items-center gap-2">
                                                    <ImageIcon size={18} className={hasProof ? 'text-indigo-600' : 'text-amber-500'} />
                                                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                                                        Site Work Proof Photos:
                                                    </span>
                                                    {hasProof ? (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                            {job.proofPhotosCount} Photos Verified
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                                            <AlertTriangle size={12} /> Required before payout
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Upload Site Proof Photo Button */}
                                                <label className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm transition-all active:scale-95 ${
                                                    isUploadingThis ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                                                }`}>
                                                    <input
                                                        type="file"
                                                        multiple
                                                        accept="image/*"
                                                        disabled={isUploadingThis}
                                                        onChange={(e) => handleUploadProofPhotos(job, e)}
                                                        className="hidden"
                                                    />
                                                    {isUploadingThis ? (
                                                        <><Loader2 size={14} className="animate-spin" /> Uploading...</>
                                                    ) : (
                                                        <><Camera size={14} /> + Upload Proof Photo</>
                                                    )}
                                                </label>
                                            </div>

                                            {/* Photos Gallery Thumbnails */}
                                            {hasProof && (
                                                <div className="flex items-center gap-2 overflow-x-auto py-1">
                                                    {job.proofPhotos.slice(0, 6).map((photoObj, pIdx) => {
                                                        const imgUrl = typeof photoObj === 'string' ? photoObj : (photoObj.url || photoObj.imageUrl);
                                                        const photoId = typeof photoObj === 'string' ? null : (photoObj._id || photoObj.id);
                                                        return (
                                                            <div key={pIdx} className="relative group shrink-0">
                                                                <img
                                                                    src={getServerUrl(imgUrl)}
                                                                    alt="Site Proof"
                                                                    onClick={() => setLightboxImage(photoObj)}
                                                                    className="w-11 h-11 rounded-xl object-cover border-2 border-white shadow-sm group-hover:scale-105 cursor-pointer transition-all hover:ring-2 hover:ring-blue-400"
                                                                    title="Click to zoom, view or remove proof photo"
                                                                />
                                                                {photoId && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => handleDeleteProofPhoto(photoObj, e)}
                                                                        disabled={deletingPhotoId === photoId}
                                                                        title="Remove proof photo"
                                                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:scale-110 active:scale-90 z-10"
                                                                    >
                                                                        {deletingPhotoId === photoId ? (
                                                                            <Loader2 size={10} className="animate-spin" />
                                                                        ) : (
                                                                            <Trash2 size={10} />
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    {job.proofPhotos.length > 6 && (
                                                        <span
                                                            onClick={() => setLightboxImage(job.proofPhotos[0])}
                                                            className="w-11 h-11 rounded-xl bg-slate-800 text-white font-black text-xs flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 transition-transform shrink-0"
                                                        >
                                                            +{job.proofPhotos.length - 6}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Job Members Table (Direct Contract Price / No Hourly) */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white">
                                                        <th className="px-6 py-4">Assigned Member</th>
                                                        <th className="px-6 py-4">Role</th>
                                                        <th className="px-6 py-4">Tasks Completion</th>
                                                        <th className="px-6 py-4">Contract Payout</th>
                                                        <th className="px-6 py-4">Proof Status</th>
                                                        <th className="px-6 py-4 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {(!job.members || job.members.length === 0) ? (
                                                        <tr>
                                                            <td colSpan="6" className="px-6 py-8 text-center text-slate-400 text-xs font-bold">
                                                                No team members currently assigned to this job.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        job.members.map(member => {
                                                            const isPaid = member.payoutStatus === 'paid';
                                                            const isReady = member.payoutStatus === 'ready_for_payout';
                                                            const isMissingProof = member.payoutStatus === 'missing_proof';
                                                            const memberPayout = Number(member.contractPayout || member.grossPay || job.budget || 0);

                                                            return (
                                                                <tr key={member.userId} className="hover:bg-slate-50/60 transition-colors">
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm">
                                                                                {(member.fullName || '?').charAt(0)}
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-black text-slate-900">{member.fullName}</p>
                                                                                <p className="text-[10px] font-bold text-slate-400">{member.email}</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black uppercase">
                                                                            {member.role}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <div>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                                                    member.allTasksCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                                                }`}>
                                                                                    {member.totalAssignedTasks > 0 ? (
                                                                                        `${member.completedTasks}/${member.totalAssignedTasks} Tasks Done (${member.taskCompletionRate}%)`
                                                                                    ) : (
                                                                                        isJobComplete ? 'Job Complete (100%)' : 'Site Work Assigned'
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <span className="font-black text-emerald-600 text-base">
                                                                            ${memberPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        {hasProof ? (
                                                                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                                                                                <CheckCircle size={14} /> Verified Proof
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-xs">
                                                                                <AlertTriangle size={14} /> Missing Photos
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        {isPaid ? (
                                                                            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-sm">
                                                                                <Check size={14} /> Paid
                                                                            </span>
                                                                        ) : isReady ? (
                                                                            <button
                                                                                onClick={() => handleOpenJobPayout(job, member)}
                                                                                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-1.5"
                                                                            >
                                                                                <DollarSign size={14} /> Release Payout (${memberPayout.toLocaleString()})
                                                                            </button>
                                                                        ) : isMissingProof ? (
                                                                            <label className="cursor-pointer px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl font-bold text-xs hover:bg-amber-100 inline-flex items-center gap-1 transition-all">
                                                                                <input
                                                                                    type="file"
                                                                                    multiple
                                                                                    accept="image/*"
                                                                                    onChange={(e) => handleUploadProofPhotos(job, e)}
                                                                                    className="hidden"
                                                                                />
                                                                                <Camera size={14} /> Upload Proof to Pay
                                                                            </label>
                                                                        ) : (
                                                                            <span className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold inline-flex items-center gap-1">
                                                                                <Clock size={14} /> In Progress
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ─────────────────────────────────────────────────────────────────── */}
            {/* Job Payout Authorization Modal (Portaled)                           */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {jobPayoutModal && jobPayoutTarget && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[12px] z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[42px] shadow-[0_32px_120px_-12px_rgba(0,0,0,0.5)] w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                        {/* Modal Header */}
                        <div className="bg-[#0F172A] p-8 text-white relative overflow-hidden shrink-0">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-black text-white shadow-xl shadow-emerald-500/20 border border-white/10">
                                        <DollarSign size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight leading-none mb-1">Job Contract Payout</h2>
                                        <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">Verified Completion &amp; Site Proof</p>
                                    </div>
                                </div>
                                <button onClick={() => setJobPayoutModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5">
                                    <X size={20} className="text-slate-400 hover:text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            {jobPayoutStep === 1 && (
                                <div className="space-y-6">
                                    {/* Member & Job summary card */}
                                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/80 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Job / Project</span>
                                            <span className="text-sm font-black text-slate-900">{jobPayoutTarget.job.jobName} ({jobPayoutTarget.job.projectName})</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payee Member</span>
                                            <span className="text-sm font-black text-blue-600">{jobPayoutTarget.member.fullName} ({jobPayoutTarget.member.role})</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Job Contract Price</span>
                                            <span className="text-base font-black text-emerald-600">
                                                ${Number(jobPayoutTarget.member.contractPayout || jobPayoutTarget.job.budget || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Task Completion Verification */}
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                                            <CheckSquare size={14} className="text-emerald-600" /> Completed Tasks
                                        </h4>
                                        <div className="space-y-2 max-h-36 overflow-y-auto">
                                            {jobPayoutTarget.member.tasksList?.length > 0 ? (
                                                jobPayoutTarget.member.tasksList.map((t, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-xs font-bold text-slate-800">
                                                        <span className="flex items-center gap-2">
                                                            <CheckCircle size={14} className="text-emerald-600" /> {t.title}
                                                        </span>
                                                        <span className="px-2 py-0.5 bg-emerald-200/60 text-emerald-900 rounded-lg text-[9px] font-black uppercase">
                                                            {t.status}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 flex items-center gap-2">
                                                    <CheckCircle size={14} className="text-emerald-600" /> Global Job Progress Verified (100%)
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Site Proof Photos Verified */}
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                                            <ImageIcon size={14} className="text-indigo-600" /> Verified Site Work Proof Photos ({jobPayoutTarget.job.proofPhotosCount})
                                        </h4>
                                        <div className="grid grid-cols-4 gap-2.5">
                                            {jobPayoutTarget.job.proofPhotos.slice(0, 8).map((pUrl, idx) => (
                                                <img
                                                    key={idx}
                                                    src={getServerUrl(pUrl)}
                                                    alt="Proof"
                                                    onClick={() => setLightboxImage(pUrl)}
                                                    className="w-full h-16 rounded-2xl object-cover border border-slate-200 hover:scale-105 cursor-pointer transition-transform"
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Direct Contract Payout Disbursal */}
                                    <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl space-y-2">
                                        <div className="flex justify-between items-center text-base font-black text-emerald-900">
                                            <span>Direct Contract Payout</span>
                                            <span className="text-2xl text-emerald-600">
                                                ${Number(jobPayoutTarget.member.contractPayout || jobPayoutTarget.job.budget || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 font-bold">
                                            Full job contract amount authorized for completed deliverables.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {jobPayoutStep === 3 && (
                                <div className="text-center py-6 animate-in zoom-in-95 duration-500">
                                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-200">
                                        <CheckCircle size={40} className="text-emerald-600" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 mb-1">Job Payout Released!</h3>
                                    <p className="text-slate-500 text-sm font-bold">
                                        ${Number(jobPayoutTarget.member.contractPayout || jobPayoutTarget.job.budget || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} has been authorized and disbursed to {jobPayoutTarget.member.fullName}.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                            {jobPayoutStep === 1 ? (
                                <>
                                    <button
                                        onClick={() => setJobPayoutModal(false)}
                                        className="flex-1 py-3.5 bg-white text-slate-600 rounded-2xl font-black text-xs uppercase tracking-wider border border-slate-200 hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleExecuteJobPayout}
                                        disabled={isJobPayoutSubmitting}
                                        className="flex-[1.5] py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        {isJobPayoutSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><ShieldCheck size={16} /> Authorize &amp; Release Payout</>}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => { setJobPayoutModal(false); setJobPayoutStep(1); }}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-800"
                                >
                                    Done &amp; Close
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ─────────────────────────────────────────────────────────────────── */}
            {/* Lightbox Modal for Photo Inspection                                */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {lightboxImage && createPortal(
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[99999] flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setLightboxImage(null)}
                            className="absolute top-4 right-4 p-3 bg-black/60 hover:bg-black text-white rounded-full transition-all border border-white/20"
                        >
                            <X size={20} />
                        </button>
                        <img src={getServerUrl(lightboxImage)} alt="Site Work Proof Full" className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
                    </div>
                </div>,
                document.body
            )}

            {/* ─────────────────────────────────────────────────────────────────── */}
            {/* Detail Modal (Portaled)                                            */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {detailModal && detailRecord && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[12px] z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[42px] shadow-[0_32px_120px_-12px_rgba(0,0,0,0.5)] w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 cubic-bezier(0.16, 1, 0.3, 1)">
                        <div className="bg-[#0F172A] p-8 text-white flex items-start justify-between relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-2xl shadow-xl shadow-blue-500/20 border border-white/10">
                                        {(detailRecord.name || '?').charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight leading-tight">{detailRecord.name}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-black uppercase tracking-widest text-blue-300 border border-white/5">{detailRecord.role}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Employee ID: EMP-{(detailRecord.userId || '').slice(-4)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setDetailModal(false)} className="relative z-10 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 group">
                                <X size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-8 pt-8">
                                {[
                                    { label: 'Gross Pay', value: `$${(detailRecord.grossPay || 0).toFixed(2)}`, icon: DollarSign, color: 'text-slate-900', bg: 'bg-slate-50' },
                                    { label: 'Net Pay', value: `$${(detailRecord.netPay || 0).toFixed(2)}`, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100/50' },
                                    { label: 'Total Hours', value: `${(detailRecord.totalHours || 0).toFixed(2)}h`, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-100/50' },
                                    { label: 'Hourly Rate', value: `$${detailRecord.rate}/hr`, icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-100/50' },
                                ].map(c => (
                                    <div key={c.label} className={`rounded-[24px] p-5 border border-transparent ${c.bg} ${c.border || ''} transition-all hover:shadow-md group`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <c.icon size={12} className="text-slate-400" />
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{c.label}</p>
                                        </div>
                                        <p className={`font-black text-xl tracking-tighter ${c.color}`}>{c.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="px-8 mt-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Statutory Deductions</h3>
                                    <div className="h-px flex-1 bg-slate-100 ml-4"></div>
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                    {[
                                        { label: 'CPP', value: detailRecord.cpp, sub: 'Pension Plan' },
                                        { label: 'EI', value: detailRecord.ei, sub: 'Employment Ins.' },
                                        { label: 'Fed Tax', value: detailRecord.federalTax, sub: 'Income Tax' },
                                        { label: 'WCB*', value: detailRecord.wcb, sub: 'Comp. Board', orange: true },
                                    ].map(d => (
                                        <div key={d.label} className={`rounded-[24px] p-4 text-center border transition-all hover:scale-[1.02] ${d.orange ? 'bg-orange-50/30 border-orange-100' : 'bg-red-50/30 border-red-100'}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${d.orange ? 'text-orange-400' : 'text-red-400'}`}>{d.label}</p>
                                            <p className={`font-black text-lg tracking-tighter ${d.orange ? 'text-orange-600' : 'text-red-600'}`}>-${(d.value || 0).toFixed(2)}</p>
                                            <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">{d.sub}</p>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[9px] font-medium text-slate-400 mt-3 italic">* WCB is employer-paid and not deducted from net pay.</p>
                            </div>

                            <div className="px-8 py-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Timesheet Breakdown</h3>
                                    <div className="h-px flex-1 bg-slate-100 ml-4"></div>
                                </div>
                                
                                {detailLoading ? (
                                    <div className="space-y-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse border border-slate-100" />
                                        ))}
                                    </div>
                                ) : detailLogs.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
                                            <Clock size={20} className="text-slate-300" />
                                        </div>
                                        <p className="font-bold text-slate-400 text-sm">No contributing logs found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {detailLogs.map((log, idx) => (
                                            <div key={log._id || idx} className="flex items-center justify-between bg-white rounded-[24px] px-6 py-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                                        <Calendar size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm tracking-tight">{new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                            <span className="text-emerald-600 font-bold">{new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            <span className="text-slate-300">→</span>
                                                            {log.clockOut ? (
                                                                <span>{new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            ) : (
                                                                <span className="text-emerald-600 font-black animate-pulse">ACTIVE / LIVE</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Job / Site</p>
                                                        <p className="text-[11px] font-bold text-slate-500 flex items-center justify-end gap-1.5 uppercase">
                                                            <Briefcase size={12} className="text-slate-300" /> {log.job}
                                                        </p>
                                                    </div>
                                                    <div className="text-right min-w-[70px]">
                                                        <p className="font-black text-slate-900 text-base tracking-tighter">{formatHours(log.hours)}</p>
                                                        <p className="text-[11px] font-bold text-emerald-600 tracking-tight">${log.amount.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                            <button onClick={() => setDetailModal(false)}
                                className="flex-1 py-4 bg-white hover:bg-slate-50 text-slate-600 rounded-[20px] font-black text-sm uppercase tracking-widest transition-all border border-slate-200 shadow-sm active:scale-95">
                                Close
                            </button>
                            <button onClick={() => { setDetailModal(false); handleDownload(detailRecord); }}
                                className="flex-[1.5] py-4 bg-[#0F172A] hover:bg-slate-800 text-white rounded-[20px] font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 active:scale-95 group">
                                <Download size={18} className="group-hover:translate-y-0.5 transition-transform" /> Download Payslip
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ─────────────────────────────────────────────────────────────────── */}
            {/* Run Payroll Modal (Portaled)                                       */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {modal && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[12px] z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[42px] shadow-[0_32px_120px_-12px_rgba(0,0,0,0.5)] w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 cubic-bezier(0.16, 1, 0.3, 1)">
                        <div className="bg-[#0F172A] p-10 text-white relative overflow-hidden shrink-0">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-5 mb-6">
                                    <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/20 border border-white/10">
                                        <Send size={26} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight leading-none mb-1">Run Payroll</h2>
                                        <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">Step {step} of 3 • Configuration</p>
                                    </div>
                                </div>
                                <div className="flex gap-2.5">
                                    {[1, 2, 3].map(s => (
                                        <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${step >= s ? 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]' : 'bg-white/10'}`} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
                            {step === 1 && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                    <h3 className="font-black text-slate-900 text-xl tracking-tight mb-6">Verify Pay Period Summary</h3>
                                    <div className="space-y-3">
                                        {[
                                            { l: 'Selected Crew', v: `${modalTargetRows.length} Members`, icon: User },
                                            { l: 'Billable Hours', v: `${mHours.toFixed(1)}h Total`, icon: Clock },
                                            { l: 'Gross Amount', v: `$${mGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign },
                                            { l: 'Statutory Taxes', v: `-$${mTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: FileText, red: true },
                                            { l: 'Final Disbursal', v: `$${mNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, hi: true, icon: Wallet },
                                        ].map(item => (
                                            <div key={item.l} className={`flex justify-between items-center p-5 rounded-[24px] border transition-all ${item.hi ? 'bg-emerald-50/50 border-emerald-100 shadow-sm' : 'bg-slate-50/50 border-slate-100'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-xl ${item.hi ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 shadow-sm'}`}>
                                                        <item.icon size={16} />
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-500">{item.l}</span>
                                                </div>
                                                <span className={`font-black ${item.hi ? 'text-emerald-600 text-xl tracking-tighter' : item.red ? 'text-red-500' : 'text-slate-900 tracking-tight'}`}>{item.v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {step === 2 && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                    <h3 className="font-black text-slate-900 text-xl tracking-tight mb-6">Authorize Disbursal</h3>
                                    <div className="bg-orange-50 border border-orange-100 rounded-[28px] p-6 flex gap-5 mb-6 shadow-sm shadow-orange-100/50">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0">
                                            <AlertCircle size={24} className="text-orange-500" />
                                        </div>
                                        <div>
                                            <p className="font-black text-orange-900 text-sm">Security Confirmation Required</p>
                                            <p className="text-orange-700/70 text-xs font-bold mt-1 leading-relaxed">Funds will be disbursed to {modalTargetRows.length} crew members. Total Net: <strong className="text-orange-900">${mNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>. This action cannot be reversed.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                        {(selected.length > 0 ? rows.filter(r => selected.includes(r.userId)) : rows).map(r => (
                                            <div key={r.userId} className="flex justify-between items-center bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-4 hover:border-slate-200 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-900 text-sm font-black shadow-sm">{(r.name || '?').charAt(0)}</div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm">{r.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.role}</p>
                                                    </div>
                                                </div>
                                                <span className="font-black text-emerald-600 tracking-tight">${(r.netPay || 0).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {step === 3 && (
                                <div className="text-center py-4 animate-in zoom-in-95 duration-500">
                                    <div className="w-24 h-24 bg-emerald-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 border-2 border-emerald-100 shadow-xl shadow-emerald-100/20 relative">
                                        <div className="absolute inset-0 bg-emerald-400/20 rounded-[32px] animate-ping opacity-20"></div>
                                        <CheckCircle size={48} className="text-emerald-500 relative z-10" />
                                    </div>
                                    <h3 className="font-black text-slate-900 text-2xl tracking-tight mb-2">Payroll Authorized</h3>
                                    <p className="text-slate-500 font-bold text-sm mb-8">Funds have been disbursed and records updated to <span className="text-emerald-600 font-black">PAID</span> for {selected.length > 0 ? selected.length : rows.length} members.</p>
                                    
                                    <div className="bg-slate-50 rounded-[32px] p-6 text-left space-y-3 border border-slate-100">
                                        <div className="flex justify-between text-xs">
                                            <span className="font-black text-slate-400 uppercase tracking-widest">Transaction ID</span>
                                            <span className="font-black text-slate-900">PAY-{Date.now().toString().slice(-8)}</span>
                                        </div>
                                        <div className="h-px bg-slate-200/50"></div>
                                        <div className="flex justify-between text-xs">
                                            <span className="font-black text-slate-400 uppercase tracking-widest">Completion Timestamp</span>
                                            <span className="font-black text-slate-900">{new Date().toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                {step < 3 ? (
                                    <>
                                        <button onClick={() => step > 1 ? setStep(s => s - 1) : setModal(false)}
                                            className="flex-1 px-8 py-4 bg-white hover:bg-slate-50 text-slate-600 rounded-[22px] font-black text-sm uppercase tracking-widest transition-all border border-slate-200 shadow-sm active:scale-95">
                                            {step > 1 ? 'Back' : 'Cancel'}
                                        </button>
                                        <button
                                            onClick={() => step === 1 ? setStep(2) : handleRunPayroll()}
                                            disabled={submitting}
                                            className="flex-[1.5] px-8 py-4 bg-[#0F172A] hover:bg-slate-800 text-white rounded-[22px] font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95">
                                            {submitting ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : step === 2 ? (
                                                <><ShieldCheck size={18} /> Authorize Disbursal</>
                                            ) : (
                                                <><ChevronRight size={18} /> Review Next</>
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => { setModal(false); setStep(1); setSelected([]); }}
                                        className="w-full px-8 py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[22px] font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95">
                                        Done &amp; Close Portal
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Proof Photo Zoom & Delete Lightbox Modal ────────────────── */}
            {lightboxImage && createPortal(
                <div
                    className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
                    onClick={() => setLightboxImage(null)}
                >
                    <div
                        className="bg-white rounded-3xl overflow-hidden max-w-3xl w-full shadow-2xl border border-slate-200/80 flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <ImageIcon size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                                        Site Work Proof Photo
                                    </h3>
                                    {typeof lightboxImage === 'object' && lightboxImage.description && (
                                        <p className="text-xs text-slate-500 font-medium">
                                            {lightboxImage.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={getServerUrl(typeof lightboxImage === 'string' ? lightboxImage : (lightboxImage.url || lightboxImage.imageUrl))}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                                    title="Open Full Resolution"
                                >
                                    <ExternalLink size={18} />
                                </a>
                                <button
                                    onClick={() => setLightboxImage(null)}
                                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                                    title="Close"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Image Preview Container */}
                        <div className="flex-1 overflow-auto bg-slate-900 flex items-center justify-center p-4 min-h-[300px]">
                            <img
                                src={getServerUrl(typeof lightboxImage === 'string' ? lightboxImage : (lightboxImage.url || lightboxImage.imageUrl))}
                                alt="Site Work Proof Preview"
                                className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-2xl"
                            />
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="p-4 px-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="text-xs text-slate-500 font-medium">
                                Verified work proof photo
                            </div>
                            <div className="flex items-center gap-3">
                                {typeof lightboxImage === 'object' && (lightboxImage._id || lightboxImage.id) && (
                                    <button
                                        onClick={(e) => handleDeleteProofPhoto(lightboxImage, e)}
                                        disabled={deletingPhotoId === (lightboxImage._id || lightboxImage.id)}
                                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
                                    >
                                        {deletingPhotoId === (lightboxImage._id || lightboxImage.id) ? (
                                            <><Loader2 size={14} className="animate-spin" /> Removing...</>
                                        ) : (
                                            <><Trash2 size={14} /> Remove Photo</>
                                        )}
                                    </button>
                                )}
                                <button
                                    onClick={() => setLightboxImage(null)}
                                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Payroll;
