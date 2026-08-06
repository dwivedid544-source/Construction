const prisma = require('../config/prisma');

async function findExistingDirectRoomId(userIdA, userIdB) {
    return null;
}

async function getUserChatScope(reqUser) {
    const userId = reqUser._id || reqUser.id;
    return {
        isAdmin: true,
        hideInternal: false,
        projectIdSet: new Set(),
        directUserIdSet: new Set()
    };
}

// @desc    Get chat rooms for the current user
// @route   GET /api/chat
// @access  Private
const getChatRooms = async (req, res, next) => {
    try {
        res.json([]);
    } catch (error) {
        next(error);
    }
};

// @desc    Get messages for a specific room
// @route   GET /api/chat/:roomId
// @access  Private
const getRoomMessages = async (req, res, next) => {
    try {
        res.json([]);
    } catch (error) {
        next(error);
    }
};

// @desc    Send message to a room
// @route   POST /api/chat
// @access  Private
const sendMessage = async (req, res, next) => {
    try {
        const { message } = req.body;
        res.status(201).json({
            id: 'temp-id',
            message: message || '',
            createdAt: new Date()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get total unread count for user
// @route   GET /api/chat/unread-count
// @access  Private
const getUnreadCount = async (req, res, next) => {
    try {
        res.json({ count: 0 });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark room as read
// @route   PUT /api/chat/mark-read/:roomId
// @access  Private
const markAsRead = async (req, res, next) => {
    try {
        res.json({ success: true, lastReadAt: new Date() });
    } catch (error) {
        next(error);
    }
};

// @desc    Helper to create or get a direct chat room
// @route   POST /api/chat/direct
// @access  Private
const getOrCreateDirectRoom = async (req, res, next) => {
    try {
        res.status(201).json({
            id: 'direct-room-id',
            name: 'Direct Chat',
            roomType: 'DIRECT',
            isGroup: false
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all users in company for chat directory
// @route   GET /api/chat/users
// @access  Private
const getChatUsers = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const users = await prisma.user.findMany({
            where: { companyId },
            select: { id: true, email: true, name: true, role: true }
        });
        res.json(users.map(u => ({ ...u, _id: u.id, fullName: u.name })));
    } catch (error) {
        next(error);
    }
};

const syncProjectParticipants = async (projectId) => {
    try {
    } catch (error) {
        console.error('Error in syncProjectParticipants:', error);
    }
};

const updateMessageAttachments = async (req, res, next) => {
    try {
        res.json({});
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getChatRooms,
    getRoomMessages,
    sendMessage,
    getUnreadCount,
    markAsRead,
    getOrCreateDirectRoom,
    getChatUsers,
    syncProjectParticipants,
    getUserChatScope,
    updateMessageAttachments
};
