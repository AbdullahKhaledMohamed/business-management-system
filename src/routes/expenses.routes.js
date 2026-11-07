import { Router } from 'express';
import * as expenseController from '../controllers/expense.controller.js';
import { validate } from '../middleware/validate.js';
import { listExpensesSchema, createExpenseSchema, updateExpenseSchema, expenseTotalsQuerySchema } from '../validators/expense.validator.js';
import { idParamSchema } from '../validators/common.validator.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'ACCOUNTANT'));

router.get('/categories', expenseController.listCategories);
router.get('/totals', validate(expenseTotalsQuerySchema), expenseController.getTotals);
router.get('/export/csv', validate(listExpensesSchema), expenseController.exportExpensesCsv);
router.get('/', validate(listExpensesSchema), expenseController.listExpenses);
router.get('/:id', validate(idParamSchema), expenseController.getExpense);
router.post('/', validate(createExpenseSchema), expenseController.createExpense);
router.patch('/:id', validate(updateExpenseSchema), expenseController.updateExpense);

export default router;
