/**
 * fixEmailIndex.ts — Run once: npx ts-node scripts/fixEmailIndex.ts
 * Drops the old non-sparse email index so Mongoose recreates it with sparse:true.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function fix() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log("Connected.");

  const col = mongoose.connection.collection("users");

  try {
    await col.dropIndex("email_1");
    console.log("✅ Dropped old email_1 index.");
  } catch (e: unknown) {
    const msg = (e as Error).message ?? "";
    if (msg.includes("index not found")) console.log("ℹ️  Index not found — already dropped.");
    else throw e;
  }

  // Mongoose will recreate it as sparse on next connect
  await mongoose.disconnect();
  console.log("Done. Now re-run: npx ts-node scripts/seedStaff.ts");
}

fix().catch((err) => { console.error(err); process.exit(1); });
