/**
 * invoiceService.js — Invoice Business Logic.
 */

'use strict';

const { invoiceRepository } = require('../repositories');
const AppError = require('../utils/AppError');

class InvoiceService {
  async getInvoices(query = {}, user) {
    const where = {};
    if (user.role !== 'SUPER_ADMIN') {
      where.companyId = user.companyId;
    }
    return invoiceRepository.paginate(query, where);
  }

  async getInvoiceById(id, user) {
    const invoice = await invoiceRepository.findByIdOrFail(id, 'Invoice');
    if (user.role !== 'SUPER_ADMIN' && invoice.companyId !== user.companyId) {
      throw AppError.forbidden('Access denied to this invoice.');
    }
    return invoice;
  }

  async createInvoice(data, user) {
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    return invoiceRepository.create({
      ...data,
      invoiceNumber,
      companyId: user.companyId,
    });
  }

  async updateInvoice(id, data, user) {
    const invoice = await this.getInvoiceById(id, user);
    return invoiceRepository.updateById(invoice.id, data);
  }

  async deleteInvoice(id, user) {
    const invoice = await this.getInvoiceById(id, user);
    return invoiceRepository.softDeleteById(invoice.id);
  }
}

module.exports = new InvoiceService();
