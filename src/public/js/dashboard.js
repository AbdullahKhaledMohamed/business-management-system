const roleLabels = {
  ADMIN: 'مدير النظام',
  ACCOUNTANT: 'محاسب',
  INVENTORY_MANAGER: 'مسؤول مخزون',
};

async function loadUser() {
  try {
    const res = await fetch('/api/v1/auth/me', { credentials: 'include' });
    if (res.status === 401) {
      window.location.href = '/login.html';
      return;
    }
    const result = await res.json();
    const user = result.data;

    document.getElementById('userLabel').textContent = `مرحبًا، ${user.fullName}`;
    document.getElementById('userInfoTable').innerHTML = `
      <tr><th class="w-25">الاسم الكامل</th><td>${user.fullName}</td></tr>
      <tr><th>اسم المستخدم</th><td>${user.username}</td></tr>
      <tr><th>الدور</th><td><span class="badge bg-primary">${roleLabels[user.role] || user.role}</span></td></tr>
      <tr><th>حالة الحساب</th><td>${user.isActive ? '<span class="badge bg-success">مفعّل</span>' : '<span class="badge bg-secondary">غير مفعّل</span>'}</td></tr>
    `;
  } catch (error) {
    document.getElementById('userInfoTable').innerHTML =
      '<tr><td class="text-danger">تعذر تحميل بيانات المستخدم.</td></tr>';
  }
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
  window.location.href = '/login.html';
});

loadUser();
