const bcrypt = require('bcryptjs');
const db = require('./db');
require('dotenv').config();

const users = [
  { name: 'Demo User', email: 'user@example.com', password: 'Password123!', role: 'user' },
  { name: 'Demo Admin', email: 'admin@example.com', password: 'Password123!', role: 'admin' },
  { name: 'Demo Staff', email: 'staff@example.com', password: 'Password123!', role: 'internal_staff' }
];

const upsertUser = async (user) => {
  const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [user.email]);
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(user.password, salt);

  if (existing.length > 0) {
    await db.query(
      'UPDATE users SET name = ?, password_hash = ?, role = ? WHERE email = ?',
      [user.name, hashed, user.role, user.email]
    );
    return { email: user.email, action: 'updated' };
  }

  await db.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [user.name, user.email, hashed, user.role]
  );
  return { email: user.email, action: 'created' };
};

const run = async () => {
  try {
    const results = [];
    for (const user of users) {
      results.push(await upsertUser(user));
    }
    console.log('Seed complete:', results);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
};

run();
