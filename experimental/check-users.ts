// EXPERIMENTAL — Not part of the production static build.
import { db } from '../src/db/index';
import { users } from '../src/db/schema';
async function run() {
  const allUsers = await db.select().from(users);
  console.log('Users in DB:');
  console.log(allUsers.map(u => ({ email: u.email, role: u.role })));
  process.exit(0);
}
run();
