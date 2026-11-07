/**
 * Thin fetch wrapper shared by every page.
 * - Always sends/receives JSON with credentials (session cookie).
 * - Redirects to login on 401.
 * - Throws an Error with a user-facing Arabic message on failure.
 */
const Api = (() => {
  async function request(path, { method = 'GET', body, params } = {}) {
    let url = path;
    if (params) {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
      ).toString();
      if (qs) url += `?${qs}`;
    }

    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      window.location.href = '/login.html';
      throw new Error('الجلسة منتهية، يرجى تسجيل الدخول مرة أخرى.');
    }

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const message = isJson ? payload?.error?.message || 'حدث خطأ غير متوقع.' : 'حدث خطأ غير متوقع.';
      const error = new Error(message);
      error.details = isJson ? payload?.error?.details : undefined;
      error.status = res.status;
      throw error;
    }

    return payload;
  }

  return {
    get: (path, params) => request(path, { method: 'GET', params }),
    post: (path, body) => request(path, { method: 'POST', body }),
    patch: (path, body) => request(path, { method: 'PATCH', body }),
    del: (path) => request(path, { method: 'DELETE' }),
    downloadCsv: (path, params, filename) => {
      let url = path;
      if (params) {
        const qs = new URLSearchParams(
          Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
        ).toString();
        if (qs) url += `?${qs}`;
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || '';
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
  };
})();
