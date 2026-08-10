const User = require('../models/User');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');

const getDriver = () => (process.env.DB_DRIVER || 'prisma').toLowerCase();

class UserRepository {
  async findByEmail(email) {
    if (getDriver() === 'prisma') {
      const u = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { company: true, role: true },
      });
      if (!u) return null;
      return {
        ...u,
        _id: u.id,
        role: u.role ? u.role.name : 'WORKER',
        roleObject: u.role,
      };
    }
    return await User.findOne({ email: email.toLowerCase() });
  }

  async findById(id) {
    if (getDriver() === 'prisma') {
      const u = await prisma.user.findUnique({
        where: { id },
        include: { company: true, role: true },
      });
      if (!u) return null;
      return {
        ...u,
        _id: u.id,
        role: u.role ? u.role.name : 'WORKER',
        roleObject: u.role,
      };
    }
    return await User.findById(id);
  }

  async findByIdOrFail(id, entityName = 'User') {
    const item = await this.findById(id);
    if (!item) {
      throw AppError.notFound(`${entityName} not found`);
    }
    return item;
  }

  async find(query = {}) {
    if (getDriver() === 'prisma') {
      const where = {};
      if (query.companyId) where.companyId = query.companyId;
      if (query.role) {
        if (typeof query.role === 'object' && query.role.$in) {
          where.role = { name: { in: query.role.$in } };
        } else {
          where.role = { name: query.role };
        }
      }
      if (query.isActive !== undefined) where.isActive = query.isActive;

      const users = await prisma.user.findMany({
        where,
        include: { company: true, role: true },
        orderBy: { createdAt: 'desc' },
      });

      return users.map((u) => ({
        ...u,
        _id: u.id,
        fullName: u.name,
        role: u.role ? u.role.name : 'WORKER',
        companyId: u.company ? { _id: u.company.id, name: u.company.name } : null,
      }));
    }
    return await User.find(query).select('-password').lean();
  }

  async findMany(query = {}, options = {}) {
    return this.find(query);
  }

  async paginate(query = {}) {
    const users = await this.find(query);
    return {
      data: users,
      total: users.length,
      page: 1,
      limit: users.length,
    };
  }

  async count(query = {}) {
    if (getDriver() === 'prisma') {
      return await prisma.user.count({ where: { ...query, deletedAt: null } });
    }
    return await User.countDocuments({ ...query, deletedAt: null });
  }

  async create(userData) {
    if (getDriver() === 'prisma') {
      return await prisma.user.create({
        data: {
          name: userData.fullName || userData.name,
          email: userData.email.toLowerCase(),
          password: userData.password,
          roleId: userData.roleId || null,
          companyId: userData.companyId || null,
          phoneNumber: userData.phone || userData.phoneNumber || null,
          avatar: userData.avatar || null,
          isActive: userData.isActive !== undefined ? userData.isActive : true,
        },
      });
    }
    return await User.create(userData);
  }

  async updateById(id, updateData) {
    if (getDriver() === 'prisma') {
      const validFields = [
        'name', 'email', 'password', 'phoneNumber', 'avatar',
        'status', 'isActive', 'lastLogin', 'socketId', 'roleId', 'companyId'
      ];
      const prismaData = {};

      const raw = { ...updateData };
      if (raw.fullName) raw.name = raw.fullName;
      if (raw.phone) raw.phoneNumber = raw.phone;

      Object.keys(raw).forEach((key) => {
        if (validFields.includes(key) && raw[key] !== undefined && raw[key] !== null) {
          prismaData[key] = raw[key];
        }
      });

      return await prisma.user.update({
        where: { id },
        data: prismaData,
      });
    }
    return await User.findByIdAndUpdate(id, updateData, { new: true });
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') {
      return await prisma.user.delete({
        where: { id },
      });
    }
    return await User.findByIdAndDelete(id);
  }

  async findByCompany(companyId) {
    if (getDriver() === 'prisma') {
      return await prisma.user.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true, email: true, phoneNumber: true, avatar: true },
      });
    }
    return await User.find({ companyId, isActive: true }).select('-password').lean();
  }
}

module.exports = new UserRepository();
