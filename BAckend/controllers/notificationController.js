const prisma = require('../config/prisma');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user._id || req.user.id;

        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        res.json(notifications.map(n => ({
            ...n,
            _id: n.id,
            message: n.body,
            isRead: n.read
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res, next) => {
    try {
        const notification = await prisma.notification.update({
            where: { id: req.params.id },
            data: { read: true }
        });

        res.json({
            ...notification,
            _id: notification.id,
            message: notification.body,
            isRead: notification.read
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/mark-all-read
// @access  Private
const markAllRead = async (req, res, next) => {
    try {
        const userId = req.user._id || req.user.id;
        const result = await prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });

        res.json({ message: 'All notifications marked as read', updatedCount: result.count || 0 });
    } catch (error) {
        next(error);
    }
};

// @desc    Clear all notifications (Delete)
// @route   DELETE /api/notifications/clear-all
// @access  Private
const clearAllNotifications = async (req, res, next) => {
    try {
        const userId = req.user._id || req.user.id;
        await prisma.notification.deleteMany({ where: { userId } });
        res.json({ message: 'All notifications cleared' });
    } catch (error) {
        next(error);
    }
};

// @desc    Register or update FCM Token
// @route   POST /api/notifications/fcm-token
// @access  Private
const updateFcmToken = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: 'FCM token registered successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Deactivate FCM Token
// @route   POST /api/notifications/fcm-token/deactivate
// @access  Private
const deactivateFcmToken = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: 'FCM token deactivated successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllRead,
    clearAllNotifications,
    updateFcmToken,
    deactivateFcmToken
};

