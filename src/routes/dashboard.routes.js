import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { validate } from '../middleware/validate.js';
import { dashboardQuerySchema, comparisonQuerySchema } from '../validators/dashboard.validator.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'ACCOUNTANT'));

router.get('/summary', validate(dashboardQuerySchema), dashboardController.getSummary);
router.get('/sales-trend', validate(dashboardQuerySchema), dashboardController.getSalesTrend);
router.get('/profit-trend', validate(dashboardQuerySchema), dashboardController.getProfitTrend);
router.get('/top-products', validate(dashboardQuerySchema), dashboardController.getTopProducts);
router.get('/sales-by-category', validate(dashboardQuerySchema), dashboardController.getSalesByCategory);
router.get('/expense-breakdown', validate(dashboardQuerySchema), dashboardController.getExpenseBreakdown);
router.get('/comparison', validate(comparisonQuerySchema), dashboardController.getComparison);

export default router;
