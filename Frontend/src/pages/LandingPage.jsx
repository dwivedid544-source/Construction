import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Menu, X, ArrowRight, Building2, HardHat, Hammer, Wrench,
    CheckCircle, ChevronRight, Phone, Mail, MapPin, Star, Shield, Zap, Flame, Award,
    Users, Clock, Activity, ArrowUpRight, Lock, Check, HelpCircle, ClipboardCheck,
    Globe, Smartphone, FileText, PieChart, Wallet, Layers, ShieldCheck, Truck
} from 'lucide-react';
import Logo from '../assets/images/logo.png.jpeg';
import landingPageImg from '../assets/images/landingpage.png';
import api from '../utils/api';
import WhatsAppFloatingButton from '../components/WhatsAppFloatingButton';

/* ─── Animated Counter Component ───────────────────────────────────────── */
const Counter = ({ end, suffix = '' }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const started = useRef(false);
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !started.current) {
                started.current = true;
                let start = 0;
                const step = Math.max(1, Math.ceil(end / (1600 / 16)));
                const timer = setInterval(() => {
                    start += step;
                    if (start >= end) { setCount(end); clearInterval(timer); }
                    else setCount(start);
                }, 16);
            }
        }, { threshold: 0.3 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [end]);
    return <span ref={ref}>{count}{suffix}</span>;
};

