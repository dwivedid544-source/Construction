const DailyLog = require('../models/DailyLog');
const prisma = require('../config/prisma');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class DailyLogRepository {
  async findById(id) {
    if (getDriver() === 'prisma') {
      return await prisma.dailyLog.findUnique({
        where: { id },
        include: { project: true, engineer: true }
      });
    }
    return await DailyLog.findById(id).populate('projectId engineerId').lean();
  }

  async findByProject(projectId) {
    if (getDriver() === 'prisma') {
      return await prisma.dailyLog.findMany({
        where: { projectId },
        orderBy: { logDate: 'desc' }
      });
    }
    return await DailyLog.find({ projectId }).sort({ logDate: -1 }).lean();
  }

  async create(logData) {
    if (getDriver() === 'prisma') {
      return await prisma.dailyLog.create({
        data: {
          projectId: logData.projectId,
          companyId: logData.companyId,
          engineerId: logData.engineerId,
          weather: logData.weather || null,
          notes: logData.notes || null,
          workerCount: logData.workerCount || 0,
          approved: logData.approved || false
        }
      });
    }
    return await DailyLog.create(logData);
  }
}

module.exports = new DailyLogRepository();
