/**
 * resetPassword.js — Reset one or all user passwords
 *
 * Usage:
 *   Reset a specific user:   node scripts/resetPassword.js --email user@example.com --password NewPass@123
 *   Reset all users:         node scripts/resetPassword.js --all --password NewPass@123
 *   List all users:          node scripts/resetPassword.js --list
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const MONGO = process.env.MONGO_URI;
if (!MONGO) { console.error('MONGO_URI not set in .env'); process.exit(1); }

const ExpertSchema = new mongoose.Schema({
  name:     String,
  email:    String,
  password: { type: String, select: false },
  role:     String,
}, { timestamps: true });

const Expert = mongoose.model('Expert', ExpertSchema, 'users');

function parseArgs() {
  const args = process.argv.slice(2);
  const get  = flag => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
  return {
    email:    get('--email'),
    password: get('--password'),
    all:      args.includes('--all'),
    list:     args.includes('--list'),
  };
}

async function main() {
  const { email, password, all, list } = parseArgs();

  await mongoose.connect(MONGO);
  console.log('✓ MongoDB connected\n');

  if (list) {
    const users = await Expert.find({}, 'name email role').lean();
    console.log('Users in database:\n');
    users.forEach(u => console.log(`  [${u.role}]  ${u.email || '(no email)'}  —  ${u.name}`));
    console.log(`\nTotal: ${users.length}`);
    await mongoose.disconnect();
    return;
  }

  if (!password) {
    console.error('Error: --password is required.\n');
    console.error('Examples:');
    console.error('  node scripts/resetPassword.js --email user@example.com --password NewPass@123');
    console.error('  node scripts/resetPassword.js --all --password NewPass@123');
    console.error('  node scripts/resetPassword.js --list');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  if (all) {
    const result = await Expert.updateMany({}, { password: hash });
    console.log(`✓ Password reset for ${result.modifiedCount} users.`);
  } else if (email) {
    const user = await Expert.findOneAndUpdate(
      { email },
      { password: hash },
      { new: true }
    );
    if (!user) {
      console.error(`✗ No user found with email: ${email}`);
      process.exit(1);
    }
    console.log(`✓ Password reset for: ${user.name} (${user.email})`);
  } else {
    console.error('Error: provide --email <email> or --all.\n');
    process.exit(1);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
