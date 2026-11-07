import * as productService from '../services/product.service.js';
import { recordAuditLog } from '../services/audit.service.js';

export async function listProducts(req, res, next) {
  try {
    const result = await productService.listProducts(req.query);
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req, res, next) {
  try {
    const product = await productService.getProductByIdOrThrow(req.params.id);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req, res, next) {
  try {
    const product = await productService.createProduct(req.body, req.session.user.id);
    await recordAuditLog({
      userId: req.session.user.id,
      action: 'CREATE_PRODUCT',
      entityType: 'Product',
      entityId: product.id,
      details: { sku: product.sku, name: product.name, initialStock: product.stockQuantity },
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    await recordAuditLog({
      userId: req.session.user.id,
      action: 'UPDATE_PRODUCT',
      entityType: 'Product',
      entityId: product.id,
      details: req.body,
      ipAddress: req.ip,
    });
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}
