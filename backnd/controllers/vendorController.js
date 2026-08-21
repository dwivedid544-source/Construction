const prisma = require('../config/prisma');

// @desc    Create new trade/vendor
// @route   POST /api/vendors
exports.createVendor = async (req, res) => {
    try {
        let attachments = [];
        if (req.files && req.files.length > 0) {
            attachments = req.files.map(file => ({
                name: file.originalname,
                url: file.path.replace(/\\/g, '/'),
                fileType: file.mimetype
            }));
        }

        const data = { ...req.body };
        delete data._id;
        delete data.id;

        const vendor = await prisma.vendor.create({
            data: {
                ...data,
                companyId: req.user.companyId,
                createdBy: req.user.id,
                attachments: attachments
            }
        });
        res.status(201).json({ ...vendor, _id: vendor.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all trades/vendors for the company
// @route   GET /api/vendors
exports.getVendors = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const whereClause = { companyId };

        if (req.query.category) {
            whereClause.category = req.query.category;
        }
        if (req.query.status) {
            whereClause.status = req.query.status;
        }
        if (req.query.search) {
            whereClause.name = { contains: req.query.search };
        }

        if (req.user.role === 'FOREMAN') {
            whereClause.createdBy = req.user.id;
        }

        const vendors = await prisma.vendor.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                email: true,
                category: true,
                status: true,
                phone: true,
                businessAddress: true,
                contactPerson: true,
                attachments: true
            }
        });
        res.json(vendors.map(v => ({ ...v, _id: v.id })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update vendor
// @route   PATCH /api/vendors/:id
exports.updateVendor = async (req, res) => {
    try {
        const updateData = { ...req.body };
        delete updateData._id;
        delete updateData.id;
        
        let newAttachments = [];
        if (req.files && req.files.length > 0) {
            newAttachments = req.files.map(file => ({
                name: file.originalname,
                url: file.path.replace(/\\/g, '/'),
                fileType: file.mimetype
            }));
        }

        if (req.body.keptAttachments !== undefined) {
            let kept = [];
            try {
                kept = typeof req.body.keptAttachments === 'string' ? JSON.parse(req.body.keptAttachments) : req.body.keptAttachments;
            } catch (e) {}
            updateData.attachments = [...kept, ...newAttachments];
            delete updateData.keptAttachments;
        } else if (newAttachments.length > 0) {
            const existingVendor = await prisma.vendor.findUnique({ where: { id: req.params.id } });
            let existingAttachments = [];
            if (existingVendor && existingVendor.attachments) {
                if (typeof existingVendor.attachments === 'string') {
                    try { existingAttachments = JSON.parse(existingVendor.attachments); } catch (e) {}
                } else if (Array.isArray(existingVendor.attachments)) {
                    existingAttachments = existingVendor.attachments;
                }
            }
            updateData.attachments = [...existingAttachments, ...newAttachments];
        }

        const vendor = await prisma.vendor.update({
            where: { id: req.params.id },
            data: updateData
        });
        res.json({ ...vendor, _id: vendor.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete vendor
// @route   DELETE /api/vendors/:id
exports.deleteVendor = async (req, res) => {
    try {
        await prisma.vendor.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Vendor deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send drawing to trades
// @route   POST /api/vendors/send-drawing
exports.sendDrawingToTrades = async (req, res) => {
    try {
        const { drawingId, vendorIds } = req.body;
        const drawing = await prisma.drawing.findUnique({
            where: { id: drawingId },
            include: { project: true }
        });
        const vendors = await prisma.vendor.findMany({
            where: { id: { in: vendorIds } }
        });

        if (!drawing) return res.status(404).json({ message: 'Drawing not found' });

        console.log(`Sending drawing ${drawing.title} to ${vendors.length} vendors`);

        res.json({ message: `Drawing sent to ${vendors.length} trades` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit bid from trade
// @route   POST /api/vendors/submit-bid
exports.submitBid = async (req, res) => {
    try {
        const { drawingId, vendorId, bidAmount, notes, companyId } = req.body;
        
        let attachments = [];
        if (req.files && req.files.length > 0) {
            attachments = req.files.map(file => ({
                name: file.originalname,
                url: file.path.replace(/\\/g, '/'),
                fileType: file.mimetype
            }));
        }

        const bid = await prisma.tradeBid.create({
            data: {
                companyId,
                drawingId,
                vendorId,
                bidAmount: Number(bidAmount),
                notes: notes || '',
                attachments: attachments,
                status: 'Pending'
            }
        });

        res.status(201).json({ ...bid, _id: bid.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all bids for the company
// @route   GET /api/vendors/bids
exports.getBids = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const whereClause = { companyId };

        if (req.user.role === 'FOREMAN') {
            const myVendors = await prisma.vendor.findMany({
                where: { createdBy: req.user.id },
                select: { id: true }
            });
            const myVendorIds = myVendors.map(v => v.id);
            whereClause.vendorId = { in: myVendorIds };
        }

        const bids = await prisma.tradeBid.findMany({
            where: whereClause,
            include: {
                vendor: { select: { name: true, email: true } },
                drawing: { select: { title: true } },
                company: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(bids.map(b => ({
            ...b,
            _id: b.id,
            vendorId: b.vendor,
            drawingId: b.drawing,
            companyId: b.company
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get public drawing info for bidding
// @route   GET /api/vendors/public/drawing/:id
exports.getPublicDrawingInfo = async (req, res) => {
    try {
        const drawing = await prisma.drawing.findUnique({
            where: { id: req.params.id },
            include: { project: { select: { name: true } } }
        });

        if (!drawing) return res.status(404).json({ message: 'Drawing not found' });

        res.json({
            title: drawing.title,
            drawingNumber: drawing.number,
            category: drawing.category,
            projectId: drawing.project,
            companyId: drawing.companyId,
            versions: []
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update bid status
// @route   PATCH /api/vendors/bids/:id
exports.updateBidStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const bid = await prisma.tradeBid.update({
            where: { id: req.params.id },
            data: { status }
        });
        res.json({ ...bid, _id: bid.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a bid
// @route   DELETE /api/vendors/bids/:id
exports.deleteBid = async (req, res) => {
    try {
        await prisma.tradeBid.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Bid deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