/* ─── KT Construct Landing Page Component ───────────────────────────── */
const LandingPage = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [pricingPlans, setPricingPlans] = useState([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        const handleScroll = () => setScrolled(window.scrollY > 30);
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Default Subscription Plans (Exact matches from the reference image structure)
    const defaultPlans = [
        {
            name: "Free Try Now 7 Days",
            price: "₹0",
            period: "per 7 Days",
            duration: "Duration: 7 Days",
            features: [
                "7 Days full feature trial access",
                "Duration: 7 Days"
            ],
            isPopular: false
        },
        {
            name: "Starter 599",
            price: "₹599",
            period: "per month",
            duration: "Duration: Monthly",
            features: [
                "Essential construction management features",
                "Duration: Monthly"
            ],
            isPopular: false
        },
        {
            name: "Standard 799",
            price: "₹799",
            period: "per month",
            duration: "Duration: Monthly",
            features: [
                "Complete features for growing teams",
                "Duration: Monthly"
            ],
            isPopular: true
        },
        {
            name: "Pro 1299",
            price: "₹1,299",
            period: "per month",
            duration: "Duration: Monthly",
            features: [
                "Advanced features and priority support",
                "Duration: Monthly"
            ],
            isPopular: false
        }
    ];

    useEffect(() => {
        (async () => {
            try {
                const plansRes = await api.get('/plans');
                const plansData = plansRes?.data;
                if (Array.isArray(plansData) && plansData.length > 0) {
                    setPricingPlans(plansData.map(p => ({
                        name: p.name,
                        price: p.price === 0 ? '₹0' : (typeof p.price === 'number' ? '₹' + p.price.toLocaleString('en-IN') : p.price),
                        period: p.period === 'custom' ? '' : '/ ' + (p.period || 'month'),
                        duration: p.duration || ('Duration: ' + (p.period || 'Monthly')),
                        features: Array.isArray(p.features) ? p.features : [],
                        isPopular: Boolean(p.isPopular)
                    })));
                } else {
                    setPricingPlans(defaultPlans);
                }
            } catch (e) {
                setPricingPlans(defaultPlans);
            }
        })();
    }, []);

    const navLinks = [
        { name: 'Home', href: '#home' },
        { name: 'Features', href: '#features' },
        { name: 'Results', href: '#why-us' },
        { name: 'Testimonials', href: '#testimonials' },
        { name: 'Pricing', href: '#pricing' },
        { name: 'Contact', href: '#contact' },
    ];

    const featuresList = [
        {
            icon: HardHat,
            title: "Site & Labor Management",
            desc: "Track daily site logs, worker attendance, crew clock-in, equipment utilization, and safety compliance in real-time."
        },
        {
            icon: Layers,
            title: "Bids & RFQ Management",
            desc: "Streamline vendor quotes, RFQs, subcontractor bidding, cost estimations, and automated bid comparison tables."
        },
        {
            icon: Wallet,
            title: "Financial & Cost Control",
            desc: "Control budgets with Purchase Orders (POs), change order tracking, automated billing, and invoice reconciliation."
        },
        {
            icon: PieChart,
            title: "Real-time Progress Analytics",
            desc: "Monitor project timelines, Gantt schedules, material consumption, and milestone delivery with visual dashboards."
        },
        {
            icon: Smartphone,
            title: "Subcontractor & Field Mobile App",
            desc: "Empower site engineers, foremen, and subcontractors to log daily progress and upload site photos on mobile."
        },
        {
            icon: FileText,
            title: "Blueprint Vault & RFI Center",
            desc: "Centralized storage for CAD drawings, blueprints, building permits, contracts, RFIs, and deficiency reports."
        }
    ];

    const benefitsList = [
        "Increase site productivity and task execution by up to 40%",
        "Save 15+ hours per week on manual logs and paperwork",
        "Eliminate cost overruns with automated PO approvals",
        "Boost profit margins with real-time material & labor audit",
        "Seamless collaboration between general contractors & subcontractors",
        "Data-driven project delivery with live construction analytics"
    ];

    const testimonialsList = [
        {
            name: "Rajesh Sharma",
            role: "Managing Director, Apex Infra Builders",
            quote: "KT Construct software simplified our site tracking across 12 active projects. Our project delays dropped to zero within 2 months!",
            rating: 5
        },
        {
            name: "Vikram Patel",
            role: "Chief Project Engineer, Horizon Projects",
            quote: "Managing RFQs, bids, and subcontractor payments used to take days. Now with KT Construct, it takes minutes. Outstanding tool!",
            rating: 5
        },
        {
            name: "Sunita Rao",
            role: "Operations Lead, Urban Build Ltd",
            quote: "The real-time site daily logs and WhatsApp notifications keep contractors, clients, and engineers connected seamlessly.",
            rating: 5
        }
    ];

    const displayPlans = defaultPlans;

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0b132b',
            color: '#f1f5f9',
            overflowX: 'hidden',
            fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif"
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap');
                
                * { box-sizing: border-box; margin: 0; padding: 0; scroll-behavior: smooth; }
                
                .font-title { font-family: 'Outfit', sans-serif; }
                .font-body { font-family: 'Plus Jakarta Sans', sans-serif; }

                .gradient-text-blue {
                    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #1d4ed8 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .pill-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 16px;
                    border-radius: 9999px;
                    background: rgba(37, 99, 235, 0.15);
                    border: 1px solid rgba(59, 130, 246, 0.35);
                    color: #60a5fa;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                }

                .btn-blue {
                    background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%);
                    color: #ffffff;
                    border: none;
                    padding: 12px 28px;
                    border-radius: 10px;
                    font-weight: 700;
                    font-size: 14px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 20px rgba(37, 99, 235, 0.4);
                    text-decoration: none;
                }
                .btn-blue:hover {
                    background: linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 30px rgba(59, 130, 246, 0.55);
                }

                .btn-dark-outline {
                    background: rgba(255, 255, 255, 0.04);
                    color: #e2e8f0;
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    padding: 12px 28px;
                    border-radius: 10px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.25s;
                    text-decoration: none;
                }
                .btn-dark-outline:hover {
                    background: rgba(37, 99, 235, 0.12);
                    border-color: #3b82f6;
                    color: #ffffff;
                }

                .btn-white {
                    background: #ffffff;
                    color: #0f172a;
                    border: none;
                    padding: 12px 28px;
                    border-radius: 10px;
                    font-weight: 700;
                    font-size: 14px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.25s;
                    box-shadow: 0 4px 16px rgba(255, 255, 255, 0.2);
                    text-decoration: none;
                }
                .btn-white:hover {
                    background: #f8fafc;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(255, 255, 255, 0.35);
                }

                .dark-card {
                    background: rgba(15, 23, 42, 0.75);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(59, 130, 246, 0.2);
                    border-radius: 18px;
                    padding: 32px;
                    transition: all 0.3s ease;
                }
                .dark-card:hover {
                    border-color: rgba(59, 130, 246, 0.5);
                    box-shadow: 0 12px 36px rgba(37, 99, 235, 0.18);
                    transform: translateY(-4px);
                }

                .container-custom {
                    max-width: 1280px;
                    margin: 0 auto;
                    padding: 0 24px;
                    width: 100%;
                }

                .glow-orb {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(100px);
                    pointer-events: none;
                    z-index: 0;
                }

                @media (max-width: 768px) {
                    .container-custom { padding: 0 18px; }
                }
            `}</style>

            {/* ══ NAVBAR ══════════════════════════════════════════════════════ */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                transition: 'all 0.3s ease',
                background: scrolled ? 'rgba(11, 19, 43, 0.95)' : 'rgba(11, 19, 43, 0.65)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderBottom: scrolled ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
                padding: '14px 0'
            }}>
                <div className="container-custom" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                    {/* Logo & Brand */}
                    <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: isMobile ? 38 : 44,
                            height: isMobile ? 38 : 44,
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(37, 99, 235, 0.3) 0%, rgba(15, 23, 42, 0.85) 100%)',
                            border: '1.5px solid rgba(96, 165, 250, 0.45)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 5,
                            boxShadow: '0 0 16px rgba(37, 99, 235, 0.4)',
                            flexShrink: 0,
                            overflow: 'hidden'
                        }}>
                            <img src={Logo} alt="KT Construct" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="font-title" style={{ fontSize: 17, fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em', lineHeight: 1 }}>
                                KT <span style={{ color: '#3b82f6' }}>CONSTRUCT</span>
                            </span>
                            <span style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 3 }}>
                                Powered by Kiaan Technology
                            </span>
                        </div>
                    </div>

                    {/* Desktop Navigation Links */}
                    <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 32 }}>
                        {navLinks.map(link => (
                            <a
                                key={link.name}
                                href={link.href}
                                style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: '#cbd5e1',
                                    textDecoration: 'none',
                                    transition: 'color 0.2s ease',
                                }}
                                onMouseEnter={e => e.target.style.color = '#60a5fa'}
                                onMouseLeave={e => e.target.style.color = '#cbd5e1'}
                            >
                                {link.name}
                            </a>
                        ))}
                    </div>

                    {/* Login CTA Button */}
                    <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 14 }}>
                        <button
                            onClick={() => navigate('/login')}
                            className="btn-blue"
                            style={{ padding: '9px 22px', fontSize: 13 }}
                        >
                            Login <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* Mobile Hamburger Toggle */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        style={{
                            display: isMobile ? 'flex' : 'none',
                            background: 'none',
                            border: 'none',
                            color: '#ffffff',
                            cursor: 'pointer',
                            padding: 6
                        }}
                    >
                        {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
                    </button>
                </div>

                {/* Mobile Dropdown Menu */}
                {isMenuOpen && (
                    <div style={{
                        background: '#0f172a',
                        borderBottom: '1px solid rgba(59, 130, 246, 0.25)',
                        padding: '16px 24px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14
                    }}>
                        {navLinks.map(link => (
                            <a
                                key={link.name}
                                href={link.href}
                                onClick={() => setIsMenuOpen(false)}
                                style={{
                                    color: '#e2e8f0',
                                    textDecoration: 'none',
                                    fontSize: 15,
                                    fontWeight: 600,
                                    padding: '8px 0',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                                }}
                            >
                                {link.name}
                            </a>
                        ))}
                        <button
                            onClick={() => { setIsMenuOpen(false); navigate('/login'); }}
                            className="btn-blue"
                            style={{ width: '100%', marginTop: 8 }}
                        >
                            Login <ChevronRight size={15} />
                        </button>
                    </div>
                )}
            </nav>

            {/* ══ HERO SECTION ════════════════════════════════════════════════ */}
            <section id="home" style={{
                position: 'relative',
                paddingTop: isMobile ? 120 : 160,
                paddingBottom: isMobile ? 80 : 120,
                overflow: 'hidden'
            }}>
                {/* Background Glows */}
                <div className="glow-orb" style={{ top: -100, right: -100, width: 550, height: 550, background: 'rgba(37, 99, 235, 0.22)' }} />
                <div className="glow-orb" style={{ bottom: 0, left: -100, width: 450, height: 450, background: 'rgba(14, 165, 233, 0.15)' }} />

                <div className="container-custom" style={{ position: 'relative', zIndex: 2 }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : '1.15fr 0.85fr',
                        gap: isMobile ? 40 : 64,
                        alignItems: 'center'
                    }}>
                        {/* Left Hero Copy */}
                        <div>
                            <div className="pill-tag" style={{ marginBottom: 20 }}>
                                <Building2 size={14} color="#60a5fa" />
                                #1 Construction Management Platform
                            </div>

                            <h1 className="font-title" style={{
                                fontSize: 'clamp(36px, 5.5vw, 64px)',
                                fontWeight: 800,
                                lineHeight: 1.1,
                                color: '#ffffff',
                                marginBottom: 20
                            }}>
                                Transform Your<br />
                                <span className="gradient-text-blue">Construction Business</span>
                            </h1>

                            <p style={{
                                fontSize: 'clamp(15px, 2vw, 17px)',
                                color: '#94a3b8',
                                lineHeight: 1.7,
                                marginBottom: 36,
                                maxWidth: 580
                            }}>
                                The all-in-one software for general contractors, site engineers, and project teams. Streamline site daily logs, subcontractor RFQs, bids, POs, and blueprint management with KT Construct.
                            </p>

                            {/* CTAs */}
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 48 }}>
                                <button onClick={() => navigate('/login')} className="btn-blue">
                                    Get Started Free <ArrowRight size={16} />
                                </button>
                                <button
                                    onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="btn-dark-outline"
                                >
                                    Explore Features
                                </button>
                            </div>

                            {/* 4 Stats Items Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: isMobile ? 12 : 20,
                                paddingTop: 32,
                                borderTop: '1px solid rgba(59, 130, 246, 0.25)'
                            }}>
                                {[
                                    { number: 500, suffix: '+', label: 'Active Sites', icon: Award },
                                    { number: 50, suffix: 'K+', label: 'Daily Worker Logs', icon: Users },
                                    { number: 99.9, suffix: '%', label: 'On-Time Delivery', icon: Activity },
                                    { number: 24, suffix: '/7', label: 'Support', icon: Clock }
                                ].map((stat, i) => (
                                    <div key={i} style={{ textAlign: 'left' }}>
                                        <div className="font-title gradient-text-blue" style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, lineHeight: 1 }}>
                                            {typeof stat.number === 'number' && stat.number % 1 !== 0 ? stat.number + stat.suffix : <Counter end={stat.number} suffix={stat.suffix} />}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 6, letterSpacing: '0.02em' }}>
                                            {stat.label}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Hero Image Card */}
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                position: 'relative',
                                borderRadius: 24,
                                overflow: 'hidden',
                                border: '1px solid rgba(59, 130, 246, 0.35)',
                                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75)',
                                background: '#0f172a'
                            }}>
                                <img
                                    src={landingPageImg}
                                    alt="KT Construct Project Management"
                                    style={{ width: '100%', height: 'auto', display: 'block', minHeight: 340, objectFit: 'cover' }}
                                />
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: 'linear-gradient(180deg, rgba(11,19,43,0.25) 0%, rgba(11,19,43,0.9) 100%)'
                                }} />
                                <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
                                    <div className="pill-tag" style={{ background: 'rgba(11, 19, 43, 0.9)', marginBottom: 8 }}>
                                        <Zap size={13} color="#60a5fa" /> Real-time Site Intelligence
                                    </div>
                                    <h4 className="font-title" style={{ fontSize: 18, color: '#ffffff', fontWeight: 700 }}>
                                        Automated Bids, RFQs & Subcontractor Tracking
                                    </h4>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ══ FEATURES SECTION ════════════════════════════════════════════ */}
            <section id="features" style={{
                padding: '90px 0',
                background: 'linear-gradient(180deg, #0b132b 0%, #0f172a 50%, #0b132b 100%)',
                position: 'relative'
            }}>
                <div className="container-custom">
                    {/* Header */}
                    <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 60px' }}>
                        <div className="pill-tag" style={{ marginBottom: 16 }}>
                            <Zap size={14} color="#60a5fa" /> Powerful Features
                        </div>
                        <h2 className="font-title" style={{
                            fontSize: 'clamp(28px, 4vw, 44px)',
                            fontWeight: 800,
                            color: '#ffffff',
                            marginBottom: 16
                        }}>
                            Everything You Need to <span className="gradient-text-blue">Manage Construction</span>
                        </h2>
                        <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7 }}>
                            Comprehensive management software engineered specifically for construction projects, site engineers, and general contractors.
                        </p>
                    </div>

                    {/* 6 Grid Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: 24
                    }}>
                        {featuresList.map((feat, i) => {
                            const IconComponent = feat.icon;
                            return (
                                <div key={i} className="dark-card">
                                    <div style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 12,
                                        background: 'rgba(37, 99, 235, 0.15)',
                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: 20
                                    }}>
                                        <IconComponent size={22} color="#60a5fa" />
                                    </div>
                                    <h3 className="font-title" style={{
                                        fontSize: 19,
                                        fontWeight: 700,
                                        color: '#ffffff',
                                        marginBottom: 10
                                    }}>
                                        {feat.title}
                                    </h3>
                                    <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>
                                        {feat.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ══ WHY US / STANDS OUT SECTION ═════════════════════════════════ */}
            <section id="why-us" style={{ padding: '90px 0', position: 'relative' }}>
                <div className="container-custom">
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : '1.1fr 0.9fr',
                        gap: 60,
                        alignItems: 'center'
                    }}>
                        {/* Left Benefits List */}
                        <div>
                            <div className="pill-tag" style={{ marginBottom: 16 }}>
                                <Award size={14} color="#60a5fa" /> Why We Stand Out
                            </div>
                            <h2 className="font-title" style={{
                                fontSize: 'clamp(28px, 4vw, 44px)',
                                fontWeight: 800,
                                color: '#ffffff',
                                marginBottom: 20
                            }}>
                                Why <span className="gradient-text-blue">KT Construct</span> Stands Out
                            </h2>
                            <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
                                Built to eliminate site friction, control material budgets, and empower project teams to deliver high-quality construction projects on time.
                            </p>

                            {/* Checkmark list */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 36 }}>
                                {benefitsList.map((benefit, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            background: 'rgba(37, 99, 235, 0.25)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <Check size={12} color="#60a5fa" strokeWidth={3} />
                                        </div>
                                        <span style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 500 }}>
                                            {benefit}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => navigate('/login')} className="btn-blue">
                                See All Benefits <ArrowRight size={16} />
                            </button>
                        </div>

                        {/* Right Stat Boxes & Testimonial Snippet */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                                {[
                                    { value: '40%', label: 'Site Productivity Growth' },
                                    { value: '15+', label: 'Hours Saved/Week' },
                                    { value: '99.9%', label: 'On-Time Milestones' }
                                ].map((box, i) => (
                                    <div key={i} className="dark-card" style={{ padding: '20px 14px', textAlign: 'center' }}>
                                        <div className="font-title gradient-text-blue" style={{ fontSize: 24, fontWeight: 800 }}>
                                            {box.value}
                                        </div>
                                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, fontWeight: 600 }}>
                                            {box.label}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Featured Testimonial Card */}
                            <div className="dark-card" style={{
                                borderLeft: '4px solid #3b82f6',
                                background: 'rgba(15, 23, 42, 0.9)'
                            }}>
                                <p style={{ fontSize: 14, color: '#cbd5e1', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 16 }}>
                                    "KT Construct transformed how we handle our site daily logs and subcontractor bids. Productivity increased by 40% across all our sites."
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontSize: 14,
                                        color: '#fff'
                                    }}>
                                        RS
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>Rajesh Sharma</div>
                                        <div style={{ fontSize: 12, color: '#60a5fa' }}>Managing Director, Apex Infra</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ TESTIMONIALS SECTION ════════════════════════════════════════ */}
            <section id="testimonials" style={{
                padding: '90px 0',
                background: 'linear-gradient(180deg, #0b132b 0%, #0f172a 100%)'
            }}>
                <div className="container-custom">
                    <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 60px' }}>
                        <div className="pill-tag" style={{ marginBottom: 16 }}>
                            <Star size={14} color="#60a5fa" /> Client Testimonials
                        </div>
                        <h2 className="font-title" style={{
                            fontSize: 'clamp(28px, 4vw, 44px)',
                            fontWeight: 800,
                            color: '#ffffff',
                            marginBottom: 16
                        }}>
                            What Contractors <span className="gradient-text-blue">Say</span>
                        </h2>
                        <p style={{ color: '#94a3b8', fontSize: 15 }}>
                            Trusted by hundreds of general contractors, site engineers, and project managers.
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: 24
                    }}>
                        {testimonialsList.map((t, i) => (
                            <div key={i} className="dark-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                        <div style={{
                                            width: 44, height: 44, borderRadius: '50%',
                                            background: 'rgba(37, 99, 235, 0.2)',
                                            border: '1px solid #3b82f6',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 700, color: '#60a5fa', fontSize: 15
                                        }}>
                                            {t.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>{t.name}</div>
                                            <div style={{ fontSize: 12, color: '#94a3b8' }}>{t.role}</div>
                                        </div>
                                    </div>
                                    <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 20 }}>
                                        "{t.quote}"
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: 4 }}>
                                    {[...Array(t.rating)].map((_, starIdx) => (
                                        <Star key={starIdx} size={15} color="#38bdf8" fill="#38bdf8" />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ PRICING / SUBSCRIPTION PLANS SECTION ═══════════════════════ */}
            <section id="pricing" style={{ padding: '90px 0', position: 'relative' }}>
                <div className="container-custom">
                    <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 60px' }}>
                        <div className="pill-tag" style={{ marginBottom: 16 }}>
                            <Wallet size={14} color="#60a5fa" /> Subscription Plans
                        </div>
                        <h2 className="font-title" style={{
                            fontSize: 'clamp(28px, 4vw, 44px)',
                            fontWeight: 800,
                            color: '#ffffff',
                            marginBottom: 16
                        }}>
                            Choose Your <span className="gradient-text-blue">Perfect Plan</span>
                        </h2>
                        <p style={{ color: '#94a3b8', fontSize: 15 }}>
                            Flexible pricing options for construction companies of all sizes
                        </p>
                    </div>

                    {/* 4 Cards Pricing Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
                        gap: 20,
                        alignItems: 'stretch'
                    }}>
                        {displayPlans.map((plan, i) => (
                            <div key={i} style={{
                                background: plan.isPopular ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)' : 'rgba(15, 23, 42, 0.85)',
                                backdropFilter: 'blur(12px)',
                                border: plan.isPopular ? '2px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.22)',
                                borderRadius: 20,
                                padding: '32px 24px 28px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                position: 'relative',
                                transition: 'all 0.3s ease',
                                boxShadow: plan.isPopular ? '0 12px 40px rgba(37, 99, 235, 0.3)' : 'none'
                            }}>
                                {plan.isPopular && (
                                    <div style={{
                                        position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                                        background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                                        color: '#ffffff', fontSize: 11, fontWeight: 800,
                                        letterSpacing: '0.08em', textTransform: 'uppercase',
                                        padding: '4px 14px', borderRadius: 9999,
                                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        Most Popular
                                    </div>
                                )}

                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: plan.isPopular ? '#60a5fa' : '#ffffff', marginBottom: 12 }}>
                                        {plan.name}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                                        <span className="font-title" style={{ fontSize: 36, fontWeight: 800, color: '#ffffff' }}>
                                            {plan.price}
                                        </span>
                                        <span style={{ fontSize: 13, color: '#94a3b8' }}>
                                            {plan.period}
                                        </span>
                                    </div>

                                    {plan.duration && (
                                        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20, fontStyle: 'italic' }}>
                                            {plan.duration}
                                        </div>
                                    )}

                                    <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.08)', marginBottom: 20 }} />

                                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28, padding: 0 }}>
                                        {plan.features.map((feat, fIdx) => (
                                            <li key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#e2e8f0', lineHeight: 1.4 }}>
                                                <Check size={16} color="#60a5fa" style={{ marginTop: 2, flexShrink: 0 }} />
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Get Started Button placed cleanly at the bottom */}
                                <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                                    <button
                                        onClick={() => navigate('/login')}
                                        style={{
                                            width: '100%',
                                            padding: '12px 20px',
                                            borderRadius: 10,
                                            fontWeight: 700,
                                            fontSize: 14,
                                            cursor: 'pointer',
                                            border: plan.isPopular ? 'none' : '1px solid rgba(59, 130, 246, 0.35)',
                                            background: plan.isPopular ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)' : 'rgba(255, 255, 255, 0.04)',
                                            color: '#ffffff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                            transition: 'all 0.25s ease',
                                            boxShadow: plan.isPopular ? '0 4px 20px rgba(37, 99, 235, 0.4)' : 'none'
                                        }}
                                    >
                                        Get Started
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ CTA BANNER SECTION ══════════════════════════════════════════ */}
            <section style={{ padding: '80px 0', position: 'relative' }}>
                <div className="container-custom">
                    <div style={{
                        position: 'relative',
                        borderRadius: 24,
                        overflow: 'hidden',
                        padding: isMobile ? '48px 24px' : '72px 48px',
                        textAlign: 'center',
                        border: '1px solid rgba(59, 130, 246, 0.35)',
                        backgroundImage: 'linear-gradient(rgba(11, 19, 43, 0.88), rgba(11, 19, 43, 0.92)), url(https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1600&auto=format&fit=crop)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
                    }}>
                        <div style={{ position: 'relative', zIndex: 2, maxWidth: 700, margin: '0 auto' }}>
                            <div className="pill-tag" style={{ background: 'rgba(11, 19, 43, 0.9)', marginBottom: 20 }}>
                                <Building2 size={14} color="#60a5fa" /> Ready to build smarter?
                            </div>

                            <h2 className="font-title" style={{
                                fontSize: 'clamp(30px, 4.5vw, 50px)',
                                fontWeight: 800,
                                color: '#ffffff',
                                marginBottom: 16,
                                lineHeight: 1.15
                            }}>
                                Transform Your <span className="gradient-text-blue">Construction Business Today</span>
                            </h2>

                            <p style={{ color: '#cbd5e1', fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
                                Join hundreds of general contractors and site engineers who have already streamlined their construction projects with KT Construct.
                            </p>

                            <button onClick={() => navigate('/login')} className="btn-white">
                                Start Free Trial <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ FOOTER SECTION ══════════════════════════════════════════════ */}
            <footer id="contact" style={{
                background: '#070b19',
                borderTop: '1px solid rgba(59, 130, 246, 0.2)',
                paddingTop: 70,
                paddingBottom: 30
            }}>
                <div className="container-custom">
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 40,
                        marginBottom: 60
                    }}>
                        {/* Brand Info */}
                        <div style={{ gridColumn: isMobile ? 'span 1' : 'span 1' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                <div style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    background: 'radial-gradient(circle, rgba(37, 99, 235, 0.3) 0%, rgba(15, 23, 42, 0.85) 100%)',
                                    border: '1.5px solid rgba(96, 165, 250, 0.45)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 5,
                                    boxShadow: '0 0 14px rgba(37, 99, 235, 0.35)',
                                    flexShrink: 0,
                                    overflow: 'hidden'
                                }}>
                                    <img src={Logo} alt="KT Construct" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                                <span className="font-title" style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>
                                    KT <span style={{ color: '#3b82f6' }}>CONSTRUCT</span>
                                </span>
                            </div>
                            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 20 }}>
                                The complete construction management platform for contractors, site engineers, and project leaders. Streamline RFQs, bids, POs, and daily site logs.
                            </p>
                            {/* Social Icons */}
                            <div style={{ display: 'flex', gap: 10 }}>
                                {['KC', 'IN', 'TW', 'FB'].map((social, i) => (
                                    <div key={i} style={{
                                        width: 32, height: 32, borderRadius: 8,
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 11, fontWeight: 700, color: '#60a5fa', cursor: 'pointer'
                                    }}>
                                        {social}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', marginBottom: 18, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Quick Links
                            </h4>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {['Home', 'About Us', 'Pricing', 'Blog', 'Contact'].map(link => (
                                    <li key={link}>
                                        <a href={'#' + link.toLowerCase().replace(' ', '-')} style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}
                                            onMouseEnter={e => e.target.style.color = '#60a5fa'}
                                            onMouseLeave={e => e.target.style.color = '#94a3b8'}
                                        >
                                            {link}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Software Modules */}
                        <div>
                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', marginBottom: 18, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Software Modules
                            </h4>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {['Site Daily Logs', 'RFQs & Bids Management', 'Purchase Orders (PO)', 'Subcontractor Portal', 'Blueprint Vault'].map(s => (
                                    <li key={s}>
                                        <a href="#features" style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}
                                            onMouseEnter={e => e.target.style.color = '#60a5fa'}
                                            onMouseLeave={e => e.target.style.color = '#94a3b8'}
                                        >
                                            {s}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Contact Us */}
                        <div>
                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', marginBottom: 18, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Contact Us
                            </h4>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <li style={{ display: 'flex', gap: 10, fontSize: 13, color: '#94a3b8' }}>
                                    <MapPin size={16} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
                                    <span>24751, Sector 62 Noida, India, 20130</span>
                                </li>
                                <li style={{ display: 'flex', gap: 10, fontSize: 13, color: '#94a3b8' }}>
                                    <Phone size={16} color="#60a5fa" style={{ flexShrink: 0 }} />
                                    <span>+91 97551 55968</span>
                                </li>
                                <li style={{ display: 'flex', gap: 10, fontSize: 13, color: '#94a3b8' }}>
                                    <Mail size={16} color="#60a5fa" style={{ flexShrink: 0 }} />
                                    <span>info@kiaantechnology.com</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom Copyright Bar */}
                    <div style={{
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        paddingTop: 24,
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 16
                    }}>
                        <p style={{ fontSize: 12, color: '#64748b', textAlign: isMobile ? 'center' : 'left' }}>
                            © {new Date().getFullYear()} Kiaan Technology. All rights reserved.<br />
                            <span style={{ opacity: 0.8 }}>Powered by Kiaan Technology</span>
                        </p>
                        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {['Privacy Policy', 'Terms & Conditions', 'Documentation', 'Report Owner', 'Contact Us'].map(policy => (
                                <a key={policy} href="#" style={{ fontSize: 12, color: '#64748b', textDecoration: 'none' }}
                                    onMouseEnter={e => e.target.style.color = '#94a3b8'}
                                    onMouseLeave={e => e.target.style.color = '#64748b'}
                                >
                                    {policy}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
            <WhatsAppFloatingButton />
        </div>
    );
};

export default LandingPage;
