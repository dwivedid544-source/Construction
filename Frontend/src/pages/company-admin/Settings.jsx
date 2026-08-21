import { 
  Save, Lock, Camera, Shield, CheckCircle, Loader, RefreshCw, 
  Trash2, ArrowLeft, MoreVertical, Archive, ShieldAlert,
  MapPin, Users, Briefcase, Calendar, DollarSign, Eye,
  LayoutGrid, List, Search, TrendingUp, FileText, Building2,
  Percent, CreditCard, Sparkles, SlidersHorizontal, Info
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';

const Settings = () => {
  const { user, updateUserData } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'invoice' || searchParams.get('tab') === 'template' ? 'invoice' : (searchParams.get('tab') || 'profile');
  const [activeTab, setActiveTab] = useState(initialTab); // 'profile', 'invoice', 'roles', 'archive'
  const [profile, setProfile] = useState({
    name: user?.fullName || '',
    email: user?.email || '',
    role: user?.role || '',
    avatar: user?.avatar || null,
    phone: user?.phone || '',
    address: user?.address || ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'invoice' || tabParam === 'template') {
      setActiveTab('invoice');
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchLatestProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        const userData = res.data;
        setProfile({
          name: userData.fullName || '',
          email: userData.email || '',
          role: userData.role || '',
          avatar: userData.avatar || null,
          phone: userData.phone || '',
          address: userData.address || ''
        });
        // Sync context too
        updateUserData(userData);
      } catch (error) {
        console.error('Error fetching latest profile:', error);
      }
    };
    
    fetchLatestProfile();
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      setIsUpdating(true);
      const data = new FormData();
      data.append('fullName', profile.name);
      data.append('email', profile.email);
      data.append('phone', profile.phone);
      data.append('address', profile.address);
      if (profile.avatarFile) {
        data.append('avatar', profile.avatarFile);
      }
      
      const res = await api.patch('/auth/profile', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Critical: Sync local auth context so Sidebar/Navbar update immediately
      updateUserData(res.data);
      
      toast.success("Profile details updated successfully.");
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Failed to update profile.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (password.new !== password.confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    try {
      await api.patch('/auth/updatepassword', { newPassword: password.new });
      toast.success("Password reset successfully.");
      setPassword({ current: '', new: '', confirm: '' });
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error.response?.data?.message || "Failed to reset password.");
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfile({ ...profile, avatarFile: file, avatarPreview: URL.createObjectURL(file) });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500 text-sm">Manage your personal information, security, and project archives.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-px overflow-x-auto">
        <button
          onClick={() => { setActiveTab('profile'); setSearchParams({ tab: 'profile' }); }}
          className={`px-6 py-4 text-sm font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap
            ${activeTab === 'profile' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Profile & Security
          {activeTab === 'profile' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full shadow-lg shadow-blue-200" />}
        </button>
        {user?.role === 'COMPANY_OWNER' && (
          <button
            onClick={() => { setActiveTab('invoice'); setSearchParams({ tab: 'invoice' }); }}
            className={`px-6 py-4 text-sm font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 whitespace-nowrap
              ${activeTab === 'invoice' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <FileText size={16} />
            Invoice Template
            {activeTab === 'invoice' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full shadow-lg shadow-blue-200" />}
          </button>
        )}
        {user?.role === 'COMPANY_OWNER' && (
          <button
            onClick={() => { setActiveTab('roles'); setSearchParams({ tab: 'roles' }); }}
            className={`px-6 py-4 text-sm font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap
              ${activeTab === 'roles' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Role Management
            {activeTab === 'roles' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full shadow-lg shadow-blue-200" />}
          </button>
        )}
        {user?.role === 'COMPANY_OWNER' && (
          <button
            onClick={() => { setActiveTab('archive'); setSearchParams({ tab: 'archive' }); }}
            className={`px-6 py-4 text-sm font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap
              ${activeTab === 'archive' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Project Archive
            {activeTab === 'archive' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full shadow-lg shadow-blue-200" />}
          </button>
        )}
      </div>

      <div className="space-y-6">
        {activeTab === 'profile' && <>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Personal Details</h3>
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="flex items-center gap-6 mb-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-600 overflow-hidden border-4 border-slate-50">
                      {profile.avatarPreview || profile.avatar ? (
                        <img src={profile.avatarPreview || profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        profile.name.split(' ').map(n => n[0]).join('')
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-slate-100 text-blue-600 hover:scale-110 transition cursor-pointer">
                      <Camera size={16} />
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">{profile.name}</h4>
                    <p className="text-slate-500 text-sm">{profile.role}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                    <input
                      type="text"
                      value={profile.role}
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
                    <input
                      type="text"
                      value={profile.phone}
                      placeholder="e.g. +1 234 567 890"
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={profile.address}
                      placeholder="e.g. 123 Construction St, New York, NY"
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button 
                    type="submit" 
                    disabled={isUpdating}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition shadow-lg shadow-blue-200 disabled:opacity-50"
                  >
                    {isUpdating ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
                    {isUpdating ? 'Updating...' : 'Update Details'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4 flex items-center gap-2">
                <Lock size={20} className="text-blue-600" /> Security
              </h3>
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                    <input
                      type="password"
                      value={password.new}
                      onChange={(e) => setPassword({ ...password, new: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={password.confirm}
                      onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-lg font-medium transition shadow-lg">
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          </>
        }

        {/* Invoice Template Section - Only for Company Admin */}
        {activeTab === 'invoice' && user?.role === 'COMPANY_OWNER' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <InvoiceTemplateSettings />
          </div>
        )}

        {/* Role Management Section - Only for Company Admin */}
        {activeTab === 'roles' && user?.role === 'COMPANY_OWNER' && <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4 flex items-center gap-2">
              <Shield size={20} className="text-blue-600" /> Role Management
            </h3>

            <RoleSettings />
          </div>
        }

        {/* Project Archive Section - Only for Company Admin */}
        {activeTab === 'archive' && user?.role === 'COMPANY_OWNER' && <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4 flex items-center gap-2">
              <RefreshCw size={20} className="text-blue-600" /> Project Archive
            </h3>

            <ProjectArchive />
          </div>
        }
      </div>
    </div>
  );
};

const RoleSettings = () => {
  const [activeRole, setActiveRole] = useState('PM');
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allPermissions, setAllPermissions] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleDisplayNames = {
    'PM': 'Project Manager',
    'FOREMAN': 'Foreman',
    'WORKER': 'Worker',
    'SUBCONTRACTOR': 'Subcontractor',
    'CLIENT': 'Client',
    'COMPANY_OWNER': 'Company Owner'
  };

  const permissionLabels = {
    'VIEW_DASHBOARD': 'Dashboard',
    'VIEW_PROJECTS': 'Jobs',
    'VIEW_TASKS': 'Tasks',
    'CLOCK_IN_OUT': 'My Clock',
    'CLOCK_IN_CREW': 'Clock In Crew',
    'VIEW_TIMESHEETS': 'Timesheets',
    'VIEW_DAILY_LOGS': 'Daily Logs',
    'VIEW_DRAWINGS': 'Drawings',
    'VIEW_PHOTOS': 'Photos',
    'VIEW_EQUIPMENT': 'Equipment',
    'VIEW_PO': 'Purchase Orders',
    'VIEW_INVOICES': 'Invoices',
    'VIEW_CHAT': 'Chat',
    'VIEW_RFI': 'RFI',
    'VIEW_REPORTS': 'Reports',
    'VIEW_PAYROLL': 'Payroll',
    'VIEW_TEAM': 'Users',
    'VIEW_ISSUES': 'Issues',
    'VIEW_PROFILE': 'My Profile',
    'ACCESS_SETTINGS': 'Settings',
  };

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/roles');
      const permissionsMap = {};
      response.data.forEach(r => {
        permissionsMap[r.name] = r.permissions;
      });
      setAllPermissions(permissionsMap);
      const ALLOWED_ROLES = ['PM', 'FOREMAN', 'WORKER', 'SUBCONTRACTOR', 'CLIENT'];
      setRoles(response.data.filter(r => ALLOWED_ROLES.includes(r.name)));
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleToggle = (perm) => {
    const currentPerms = allPermissions[activeRole] || [];
    const newPerms = currentPerms.includes(perm)
      ? currentPerms.filter(p => p !== perm)
      : [...currentPerms, perm];

    setAllPermissions({
      ...allPermissions,
      [activeRole]: newPerms
    });
  };

  const handleSaveRoles = async () => {
    try {
      setIsSubmitting(true);
      await api.put(`/roles/${activeRole}`, { permissions: allPermissions[activeRole] });
      toast.success(`Permissions for ${roleDisplayNames[activeRole] || activeRole} updated successfully.`);
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error("Failed to save permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSave = async () => {
    try {
      setIsSubmitting(true);
      const roleUpdates = Object.entries(allPermissions).map(([roleName, permissions]) => ({
        roleName,
        permissions
      }));
      await api.put(`/roles/bulk`, { roleUpdates });
      toast.success("All role permissions updated successfully.");
    } catch (error) {
      console.error('Error in bulk saving permissions:', error);
      toast.error("Failed to save all permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Role Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {roles.map(role => (
          <button
            key={role.name}
            onClick={() => setActiveRole(role.name)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeRole === role.name
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            {roleDisplayNames[role.name] || role.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(permissionLabels).map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition cursor-pointer group">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${allPermissions[activeRole]?.includes(key)
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white border-slate-300 group-hover:border-blue-400'
              }`}>
              {allPermissions[activeRole]?.includes(key) && <CheckCircle size={14} />}
            </div>
            <input
              type="checkbox"
              className="hidden"
              checked={allPermissions[activeRole]?.includes(key) || false}
              onChange={() => handleToggle(key)}
            />
            <span className="text-sm text-slate-700 font-medium">{label}</span>
          </label>
        ))}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-slate-50">
        <button
          onClick={handleBulkSave}
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-lg font-bold transition disabled:opacity-50"
        >
          {isSubmitting ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
          Save All Role Changes
        </button>
        <button
          onClick={handleSaveRoles}
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold transition shadow-lg shadow-blue-200 disabled:opacity-50"
        >
          {isSubmitting ? <Loader size={18} className="animate-spin" /> : <Shield size={18} />}
          Save {roleDisplayNames[activeRole] || activeRole} Only
        </button>
      </div>
    </div>
  );
};

const ProjectArchive = () => {
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');

  const getLocationStr = (loc) => {
    if (!loc) return '';
    if (typeof loc === 'object') {
      const addr = loc.address || loc.formatted_address;
      if (typeof addr === 'string') return addr;
      if (typeof addr === 'object' && addr !== null) return addr.address || addr.formatted_address || '';
      return '';
    }
    return String(loc);
  };


  const fetchArchived = async () => {
    try {
      setLoading(true);
      const res = await api.get('/projects/archived');
      setArchivedProjects(res.data);
    } catch (err) {
      console.error('Error fetching archived projects:', err);
      toast.error('Failed to load archived projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchived();
  }, []);

  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [projectToRestore, setProjectToRestore] = useState(null);

  const handleRestoreClick = (project) => {
    setProjectToRestore(project);
    setIsRestoreModalOpen(true);
  };

  const confirmRestore = async () => {
    if (!projectToRestore) return;
    try {
      setActionLoading(projectToRestore._id);
      setIsRestoreModalOpen(false);
      await api.patch(`/projects/${projectToRestore._id}/restore`);
      toast.success('Project restored successfully');
      fetchArchived();
    } catch (err) {
      console.error('Restore error:', err);
      toast.error('Failed to restore project');
    } finally {
      setActionLoading(null);
      setProjectToRestore(null);
    }
  };

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewProject, setViewProject] = useState(null);

  const handleViewDetails = (project) => {
    setViewProject(project);
    setIsViewModalOpen(true);
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const handlePermanentDeleteClick = (project) => {
    setProjectToDelete(project);
    setIsDeleteModalOpen(true);
  };

  const confirmPermanentDelete = async () => {
    if (!projectToDelete) return;
    try {
      setActionLoading(projectToDelete._id);
      setIsDeleteModalOpen(false);
      await api.delete(`/projects/${projectToDelete._id}/permanent`);
      toast.success('Project permanently deleted');
      fetchArchived();
    } catch (err) {
      console.error('Permanent delete error:', err);
      toast.error('Failed to permanently delete project');
    } finally {
      setActionLoading(null);
      setProjectToDelete(null);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader className="animate-spin text-blue-600" /></div>;

  const filtered = archivedProjects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getLocationStr(p.location).toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <div className="space-y-6">
      {/* Search and Toggles */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search archive..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center gap-4 text-slate-300">
          <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-2">
            <Archive size={32} className="opacity-20" />
          </div>
          <p className="font-black uppercase tracking-[0.2em] text-[10px]">No Archived Projects Found</p>
          {searchTerm && <button onClick={() => setSearchTerm('')} className="text-blue-600 text-xs font-bold hover:underline">Clear Search</button>}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(project => (
            <div key={project._id} className="group bg-white rounded-[28px] md:rounded-[36px] border border-slate-200/60 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 overflow-hidden flex flex-col relative">
              
              {/* Image & Header Info */}
              <div className="relative h-44 md:h-56 shrink-0 bg-slate-900">
                <img 
                  src={project.image || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800'} 
                  alt={project.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                
                <div className="absolute top-4 left-4">
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-400/50 text-slate-300 bg-slate-900/50 backdrop-blur-md shadow-lg">
                    ARCHIVED
                  </span>
                </div>
                
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 text-white/80 mb-0.5">
                    <MapPin size={11} className="text-blue-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest truncate">
                      {getLocationStr(project.location) || 'Location TBD'}
                    </span>

                  </div>
                  <h3 className="text-lg md:text-xl font-black text-white tracking-tight drop-shadow-md truncate">{project.name}</h3>
                  <div className="flex items-center gap-2 text-white/60 mt-0.5">
                    <Users size={11} className="text-blue-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest truncate">
                      PM: {project.pmIds && project.pmIds.length > 0 
                        ? project.pmIds.map(p => p.fullName).join(', ') 
                        : (project.pmId?.fullName || 'Unassigned')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 md:p-5 space-y-4 flex-1 flex flex-col justify-between">
                
                {/* Progress Section */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-[8.5px] md:text-[9.5px] font-black text-slate-400 uppercase tracking-widest leading-none">
                      <TrendingUp size={11} className="text-blue-500" />
                      <span>Progress</span>
                    </div>
                    <span className="text-[10px] md:text-xs font-black text-slate-900">{project.progress || 0}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/30">
                    <div className="h-full bg-blue-600 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(37,99,235,0.3)]"
                      style={{ width: `${project.progress || 0}%` }} />
                  </div>
                </div>

                {/* Client + Budget */}
                <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-100/50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-50 rounded-lg shrink-0"><Users size={11} className="text-slate-400" /></div>
                    <div className="min-w-0">
                      <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-tight leading-none mb-1">Client</p>
                      <p className="text-[10px] md:text-[11px] font-bold text-slate-700 truncate leading-none">
                        {project.clientId?.fullName || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end text-right">
                    <div className="min-w-0">
                      <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-tight leading-none mb-1">Budget</p>
                      <p className="text-[10px] md:text-[11px] font-black text-slate-900 leading-none">${(Number(project.budget) || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-1.5 bg-emerald-50 rounded-lg shrink-0"><DollarSign size={11} className="text-emerald-500" /></div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleViewDetails(project)}
                    className="p-2 md:p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-emerald-600 rounded-lg md:rounded-xl transition-all border border-slate-200/50 flex items-center justify-center shrink-0 shadow-sm"
                    title="View Details"
                  >
                    <Eye size={13} />
                  </button>
                  
                  <button
                    onClick={() => handleRestoreClick(project)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white py-2 rounded-lg md:rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    <RefreshCw size={13} className={actionLoading === project._id ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Restore</span>
                  </button>
                  
                  <button
                    onClick={() => handlePermanentDeleteClick(project)}
                    className="p-2 md:p-2.5 bg-red-50 hover:bg-red-100 text-red-300 hover:text-red-600 rounded-lg md:rounded-xl transition-all border border-red-100/50 shrink-0 shadow-sm"
                    title="Delete Forever"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(project => (
            <div key={project._id} className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center justify-between group hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm shrink-0">
                  <img src={project.image || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=200'} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-slate-900 text-sm tracking-tight uppercase truncate">{project.name}</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      {project.pmIds && project.pmIds.length > 0 
                        ? project.pmIds.map(p => p.fullName).join(', ') 
                        : (project.pmId?.fullName || 'N/A')}
                    </span>
                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">${(project.budget || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewDetails(project)}
                  className="p-2.5 bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white rounded-xl transition-all"
                  title="View Details"
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={() => handleRestoreClick(project)}
                  className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all"
                  title="Restore Project"
                >
                  <RefreshCw size={14} className={actionLoading === project._id ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => handlePermanentDeleteClick(project)}
                  className="p-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                  title="Permanent Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Permanent Deletion" maxWidth="max-w-md">
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 border border-red-100 animate-pulse">
            <ShieldAlert size={40} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight uppercase">Critical Action!</h3>
          <p className="text-slate-500 font-bold mb-8 max-w-xs text-sm">
            Are you sure you want to permanently delete <span className="text-red-600">"{projectToDelete?.name}"</span>? This will erase all associated data forever.
          </p>
          <div className="flex gap-4 w-full">
            <button 
              onClick={() => setIsDeleteModalOpen(false)} 
              className="flex-1 px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition font-black text-xs uppercase tracking-widest"
            >
              Cancel
            </button>
            <button 
              onClick={confirmPermanentDelete} 
              className="flex-1 px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition font-black text-xs uppercase tracking-widest shadow-xl shadow-red-200"
            >
              Delete Forever
            </button>
          </div>
        </div>
      </Modal>

      {/* Restore Confirmation Modal */}
      <Modal isOpen={isRestoreModalOpen} onClose={() => setIsRestoreModalOpen(false)} title="Restore Project" maxWidth="max-w-md">
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 border border-blue-100 shadow-sm">
            <RefreshCw size={40} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight uppercase">Restore Project?</h3>
          <p className="text-slate-500 font-bold mb-8 max-w-xs text-sm">
            This will move <span className="text-blue-600">"{projectToRestore?.name}"</span> back to active projects.
          </p>
          <div className="flex gap-4 w-full">
            <button 
              onClick={() => setIsRestoreModalOpen(false)} 
              className="flex-1 px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition font-black text-xs uppercase tracking-widest"
            >
              Cancel
            </button>
            <button 
              onClick={confirmRestore} 
              className="flex-1 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200"
            >
              Restore Now
            </button>
          </div>
        </div>
      </Modal>

      {/* View Details Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Archived Project Details" maxWidth="max-w-2xl">
        {viewProject && (
          <div className="space-y-6">
            <div className="flex items-start gap-6 pb-6 border-b border-slate-100">
                <div className="w-24 h-24 rounded-3xl overflow-hidden shrink-0 border-4 border-white shadow-xl bg-slate-100 flex items-center justify-center">
                    {viewProject.image ? (
                        <img src={viewProject.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <Archive size={40} className="text-slate-300" />
                    )}
                </div>
                <div className="flex-1 pt-2">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200">
                            ARCHIVED
                        </span>
                        <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{viewProject.progress || 0}% Final State</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{viewProject.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-slate-400 font-bold text-xs uppercase tracking-widest">
                        <MapPin size={12} className="text-blue-500" />
                        {getLocationStr(viewProject.location) || 'No location provided'}
                    </div>

                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Project Manager(s)</p>
                        <div className="flex items-center gap-2">
                            <Users size={14} className="text-blue-500" />
                            <span className="text-sm font-black text-slate-800">
                                {viewProject.pmIds && viewProject.pmIds.length > 0 
                                    ? viewProject.pmIds.map(p => p.fullName).join(', ') 
                                    : (viewProject.pmId?.fullName || 'N/A')}
                            </span>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Client Name</p>
                        <div className="flex items-center gap-2">
                            <Briefcase size={14} className="text-blue-500" />
                            <span className="text-sm font-black text-slate-800">{viewProject.clientId?.fullName || 'No Client Assigned'}</span>
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contract Duration</p>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-blue-500" />
                                <span className="text-xs font-bold text-slate-600">Start: {viewProject.startDate ? new Date(viewProject.startDate).toLocaleDateString() : 'TBD'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-orange-500" />
                                <span className="text-xs font-bold text-slate-600">End: {viewProject.endDate ? new Date(viewProject.endDate).toLocaleDateString() : 'TBD'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                        <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Settled Budget</p>
                        <div className="flex items-center gap-2">
                            <DollarSign size={14} className="text-emerald-600" />
                            <span className="text-sm font-black text-emerald-700">${(Number(viewProject.budget) || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button 
                    onClick={() => setIsViewModalOpen(false)}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl"
                >
                    Close View
                </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const InvoiceTemplateSettings = () => {
  const [template, setTemplate] = useState({
    companyName: '',
    email: '',
    phone: '',
    address: '',
    taxNumber: '',
    defaultTaxRate: 15,
    defaultPaymentTerms: 'Net 15',
    bankDetails: '',
    notes: '',
    terms: ''
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchTemplateSettings = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/companies/my-company');
        if (data) {
          const inv = data.invoiceSettings || {};
          setTemplate({
            companyName: inv.companyName || data.name || 'KT Construction Ltd',
            email: inv.email || data.email || 'company@gmail.com',
            phone: inv.phone || data.phone || '1234567890',
            address: inv.address || data.address || 'Corporate Suite 402, Apex Business Park, Indore, MP',
            taxNumber: inv.taxNumber || '',
            defaultTaxRate: inv.defaultTaxRate !== undefined ? inv.defaultTaxRate : 15,
            defaultPaymentTerms: inv.defaultPaymentTerms || 'Net 15',
            bankDetails: inv.bankDetails || 'Bank: HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0000240',
            notes: inv.notes || 'Thank you for your business. Please ensure timely payment by the due date.',
            terms: inv.terms || 'This accounting software is designed to assist users in managing financial data such as invoices, expenses, payments, reports, and tax-related records. All information and reports generated by the system depend on the data entered by the user.'
          });
        }
      } catch (error) {
        console.error('Error fetching invoice template settings:', error);
        toast.error('Failed to load invoice template settings.');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplateSettings();
  }, []);

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.patch('/companies/invoice-template', template);
      toast.success('Invoice template settings updated successfully!');
    } catch (error) {
      console.error('Error updating invoice template:', error);
      toast.error(error.response?.data?.message || 'Failed to update invoice template.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin text-blue-600" size={32} />
          <p className="text-slate-500 text-sm font-semibold">Loading Invoice Template Configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-lg shadow-blue-500/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-amber-300" />
            <h2 className="text-xl font-black tracking-tight">Invoice Template & Branding</h2>
          </div>
          <p className="text-blue-100 text-xs font-medium max-w-xl">
            Configure your official company billing address, issuer details, default tax rates, and notes printed on all client invoices and PDF downloads.
          </p>
        </div>
        <button
          onClick={handleSaveTemplate}
          disabled={isSaving}
          className="flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md disabled:opacity-50 whitespace-nowrap"
        >
          {isSaving ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
          {isSaving ? 'Saving Changes...' : 'Save Template'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <form onSubmit={handleSaveTemplate} className="lg:col-span-7 space-y-6">
          {/* Section 1: Company / Issuer Billing Details */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 size={18} className="text-blue-600" />
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Company / Issuer Info (Header)</h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company Display Name</label>
              <input
                type="text"
                value={template.companyName}
                onChange={(e) => setTemplate({ ...template, companyName: e.target.value })}
                placeholder="e.g. KT Construction Ltd"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Official Head Office / Billing Address</span>
                <span className="text-[10px] text-blue-600 font-black bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  Printed on Invoice Header
                </span>
              </label>
              <textarea
                rows={2}
                value={template.address}
                onChange={(e) => setTemplate({ ...template, address: e.target.value })}
                placeholder="e.g. Corporate Suite 402, Apex Business Park, Indore, MP 452010"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
                <Info size={12} className="text-slate-400" />
                This is your corporate company address. Individual site / delivery addresses will appear in the <strong>"Ship To"</strong> section.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Billing Contact Email</label>
                <input
                  type="email"
                  value={template.email}
                  onChange={(e) => setTemplate({ ...template, email: e.target.value })}
                  placeholder="billing@company.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Billing Phone Number</label>
                <input
                  type="text"
                  value={template.phone}
                  onChange={(e) => setTemplate({ ...template, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tax ID / GSTIN / VAT Number</label>
              <input
                type="text"
                value={template.taxNumber}
                onChange={(e) => setTemplate({ ...template, taxNumber: e.target.value })}
                placeholder="e.g. GSTIN: 23AAAAA0000A1Z5 / Tax ID: US-98765432"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 uppercase tracking-wider focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Section 2: Financial Defaults & Bank Details */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard size={18} className="text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Financial & Payment Terms</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Default Tax Rate (%)</span>
                  <Percent size={14} className="text-slate-400" />
                </label>
                <input
                  type="number"
                  step="any"
                  value={template.defaultTaxRate}
                  onChange={(e) => setTemplate({ ...template, defaultTaxRate: e.target.value })}
                  placeholder="15"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Default Payment Terms</label>
                <input
                  type="text"
                  value={template.defaultPaymentTerms}
                  onChange={(e) => setTemplate({ ...template, defaultPaymentTerms: e.target.value })}
                  placeholder="e.g. Net 15 Days, Due on Receipt"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bank Remittance & Transfer Details</label>
              <textarea
                rows={2}
                value={template.bankDetails}
                onChange={(e) => setTemplate({ ...template, bankDetails: e.target.value })}
                placeholder="e.g. Bank: HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0000240 | UPI: ktconstruction@okhdfcbank"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Section 3: Notes & Legal Terms */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText size={18} className="text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Invoice Footer Notes & Terms</h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Default Invoice Notes</label>
              <textarea
                rows={2}
                value={template.notes}
                onChange={(e) => setTemplate({ ...template, notes: e.target.value })}
                placeholder="Thank you for your business. Please make payment before the due date."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Terms & Conditions Disclaimer</label>
              <textarea
                rows={3}
                value={template.terms}
                onChange={(e) => setTemplate({ ...template, terms: e.target.value })}
                placeholder="Standard commercial and legal terms shown on invoices..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600 focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
              >
                {isSaving ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
                {isSaving ? 'Saving...' : 'Save Template Settings'}
              </button>
            </div>
          </div>
        </form>

        {/* Live Preview Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Eye size={14} className="text-blue-600" />
                Live Invoice Preview
              </span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Real-time Sync
              </span>
            </div>

            {/* Mock Invoice Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-xs">
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1 max-w-[60%]">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-xs mb-2">
                      KT
                    </div>
                    <h4 className="font-black text-slate-900 text-sm leading-tight">{template.companyName || 'Company Name'}</h4>
                    <p className="text-[11px] text-slate-500 italic">{template.email || 'billing@company.com'}</p>
                    <p className="text-[11px] text-slate-500">{template.phone || '+1 234 567 890'}</p>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{template.address || 'Corporate Office Address'}</p>
                    {template.taxNumber && (
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-0.5">
                        Tax ID: {template.taxNumber}
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Invoice</h3>
                    <p className="text-[10px] font-bold text-slate-400">#INV-001</p>
                    <p className="text-[10px] font-bold text-slate-400">Issue: {new Date().toLocaleDateString()}</p>
                    <p className="text-[10px] font-bold text-slate-400">Terms: <span className="text-slate-800">{template.defaultPaymentTerms}</span></p>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Billing vs Shipping Info */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">VENDOR:</span>
                    <p className="font-bold text-slate-900 text-[11px]">Singhaniya Materials Ltd</p>
                    <p className="text-[10px] text-slate-500">singha@materials.com</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block flex items-center justify-end gap-1">
                      <span>SHIP TO:</span>
                      <span className="text-[8px] text-blue-600 bg-blue-50 px-1 rounded font-bold">Site</span>
                    </span>
                    <p className="font-bold text-slate-900 text-[11px]">House 001 Construction Site</p>
                    <p className="text-[10px] text-slate-500">14/608, Sudama Nagar, Indore, MP</p>
                  </div>
                </div>

                {/* Table Preview */}
                <div className="rounded-xl border border-slate-100 overflow-hidden bg-white">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 uppercase">
                      <tr>
                        <th className="p-2">Item Description</th>
                        <th className="p-2 text-center">Qty</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700">
                      <tr>
                        <td className="p-2 font-medium">Plumbing Pipes 8 mm</td>
                        <td className="p-2 text-center">25</td>
                        <td className="p-2 text-right font-bold text-slate-900">$125.00</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">Plumbing Pipes 10 mm</td>
                        <td className="p-2 text-center">15</td>
                        <td className="p-2 text-right font-bold text-slate-900">$150.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-800">$275.00</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Estimated Tax ({template.defaultTaxRate || 15}%):</span>
                    <span className="text-amber-600 font-bold">+${((275 * (Number(template.defaultTaxRate) || 15)) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="font-black text-slate-900 uppercase text-[10px] tracking-wider">Grand Total:</span>
                    <span className="text-sm font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                      ${(275 + (275 * (Number(template.defaultTaxRate) || 15)) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Footer Notes Preview */}
                <div className="pt-3 border-t border-slate-100 space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Notes & Terms</span>
                  <p className="text-[9px] text-slate-500 leading-relaxed line-clamp-2">{template.notes}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
