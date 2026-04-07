import mongoose, { Document, Schema } from "mongoose";

export interface ILoginAttempt extends Document {
  email: string;
  count: number;
  lockedUntil: Date | null;
  updatedAt: Date;
}

const LoginAttemptSchema = new Schema<ILoginAttempt>({
  email:       { type: String, required: true, unique: true, lowercase: true },
  count:       { type: Number, default: 1 },
  lockedUntil: { type: Date,   default: null },
  updatedAt:   { type: Date,   default: Date.now },
});

// TTL is anchored to updatedAt — slides 15 min forward on every failed attempt
LoginAttemptSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 15 * 60 });

export default mongoose.model<ILoginAttempt>("LoginAttempt", LoginAttemptSchema);
