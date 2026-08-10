const prisma = require('../config/prisma');

/**
 * Helper to dispatch a notification via Socket.IO and save to DB
 * @param {Object} req - Express request object
 * @param {Object} data - { userId, title, message, link, type }
 */
const dispatchNotification = async (req, { userId, title, message, link, type = 'task' }) => {
    try {
        const targetUserId = typeof userId === 'object' ? (userId._id || userId.id) : userId;
        const targetCompanyId = req.user?.companyId;

        const notification = await prisma.notification.create({
            data: {
                recipientId: targetUserId,
                title,
                message,
                type: type ? String(type).toUpperCase() : 'INFO',
                link: link || '/company-admin/notifications'
            }
        });

        const formatted = {
            ...notification,
            _id: notification.id,
            userId: notification.recipientId,
            companyId: targetCompanyId
        };

        const io = req.app?.get?.('io');
        if (io && targetUserId) {
            io.to(targetUserId.toString()).emit('new_notification', formatted);
        }
        return formatted;
    } catch (err) {
        console.error('Notification dispatch failed:', err.message);
        return null;
    }
};

module.exports = { dispatchNotification };
