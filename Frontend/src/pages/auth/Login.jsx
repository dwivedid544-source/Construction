import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, Lock, ArrowRight, Loader, ShieldCheck, Building2, 
  HardHat, Wrench, UserCheck, ArrowLeft, CheckCircle2, 
  Key, Sparkles, ClipboardList, User, DraftingCompass
} from 'lucide-react';
import Logo from '../../assets/images/Logo.png';

const DASHBOARDS = [
  {
    id: 'super-admin',
    roleCode: 'SUPER_ADMIN',
    title: 'Super Admin',
    subtitle: 'System Control & Billing',
    email: 'superadmin@gmail.com',
    password: '123456',
    icon: ShieldCheck,
    badge: 'SYSTEM ADMIN',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(29,78,216,0.05) 100%)',
    borderGlow: 'rgba(59,130,246,0.3)',
    btnGradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    description: 'Manage enterprise accounts, system logs, subscription plans, global users, and support tickets.'
  },
  {
    id: 'company-admin',
    roleCode: 'COMPANY_OWNER',
    title: 'Company Owner / Admin',
    subtitle: 'Business & Operations Hub',
    email: 'admin@gmail.com',
    password: '123456',
    icon: Building2,
    badge: 'COMPANY OWNER',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(109,40,217,0.05) 100%)',
    borderGlow: 'rgba(139,92,246,0.3)',
    btnGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    description: 'Oversee company projects, team management, master schedules, estimates, invoices & financial reports.'
  },
  {
    id: 'pm',
    roleCode: 'PM',
    title: 'Project Manager',
    subtitle: 'Site & Project Management',
    email: 'pm@gmail.com',
    password: '123456',
    icon: HardHat,
    badge: 'PROJECT MANAGER',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(14,116,144,0.05) 100%)',
    borderGlow: 'rgba(6,182,212,0.3)',
    btnGradient: 'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
    description: 'Control job execution, trade workflows, RFIs, daily logs, drawings, equipment & site teams.'
  },
  {
    id: 'foreman',
    roleCode: 'FOREMAN',
    title: 'Site Foreman',
    subtitle: 'Site Supervision & Daily Logs',
    email: 'foreman@gmail.com',
    password: '123456',
    icon: ClipboardList,
    badge: 'SITE FOREMAN',
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, rgba(236,72,153,0.2) 0%, rgba(190,24,93,0.05) 100%)',
    borderGlow: 'rgba(236,72,153,0.3)',
    btnGradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    description: 'Submit daily logs, manage site safety, track site issues, and perform crew time clock-ins.'
  },
  {
    id: 'engineer',
    roleCode: 'ENGINEER',
    title: 'Site Engineer',
    subtitle: 'Drawings & Technical Specs',
    email: 'engineer@gmail.com',
    password: '123456',
    icon: DraftingCompass,
    badge: 'SITE ENGINEER',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(67,56,202,0.05) 100%)',
    borderGlow: 'rgba(99,102,241,0.3)',
    btnGradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    description: 'Review structural drawings, process architectural RFIs, deficiency checks, and project specs.'
  },
  {
    id: 'worker',
    roleCode: 'WORKER',
    title: 'Field Worker',
    subtitle: 'Tasks & Time Punching',
    email: 'worker@gmail.com',
    password: '123456',
    icon: User,
    badge: 'FIELD WORKER',
    color: '#14b8a6',
    gradient: 'linear-gradient(135deg, rgba(20,184,166,0.2) 0%, rgba(15,118,110,0.05) 100%)',
    borderGlow: 'rgba(20,184,166,0.3)',
    btnGradient: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
    description: 'View assigned daily tasks, log personal time hours, upload site photos, and check work schedules.'
  },
  {
    id: 'contractor',
    roleCode: 'SUBCONTRACTOR',
    title: 'Trade Contractor',
    subtitle: 'Bids & Subcontractor Tasks',
    email: 'contractor@gmail.com',
    password: '123456',
    icon: Wrench,
    badge: 'SUBCONTRACTOR',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(180,83,9,0.05) 100%)',
    borderGlow: 'rgba(245,158,11,0.3)',
    btnGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    description: 'Access trade packages, submit bid quotes, respond to RFIs, track assigned site tasks & clock in.'
  },
  {
    id: 'client',
    roleCode: 'CLIENT',
    title: 'Client Portal',
    subtitle: 'Live Progress & Transparency',
    email: 'client@gmail.com',
    password: '123456',
    icon: UserCheck,
    badge: 'CLIENT VIEW',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(4,120,87,0.05) 100%)',
    borderGlow: 'rgba(16,185,129,0.3)',
    btnGradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    description: 'Track live project milestones, review site photos & drawings, approve changes, and view invoices.'
  }
];

