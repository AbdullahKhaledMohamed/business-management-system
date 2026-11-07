import * as customerService from '../services/customer.service.js';
import { recordAuditLog } from '../services/audit.service.js';
import { getCustomerOutstandingBalance, getCustomerSalesHistory as fetchCustomerSalesHistory } from '../services/sales.service.js';

export async function listCustomers(req, res, next) {
  try {
    const result = await customerService.listCustomers(req.query);
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function getCustomer(req, res, next) {
  try {
    const customer = await customerService.getCustomerByIdOrThrow(req.params.id);
    const outstandingBalance = await getCustomerOutstandingBalance(customer.id);
    res.json({ success: true, data: { ...customer, outstandingBalance } });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerSalesHistory(req, res, next) {
  try {
    await customerService.getCustomerByIdOrThrow(req.params.id); // 404 if missing
    const result = await fetchCustomerSalesHistory(req.params.id, req.query);
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req, res, next) {
  try {
    const customer = await customerService.createCustomer(req.body);
    await recordAuditLog({
      userId: req.session.user.id,
      action: 'CREATE_CUSTOMER',
      entityType: 'Customer',
      entityId: customer.id,
      details: { name: customer.name },
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req, res, next) {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    await recordAuditLog({
      userId: req.session.user.id,
      action: 'UPDATE_CUSTOMER',
      entityType: 'Customer',
      entityId: customer.id,
      details: req.body,
      ipAddress: req.ip,
    });
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
}
