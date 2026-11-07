let currentSalesPage = 1;
let saleModal, saleDetailModal;
let allCustomers = [];
let allProducts = [];
let itemRowCounter = 0;

function renderSalesTable(items) {
  const tbody = document.getElementById('salesTableBody');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">لا توجد فواتير مطابقة.</td></tr>`;
    return;
  }
  tbody.innerHTML = items
    .map((inv) => {
      const remaining = Number(inv.totalAmount) - Number(inv.amountPaid);
      return `
      <tr>
        <td><a href="#" data-view-invoice="${inv.id}">${escapeHtml(inv.invoiceNumber)}</a></td>
        <td>${escapeHtml(inv.customer?.name || '—')}</td>
        <td><span class="badge ${statusBadgeClass[inv.status]}">${statusLabels[inv.status]}</span></td>
        <td>${formatMoney(inv.totalAmount)}</td>
        <td>${formatMoney(inv.amountPaid)}</td>
        <td>${formatMoney(remaining)}</td>
        <td>${formatDate(inv.createdAt)}</td>
        <td><button class="btn btn-sm btn-outline-primary" data-view-invoice="${inv.id}">تفاصيل</button></td>
      </tr>`;
    })
    .join('');

  tbody.querySelectorAll('[data-view-invoice]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openSaleDetail(el.dataset.viewInvoice);
    });
  });
}

function renderPagination(container, meta, onPageChange) {
  if (meta.totalPages <= 1) {
    container.innerHTML = `<span class="text-muted small">${meta.totalItems} عنصر</span>`;
    return;
  }
  container.innerHTML = `
    <span class="text-muted small">صفحة ${meta.page} من ${meta.totalPages} (${meta.totalItems} عنصر)</span>
    <div class="btn-group">
      <button class="btn btn-sm btn-outline-secondary" id="prevPageBtn" ${meta.page <= 1 ? 'disabled' : ''}>السابق</button>
      <button class="btn btn-sm btn-outline-secondary" id="nextPageBtn" ${meta.page >= meta.totalPages ? 'disabled' : ''}>التالي</button>
    </div>`;
  document.getElementById('prevPageBtn')?.addEventListener('click', () => onPageChange(meta.page - 1));
  document.getElementById('nextPageBtn')?.addEventListener('click', () => onPageChange(meta.page + 1));
}

function currentFilters() {
  return {
    status: document.getElementById('statusFilter').value || undefined,
    dateFrom: document.getElementById('dateFromFilter').value || undefined,
    dateTo: document.getElementById('dateToFilter').value || undefined,
  };
}

async function loadSales(page = 1) {
  currentSalesPage = page;
  try {
    const res = await Api.get('/api/v1/sales', { page, pageSize: 10, ...currentFilters() });
    renderSalesTable(res.data);
    renderPagination(document.getElementById('salesPagination'), res.meta, loadSales);
  } catch (error) {
    showError(error);
  }
}

// ---------------- Create invoice ----------------
function addItemRow() {
  itemRowCounter += 1;
  const rowId = `item-${itemRowCounter}`;
  const tbody = document.getElementById('saleItemsBody');
  const tr = document.createElement('tr');
  tr.id = rowId;
  tr.innerHTML = `
    <td><select class="form-select form-select-sm item-product" required></select></td>
    <td><input type="number" min="1" value="1" class="form-control form-control-sm item-quantity" required /></td>
    <td><span class="item-price">0.00</span></td>
    <td><input type="number" min="0" step="0.01" value="0" class="form-control form-control-sm item-discount" /></td>
    <td><span class="item-line-total">0.00</span></td>
    <td><button type="button" class="btn btn-sm btn-outline-danger" data-remove-row>×</button></td>
  `;
  tbody.appendChild(tr);

  const select = tr.querySelector('.item-product');
  fillSelect(
    select,
    allProducts.map((p) => ({ value: p.id, label: `${p.name} (متاح: ${p.stockQuantity})` })),
    'اختر منتجًا',
  );

  tr.querySelector('[data-remove-row]').addEventListener('click', () => {
    tr.remove();
    recalcSaleTotals();
  });
  select.addEventListener('change', () => updateRowPrice(tr));
  tr.querySelector('.item-quantity').addEventListener('input', () => recalcSaleTotals());
  tr.querySelector('.item-discount').addEventListener('input', () => recalcSaleTotals());
}

function updateRowPrice(tr) {
  const productId = tr.querySelector('.item-product').value;
  const product = allProducts.find((p) => p.id === productId);
  tr.querySelector('.item-price').textContent = product ? Number(product.sellingPrice).toFixed(2) : '0.00';
  recalcSaleTotals();
}

