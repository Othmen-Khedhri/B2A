// ─── LoginAttempt model ───────────────────────────────────────────────────────
// Tracks failed login attempts per email address to enforce account lockout.
// When count reaches MAX_LOGIN_ATTEMPTS (5), lockedUntil is set to now + 15min
// and the account is temporarily blocked.
//
// Auto-cleanup via sliding TTL:
//   The TTL index is on updatedAt (not createdAt) with expireAfterSeconds = 15 min.
//   Every failed attempt resets updatedAt to now — this slides the expiry window
//   forward. A successful login or 15 minutes of inactivity cleans the record.
//
//   Sliding TTL means: an attacker who keeps trying every 14 minutes would keep
//   the record alive. Once they stop, it expires 15 minutes later.
//
// Used exclusively by authController.ts:
//   - Incremented on every failed login attempt
//   - Checked on every login to enforce the lockout window
//   - Deleted on successful login

import mongoose, { Document, Schema } from "mongoose";

export interface ILoginAttempt extends Document {
  email:       string;       // lowercase email being targeted
  count:       number;       // failed attempts since last reset
  lockedUntil: Date | null;  // null = not locked; Date = locked until this time
  updatedAt:   Date;         // reset on every write (drives the sliding TTL)
}

const LoginAttemptSchema = new Schema<ILoginAttempt>({
  email:       { type: String, required: true, unique: true, lowercase: true },
  count:       { type: Number, default: 1 },
  lockedUntil: { type: Date,   default: null },
  updatedAt:   { type: Date,   default: Date.now },
});

// Sliding TTL: document expires 15 minutes after the last write to updatedAt.
// "Sliding" because updatedAt is refreshed on every upsert, pushing expiry forward.
// expireAfterSeconds:15*60 = 900 seconds = 15 minutes.
LoginAttemptSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 15 * 60 });

export default mongoose.model<ILoginAttempt>("LoginAttempt", LoginAttemptSchema);
