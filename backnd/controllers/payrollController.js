const prisma = require('../config/prisma');

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

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const logs = await prisma.timeLog.findMany({
            where: {
                companyId,
                status: 'approved',
                clockIn: { gte: start },
                clockOut: { lte: end }
            },
            include: { user: true }
        });

        const userPayroll = new Map();

        logs.forEach(log => {
            if (!log.user) return;
            const userId = log.userId;
            if (!userPayroll.has(userId)) {
                userPayroll.set(userId, {
                    user: log.user,
                    totalHours: 0,
                    rate: 30 // fallback default
                });
            }
            if (log.clockOut && log.clockIn) {
                const hours = (new Date(log.clockOut) - new Date(log.clockIn)) / 3600000;
                if (hours > 0) {
                    userPayroll.get(userId).totalHours += hours;
                }
            }
        });

        const results = await Promise.all(Array.from(userPayroll.values()).map(async (item) => {
            const gross = item.totalHours * item.rate;
            const deductions = calculateDeductions(gross);
            
            const startDayBegin = new Date(start);
            startDayBegin.setHours(0,0,0,0);
            const startDayEnd = new Date(start);
            startDayEnd.setHours(23,59,59,999);

            const existing = await prisma.payroll.findFirst({
                where: {
                    companyId,
                    employeeId: item.user.id,
                    payPeriodStart: { gte: startDayBegin, lte: startDayEnd }
                }
            });

            return {
                userId: item.user.id,
                name: item.user.fullName,
                role: item.user.role,
                totalHours: Number(item.totalHours.toFixed(2)),
                rate: item.rate,
                ...deductions,
                status: existing ? existing.status : 'pending'
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

        const logs = await prisma.timeLog.findMany({
            where: {
                companyId,
                userId,
                status: 'approved',
                clockIn: { gte: start },
                clockOut: { lte: end }
            },
            include: {
                user: { select: { fullName: true, role: true } },
                job: { select: { name: true } }
            },
            orderBy: { clockIn: 'asc' }
        });

        const enriched = logs.map(log => {
            const hours = log.clockOut && log.clockIn ? (new Date(log.clockOut) - new Date(log.clockIn)) / 3600000 : 0;
            return {
                _id: log.id,
                date: log.clockIn,
                clockIn: log.clockIn,
                clockOut: log.clockOut,
                hours: Number(hours.toFixed(2)),
                job: log.job?.name || 'General',
                rate: 30,
                amount: Number((hours * 30).toFixed(2))
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
    runPayroll,
    getPayrollHistory,
    getPayrollDetails,
    getPayrollSlip
};
