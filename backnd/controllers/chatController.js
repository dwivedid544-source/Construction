const prisma = require('../config/prisma');

const ADMIN_ROLES = ['COMPANY_OWNER', 'SUPER_ADMIN', 'ADMIN'];
const INTERNAL_ROLES = ['COMPANY_OWNER', 'PM', 'FOREMAN', 'WORKER', 'SUPER_ADMIN', 'ADMIN'];

async function findExistingDirectRoomId(userIdA, userIdB) {
    const commonRooms = await prisma.chatParticipant.groupBy({
        by: ['roomId'],
        where: {
            userId: { in: [userIdA, userIdB] }
        },
        having: {
            roomId: {
                _count: {
                    equals: 2
                }
            }
        }
    });

    const roomIds = commonRooms.map(r => r.roomId);
    const directRoom = await prisma.chatRoom.findFirst({
        where: {
            id: { in: roomIds },
            isGroup: false
        }
    });

    return directRoom ? directRoom.id : null;
}

function assertDirectMessagingAllowed(role, targetUser) {
    const admins = ['COMPANY_OWNER', 'SUPER_ADMIN'];
    const internalRoles = ['COMPANY_OWNER', 'PM', 'FOREMAN', 'WORKER', 'SUPER_ADMIN'];
    if (admins.includes(role)) return;
    if (role === 'PM') return;
    if (['FOREMAN', 'WORKER'].includes(role)) {
        if (!internalRoles.includes(targetUser.role)) {
            const e = new Error('Foreman and Workers are restricted to internal coordination only.');
            e.statusCode = 403;
            throw e;
        }
        return;
    }
    const allowedTargetsForExternal = ['COMPANY_OWNER', 'SUPER_ADMIN', 'PM'];
    if (!allowedTargetsForExternal.includes(targetUser.role)) {
        const e = new Error('Clients and Subcontractors are only permitted to initiate direct chats with administrators or project managers.');
        e.statusCode = 403;
        throw e;
    }
}

async function resolveDirectChatRoomId(req, peerUserId) {
    const { id: userId, companyId, role } = req.user;
    const existing = await findExistingDirectRoomId(userId, peerUserId);
    if (existing) return existing;

    const targetUser = await prisma.user.findUnique({
        where: { id: peerUserId }
    });
    if (!targetUser) {
        const e = new Error('User not found');
        e.statusCode = 404;
        throw e;
    }
    assertDirectMessagingAllowed(role, targetUser);

    const room = await prisma.chatRoom.create({
        data: {
            isGroup: false,
            name: `Direct: ${req.user.fullName} & ${targetUser.fullName}`
        }
    });

    await prisma.chatParticipant.createMany({
        data: [
            { roomId: room.id, userId },
            { roomId: room.id, userId: peerUserId }
        ]
    });

    return room.id;
}

async function getPmScopedData(companyId, pmUserId) {
    const pmProjects = await prisma.project.findMany({
        where: {
            companyId,
            OR: [
                { pms: { some: { id: pmUserId } } },
                { pmId: pmUserId },
                { createdBy: pmUserId }
            ]
        },
        select: { id: true }
    });
    const projectIds = pmProjects.map((p) => p.id);
    const projectIdSet = new Set(projectIds);

    if (projectIds.length === 0) {
        return { projectIds, projectIdSet, userIdSet: new Set() };
    }

    const [taskAssignedUsers, jobAssignments] = await Promise.all([
        prisma.task.findMany({
            where: {
                companyId,
                projectId: { in: projectIds },
                createdBy: pmUserId
            },
            select: { assignedTo: true }
        }),
        prisma.job.findMany({
            where: {
                companyId,
                projectId: { in: projectIds },
                createdBy: pmUserId
            },
            include: { assignedWorkers: true }
        })
    ]);

    const userIdSet = new Set();
    taskAssignedUsers.forEach((task) => {
        if (task.assignedTo) userIdSet.add(task.assignedTo);
    });
    jobAssignments.forEach((job) => {
        if (job.foremanId) userIdSet.add(job.foremanId);
        if (job.assignedWorkers) {
            job.assignedWorkers.forEach(w => userIdSet.add(w.id));
        }
    });

    return { projectIds, projectIdSet, userIdSet };
}

