const prisma = require('../config/prisma');

// @desc    Get Payroll Preview
// @route   GET /api/payroll/preview
const getPayrollPreview = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        const logs = await prisma.timeLog.findMany({
            where: {
                clockIn: { gte: start },
                clockOut: { lte: end, not: null }
            },
            include: { worker: { select: { id: true, name: true, roleId: true } } }
        });

        const userMap = new Map();
        logs.forEach(log => {
            if (!log.worker) return;
            const wId = log.worker.id;
            if (!userMap.has(wId)) {
                userMap.set(wId, { worker: log.worker, hours: 0, rate: log.hourlyRate || 30 });
            }
            userMap.get(wId).hours += (log.durationMinutes || 0) / 60;
        });

        const results = Array.from(userMap.values()).map(item => {
            const gross = item.hours * item.rate;
            const tax = gross * 0.2;
            const net = gross - tax;
            return {
                userId: item.worker.id,
                name: item.worker.name,
                totalHours: Number(item.hours.toFixed(2)),
                rate: item.rate,
                grossPay: Number(gross.toFixed(2)),
                federalTax: Number(tax.toFixed(2)),
                netPay: Number(net.toFixed(2)),
                status: 'PENDING'
            };
        });

        res.json(results);
    } catch (error) {
        next(error);
    }
};

// @desc    Run Payroll (Save Records)
// @route   POST /api/payroll/run
const runPayroll = async (req, res, next) => {
    try {
        const { records, startDate, endDate } = req.body;

        const created = [];
        if (records && Array.isArray(records)) {
            for (const rec of records) {
                const item = await prisma.payroll.create({
                    data: {
                        workerId: rec.userId,
                        payPeriodStart: new Date(startDate || Date.now()),
                        payPeriodEnd: new Date(endDate || Date.now()),
                        grossPay: parseFloat(rec.grossPay || 0),
                        taxDeductions: parseFloat(rec.federalTax || 0),
                        netPay: parseFloat(rec.netPay || 0),
                        status: 'PAID'
                    }
                });
                created.push(item);
            }
        }

        res.status(201).json(created);
    } catch (error) {
        next(error);
    }
};

// @desc    Get Payroll History
// @route   GET /api/payroll/history
const getPayrollHistory = async (req, res, next) => {
    try {
        const history = await prisma.payroll.findMany({
            include: { worker: { select: { id: true, name: true, roleId: true } } },
            orderBy: { createdAt: 'desc' }
        });

        res.json(history.map(h => ({
            ...h,
            _id: h.id,
            employeeId: h.worker ? { _id: h.worker.id, fullName: h.worker.name } : null
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Get contributing TimeLogs for a single employee in a period
// @route   GET /api/payroll/details?userId=&startDate=&endDate=
const getPayrollDetails = async (req, res, next) => {
    try {
        const { userId } = req.query;

        const logs = await prisma.timeLog.findMany({
            where: { workerId: userId },
            include: { worker: { select: { id: true, name: true } } },
            orderBy: { clockIn: 'asc' }
        });

        res.json(logs.map(l => ({
            _id: l.id,
            date: l.clockIn,
            clockIn: l.clockIn,
            clockOut: l.clockOut,
            hours: (l.durationMinutes || 0) / 60,
            rate: l.hourlyRate || 30,
            amount: ((l.durationMinutes || 0) / 60) * (l.hourlyRate || 30)
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Get a single saved payroll slip
// @route   GET /api/payroll/slip/:id
const getPayrollSlip = async (req, res, next) => {
    try {
        const record = await prisma.payroll.findUnique({
            where: { id: req.params.id },
            include: { worker: { select: { id: true, name: true, email: true } } }
        });
        if (!record) return res.status(404).json({ message: 'Payroll record not found' });
        res.json({
            ...record,
            _id: record.id,
            employeeId: record.worker ? { _id: record.worker.id, fullName: record.worker.name } : null
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

