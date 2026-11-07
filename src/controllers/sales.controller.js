import * as salesService from '../services/sales.service.js';
import { recordAuditLog } from '../services/audit.service.js';
import { toCsv } from '../utils/csv.js';

export async function listInvoices(req, res, next) {
  try {
    const result = await salesService.listSalesInvoices(req.query);
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function getInvoice(req, res, next) {
  try {
    const invoice = await salesService.getSalesInvoiceByIdOrThrow(req.params.id);
    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

export async function createInvoice(req, res, next) {
  try {
    const invoice = await salesService.createSalesInvoice(req.body, req.session.user.id);
    await recordAuditLog({
      userId: req.session.user.id,
      action: 'CREATE_SALES_INVOICE',
      entityType: 'SalesInvoice',
      entityId: invoice.id,
      details: { invoiceNumber: invoice.invoiceNumber, totalAmount: invoice.totalAmount },
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

export async function recordPayment(req, res, next) {
  try {
    const result = await salesService.recordPayment(req.params.id, req.body, req.session.user.id);
    await recordAuditLog({
      userId: req.session.user.id,
      action: 'RECORD_PAYMENT',
      entityType: 'SalesInvoice',
      entityId: req.params.id,
      details: { amount: req.body.amount, paymentMethod: req.body.paymentMethod, newStatus: result.invoice.status },
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function cancelInvoice(req, res, next) {
  try {
    const invoice = await salesService.cancelInvoice(req.params.id, req.session.user.id);
    await recordAuditLog({
      userId: req.session.user.id,
      action: 'CANCEL_SALES_INVOICE',
      entityType: 'SalesInvoice',
      entityId: invoice.id,
      ipAddress: req.ip,
    });
    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

export async function exportInvoicesCsv(req, res, next) {
  try {
    const result = await salesService.listSalesInvoices({ ...req.query, page: 1, pageSize: 10000 });
    const csv = toCsv(result.items, [
      { label: 'رقم الفاتورة', value: 'invoiceNumber' },
      { label: 'العميل', value: (row) => row.customer?.name || '' },
      { label: 'الحالة', value: 'status' },
      { label: 'الإجمالي', value: (row) => Number(row.totalAmount).toFixed(2) },
      { label: 'المدفوع', value: (row) => Number(row.amountPaid).toFixed(2) },
      { label: 'المتبقي', value: (row) => (Number(row.totalAmount) - Number(row.amountPaid)).toFixed(2) },
      { label: 'التاريخ', value: (row) => new Date(row.createdAt).toISOString() },
    ]);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sales-invoices.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
}
