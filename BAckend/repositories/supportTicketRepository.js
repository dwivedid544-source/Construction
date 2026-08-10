'use strict';
/**
 * SupportTicketRepository — Support ticket data access.
 */
const SupportTicket = require('../models/SupportTicket');
const BaseRepository = require('./base/BaseRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class SupportTicketRepository extends BaseRepository {
  constructor() {
    super('supportTicket', { softDelete: true, searchFields: ['subject', 'description', 'ticketNumber'] });
  }

  async findByCompany(companyId) {
    if (getDriver() === 'prisma') {
      return this.findMany({ companyId }, {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    return SupportTicket.find({ companyId }).sort({ createdAt: -1 }).lean();
  }

  async findByUser(userId) {
    if (getDriver() === 'prisma') return this.findMany({ userId });
    return SupportTicket.find({ userId }).lean();
  }

  async create(data) {
    if (getDriver() === 'prisma') return super.create(data);
    return SupportTicket.create(data);
  }

  async updateById(id, data) {
    if (getDriver() === 'prisma') return super.updateById(id, data);
    return SupportTicket.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') return this.softDeleteById(id);
    return SupportTicket.findByIdAndDelete(id);
  }
}

module.exports = new SupportTicketRepository();
