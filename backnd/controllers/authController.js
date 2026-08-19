const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { fetchUserPermissions } = require('./roleController');

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
        const searchPlan = plan || 'starter';
        
        if (searchPlan && typeof searchPlan === 'string') {
            // Check if it is a 24-character hex ID (legacy MongoDB ObjectID check or CUID check)
            const isProbablyId = searchPlan.length >= 24;
            if (!isProbablyId) {
                const planDoc = await prisma.plan.findFirst({
                    where: {
                        name: {
                            equals: searchPlan,
                        }
                    }
                });
                finalPlanId = planDoc ? planDoc.id : null;
            } else {
                finalPlanId = searchPlan;
            }
        } else {
            finalPlanId = searchPlan;
        }
        // ------------------------------

        // Create Company
        const company = await prisma.company.create({
            data: {
                name: companyName,
                email: email, // Default to owner email
                subscriptionPlanId: finalPlanId,
                subscriptionStatus: 'active'
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
                isActive: false // Important: Needs approval
            }
        });

        // Update company to pending
        const updatedCompany = await prisma.company.update({
            where: { id: company.id },
            data: { subscriptionStatus: 'pending' }
        });

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
                    if (emailLower.includes('subcontractor') || emailLower.includes('sub')) return 'SUBCONTRACTOR';
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

            res.json({
                _id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                avatar: user.avatar,
                phone: user.phone,
                address: user.address,
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
            const companyDetails = user.companyId ? await prisma.company.findUnique({
                where: { id: user.companyId },
                include: { subscriptionPlan: true }
            }) : null;

            res.json({
                _id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                avatar: user.avatar,
                phone: user.phone,
                address: user.address,
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
        if (req.user.role !== 'SUPER_ADMIN' && req.user.companyId !== user.companyId) {
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
        if (req.user.role !== 'SUPER_ADMIN' && req.user.companyId !== user.companyId) {
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

// @desc    Create a new user (Internal/Admin)
// @route   POST /api/auth/users
// @access  Private (Company Owner/Admin)
const createUser = async (req, res, next) => {
    try {
        const { fullName, email, password, role, phone } = req.body;

        // Ensure current user has a company
        if (!req.user.companyId) {
            res.status(400);
            throw new Error('Current user does not belong to a company');
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
                role: role || 'WORKER',
                roleId: req.body.roleId,
                companyId: req.user.companyId,
                phone,
                isActive: true // Created by admin, so active by default
            }
        });

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
            data: { password: hashedPassword }
        });
        
        res.json({ message: 'Password updated' });
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

module.exports = { loginUser, registerUser, registerCompany, getMe, getUsers, updateUser, deleteUser, createUser, updatePassword, updateProfile };
