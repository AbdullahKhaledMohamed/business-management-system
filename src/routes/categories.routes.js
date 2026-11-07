import { Router } from 'express';
import * as categoryController from '../controllers/category.controller.js';
import { validate } from '../middleware/validate.js';
import { listCategoriesSchema, createCategorySchema, updateCategorySchema } from '../validators/category.validator.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listCategoriesSchema), categoryController.listCategories);
router.post('/', requireRole('ADMIN', 'INVENTORY_MANAGER'), validate(createCategorySchema), categoryController.createCategory);
router.patch('/:id', requireRole('ADMIN', 'INVENTORY_MANAGER'), validate(updateCategorySchema), categoryController.updateCategory);

export default router;
