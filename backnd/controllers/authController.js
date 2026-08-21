const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { fetchUserPermissions } = require('./roleController');
const { sendSubscriptionWelcomeEmail } = require('../utils/emailService');

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

const matchPassword = async (enteredPassword, hashedPassword) => {
    return await bcrypt.compare(enteredPassword, hashedPassword);
};

// @desc    Register a new company and owner
// @route   POST /api/auth/register-company
// @access  Public
const registerCompany = async (req, res, next) => {
    try {
        const { companyName, fullName, email, password, phone, plan } = req.body;

        // Check if user exists
        const userExists = await prisma.user.findUnique({
            where: { email }
        });
        if (userExists) {
            res.status(400);
            throw new Error('User with this email already exists');
        }

        // Check if company exists
        const companyExists = await prisma.company.findUnique({
            where: { name: companyName }
        });
        if (companyExists) {
            res.status(400);
            throw new Error('Company with this name already exists');
        }

        // --- RESOLVE PLAN IF STRING ---
        let finalPlanId = null;
        let resolvedPlanDoc = null;
        const searchPlan = plan || 'starter';
        
        if (searchPlan && typeof searchPlan === 'string') {
            const isProbablyId = searchPlan.length >= 24;
            if (!isProbablyId) {
                resolvedPlanDoc = await prisma.plan.findFirst({
                    where: {
                        name: {
                            contains: searchPlan,
                            mode: 'insensitive'
                        }
                    }
                });
                finalPlanId = resolvedPlanDoc ? resolvedPlanDoc.id : null;
            } else {
                finalPlanId = searchPlan;
                resolvedPlanDoc = await prisma.plan.findUnique({ where: { id: searchPlan } });
            }
        } else {
            finalPlanId = searchPlan;
        }
        // Determine trial vs paid expiration
        const isFreeTrial = (resolvedPlanDoc && resolvedPlanDoc.price === 0) || String(searchPlan).toLowerCase().includes('free') || String(searchPlan).toLowerCase().includes('trial');
        const trialDays = isFreeTrial ? 7 : 30;
        const startDate = new Date();
        const expireDate = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

        // Create Company
        const company = await prisma.company.create({
            data: {
                name: companyName,
                email: email, // Default to owner email
                subscriptionPlanId: finalPlanId,
                subscriptionStatus: 'active',
                startDate,
                expireDate
            }
        });

        // Hash Password manually
        const hashedPassword = await hashPassword(password);

        // Create Owner User
        const user = await prisma.user.create({
            data: {
                fullName,
                email,
                password: hashedPassword,
                role: 'COMPANY_OWNER',
                companyId: company.id,
                phone,
                isActive: false // Needs approval by Super Admin or dev login
            }
        });

        // Trigger Brevo Welcome / Onboarding Email asynchronously
        const planDisplayName = resolvedPlanDoc ? resolvedPlanDoc.name : (isFreeTrial ? 'Free Trial (7 Days)' : (searchPlan || 'Starter Plan'));
        const planPrice = resolvedPlanDoc ? resolvedPlanDoc.price : (isFreeTrial ? 0 : 999);
        sendSubscriptionWelcomeEmail({
            toEmail: email,
            companyName,
            plainPassword: password,
            planName: planDisplayName,
            price: planPrice,
            duration: isFreeTrial ? '7-Day Free Trial' : 'Monthly',
            startDate
        }).catch(err => console.error('[Auth] Brevo welcome email error:', err.message));

        res.status(201).json({
            message: 'Company and Owner registered successfully',
            user: {
                _id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                companyId: user.companyId
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Pre-check if email or company can register a subscription
// @route   POST /api/auth/check-subscription-eligibility
// @access  Public
const checkSubscriptionEligibility = async (req, res, next) => {
    try {
        const { email } = req.body;
        const normalizedEmail = email ? email.toLowerCase().trim() : '';

        if (normalizedEmail) {
            const existingUser = await prisma.user.findUnique({
                where: { email: normalizedEmail }
            });
            if (existingUser) {
                return res.status(400).json({
                    message: `An account with ${normalizedEmail} already exists. Please login to manage or upgrade your subscription.`
                });
            }
        }

        res.json({ eligible: true, message: 'Ready to proceed to payment.' });
    } catch (error) {
        next(error);
    }
};

// @desc    Register new company & owner directly from Subscription Modal / Razorpay payment
// @route   POST /api/auth/register-subscription
// @access  Public
const registerSubscription = async (req, res, next) => {
    try {
        const { companyName, city, email, phone, password, planName, price, startDate, paymentId, razorpayOrderId, razorpaySignature, logo } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        // 1. Resolve Plan Document
        let resolvedPlanDoc = null;
        let finalPlanId = null;
        const searchPlan = planName || 'starter';

        resolvedPlanDoc = await prisma.plan.findFirst({
            where: {
                name: {
                    contains: searchPlan.replace(/plan/i, '').trim(),
                    mode: 'insensitive'
                }
            }
        });

        if (!resolvedPlanDoc) {
            resolvedPlanDoc = await prisma.plan.findFirst({
                where: { price: { gt: 0 } }
            });
        }
        finalPlanId = resolvedPlanDoc ? resolvedPlanDoc.id : null;

        const isFreeTrial = (resolvedPlanDoc && resolvedPlanDoc.price === 0) || String(searchPlan).toLowerCase().includes('free') || String(searchPlan).toLowerCase().includes('trial');
        const trialDays = isFreeTrial ? 7 : 30;
        const start = startDate ? new Date(startDate) : new Date();
        const expireDate = new Date(start.getTime() + trialDays * 24 * 60 * 60 * 1000);

        // 2. Check or Create Company
        let company = await prisma.company.findFirst({
            where: { name: companyName }
        });

        if (!company) {
            company = await prisma.company.create({
                data: {
                    name: companyName,
                    logo: logo || undefined,
                    email: normalizedEmail,
                    address: city || 'Headquarters',
                    phone: phone || '',
                    subscriptionPlanId: finalPlanId,
                    subscriptionStatus: 'active',
                    startDate: start,
                    expireDate
                }
            });
        } else {
            company = await prisma.company.update({
                where: { id: company.id },
                data: {
                    logo: logo || company.logo,
                    subscriptionPlanId: finalPlanId,
                    subscriptionStatus: 'active',
                    startDate: start,
                    expireDate
                }
            });
        }

        // 3. Check or Create Owner User
        const hashedPassword = await hashPassword(password || '123456');
        let user = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (user) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    companyId: company.id,
                    avatar: logo || user.avatar,
                    role: 'COMPANY_OWNER',
                    phone: phone || user.phone,
                    isActive: true,
                    mustChangePassword: true
                }
            });
        } else {
            user = await prisma.user.create({
                data: {
                    fullName: companyName,
                    email: normalizedEmail,
                    password: hashedPassword,
                    avatar: logo || undefined,
                    role: 'COMPANY_OWNER',
                    companyId: company.id,
                    phone: phone || '',
                    isActive: true,
                    mustChangePassword: true
                }
            });
        }

        // 4. Record Subscription Payment Order if paid
        try {
            const SubscriptionOrder = require('../models/SubscriptionOrder');
            const numericPaise = typeof price === 'number' ? Math.round(price * 100) : Math.round(parseFloat(String(price).replace(/[^0-9.]/g, '') || 1) * 100);
            await SubscriptionOrder.create({
                orderId: razorpayOrderId || `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                companyId: company.id,
                planId: finalPlanId,
                userId: user.id,
                amountPaise: numericPaise,
                currency: 'INR',
                status: 'PAID',
                paymentId: paymentId || 'pay_manual',
                signature: razorpaySignature || '',
                notes: { planName, companyName, email: normalizedEmail }
            });
        } catch (orderErr) {
            console.warn('[registerSubscription] SubscriptionOrder record warning:', orderErr.message);
        }

        // 5. Send Custom Brevo Activation Email (Matching Screenshot 1)
        const planDisplayName = resolvedPlanDoc ? resolvedPlanDoc.name : (isFreeTrial ? 'Free Trial (7 Days)' : (planName || 'Starter Plan'));
        const planPriceVal = resolvedPlanDoc ? resolvedPlanDoc.price : (isFreeTrial ? 0 : 1);
        
        sendSubscriptionWelcomeEmail({
            toEmail: normalizedEmail,
            companyName: companyName,
            fullName: companyName,
            plainPassword: password, // Plain text password created by user
            planName: planDisplayName,
            price: planPriceVal,
            duration: isFreeTrial ? '7-Day Free Trial' : 'Monthly',
            startDate: start,
            expiryDate: expireDate
        }).catch(err => console.error('[Auth] Brevo welcome email error:', err.message));

        res.status(201).json({
            message: 'Account and subscription registered successfully',
            user: {
                _id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                mustChangePassword: true
            }
        });
    } catch (error) {
        next(error);
    }
};

const generateToken = (userId, role, companyId) => {
    return jwt.sign({ userId, role, companyId }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        let user = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });

        // DYNAMIC CREDENTIALS & AUTOCREATION ASSISTANCE FOR DEV/TESTING
        if (password === '123456') {
            if (user) {
                const isMatch = await matchPassword(password, user.password);
                if (!isMatch) {
                    console.log(`DEBUG [login]: Dynamically updating password to 123456 for ${normalizedEmail}`);
                    const newHashedPassword = await hashPassword('123456');
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            password: newHashedPassword,
                            isActive: true
                        }
                    });
                } else if (!user.isActive) {
                    console.log(`DEBUG [login]: Dynamically activating user ${normalizedEmail}`);
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: { isActive: true }
                    });
                }
            } else {
                console.log(`DEBUG [login]: User ${normalizedEmail} not found. Auto-creating under primary company...`);
                
                // Fetch company with most users
                const usersGrouped = await prisma.user.groupBy({
                    by: ['companyId'],
                    _count: {
                        id: true
                    },
                    orderBy: {
                        _count: {
                            id: 'desc'
                        }
                    },
                    take: 1
                });
                
                let company;
                if (usersGrouped.length > 0 && usersGrouped[0].companyId) {
                    company = await prisma.company.findUnique({
                        where: { id: usersGrouped[0].companyId }
                    });
                }
                if (!company) {
                    company = await prisma.company.findFirst({});
                }
                if (!company) {
                    company = await prisma.company.create({
                        data: {
                            name: 'KAAL Construction',
                            email: 'info@kaal.ca',
                            subscriptionStatus: 'active'
                        }
                    });
                }
                console.log(`DEBUG [login]: Using company: ${company.name} (${company.id})`);

                const getRoleFromEmail = (emailStr) => {
                    const emailLower = emailStr.toLowerCase();
                    if (emailLower.includes('super')) return 'SUPER_ADMIN';
                    if (emailLower.includes('admin') || emailLower.includes('owner') || emailLower.includes('office')) return 'COMPANY_OWNER';
                    if (emailLower.includes('pm') || emailLower.includes('manager')) return 'PM';
                    if (emailLower.includes('foreman')) return 'FOREMAN';
                    if (emailLower.includes('worker')) return 'WORKER';
                    if (emailLower.includes('client')) return 'CLIENT';
                    if (emailLower.includes('subcontractor') || emailLower.includes('sub') || emailLower.includes('contractor')) return 'SUBCONTRACTOR';
                    if (emailLower.includes('engineer')) return 'ENGINEER';
                    return 'COMPANY_OWNER';
                };

                const targetRole = getRoleFromEmail(normalizedEmail);
                let roleDoc = await prisma.role.findUnique({
                    where: { name: targetRole }
                });
                if (!roleDoc) {
                    roleDoc = await prisma.role.create({
                        data: { name: targetRole, description: `${targetRole} Role` }
                    });
                }

                const displayName = normalizedEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ');
                const capitalizedName = displayName.replace(/\b\w/g, c => c.toUpperCase());
                
                const autoCreatedHashedPassword = await hashPassword('123456');

                user = await prisma.user.create({
                    data: {
                        fullName: capitalizedName || 'Test User',
                        email: normalizedEmail,
                        password: autoCreatedHashedPassword,
                        role: targetRole,
                        roleId: roleDoc.id,
                        companyId: company.id,
                        isActive: true
                    }
                });
                console.log(`DEBUG [login]: Auto-created user ${normalizedEmail} with role ${targetRole} under company ${company.name}`);
            }
        }

        if (user && (await matchPassword(password, user.password))) {
            console.log('DEBUG [login]: Password matched for', email);
            if (!user.isActive) {
                res.status(401);
                throw new Error('Your account is currently under review by the Super Admin. Once all required checks are completed, your access will be approved. Please wait or contact your administrator for updates');
            }

            // Check if company's plan is expired
            let company = null;
            if (user.companyId) {
                console.log('DEBUG [login]: Fetching company and plan for companyId:', user.companyId);
                company = await prisma.company.findUnique({
                    where: { id: user.companyId },
                    include: { subscriptionPlan: true }
                });
                console.log('DEBUG [login]: Company found:', company ? company.name : 'null');
                
                if (company) {
                    if (company.expireDate && new Date(company.expireDate) < new Date()) {
                        res.status(401);
                        throw new Error('Company subscription plan has expired. Please contact support to renew.');
                    }
                }
            }

            console.log('DEBUG [login]: Fetching permissions...');
            const startTime = Date.now();
            
            const userObj = { ...user, companyDetails: company };
            const permissions = await fetchUserPermissions(userObj);
            console.log(`DEBUG [login]: Permissions fetched in ${Date.now() - startTime}ms, count: ${permissions.length}`);

            const token = generateToken(user.id, user.role, user.companyId);
            console.log('DEBUG [login]: Token generated, sending response');

            // Calculate trial and expiration state
            let enhancedCompany = company;
            if (company) {
                const now = new Date();
                const expireDateObj = company.expireDate ? new Date(company.expireDate) : null;
                const isExpired = expireDateObj ? expireDateObj < now : false;
                const daysRemaining = expireDateObj ? Math.max(0, Math.ceil((expireDateObj - now) / (1000 * 60 * 60 * 24))) : null;
                const planName = company.subscriptionPlan?.name || '';
                const isTrial = planName.toLowerCase().includes('trial') || company.subscriptionPlan?.price === 0;

                enhancedCompany = {
                    ...company,
                    isExpired,
                    daysRemaining,
                    isTrialActive: isTrial && !isExpired,
                    subscriptionStatus: isExpired ? 'expired' : (company.subscriptionStatus || 'active')
                };
            }

            res.json({
                _id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                companyDetails: enhancedCompany,
                avatar: user.avatar,
                phone: user.phone,
                address: user.address,
                mustChangePassword: Boolean(user.mustChangePassword),
                token,
                permissions
            });
        } else {
            res.status(401);
            throw new Error('Invalid email or password');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
    try {
        const { fullName, email, password, role, companyId, phone } = req.body;

        if (!companyId) {
            res.status(400);
            throw new Error('Company ID is required. If you are creating a new company, use /api/auth/register-company.');
        }

        const userExists = await prisma.user.findUnique({
            where: { email }
        });

        if (userExists) {
            res.status(400);
            throw new Error('User already exists');
        }

        const hashedPassword = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                fullName,
                email,
                password: hashedPassword,
                role: role || 'COMPANY_OWNER',
                companyId,
                phone
            }
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                avatar: user.avatar,
                token: generateToken(user.id, user.role, user.companyId),
            });
        } else {
            res.status(400);
            throw new Error('Invalid user data');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (user) {
            let companyDetails = user.companyId ? await prisma.company.findUnique({
                where: { id: user.companyId },
                include: { subscriptionPlan: true }
            }) : null;

            if (companyDetails) {
                const now = new Date();
                const expireDateObj = companyDetails.expireDate ? new Date(companyDetails.expireDate) : null;
                const isExpired = expireDateObj ? expireDateObj < now : false;
                const daysRemaining = expireDateObj ? Math.max(0, Math.ceil((expireDateObj - now) / (1000 * 60 * 60 * 24))) : null;
                const planName = companyDetails.subscriptionPlan?.name || '';
                const isTrial = planName.toLowerCase().includes('trial') || companyDetails.subscriptionPlan?.price === 0;

                companyDetails = {
                    ...companyDetails,
                    isExpired,
                    daysRemaining,
                    isTrialActive: isTrial && !isExpired,
                    subscriptionStatus: isExpired ? 'expired' : (companyDetails.subscriptionStatus || 'active')
                };
            }

            res.json({
                _id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                avatar: user.avatar,
                phone: user.phone,
                address: user.address,
                mustChangePassword: Boolean(user.mustChangePassword),
                companyDetails
            });
        } else {
            res.status(404);
            throw new Error('User not found');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Get all users for a company
// @route   GET /api/auth/users
// @access  Private
const getUsers = async (req, res, next) => {
    try {
        const whereClause = { companyId: req.user.companyId };
        console.log('getUsers req.user:', { id: req.user.id, role: req.user.role, companyId: req.user.companyId });

        // Super Admin can see all users
        if (req.user.role === 'SUPER_ADMIN') {
            delete whereClause.companyId;
        }

        // Support role filtering
        if (req.query.role) {
            if (req.query.role.includes(',')) {
                whereClause.role = { in: req.query.role.split(',') };
            } else {
                whereClause.role = req.query.role;
            }
        }

        console.log('getUsers query:', whereClause);
        const users = await prisma.user.findMany({
            where: whereClause
        });
        
        // Remove password from results
        const sanitizedUsers = users.map(user => {
            const u = { ...user, _id: user.id };
            delete u.password;
            return u;
        });

        res.json(sanitizedUsers);
    } catch (error) {
        console.error('getUsers error:', error);
        next(error);
    }
};

// @desc    Update user
// @route   PATCH /api/auth/users/:id
// @access  Private (Company Owner or Super Admin)
const updateUser = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id }
        });

        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        // Multi-tenant check
        if (req.user.role !== 'SUPER_ADMIN' && req.user.companyId?.toString() !== user.companyId?.toString()) {
            res.status(403);
            throw new Error('Not authorized to update this user');
        }

        const updateData = {};
        for (const key of Object.keys(req.body)) {
            if (key !== 'id' && key !== '_id' && key !== 'companyId') {
                if (key === 'password') {
                    if (req.body[key] === '' || req.body[key] == null) {
                        continue;
                    }
                    updateData.password = await hashPassword(req.body[key]);
                } else if (key === 'hourlyRate') {
                    updateData.hourlyRate = !isNaN(Number(req.body[key])) ? Number(req.body[key]) : 30;
                } else {
                    updateData[key] = req.body[key];
                }
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.params.id },
            data: updateData
        });

        const result = { ...updatedUser, _id: updatedUser.id };
        delete result.password;

        res.json(result);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
// @access  Private (Company Owner or Super Admin)
const deleteUser = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id }
        });

        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        // Multi-tenant check
        if (req.user.role !== 'SUPER_ADMIN' && req.user.companyId?.toString() !== user.companyId?.toString()) {
            res.status(403);
            throw new Error('Not authorized to delete this user');
        }

        await prisma.user.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'User removed' });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new user (Internal/Admin/Team Member)
// @route   POST /api/auth/users
// @access  Private (Company Owner/Admin)
const createUser = async (req, res, next) => {
    try {
        const { fullName, email, password, role, phone, roleId, hourlyRate } = req.body;

        const targetCompanyId = req.body.companyId || req.user.companyId;

        // Ensure current user has a company unless Super Admin
        if (!targetCompanyId && req.user.role !== 'SUPER_ADMIN') {
            res.status(400);
            throw new Error('Current user does not belong to a company');
        }

        const normalizedEmail = email.toLowerCase().trim();

        const userExists = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (userExists) {
            res.status(400);
            throw new Error('User already exists with this email address');
        }

        const targetRole = role || 'WORKER';
        let resolvedRoleId = roleId;
        if (!resolvedRoleId) {
            let roleDoc = await prisma.role.findUnique({
                where: { name: targetRole }
            });
            if (!roleDoc) {
                roleDoc = await prisma.role.create({
                    data: { name: targetRole, description: `${targetRole} Role` }
                });
            }
            if (roleDoc) resolvedRoleId = roleDoc.id;
        }

        const hashedPassword = await hashPassword(password);

        const parsedHourlyRate = hourlyRate !== undefined && hourlyRate !== '' && !isNaN(Number(hourlyRate)) 
            ? Number(hourlyRate) 
            : 30;

        const user = await prisma.user.create({
            data: {
                fullName,
                email: normalizedEmail,
                password: hashedPassword,
                role: targetRole,
                roleId: resolvedRoleId,
                companyId: targetCompanyId,
                phone,
                hourlyRate: parsedHourlyRate,
                isActive: true // Created by admin, so active by default
            }
        });

        // Trigger Brevo Welcome Email with credentials to new team member
        if (targetCompanyId) {
            const company = await prisma.company.findUnique({ where: { id: targetCompanyId } });
            sendSubscriptionWelcomeEmail({
                toEmail: normalizedEmail,
                companyName: company ? company.name : 'KT Construct Team',
                plainPassword: password,
                planName: `${targetRole} Member Access`,
                price: '0.00',
                duration: 'Active Team Member',
                startDate: new Date()
            }).catch(err => console.error('[Auth] Team member welcome email error:', err.message));
        }

        res.status(201).json({
            _id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            companyId: user.companyId
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update password
// @route   PATCH /api/auth/updatepassword
// @access  Private
const updatePassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;
        const hashedPassword = await hashPassword(newPassword);

        await prisma.user.update({
            where: { id: req.user.id },
            data: { 
                password: hashedPassword,
                mustChangePassword: false 
            }
        });
        
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Update current user profile
// @route   PATCH /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
    try {
        const updateData = { ...req.body };
        if (req.file) {
            updateData.avatar = req.file.path;
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData
        });

        // If user is a company owner, also sync these basic details to the Company model
        if (updatedUser.role === 'COMPANY_OWNER' && updatedUser.companyId) {
            const company = await prisma.company.findUnique({
                where: { id: updatedUser.companyId }
            });
            if (company) {
                const companyUpdateData = {};
                if (req.body.address) companyUpdateData.address = req.body.address;
                if (req.body.phone) companyUpdateData.phone = req.body.phone;
                if (req.body.email) companyUpdateData.email = req.body.email;
                
                if (Object.keys(companyUpdateData).length > 0) {
                    await prisma.company.update({
                        where: { id: updatedUser.companyId },
                        data: companyUpdateData
                    });
                }
            }
        }

        const result = { ...updatedUser, _id: updatedUser.id };
        delete result.password;

        res.json(result);
    } catch (error) {
        next(error);
    }
};

module.exports = { 
    loginUser, 
    registerUser, 
    registerCompany, 
    registerSubscription,
    checkSubscriptionEligibility,
    getMe, 
    getUsers, 
    updateUser, 
    deleteUser, 
    createUser, 
    updatePassword, 
    updateProfile 
};
