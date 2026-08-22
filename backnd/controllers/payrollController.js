const prisma = require('../config/prisma');
const Job = require('../models/Job');
const Photo = require('../models/Photo');
const JobTask = require('../models/JobTask');
const User = require('../models/User');

const TAX_RULES = {
    CPP_RATE: 0.0595,
    EI_RATE: 0.0166,
    WCB_RATE: 0.025,
    FEDERAL_BRACKETS: [
        { limit: 55867, rate: 0.15 },
        { limit: 111733, rate: 0.205 },
        { limit: 173205, rate: 0.26 },
        { limit: 246752, rate: 0.29 },
        { limit: Infinity, rate: 0.33 }
    ],
    ANNUAL_BASIC_EXEMPTION: 3500
};

const calculateDeductions = (grossPay, payPeriodsPerYear = 52) => {
    const exemptionPerPeriod = TAX_RULES.ANNUAL_BASIC_EXEMPTION / payPeriodsPerYear;
    const cpp = Math.max(0, (grossPay - exemptionPerPeriod) * TAX_RULES.CPP_RATE);
    const ei = grossPay * TAX_RULES.EI_RATE;
    const wcb = grossPay * TAX_RULES.WCB_RATE;

    const annualGross = grossPay * payPeriodsPerYear;
    let annualTax = 0;
    let remainingGross = annualGross;
    let prevLimit = 0;

    for (const bracket of TAX_RULES.FEDERAL_BRACKETS) {
        const taxableInBracket = Math.min(remainingGross, bracket.limit - prevLimit);
        if (taxableInBracket <= 0) break;
        annualTax += taxableInBracket * bracket.rate;
        remainingGross -= taxableInBracket;
        prevLimit = bracket.limit;
    }

    const federalTax = annualTax / payPeriodsPerYear;
    const netPay = grossPay - cpp - ei - federalTax;

    return {
        grossPay: Number(grossPay.toFixed(2)),
        cpp: Number(cpp.toFixed(2)),
        ei: Number(ei.toFixed(2)),
        wcb: Number(wcb.toFixed(2)),
        federalTax: Number(federalTax.toFixed(2)),
        netPay: Number(netPay.toFixed(2))
    };
};

const getPayrollPreview = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const companyId = req.user.companyId;

        const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);

        // Fetch company workers
        const allowedRoles = ['WORKER', 'FOREMAN', 'ENGINEER', 'SUBCONTRACTOR', 'PM'];
        const workers = await User.find({
            companyId,
            role: { $in: allowedRoles }
        }).lean();

        // Fetch timelogs in the date range
        const logs = await prisma.timeLog.findMany({
            where: {
                companyId,
                clockIn: { gte: start, lte: end }
            },
            include: {
                userId: { select: { fullName: true, email: true, role: true } }
            }
        });

        // Map hours by worker
        const hoursMap = new Map();
        const activeClockMap = new Set();

        logs.forEach(log => {
            const uid = (log.userId?._id || log.userId)?.toString();
            if (!uid) return;

            if (!log.clockOut) {
                activeClockMap.add(uid);
            }

            const current = hoursMap.get(uid) || 0;
            if (log.clockIn) {
                const outTime = log.clockOut ? new Date(log.clockOut) : new Date();
                const diff = (outTime - new Date(log.clockIn)) / 3600000;
                if (diff > 0) {
                    hoursMap.set(uid, current + diff);
                }
            }
        });

        const results = await Promise.all(workers.map(async (worker) => {
            const wid = worker._id.toString();
            const totalHours = Number((hoursMap.get(wid) || 0).toFixed(2));
            const hourlyRate = worker.hourlyRate || worker.rate || 30;
            const gross = totalHours * hourlyRate;
            const deductions = calculateDeductions(gross);

            const startDayBegin = new Date(start);
            startDayBegin.setHours(0,0,0,0);
            const startDayEnd = new Date(start);
            startDayEnd.setHours(23,59,59,999);

            const existing = await prisma.payroll.findFirst({
                where: {
                    companyId,
                    employeeId: worker._id,
                    payPeriodStart: { gte: startDayBegin, lte: startDayEnd }
                }
            });

            return {
                userId: worker._id,
                name: worker.fullName || 'Employee',
                role: worker.role,
                totalHours,
                rate: hourlyRate,
                ...deductions,
                status: existing ? existing.status : (totalHours > 0 ? 'pending' : 'preview'),
                isLive: activeClockMap.has(wid)
            };
        }));

        res.json(results);
    } catch (error) {
        next(error);
    }
};