async function getUserChatScope(reqUser) {
    const companyId = reqUser.companyId;
    const userId = reqUser.id;
    const role = reqUser.role;
    const isAdmin = ADMIN_ROLES.includes(role);

    if (isAdmin) {
        const [projects, users] = await Promise.all([
            prisma.project.findMany({ where: { companyId }, select: { id: true } }),
            prisma.user.findMany({ where: { companyId, NOT: { id: userId }, isActive: true }, select: { id: true } })
        ]);
        return {
            isAdmin,
            hideInternal: false,
            projectIdSet: new Set(projects.map((p) => p.id)),
            directUserIdSet: new Set(users.map((u) => u.id))
        };
    }

    if (role === 'PM') {
        const pmProjects = await prisma.project.findMany({
            where: { 
                companyId, 
                OR: [
                    { pms: { some: { id: userId } } },
                    { pmId: userId },
                    { createdBy: userId }
                ] 
            },
            select: { id: true, clientId: true }
        });
        
        const assignedClientIds = pmProjects.map(p => p.clientId).filter(Boolean);
        const assignedProjectIds = pmProjects.map(p => p.id);

        const scopeUsers = await prisma.user.findMany({
            where: { 
                companyId, 
                isActive: true, 
                OR: [
                    { role: { in: ['COMPANY_OWNER', 'SUPER_ADMIN', 'ADMIN', 'PM', 'FOREMAN', 'WORKER', 'SUBCONTRACTOR'] } },
                    { id: { in: assignedClientIds } }
                ]
            },
            select: { id: true }
        });
        
        return {
            isAdmin: false,
            hideInternal: false,
            projectIdSet: new Set(assignedProjectIds),
            directUserIdSet: new Set(scopeUsers.map((u) => u.id))
        };
    }

    const assignedProjectIds = new Set();
    const [ownedProjects, taskProjects, jobProjects] = await Promise.all([
        prisma.project.findMany({
            where: {
                companyId,
                OR: [
                    { createdBy: userId },
                    { pms: { some: { id: userId } } },
                    { pmId: userId },
                    { clientId: userId }
                ]
            },
            select: { id: true }
        }),
        prisma.task.findMany({ where: { companyId, assignedTo: userId }, select: { projectId: true } }),
        prisma.job.findMany({
            where: {
                companyId,
                OR: [
                    { foremanId: userId },
                    { assignedWorkers: { some: { id: userId } } },
                    { createdBy: userId }
                ]
            },
            select: { projectId: true }
        })
    ]);

    ownedProjects.forEach((p) => p.id && assignedProjectIds.add(p.id));
    taskProjects.forEach((t) => t.projectId && assignedProjectIds.add(t.projectId));
    jobProjects.forEach((j) => j.projectId && assignedProjectIds.add(j.projectId));

    const directUsersWhere = { companyId, NOT: { id: userId }, isActive: true };
    if (['FOREMAN', 'WORKER'].includes(role)) {
        directUsersWhere.role = { in: INTERNAL_ROLES };
    } else if (role === 'SUBCONTRACTOR') {
        directUsersWhere.role = { in: ['COMPANY_OWNER', 'SUPER_ADMIN', 'ADMIN', 'PM'] };
    } else if (role === 'CLIENT') {
        const clientProjects = await prisma.project.findMany({
            where: { companyId, clientId: userId },
            select: { pmId: true, createdBy: true }
        });
        const allowedPMIds = new Set();
        clientProjects.forEach(p => {
            if (p.pmId) allowedPMIds.add(p.pmId);
            if (p.createdBy) allowedPMIds.add(p.createdBy);
        });

        directUsersWhere.OR = [
            { role: { in: ['COMPANY_OWNER', 'SUPER_ADMIN', 'ADMIN'] } },
            { id: { in: Array.from(allowedPMIds) } }
        ];
    }
    const directUsers = await prisma.user.findMany({ where: directUsersWhere, select: { id: true } });

    return {
        isAdmin: false,
        hideInternal: false,
        projectIdSet: assignedProjectIds,
        directUserIdSet: new Set(directUsers.map((u) => u.id))
    };
}

