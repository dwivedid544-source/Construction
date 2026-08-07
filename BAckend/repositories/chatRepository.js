'use strict';
/**
 * ChatRepository — ChatRoom, Chat (messages), and ChatParticipant data access.
 */
const ChatRoom = require('../models/ChatRoom');
const Chat = require('../models/Chat');
const ChatParticipant = require('../models/ChatParticipant');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class ChatRepository extends BaseRepository {
  constructor() {
    super('chatRoom', { softDelete: true, searchFields: ['name'] });
  }

  // ─── ChatRoom ─────────────────────────────────────────────────────────────

  async findRoomById(id) {
    if (getDriver() === 'prisma') {
      return this.findOne({ id }, {
        participants: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      });
    }
    return ChatRoom.findById(id).lean();
  }

  async findRoomsByUser(userId) {
    if (getDriver() === 'prisma') {
      return this._delegate.findMany({
        where: { deletedAt: null, participants: { some: { userId } } },
        include: {
          participants: { include: { user: { select: { id: true, name: true, avatar: true } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { updatedAt: 'desc' },
      });
    }
    const rooms = await ChatParticipant.find({ userId }).distinct('roomId');
    return ChatRoom.find({ _id: { $in: rooms } }).lean();
  }

  async createRoom(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return ChatRoom.create(data);
  }

  async deleteRoomById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return ChatRoom.findByIdAndDelete(id);
  }

  // ─── Messages ─────────────────────────────────────────────────────────────

  async findMessages(roomId, opts = {}) {
    const { skip = 0, take = 50 } = opts;
    if (getDriver() === 'prisma') {
      return prisma.chat.findMany({
        where: { roomId, deletedAt: null },
        include: { sender: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });
    }
    return Chat.find({ roomId }).sort({ createdAt: -1 }).skip(skip).limit(take).lean();
  }

  async createMessage(data) {
    if (getDriver() === 'prisma') return prisma.chat.create({ data });
    return Chat.create(data);
  }

  async deleteMessage(id) {
    if (getDriver() === 'prisma') {
      return prisma.chat.update({ where: { id }, data: { deletedAt: new Date() } });
    }
    return Chat.findByIdAndDelete(id);
  }

  // ─── Participants ─────────────────────────────────────────────────────────

  async addParticipant(roomId, userId, role = 'MEMBER') {
    if (getDriver() === 'prisma') {
      return prisma.chatParticipant.upsert({
        where: { roomId_userId: { roomId, userId } },
        create: { roomId, userId, role },
        update: {},
      });
    }
    return ChatParticipant.findOneAndUpdate({ roomId, userId }, { roomId, userId, role }, { upsert: true, new: true });
  }

  async removeParticipant(roomId, userId) {
    if (getDriver() === 'prisma') {
      return prisma.chatParticipant.delete({ where: { roomId_userId: { roomId, userId } } });
    }
    return ChatParticipant.findOneAndDelete({ roomId, userId });
  }
}

// Expose prisma lazily so the singleton isn't loaded before env is ready
let _prisma;
const getPrisma = () => { if (!_prisma) _prisma = require('../config/prisma'); return _prisma; };
Object.defineProperty(global, '__chatPrismaRef', { get: getPrisma });
const prisma = new Proxy({}, { get: (_, k) => getPrisma()[k] });

module.exports = new ChatRepository();