const getJobsPayroll = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;

        // Fetch all jobs for this company
        const jobs = await Job.find({ companyId })
            .populate('projectId', 'name location')
            .lean();

        const results = await Promise.all(jobs.map(async (job) => {
            // Find proof photos specifically uploaded for this job
            const photos = await Photo.find({
                companyId,
                jobId: job._id
            }).sort({ createdAt: -1 }).lean();

            const photoItems = photos.map(p => ({
                _id: p._id.toString(),
                id: p._id.toString(),
                url: p.imageUrl || p.url || (p.images && p.images[0]),
                imageUrl: p.imageUrl || p.url || (p.images && p.images[0]),
                description: p.description || ''
            })).filter(p => p.url);

            // Fetch tasks for this job to find assigned members
            const tasks = await JobTask.find({ jobId: job._id }).populate('assignedTo', 'fullName role rate').lean();
            
            // Collect unique members
            const memberMap = new Map();
            tasks.forEach(t => {
                if (t.assignedTo) {
                    const u = t.assignedTo;
                    const uid = (u._id || u).toString();
                    if (!memberMap.has(uid)) {
                        memberMap.set(uid, {
                            userId: uid,
                            name: u.fullName || 'Team Member',
                            role: u.role || 'WORKER',
                            contractRate: u.rate || 35,
                            status: t.status === 'completed' ? 'ready' : 'in-progress',
                            hoursWorked: 0
                        });
                    }
                }
            });

            const members = Array.from(memberMap.values());

            return {
                jobId: job._id,
                jobName: job.name,
                projectId: job.projectId?._id || job.projectId,
                projectName: job.projectId?.name || 'Project',
                jobProgress: job.progress || 0,
                jobStatus: job.status || 'in-progress',
                budget: job.budget || 0,
                totalContractPayout: job.budget || 0,
                location: job.location || job.projectId?.location?.address || 'Site Location Not Specified',
                proofPhotos: photoItems,
                proofPhotosCount: photoItems.length,
                hasProofPhotos: photoItems.length > 0,
                members
            };
        }));

        res.json(results);
    } catch (error) {
        next(error);
    }
};

const runPayroll = async (req, res, next) => {
    try {
        const { records, startDate, endDate } = req.body;
        const companyId = req.user.companyId;

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const payrollRecords = records.map(rec => ({
            companyId,
            employeeId: rec.userId,
            payPeriodStart: start,
            payPeriodEnd: end,
            totalHours: Number(rec.totalHours),
            hourlyRate: Number(rec.rate),
            grossPay: Number(rec.grossPay),
            cpp: Number(rec.cpp),
            ei: Number(rec.ei),
            federalTax: Number(rec.federalTax),
            wcb: Number(rec.wcb),
            netPay: Number(rec.netPay),
            status: 'paid',
            paymentDate: new Date(),
            referenceId: `PAY-${Math.random().toString(36).substring(2, 11).toUpperCase()}`
        }));

        await prisma.payroll.createMany({
            data: payrollRecords
        });

        res.status(201).json({ success: true, message: 'Payroll run successfully' });
    } catch (error) {
        next(error);
    }
};

const getPayrollHistory = async (req, res, next) => {
    try {
        const history = await prisma.payroll.findMany({
            where: { companyId: req.user.companyId },
            include: { employee: { select: { fullName: true, role: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(history.map(h => ({
            ...h,
            _id: h.id,
            employeeId: h.employee
        })));
    } catch (error) {
        next(error);
    }
};

const getPayrollDetails = async (req, res, next) => {
    try {
        const { userId, startDate, endDate } = req.query;
        const companyId = req.user.companyId;

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const workerDoc = await User.findById(userId).lean();
        const userHourlyRate = workerDoc?.hourlyRate || workerDoc?.rate || 30;

        const logs = await prisma.timeLog.findMany({
            where: {
                companyId,
                userId,
                clockIn: { gte: start, lte: end }
            },
            include: {
                userId: { select: { fullName: true, role: true } },
                jobId: { select: { name: true } },
                projectId: { select: { name: true } }
            },
            orderBy: { clockIn: 'asc' }
        });

        const enriched = logs.map(log => {
            const outTime = log.clockOut ? new Date(log.clockOut) : new Date();
            const hours = log.clockIn ? Math.max(0, (outTime - new Date(log.clockIn)) / 3600000) : 0;
            return {
                _id: log.id,
                date: log.clockIn,
                clockIn: log.clockIn,
                clockOut: log.clockOut,
                hours: Number(hours.toFixed(2)),
                job: log.jobId?.name || log.projectId?.name || 'General Site',
                rate: userHourlyRate,
                amount: Number((hours * userHourlyRate).toFixed(2)),
                isLive: !log.clockOut
            };
        });

        res.json(enriched);
    } catch (error) {
        next(error);
    }
};

const getPayrollSlip = async (req, res, next) => {
    try {
        const record = await prisma.payroll.findUnique({
            where: { id: req.params.id },
            include: { employee: { select: { fullName: true, role: true, email: true } } }
        });
        if (!record) return res.status(404).json({ message: 'Payroll record not found' });
        res.json({
            ...record,
            _id: record.id,
            employeeId: record.employee
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPayrollPreview,
    getJobsPayroll,
    runPayroll,
    getPayrollHistory,
    getPayrollDetails,
    getPayrollSlip
};
