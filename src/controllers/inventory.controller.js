import * as inventoryService from '../services/inventory.service.js';
import { getLowStockProducts } from '../services/product.service.js';
import { recordAuditLog } from '../services/audit.service.js';

export async function listMovements(req, res, next) {
  try {
    const result = await inventoryService.listMovements(req.query);
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function stockIn(req, res, next) {
  try {
    const { product, movement } = await inventoryService.stockIn(req.body, req.session.user.id);
    await recordAuditLog({
      userId: req.session.user.id,
      action: 'STOCK_IN',
      entityType: 'Product',
      entityId: product.id,
      details: { quantity: req.body.quantity, newStock: product.stockQuantity },
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, data: { product, movement } });
  } catch (error) {
    next(error);
  }
}

export async function adjustStock(req, res, next) {
  try {
    const { product, movement } = await inventoryService.adjustStock(req.body, req.session.user.id);
    await recordAuditLog({
      userId: req.session.user.id,
      action: 'STOCK_ADJUSTMENT',
      entityType: 'Product',
      entityId: product.id,
      details: { direction: req.body.direction, quantity: req.body.quantity, reason: req.body.reason, newStock: product.stockQuantity },
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, data: { product, movement } });
  } catch (error) {
    next(error);
  }
}

export async function lowStock(req, res, next) {
  try {
    const products = await getLowStockProducts();
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
}
