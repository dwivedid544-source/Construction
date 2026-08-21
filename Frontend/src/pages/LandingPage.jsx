import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Menu, X, ArrowRight, Building2, HardHat, Hammer, Wrench,
    CheckCircle, ChevronRight, Phone, Mail, MapPin, Star, Shield, Zap, Flame, Award,
    Users, Clock, Activity, ArrowUpRight, Lock, Check, HelpCircle, ClipboardCheck,
    Globe, Smartphone, FileText, PieChart, Wallet, Layers, ShieldCheck, Truck,
    Instagram, Linkedin, Youtube, Camera
} from 'lucide-react';
import Logo from '../assets/images/Logo.png';
import landingPageImg from '../assets/images/landingpage.png';
import siteEngineerTablet from '../assets/images/site_engineer_tablet.jpg';
import siteInspectionTeam from '../assets/images/site_inspection_team.jpg';
import api from '../utils/api';

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
    const [privacyOpen, setPrivacyOpen] = useState(false);
    const [termsOpen, setTermsOpen] = useState(false);

    // Subscription Modal State (Matching User Specification)
    const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
    const [selectedPlanForModal, setSelectedPlanForModal] = useState(null);
    const [formData, setFormData] = useState({
        companyName: '',
        city: '',
        email: '',
        phone: '',
        password: '',
        startDate: new Date().toISOString().split('T')[0],
        photo: null
    });
    const [photoPreview, setPhotoPreview] = useState(null);
    const [submittingPayment, setSubmittingPayment] = useState(false);
    const [showQRStep, setShowQRStep] = useState(false);
    const [qrPaymentData, setQrPaymentData] = useState(null); // { planName, priceStr, amount, qrUrl }

    // Customization Modal State (For Custom Plan & White-label requests)
    const [customModalOpen, setCustomModalOpen] = useState(false);
    const [customFormData, setCustomFormData] = useState({
        fullName: '',
        phone: '',
        email: '',
        companyName: '',
        city: '',
        interestedPlan: 'Custom Enterprise Plan'
    });

    const handleCustomSubmit = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!customFormData.fullName || !customFormData.phone) {
            alert('Please enter your Full Name and Phone Number.');
            return;
        }

        const msg = `Hello KT Construct Team, I am interested in your Construction Management SaaS Platform.

*Customization Request Details:*
• *Full Name:* ${customFormData.fullName}
• *Phone:* ${customFormData.phone}
• *Email:* ${customFormData.email || 'N/A'}
• *Company Name:* ${customFormData.companyName || 'N/A'}
• *City:* ${customFormData.city || 'N/A'}
• *Interested Plan:* ${customFormData.interestedPlan || 'Custom Enterprise Plan'}`;

        const waUrl = `https://api.whatsapp.com/send?phone=919752100980&text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');
        setCustomModalOpen(false);
    };

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

    // Default Subscription Plans (Matching Screenshot 1 & Construction SaaS)
    const defaultPlans = [
        {
            name: "FREE TRIAL",
            tag: "TEST DRIVE",
            description: "Experience the full platform core with site logs, sample projects & daily reports to explore KT Construct.",
            price: "₹0",
            numericPrice: 0,
            period: "/ 7 days",
            duration: "Duration: 7 Days Trial",
            features: [
                "Basic Daily Site Logs & Tasks",
                "1 Active Construction Project",
                "3 Active Job Sites & Work Orders",
                "Staff shift & attendance log access",
                "1 Connected Mobile Terminal",
                "7-Day trial duration"
            ],
            isPopular: false,
            buttonText: "START 7-DAY TRIAL"
        },
        {
            name: "STARTER PLAN",
            tag: "SMALL TEAM",
            description: "Perfect for independent contractors, small builders, or stand-alone site teams.",
            price: "₹999",
            numericPrice: 999,
            period: "/ month",
            duration: "Monthly Billing",
            features: [
                "Full Site Daily Logs & Receipts",
                "Up to 3 Active Construction Projects",
                "Up to 5 Job Sites & Work Orders",
                "Subcontractor RFQs & Bidding Hub",
                "Purchase Orders (PO) & Invoices",
                "Basic stock level & low alerts",
                "Up to 5 team members connected"
            ],
            isPopular: false,
            buttonText: "CHOOSE PLAN"
        },
        {
            name: "STANDARD PLAN",
            tag: "RECOMMENDED",
            description: "Best for growing general contractors, commercial builders, and engineering firms.",
            price: "₹1,299",
            numericPrice: 1299,
            period: "/ month",
            duration: "Monthly Billing",
            features: [
                "Everything in Starter Plan",
                "Up to 10 Active Construction Projects",
                "Up to 25 Active Job Locations",
                "Interactive Gantt & Milestone Schedules",
                "GPS Site Clock-in & Crew Geofencing",
                "Blueprint Vault & RFI System (25 GB)",
                "Staff shift & role permissions",
                "Up to 15 team members active"
            ],
            isPopular: true,
            buttonText: "CHOOSE PLAN"
        },
        {
            name: "PRO PLAN",
            tag: "UNCAPPED POWER",
            description: "For multi-location developers, heavy infra contractors, and construction groups.",
            price: "₹1,499",
            numericPrice: 1499,
            period: "/ month",
            duration: "Monthly Billing",
            features: [
                "Everything in Standard Plan",
                "Multi-site central control ERP",
                "Up to 50 Active Projects & 100 Jobs",
                "AI-Powered Scheduling & Delay Forecasts",
                "Full PO & Raw Material Invoicing ERP",
                "Priority 24/7 dedicated support",
                "Unlimited terminal sessions",
                "Export CSV & PDF financial audit reports"
            ],
            isPopular: false,
            buttonText: "CHOOSE PLAN"
        },
        {
            name: "CUSTOM PLAN",
            tag: "CUSTOM",
            description: "Tailored to your enterprise construction operations & custom workflows.",
            price: "Custom",
            numericPrice: 0,
            period: "",
            duration: "Annual Enterprise",
            features: [
                "SaaS with full customization",
                "Personal domain & white-labeling",
                "Personal branding",
                "AI and automation",
                "Custom integrations & dedicated SLA"
            ],
            isPopular: false,
            buttonText: "GET STARTED"
        }
    ];

    useEffect(() => {
        const fetchLivePlans = async () => {
            try {
                const plansRes = await api.get('/plans');
                const plansData = plansRes?.data;
                if (Array.isArray(plansData) && plansData.length >= 3) {
                    // Strictly sort so Custom Plan is always last
                    const sorted = [...plansData].sort((a, b) => {
                        const isCustomA = a.period === 'custom' || a.name?.toLowerCase().includes('custom') || (a.price === 0 && !a.name?.toLowerCase().includes('trial'));
                        const isCustomB = b.period === 'custom' || b.name?.toLowerCase().includes('custom') || (b.price === 0 && !b.name?.toLowerCase().includes('trial'));
                        if (isCustomA) return 1;
                        if (isCustomB) return -1;
                        return a.price - b.price;
                    });

                    setPricingPlans(sorted.map(p => {
                        const isCustom = p.period === 'custom' || p.price === 0 && p.name.toLowerCase().includes('custom');
                        const isFree = p.price === 0 && !isCustom;
                        const pName = p.name.toUpperCase();
                        let defaultMatch = defaultPlans.find(d => d.name.toUpperCase() === pName || d.tag === p.tag) || {};

                        return {
                            id: p._id || p.id,
                            name: p.name.toUpperCase().includes('PLAN') ? p.name.toUpperCase() : `${p.name.toUpperCase()} PLAN`,
                            tag: p.tag || defaultMatch.tag || (p.isPopular ? 'RECOMMENDED' : (isFree ? 'TEST DRIVE' : (isCustom ? 'CUSTOM' : 'SMALL TEAM'))),
                            description: p.description || defaultMatch.description || 'Comprehensive construction management suite tailored for your team.',
                            price: isCustom ? 'Custom' : (isFree ? '₹0' : (typeof p.price === 'number' ? '₹' + p.price.toLocaleString('en-IN') : p.price)),
                            numericPrice: p.price,
                            period: isCustom ? '' : (isFree ? '/ 7 days' : '/ month'),
                            duration: isFree ? 'Duration: 7 Days Trial' : (isCustom ? 'Annual Enterprise' : 'Monthly Billing'),
                            features: Array.isArray(p.features) && p.features.length > 0 ? p.features : (defaultMatch.features || []),
                            isPopular: Boolean(p.isPopular),
                            maxUsers: p.maxUsers,
                            maxProjects: p.maxProjects,
                            maxJobs: p.maxJobs,
                            buttonText: isFree ? 'START 7-DAY TRIAL' : (isCustom ? 'GET STARTED' : 'CHOOSE PLAN')
                        };
                    }));
                } else {
                    setPricingPlans(defaultPlans);
                }
            } catch (e) {
                console.error("Error fetching live plans on landing page:", e);
                setPricingPlans(defaultPlans);
            }
        };

        fetchLivePlans();
    }, []);

    const openPlanModal = (plan) => {
        setSelectedPlanForModal(plan || defaultPlans[1]);
        setFormData({
            companyName: '',
            city: '',
            email: '',
            phone: '',
            password: '',
            startDate: new Date().toISOString().split('T')[0],
            photo: null
        });
        setPhotoPreview(null);
        setSubmittingPayment(false);
        setSubscriptionModalOpen(true);
    };

    const fileToBase64 = (file) => new Promise((resolve) => {
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
    });

    // ── Payment Handler: Launch Official Razorpay Payment Gateway (Live API) ────
    const handleModalPaymentSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!formData.companyName || !formData.city || !formData.email || !formData.phone || !formData.password) {
            alert('Please fill in all required fields (Company Name, City, Email Address, Mobile Number, Password).');
            return;
        }

        const planObj = selectedPlanForModal || defaultPlans[1];
        const planName = planObj.name;
        const planPriceStr = planObj.price;

        let numericAmount = 1;
        if (typeof planPriceStr === 'number') {
            numericAmount = planPriceStr;
        } else if (typeof planPriceStr === 'string') {
            const cleaned = planPriceStr.replace(/,/g, '').replace(/[^0-9.]/g, '');
            numericAmount = cleaned === '' ? 1 : parseFloat(cleaned);
        }

        const logoBase64 = formData.photo ? await fileToBase64(formData.photo) : null;

        // FREE plan → skip payment, go straight to register
        if (numericAmount === 0 || String(planName).toLowerCase().includes('free')) {
            setSubmittingPayment(true);
            try {
                await api.post('/auth/register-subscription', {
                    companyName: formData.companyName, city: formData.city,
                    email: formData.email, phone: formData.phone,
                    password: formData.password, planName: planName,
                    price: planPriceStr, startDate: formData.startDate,
                    logo: logoBase64,
                    paymentId: 'free_trial'
                });
                localStorage.setItem('mustChangePassword', 'true');
                localStorage.setItem('purchasedEmail', formData.email);
                alert(`🎉 Free Trial Activated!\n\nYour 7-day account is ready. Activation email sent to ${formData.email}.`);
                setSubscriptionModalOpen(false);
                navigate('/login');
            } catch (err) {
                alert(err.response?.data?.message || 'Account created! Please login.');
                setSubscriptionModalOpen(false);
                navigate('/login');
            } finally {
                setSubmittingPayment(false);
            }
            return;
        }

        setSubmittingPayment(true);

        // Step 1: Pre-check eligibility on backend BEFORE launching payment gateway!
        try {
            await api.post('/auth/check-subscription-eligibility', {
                email: formData.email,
                phone: formData.phone,
                planName: planName,
                price: planPriceStr,
            });
        } catch (preCheckErr) {
            setSubmittingPayment(false);
            alert(preCheckErr.response?.data?.message || 'Verification failed. You are not eligible to claim this offer.');
            return; // STOP HERE! Do not launch Razorpay modal, zero money charged.
        }

        // Live Razorpay Key
        const key = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_T2CGGz8NLUuopj';

        const loadScript = (src) => new Promise((resolve) => {
            if (window.Razorpay) { resolve(true); return; }
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });

        const loaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
        if (!loaded) {
            alert('Razorpay SDK failed to load. Please check your internet connection.');
            setSubmittingPayment(false);
            return;
        }

        const options = {
            key: key,
            amount: Math.round(numericAmount * 100), // Amount in paise
            currency: 'INR',
            name: 'Kiaan Technology Pvt Ltd',
            description: `KT Construct - ${planName} Subscription`,
            image: Logo,
            modal: {
                ondismiss: function () {
                    setSubmittingPayment(false);
                }
            },
            handler: async function (response) {
                try {
                    // Send registration & trigger custom KT Construct welcome email after backend verification
                    await api.post('/auth/register-subscription', {
                        companyName: formData.companyName,
                        city: formData.city,
                        email: formData.email,
                        phone: formData.phone,
                        password: formData.password,
                        planName: planName,
                        price: planPriceStr,
                        startDate: formData.startDate,
                        logo: logoBase64,
                        paymentId: response.razorpay_payment_id || 'pay_success',
                        razorpayOrderId: response.razorpay_order_id,
                        razorpaySignature: response.razorpay_signature,
                    });

                    localStorage.setItem('mustChangePassword', 'true');
                    localStorage.setItem('purchasedEmail', formData.email);
                    alert(`✅ Payment Verified & Successful!\nPayment ID: ${response.razorpay_payment_id || 'Success'}\n\nYour KT Construct account has been activated! An activation email has been sent to ${formData.email}.`);
                    setSubscriptionModalOpen(false);
                    navigate('/login');
                } catch (err) {
                    console.error('[Subscription error]', err);
                    alert(err.response?.data?.message || 'Payment processed successfully! Redirecting to login...');
                    setSubscriptionModalOpen(false);
                    navigate('/login');
                } finally {
                    setSubmittingPayment(false);
                }
            },
            prefill: {
                name: formData.companyName,
                email: formData.email,
                contact: formData.phone
            },
            theme: {
                color: '#3b82f6'
            }
        };

        try {
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (resp) {
                alert(`Payment Failed: ${resp.error?.description || 'Transaction declined'}`);
                setSubmittingPayment(false);
            });
            rzp.open();
        } catch (rzpErr) {
            console.error('[Razorpay open error]', rzpErr);
            alert('Failed to launch payment gateway: ' + (rzpErr.message || 'Unknown error'));
            setSubmittingPayment(false);
        }
    };

    const handleRazorpayPayment = (amountInRupees = 999, planName = 'KT Construct Subscription') => {
        let numericAmount = 999;
        if (typeof amountInRupees === 'number') {
            numericAmount = amountInRupees;
        } else if (typeof amountInRupees === 'string') {
            const cleaned = amountInRupees.replace(/[^0-9]/g, '');
            numericAmount = cleaned === '' ? 0 : parseInt(cleaned, 10);
        }

        // FREE PLAN (₹0) -> Skip Razorpay payment & redirect to Register for 7-day trial!
        if (numericAmount === 0 || amountInRupees === 0 || amountInRupees === '₹0' || String(planName).toLowerCase().includes('free')) {
            localStorage.setItem('selectedPlan', 'Free Trial (7 Days)');
            localStorage.setItem('isTrialActive', 'true');
            navigate('/register?plan=free');
            return;
        }

        // Redirect directly to register so they pay securely inside the dashboard after registration
        navigate(`/register?plan=${encodeURIComponent(planName)}`);
    };

    const navLinks = [
        { name: 'Home', href: '#home' },
        { name: 'Features', href: '#features' },
        { name: 'Field Operations', href: '#field-showcase' },
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

    const mainContent = (
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
                            onClick={() => {
                                setIsMenuOpen(false);
                                navigate('/login');
                            }}
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
                                <button onClick={() => openPlanModal(defaultPlans[1])} className="btn-blue">
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

            {/* ══ ON-SITE FIELD OPERATIONS SHOWCASE ═══════════════════════════ */}
            <section id="field-showcase" style={{
                padding: '90px 0',
                background: 'radial-gradient(ellipse at center, rgba(30, 41, 59, 0.65) 0%, #0b132b 100%)',
                position: 'relative',
                borderTop: '1px solid rgba(59, 130, 246, 0.15)',
                borderBottom: '1px solid rgba(59, 130, 246, 0.15)'
            }}>
                {/* Ambient glow effect */}
                <div className="glow-orb" style={{ top: '20%', right: '-5%', width: 450, height: 450, background: 'rgba(59, 130, 246, 0.14)' }} />
                <div className="glow-orb" style={{ bottom: '10%', left: '-5%', width: 450, height: 450, background: 'rgba(14, 165, 233, 0.12)' }} />

                <div className="container-custom" style={{ position: 'relative', zIndex: 2 }}>
                    <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 60px' }}>
                        <div className="pill-tag" style={{ marginBottom: 16 }}>
                            <HardHat size={14} color="#60a5fa" /> Real Construction Sites In Action
                        </div>
                        <h2 className="font-title" style={{
                            fontSize: 'clamp(28px, 4vw, 44px)',
                            fontWeight: 800,
                            color: '#ffffff',
                            marginBottom: 16
                        }}>
                            Empowering Field Engineers & <span className="gradient-text-blue">Project Teams On-Site</span>
                        </h2>
                        <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7 }}>
                            From scaffolding daily logs on mobile tablets to live contractor collaboration and laser measurements on job sites — KT Construct bridges field execution with office control.
                        </p>
                    </div>

                    {/* 2 Image Cards Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                        gap: 32,
                        alignItems: 'stretch'
                    }}>
                        {/* Image 1 Card: Site Engineer with Tablet */}
                        <div className="dark-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ position: 'relative', height: isMobile ? 260 : 340, overflow: 'hidden' }}>
                                <img
                                    src={siteEngineerTablet}
                                    alt="Site Safety & Daily Log Tracking"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        transition: 'transform 0.5s ease',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                />
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: 'linear-gradient(180deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.85) 100%)'
                                }} />
                                <div style={{
                                    position: 'absolute', top: 16, left: 16,
                                    background: 'rgba(11, 19, 43, 0.85)',
                                    backdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(96, 165, 250, 0.4)',
                                    padding: '6px 14px',
                                    borderRadius: 9999,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: '#60a5fa'
                                }}>
                                    <CheckCircle size={14} color="#60a5fa" /> Field Daily Logs & Safety
                                </div>
                            </div>
                            <div style={{ padding: 28, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                    <h3 className="font-title" style={{ fontSize: 21, fontWeight: 700, color: '#ffffff', marginBottom: 10 }}>
                                        Instant Field Audits & Digital Punch Lists
                                    </h3>
                                    <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, marginBottom: 20 }}>
                                        Site engineers capture site progress, log daily workforce counts, monitor safety equipment compliance, and update digital punch lists on mobile devices directly from job site scaffolding.
                                    </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 20, borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 16, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1', fontWeight: 600 }}>
                                        <Smartphone size={16} color="#60a5fa" /> Mobile & Tablet Access
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1', fontWeight: 600 }}>
                                        <ShieldCheck size={16} color="#60a5fa" /> Instant Cloud Sync
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Image 2 Card: Construction Inspection Team */}
                        <div className="dark-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ position: 'relative', height: isMobile ? 260 : 340, overflow: 'hidden' }}>
                                <img
                                    src={siteInspectionTeam}
                                    alt="Site Managers & Engineers Collaboration"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        transition: 'transform 0.5s ease',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                />
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: 'linear-gradient(180deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.85) 100%)'
                                }} />
                                <div style={{
                                    position: 'absolute', top: 16, left: 16,
                                    background: 'rgba(11, 19, 43, 0.85)',
                                    backdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(96, 165, 250, 0.4)',
                                    padding: '6px 14px',
                                    borderRadius: 9999,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: '#60a5fa'
                                }}>
                                    <Users size={14} color="#60a5fa" /> On-Site Team Collaboration
                                </div>
                            </div>
                            <div style={{ padding: 28, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                    <h3 className="font-title" style={{ fontSize: 21, fontWeight: 700, color: '#ffffff', marginBottom: 10 }}>
                                        Collaborative RFQs & Blueprint Verification
                                    </h3>
                                    <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, marginBottom: 20 }}>
                                        General contractors and site managers review active RFQs, check laser survey data, align on blueprint specs, and manage sub-contractor estimates right at the construction site.
                                    </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 20, borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 16, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1', fontWeight: 600 }}>
                                        <FileText size={16} color="#60a5fa" /> Live Blueprint Vault
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1', fontWeight: 600 }}>
                                        <Layers size={16} color="#60a5fa" /> Subcontractor RFQ Hub
                                    </div>
                                </div>
                            </div>
                        </div>
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
            <section id="pricing" style={{ padding: '100px 0', position: 'relative' }}>
                <div className="container-custom" style={{ maxWidth: 1380 }}>
                    <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 60px' }}>
                        <div className="pill-tag" style={{ marginBottom: 16 }}>
                            <Wallet size={14} color="#60a5fa" /> Transparent SaaS Pricing
                        </div>
                        <h2 className="font-title" style={{
                            fontSize: 'clamp(28px, 4.5vw, 44px)',
                            fontWeight: 800,
                            color: '#ffffff',
                            marginBottom: 16
                        }}>
                            Choose Your <span className="gradient-text-blue">Perfect Plan</span>
                        </h2>
                        <p style={{ color: '#94a3b8', fontSize: 15 }}>
                            Flexible, transparent pricing tailored for general contractors, site engineers, and growing construction firms.
                        </p>
                    </div>

                    {/* 5-Column Pricing Cards Grid (Dark Navy & Electric Blue Aesthetic) */}
                    {(() => {
                        const rawPlans = pricingPlans.length > 0 ? pricingPlans : defaultPlans;
                        // Always ensure Custom Plan is in the 5th (last) position
                        const displayPlans = [...rawPlans].sort((a, b) => {
                            const isCustomA = a.period === 'custom' || a.name?.toLowerCase().includes('custom') || a.price === 'Custom' || (a.numericPrice === 0 && !a.name?.toLowerCase().includes('trial'));
                            const isCustomB = b.period === 'custom' || b.name?.toLowerCase().includes('custom') || b.price === 'Custom' || (b.numericPrice === 0 && !b.name?.toLowerCase().includes('trial'));
                            if (isCustomA) return 1;
                            if (isCustomB) return -1;
                            return (a.numericPrice || 0) - (b.numericPrice || 0);
                        });

                        return (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(235px, 1fr))',
                                gap: isMobile ? 24 : 16,
                                alignItems: 'stretch'
                            }}>
                                {displayPlans.map((plan, i) => {
                                    const isRecommended = Boolean(plan.isPopular || plan.tag === 'RECOMMENDED' || plan.name.includes('STANDARD'));
                                    const isCustom = plan.price === 'Custom' || (plan.numericPrice === 0 && plan.name.includes('CUSTOM'));
                                    const isFree = plan.numericPrice === 0 && !isCustom;

                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                background: isRecommended
                                                    ? 'linear-gradient(180deg, rgba(22, 38, 70, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)'
                                                    : 'rgba(15, 23, 42, 0.75)',
                                                backdropFilter: 'blur(16px)',
                                                WebkitBackdropFilter: 'blur(16px)',
                                                borderRadius: 24,
                                                padding: '28px 20px 24px',
                                                border: isRecommended
                                                    ? '2px solid #3b82f6'
                                                    : '1px solid rgba(59, 130, 246, 0.22)',
                                                boxShadow: isRecommended
                                                    ? '0 16px 45px rgba(37, 99, 235, 0.35)'
                                                    : '0 8px 30px rgba(0, 0, 0, 0.25)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease'
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.transform = 'translateY(-6px)';
                                                e.currentTarget.style.boxShadow = isRecommended
                                                    ? '0 22px 55px rgba(37, 99, 235, 0.45)'
                                                    : '0 14px 36px rgba(37, 99, 235, 0.2)';
                                                if (!isRecommended) {
                                                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.55)';
                                                }
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = isRecommended
                                                    ? '0 16px 45px rgba(37, 99, 235, 0.35)'
                                                    : '0 8px 30px rgba(0, 0, 0, 0.25)';
                                                if (!isRecommended) {
                                                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.22)';
                                                }
                                            }}
                                        >
                                            {/* Diagonal Corner POPULAR Ribbon for Recommended Card */}
                                            {isRecommended && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 18,
                                                    right: -32,
                                                    transform: 'rotate(45deg)',
                                                    background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
                                                    color: '#ffffff',
                                                    fontSize: 10,
                                                    fontWeight: 900,
                                                    letterSpacing: '0.12em',
                                                    padding: '4px 38px',
                                                    boxShadow: '0 2px 10px rgba(37, 99, 235, 0.5)',
                                                    textTransform: 'uppercase',
                                                    zIndex: 2
                                                }}>
                                                    POPULAR
                                                </div>
                                            )}

                                            <div>
                                                {/* Top Tag Pill */}
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    padding: '4px 12px',
                                                    borderRadius: 12,
                                                    background: isRecommended
                                                        ? 'rgba(37, 99, 235, 0.22)'
                                                        : 'rgba(255, 255, 255, 0.05)',
                                                    color: isRecommended ? '#60a5fa' : '#94a3b8',
                                                    border: isRecommended
                                                        ? '1px solid rgba(59, 130, 246, 0.4)'
                                                        : '1px solid rgba(255, 255, 255, 0.1)',
                                                    fontSize: 11,
                                                    fontWeight: 800,
                                                    letterSpacing: '0.06em',
                                                    textTransform: 'uppercase',
                                                    marginBottom: 16
                                                }}>
                                                    {plan.tag || (isFree ? 'TEST DRIVE' : (isRecommended ? 'RECOMMENDED' : (isCustom ? 'CUSTOM' : 'SMALL TEAM')))}
                                                </div>

                                                {/* Plan Title */}
                                                <h3 style={{
                                                    fontSize: 19,
                                                    fontWeight: 800,
                                                    color: isRecommended ? '#60a5fa' : '#ffffff',
                                                    marginBottom: 8,
                                                    letterSpacing: '-0.01em',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {plan.name}
                                                </h3>

                                                {/* Subtitle Description */}
                                                <p style={{
                                                    fontSize: 12,
                                                    color: '#94a3b8',
                                                    lineHeight: 1.45,
                                                    marginBottom: 20,
                                                    minHeight: 38
                                                }}>
                                                    {plan.description}
                                                </p>

                                                {/* Price Header */}
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                                    <span style={{
                                                        fontSize: plan.price === 'Custom' ? 28 : 34,
                                                        fontWeight: 900,
                                                        color: '#ffffff',
                                                        letterSpacing: '-0.02em'
                                                    }}>
                                                        {plan.price}
                                                    </span>
                                                    {plan.period && (
                                                        <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
                                                            {plan.period}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Features Checklist */}
                                                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28, padding: 0 }}>
                                                    {plan.features.map((feat, fIdx) => (
                                                        <li key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.4 }}>
                                                            <div style={{
                                                                width: 18,
                                                                height: 18,
                                                                borderRadius: '50%',
                                                                background: isRecommended ? 'rgba(37, 99, 235, 0.25)' : 'rgba(59, 130, 246, 0.15)',
                                                                border: isRecommended ? '1px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.3)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexShrink: 0,
                                                                marginTop: 1
                                                            }}>
                                                                <Check size={11} color="#60a5fa" strokeWidth={3} />
                                                            </div>
                                                            <span>{feat}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Bottom Action Button */}
                                            <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                                                <button
                                                    onClick={() => {
                                                        if (isFree) {
                                                            navigate('/register?plan=Free%20Trial');
                                                        } else if (isCustom) {
                                                            setCustomModalOpen(true);
                                                        } else {
                                                            openPlanModal(plan);
                                                        }
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px 16px',
                                                        borderRadius: 16,
                                                        fontWeight: 800,
                                                        fontSize: 13,
                                                        cursor: 'pointer',
                                                        border: isRecommended ? 'none' : '1px solid rgba(59, 130, 246, 0.3)',
                                                        background: isRecommended
                                                            ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)'
                                                            : 'rgba(255, 255, 255, 0.04)',
                                                        color: '#ffffff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 6,
                                                        transition: 'all 0.2s ease',
                                                        letterSpacing: '0.04em',
                                                        textTransform: 'uppercase',
                                                        boxShadow: isRecommended ? '0 6px 20px rgba(37, 99, 235, 0.45)' : 'none'
                                                    }}
                                                    onMouseEnter={e => {
                                                        if (isRecommended) {
                                                            e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 50%, #2563eb 100%)';
                                                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(37, 99, 235, 0.6)';
                                                        } else {
                                                            e.currentTarget.style.background = 'rgba(37, 99, 235, 0.16)';
                                                            e.currentTarget.style.borderColor = '#3b82f6';
                                                        }
                                                    }}
                                                    onMouseLeave={e => {
                                                        if (isRecommended) {
                                                            e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)';
                                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.45)';
                                                        } else {
                                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                                            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                                                        }
                                                    }}
                                                >
                                                    <span>{plan.buttonText || (isFree ? 'START 7-DAY TRIAL' : (isCustom ? 'GET STARTED' : 'CHOOSE PLAN'))}</span>
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
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

                            <button onClick={() => handleRazorpayPayment(999, 'KT Construct Free Trial')} className="btn-white">
                                Start Free Trial <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ FOOTER SECTION ══════════════════════════════════════════════ */}
            <footer id="contact" style={{
                background: '#0a0d18',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: 60,
                paddingBottom: 30,
                color: '#94a3b8'
            }}>
                <div className="container-custom">
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 40,
                        marginBottom: 50
                    }}>
                        {/* Brand Info */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                <div style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: '50%',
                                    background: 'radial-gradient(circle, rgba(217, 119, 6, 0.3) 0%, rgba(15, 23, 42, 0.9) 100%)',
                                    border: '1.5px solid rgba(245, 158, 11, 0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 4,
                                    boxShadow: '0 0 12px rgba(245, 158, 11, 0.25)',
                                    flexShrink: 0,
                                    overflow: 'hidden'
                                }}>
                                    <img src={Logo} alt="KT Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                                <span className="font-title" style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em' }}>
                                    KIAAN <span style={{ color: '#d97706', fontWeight: 600 }}>TECHNOLOGY</span>
                                </span>
                            </div>
                            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 20, maxWidth: 300 }}>
                                The ultimate super admin platform to manage all your business softwares from one centralized, intelligent dashboard.
                            </p>
                            {/* Social Hyperlinked Icons */}
                            <div style={{ display: 'flex', gap: 12 }}>
                                <a href="https://www.instagram.com/kiaan_technology4/" target="_blank" rel="noopener noreferrer"
                                    title="Instagram"
                                    style={{
                                        width: 36, height: 36, borderRadius: '50%',
                                        background: 'rgba(255, 255, 255, 0.06)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#cbd5e1', textDecoration: 'none', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'; e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.color = '#ffffff'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'; e.currentTarget.style.color = '#cbd5e1'; }}
                                >
                                    <Instagram size={16} />
                                </a>

                                <a href="https://www.linkedin.com/company/kiaan-technology-pvt-ltd/posts/?feedView=all" target="_blank" rel="noopener noreferrer"
                                    title="LinkedIn"
                                    style={{
                                        width: 36, height: 36, borderRadius: '50%',
                                        background: 'rgba(255, 255, 255, 0.06)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#cbd5e1', textDecoration: 'none', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'; e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.color = '#ffffff'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'; e.currentTarget.style.color = '#cbd5e1'; }}
                                >
                                    <Linkedin size={16} />
                                </a>

                                <a href="https://www.youtube.com/@kiaantechnology-r3p" target="_blank" rel="noopener noreferrer"
                                    title="YouTube"
                                    style={{
                                        width: 36, height: 36, borderRadius: '50%',
                                        background: 'rgba(255, 255, 255, 0.06)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#cbd5e1', textDecoration: 'none', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'; e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.color = '#ffffff'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'; e.currentTarget.style.color = '#cbd5e1'; }}
                                >
                                    <Youtube size={16} />
                                </a>

                                <a href="https://kiaantechnology.com/" target="_blank" rel="noopener noreferrer"
                                    title="Website"
                                    style={{
                                        width: 36, height: 36, borderRadius: '50%',
                                        background: 'rgba(255, 255, 255, 0.06)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#cbd5e1', textDecoration: 'none', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'; e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.color = '#ffffff'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'; e.currentTarget.style.color = '#cbd5e1'; }}
                                >
                                    <Globe size={16} />
                                </a>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', marginBottom: 18 }}>
                                Quick Links
                            </h4>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {['Home', 'About Us', 'Pricing', 'Blog', 'Contact'].map(link => (
                                    <li key={link}>
                                        <a href={'#' + link.toLowerCase().replace(' ', '-')} style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}
                                            onMouseEnter={e => e.target.style.color = '#ffffff'}
                                            onMouseLeave={e => e.target.style.color = '#94a3b8'}
                                        >
                                            {link}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Softwares */}
                        <div>
                            <h4 style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', marginBottom: 18 }}>
                                Softwares
                            </h4>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {['HRM Software', 'CRM Software', 'Billing System', 'Inventory Management', 'Project Management'].map(s => (
                                    <li key={s}>
                                        <a href="#features" style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}
                                            onMouseEnter={e => e.target.style.color = '#ffffff'}
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
                            <h4 style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', marginBottom: 18 }}>
                                Contact Us
                            </h4>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <li style={{ display: 'flex', gap: 10, fontSize: 13, color: '#94a3b8' }}>
                                    <MapPin size={16} color="#8b5cf6" style={{ flexShrink: 0, marginTop: 2 }} />
                                    <span>2341/E, Sudama Nagar, Indore, M.P.</span>
                                </li>
                                <li style={{ display: 'flex', gap: 10, fontSize: 13, color: '#94a3b8' }}>
                                    <Phone size={16} color="#8b5cf6" style={{ flexShrink: 0 }} />
                                    <a href="tel:+919752100980" style={{ color: '#94a3b8', textDecoration: 'none' }}
                                        onMouseEnter={e => e.target.style.color = '#ffffff'}
                                        onMouseLeave={e => e.target.style.color = '#94a3b8'}
                                    >
                                        +91-97521 00980
                                    </a>
                                </li>
                                <li style={{ display: 'flex', gap: 10, fontSize: 13, color: '#94a3b8' }}>
                                    <Mail size={16} color="#8b5cf6" style={{ flexShrink: 0 }} />
                                    <a href="mailto:info@kiaantechnology.com" style={{ color: '#94a3b8', textDecoration: 'none' }}
                                        onMouseEnter={e => e.target.style.color = '#ffffff'}
                                        onMouseLeave={e => e.target.style.color = '#94a3b8'}
                                    >
                                        info@kiaantechnology.com
                                    </a>
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
                            © {new Date().getFullYear()} Master Hub SaaS. All rights reserved.<br />
                            <a href="https://kiaantechnology.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
                                Powered by Kiaan Technology
                            </a>
                        </p>
                        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button onClick={() => setTermsOpen(true)} style={{
                                fontSize: 12, color: '#64748b', background: 'none', border: 'none',
                                cursor: 'pointer', padding: 0, fontFamily: 'inherit'
                            }}
                                onMouseEnter={e => e.target.style.color = '#94a3b8'}
                                onMouseLeave={e => e.target.style.color = '#64748b'}
                            >
                                Terms &amp; Conditions
                            </button>
                            <button onClick={() => setPrivacyOpen(true)} style={{
                                fontSize: 12, color: '#64748b', background: 'none', border: 'none',
                                cursor: 'pointer', padding: 0, fontFamily: 'inherit'
                            }}
                                onMouseEnter={e => e.target.style.color = '#94a3b8'}
                                onMouseLeave={e => e.target.style.color = '#64748b'}
                            >
                                Privacy Policy
                            </button>
                            {['Documentation', 'Support Center', 'Contact Us'].map(policy => (
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

            {/* ── Privacy Policy Modal ── */}
            {privacyOpen && (
                <div onClick={() => setPrivacyOpen(false)} style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '24px 16px',
                }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 720,
                        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
                        overflow: 'hidden',
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '20px 28px 18px',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                            flexShrink: 0,
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Privacy Policy</h2>
                                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Kiaan Technology Private Limited — Last Updated: 8/6/2026</p>
                            </div>
                            <button onClick={() => setPrivacyOpen(false)} style={{
                                width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)',
                                background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                                flexShrink: 0,
                            }}>×</button>
                        </div>

                        {/* Scrollable body */}
                        <div style={{ overflowY: 'auto', padding: '24px 28px', flex: 1, lineHeight: 1.75, color: '#334155', fontSize: 13.5 }}>
                            <p style={{ marginTop: 0, color: '#475569' }}>
                                Welcome to <strong>Kiaan Technology Private Limited</strong>. This Privacy Policy outlines how we collect, use, process, and protect your personal information when you use our website (<a href="https://kiaantechnology.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>kiaantechnology.com</a>), SaaS platforms, mobile applications, and services (including Payroll Management, HRMS, Job Portals, and Payment Integration). By using our services, you agree to the collection and use of information in accordance with this policy. This policy complies with the <strong>Indian IT Act 2000, DPDP Act 2023, GDPR</strong>, and app store guidelines.
                            </p>

                            {[{
                                title: '1. Information Collection',
                                content: null,
                                bullets: [
                                    '<strong>Personal Data:</strong> Name, email address, phone number, physical address, KYC documents, etc.',
                                    '<strong>Professional Data:</strong> Employee ID, designation, salary details, and resume data for HRMS and Job portals.',
                                    '<strong>Usage Data:</strong> IP address, browser type, device identifiers, and platform usage metrics.',
                                ]
                            }, {
                                title: '2. Personal Data Usage',
                                content: 'We use your data to:',
                                bullets: [
                                    'Provide, operate, and maintain our software solutions.',
                                    'Process payroll, attendance, and recruitment functionalities.',
                                    'Improve and personalize user experience.',
                                    'Communicate regarding updates, security alerts, and support.',
                                ]
                            }, {
                                title: '3. Cookies Policy',
                                content: 'We use cookies and similar tracking technologies to track activity on our service and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.',
                                bullets: null
                            }, {
                                title: '4. Data Retention',
                                content: 'We retain your personal data only for as long as is necessary for the purposes set out in this Privacy Policy, complying with legal obligations, resolving disputes, and enforcing our legal agreements.',
                                bullets: null
                            }, {
                                title: '5. Data Security',
                                content: 'We implement industry-standard security measures (including encryption and secure server infrastructure) to protect your data. However, no method of transmission over the Internet or electronic storage is 100% secure.',
                                bullets: null
                            }, {
                                title: '6. User Rights',
                                content: 'Depending on your jurisdiction (e.g., GDPR, DPDP), you have the right to:',
                                bullets: [
                                    'Access, update, or delete your personal data.',
                                    'Withdraw consent at any time.',
                                    'Object to the processing of your data.',
                                    'Request data portability.',
                                ]
                            }, {
                                title: '7. Third-Party Services',
                                content: 'We may employ third-party companies (such as Razorpay for payments) to facilitate our service. These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.',
                                bullets: null
                            }, {
                                title: '8. Analytics & Tracking',
                                content: 'We may use third-party Service Providers to monitor and analyze the use of our service to improve our offerings.',
                                bullets: null
                            }, {
                                title: '9. Children\'s Privacy',
                                content: 'Our services are not intended for use by children under the age of 18. We do not knowingly collect personally identifiable information from children.',
                                bullets: null
                            }, {
                                title: '10. International Data Transfers',
                                content: 'Your information, including Personal Data, may be transferred to — and maintained on — computers located outside of your state or country where data protection laws may differ. By consenting to this policy, you agree to that transfer.',
                                bullets: null
                            }, {
                                title: '11. Changes to Policy',
                                content: 'We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.',
                                bullets: null
                            }].map(section => (
                                <div key={section.title} style={{ marginBottom: 20 }}>
                                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 6px', paddingBottom: 6, borderBottom: '1px solid #f1f5f9' }}>{section.title}</h3>
                                    {section.content && <p style={{ margin: '0 0 8px' }}>{section.content}</p>}
                                    {section.bullets && (
                                        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            {section.bullets.map((b, i) => (
                                                <li key={i} dangerouslySetInnerHTML={{ __html: b }} />
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}

                            {/* Contact block */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', marginTop: 8 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 10px' }}>12. Contact Information</h3>
                                <p style={{ margin: '0 0 5px' }}>If you have any questions about this Privacy Policy, please contact us:</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#475569' }}>
                                    <span>🏢 <strong>Company:</strong> Kiaan Technology Private Limited</span>
                                    <span>📍 <strong>Address:</strong> 2341/E, Sudama Nagar, Indore, Madhya Pradesh, India</span>
                                    <span>📞 <strong>Phone:</strong> <a href="tel:+919752100980" style={{ color: '#6366f1' }}>+91-97521 00980</a></span>
                                    <span>✉️ <strong>Email:</strong> <a href="mailto:info@kiaantechnology.com" style={{ color: '#6366f1' }}>info@kiaantechnology.com</a></span>
                                    <span>🌐 <strong>Website:</strong> <a href="https://kiaantechnology.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>kiaantechnology.com</a></span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '14px 28px', borderTop: '1px solid #f1f5f9',
                            display: 'flex', justifyContent: 'flex-end', flexShrink: 0,
                            background: '#f8fafc',
                        }}>
                            <button onClick={() => setPrivacyOpen(false)} style={{
                                background: '#0f172a', color: '#fff', border: 'none',
                                borderRadius: 8, padding: '9px 24px', fontSize: 13,
                                fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em',
                            }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Terms & Conditions Modal ── */}
            {termsOpen && (
                <div onClick={() => setTermsOpen(false)} style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '24px 16px',
                }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 720,
                        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
                        overflow: 'hidden',
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '20px 28px 18px',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                            flexShrink: 0,
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Terms &amp; Conditions</h2>
                                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Kiaan Technology Private Limited — Last Updated: 8/6/2026</p>
                            </div>
                            <button onClick={() => setTermsOpen(false)} style={{
                                width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)',
                                background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                                flexShrink: 0,
                            }}>×</button>
                        </div>

                        {/* Scrollable body */}
                        <div style={{ overflowY: 'auto', padding: '24px 28px', flex: 1, lineHeight: 1.75, color: '#334155', fontSize: 13.5 }}>
                            <p style={{ marginTop: 0, color: '#475569' }}>
                                Welcome to the services provided by <strong>Kiaan Technology Private Limited</strong>. By accessing or using our website (<a href="https://kiaantechnology.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>kiaantechnology.com</a>), SaaS Platforms, Mobile Applications, and related services, you agree to be bound by these Terms and Conditions.
                            </p>

                            {[{
                                title: '1. Acceptance of Terms',
                                content: 'By accessing our software services, you confirm that you have read, understood, and agreed to these terms. If you do not agree, you must not use our services.'
                            }, {
                                title: '2. User Accounts',
                                content: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use.'
                            }, {
                                title: '3. Service Usage Rules',
                                content: 'Our services (including Admin, Employer, Employee, and Job Seeker Portals) must be used lawfully. You shall not engage in reverse engineering, data scraping, or deploying malicious code on our platforms.'
                            }, {
                                title: '4. Payroll, HRMS & Job Portal Services',
                                content: 'While we strive for accuracy in our Payroll Management, HRMS, and Recruitment platforms, Kiaan Technology Pvt Ltd is not liable for data entry errors made by users. Employers are solely responsible for compliance with local labor and tax laws.'
                            }, {
                                title: '5. Payment Terms & Subscription Plans',
                                content: 'Payments for subscriptions, API usage, and app developments are handled via integrated secure payment gateways (e.g., Razorpay). Subscription plans auto-renew unless cancelled prior to the renewal date.'
                            }, {
                                title: '6. Refund & Cancellation Rules',
                                content: 'Unless otherwise stated in a specific service contract, all SaaS subscription fees are non-refundable. Cancellations will stop future billing, but active subscriptions will run until the end of the current billing cycle.'
                            }, {
                                title: '7. Intellectual Property Rights',
                                content: 'All code, designs, algorithms, and intellectual property provided by Kiaan Technology Private Limited remain our exclusive property. The software is licensed, not sold, to you.'
                            }, {
                                title: '8. Limitation of Liability',
                                content: 'In no event shall Kiaan Technology Private Limited be liable for any indirect, incidental, special, or consequential damages arising out of your use of the services.'
                            }, {
                                title: '9. Service Availability',
                                content: 'We aim for 99.9% uptime but do not guarantee uninterrupted access. We reserve the right to perform scheduled maintenance, which may temporarily suspend service access.'
                            }, {
                                title: '10. Termination & Suspension',
                                content: 'We reserve the right to suspend or terminate your account immediately if you breach these terms or engage in fraudulent activities.'
                            }, {
                                title: '11. Confidentiality',
                                content: 'Both parties agree to keep all proprietary information, business metrics, and user data strictly confidential and protected from unauthorized disclosure.'
                            }, {
                                title: '12. Dispute Resolution & Governing Law',
                                content: 'These Terms shall be governed by the laws of India. Any disputes arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the courts in Indore, Madhya Pradesh.'
                            }, {
                                title: '13. Indemnification',
                                content: 'You agree to indemnify and hold harmless Kiaan Technology Private Limited against any claims, losses, or damages arising out of your breach of these terms or misuse of the services.'
                            }, {
                                title: '14. Force Majeure',
                                content: 'We shall not be liable for any failure to perform our obligations where such failure results from any cause beyond our reasonable control (e.g., acts of God, strikes, network failures).'
                            }].map(section => (
                                <div key={section.title} style={{ marginBottom: 20 }}>
                                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 6px', paddingBottom: 6, borderBottom: '1px solid #f1f5f9' }}>{section.title}</h3>
                                    <p style={{ margin: 0 }}>{section.content}</p>
                                </div>
                            ))}

                            {/* Contact block */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', marginTop: 8 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 10px' }}>15. Contact Information</h3>
                                <p style={{ margin: '0 0 8px' }}>For any legal inquiries regarding these terms, please contact:</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#475569' }}>
                                    <span>🏢 <strong>Company:</strong> Kiaan Technology Private Limited</span>
                                    <span>📍 <strong>Address:</strong> 2341/E, Sudama Nagar, Indore, Madhya Pradesh, India</span>
                                    <span>📞 <strong>Phone:</strong> <a href="tel:+919752100980" style={{ color: '#6366f1' }}>+91-97521 00980</a></span>
                                    <span>✉️ <strong>Email:</strong> <a href="mailto:info@kiaantechnology.com" style={{ color: '#6366f1' }}>info@kiaantechnology.com</a></span>
                                    <span>🌐 <strong>Website:</strong> <a href="https://kiaantechnology.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>kiaantechnology.com</a></span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '14px 28px', borderTop: '1px solid #f1f5f9',
                            display: 'flex', justifyContent: 'flex-end', flexShrink: 0,
                            background: '#f8fafc',
                        }}>
                            <button onClick={() => setTermsOpen(false)} style={{
                                background: '#0f172a', color: '#fff', border: 'none',
                                borderRadius: 8, padding: '9px 24px', fontSize: 13,
                                fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em',
                            }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ SUBSCRIPTION CHECKOUT POPUP MODAL (CLEAN LIGHT THEME WITH LOGO UPLOAD) ══ */}
            {subscriptionModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    background: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: isMobile ? 16 : 24,
                    overflowY: 'auto'
                }}>
                    <div style={{
                        background: '#ffffff',
                        color: '#0f172a',
                        borderRadius: 24,
                        width: '100%',
                        maxWidth: 490,
                        padding: isMobile ? 22 : 30,
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.2), 0 0 40px rgba(37, 99, 235, 0.1)',
                        border: '1px solid #e2e8f0',
                        position: 'relative',
                        maxHeight: '92vh',
                        overflowY: 'auto',
                        animation: 'fadeIn 0.25s ease-out'
                    }}>
                        {/* Close Button */}
                        <button
                            onClick={() => setSubscriptionModalOpen(false)}
                            style={{
                                position: 'absolute',
                                top: 18,
                                right: 18,
                                background: '#f1f5f9',
                                border: 'none',
                                borderRadius: '50%',
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#64748b',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                        >
                            <X size={18} />
                        </button>

                        {/* Top Center Company Logo Upload Circle */}
                        <div style={{ textAlign: 'center', marginBottom: 14 }}>
                            <label style={{ cursor: 'pointer', display: 'inline-block' }}>
                                <div style={{
                                    width: 76,
                                    height: 76,
                                    borderRadius: '50%',
                                    border: '2px dashed #94a3b8',
                                    background: photoPreview ? `url(${photoPreview}) center/cover no-repeat` : '#f8fafc',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 6px',
                                    color: '#64748b',
                                    transition: 'all 0.2s ease',
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                }}>
                                    {!photoPreview && <>
                                        <Camera size={24} color="#64748b" />
                                        <span style={{ fontSize: 9.5, fontWeight: 700, marginTop: 2, textTransform: 'uppercase', color: '#64748b' }}>Logo</span>
                                    </>}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={e => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            setFormData(prev => ({ ...prev, photo: file }));
                                            setPhotoPreview(URL.createObjectURL(file));
                                        }
                                    }}
                                />
                                <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    {photoPreview ? '✓ Change Company Logo' : '+ Upload Company Logo (Optional)'}
                                </span>
                            </label>
                        </div>

                        {/* Header Title */}
                        <div style={{ textAlign: 'center', marginBottom: 18 }}>
                            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                                🚀 Complete Subscription Setup
                            </h3>
                            <p style={{ fontSize: 12.5, color: '#64748b', margin: 0 }}>
                                Enter your company details to activate your construction workspace
                            </p>
                        </div>

                        {/* Form Fields with NO autofill */}
                        <form onSubmit={handleModalPaymentSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                            
                            {/* Selected Plan Field */}
                            <div>
                                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>
                                    Selected Plan
                                </label>
                                <input
                                    type="text"
                                    readOnly
                                    value={`${selectedPlanForModal?.name || 'STARTER PLAN'} (${selectedPlanForModal?.price || '₹1'})`}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: 12,
                                        border: '1.5px solid #bfdbfe',
                                        background: '#eff6ff',
                                        fontSize: 14,
                                        fontWeight: 800,
                                        color: '#1d4ed8',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {/* Company Name & City */}
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>
                                        Company Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        autoComplete="off"
                                        placeholder="Company name"
                                        value={formData.companyName}
                                        onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: 12,
                                            background: '#f8fafc',
                                            border: '1.5px solid #cbd5e1',
                                            fontSize: 14,
                                            color: '#0f172a',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#ffffff'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>
                                        City *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        autoComplete="off"
                                        placeholder="Your city"
                                        value={formData.city}
                                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: 12,
                                            background: '#f8fafc',
                                            border: '1.5px solid #cbd5e1',
                                            fontSize: 14,
                                            color: '#0f172a',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#ffffff'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                                    />
                                </div>
                            </div>

                            {/* Email Address & Mobile Number */}
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        autoComplete="off"
                                        placeholder="your@email.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: 12,
                                            background: '#f8fafc',
                                            border: '1.5px solid #cbd5e1',
                                            fontSize: 14,
                                            color: '#0f172a',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#ffffff'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>
                                        Mobile Number *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        autoComplete="off"
                                        placeholder="Mobile number"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: 12,
                                            background: '#f8fafc',
                                            border: '1.5px solid #cbd5e1',
                                            fontSize: 14,
                                            color: '#0f172a',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#ffffff'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                                    />
                                </div>
                            </div>

                            {/* Password & Start Date */}
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>
                                        Password *
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        autoComplete="new-password"
                                        placeholder="Create a password"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: 12,
                                            background: '#f8fafc',
                                            border: '1.5px solid #cbd5e1',
                                            fontSize: 14,
                                            color: '#0f172a',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#ffffff'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: 12,
                                            background: '#f8fafc',
                                            border: '1.5px solid #cbd5e1',
                                            fontSize: 14,
                                            color: '#0f172a',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#ffffff'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                                    />
                                </div>
                            </div>

                            {/* Submit Button: Proceed to Payment (Razorpay) */}
                            <button
                                type="submit"
                                disabled={submittingPayment}
                                style={{
                                    marginTop: 6,
                                    width: '100%',
                                    padding: '14px 20px',
                                    borderRadius: 12,
                                    background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: 15,
                                    fontWeight: 800,
                                    cursor: submittingPayment ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 6px 22px rgba(37, 99, 235, 0.4)',
                                    transition: 'all 0.2s ease',
                                    opacity: submittingPayment ? 0.7 : 1,
                                    letterSpacing: '0.02em'
                                }}
                                onMouseEnter={e => {
                                    if (!submittingPayment) {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 8px 28px rgba(37, 99, 235, 0.6)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!submittingPayment) {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 6px 22px rgba(37, 99, 235, 0.4)';
                                    }
                                }}
                            >
                                {submittingPayment ? 'Processing Activation...' : (selectedPlanForModal?.numericPrice === 0 ? 'Activate Free 7-Day Trial' : `Proceed to Payment (Razorpay)`)}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ══ CUSTOMIZE YOUR WEBSITE & APP POPUP MODAL (MATCHING LANDING PAGE THEME) ══ */}
            {customModalOpen && (
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
                        borderRadius: 24,
                        maxWidth: 480,
                        width: '100%',
                        overflow: 'hidden',
                        border: '1.5px solid rgba(59, 130, 246, 0.35)',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 50px rgba(37, 99, 235, 0.25)',
                        position: 'relative',
                        animation: 'fadeIn 0.25s ease-out'
                    }}>
                        {/* Header with Electric Blue Gradient matching Landing Page */}
                        <div style={{
                            background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)',
                            padding: '22px 24px',
                            color: '#ffffff',
                            position: 'relative',
                            borderBottom: '1px solid rgba(59, 130, 246, 0.3)'
                        }}>
                            <button
                                onClick={() => setCustomModalOpen(false)}
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
                            <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff' }}>
                                🎨 Customize Your Platform & App
                            </h3>
                            <p style={{ fontSize: 12.5, color: '#bfdbfe', margin: '6px 0 0', lineHeight: 1.4 }}>
                                Get custom logo, branding, features & workflows tailored for your construction company
                            </p>
                        </div>

                        {/* Modal Body Form */}
                        <form onSubmit={handleCustomSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Full Name */}
                            <div>
                                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Your full name"
                                    value={customFormData.fullName}
                                    onChange={e => setCustomFormData({ ...customFormData, fullName: e.target.value })}
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

                            {/* Phone & Email */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                                        Phone *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="Mobile number"
                                        value={customFormData.phone}
                                        onChange={e => setCustomFormData({ ...customFormData, phone: e.target.value })}
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
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="Email address"
                                        value={customFormData.email}
                                        onChange={e => setCustomFormData({ ...customFormData, email: e.target.value })}
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
                            </div>

                            {/* Construction Company Name & City */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                                        Company Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Your construction company"
                                        value={customFormData.companyName}
                                        onChange={e => setCustomFormData({ ...customFormData, companyName: e.target.value })}
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
                                        City
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Your city"
                                        value={customFormData.city}
                                        onChange={e => setCustomFormData({ ...customFormData, city: e.target.value })}
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
                            </div>

                            {/* Interested Plan Dropdown */}
                            <div>
                                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                                    Interested Plan
                                </label>
                                <select
                                    value={customFormData.interestedPlan}
                                    onChange={e => setCustomFormData({ ...customFormData, interestedPlan: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '11px 14px',
                                        borderRadius: 12,
                                        background: '#0f172a',
                                        border: '1.5px solid rgba(59, 130, 246, 0.25)',
                                        fontSize: 14,
                                        color: '#ffffff',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
                                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.25)'}
                                >
                                    <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>-- Select a plan (optional) --</option>
                                    <option value="Custom Enterprise Plan" style={{ background: '#0f172a', color: '#ffffff' }}>Custom Enterprise Plan</option>
                                    <option value="White-label & Custom Domain" style={{ background: '#0f172a', color: '#ffffff' }}>White-label & Custom Domain</option>
                                    <option value="Custom Android & iOS Mobile App" style={{ background: '#0f172a', color: '#ffffff' }}>Custom Android & iOS Mobile App</option>
                                    <option value="Pro Plan (₹1,499/mo)" style={{ background: '#0f172a', color: '#ffffff' }}>Pro Plan (₹1,499/mo)</option>
                                    <option value="Standard Plan (₹1,299/mo)" style={{ background: '#0f172a', color: '#ffffff' }}>Standard Plan (₹1,299/mo)</option>
                                </select>
                            </div>

                            {/* Submit Button */}
                            <div style={{ marginTop: 4 }}>
                                <button
                                    type="submit"
                                    style={{
                                        width: '100%',
                                        padding: '14px 20px',
                                        borderRadius: 14,
                                        background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
                                        color: '#ffffff',
                                        border: 'none',
                                        fontSize: 14.5,
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        boxShadow: '0 6px 24px rgba(37, 99, 235, 0.5)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        transition: 'all 0.2s ease',
                                        letterSpacing: '0.02em'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(37, 99, 235, 0.7)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 6px 24px rgba(37, 99, 235, 0.5)';
                                    }}
                                >
                                    <span>🚀 Submit Customization Request + Open WhatsApp</span>
                                </button>
                                <p style={{ textAlign: 'center', fontSize: 11.5, color: '#64748b', margin: '8px 0 0' }}>
                                    We'll also send a WhatsApp message confirmation
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══ FLOATING WHATSAPP PILL BUTTON (MATCHING SCREENSHOT 2) ══ */}
            <a
                href="https://api.whatsapp.com/send?phone=919752100980&text=Hello%20KT%20Construct%20Team%2C%20I%20am%20interested%20in%20your%20Construction%20Management%20SaaS%20platform."
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                    color: '#ffffff',
                    padding: '10px 22px 10px 16px',
                    borderRadius: '9999px',
                    boxShadow: '0 8px 25px rgba(37, 211, 102, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    zIndex: 9999,
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    textDecoration: 'none',
                    border: '1.5px solid rgba(255, 255, 255, 0.3)'
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.04)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(37, 211, 102, 0.6)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(37, 211, 102, 0.45)';
                }}
                title="Chat on WhatsApp (+91 97521 00980)"
            >
                {/* WhatsApp Logo Icon with Speech Bubble Outline */}
                <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <path d="M12.0003 2.00003C6.47734 2.00003 2.00034 6.47703 2.00034 12C2.00034 13.847 2.50334 15.602 3.42434 17.112L2.08634 21.999L7.10034 20.686C8.57134 21.528 10.2453 22 12.0003 22C17.5233 22 22.0003 17.523 22.0003 12C22.0003 6.47703 17.5233 2.00003 12.0003 2.00003Z" fill="white" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M12.0003 3.5C7.30588 3.5 3.5 7.30588 3.5 12C3.5 13.5937 3.93888 15.1092 4.74313 16.4179L3.71475 20.1706L7.60337 19.1517C8.88212 19.8974 10.3951 20.5 12.0003 20.5C16.6946 20.5 20.5 16.6946 20.5 12C20.5 7.30588 16.6946 3.5 12.0003 3.5ZM16.6508 14.4886C16.4578 14.3926 15.5074 13.926 15.3306 13.8622C15.1538 13.7977 15.0254 13.7653 14.897 13.9583C14.7686 14.1513 14.3989 14.5873 14.2867 14.7157C14.1745 14.8441 14.0623 14.8602 13.8693 14.7642C13.6763 14.6682 12.885 14.4089 11.9466 13.5727C11.2173 12.9225 10.7261 12.1192 10.5816 11.8735C10.4371 11.6279 10.5663 11.4953 10.6632 11.3992C10.7499 11.3134 10.857 11.174 10.9531 11.0618C11.0491 10.9496 11.0815 10.869 11.1461 10.7406C11.2107 10.6122 11.1783 10.5 11.1299 10.404C11.0815 10.3079 10.6965 9.35994 10.5358 8.97412C10.3794 8.59842 10.2205 8.64942 10.1023 8.64347C9.99014 8.63752 9.86174 8.63667 9.73334 8.63667C9.60494 8.63667 9.39584 8.68512 9.21904 8.87812C9.04224 9.07112 8.54414 9.53777 8.54414 10.4854C8.54414 11.4331 9.23514 12.3494 9.33124 12.4778C9.42734 12.6062 10.6886 14.5316 12.6212 15.3671C13.081 15.566 13.4406 15.685 13.7202 15.7743C14.1816 15.9213 14.6015 15.9 14.9338 15.8507C15.3044 15.7954 16.0752 15.384 16.2358 14.9344C16.3965 14.4847 16.3965 14.0989 16.3481 14.0183C16.2997 13.9384 16.1713 13.8899 15.9783 13.7939L16.6508 14.4886Z" fill="#25D366" />
                    </svg>
                </div>

                {/* Thin Vertical Divider */}
                <div style={{ width: '1.5px', height: '18px', background: 'rgba(255, 255, 255, 0.45)', margin: '0 1px' }} />

                {/* Text Label */}
                <span style={{
                    fontWeight: 800,
                    fontSize: '15px',
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                    color: '#ffffff'
                }}>
                    Chat with us
                </span>
            </a>
        </div>
    );

    return mainContent;
};

export default LandingPage;
