import * as expenseService from '../services/expense.service.js';
import { recordAuditLog } from '../services/audit.service.js';
import { toCsv } from '../utils/csv.js';
import { DEFAULT_EXPENSE_CATEGORIES } from '../utils/expenseCategories.js';

export function listCategories(req, res) {
  res.json({ success: true, data: DEFAULT_EXPENSE_CATEGORIES });
}

export async function listExpenses(req, res, next) {
  try {
    const result = await expenseService.listExpenses(req.query);
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function getExpense(req, res, next) {
  try {
    const expense = await expenseService.getExpenseByIdOrThrow(req.params.id);
    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
}

export async function createExpense(req, res, next) {
  try {
    const expense = await expenseService.createExpense(req.body, req.session.user.id);
    await recordAuditLog({
      userId: req.session.user.id,
      action: 'CREATE_EXPENSE',
      entityType: 'Expense',
      entityId: expense.id,
      details: { category: expense.category, amount: expense.amount },
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
}

export async function updateExpense(req, res, next) {
  try {
    const expense = await expenseService.updateExpense(req.params.id, req.body);
    await recordAuditLog({
      userId: req.session.user.id,
      action: 'UPDATE_EXPENSE',
      entityType: 'Expense',
      entityId: expense.id,
      details: req.body,
      ipAddress: req.ip,
    });
    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
}

export async function getTotals(req, res, next) {
  try {
    const [totalAmount, byCategory, byDay, byMonth] = await Promise.all([
      expenseService.getTotalExpenses(req.query),
      expenseService.getExpenseBreakdownByCategory(req.query),
      expenseService.getDailyExpenseTotals(req.query),
      expenseService.getMonthlyExpenseTotals(req.query),
    ]);
    res.json({ success: true, data: { totalAmount, byCategory, byDay, byMonth } });
  } catch (error) {
    next(error);
  }
}

export async function exportExpensesCsv(req, res, next) {
  try {
    const result = await expenseService.listExpenses({ ...req.query, page: 1, pageSize: 10000 });
    const csv = toCsv(result.items, [
      { label: 'التصنيف', value: 'category' },
      { label: 'الوصف', value: 'description' },
      { label: 'المبلغ', value: (row) => Number(row.amount).toFixed(2) },
      { label: 'التاريخ', value: (row) => new Date(row.expenseDate).toISOString().slice(0, 10) },
      { label: 'أُضيف بواسطة', value: (row) => row.createdBy?.fullName || '' },
    ]);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
}