const Login = () => {
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Select a dashboard role and prefill credentials
  const handleSelectDashboard = (dash) => {
    setSelectedDashboard(dash);
    setEmail(dash ? dash.email : '');
    setPassword(dash ? dash.password : '123456');
    setError('');
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const user = await login(email, password);
      if (user.role === 'SUPER_ADMIN') navigate('/super-admin');
      else if (['COMPANY_OWNER', 'PM', 'FOREMAN', 'WORKER', 'ENGINEER', 'SUBCONTRACTOR'].includes(user.role)) navigate('/company-admin');
      else if (user.role === 'CLIENT') navigate('/client-portal');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'DM Sans', sans-serif",
      background: '#0a0f1d',
      color: '#fff',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }

        /* Background effects */
        .bg-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image: linear-gradient(rgba(21,93,255,0.06) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(21,93,255,0.06) 1px, transparent 1px);
          background-size: 40px 40px;
          z-index: 0;
        }

        .bg-glow-center {
          position: fixed;
          top: 30%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 800px;
          height: 500px;
          background: radial-gradient(circle at center, rgba(21,93,255,0.12) 0%, transparent 70%);
          filter: blur(90px);
          pointer-events: none;
          z-index: 0;
        }

        /* Glass Cards */
        .portal-card {
          background: rgba(18, 26, 47, 0.65);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px 20px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .portal-card:hover {
          transform: translateY(-4px);
          background: rgba(26, 38, 66, 0.8);
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 16px 40px -10px rgba(0, 0, 0, 0.5);
        }

        .portal-card.active {
          border-color: #155dff;
          box-shadow: 0 0 30px rgba(21, 93, 255, 0.3);
        }

        /* Input styling */
        .custom-input {
          width: 100%;
          background: rgba(10, 15, 29, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 14px 14px 14px 46px;
          color: #fff;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: all 0.25s ease;
        }

        .custom-input::placeholder { color: rgba(255, 255, 255, 0.3); }

        .custom-input:focus {
          border-color: #155dff;
          background: rgba(15, 23, 42, 0.9);
          box-shadow: 0 0 0 4px rgba(21, 93, 255, 0.2);
        }

        /* Buttons */
        .btn-portal-action {
          width: 100%;
          border: none;
          border-radius: 12px;
          padding: 14px 20px;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.25s ease;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
        }

        .btn-portal-action:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.1);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .btn-portal-action:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Role Pill */
        .role-pill {
          padding: 8px 16px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .role-pill:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }

        .role-pill.selected {
          background: rgba(21, 93, 255, 0.15);
          border-color: #155dff;
          color: #fff;
        }

        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .anim-fade-in {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { animation: spin 0.8s linear infinite; }

        .shake {
          animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
      `}</style>

      {/* Background decoration */}
      <div className="bg-grid" />
      <div className="bg-glow-center" />

      {/* Header Bar */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        padding: '20px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'rgba(10, 15, 29, 0.4)',
        backdropFilter: 'blur(10px)'
      }}>
        <div 
          onClick={() => navigate('/')} 
          style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
        >
          <img src={Logo} alt="KAAL" style={{ height: 40, width: 'auto' }} />
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: 14 }}>
            <span style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: '0.05em', color: '#fff' }}>
              KAAL CONSTRUCTION
            </span>
            <span style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Enterprise Portals
            </span>
          </div>
        </div>

        <button 
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 10,
            padding: '8px 16px',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s'
          }}
        >
          <ArrowLeft size={16} /> Back to Website
        </button>
      </header>

      {/* Main Content Area */}
      <main style={{
        position: 'relative',
        zIndex: 10,
        flex: 1,
        maxWidth: 1380,
        width: '100%',
        margin: '0 auto',
        padding: '36px 24px 60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>

        {/* View Mode 1: Dashboard Portal Cards Grid */}
        {!selectedDashboard ? (
          <div className="anim-fade-in" style={{ width: '100%' }}>

            {/* Title Section */}
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(21, 93, 255, 0.12)',
                border: '1px solid rgba(21, 93, 255, 0.25)',
                borderRadius: 20,
                padding: '6px 16px',
                fontSize: 12,
                fontWeight: 600,
                color: '#60a5fa',
                marginBottom: 14
              }}>
                <Sparkles size={14} /> SELECT YOUR PORTAL DASHBOARD ({DASHBOARDS.length} SYSTEM ROLES)
              </div>

              <h1 style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(34px, 4.5vw, 52px)',
                letterSpacing: '0.03em',
                lineHeight: 1.1,
                margin: 0
              }}>
                ACCESS YOUR WORKSPACE
              </h1>
              
              <p style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 15,
                maxWidth: 620,
                margin: '10px auto 0'
              }}>
                Select any of the 8 construction dashboards below to log in with pre-seeded demo credentials or enter your custom account details.
              </p>
            </div>

            {/* Grid of 8 Dashboards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
              gap: 18,
              width: '100%',
              marginBottom: 36
            }}>
              {DASHBOARDS.map((dash) => {
                const IconComponent = dash.icon;
                return (
                  <div
                    key={dash.id}
                    className="portal-card"
                    onClick={() => handleSelectDashboard(dash)}
                    style={{
                      borderColor: dash.borderGlow
                    }}
                  >
                    {/* Glowing background hint */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: 140,
                      height: 140,
                      background: dash.gradient,
                      borderRadius: '0 0 0 100%',
                      pointerEvents: 'none',
                      opacity: 0.8
                    }} />

                    <div>
                      {/* Top Header Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          background: dash.gradient,
                          border: `1px solid ${dash.borderGlow}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: dash.color
                        }}>
                          <IconComponent size={24} />
                        </div>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          padding: '4px 9px',
                          borderRadius: 20,
                          background: 'rgba(255,255,255,0.06)',
                          color: dash.color,
                          border: `1px solid ${dash.borderGlow}`
                        }}>
                          {dash.badge}
                        </span>
                      </div>

                      {/* Card Title & Subtitle */}
                      <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 3px', color: '#fff' }}>
                        {dash.title}
                      </h3>
                      <div style={{ fontSize: 12, color: dash.color, fontWeight: 600, marginBottom: 10 }}>
                        {dash.subtitle}
                      </div>

                      <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.45, margin: '0 0 16px' }}>
                        {dash.description}
                      </p>
                    </div>

                    {/* Footer Credentials & Action */}
                    <div>
                      <div style={{
                        background: 'rgba(10, 15, 29, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 10,
                        padding: '9px 11px',
                        marginBottom: 14,
                        fontSize: 11.5,
                        color: 'rgba(255,255,255,0.7)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600 }}>DEMO EMAIL:</span>
                          <span style={{ fontFamily: 'monospace', color: '#fff', fontWeight: 600 }}>{dash.email}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600 }}>PASSWORD:</span>
                          <span style={{ fontFamily: 'monospace', color: dash.color, fontWeight: 700 }}>123456</span>
                        </div>
                      </div>

                      <button
                        className="btn-portal-action"
                        style={{ background: dash.btnGradient, padding: '12px 16px' }}
                      >
                        Select & Sign In <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Sign In Footer Option */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => handleSelectDashboard(DASHBOARDS[1])}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 14,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={e => e.target.style.color = '#fff'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}
              >
                Need to log in with a custom or existing company email? Click here
              </button>
            </div>

          </div>
        ) : (
          /* View Mode 2: Selected Dashboard Sign-In Card / Modal */
          <div className="anim-fade-in" style={{ width: '100%', maxWidth: 560 }}>

            {/* Top Navigation Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <button
                onClick={() => setSelectedDashboard(null)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '8px 16px',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s'
                }}
              >
                <ArrowLeft size={16} /> Choose Different Dashboard
              </button>

              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                Portal {DASHBOARDS.findIndex(d => d.id === selectedDashboard.id) + 1} of {DASHBOARDS.length}
              </span>
            </div>

            {/* Quick Dashboard Switcher Bar */}
            <div style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 8,
              marginBottom: 20,
              scrollbarWidth: 'none'
            }}>
              {DASHBOARDS.map((dash) => {
                const DashIcon = dash.icon;
                const isSelected = selectedDashboard.id === dash.id;
                return (
                  <button
                    key={dash.id}
                    className={`role-pill ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectDashboard(dash)}
                    style={isSelected ? { borderColor: dash.color, color: '#fff', background: dash.gradient } : {}}
                  >
                    <DashIcon size={14} color={isSelected ? dash.color : 'currentColor'} />
                    {dash.title}
                  </button>
                );
              })}
            </div>

            {/* Main Sign-In Glass Card */}
            <div style={{
              background: 'rgba(18, 26, 47, 0.75)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${selectedDashboard.borderGlow}`,
              borderRadius: 24,
              padding: '36px 32px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Top Accent Gradient */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: selectedDashboard.btnGradient
              }} />

              {/* Selected Role Header */}
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{
                  width: 68,
                  height: 68,
                  borderRadius: 20,
                  background: selectedDashboard.gradient,
                  border: `1px solid ${selectedDashboard.borderGlow}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                  color: selectedDashboard.color
                }}>
                  {(() => {
                    const SelectedIcon = selectedDashboard.icon;
                    return <SelectedIcon size={34} />;
                  })()}
                </div>

                <div style={{
                  display: 'inline-block',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  padding: '3px 12px',
                  borderRadius: 20,
                  background: 'rgba(255,255,255,0.06)',
                  color: selectedDashboard.color,
                  border: `1px solid ${selectedDashboard.borderGlow}`,
                  marginBottom: 8
                }}>
                  {selectedDashboard.badge}
                </div>

                <h2 style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 32,
                  letterSpacing: '0.04em',
                  margin: '4px 0 0',
                  color: '#fff'
                }}>
                  SIGN IN TO {selectedDashboard.title.toUpperCase()}
                </h2>
                
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                  {selectedDashboard.subtitle}
                </p>
              </div>

              {/* Seeded Credentials Info Box */}
              <div style={{
                background: 'rgba(21, 93, 255, 0.08)',
                border: '1px solid rgba(21, 93, 255, 0.2)',
                borderRadius: 14,
                padding: '12px 14px',
                marginBottom: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Key size={18} color={selectedDashboard.color} style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: '#fff' }}>Pre-seeded Demo Credentials</div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                      <span style={{ fontFamily: 'monospace', color: '#60a5fa' }}>{selectedDashboard.email}</span> • Password: <span style={{ color: '#60a5fa', fontWeight: 700 }}>123456</span>
                    </div>
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <CheckCircle2 size={12} /> LOADED
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="shake" style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  marginBottom: 24,
                  fontSize: 13,
                  color: '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                  <div>{error}</div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: 8,
                    paddingLeft: 2
                  }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      type="email"
                      className="custom-input"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: 8,
                    paddingLeft: 2
                  }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      type="password"
                      className="custom-input"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-portal-action"
                  disabled={isSubmitting}
                  style={{
                    background: selectedDashboard.btnGradient,
                    marginTop: 8,
                    padding: 16,
                    fontSize: 15
                  }}
                >
                  {isSubmitting ? (
                    <><Loader size={18} className="spinner" /> Authenticating Portal...</>
                  ) : (
                    <>Sign In to {selectedDashboard.title} <ArrowRight size={18} /></>
                  )}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                  © {new Date().getFullYear()} KAAL Construction Enterprise. All rights reserved.
                </p>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default Login;