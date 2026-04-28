/**
 * One-time script to delete all records from the estimationProjects collection.
 * Run with: npx ts-node scripts/clearEstimationProjects.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import EstimationProject from "../src/models/EstimationProject";

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log("Connected to MongoDB");

  const count = await EstimationProject.countDocuments();
  console.log(`Found ${count} records in estimationProjects.`);

  const result = await EstimationProject.deleteMany({});
  console.log(`Deleted ${result.deletedCount} records.`);

  await mongoose.disconnect();
  console.log("Done. Collection is now empty.");
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
