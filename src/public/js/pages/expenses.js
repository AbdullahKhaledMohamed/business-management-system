let currentExpensesPage = 1;
let expenseModal, expenseFormEl;

function currentFilters() {
  return {
    category: document.getElementById('categoryFilter').value || undefined,
    search: document.getElementById('expenseSearch').value.trim() || undefined,
    dateFrom: document.getElementById('dateFromFilter').value || undefined,
    dateTo: document.getElementById('dateToFilter').value || undefined,
  };
}

function renderExpensesTable(items) {
  const tbody = document.getElementById('expensesTableBody');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">لا توجد مصروفات مطابقة.</td></tr>`;
    return;
  }
  tbody.innerHTML = items
    .map(
      (ex) => `
      <tr>
        <td>${escapeHtml(ex.category)}</td>
        <td>${escapeHtml(ex.description)}</td>
        <td>${formatMoney(ex.amount)}</td>
        <td>${formatDate(ex.expenseDate)}</td>
        <td class="table-actions"><button class="btn btn-sm btn-outline-primary" data-edit-expense="${ex.id}">تعديل</button></td>
      </tr>`,
    )
    .join('');

  tbody.querySelectorAll('[data-edit-expense]').forEach((btn) => {
    btn.addEventListener('click', () => openExpenseModal(items.find((ex) => ex.id === btn.dataset.editExpense)));
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

async function loadExpenses(page = 1) {
  currentExpensesPage = page;
  try {
    const [listRes, totalsRes] = await Promise.all([
      Api.get('/api/v1/expenses', { page, pageSize: 10, ...currentFilters() }),
      Api.get('/api/v1/expenses/totals', { dateFrom: currentFilters().dateFrom, dateTo: currentFilters().dateTo }),
    ]);
    renderExpensesTable(listRes.data);
    renderPagination(document.getElementById('expensesPagination'), listRes.meta, loadExpenses);
    document.getElementById('totalExpensesKpi').textContent = formatMoney(totalsRes.data.totalAmount);
  } catch (error) {
    showError(error);
  }
}

function openExpenseModal(expense) {
  expenseFormEl.reset();
  document.getElementById('expenseId').value = expense?.id || '';
  document.getElementById('expenseModalTitle').textContent = expense ? 'تعديل مصروف' : 'مصروف جديد';
  document.getElementById('expenseCategory').value = expense?.category || '';
  document.getElementById('expenseDescription').value = expense?.description || '';
  document.getElementById('expenseAmount').value = expense?.amount || '';
  document.getElementById('expenseDate').value = expense ? new Date(expense.expenseDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  document.getElementById('expenseNotes').value = expense?.notes || '';
  expenseModal.show();
}

async function submitExpenseForm(e) {
  e.preventDefault();
  const id = document.getElementById('expenseId').value;
  const payload = {
    category: document.getElementById('expenseCategory').value.trim(),
    description: document.getElementById('expenseDescription').value.trim(),
    amount: Number(document.getElementById('expenseAmount').value),
    expenseDate: document.getElementById('expenseDate').value,
    notes: document.getElementById('expenseNotes').value.trim() || null,
  };
  try {
    if (id) await Api.patch(`/api/v1/expenses/${id}`, payload);
    else await Api.post('/api/v1/expenses', payload);
    showToast('تم حفظ المصروف بنجاح.');
    expenseModal.hide();
    loadExpenses(currentExpensesPage);
  } catch (error) {
    showError(error);
  }
}

(async function init() {
  await initNavbar('expenses');

  expenseModal = new bootstrap.Modal(document.getElementById('expenseModal'));
  expenseFormEl = document.getElementById('expenseForm');

  const categoriesRes = await Api.get('/api/v1/expenses/categories');
  fillSelect(document.getElementById('categoryFilter'), categoriesRes.data.map((c) => ({ value: c.labelAr, label: c.labelAr })), 'كل التصنيفات');
  document.getElementById('expenseCategoryOptions').innerHTML = categoriesRes.data.map((c) => `<option value="${escapeHtml(c.labelAr)}">`).join('');

  await loadExpenses(1);

  document.getElementById('addExpenseBtn').addEventListener('click', () => openExpenseModal(null));
  expenseFormEl.addEventListener('submit', submitExpenseForm);
  document.getElementById('categoryFilter').addEventListener('change', () => loadExpenses(1));
  document.getElementById('expenseSearch').addEventListener('input', debounce(() => loadExpenses(1)));
  document.getElementById('dateFromFilter').addEventListener('change', () => loadExpenses(1));
  document.getElementById('dateToFilter').addEventListener('change', () => loadExpenses(1));
  document.getElementById('exportCsvBtn').addEventListener('click', () => {
    Api.downloadCsv('/api/v1/expenses/export/csv', currentFilters(), 'expenses.csv');
  });
})();
