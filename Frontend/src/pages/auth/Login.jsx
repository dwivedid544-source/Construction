import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
  Mail, Lock, ArrowRight, Loader, ShieldCheck, Building2,
  HardHat, Wrench, UserCheck, ArrowLeft, CheckCircle2,
  Key, Sparkles, ClipboardList, User, DraftingCompass, Eye, EyeOff
} from 'lucide-react';
import Logo from '../../assets/images/logo.png.jpeg';

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
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(29,78,216,0.02) 100%)',
    borderGlow: 'rgba(59,130,246,0.2)',
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
    gradient: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(109,40,217,0.02) 100%)',
    borderGlow: 'rgba(139,92,246,0.2)',
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
    gradient: 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(14,116,144,0.02) 100%)',
    borderGlow: 'rgba(6,182,212,0.2)',
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
    gradient: 'linear-gradient(135deg, rgba(236,72,153,0.15) 0%, rgba(190,24,93,0.02) 100%)',
    borderGlow: 'rgba(236,72,153,0.2)',
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
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(67,56,202,0.02) 100%)',
    borderGlow: 'rgba(99,102,241,0.2)',
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
    gradient: 'linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(15,118,110,0.02) 100%)',
    borderGlow: 'rgba(20,184,166,0.2)',
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
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(180,83,9,0.02) 100%)',
    borderGlow: 'rgba(245,158,11,0.2)',
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
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(4,120,87,0.02) 100%)',
    borderGlow: 'rgba(16,185,129,0.2)',
    btnGradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    description: 'Track live project milestones, review site photos & drawings, approve changes, and view invoices.'
  }
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Forgot Password View state
  const [view, setView] = useState('login'); // 'login' or 'forgot'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  // Read saved email from localStorage on mount (Remember Me functionality)
  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Handle traditional Login flow
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const user = await login(email, password);

      // Save email to localStorage if Remember Me is checked, otherwise clear it
      if (rememberMe) {
        localStorage.setItem('remembered_email', email);
      } else {
        localStorage.removeItem('remembered_email');
      }

      // Preserve existing role redirects
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

  // Handle Forgot Password flow using the real backend API
  const handleForgotPassword = async (e) => {
    if (e) e.preventDefault();
    setForgotSubmitting(true);
    setError('');
    setForgotSuccess('');
    try {
      const response = await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSuccess(response.data?.message || 'If that email exists, a reset link has been sent.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request password reset. Please try again.');
    } finally {
      setForgotSubmitting(false);
    }
  };

  // Prefill credentials without auto-logging in
  const handleUseCredentials = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setView('login'); // Switch view back to login if user was in forgot password mode
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      if (emailInputRef.current) {
        emailInputRef.current.focus();
      }
    }, 100);
  };

  // Demo Credentials visibility flag (defaults to false if not strictly 'true')
  const SHOW_DEMO_CREDENTIALS = import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === 'true';

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
          background-image: linear-gradient(rgba(21,93,255,0.04) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(21,93,255,0.04) 1px, transparent 1px);
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
          background: radial-gradient(circle at center, rgba(21,93,255,0.1) 0%, transparent 70%);
          filter: blur(90px);
          pointer-events: none;
          z-index: 0;
        }

        /* Glass Cards */
        .login-card {
          background: rgba(18, 26, 47, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .demo-card {
          background: rgba(18, 26, 47, 0.5);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 18px;
          transition: all 0.25s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
        }

        .demo-card:hover {
          transform: translateY(-2px);
          background: rgba(22, 33, 58, 0.7);
          border-color: rgba(21, 93, 255, 0.3);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
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
        .btn-primary-action {
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
          background: linear-gradient(135deg, #155dff 0%, #0a3bb0 100%);
          transition: all 0.25s ease;
          box-shadow: 0 4px 14px rgba(21, 93, 255, 0.3);
        }

        .btn-primary-action:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.1);
          box-shadow: 0 6px 20px rgba(21, 93, 255, 0.4);
        }

        .btn-primary-action:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-demo-action {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          background: rgba(255, 255, 255, 0.04);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .btn-demo-action:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
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

      {/* Background elements */}
      <div className="bg-grid" />
      <div className="bg-glow-center" />

      {/* Header bar */}
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
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        >
          <img src={Logo} alt="KT Construct" style={{ height: 36, width: 'auto' }} />
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: 12 }}>
            <span style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: '0.05em', color: '#fff', display: 'block', lineHeight: 1 }}>
              KT CONSTRUCT
            </span>
            <span style={{ display: 'block', fontSize: 9, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginTop: 2 }}>
              Powered by Kiaan Technology
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            padding: '8px 14px',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s'
          }}
        >
          <ArrowLeft size={14} /> Back to Website
        </button>
      </header>

      {/* Main Content Area */}
      <main style={{
        position: 'relative',
        zIndex: 10,
        flex: 1,
        width: '100%',
        maxWidth: 1200,
        margin: '0 auto',
        padding: '48px 24px 72px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>

        {/* View 1: Main Login Card */}
        {view === 'login' && (
          <div className="login-card anim-fade-in" style={{
            width: '100%',
            maxWidth: 440,
            padding: '36px 32px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Logo and Branding inside the card */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
              <div style={{
                background: 'rgba(21, 93, 255, 0.08)',
                border: '1px solid rgba(21, 93, 255, 0.15)',
                borderRadius: 16,
                padding: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16
              }}>
                <img src={Logo} alt="KT Construct" style={{ height: 40, width: 'auto' }} />
              </div>
              <h1 style={{
                fontSize: 24,
                fontWeight: 700,
                color: '#fff',
                margin: '0 0 6px 0',
                letterSpacing: '-0.02em',
                textAlign: 'center'
              }}>
                Welcome Back
              </h1>
              <p style={{
                fontSize: 13,
                color: 'rgba(255, 255, 255, 0.45)',
                margin: 0,
                textAlign: 'center',
                lineHeight: 1.4
              }}>
                Sign in to access your KT Construct workspace
              </p>
            </div>

            {/* Error alerts */}
            {error && (
              <div className="shake" style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 20,
                fontSize: 12.5,
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>{error}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    ref={emailInputRef}
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
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? "text" : "password"}
                    className="custom-input"
                    style={{ paddingRight: 44 }}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'rgba(255, 255, 255, 0.35)',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.35)'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Me / Forgot Password */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, fontSize: 13 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'rgba(255, 255, 255, 0.65)' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    style={{
                      accentColor: '#155dff',
                      cursor: 'pointer',
                      width: 15,
                      height: 15
                    }}
                  />
                  Remember Me
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setForgotSuccess('');
                    setForgotEmail(email); // Prefill if they started typing
                    setView('forgot');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#60a5fa',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: 13,
                    padding: 0,
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
                  onMouseLeave={e => e.currentTarget.style.color = '#60a5fa'}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Sign In button */}
              <button
                type="submit"
                className="btn-primary-action"
                disabled={isSubmitting}
                style={{ marginTop: 8 }}
              >
                {isSubmitting ? (
                  <><Loader size={16} className="spinner" /> Signing In...</>
                ) : (
                  <>Sign In <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            {/* Back to website & copyright */}
            <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <button
                onClick={() => navigate('/')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: 12.5,
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'}
              >
                <ArrowLeft size={12} /> Back to main website
              </button>
            </div>
          </div>
        )}

        {/* View 2: Forgot Password Card */}
        {view === 'forgot' && (
          <div className="login-card anim-fade-in" style={{
            width: '100%',
            maxWidth: 440,
            padding: '36px 32px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
              <div style={{
                background: 'rgba(21, 93, 255, 0.08)',
                border: '1px solid rgba(21, 93, 255, 0.15)',
                borderRadius: 16,
                padding: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16
              }}>
                <Key size={24} color="#60a5fa" />
              </div>
              <h1 style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#fff',
                margin: '0 0 6px 0',
                letterSpacing: '-0.02em',
                textAlign: 'center'
              }}>
                Reset Password
              </h1>
              <p style={{
                fontSize: 13,
                color: 'rgba(255, 255, 255, 0.45)',
                margin: 0,
                textAlign: 'center',
                lineHeight: 1.4
              }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {/* Error alerts */}
            {error && (
              <div className="shake" style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 20,
                fontSize: 12.5,
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>{error}</div>
              </div>
            )}

            {/* Success alert */}
            {forgotSuccess && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 20,
                fontSize: 12.5,
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>{forgotSuccess}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    type="email"
                    className="custom-input"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="btn-primary-action"
                disabled={forgotSubmitting}
                style={{ marginTop: 8 }}
              >
                {forgotSubmitting ? (
                  <><Loader size={16} className="spinner" /> Sending Link...</>
                ) : (
                  <>Send Reset Link <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            {/* Back to sign in link */}
            <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <button
                onClick={() => {
                  setError('');
                  setForgotSuccess('');
                  setView('login');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: 12.5,
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'}
              >
                <ArrowLeft size={12} /> Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* Demo Credentials Section (Controlled by SHOW_DEMO_CREDENTIALS) */}
        {SHOW_DEMO_CREDENTIALS && (
          <div className="anim-fade-in" style={{ width: '100%', maxWidth: 1000, marginTop: 54 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(21, 93, 255, 0.08)',
                border: '1px solid rgba(21, 93, 255, 0.18)',
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: 11,
                fontWeight: 600,
                color: '#60a5fa',
                marginBottom: 10
              }}>
                <Sparkles size={12} /> DEMO LOGIN CREDENTIALS
              </div>
              <h2 style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#fff',
                margin: '0 0 6px 0',
                letterSpacing: '-0.01em'
              }}>
                Explore the Platform
              </h2>
              <p style={{
                fontSize: 13,
                color: 'rgba(255, 255, 255, 0.45)',
                margin: 0
              }}>
                Use any demo account below to instantly prefill the form and explore different workspace perspectives.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 16,
              width: '100%'
            }}>
              {DASHBOARDS.map((dash) => {
                const DashIcon = dash.icon;
                return (
                  <div key={dash.id} className="demo-card">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: dash.gradient,
                          border: `1px solid ${dash.borderGlow}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: dash.color
                        }}>
                          <DashIcon size={18} />
                        </div>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          padding: '3px 8px',
                          borderRadius: 20,
                          background: 'rgba(255,255,255,0.04)',
                          color: dash.color,
                          border: `1px solid ${dash.borderGlow}`
                        }}>
                          {dash.badge}
                        </span>
                      </div>

                      <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 2px 0', color: '#fff' }}>
                        {dash.title}
                      </h3>
                      <p style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', margin: '0 0 12px 0', lineHeight: 1.3 }}>
                        {dash.subtitle}
                      </p>
                    </div>

                    <div>
                      <div style={{
                        background: 'rgba(10, 15, 29, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: 8,
                        padding: '6px 8px',
                        marginBottom: 10,
                        fontSize: 10.5,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>EMAIL:</span>
                          <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{dash.email}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>PASSWORD:</span>
                          <span style={{ fontFamily: 'monospace', color: dash.color, fontWeight: 700 }}>123456</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUseCredentials(dash.email, dash.password)}
                        className="btn-demo-action"
                        style={{ width: '100%' }}
                      >
                        Use Credentials
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default Login;