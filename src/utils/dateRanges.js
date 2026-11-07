/**
 * Resolves a named period (or a custom range) into concrete { from, to }
 * Date boundaries. All boundaries use the SERVER's local timezone
 * consistently across the whole app (documented assumption — see
 * docs/DATABASE.md once written in Phase 15).
 */
export function resolveDateRange(period = 'this_month', customFrom, customTo) {
  const now = new Date();

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (period) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };

    case 'this_week': {
      const day = now.getDay(); // 0 (Sun) - 6 (Sat)
      const start = new Date(now);
      start.setDate(now.getDate() - day);
      return { from: startOfDay(start), to: endOfDay(now) };
    }

    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfDay(start), to: endOfDay(now) };
    }

    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { from: startOfDay(start), to: endOfDay(now) };
    }

    case 'custom': {
      if (!customFrom || !customTo) {
        throw new Error('يجب تحديد تاريخ البداية والنهاية عند اختيار نطاق مخصص.');
      }
      return { from: startOfDay(new Date(customFrom)), to: endOfDay(new Date(customTo)) };
    }

    default:
      throw new Error(`فترة زمنية غير معروفة: ${period}`);
  }
}
