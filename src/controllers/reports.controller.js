import * as reportsService from '../services/reports.service.js';
import { listMovements as listInventoryMovements } from '../services/inventory.service.js';
import { toCsv } from '../utils/csv.js';

function sendPaginated(res, result) {
  res.json({ success: true, data: result.items, meta: result.meta });
}

export async function salesReport(req, res, next) {
  try {
    sendPaginated(res, await reportsService.getSalesReport(req.query));
  } catch (error) {
    next(error);
  }
}

export async function salesByProductReport(req, res, next) {
  try {
    sendPaginated(res, await reportsService.getSalesByProductReport(req.query));
  } catch (error) {
    next(error);
  }
}

export async function salesByCategoryReport(req, res, next) {
  try {
    sendPaginated(res, await reportsService.getSalesByCategoryReport(req.query));
  } catch (error) {
    next(error);
  }
}

export async function salesByCustomerReport(req, res, next) {
  try {
    sendPaginated(res, await reportsService.getSalesByCustomerReport(req.query));
  } catch (error) {
    next(error);
  }
}

export async function customerBalancesReport(req, res, next) {
  try {
    sendPaginated(res, await reportsService.getCustomerBalancesReport(req.query));
  } catch (error) {
    next(error);
  }
}

export async function profitReport(req, res, next) {
  try {
    const data = await reportsService.getProfitReport(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function inventoryReport(req, res, next) {
  try {
    const { items, meta, totalValuation } = await reportsService.getInventoryReport(req.query);
    res.json({ success: true, data: items, meta: { ...meta, totalValuation } });
  } catch (error) {
    next(error);
  }
}

export async function inventoryMovementsReport(req, res, next) {
  try {
    const result = await listInventoryMovements(req.query);
    sendPaginated(res, result);
  } catch (error) {
    next(error);
  }
}

// ---------------- CSV exports ----------------
// Each export reuses the same report function with a large page size,
// then streams the SAME data the on-screen report shows — exports can
// never diverge from (or bypass authorization applied to) the live report.

export async function exportSalesCsv(req, res, next) {
  try {
    const { items } = await reportsService.getSalesReport({ ...req.query, page: 1, pageSize: 10000 });
    const csv = toCsv(items, [
      { label: 'رقم الفاتورة', value: 'invoiceNumber' },
      { label: 'العميل', value: (r) => r.customer?.name || '' },
      { label: 'الحالة', value: 'status' },
      { label: 'الإجمالي', value: (r) => Number(r.totalAmount).toFixed(2) },
      { label: 'المدفوع', value: (r) => Number(r.amountPaid).toFixed(2) },
      { label: 'التاريخ', value: (r) => new Date(r.createdAt).toISOString() },
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sales-report.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

export async function exportCustomerBalancesCsv(req, res, next) {
  try {
    const { items } = await reportsService.getCustomerBalancesReport({ ...req.query, page: 1, pageSize: 10000 });
    const csv = toCsv(items, [
      { label: 'العميل', value: 'customerName' },
      { label: 'الهاتف', value: 'phone' },
      { label: 'إجمالي الفواتير', value: (r) => r.totalInvoiced.toFixed(2) },
      { label: 'المدفوع', value: (r) => r.totalPaid.toFixed(2) },
      { label: 'المتبقي', value: (r) => r.outstandingBalance.toFixed(2) },
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="customer-balances.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

export async function exportInventoryCsv(req, res, next) {
  try {
    const { items } = await reportsService.getInventoryReport({ ...req.query, page: 1, pageSize: 10000 });
    const csv = toCsv(items, [
      { label: 'SKU', value: 'sku' },
      { label: 'المنتج', value: 'name' },
      { label: 'الصنف', value: 'categoryName' },
      { label: 'الكمية', value: 'stockQuantity' },
      { label: 'الحد الأدنى', value: 'minStockLevel' },
      { label: 'نقص مخزون؟', value: (r) => (r.isLowStock ? 'نعم' : 'لا') },
      { label: 'قيمة المخزون', value: (r) => r.valuation.toFixed(2) },
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory-report.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
}
