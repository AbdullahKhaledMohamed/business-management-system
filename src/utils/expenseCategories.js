/**
 * Default/suggested expense categories. The `category` field on Expense
 * remains a free-text string in the database (configurable business
 * terminology varies), but the frontend dropdown (Phase 9) will be
 * seeded from this list, and this endpoint lets it grow without a migration.
 */
export const DEFAULT_EXPENSE_CATEGORIES = [
  { key: 'SALARIES', labelAr: 'رواتب' },
  { key: 'RENT', labelAr: 'إيجار' },
  { key: 'UTILITIES', labelAr: 'مرافق (كهرباء/مياه/إنترنت)' },
  { key: 'RAW_MATERIALS', labelAr: 'مواد خام' },
  { key: 'TRANSPORTATION', labelAr: 'نقل ومواصلات' },
  { key: 'MAINTENANCE', labelAr: 'صيانة' },
  { key: 'OTHER', labelAr: 'مصروفات أخرى' },
];
