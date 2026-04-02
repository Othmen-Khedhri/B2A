/**
 * One-time script to create the first admin user.
 * Run with: npx ts-node scripts/createAdmin.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Expert from "../src/models/Expert";

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log("Connected to MongoDB");

  const existing = await Expert.findOne({ email: "admin@b2a.com" });
  if (existing) {
    console.log("Admin already exists. Aborting.");
    process.exit(0);
  }

  await Expert.create({
    name: "Admin B2A",
    email: "admin@b2a.com",
    password: "Admin1234!",   // <-- change this to whatever you want
    role: "admin",
    level: "Partner",
  });

  console.log("\n Admin created successfully!");
  console.log("   Email:    admin@b2a.com");
  console.log("   Password: Admin1234!\n");
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
