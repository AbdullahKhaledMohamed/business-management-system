let currentProductsPage = 1;
let allCategories = [];
let productModal, productFormEl;

async function loadCategoriesIntoDropdowns() {
  const res = await Api.get('/api/v1/categories', { pageSize: 100 });
  allCategories = res.data;
  fillSelect(document.getElementById('productCategoryFilter'), allCategories.map((c) => ({ value: c.id, label: c.name })), 'كل الأصناف');
  fillSelect(document.getElementById('productCategoryId'), allCategories.map((c) => ({ value: c.id, label: c.name })));
}

function renderProductsTable(items) {
  const tbody = document.getElementById('productsTableBody');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">لا توجد منتجات مطابقة.</td></tr>`;
    return;
  }
  tbody.innerHTML = items
    .map((p) => {
      const lowStock = p.stockQuantity <= p.minStockLevel;
      return `
      <tr>
        <td>${escapeHtml(p.sku)}</td>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.category?.name || '—')}</td>
        <td>${formatMoney(p.sellingPrice)}</td>
        <td>${p.stockQuantity} ${lowStock ? '<span class="badge bg-warning text-dark">ناقص</span>' : ''}</td>
        <td>${p.isActive ? '<span class="badge bg-success">نشط</span>' : '<span class="badge bg-secondary">غير نشط</span>'}</td>
        <td class="table-actions"><button class="btn btn-sm btn-outline-primary" data-edit-product="${p.id}" data-roles="ADMIN,INVENTORY_MANAGER">تعديل</button></td>
      </tr>`;
    })
    .join('');

  tbody.querySelectorAll('[data-edit-product]').forEach((btn) => {
    btn.addEventListener('click', () => openProductModal(items.find((p) => p.id === btn.dataset.editProduct)));
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

async function loadProducts(page = 1) {
  currentProductsPage = page;
  try {
    const res = await Api.get('/api/v1/products', {
      page,
      pageSize: 10,
      search: document.getElementById('productSearch').value.trim() || undefined,
      categoryId: document.getElementById('productCategoryFilter').value || undefined,
      lowStockOnly: document.getElementById('lowStockFilter').checked || undefined,
    });
    renderProductsTable(res.data);
    renderPagination(document.getElementById('productsPagination'), res.meta, loadProducts);
  } catch (error) {
    showError(error);
  }
}

function openProductModal(product) {
  productFormEl.reset();
  document.getElementById('productId').value = product?.id || '';
  document.getElementById('productModalTitle').textContent = product ? 'تعديل منتج' : 'منتج جديد';
  document.getElementById('productSku').value = product?.sku || '';
  document.getElementById('productSku').disabled = !!product; // SKU shouldn't change after creation
  document.getElementById('productName').value = product?.name || '';
  document.getElementById('productCategoryId').value = product?.category?.id || product?.categoryId || '';
  document.getElementById('productIsActive').value = product ? String(product.isActive) : 'true';
  document.getElementById('productPurchasePrice').value = product?.purchasePrice || '';
  document.getElementById('productSellingPrice').value = product?.sellingPrice || '';
  document.getElementById('productMinStockLevel').value = product?.minStockLevel ?? 0;
  document.getElementById('productDescription').value = product?.description || '';
  document.getElementById('initialStockWrapper').style.display = product ? 'none' : '';
  productModal.show();
}

async function submitProductForm(e) {
  e.preventDefault();
  const id = document.getElementById('productId').value;
  const payload = {
    sku: document.getElementById('productSku').value.trim(),
    name: document.getElementById('productName').value.trim(),
    categoryId: document.getElementById('productCategoryId').value,
    purchasePrice: Number(document.getElementById('productPurchasePrice').value),
    sellingPrice: Number(document.getElementById('productSellingPrice').value),
    minStockLevel: Number(document.getElementById('productMinStockLevel').value || 0),
    description: document.getElementById('productDescription').value.trim() || null,
    isActive: document.getElementById('productIsActive').value === 'true',
  };
  if (!id) payload.initialStock = Number(document.getElementById('productInitialStock').value || 0);

  try {
    if (id) await Api.patch(`/api/v1/products/${id}`, payload);
    else await Api.post('/api/v1/products', payload);
    showToast('تم حفظ المنتج بنجاح.');
    productModal.hide();
    loadProducts(currentProductsPage);
  } catch (error) {
    showError(error);
  }
}

// ---------------- Categories ----------------
function renderCategoriesTable(items) {
  const tbody = document.getElementById('categoriesTableBody');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4">لا توجد أصناف بعد.</td></tr>`;
    return;
  }
  tbody.innerHTML = items
    .map(
      (c) => `
      <tr>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.description || '—')}</td>
        <td class="table-actions"><button class="btn btn-sm btn-outline-primary" data-edit-category="${c.id}" data-roles="ADMIN,INVENTORY_MANAGER">تعديل</button></td>
      </tr>`,
    )
    .join('');

  tbody.querySelectorAll('[data-edit-category]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = items.find((c) => c.id === btn.dataset.editCategory);
      document.getElementById('categoryId').value = cat.id;
      document.getElementById('categoryName').value = cat.name;
      document.getElementById('categoryDescription').value = cat.description || '';
      document.getElementById('categoryName').focus();
    });
  });
}

async function loadCategoriesTab() {
  try {
    const res = await Api.get('/api/v1/categories', { pageSize: 100 });
    renderCategoriesTable(res.data);
  } catch (error) {
    showError(error);
  }
}

async function submitCategoryForm(e) {
  e.preventDefault();
  const id = document.getElementById('categoryId').value;
  const payload = {
    name: document.getElementById('categoryName').value.trim(),
    description: document.getElementById('categoryDescription').value.trim() || null,
  };
  try {
    if (id) await Api.patch(`/api/v1/categories/${id}`, payload);
    else await Api.post('/api/v1/categories', payload);
    showToast('تم حفظ الصنف بنجاح.');
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
    await Promise.all([loadCategoriesTab(), loadCategoriesIntoDropdowns()]);
  } catch (error) {
    showError(error);
  }
}

// ---------------- Init ----------------
(async function init() {
  await initNavbar('products');

  productModal = new bootstrap.Modal(document.getElementById('productModal'));
  productFormEl = document.getElementById('productForm');

  await loadCategoriesIntoDropdowns();
  await loadProducts(1);
  await loadCategoriesTab();

  document.getElementById('addProductBtn').addEventListener('click', () => openProductModal(null));
  productFormEl.addEventListener('submit', submitProductForm);
  document.getElementById('categoryForm').addEventListener('submit', submitCategoryForm);

  document.getElementById('productSearch').addEventListener('input', debounce(() => loadProducts(1)));
  document.getElementById('productCategoryFilter').addEventListener('change', () => loadProducts(1));
  document.getElementById('lowStockFilter').addEventListener('change', () => loadProducts(1));
})();
