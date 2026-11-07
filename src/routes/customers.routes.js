import { Router } from 'express';
import * as customerController from '../controllers/customer.controller.js';
import { validate } from '../middleware/validate.js';
import { listCustomersSchema, createCustomerSchema, updateCustomerSchema } from '../validators/customer.validator.js';
import { idParamSchema } from '../validators/common.validator.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'ACCOUNTANT'));

router.get('/', validate(listCustomersSchema), customerController.listCustomers);
router.get('/:id', validate(idParamSchema), customerController.getCustomer);
router.get('/:id/sales-history', validate(idParamSchema), customerController.getCustomerSalesHistory);
router.post('/', validate(createCustomerSchema), customerController.createCustomer);
router.patch('/:id', validate(updateCustomerSchema), customerController.updateCustomer);

export default router;
