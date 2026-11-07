const CURRENCY = 'EGP';

const roleLabels = {
  ADMIN: 'مدير النظام',
  ACCOUNTANT: 'محاسب',
  INVENTORY_MANAGER: 'مسؤول مخزون',
};

const statusLabels = {
  DRAFT: 'مسودة',
  CONFIRMED: 'مؤكدة',
  PARTIALLY_PAID: 'مدفوعة جزئيًا',
  PAID: 'مدفوعة بالكامل',
  CANCELED: 'ملغاة',
};

const statusBadgeClass = {
  DRAFT: 'bg-secondary',
  CONFIRMED: 'bg-primary',
  PARTIALLY_PAID: 'bg-warning text-dark',
  PAID: 'bg-success',
  CANCELED: 'bg-danger',
};

function formatMoney(amount) {
  const n = Number(amount || 0);
  return `${n.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${CURRENCY}`;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Toast notification (success/error), reuses a single container appended to body. */
function showToast(message, variant = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed top-0 start-50 translate-middle-x p-3';
    container.style.zIndex = 1080;
    document.body.appendChild(container);
  }

  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center text-white bg-${variant === 'error' ? 'danger' : 'success'} border-0`;
  toastEl.setAttribute('role', 'alert');
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${escapeHtml(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  container.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
  toast.show();
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

function showError(error) {
  const message = error?.message || 'حدث خطأ غير متوقع.';
  showToast(message, 'error');
}

/** Simple confirmation modal (replaces window.confirm for a consistent look). */
function confirmAction(message) {
  return new Promise((resolve) => {
    let modalEl = document.getElementById('confirmModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'confirmModal';
      modalEl.className = 'modal fade';
      modalEl.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-body py-4" id="confirmModalMessage"></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="confirmModalCancel">إلغاء</button>
              <button type="button" class="btn btn-danger" id="confirmModalOk">تأكيد</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modalEl);
    }
    document.getElementById('confirmModalMessage').textContent = message;
    const modal = new bootstrap.Modal(modalEl);
    const okBtn = document.getElementById('confirmModalOk');

    const cleanup = (result) => {
      okBtn.removeEventListener('click', onOk);
      modal.hide();
      resolve(result);
    };
    const onOk = () => cleanup(true);
    okBtn.addEventListener('click', onOk);
    modalEl.addEventListener('hidden.bs.modal', () => resolve(false), { once: true });
    modal.show();
  });
}

/** Renders the shared top navbar with the current user's name/role + logout. */
async function initNavbar(activePage) {
  document.querySelectorAll('.nav-link[data-page]').forEach((link) => {
    if (link.dataset.page === activePage) link.classList.add('active');
  });

  try {
    const res = await Api.get('/api/v1/auth/me');
    const user = res.data;
    const label = document.getElementById('userLabel');
    if (label) label.textContent = `${user.fullName} (${roleLabels[user.role] || user.role})`;

    // Hide nav items this role shouldn't see.
    const role = user.role;
    document.querySelectorAll('[data-roles]').forEach((el) => {
      const allowed = el.dataset.roles.split(',');
      if (!allowed.includes(role)) el.remove();
    });
  } catch (error) {
    // initNavbar runs on every page; Api.get already redirects to /login.html on 401.
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await Api.post('/api/v1/auth/logout');
      window.location.href = '/login.html';
    });
  }
}

/** Fills a <select> with <option> elements from an array of {value,label}. */
function fillSelect(selectEl, options, placeholder) {
  selectEl.innerHTML = '';
  if (placeholder) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholder;
    selectEl.appendChild(opt);
  }
  options.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    selectEl.appendChild(opt);
  });
}

function debounce(fn, wait = 400) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
