let currentCustomersPage = 1;
let customerModal, customerFormEl;

function renderCustomersTable(items) {
  const tbody = document.getElementById('customersTableBody');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">لا يوجد عملاء مطابقون.</td></tr>`;
    return;
  }
  tbody.innerHTML = items
    .map(
      (c) => `
      <tr>
        <td><a href="#" data-view-customer="${c.id}">${escapeHtml(c.name)}</a></td>
        <td>${escapeHtml(c.phone || '—')}</td>
        <td>${escapeHtml(c.email || '—')}</td>
        <td>${c.outstandingBalance !== undefined ? formatMoney(c.outstandingBalance) : '—'}</td>
        <td class="table-actions"><button class="btn btn-sm btn-outline-primary" data-edit-customer="${c.id}">تعديل</button></td>
      </tr>`,
    )
    .join('');

  tbody.querySelectorAll('[data-edit-customer]').forEach((btn) => {
    btn.addEventListener('click', () => openCustomerModal(items.find((c) => c.id === btn.dataset.editCustomer)));
  });
  tbody.querySelectorAll('[data-view-customer]').forEach((link) => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const detail = await Api.get(`/api/v1/customers/${link.dataset.viewCustomer}`);
      openCustomerModal(detail.data);
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

async function loadCustomers(page = 1) {
  currentCustomersPage = page;
  try {
    const res = await Api.get('/api/v1/customers', {
      page,
      pageSize: 10,
      search: document.getElementById('customerSearch').value.trim() || undefined,
    });
    // Outstanding balance isn't on the list endpoint (kept cheap); fetch per-row only when needed via the view link.
    renderCustomersTable(res.data);
    renderPagination(document.getElementById('customersPagination'), res.meta, loadCustomers);
  } catch (error) {
    showError(error);
  }
}

function openCustomerModal(customer) {
  customerFormEl.reset();
  document.getElementById('customerId').value = customer?.id || '';
  document.getElementById('customerModalTitle').textContent = customer ? 'تعديل بيانات العميل' : 'عميل جديد';
  document.getElementById('customerName').value = customer?.name || '';
  document.getElementById('customerPhone').value = customer?.phone || '';
  document.getElementById('customerEmail').value = customer?.email || '';
  document.getElementById('customerAddress').value = customer?.address || '';
  customerModal.show();
}

async function submitCustomerForm(e) {
  e.preventDefault();
  const id = document.getElementById('customerId').value;
  const payload = {
    name: document.getElementById('customerName').value.trim(),
    phone: document.getElementById('customerPhone').value.trim() || null,
    email: document.getElementById('customerEmail').value.trim() || '',
    address: document.getElementById('customerAddress').value.trim() || null,
  };
  try {
    if (id) await Api.patch(`/api/v1/customers/${id}`, payload);
    else await Api.post('/api/v1/customers', payload);
    showToast('تم حفظ بيانات العميل بنجاح.');
    customerModal.hide();
    loadCustomers(currentCustomersPage);
  } catch (error) {
    showError(error);
  }
}

(async function init() {
  await initNavbar('customers');

  customerModal = new bootstrap.Modal(document.getElementById('customerModal'));
  customerFormEl = document.getElementById('customerForm');

  await loadCustomers(1);

  document.getElementById('addCustomerBtn').addEventListener('click', () => openCustomerModal(null));
  customerFormEl.addEventListener('submit', submitCustomerForm);
  document.getElementById('customerSearch').addEventListener('input', debounce(() => loadCustomers(1)));
})();