function recalcSaleTotals() {
  let subtotal = 0;
  document.querySelectorAll('#saleItemsBody tr').forEach((tr) => {
    const price = Number(tr.querySelector('.item-price').textContent) || 0;
    const qty = Number(tr.querySelector('.item-quantity').value) || 0;
    const discount = Number(tr.querySelector('.item-discount').value) || 0;
    const lineTotal = Math.max(0, price * qty - discount);
    tr.querySelector('.item-line-total').textContent = lineTotal.toFixed(2);
    subtotal += lineTotal;
  });

  const invoiceDiscount = Number(document.getElementById('saleDiscount').value) || 0;
  const total = Math.max(0, subtotal - invoiceDiscount);

  document.getElementById('saleSubtotalDisplay').textContent = formatMoney(subtotal);
  document.getElementById('saleDiscountDisplay').textContent = formatMoney(invoiceDiscount);
  document.getElementById('saleTotalDisplay').textContent = formatMoney(total);
}

function resetSaleForm() {
  document.getElementById('saleForm').reset();
  document.getElementById('saleItemsBody').innerHTML = '';
  addItemRow();
  recalcSaleTotals();
}

async function submitSaleForm(e) {
  e.preventDefault();
  const items = [...document.querySelectorAll('#saleItemsBody tr')]
    .map((tr) => ({
      productId: tr.querySelector('.item-product').value,
      quantity: Number(tr.querySelector('.item-quantity').value),
      discountAmount: Number(tr.querySelector('.item-discount').value) || 0,
    }))
    .filter((i) => i.productId && i.quantity > 0);

  if (!items.length) {
    showToast('أضف صنفًا واحدًا على الأقل للفاتورة.', 'error');
    return;
  }

  const payload = {
    customerId: document.getElementById('saleCustomerId').value,
    discountAmount: Number(document.getElementById('saleDiscount').value) || 0,
    items,
  };

  try {
    await Api.post('/api/v1/sales', payload);
    showToast('تم إنشاء الفاتورة بنجاح.');
    saleModal.hide();
    loadSales(1);
  } catch (error) {
    showError(error);
  }
}

