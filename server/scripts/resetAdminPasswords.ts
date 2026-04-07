/**
 * resetAdminPasswords.ts
 *
 * 1. Lists all admin accounts so you can verify the emails
 * 2. Clears any rate-limit locks
 * 3. Sets a fresh bcrypt password directly (bypasses pre-save hook)
 * 4. Verifies the new password works before exiting
 *
 * Usage:
 *   cd server
 *   npx ts-node scripts/resetAdminPasswords.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Expert from "../src/models/Expert";
import LoginAttempt from "../src/models/LoginAttempt";

// ── CONFIGURE THESE ────────────────────────────────────────────────────────
// Leave email blank ("") to target by name instead
const RESETS = [
  { nameContains: "cyrine",  newPassword: "Cyrine2026!" },
  { nameContains: "dorsaf",  newPassword: "Dorsaf2026!" },
];
// ──────────────────────────────────────────────────────────────────────────

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error("❌  MONGO_URI not set in .env"); process.exit(1); }

  await mongoose.connect(uri);
  console.log("✓  Connected to MongoDB\n");

  // ── Step 1: List all admins ──────────────────────────────────────────────
  const allAdmins = await Expert.find({ role: "admin" }).select("name email role");
  console.log("=== All admin accounts in DB ===");
  allAdmins.forEach((a) =>
    console.log(`  • ${a.name.padEnd(25)} email: ${a.email || "(none)"}`)
  );
  console.log("");

  // ── Step 2: Reset each target ────────────────────────────────────────────
  for (const { nameContains, newPassword } of RESETS) {
    const regex = new RegExp(nameContains, "i");
    const expert = await Expert.findOne({ name: regex }).select("+password");

    if (!expert) {
      console.log(`✗  No account found matching name "${nameContains}"`);
      continue;
    }

    console.log(`▶  Processing: ${expert.name} (${expert.email})`);

    // Clear rate-limit lock
    const del = await LoginAttempt.deleteOne({ email: expert.email?.toLowerCase() });
    if (del.deletedCount) console.log(`   ✓ Rate-limit lock cleared`);

    // Check current password state
    if (!expert.password) {
      console.log(`   ⚠  Password field is EMPTY in DB — will set fresh password`);
    } else {
      console.log(`   ✓ Password field exists (length ${expert.password.length})`);
    }

    // Hash once and write directly — bypasses pre-save hook entirely
    const salt   = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(newPassword, salt);

    await Expert.updateOne({ _id: expert._id }, { $set: { password: hashed } });
    console.log(`   ✓ Password updated in DB`);

    // Verify it actually works
    const fresh = await Expert.findById(expert._id).select("+password");
    const ok    = fresh?.password ? await bcrypt.compare(newPassword, fresh.password) : false;
    console.log(`   ${ok ? "✓ Verification PASSED" : "✗ Verification FAILED — something is wrong"}\n`);

    if (ok) {
      console.log(`   → ${expert.name} can now log in with:`);
      console.log(`     Email:    ${expert.email}`);
      console.log(`     Password: ${newPassword}\n`);
    }
  }

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch((err) => { console.error(err); process.exit(1); });
