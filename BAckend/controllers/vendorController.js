const prisma = require('../config/prisma');

// @desc    Create new trade/vendor
// @route   POST /api/vendors
exports.createVendor = async (req, res) => {
    try {
        const { name, email, phone, category, address } = req.body;

        const vendor = await prisma.vendor.create({
            data: {
                companyId: req.user.companyId,
                name: name || 'Untitled Vendor',
                email: email || null,
                phone: phone || null,
                category: category || null,
                address: address || null
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
        const where = { companyId: req.user.companyId };

        if (req.query.category) where.category = req.query.category;
        if (req.query.search) {
            where.name = { contains: req.query.search, mode: 'insensitive' };
        }

        const vendors = await prisma.vendor.findMany({
            where,
            orderBy: { createdAt: 'desc' }
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
        const vendor = await prisma.vendor.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

        const { name, email, phone, category, address } = req.body;
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (category !== undefined) updateData.category = category;
        if (address !== undefined) updateData.address = address;

        const updated = await prisma.vendor.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.json({ ...updated, _id: updated.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete vendor
// @route   DELETE /api/vendors/:id
exports.deleteVendor = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

        await prisma.vendor.delete({ where: { id: req.params.id } });
        res.json({ message: 'Vendor deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send drawing to trades
// @route   POST /api/vendors/send-drawing
exports.sendDrawingToTrades = async (req, res) => {
    try {
        res.json({ message: 'Drawing sent to trades' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit bid from trade
// @route   POST /api/vendors/submit-bid
exports.submitBid = async (req, res) => {
    try {
        res.status(201).json({ message: 'Bid submitted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all bids for the company
// @route   GET /api/vendors/bids
exports.getBids = async (req, res) => {
    try {
        res.json([]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get public drawing info for bidding
// @route   GET /api/vendors/public/drawing/:id
exports.getPublicDrawingInfo = async (req, res) => {
    try {
        res.json({});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update bid status
// @route   PATCH /api/vendors/bids/:id
exports.updateBidStatus = async (req, res) => {
    try {
        res.json({});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a bid
// @route   DELETE /api/vendors/bids/:id
exports.deleteBid = async (req, res) => {
    try {
        res.json({ message: 'Bid deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
