// ─── BlacklistedToken model ───────────────────────────────────────────────────
// Stores JWT refresh tokens that have been explicitly invalidated (logged out).
// Since JWTs are stateless (the server can't revoke them by default), this
// collection acts as a "deny list" — the auth middleware checks it on every
// refresh request and rejects any token found here.
//
// Auto-cleanup via TTL:
//   The expiresAt field is the token's own expiry timestamp (same value as the
//   JWT "exp" claim). The TTL index with expireAfterSeconds:0 means MongoDB
//   deletes the document at exactly the expiresAt time — no sooner, no later.
//   This ensures the blacklist never grows indefinitely.
//
// Why not JWT payload approach:
//   We store the full token string (not just jti/sub) because the refresh token
//   is opaque from the client's perspective — storing the full string is simpler
//   and sufficient for a small-scale system.

import mongoose, { Document, Schema } from "mongoose";

export interface IBlacklistedToken extends Document {
  token:     string; // the full JWT refresh token string
  expiresAt: Date;   // when the JWT expires — MongoDB deletes the doc at this time
}

const BlacklistedTokenSchema = new Schema<IBlacklistedToken>({
  token:     { type: String, required: true, unique: true },
  expiresAt: { type: Date,   required: true },
});

// TTL index on expiresAt with expireAfterSeconds:0 means MongoDB deletes documents
// exactly when expiresAt is reached (within the TTL task's 60-second resolution).
BlacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IBlacklistedToken>("BlacklistedToken", BlacklistedTokenSchema);
