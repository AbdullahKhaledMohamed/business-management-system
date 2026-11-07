import * as dashboardService from '../services/dashboard.service.js';

export async function getSummary(req, res, next) {
  try {
    const data = await dashboardService.getDashboardSummary(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getSalesTrend(req, res, next) {
  try {
    const granularity = req.query.period === 'this_year' ? 'month' : 'day';
    const data = await dashboardService.getSalesTrend(req.query, granularity);
    res.json({ success: true, data, meta: { granularity } });
  } catch (error) {
    next(error);
  }
}

export async function getProfitTrend(req, res, next) {
  try {
    const granularity = req.query.period === 'this_year' ? 'month' : 'day';
    const data = await dashboardService.getProfitTrend(req.query, granularity);
    res.json({ success: true, data, meta: { granularity } });
  } catch (error) {
    next(error);
  }
}

export async function getTopProducts(req, res, next) {
  try {
    const data = await dashboardService.getTopProducts(req.query, req.query.limit || 10);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getSalesByCategory(req, res, next) {
  try {
    const data = await dashboardService.getSalesByCategory(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getExpenseBreakdown(req, res, next) {
  try {
    const data = await dashboardService.getExpenseBreakdown(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getComparison(req, res, next) {
  try {
    const data = await dashboardService.compareSalesPeriods(req.query.periodA, req.query.periodB);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
