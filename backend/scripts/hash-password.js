import bcrypt from 'bcryptjs';
import { createInterface } from 'node:readline/promises';

// Usage: npm run hash-password   (prompts, so the password never lands in shell history)
const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question('Admin password: ');
rl.close();

if (password.length < 12) {
  console.error('Use at least 12 characters.');
  process.exit(1);
}
console.log(`\nADMIN_PASSWORD_HASH='${await bcrypt.hash(password, 12)}'`);
