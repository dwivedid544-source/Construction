const User = require('../models/User');
const prisma = require('../config/prisma');

const getDriver = () => (process.env.DB_DRIVER || 'prisma').toLowerCase();

class UserRepository {
  async findByEmail(email) {
    if (getDriver() === 'prisma') {
      return await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { company: true, role: true }
      });
    }
    return await User.findOne({ email: email.toLowerCase() });
  }

  async findById(id) {
    if (getDriver() === 'prisma') {
      return await prisma.user.findUnique({
        where: { id },
        include: { company: true, role: true }
      });
    }
    return await User.findById(id);
  }

  async find(query = {}) {
    if (getDriver() === 'prisma') {
      const where = {};
      if (query.companyId) where.companyId = query.companyId;
      if (query.role) {
        if (typeof query.role === 'object' && query.role.$in) {
          where.role = { in: query.role.$in };
        } else {
          where.role = query.role;
        }
      }
      if (query.isActive !== undefined) where.isActive = query.isActive;

      return await prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          avatar: true,
          status: true,
          isActive: true,
          companyId: true,
          roleId: true,
          createdAt: true,
          updatedAt: true
        }
      });
    }
    return await User.find(query).select('-password').lean();
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
          isActive: userData.isActive !== undefined ? userData.isActive : true
        }
      });
    }
    return await User.create(userData);
  }

  async updateById(id, updateData) {
    if (getDriver() === 'prisma') {
      return await prisma.user.update({
        where: { id },
        data: updateData
      });
    }
    return await User.findByIdAndUpdate(id, updateData, { new: true });
  }

  async deleteById(id) {
    if (getDriver() === 'prisma') {
      return await prisma.user.delete({
        where: { id }
      });
    }
    return await User.findByIdAndDelete(id);
  }

  async findByCompany(companyId) {
    if (getDriver() === 'prisma') {
      return await prisma.user.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true, email: true, phoneNumber: true, avatar: true }
      });
    }
    return await User.find({ companyId, isActive: true }).select('-password').lean();
  }
}

module.exports = new UserRepository();
