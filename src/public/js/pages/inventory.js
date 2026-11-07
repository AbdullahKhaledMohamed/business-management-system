const movementTypeLabels = {
  STOCK_IN: 'إضافة مخزون',
  SALE: 'بيع',
  ADJUSTMENT: 'تسوية',
  CANCELLATION_REVERSAL: 'استرجاع إلغاء',
  RETURN: 'مرتجع',
};

let allProductsForInventory = [];
let currentMovementsPage = 1;

async function loadLowStock() {
  try {
    const res = await Api.get('/api/v1/inventory/low-stock');
    const tbody = document.getElementById('lowStockTableBody');
    if (!res.data.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-success py-4">لا توجد منتجات ناقصة المخزون حاليًا. ✅</td></tr>`;
      return;
    }
    tbody.innerHTML = res.data
      .map(
        (p) => `
        <tr>
          <td>${escapeHtml(p.sku)}</td>
          <td>${escapeHtml(p.name)}</td>
          <td><span class="badge bg-warning text-dark">${p.stockQuantity}</span></td>
          <td>${p.minStockLevel}</td>
        </tr>`,
      )
      .join('');
  } catch (error) {
    showError(error);
  }
}

function renderPagination(container, meta, onPageChange) {
  if (meta.totalPages <= 1) {
    container.innerHTML = `<span class="text-muted small">${meta.totalItems} عنصر</span>`;
    return;
  }
  container.innerHTML = `
    <span class="text-muted small">صفحة ${meta.page} من ${meta.totalPages} (${meta.totalItems} عنصر)</span>
    <div class="btn-group">
      <button class="btn btn-sm btn-outline-secondary" id="prevMovPageBtn" ${meta.page <= 1 ? 'disabled' : ''}>السابق</button>
      <button class="btn btn-sm btn-outline-secondary" id="nextMovPageBtn" ${meta.page >= meta.totalPages ? 'disabled' : ''}>التالي</button>
    </div>`;
  document.getElementById('prevMovPageBtn')?.addEventListener('click', () => onPageChange(meta.page - 1));
  document.getElementById('nextMovPageBtn')?.addEventListener('click', () => onPageChange(meta.page + 1));
}

async function loadMovements(page = 1) {
  currentMovementsPage = page;
  try {
    const res = await Api.get('/api/v1/inventory/movements', {
      page,
      pageSize: 15,
      productId: document.getElementById('movementProductFilter').value || undefined,
      movementType: document.getElementById('movementTypeFilter').value || undefined,
    });
    const tbody = document.getElementById('movementsTableBody');
    if (!res.data.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">لا توجد حركات مطابقة.</td></tr>`;
    } else {
      tbody.innerHTML = res.data
        .map((m) => {
          const qtyClass = m.quantity < 0 ? 'text-danger' : 'text-success';
          return `
          <tr>
            <td>${formatDateTime(m.createdAt)}</td>
            <td>${escapeHtml(m.product?.name || '')}</td>
            <td>${movementTypeLabels[m.movementType] || m.movementType}</td>
            <td class="${qtyClass} fw-bold">${m.quantity > 0 ? '+' : ''}${m.quantity}</td>
            <td>${escapeHtml(m.createdBy?.fullName || '')}</td>
            <td>${escapeHtml(m.notes || '—')}</td>
          </tr>`;
        })
        .join('');
    }
    renderPagination(document.getElementById('movementsPagination'), res.meta, loadMovements);
  } catch (error) {
    showError(error);
  }
}

async function submitStockIn(e) {
  e.preventDefault();
  const payload = {
    productId: document.getElementById('stockInProduct').value,
    quantity: Number(document.getElementById('stockInQuantity').value),
    notes: document.getElementById('stockInNotes').value.trim() || null,
  };
  try {
    await Api.post('/api/v1/inventory/stock-in', payload);
    showToast('تم إضافة المخزون بنجاح.');
    document.getElementById('stockInForm').reset();
    await Promise.all([loadLowStock(), loadMovements(1), refreshProductOptions()]);
  } catch (error) {
    showError(error);
  }
}

async function submitAdjustment(e) {
  e.preventDefault();
  const payload = {
    productId: document.getElementById('adjustmentProduct').value,
    direction: document.getElementById('adjustmentDirection').value,
    quantity: Number(document.getElementById('adjustmentQuantity').value),
    reason: document.getElementById('adjustmentReason').value.trim(),
  };
  try {
    await Api.post('/api/v1/inventory/adjustments', payload);
    showToast('تم تنفيذ التسوية بنجاح.');
    document.getElementById('adjustmentForm').reset();
    await Promise.all([loadLowStock(), loadMovements(1), refreshProductOptions()]);
  } catch (error) {
    showError(error);
  }
}

async function refreshProductOptions() {
  const res = await Api.get('/api/v1/products', { pageSize: 500, isActive: true });
  allProductsForInventory = res.data;
  const options = allProductsForInventory.map((p) => ({ value: p.id, label: `${p.name} (الحالي: ${p.stockQuantity})` }));
  fillSelect(document.getElementById('stockInProduct'), options, 'اختر منتجًا');
  fillSelect(document.getElementById('adjustmentProduct'), options, 'اختر منتجًا');
  fillSelect(document.getElementById('movementProductFilter'), options, 'كل المنتجات');
}

(async function init() {
  await initNavbar('inventory');

  await refreshProductOptions();
  await Promise.all([loadLowStock(), loadMovements(1)]);

  document.getElementById('stockInForm').addEventListener('submit', submitStockIn);
  document.getElementById('adjustmentForm').addEventListener('submit', submitAdjustment);
  document.getElementById('movementProductFilter').addEventListener('change', () => loadMovements(1));
  document.getElementById('movementTypeFilter').addEventListener('change', () => loadMovements(1));
})();
