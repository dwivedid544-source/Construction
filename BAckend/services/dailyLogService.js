/**
 * dailyLogService.js — Daily Construction Log Business Logic.
 */

'use strict';

const { dailyLogRepository } = require('../repositories');
const AppError = require('../utils/AppError');

class DailyLogService {
  async getDailyLogs(query = {}, user) {
    const where = {};
    if (user.role !== 'SUPER_ADMIN') {
      where.companyId = user.companyId;
    }
    return dailyLogRepository.paginate(query, where);
  }

  async getDailyLogById(id, user) {
    const dailyLog = await dailyLogRepository.findByIdOrFail(id, 'DailyLog');
    if (user.role !== 'SUPER_ADMIN' && dailyLog.companyId !== user.companyId) {
      throw AppError.forbidden('Access denied to this daily log.');
    }
    return dailyLog;
  }

  async createDailyLog(data, user) {
    return dailyLogRepository.create({
      ...data,
      companyId: user.companyId,
      engineerId: user.id,
    });
  }

  async updateDailyLog(id, data, user) {
    const dailyLog = await this.getDailyLogById(id, user);
    return dailyLogRepository.updateById(dailyLog.id, data);
  }

  async deleteDailyLog(id, user) {
    const dailyLog = await this.getDailyLogById(id, user);
    return dailyLogRepository.softDeleteById(dailyLog.id);
  }
}

module.exports = new DailyLogService();
