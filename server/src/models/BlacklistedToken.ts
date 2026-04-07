import mongoose, { Document, Schema } from "mongoose";

export interface IBlacklistedToken extends Document {
  token: string;
  expiresAt: Date;
}

const BlacklistedTokenSchema = new Schema<IBlacklistedToken>({
  token:     { type: String, required: true, unique: true },
  expiresAt: { type: Date,   required: true },
});

// MongoDB deletes the document automatically once expiresAt is reached
BlacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IBlacklistedToken>("BlacklistedToken", BlacklistedTokenSchema);
