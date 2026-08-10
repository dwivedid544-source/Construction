'use strict';

const Company = require('../models/Company');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');

const getDriver = () => (process.env.DB_DRIVER || 'prisma').toLowerCase();

class CompanyRepository {
  async findByName(name) {
    if (getDriver() === 'prisma') {
      return await prisma.company.findUnique({
        where: { name },
        include: { subscriptionPlan: true },
      });
    }
    return await Company.findOne({ name });
  }

  async findById(id) {
    if (getDriver() === 'prisma') {
      return await prisma.company.findUnique({
        where: { id },
        include: { subscriptionPlan: true },
      });
    }
    return await Company.findById(id).populate('subscriptionPlanId').lean();
  }

  async findByIdOrFail(id, entityName = 'Company') {
    const item = await this.findById(id);
    if (!item) {
      throw AppError.notFound(`${entityName} not found`);
    }
    return item;
  }

  async find(query = {}) {
    if (getDriver() === 'prisma') {
      return await prisma.company.findMany({
        where: { ...query, deletedAt: null },
        include: { subscriptionPlan: true },
        orderBy: { createdAt: 'desc' },
      });
    }
    return await Company.find({ ...query, deletedAt: null }).populate('subscriptionPlanId').lean();
  }

  async findMany(query = {}) {
    return this.find(query);
  }

  async paginate(query = {}) {
    const companies = await this.find(query);
    return {
      data: companies,
      total: companies.length,
      page: 1,
      limit: companies.length,
    };
  }

  async count(query = {}) {
    if (getDriver() === 'prisma') {
      return await prisma.company.count({ where: { ...query, deletedAt: null } });
    }
    return await Company.countDocuments({ ...query, deletedAt: null });
  }

  async create(companyData) {
    if (getDriver() === 'prisma') {
      return await prisma.company.create({
        data: {
          name: companyData.name,
          email: companyData.email || null,
          phone: companyData.phone || null,
          address: companyData.address || null,
          subscriptionPlanId: companyData.subscriptionPlanId || null,
          subscriptionStatus: companyData.subscriptionStatus || 'active',
        },
      });
    }
    return await Company.create(companyData);
  }

  async updateById(id, updateData) {
    if (getDriver() === 'prisma') {
      return await prisma.company.update({
        where: { id },
        data: updateData,
      });
    }
    return await Company.findByIdAndUpdate(id, updateData, { new: true });
  }

  async softDeleteById(id) {
    if (getDriver() === 'prisma') {
      return await prisma.company.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    }
    return await Company.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true });
  }

  async deleteById(id) {
    return this.softDeleteById(id);
  }
}

module.exports = new CompanyRepository();
