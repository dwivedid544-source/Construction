'use strict';
/**
 * NotificationRepository — Notification data access.
 */
const Notification = require('../models/Notification');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class NotificationRepository extends BaseRepository {
  constructor() {
    super('notification', { softDelete: true, searchFields: ['title', 'message'] });
  }

  async findByUser(userId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    if (getDriver() === 'prisma') {
      return this.findMany({ recipientId: userId }, {
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });
    }
    return Notification.find({ recipientId: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  }

  async markAllRead(userId) {
    if (getDriver() === 'prisma') {
      return this.updateMany({ recipientId: userId, readStatus: false }, { readStatus: true });
    }
    return Notification.updateMany({ recipientId: userId, readStatus: false }, { readStatus: true });
  }

  async countUnread(userId) {
    if (getDriver() === 'prisma') return this.count({ recipientId: userId, readStatus: false });
    return Notification.countDocuments({ recipientId: userId, readStatus: false });
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return Notification.create(data);
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return Notification.findByIdAndDelete(id);
  }
}

module.exports = new NotificationRepository();