// ---------------- Invoice detail ----------------
async function openSaleDetail(id) {
  try {
    const res = await Api.get(`/api/v1/sales/${id}`);
    const inv = res.data;
    const remaining = Number(inv.totalAmount) - Number(inv.amountPaid);

    const itemsRows = inv.items
      .map(
        (it) => `
        <tr>
          <td>${escapeHtml(it.product?.name || '')}</td>
          <td>${it.quantity}</td>
          <td>${formatMoney(it.unitPrice)}</td>
          <td>${formatMoney(it.discountAmount)}</td>
          <td>${formatMoney(it.lineTotal)}</td>
        </tr>`,
      )
      .join('');

    const paymentsRows = inv.customerPayments.length
      ? inv.customerPayments
          .map((p) => `<tr><td>${formatDateTime(p.paymentDate)}</td><td>${formatMoney(p.amount)}</td><td>${escapeHtml(p.paymentMethod)}</td></tr>`)
          .join('')
      : `<tr><td colspan="3" class="text-muted text-center">لا توجد دفعات مسجلة.</td></tr>`;

    const canAct = inv.status !== 'CANCELED';

    document.getElementById('saleDetailBody').innerHTML = `
      <div id="printableInvoice">
        <div class="d-flex justify-content-between mb-3">
          <div>
            <h4>${escapeHtml(inv.invoiceNumber)}</h4>
            <div class="text-muted">العميل: ${escapeHtml(inv.customer?.name || '')}</div>
            <div class="text-muted">التاريخ: ${formatDateTime(inv.createdAt)}</div>
          </div>
          <div class="text-end">
            <span class="badge ${statusBadgeClass[inv.status]} fs-6">${statusLabels[inv.status]}</span>
          </div>
        </div>

        <table class="table table-sm">
          <thead class="table-light"><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الخصم</th><th>الإجمالي</th></tr></thead>
          <tbody>${itemsRows}</tbody>
        </table>

        <div class="d-flex justify-content-end">
          <table class="table table-sm w-auto">
            <tr><th class="pe-4">الإجمالي الفرعي</th><td>${formatMoney(inv.subtotal)}</td></tr>
            <tr><th class="pe-4">الخصم</th><td>${formatMoney(inv.discountAmount)}</td></tr>
            <tr class="fw-bold"><th class="pe-4">الإجمالي</th><td>${formatMoney(inv.totalAmount)}</td></tr>
            <tr><th class="pe-4">المدفوع</th><td>${formatMoney(inv.amountPaid)}</td></tr>
            <tr class="fw-bold"><th class="pe-4">المتبقي</th><td>${formatMoney(remaining)}</td></tr>
          </table>
        </div>

        <h6 class="mt-3">الدفعات</h6>
        <table class="table table-sm"><thead class="table-light"><tr><th>التاريخ</th><th>المبلغ</th><th>طريقة الدفع</th></tr></thead><tbody>${paymentsRows}</tbody></table>
      </div>

      <div class="d-flex gap-2 flex-wrap no-print">
        <button class="btn btn-outline-secondary" id="printInvoiceBtn">طباعة</button>
        ${
          canAct && remaining > 0
            ? `<button class="btn btn-success" id="recordPaymentBtn">تسجيل دفعة</button>`
            : ''
        }
        ${canAct ? `<button class="btn btn-outline-danger ms-auto" id="cancelInvoiceBtn">إلغاء الفاتورة</button>` : ''}
      </div>

      <div id="paymentFormWrapper" class="mt-3 d-none">
        <div class="card">
          <div class="card-body">
            <div class="row g-2 align-items-end">
              <div class="col-md-4">
                <label class="form-label">المبلغ</label>
                <input type="number" min="0.01" step="0.01" max="${remaining}" id="paymentAmount" class="form-control" value="${remaining}" />
              </div>
              <div class="col-md-4">
                <label class="form-label">طريقة الدفع</label>
                <select id="paymentMethod" class="form-select">
                  <option value="CASH">نقدًا</option>
                  <option value="CARD">بطاقة</option>
                  <option value="BANK_TRANSFER">تحويل بنكي</option>
                  <option value="OTHER">أخرى</option>
                </select>
              </div>
              <div class="col-md-4">
                <button class="btn btn-primary w-100" id="confirmPaymentBtn">تأكيد الدفعة</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('printInvoiceBtn').addEventListener('click', () => window.print());

    document.getElementById('recordPaymentBtn')?.addEventListener('click', () => {
      document.getElementById('paymentFormWrapper').classList.remove('d-none');
    });

    document.getElementById('confirmPaymentBtn')?.addEventListener('click', async () => {
      const amount = Number(document.getElementById('paymentAmount').value);
      const paymentMethod = document.getElementById('paymentMethod').value;
      try {
        await Api.post(`/api/v1/sales/${inv.id}/payments`, { amount, paymentMethod });
        showToast('تم تسجيل الدفعة بنجاح.');
        saleDetailModal.hide();
        loadSales(currentSalesPage);
      } catch (error) {
        showError(error);
      }
    });

    document.getElementById('cancelInvoiceBtn')?.addEventListener('click', async () => {
      const confirmed = await confirmAction(`هل أنت متأكد من إلغاء الفاتورة ${inv.invoiceNumber}؟ سيتم استرجاع المخزون.`);
      if (!confirmed) return;
      try {
        await Api.post(`/api/v1/sales/${inv.id}/cancel`);
        showToast('تم إلغاء الفاتورة واسترجاع المخزون.');
        saleDetailModal.hide();
        loadSales(currentSalesPage);
      } catch (error) {
        showError(error);
      }
    });

    saleDetailModal.show();
  } catch (error) {
    showError(error);
  }
}

// ---------------- Init ----------------
(async function init() {
  await initNavbar('sales');

  saleModal = new bootstrap.Modal(document.getElementById('saleModal'));
  saleDetailModal = new bootstrap.Modal(document.getElementById('saleDetailModal'));

  const [customersRes, productsRes] = await Promise.all([
    Api.get('/api/v1/customers', { pageSize: 500 }),
    Api.get('/api/v1/products', { pageSize: 500, isActive: true }),
  ]);
  allCustomers = customersRes.data;
  allProducts = productsRes.data;
  fillSelect(document.getElementById('saleCustomerId'), allCustomers.map((c) => ({ value: c.id, label: c.name })), 'اختر عميلًا');

  await loadSales(1);

  document.getElementById('addSaleBtn').addEventListener('click', () => {
    resetSaleForm();
    saleModal.show();
  });
  document.getElementById('addItemRowBtn').addEventListener('click', addItemRow);
  document.getElementById('saleDiscount').addEventListener('input', recalcSaleTotals);
  document.getElementById('saleForm').addEventListener('submit', submitSaleForm);

  document.getElementById('statusFilter').addEventListener('change', () => loadSales(1));
  document.getElementById('dateFromFilter').addEventListener('change', () => loadSales(1));
  document.getElementById('dateToFilter').addEventListener('change', () => loadSales(1));
  document.getElementById('exportCsvBtn').addEventListener('click', () => {
    Api.downloadCsv('/api/v1/sales/export/csv', currentFilters(), 'sales-report.csv');
  });
})();
