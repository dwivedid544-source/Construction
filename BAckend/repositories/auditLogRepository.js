'use strict';
/**
 * AuditLogRepository — AuditLog data access (PostgreSQL only).
 * Reads always come from PostgreSQL; writes are handled by utils/auditLog.js.
 */
const BaseRepository = require('./base/BaseRepository');

// AuditLog never uses soft delete — it is the immutable record of all actions.
class AuditLogRepository extends BaseRepository {
  constructor() {
    super('auditLog', { softDelete: false, searchFields: ['action', 'resource'] });
  }

  async findByCompany(companyId, opts = {}) {
    return this.paginate(opts, { companyId }, { orderBy: { createdAt: 'desc' } });
  }

  async findByUser(userId, opts = {}) {
    return this.paginate(opts, { userId }, { orderBy: { createdAt: 'desc' } });
  }

  async findByResource(resource, resourceId) {
    return this.findMany({ resource, details: { path: ['resourceId'], equals: resourceId } });
  }
}

module.exports = new AuditLogRepository();
