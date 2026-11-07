import { Router } from 'express';
import * as reportsController from '../controllers/reports.controller.js';
import { validate } from '../middleware/validate.js';
import {
  salesReportQuerySchema,
  groupedReportQuerySchema,
  profitReportQuerySchema,
  inventoryReportQuerySchema,
  customerBalancesQuerySchema,
} from '../validators/reports.validator.js';
import { listMovementsSchema } from '../validators/inventory.validator.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

// ---- Financial / sales reports: ADMIN + ACCOUNTANT ----
const financial = requireRole('ADMIN', 'ACCOUNTANT');

router.get('/sales', financial, validate(salesReportQuerySchema), reportsController.salesReport);
router.get('/sales/export/csv', financial, validate(salesReportQuerySchema), reportsController.exportSalesCsv);
router.get('/sales-by-product', financial, validate(groupedReportQuerySchema), reportsController.salesByProductReport);
router.get('/sales-by-category', financial, validate(groupedReportQuerySchema), reportsController.salesByCategoryReport);
router.get('/sales-by-customer', financial, validate(groupedReportQuerySchema), reportsController.salesByCustomerReport);
router.get('/profit', financial, validate(profitReportQuerySchema), reportsController.profitReport);
router.get('/customer-balances', financial, validate(customerBalancesQuerySchema), reportsController.customerBalancesReport);
router.get('/customer-balances/export/csv', financial, validate(customerBalancesQuerySchema), reportsController.exportCustomerBalancesCsv);

// ---- Inventory reports: ADMIN + ACCOUNTANT + INVENTORY_MANAGER ----
const inventoryAccess = requireRole('ADMIN', 'ACCOUNTANT', 'INVENTORY_MANAGER');

router.get('/inventory', inventoryAccess, validate(inventoryReportQuerySchema), reportsController.inventoryReport);
router.get('/inventory/export/csv', inventoryAccess, validate(inventoryReportQuerySchema), reportsController.exportInventoryCsv);
router.get('/inventory-movements', inventoryAccess, validate(listMovementsSchema), reportsController.inventoryMovementsReport);

export default router;
