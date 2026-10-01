import { db } from './src/db/index';
import { users } from './src/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function run() {
  const adminHash = await bcrypt.hash('Admin@Niruvi2026!', 10);
  const devHash = await bcrypt.hash('Dev@Niruvi2026!', 10);
  
  await db.insert(users).values([
    {
      id: 'usr_admin_001',
      email: 'admin@niruvi.store',
      username: 'niruvi_admin',
      passwordHash: adminHash,
      displayName: 'System Admin',
      role: 'ADMIN',
      emailVerified: true
    },
    {
      id: 'usr_dev_001',
      email: 'dev@niruvi.store',
      username: 'linux_craft',
      passwordHash: devHash,
      displayName: 'Linux Craft',
      role: 'DEVELOPER',
      emailVerified: true
    }
  ]).onConflictDoNothing();
  
  console.log('Force seeded admin & dev');
  process.exit(0);
}
run();
