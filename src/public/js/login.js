document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('loginForm');
const alertBox = document.getElementById('alertBox');
const submitBtn = document.getElementById('submitBtn');
const submitText = document.getElementById('submitText');
const submitSpinner = document.getElementById('submitSpinner');
const togglePasswordBtn = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

togglePasswordBtn.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  togglePasswordBtn.textContent = isHidden ? 'إخفاء' : 'إظهار';
});

function showError(message) {
  alertBox.textContent = message;
  alertBox.classList.remove('d-none');
}

function hideError() {
  alertBox.classList.add('d-none');
  alertBox.textContent = '';
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitText.classList.toggle('d-none', isLoading);
  submitSpinner.classList.toggle('d-none', !isLoading);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideError();

  if (!form.checkValidity()) {
    event.stopPropagation();
    form.classList.add('was-validated');
    return;
  }

  const username = document.getElementById('username').value.trim();
  const password = passwordInput.value;

  setLoading(true);

  try {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      showError(result?.error?.message || 'حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.');
      setLoading(false);
      return;
    }

    // تسجيل الدخول نجح — التوجيه للوحة التحكم (ستُبنى في Phase 9)
    window.location.href = '/dashboard.html';
  } catch (error) {
    showError('تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.');
    setLoading(false);
  }
});
