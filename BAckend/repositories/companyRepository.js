const Company = require('../models/Company');
const prisma = require('../config/prisma');

const getDriver = () => (process.env.DB_DRIVER || 'mongoose').toLowerCase();

class CompanyRepository {
  async findByName(name) {
    if (getDriver() === 'prisma') {
      return await prisma.company.findUnique({
        where: { name }
      });
    }
    return await Company.findOne({ name });
  }

  async findById(id) {
    if (getDriver() === 'prisma') {
      return await prisma.company.findUnique({
        where: { id },
        include: { subscriptionPlan: true }
      });
    }
    return await Company.findById(id).populate('subscriptionPlanId').lean();
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
          subscriptionStatus: companyData.subscriptionStatus || 'active'
        }
      });
    }
    return await Company.create(companyData);
  }

  async updateById(id, updateData) {
    if (getDriver() === 'prisma') {
      return await prisma.company.update({
        where: { id },
        data: updateData
      });
    }
    return await Company.findByIdAndUpdate(id, updateData, { new: true });
  }
}

module.exports = new CompanyRepository();
