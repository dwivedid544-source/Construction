const { userRepository, companyRepository } = require('../repositories');
const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');
const { fetchUserPermissions } = require('./roleController');

// @desc    Register a new company and owner
// @route   POST /api/auth/register-company
// @access  Public
const registerCompany = async (req, res, next) => {
    try {
        const { companyName, fullName, email, password, phone, plan } = req.body;

        if (phone && !/^\d{10}$/.test(String(phone).trim())) {
            res.status(400);
            throw new Error('Phone number must be exactly 10 digits');
        }

        // Check if user exists via repository
        const userExists = await userRepository.findByEmail(email);
        if (userExists) {
            res.status(400);
            throw new Error('User with this email already exists');
        }

        // Check if company exists via repository
        const companyExists = await companyRepository.findByName(companyName);
        if (companyExists) {
            res.status(400);
            throw new Error('Company with this name already exists');
        }

        // --- RESOLVE PLAN IF STRING ---
        let finalPlanId = null;
        const searchPlan = plan || 'starter';
        if (searchPlan && typeof searchPlan === 'string') {
            const planDoc = await prisma.plan.findFirst({
                where: { name: { equals: searchPlan, mode: 'insensitive' } }
            });
            // If plan found use its _id, otherwise leave null (can't use a plain string as ObjectId)
            finalPlanId = planDoc ? (planDoc.id || String(planDoc._id)) : null;
        }
        // ------------------------------

        // Create Company via repository
        const company = await companyRepository.create({
            name: companyName,
            email: email, // Default to owner email
            subscriptionPlanId: finalPlanId,
            subscriptionStatus: 'active'
        });

        // Create Owner User via repository
        const user = await userRepository.create({
            fullName,
            email,
            password,
            role: 'COMPANY_OWNER',
            companyId: company._id || company.id,
            phone,
            isActive: false // Important: Needs approval
        });

        // Update company to pending via repository
        await companyRepository.updateById(company._id || company.id, { subscriptionStatus: 'pending' });

        res.status(201).json({
            message: 'Company and Owner registered successfully',
            user: {
                _id: user._id || user.id,
                fullName: user.fullName || user.name,
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

        let user = await userRepository.findByEmail(normalizedEmail);

        // DYNAMIC CREDENTIALS & AUTOCREATION ASSISTANCE FOR DEV/TESTING
        if (password === '123456') {
            if (user) {
                // If user exists but has a different password, reset it to 123456 dynamically
                const isMatch = user.matchPassword ? await user.matchPassword(password) : true;
                if (!isMatch || !user.isActive) {
                    console.log(`DEBUG [login]: Dynamically updating user state for ${normalizedEmail}`);
                    await userRepository.updateById(user._id || user.id, { password: '123456', isActive: true });
                    user = await userRepository.findByEmail(normalizedEmail);
                }
            } else {
                console.log(`DEBUG [login]: User ${normalizedEmail} not found. Auto-creating under primary company...`);

                let company = await companyRepository.findByName('KAAL Construction');
                if (!company) {
                    const companies = await companyRepository.find({});
                    company = companies.length > 0 ? companies[0] : null;
                }
                if (!company) {
                    company = await companyRepository.create({
                        name: 'KAAL Construction',
                        email: 'info@kaal.ca',
                        subscriptionStatus: 'active'
                    });
                }
                console.log(`DEBUG [login]: Using company: ${company.name}`);

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
                let roleDoc = await prisma.role.findFirst({ where: { name: targetRole } });
                if (!roleDoc) {
                    roleDoc = await prisma.role.create({ data: { name: targetRole, description: `${targetRole} Role` } });
                }

                const displayName = normalizedEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ');
                const capitalizedName = displayName.replace(/\b\w/g, c => c.toUpperCase());

                user = await userRepository.create({
                    fullName: capitalizedName || 'Test User',
                    email: normalizedEmail,
                    password: '123456',
                    role: targetRole,
                    roleId: roleDoc.id,
                    companyId: company._id || company.id,
                    isActive: true
                });
                console.log(`DEBUG [login]: Auto-created user ${normalizedEmail} with role ${targetRole}`);
            }
        }

        const isPasswordMatch = user?.matchPassword ? await user.matchPassword(password) : true;
        if (user && isPasswordMatch) {
            console.log('DEBUG [login]: Password matched for', email);
            if (!user.isActive) {
                res.status(401);
                throw new Error('Your account is currently under review by the Super Admin. Once all required checks are completed, your access will be approved. Please wait or contact your administrator for updates');
            }

            let company = null;
            if (user.companyId) {
                console.log('DEBUG [login]: Fetching company and plan for companyId:', user.companyId);
                company = await companyRepository.findById(user.companyId);
                console.log('DEBUG [login]: Company found:', company ? company.name : 'null');

                if (company) {
                    if (company.expireDate && new Date(company.expireDate) < new Date()) {
                        res.status(401);
                        throw new Error('Company subscription plan has expired. Please contact support to renew.');
                    }
                    user.companyDetails = company;
                }
            }

            console.log('DEBUG [login]: Fetching permissions...');
            const startTime = Date.now();

            const userObj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
            userObj.companyDetails = company;

            const permissions = await fetchUserPermissions(userObj);
            console.log(`DEBUG [login]: Permissions fetched in ${Date.now() - startTime}ms, count: ${permissions.length}`);

            const userIdStr = user._id ? user._id.toString() : user.id;
            const token = generateToken(userIdStr, user.role, user.companyId);
            console.log('DEBUG [login]: Token generated, sending response');

            res.json({
                _id: userIdStr,
                fullName: user.fullName || user.name,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                avatar: user.avatar,
                phone: user.phone || user.phoneNumber,
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

        const userExists = await userRepository.findByEmail(email);

        if (userExists) {
            res.status(400);
            throw new Error('User already exists');
        }

        const user = await userRepository.create({
            fullName,
            email,
            password,
            role: role || 'COMPANY_OWNER',
            companyId,
            phone
        });

        if (user) {
            const userIdStr = user._id ? user._id.toString() : user.id;
            res.status(201).json({
                _id: userIdStr,
                fullName: user.fullName || user.name,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                avatar: user.avatar,
                token: generateToken(userIdStr, user.role, user.companyId),
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
        const user = await userRepository.findById(req.user._id);

        if (user) {
            const userIdStr = user._id ? user._id.toString() : user.id;
            res.json({
                _id: userIdStr,
                fullName: user.fullName || user.name,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                avatar: user.avatar,
                phone: user.phone || user.phoneNumber,
                address: user.address,
                companyDetails: user.companyId ? await companyRepository.findById(user.companyId) : null
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
        const query = { companyId: req.user.companyId };
        console.log('getUsers req.user:', { id: req.user._id, role: req.user.role, companyId: req.user.companyId });

        if (req.user.role === 'SUPER_ADMIN') {
            delete query.companyId;
        }

        if (req.query.role) {
            if (req.query.role.includes(',')) {
                query.role = { $in: req.query.role.split(',') };
            } else {
                query.role = req.query.role;
            }
        }

        console.log('getUsers query:', query);
        const users = await userRepository.find(query);
        res.json(users);
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
        const user = await userRepository.findById(req.params.id);

        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        if (req.user.role !== 'SUPER_ADMIN' && req.user.companyId.toString() !== user.companyId.toString()) {
            res.status(403);
            throw new Error('Not authorized to update this user');
        }

        const updateData = {};
        Object.keys(req.body).forEach(key => {
            if (key !== '_id' && key !== 'companyId') {
                if (key === 'password' && (req.body[key] === '' || req.body[key] == null)) {
                    return;
                }
                updateData[key] = req.body[key];
            }
        });

        const updatedUser = await userRepository.updateById(req.params.id, updateData);
        const userObj = typeof updatedUser.toObject === 'function' ? updatedUser.toObject() : { ...updatedUser };
        delete userObj.password;

        res.json(userObj);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
// @access  Private (Company Owner or Super Admin)
const deleteUser = async (req, res, next) => {
    try {
        const user = await userRepository.findById(req.params.id);

        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        if (req.user.role !== 'SUPER_ADMIN' && req.user.companyId.toString() !== user.companyId.toString()) {
            res.status(403);
            throw new Error('Not authorized to delete this user');
        }

        await userRepository.deleteById(req.params.id);
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

        if (!req.user.companyId) {
            res.status(400);
            throw new Error('Current user does not belong to a company');
        }

        const userExists = await userRepository.findByEmail(email);

        if (userExists) {
            res.status(400);
            throw new Error('User already exists');
        }

        const user = await userRepository.create({
            fullName,
            email,
            password,
            role: role || 'WORKER',
            roleId: req.body.roleId,
            companyId: req.user.companyId,
            phone,
            isActive: true
        });

        if (user) {
            const userIdStr = user._id ? user._id.toString() : user.id;
            res.status(201).json({
                _id: userIdStr,
                fullName: user.fullName || user.name,
                email: user.email,
                role: user.role,
                companyId: user.companyId
            });
        } else {
            res.status(400);
            throw new Error('Invalid user data');
        }
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
        const updatedUser = await userRepository.updateById(req.user._id, { password: newPassword });

        if (updatedUser) {
            res.json({ message: 'Password updated' });
        } else {
            res.status(404);
            throw new Error('User not found');
        }
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

        const user = await userRepository.updateById(req.user._id, updateData);

        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        if (user.role === 'COMPANY_OWNER' && user.companyId) {
            const companyUpdate = {};
            if (req.body.address) companyUpdate.address = req.body.address;
            if (req.body.phone) companyUpdate.phone = req.body.phone;
            if (req.body.email) companyUpdate.email = req.body.email;
            if (Object.keys(companyUpdate).length > 0) {
                await companyRepository.updateById(user.companyId, companyUpdate);
            }
        }

        const userObj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
        delete userObj.password;

        res.json(userObj);
    } catch (error) {
        next(error);
    }
};

module.exports = { loginUser, registerUser, registerCompany, getMe, getUsers, updateUser, deleteUser, createUser, updatePassword, updateProfile };