const getChatRooms = async (req, res, next) => {
    try {
        const { id: userId } = req.user;
        
        // Fetch all rooms the user is a participant of
        const participations = await prisma.chatParticipant.findMany({
            where: { userId },
            include: {
                room: {
                    include: {
                        participants: {
                            include: {
                                user: { select: { fullName: true, avatar: true, role: true } }
                            }
                        },
                        chats: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                            include: { sender: { select: { fullName: true } } }
                        }
                    }
                }
            }
        });

        const mappedRooms = participations.map(p => {
            const room = p.room;
            const lastMessage = room.chats[0] || null;
            return {
                _id: room.id,
                id: room.id,
                name: room.name,
                isGroup: room.isGroup,
                lastMessage: lastMessage ? {
                    message: lastMessage.message,
                    senderName: lastMessage.sender?.fullName,
                    createdAt: lastMessage.createdAt
                } : null,
                participants: room.participants.map(part => ({
                    userId: part.userId,
                    fullName: part.user.fullName,
                    avatar: part.user.avatar,
                    role: part.user.role
                }))
            };
        });

        res.json(mappedRooms);
    } catch (error) {
        next(error);
    }
};

const getRoomMessages = async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const messages = await prisma.chat.findMany({
            where: { roomId },
            include: {
                sender: { select: { fullName: true, avatar: true, role: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        const mappedMessages = messages.map(m => ({
            ...m,
            _id: m.id,
            sender: {
                ...m.sender,
                _id: m.senderId
            }
        }));

        res.json(mappedMessages);
    } catch (error) {
        next(error);
    }
};

const sendMessage = async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const { message } = req.body;

        const chat = await prisma.chat.create({
            data: {
                roomId,
                senderId: req.user.id,
                message
            },
            include: {
                sender: { select: { fullName: true, avatar: true, role: true } }
            }
        });

        const io = req.app.get('io');
        if (io) {
            io.to(roomId).emit('new_message', {
                ...chat,
                _id: chat.id
            });
        }

        res.status(201).json({ ...chat, _id: chat.id });
    } catch (error) {
        next(error);
    }
};

const createGroupRoom = async (req, res, next) => {
    try {
        const { name, participantIds } = req.body;

        const room = await prisma.chatRoom.create({
            data: {
                name,
                isGroup: true
            }
        });

        const uniqueParticipants = Array.from(new Set([...participantIds, req.user.id]));

        await prisma.chatParticipant.createMany({
            data: uniqueParticipants.map(userId => ({
                roomId: room.id,
                userId
            }))
        });

        res.status(201).json({ ...room, _id: room.id });
    } catch (error) {
        next(error);
    }
};

const syncProjectParticipants = async (projectId) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { pms: true }
        });
        if (!project) return;

        // Find or create project room
        let room = await prisma.chatRoom.findFirst({
            where: {
                name: project.name,
                isGroup: true
            }
        });

        if (!room) {
            room = await prisma.chatRoom.create({
                data: {
                    name: project.name,
                    isGroup: true
                }
            });
        }

        // Project participants: Creator, Client, PM, and PMs
        const userIds = new Set();
        if (project.createdBy) userIds.add(project.createdBy);
        if (project.clientId) userIds.add(project.clientId);
        if (project.pmId) userIds.add(project.pmId);
        if (project.pms) {
            project.pms.forEach(pm => userIds.add(pm.id));
        }

        // Sync participants in Prisma
        await prisma.chatParticipant.deleteMany({
            where: { roomId: room.id }
        });

        await prisma.chatParticipant.createMany({
            data: Array.from(userIds).map(userId => ({
                roomId: room.id,
                userId
            }))
        });
    } catch (error) {
        console.error('Failed to sync project chat participants:', error);
    }
};

const markMessagesAsRead = async (req, res, next) => {
    try {
        const { roomId } = req.params;
        await prisma.chat.updateMany({
            where: {
                roomId,
                NOT: { senderId: req.user.id }
            },
            data: { isRead: true }
        });
        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        next(error);
    }
};

const deleteRoom = async (req, res, next) => {
    try {
        await prisma.chatRoom.delete({
            where: { id: req.params.roomId }
        });
        res.json({ message: 'Room deleted successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getChatRooms,
    getRoomMessages,
    sendMessage,
    createGroupRoom,
    syncProjectParticipants,
    markMessagesAsRead,
    deleteRoom,
    resolveDirectChatRoomId
};
