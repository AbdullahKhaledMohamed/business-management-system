import { Router } from 'express';
import * as salesController from '../controllers/sales.controller.js';
import { validate } from '../middleware/validate.js';
import { createSaleSchema, listSalesSchema, paymentSchema } from '../validators/sales.validator.js';
import { idParamSchema } from '../validators/common.validator.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'ACCOUNTANT'));

router.get('/', validate(listSalesSchema), salesController.listInvoices);
router.get('/export/csv', validate(listSalesSchema), salesController.exportInvoicesCsv);
router.get('/:id', validate(idParamSchema), salesController.getInvoice);
router.post('/', validate(createSaleSchema), salesController.createInvoice);
router.post('/:id/payments', validate(paymentSchema), salesController.recordPayment);
router.post('/:id/cancel', validate(idParamSchema), salesController.cancelInvoice);

export default router;
