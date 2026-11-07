import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { validate } from '../middleware/validate.js';
import { listProductsSchema, createProductSchema, updateProductSchema } from '../validators/product.validator.js';
import { idParamSchema } from '../validators/common.validator.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listProductsSchema), productController.listProducts);
router.get('/:id', validate(idParamSchema), productController.getProduct);
router.post('/', requireRole('ADMIN', 'INVENTORY_MANAGER'), validate(createProductSchema), productController.createProduct);
router.patch('/:id', requireRole('ADMIN', 'INVENTORY_MANAGER'), validate(updateProductSchema), productController.updateProduct);

export default router;
