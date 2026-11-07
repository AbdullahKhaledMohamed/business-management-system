let charts = {};

function kpiCard({ label, value, colorClass }) {
  return `
    <div class="col-6 col-lg-3">
      <div class="card kpi-card ${colorClass}">
        <div class="card-body">
          <div class="kpi-value">${value}</div>
          <div class="kpi-label">${label}</div>
        </div>
      </div>
    </div>`;
}

function renderKpis(summary) {
  const html = [
    kpiCard({ label: 'إجمالي المبيعات', value: formatMoney(summary.revenue), colorClass: 'bg-primary' }),
    kpiCard({ label: 'إجمالي المصروفات', value: formatMoney(summary.totalExpenses), colorClass: 'bg-danger' }),
    kpiCard({ label: 'الربح الإجمالي', value: formatMoney(summary.grossProfit), colorClass: 'bg-success' }),
    kpiCard({ label: 'صافي الربح (تقديري)', value: formatMoney(summary.netProfitEstimate), colorClass: 'bg-success' }),
    kpiCard({ label: 'عدد الفواتير', value: summary.salesInvoiceCount, colorClass: 'bg-info text-dark' }),
    kpiCard({ label: 'عدد العملاء', value: summary.customerCount, colorClass: 'bg-secondary' }),
    kpiCard({ label: 'منتجات ناقصة المخزون', value: summary.lowStockProductCount, colorClass: 'bg-warning text-dark' }),
    kpiCard({ label: 'أرصدة مستحقة على العملاء', value: formatMoney(summary.totalOutstandingBalance), colorClass: 'bg-dark' }),
  ].join('');
  document.getElementById('kpiRow').innerHTML = html;
}

function destroyChart(key) {
  if (charts[key]) {
    charts[key].destroy();
    delete charts[key];
  }
}

function renderProfitTrendChart(rows) {
  destroyChart('profitTrend');
  const ctx = document.getElementById('profitTrendChart');
  const labels = rows.map((r) => formatDate(r.bucket));
  charts.profitTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'الإيراد', data: rows.map((r) => r.revenue), borderColor: '#1a4d8f', backgroundColor: 'rgba(26,77,143,0.1)', tension: 0.3 },
        { label: 'المصروفات', data: rows.map((r) => r.expenses), borderColor: '#dc3545', backgroundColor: 'rgba(220,53,69,0.1)', tension: 0.3 },
        { label: 'صافي الربح (تقديري)', data: rows.map((r) => r.netProfitEstimate), borderColor: '#198754', backgroundColor: 'rgba(25,135,84,0.1)', tension: 0.3 },
      ],
    },
    options: { responsive: true, interaction: { mode: 'index', intersect: false } },
  });
}

function renderExpenseBreakdownChart(rows) {
  destroyChart('expenseBreakdown');
  const ctx = document.getElementById('expenseBreakdownChart');
  charts.expenseBreakdown = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: rows.map((r) => r.category),
      datasets: [{ data: rows.map((r) => r.totalAmount), backgroundColor: ['#1a4d8f', '#dc3545', '#198754', '#ffc107', '#6f42c1', '#20c997', '#6c757d'] }],
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
  });
}

function renderTopProductsChart(rows) {
  destroyChart('topProducts');
  const ctx = document.getElementById('topProductsChart');
  charts.topProducts = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: rows.map((r) => r.name),
      datasets: [{ label: 'الكمية المباعة', data: rows.map((r) => r.totalQuantitySold), backgroundColor: '#1a4d8f' }],
    },
    options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } },
  });
}

function renderSalesByCategoryChart(rows) {
  destroyChart('salesByCategory');
  const ctx = document.getElementById('salesByCategoryChart');
  charts.salesByCategory = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: rows.map((r) => r.categoryName),
      datasets: [{ data: rows.map((r) => r.totalRevenue), backgroundColor: ['#1a4d8f', '#dc3545', '#198754', '#ffc107', '#6f42c1', '#20c997', '#6c757d'] }],
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
  });
}

function renderEmptyState(canvasId, message) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9aa5b1';
  ctx.font = '14px Cairo';
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

async function loadDashboard() {
  const period = document.getElementById('periodSelect').value;

  try {
    const [summaryRes, profitTrendRes, expenseBreakdownRes, topProductsRes, salesByCategoryRes] = await Promise.all([
      Api.get('/api/v1/dashboard/summary', { period }),
      Api.get('/api/v1/dashboard/profit-trend', { period }),
      Api.get('/api/v1/dashboard/expense-breakdown', { period }),
      Api.get('/api/v1/dashboard/top-products', { period, limit: 8 }),
      Api.get('/api/v1/dashboard/sales-by-category', { period }),
    ]);

    renderKpis(summaryRes.data);

    if (profitTrendRes.data.length) renderProfitTrendChart(profitTrendRes.data);
    else { destroyChart('profitTrend'); renderEmptyState('profitTrendChart', 'لا توجد بيانات في هذه الفترة'); }

    if (expenseBreakdownRes.data.length) renderExpenseBreakdownChart(expenseBreakdownRes.data);
    else { destroyChart('expenseBreakdown'); renderEmptyState('expenseBreakdownChart', 'لا توجد مصروفات'); }

    if (topProductsRes.data.length) renderTopProductsChart(topProductsRes.data);
    else { destroyChart('topProducts'); renderEmptyState('topProductsChart', 'لا توجد مبيعات بعد'); }

    if (salesByCategoryRes.data.length) renderSalesByCategoryChart(salesByCategoryRes.data);
    else { destroyChart('salesByCategory'); renderEmptyState('salesByCategoryChart', 'لا توجد مبيعات بعد'); }
  } catch (error) {
    showError(error);
  }
}

document.getElementById('periodSelect').addEventListener('change', loadDashboard);

initNavbar('dashboard').then(loadDashboard);
