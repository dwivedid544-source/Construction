const prisma = require('../config/prisma');

const getPlan = async (company) => {
    if (!company.subscriptionPlanId) return null;
    
    return await prisma.plan.findUnique({
        where: { id: company.subscriptionPlanId }
    });
};

const checkProjectLimit = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ message: 'Company ID not found in user session' });
        }

        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });
        
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const plan = await getPlan(company);
        const projectCount = await prisma.project.count({
            where: { companyId }
        });

        const maxProjects = plan ? plan.maxProjects : 1; // Default limit for no plan

        if (projectCount >= maxProjects && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ 
                message: `Project limit reached. Your ${plan ? plan.name : 'current'} plan allows up to ${maxProjects} projects. Please upgrade your plan to create more projects.`,
                limitReached: true,
                limitType: 'projects',
                currentCount: projectCount,
                limit: maxProjects
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

const checkUserLimit = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ message: 'Company ID not found in user session' });
        }

        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });
        
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const plan = await getPlan(company);
        const userCount = await prisma.user.count({
            where: { 
                companyId,
                NOT: {
                    role: 'CLIENT'
                }
            }
        });

        const maxUsers = plan ? plan.maxUsers : 5; // Default limit for no plan

        if (userCount >= maxUsers && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ 
                message: `User limit reached. Your ${plan ? plan.name : 'current'} plan allows up to ${maxUsers} team members. Please upgrade your plan to add more members.`,
                limitReached: true,
                limitType: 'users',
                currentCount: userCount,
                limit: maxUsers
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

const checkJobLimit = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ message: 'Company ID not found in user session' });
        }

        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });
        
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const plan = await getPlan(company);
        const jobCount = await prisma.job.count({
            where: { companyId }
        });

        const maxJobs = plan ? (plan.maxJobs || plan.maxProjects * 3) : 3;

        if (jobCount >= maxJobs && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ 
                message: `Job limit reached. Your ${plan ? plan.name : 'current'} plan allows up to ${maxJobs} jobs. Please upgrade your plan to create more jobs.`,
                limitReached: true,
                limitType: 'jobs',
                currentCount: jobCount,
                limit: maxJobs
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    checkProjectLimit,
    checkUserLimit,
    checkJobLimit
};
