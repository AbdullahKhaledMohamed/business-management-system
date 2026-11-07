import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 12);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      fullName: 'مدير النظام',
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ تم إنشاء/تأكيد مستخدم الأدمن:');
  console.log(`   اسم المستخدم: ${admin.username}`);
  console.log('   كلمة المرور: Admin@12345');
  console.log('   ⚠️  غيّر كلمة المرور فورًا بعد أول تسجيل دخول في بيئة الإنتاج.');
}

main()
  .catch((error) => {
    console.error('❌ فشل تنفيذ Seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
