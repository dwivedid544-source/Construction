import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClock } from '../context/ClockContext';
import { useState, useEffect, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import {
  LayoutDashboard, Briefcase, Clock, FileText,
  Wrench, ClipboardList, BarChart2, DollarSign,
  Users, Settings, LogOut, Menu, X, Bell, MessageSquare,
  Search, ChevronDown, ChevronRight, RefreshCw, MapPin, Building2, PenTool, Camera, FileQuestion, AlertCircle, Activity, Lock, CheckCircle, Check
} from 'lucide-react';
import api, { BASE_URL } from '../utils/api';
import Logo from '../assets/images/Logo.png';
import { playSound } from '../utils/notificationSound';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

const CompanyAdminLayout = () => {
  const { user, logout, updateUserData, socket } = useAuth();
  const { isClockedIn, formattedElapsed } = useClock();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isJobSelectorOpen, setIsJobSelectorOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const jobSelectorRef = useRef(null);
  const notificationRef = useRef(null);

  const [projectsList, setProjectsList] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [issueCount, setIssueCount] = useState(0);
  const [poCount, setPoCount] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [plansList, setPlansList] = useState([]);
  const [trialInfo, setTrialInfo] = useState({
    isExpired: false,
    daysRemaining: null,
    isTrialActive: false,
    subscriptionStatus: 'active'
  });
  const [showTrialExpiredModal, setShowTrialExpiredModal] = useState(false);

  const fetchPlans = async () => {
    try {
      const res = await api.get('/plans');
      setPlansList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const fetchUserProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data) {
        updateUserData(res.data);

        // Check if first login after purchase/registration
        if (res.data.mustChangePassword || localStorage.getItem('mustChangePassword') === 'true') {
          setShowChangePasswordModal(true);
        }

        const comp = res.data.companyDetails;
        if (comp) {
          const isExpired = Boolean(comp.isExpired || comp.subscriptionStatus === 'expired');
          const isTrial = Boolean(comp.isTrialActive || (comp.subscriptionPlan?.price === 0 && !isExpired));
          const daysRemaining = comp.daysRemaining !== undefined ? comp.daysRemaining : null;

          setTrialInfo({
            isExpired,
            daysRemaining,
            isTrialActive: isTrial,
            subscriptionStatus: comp.subscriptionStatus || (isExpired ? 'expired' : 'active')
          });

          if (isExpired && res.data.role !== 'SUPER_ADMIN') {
            setShowTrialExpiredModal(true);
          }
        }
      }
    } catch (err) {
      console.error('Failed to sync profile:', err);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newPasswordValue) {
      toast.error('Please enter a new password.');
      return;
    }
    if (newPasswordValue.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    if (newPasswordValue !== confirmPasswordValue) {
      toast.error('Passwords do not match. Please re-enter.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await api.patch('/auth/updatepassword', { newPassword: newPasswordValue });
      localStorage.removeItem('mustChangePassword');
      toast.success('🎉 Password updated successfully! Your account is fully secured.');
      setShowChangePasswordModal(false);
      setNewPasswordValue('');
      setConfirmPasswordValue('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password. Please try again.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleRazorpayBuyPlan = async (amountInRupees = 999, planName = 'KT Construct Pro Plan', planId = null) => {
    try {
      let targetPlanId = planId;
      if (!targetPlanId && plansList.length > 0) {
        const matched = plansList.find(p => p.price === amountInRupees || p.name === planName) || plansList[0];
        targetPlanId = matched?.id || matched?._id;
      }
      if (!targetPlanId) {
        toast.error('Unable to determine selected plan ID.');
        return;
      }

      // 1. Create order on the backend
      const orderRes = await api.post('/billing/create-order', { planId: targetPlanId });
      const orderResult = orderRes.data?.data;
      if (!orderResult) {
        toast.error('Failed to initiate subscription order.');
        return;
      }

      if (orderResult.isFreePlan) {
        toast.success(orderResult.message || 'Free plan activated successfully!');
        setShowTrialExpiredModal(false);
        fetchUserProfile();
        return;
      }

      const key = orderResult.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!key) {
        toast.error('Razorpay public key ID is not configured.');
        return;
      }

      const loadScript = (src) => {
        return new Promise((resolve) => {
          if (window.Razorpay) {
            resolve(true);
            return;
          }
          const script = document.createElement('script');
          script.src = src;
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!res) {
        toast.error('Razorpay SDK failed to load. Please check your internet connection.');
        return;
      }

      const options = {
        key: key,
        amount: orderResult.amount,
        currency: orderResult.currency || 'INR',
        name: 'Kiaan Technology',
        description: orderResult.planName || planName,
        order_id: orderResult.orderId,
        image: Logo,
        handler: async function (response) {
          try {
            toast.loading('Verifying payment...');
            const verifyRes = await api.post('/billing/verify-payment', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              planId: targetPlanId
            });

            toast.dismiss();
            if (verifyRes.data?.success) {
              toast.success('Subscription activated successfully!');
              setShowTrialExpiredModal(false);
              localStorage.setItem('subscriptionStatus', 'active');
              localStorage.removeItem('isTrialActive');
              fetchUserProfile();
            } else {
              toast.error('Payment verification failed.');
            }
          } catch (err) {
            toast.dismiss();
            toast.error(err.response?.data?.message || 'Payment verification failed.');
          }
        },
        prefill: {
          name: user?.name || 'Customer',
          email: user?.email || 'info@kiaantechnology.com',
          contact: '9752100980'
        },
        theme: {
          color: '#3b82f6'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        toast.error(`Payment Failed: ${response.error?.description || 'Declined'}`);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Order creation failed.');
    }
  };

  // socketRef removed: using global shared socket
  const pathnameRef = useRef(location.pathname);
  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  // Determine current project/job for dynamic header label
  const activeProject = useMemo(() => {
    const projectIdInUrl = location.pathname.split('/projects/')[1]?.split('/')[0];
    const jobIdInUrl = location.pathname.split('/jobs/')[1]?.split('/')[0];
    
    const searchParams = new URLSearchParams(location.search);
    const projectIdInQuery = searchParams.get('projectId');

    return projectsList.find(p => {
      // 1. Exact Job ID match (from URL path or Query Param for Tasks filter)
      if (p.isJob && (p._id === jobIdInUrl || p._id === projectIdInQuery)) return true;
      
      // 2. Exact Project ID match (from URL path or Query Param for Admins/PMs)
      if (!p.isJob && p._id === (projectIdInUrl || projectIdInQuery)) return true;
      
      // 3. Fallback: If they filter by Project in Tasks (older sync logic), find their Job for that project
      const pId = p.projectId?._id || p.projectId;
      if (p.isJob && projectIdInQuery && pId?.toString() === projectIdInQuery && !jobIdInUrl) return true;

      return false;
    });
  }, [location.pathname, location.search, projectsList]);

  const fetchSidebarMetrics = async () => {
    try {
      const res = await api.get('/reports/sidebar-metrics');
      const { 
        taskCount, 
        issueCount, 
        chatUnreadCount, 
        notificationCount, 
        projects,
        poCount
      } = res.data;
      
      setTaskCount(taskCount);
      setIssueCount(issueCount);
      setChatUnreadCount(chatUnreadCount);
      setProjectsList(projects || []);
      setPoCount(poCount || 0);
      // Pre-fetch notifications but only if needed or keep separate as they are specific
      // For now let's just use the count for the badge
    } catch (error) {
      console.error('Error fetching sidebar metrics:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };


  useEffect(() => {
    fetchUserProfile();
    if (user && socket) {
      fetchSidebarMetrics();
      fetchNotifications();

      const handleConnect = () => {
        socket.emit('register_user', user);
      };

      const handleUnreadCount = () => {
        fetchSidebarMetrics();
      };

      const handleNewNotification = (payload) => {
        if (payload.type === 'chat') {
          fetchSidebarMetrics();
          if (!pathnameRef.current.includes('/chat')) {
            playSound('MESSAGE_RECEIVED');
          }
        } else {
          playSound('NOTIFICATION');
          fetchNotifications();
          fetchSidebarMetrics();
        }
      };

      const handleNewMessage = (payload) => {
        const senderId = payload.sender?._id || payload.sender;
        const currentUserId = user?._id || user?.id;
        if (!senderId || String(senderId) === String(currentUserId)) return;

        fetchSidebarMetrics();
        
        if (!pathnameRef.current.includes('/chat')) {
          playSound('MESSAGE_RECEIVED');
          toast.success(`New message from ${payload.sender?.fullName || 'someone'}`);
        }
      };

      socket.on('connect', handleConnect);
      socket.on('unread_count_updated', handleUnreadCount);
      socket.on('new_notification', handleNewNotification);
      socket.on('new_message', handleNewMessage);

      if (socket.connected) {
        handleConnect();
      }

      const interval = setInterval(() => {
        fetchSidebarMetrics();
        fetchNotifications();
      }, 120000);

      return () => {
        clearInterval(interval);
        socket.off('connect', handleConnect);
        socket.off('unread_count_updated', handleUnreadCount);
        socket.off('new_notification', handleNewNotification);
        socket.off('new_message', handleNewMessage);
      };
    }
  }, [user?._id, socket]);

  // Handle clicks outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
      if (jobSelectorRef.current && !jobSelectorRef.current.contains(event.target)) {
        setIsJobSelectorOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuGroups = [
    {
      title: 'Core Management',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/company-admin', permission: 'VIEW_DASHBOARD' },
        { icon: Briefcase, label: 'Projects/Jobs', path: '/company-admin/projects', permission: 'VIEW_PROJECTS' },
        { icon: ClipboardList, label: 'Tasks', path: '/company-admin/tasks', permission: 'VIEW_TASKS', badge: taskCount },
        { icon: MessageSquare, label: 'Chat', path: '/company-admin/chat', permission: 'VIEW_CHAT', badge: chatUnreadCount },
      ]
    },
    {
      title: 'Field Operations',
      items: [
        { icon: Clock, label: 'My Clock', path: '/company-admin/clock', permission: 'CLOCK_IN_OUT' },
        { icon: Users, label: 'Clock In Crew', path: '/company-admin/crew-clock', permission: 'CLOCK_IN_CREW' },
        { icon: Clock, label: 'Timesheets', path: '/company-admin/timesheets', permission: 'VIEW_TIMESHEETS' },
        { icon: FileText, label: 'Daily Logs', path: '/company-admin/daily-logs', permission: 'VIEW_DAILY_LOGS' },
        { icon: Users, label: 'Trade Management', path: '/company-admin/trades', permission: 'VIEW_DAILY_LOGS' },
        { icon: AlertCircle, label: 'Issues', path: '/company-admin/issues', permission: 'VIEW_ISSUES', badge: issueCount > 0 ? issueCount : null }
      ]
    },
    {
      title: 'Documentation',
      items: [
        { icon: PenTool, label: 'Drawings', path: '/company-admin/drawings', permission: 'VIEW_DRAWINGS' },
        { icon: Camera, label: 'Photos', path: '/company-admin/photos', permission: 'VIEW_PHOTOS' },
        { icon: Wrench, label: 'Equipment', path: '/company-admin/equipment', permission: 'VIEW_EQUIPMENT' },
        { icon: FileQuestion, label: 'RFIs', path: '/company-admin/rfi', permission: 'VIEW_RFI' },
      ]
    },
    {
      title: 'Finance & Admin',
      items: [
        { icon: DollarSign, label: 'Payroll', path: '/company-admin/payroll', permission: 'VIEW_PAYROLL' },
        { icon: ClipboardList, label: 'Purchase Orders', path: '/company-admin/purchase-orders', permission: 'VIEW_PO', badge: poCount > 0 ? poCount : null },
        { icon: FileText, label: 'Invoices', path: '/company-admin/invoices', permission: 'VIEW_INVOICES' },
        { icon: BarChart2, label: 'Reports', path: '/company-admin/project-intel', permission: 'VIEW_REPORTS' },
        // { icon: Activity
        // , label: 'Reports', path: '/company-admin/reports', permission: 'VIEW_REPORTS' },
        { icon: Users, label: 'Team', path: '/company-admin/team', permission: 'VIEW_TEAM' },
        { icon: Settings, label: 'Settings', path: '/company-admin/settings', permission: 'ACCESS_SETTINGS' },
      ]
    }
  ];

  const getFilteredGroups = () => {
    return menuGroups.map(group => ({
      ...group,
      items: group.items.filter(item => {
        // Self clock-in ("My Clock") is available to EVERY role
        if (item.label === 'My Clock') return true;
        
        // Company Owner and Super Admin have company-wide oversight across all modules
        if (user?.role === 'COMPANY_OWNER' || user?.role === 'SUPER_ADMIN') {
          return true;
        }

        // PM: Operational project management & execution. Block company-level finance (Payroll) & Settings.
        if (user?.role === 'PM') {
          if (item.label === 'Payroll' || item.permission === 'VIEW_PAYROLL') return false;
          if (item.label === 'Settings' || item.permission === 'ACCESS_SETTINGS') return false;
          return true;
        }

        const perms = user?.permissions || [];
        return perms.includes(item.permission);
      })
    })).filter(group => group.items.length > 0);
  };

  const filteredGroups = getFilteredGroups();

  return (
    <div className="flex h-screen bg-[#f3f4f7] text-slate-900 font-sans overflow-hidden">
      <style>{`
        .sidebar-nav-hide-scroll::-webkit-scrollbar { display: none; }
        .sidebar-nav-hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50 w-60 h-screen bg-[#0f172a] text-white flex flex-col transition-transform duration-300 ease-in-out border-r border-[#1e293b]
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* grid overlay */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(21,93,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(21,93,255,0.03) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="px-6 py-6 flex flex-col items-center justify-center relative z-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#155dff] to-[#4e8cff] rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative w-12 h-12 bg-[#0f172a] border border-[#1e293b] rounded-full flex items-center justify-center overflow-hidden">
              <img
                src={user?.companyDetails?.logo || user?.avatar || Logo}
                alt="Company Logo"
                className="h-full w-full object-contain p-1"
              />
            </div>
          </div>
          <div className="mt-3 text-center">
             <h4 className="text-xs font-black text-white tracking-wide truncate max-w-[190px]">
               {user?.companyDetails?.name || user?.fullName || 'KT Construct'}
             </h4>
             <div className="h-[2px] w-8 bg-[#155dff] mx-auto mt-1.5 mb-1.5 rounded-full"></div>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{user?.role?.replace(/_/g, ' ') || 'Admin'}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-6 sidebar-nav-hide-scroll relative z-10">
          {filteredGroups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <h3 className="px-3 text-[10px] font-bold text-[#64748b] uppercase tracking-widest">{group.title}</h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path || (item.path !== '/company-admin' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      className={`group flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all duration-200 relative
                        ${isActive
                          ? 'bg-[#155dff] text-white shadow-lg shadow-[#155dff]/25'
                          : 'text-[#94a3b8] hover:bg-white/[0.04] hover:text-white'
                        }
                      `}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
                        ${isActive ? 'bg-white/20' : 'bg-white/[0.04] border border-white/[0.05] group-hover:border-white/10 group-hover:bg-white/[0.08]'}
                      `}>
                        <item.icon size={15} />
                      </div>
                      <span className="text-xs font-semibold tracking-tight flex-1">{item.label}</span>
                      
                      {item.badge && (
                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold
                          ${isActive ? 'bg-white text-[#155dff]' : 'bg-[#155dff]/10 text-[#155dff] border border-[#155dff]/20'}
                        `}>
                          {item.badge}
                        </div>
                      )}

                      {isActive && (
                        <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Bottom */}
        <div className="p-5 border-t border-[#1e293b] space-y-4 relative z-10 bg-[#0f172a]/80 backdrop-blur-md">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black overflow-hidden
              ${user?.role === 'COMPANY_OWNER' ? 'bg-[#155dff]/10 text-[#155dff] border border-[#155dff]/20' : 'bg-white/[0.05] text-[#94a3b8] border border-white/[0.1]'}
            `}>
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <img src={Logo} alt="Logo" className="w-full h-full object-contain p-1" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-white leading-none">{user?.fullName || 'Admin'}</p>
              <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500 mt-1">{user?.role?.replace(/_/g, ' ') || 'Platform Root'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2.5 text-[#94a3b8] hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-200 text-xs font-bold uppercase tracking-wider"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 z-30 shrink-0">
          <div className="flex items-center gap-6 flex-1">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-slate-600 hover:text-slate-900"
            >
              <Menu size={24} />
            </button>

            {/* Job Selector */}
            <div className="relative max-w-sm hidden sm:block" ref={jobSelectorRef}>
              <button
                onClick={() => setIsJobSelectorOpen(!isJobSelectorOpen)}
                className="flex items-center gap-2.5 bg-[#f8fafc] border border-slate-200 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:border-slate-300 transition-all w-60"
              >
                <Search size={14} className="text-slate-400" />
                <div className="flex-1 text-left truncate flex flex-col leading-none">
                  <span className="truncate">{activeProject ? activeProject.name : 'Quick Select Job'}</span>
                  {activeProject?.isJob && activeProject?.projectName && (
                    <span className="text-[9px] text-slate-400 truncate mt-0.5 font-medium">Project: {activeProject.projectName}</span>
                  )}
                </div>
                <ChevronDown size={12} className={`text-slate-400 transition-transform ${isJobSelectorOpen ? 'rotate-180' : ''}`} />
              </button>
              {isJobSelectorOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-fade-in max-h-64 overflow-y-auto custom-scrollbar">
                  <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">
                    {['FOREMAN', 'WORKER', 'SUBCONTRACTOR'].includes(user?.role) ? 'Active Jobs' : 'Active Projects'}
                  </div>
                    {projectsList.filter(p => ['active', 'planning', 'on-hold'].includes(p.status)).length > 0 ? (
                      projectsList.filter(p => ['active', 'planning', 'on-hold'].includes(p.status)).map((project) => {
                        const statusCfg = {
                          active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-500' },
                          planning: { label: 'Planning', cls: 'bg-orange-50 text-orange-600 border-orange-100', dot: 'bg-orange-500' },
                          'on-hold': { label: 'On Hold', cls: 'bg-yellow-50 text-yellow-600 border-yellow-100', dot: 'bg-yellow-500' },
                          completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-500' },
                        }[project.status] || { label: project.status, cls: 'bg-slate-50 text-slate-600 border-slate-100', dot: 'bg-slate-500' };

                        return (
                          <button
                            key={project._id}
                            onClick={() => {
                              if (project.isJob) {
                                navigate(`/company-admin/projects/${project.projectId}/jobs/${project._id}`);
                              } else {
                                navigate(`/company-admin/projects/${project._id}`);
                              }
                              setIsJobSelectorOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm font-semibold flex items-center gap-3 transition-colors border-b border-slate-50 last:border-none"
                          >
                            <div className={`w-2 h-2 rounded-full shadow-sm shrink-0 ${statusCfg.dot}`}></div>
                            <div className="flex flex-col min-w-0 flex-1 leading-tight">
                              <span className="truncate">{project.name}</span>
                              {project.isJob && project.projectName && (
                                <span className="truncate text-[10px] text-slate-400 font-medium">Project: {project.projectName}</span>
                              )}
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusCfg.cls}`}>
                              {statusCfg.label}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                    <div className="px-4 py-3 text-xs text-slate-400 font-bold italic">
                      No {['FOREMAN', 'WORKER', 'SUBCONTRACTOR'].includes(user?.role) ? 'jobs' : 'projects'} found
                    </div>
                  )}
                  {!['FOREMAN', 'WORKER', 'SUBCONTRACTOR'].includes(user?.role) && (
                    <div className="p-2 mt-1">
                      <button
                        onClick={() => { navigate('/company-admin/projects'); setIsJobSelectorOpen(false); }}
                        className="w-full py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500 tracking-wider transition-all"
                      >
                        View All Projects
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-6">
            {/* Company Branding */}
            <div className="items-center gap-2.5 hidden md:flex">
              <img
                src={user?.companyDetails?.logo || user?.avatar || Logo}
                alt="Org Logo"
                className="w-7 h-7 rounded-lg object-contain p-0.5 border border-slate-200"
              />
              <div className="text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Organization</span>
                <div className="text-xs font-black text-slate-900 leading-none">
                  {user?.companyDetails?.name || user?.company?.name || user?.companyName || 'KT Construct'}
                </div>
              </div>
            </div>

            {/* Live self clock-in timer — persists across pages while clocked in */}
            {isClockedIn && (
              <button
                onClick={() => navigate('/company-admin/clock')}
                title="You are clocked in — view time clock"
                className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-all"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-bold tabular-nums leading-none">{formattedElapsed}</span>
              </button>
            )}

            <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 hover:bg-slate-50 rounded-lg transition relative group"
              >
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <MessageSquare size={20} className={chatUnreadCount > 0 ? 'text-blue-600' : 'text-slate-400'} />
                    {chatUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full border-2 border-white text-[10px] text-white flex items-center justify-center font-bold">
                        {chatUnreadCount}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Bell size={20} className={notifications.some(n => !n.isRead) ? 'text-orange-600' : 'text-slate-400'} />
                    {notifications.some(n => !n.isRead) && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white text-[10px] text-white flex items-center justify-center font-bold">
                        {notifications.filter(n => !n.isRead).length}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {isNotificationOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-fade-in max-h-[400px] flex flex-col">
                  <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alert Center</span>
                    <div className="flex gap-2">
                      {chatUnreadCount > 0 && <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase">Messages</span>}
                      {notifications.some(n => !n.isRead) && <span className="text-[9px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-bold uppercase">System</span>}
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {/* Chat Notification Entry */}
                    {chatUnreadCount > 0 && (
                      <button
                        onClick={() => { navigate('/company-admin/chat'); setIsNotificationOpen(false); }}
                        className="w-full text-left px-4 py-3 bg-blue-50/50 hover:bg-blue-50 transition-colors border-b border-slate-50 flex gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white shrink-0 flex items-center justify-center">
                          <MessageSquare size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800">New Messages</p>
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 leading-relaxed">You have {chatUnreadCount} unread transmissions.</p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0 animate-pulse"></div>
                      </button>
                    )}

                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <button
                          key={notif._id}
                          onClick={async () => {
                            if (!notif.isRead) await api.patch(`/notifications/${notif._id}/read`);
                            if (notif.link) navigate(notif.link);
                            setIsNotificationOpen(false);
                            fetchNotifications();
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none flex gap-3 ${!notif.isRead ? 'bg-orange-50/10' : ''}`}
                        >
                          <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center 
                            ${notif.type === 'financial' ? 'bg-emerald-50 text-emerald-600' :
                              notif.type === 'task' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'}`}>
                            {notif.type === 'financial' ? <DollarSign size={16} /> : <Bell size={16} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-800 truncate">{notif.title}</p>
                            <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">{notif.message}</p>
                            <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-tight">
                              {new Date(notif.createdAt).toLocaleDateString()} · {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {!notif.isRead && <div className="w-2 h-2 rounded-full bg-orange-600 mt-2 shrink-0"></div>}
                        </button>
                      ))
                    ) : chatUnreadCount === 0 && (
                      <div className="p-10 flex flex-col items-center justify-center text-center">
                        <Bell className="text-slate-200 mb-3" size={40} />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-tight">No active alerts</p>
                      </div>
                    )}
                  </div>
                  <div className="p-2 border-t border-slate-50 flex items-center justify-between gap-2">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await api.patch('/notifications/mark-all-read');
                          fetchNotifications();
                        } catch (err) {
                          console.error('Failed to mark all as read:', err);
                        }
                      }}
                      className="flex-1 py-2 text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors text-center"
                    >
                      Mark All as Read
                    </button>
                    <div className="w-[1px] h-3 bg-slate-200"></div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setShowClearConfirm(true);
                      }}
                      className="flex-1 py-2 text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors text-center"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>

            {/* User Profile */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-3 hover:bg-slate-50 p-1 pr-3 rounded-full border border-transparent hover:border-slate-200 transition"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm bg-slate-200 flex items-center justify-center">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <img src={Logo} alt="Profile" className="w-full h-full object-contain p-1" />
                  )}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-sm font-bold text-slate-900 leading-tight">
                    {user?.fullName || ''}
                  </p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${user?.role === 'SUBCONTRACTOR' ? 'text-orange-500' :
                    user?.role === 'WORKER' ? 'text-emerald-500' :
                      user?.role === 'FOREMAN' ? 'text-blue-500' :
                        user?.role === 'PM' ? 'text-violet-500' :
                          'text-slate-400'
                    }`}>
                    {user?.role?.replace(/_/g, ' ') || ''}
                  </p>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-fade-in">
                  <button
                    onClick={() => { navigate('/company-admin/settings'); setIsProfileMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                  >
                    <Users size={16} /> My Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium border-t border-slate-100 mt-1 pt-3"
                  >
                    <LogOut size={16} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ⏳ Free Trial Countdown Warning Banner */}
        {trialInfo.isTrialActive && !trialInfo.isExpired && trialInfo.daysRemaining !== null && (
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 text-white px-4 py-2.5 flex items-center justify-between shadow-md text-xs font-medium z-10">
            <div className="flex items-center gap-2">
              <span className="text-base">⏳</span>
              <span>
                <strong className="font-extrabold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded text-[11px] mr-1.5">Free Trial Active</strong>
                Your 7-day trial expires in <strong className="font-black text-amber-200">{trialInfo.daysRemaining} day{trialInfo.daysRemaining === 1 ? '' : 's'}</strong>. Upgrade now to preserve full project data and unlimited access.
              </span>
            </div>
            <button
              onClick={() => setShowPlansModal(true)}
              className="px-3.5 py-1 bg-white text-orange-700 hover:bg-orange-50 font-black rounded-lg text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-1 shrink-0"
            >
              <span>Upgrade Plan</span>
              <ChevronRight size={13} />
            </button>
          </div>
        )}

        {/* Dynamic Content */}
        <main className="flex-1 overflow-auto bg-[#f3f4f7] scroll-smooth p-3 md:p-4 px-1 md:px-2">
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Clear Notifications Confirmation Modal */}
      <Modal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear Notifications"
        maxWidth="max-w-sm"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h4 className="text-lg font-bold text-slate-800 mb-2">Are you sure?</h4>
          <p className="text-sm text-slate-500 mb-6">
            This will permanently remove all your notifications. This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowClearConfirm(false)}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  await api.delete('/notifications/clear-all');
                  fetchNotifications();
                  setShowClearConfirm(false);
                  setIsNotificationOpen(false);
                } catch (err) {
                  console.error('Failed to clear notifications:', err);
                }
              }}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-200"
            >
              Yes, Clear All
            </button>
          </div>
        </div>
      </Modal>

      {/* Trial Expired Lockout Modal */}
      <Modal
        isOpen={showTrialExpiredModal}
        onClose={() => {
          if (!trialInfo.isExpired) setShowTrialExpiredModal(false);
        }}
        maxWidth="max-w-xl"
        hideHeader={true}
        darkMode={true}
      >
        <div className="bg-[#0b0f19] p-6 md:p-8 rounded-3xl text-center border border-white/[0.08] shadow-2xl text-white relative">
          {/* Brand Lock Circle Icon */}
          <div className="w-16 h-16 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-500/20">
            <Lock size={28} className="text-orange-400" />
          </div>

          {/* Title */}
          <h3 className="text-2xl font-extrabold text-white mb-2 tracking-tight">
            Your 7-Day Free Trial Has Expired
          </h3>

          {/* Subtitle */}
          <p className="text-xs md:text-sm text-slate-400 leading-relaxed mb-6 px-2">
            Your 7-day free trial has completed. To restore full access to your projects, jobs, site logs, worker tracking, and financials, please choose an active subscription plan below.
          </p>

          {/* Access Blocked Banner */}
          <div className="bg-orange-500/10 border border-orange-500/25 rounded-2xl p-4 mb-6 text-left backdrop-blur-sm">
            <div className="text-xs font-bold text-orange-400 mb-1 flex items-center gap-1.5 uppercase tracking-wider">
              <span>⚠️</span> Account Access Locked
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Dashboard, Projects, Daily Logs, Team Members, and Reports are currently locked. Payment unlocks your workspace immediately.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* View Plans & Upgrade */}
            <button
              onClick={() => {
                setShowTrialExpiredModal(false);
                setShowPlansModal(true);
              }}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 transition-all text-xs uppercase tracking-wider"
            >
              <span className="text-sm">⚡</span> Choose Subscription Plan
            </button>

            {/* Direct Standard Plan Checkout */}
            <button
              onClick={() => {
                handleRazorpayBuyPlan(1299, 'Standard Plan');
              }}
              className="w-full py-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.15] text-amber-300 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wider"
            >
              <span>⭐</span> Buy Standard Plan (₹1,299/mo)
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer text-center block w-full pt-2 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </Modal>

      {/* Subscription Plans Modal (Matching Screenshot 1) */}
      <Modal
        isOpen={showPlansModal}
        onClose={() => {
          if (!trialInfo.isExpired) setShowPlansModal(false);
        }}
        maxWidth="max-w-5xl"
        darkMode={true}
        hideHeader={false}
        title="Upgrade Your Subscription Plan"
      >
        <div className="p-4 md:p-6 space-y-6">
          <div className="text-center max-w-lg mx-auto">
            <h3 className="text-xl md:text-2xl font-black tracking-tight text-white">Choose Your Growth Plan</h3>
            <p className="text-xs text-slate-400 mt-1">Unlock unrestricted access to projects, field operations, blueprints, and analytics.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(plansList && plansList.length > 0 ? plansList : [
              { id: 'starter', name: 'STARTER PLAN', price: 999, period: 'month', isPopular: false, tag: 'SMALL TEAM', maxProjects: 3, maxJobs: 5, maxUsers: 5, features: ['Up to 3 Active Projects', 'Up to 5 Jobs', 'Up to 5 Team Members', 'Daily Site Logs & Receipts', 'Purchase Orders (PO) & Invoices'] },
              { id: 'standard', name: 'STANDARD PLAN', price: 1299, period: 'month', isPopular: true, tag: 'RECOMMENDED', maxProjects: 10, maxJobs: 25, maxUsers: 15, features: ['Everything in Starter Plan', 'Up to 10 Projects & 25 Jobs', 'Up to 15 Team Members', 'Interactive Gantt Schedules', 'GPS Crew Clock-in & Geofencing', 'Blueprint Center (25 GB)'] },
              { id: 'pro', name: 'PRO PLAN', price: 1499, period: 'month', isPopular: false, tag: 'UNCAPPED POWER', maxProjects: 50, maxJobs: 100, maxUsers: 50, features: ['Everything in Standard Plan', 'Up to 50 Projects & 100 Jobs', 'Up to 50 Team Members', 'AI-Powered Delay Forecasts', 'Full PO & Financial ERP', 'Priority 24/7 Dedicated Support'] },
            ])
            .filter(plan => plan.price > 0 && !plan.name.toLowerCase().includes('free') && !plan.name.toLowerCase().includes('trial') && !plan.name.toLowerCase().includes('custom'))
            .map((plan) => {
              const isPopular = Boolean(plan.isPopular || plan.tag === 'RECOMMENDED' || plan.name.includes('STANDARD'));
              return (
                <div
                  key={plan._id || plan.id}
                  className="rounded-3xl p-6 flex flex-col justify-between relative transition-all"
                  style={{
                    background: isPopular ? 'linear-gradient(180deg, rgba(22, 38, 70, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)' : 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(16px)',
                    border: isPopular ? '2px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.22)',
                    boxShadow: isPopular ? '0 16px 45px rgba(37, 99, 235, 0.35)' : '0 8px 30px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  {isPopular && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 14,
                        right: -30,
                        transform: 'rotate(45deg)',
                        background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                        color: '#ffffff',
                        fontSize: 9,
                        fontWeight: 900,
                        letterSpacing: '0.1em',
                        padding: '3px 32px',
                        textTransform: 'uppercase'
                      }}
                    >
                      POPULAR
                    </div>
                  )}

                  <div>
                    <div
                      style={{
                        display: 'inline-flex',
                        padding: '4px 10px',
                        borderRadius: 10,
                        background: isPopular ? 'rgba(37, 99, 235, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                        border: isPopular ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: isPopular ? '#60a5fa' : '#94a3b8',
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        marginBottom: 12
                      }}
                    >
                      {plan.tag || (isPopular ? 'RECOMMENDED' : 'SMALL TEAM')}
                    </div>

                    <h4 className="font-extrabold text-lg text-white mb-1">{plan.name}</h4>
                    <div className="flex items-baseline gap-1 my-3 pb-3 border-b border-white/[0.08]">
                      <span className="text-3xl font-black text-white">₹{plan.price?.toLocaleString('en-IN')}</span>
                      <span className="text-xs text-slate-400 font-semibold">/{plan.period || 'month'}</span>
                    </div>

                    <ul className="space-y-2.5 mb-6">
                      {(Array.isArray(plan.features)
                        ? plan.features
                        : ['Full Modules Access', 'Field Operations', 'Priority Support']
                      ).map((feat, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-snug">
                          <div className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                            <Check size={10} className="text-[#60a5fa]" strokeWidth={3} />
                          </div>
                          <span>{typeof feat === 'string' ? feat.replace(/_/g, ' ') : String(feat)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      setShowPlansModal(false);
                      handleRazorpayBuyPlan(plan.price, plan.name, plan._id || plan.id);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 16,
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: 'pointer',
                      border: isPopular ? 'none' : '1px solid rgba(59, 130, 246, 0.3)',
                      background: isPopular ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)' : 'rgba(255, 255, 255, 0.05)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      boxShadow: isPopular ? '0 4px 18px rgba(37, 99, 235, 0.45)' : 'none'
                    }}
                  >
                    <span>Choose Plan</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* ══ FIRST LOGIN: CHANGE PASSWORD MODAL ══ */}
      {showChangePasswordModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'rgba(4, 9, 20, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#0d1527',
            color: '#ffffff',
            borderRadius: 24,
            width: '100%',
            maxWidth: 460,
            overflow: 'hidden',
            border: '1.5px solid rgba(59, 130, 246, 0.35)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 50px rgba(37, 99, 235, 0.25)',
            position: 'relative',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)',
              padding: '22px 24px',
              color: '#ffffff',
              position: 'relative',
              borderBottom: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              <button
                onClick={() => {
                  setShowChangePasswordModal(false);
                  localStorage.removeItem('mustChangePassword');
                }}
                style={{
                  position: 'absolute',
                  top: 18,
                  right: 18,
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
              >
                <X size={18} />
              </button>
              <h3 style={{ fontSize: 19, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff' }}>
                🔐 Welcome! Please Change Your Password
              </h3>
              <p style={{ fontSize: 12.5, color: '#bfdbfe', margin: '6px 0 0', lineHeight: 1.4 }}>
                For account security on your new subscription, please choose your personal password.
              </p>
            </div>

            {/* Body Form */}
            <form onSubmit={handleChangePasswordSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password (min 6 characters)"
                  value={newPasswordValue}
                  onChange={e => setNewPasswordValue(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 12,
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1.5px solid rgba(59, 130, 246, 0.25)',
                    fontSize: 14,
                    color: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.25)'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={confirmPasswordValue}
                  onChange={e => setConfirmPasswordValue(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 12,
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1.5px solid rgba(59, 130, 246, 0.25)',
                    fontSize: 14,
                    color: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.25)'}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    localStorage.removeItem('mustChangePassword');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#94a3b8',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                >
                  Remind Me Later
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  style={{
                    flex: 2,
                    padding: '12px 18px',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: isUpdatingPassword ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 16px rgba(37, 99, 235, 0.5)',
                    letterSpacing: '0.02em',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => {
                    if (!isUpdatingPassword) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.7)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isUpdatingPassword) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(37, 99, 235, 0.5)';
                    }
                  }}
                >
                  {isUpdatingPassword ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyAdminLayout;
