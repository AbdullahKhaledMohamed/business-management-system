import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    username: z
      .string({ required_error: 'اسم المستخدم مطلوب' })
      .trim()
      .min(3, 'اسم المستخدم يجب ألا يقل عن 3 أحرف')
      .max(100),
    password: z
      .string({ required_error: 'كلمة المرور مطلوبة' })
      .min(6, 'كلمة المرور يجب ألا تقل عن 6 أحرف')
      .max(200),
  }),
});
