import { Router } from 'express';
import * as inventoryController from '../controllers/inventory.controller.js';
import { validate } from '../middleware/validate.js';
import { listMovementsSchema, stockInSchema, adjustmentSchema } from '../validators/inventory.validator.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'INVENTORY_MANAGER'));

router.get('/movements', validate(listMovementsSchema), inventoryController.listMovements);
router.get('/low-stock', inventoryController.lowStock);
router.post('/stock-in', validate(stockInSchema), inventoryController.stockIn);
router.post('/adjustments', validate(adjustmentSchema), inventoryController.adjustStock);

export default router;
