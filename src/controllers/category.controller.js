import * as categoryService from '../services/category.service.js';
import { recordAuditLog } from '../services/audit.service.js';

export async function listCategories(req, res, next) {
  try {
    const result = await categoryService.listCategories(req.query);
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const category = await categoryService.createCategory(req.body);
    await recordAuditLog({
      userId: req.session.user.id,
      action: 'CREATE_CATEGORY',
      entityType: 'Category',
      entityId: category.id,
      details: { name: category.name },
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    await recordAuditLog({
      userId: req.session.user.id,
      action: 'UPDATE_CATEGORY',
      entityType: 'Category',
      entityId: category.id,
      details: req.body,
      ipAddress: req.ip,
    });
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}
