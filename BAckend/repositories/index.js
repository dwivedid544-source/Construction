/**
 * Database Repository Driver Factory
 * Controlled by process.env.DB_DRIVER ('mongoose' | 'prisma')
 * Default driver: 'mongoose' for zero-downtime backward compatibility.
 */

const userRepository = require('./userRepository');
const companyRepository = require('./companyRepository');
const projectRepository = require('./projectRepository');
const taskRepository = require('./taskRepository');
const dailyLogRepository = require('./dailyLogRepository');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

module.exports = {
  getDriver,
  userRepository,
  companyRepository,
  projectRepository,
  taskRepository,
  dailyLogRepository
};
