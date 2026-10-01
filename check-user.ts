import { db } from './src/db/index';
import { users } from './src/db/schema';
import { eq } from 'drizzle-orm';
async function run() {
  const u = await db.select().from(users).where(eq(users.email, 'putinservai@gmail.com'));
  console.log(u.map(x => ({ email: x.email, hasHash: !!x.passwordHash, firebaseUid: x.firebaseUid })));
  process.exit(0);
}
run();
