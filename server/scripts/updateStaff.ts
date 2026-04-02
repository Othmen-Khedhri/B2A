/**
 * updateStaff.ts — Run: npx ts-node scripts/updateStaff.ts
 *
 * 1. Sets coutHoraire on all existing staff
 * 2. Fixes Dorsaf Ncibi → role: admin
 * 3. Inserts 6 missing staff members (archived collaborators)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Expert from "../src/models/Expert";

dotenv.config();

// ── Hourly rates for existing staff ───────────────────────────────────────
const rates: { name: string; coutHoraire: number; role?: string }[] = [
  { name: "Dorsaf Ncibi",             coutHoraire: 0,  role: "admin" },
  { name: "Sana Flija",               coutHoraire: 25 },
  { name: "Mohamed Nabil Ounaies",    coutHoraire: 25 },
  { name: "Saoussen Maaoini",         coutHoraire: 15 },
  { name: "Fatma Ben Moussa",         coutHoraire: 20 },
  { name: "Bouthaina Trabelsi",       coutHoraire: 20 },
  { name: "Malek Ghorbel",            coutHoraire: 20 },
  { name: "Oumaima Zaibi",            coutHoraire: 20 },
  { name: "Linda Louati",             coutHoraire: 10 },
  { name: "Saida Shili",              coutHoraire: 15 },
  { name: "Samia Trabelsi",           coutHoraire: 0  },
  { name: "Mohamed Missaoui",         coutHoraire: 0  },
  { name: "Mohamed Ali Baatout",      coutHoraire: 0  },
];

// ── New staff to insert ────────────────────────────────────────────────────
interface NewStaff {
  name: string;
  role: "collaborator" | "worker";
  level: "Junior" | "Mid" | "Senior" | "Partner";
  coutHoraire: number;
  department: string;
  specializations: string[];
  academicLevel: string;
}

const newStaff: NewStaff[] = [
  {
    name: "Khawla Zairi",
    role: "collaborator",
    level: "Junior",
    coutHoraire: 10,
    department: "Comptabilité",
    specializations: ["Comptable"],
    academicLevel: "",
  },
  {
    name: "Nour Hamed",
    role: "collaborator",
    level: "Junior",
    coutHoraire: 10,
    department: "Comptabilité",
    specializations: ["Comptable"],
    academicLevel: "",
  },
  {
    name: "Fatma Cherni",
    role: "collaborator",
    level: "Mid",
    coutHoraire: 15,
    department: "Comptabilité",
    specializations: ["Comptable"],
    academicLevel: "",
  },
  {
    name: "Ghalia Arfaoui",
    role: "collaborator",
    level: "Junior",
    coutHoraire: 10,
    department: "Comptabilité",
    specializations: ["Comptable"],
    academicLevel: "",
  },
  {
    name: "Ameni Krawa",
    role: "collaborator",
    level: "Junior",
    coutHoraire: 10,
    department: "Comptabilité",
    specializations: ["Comptable"],
    academicLevel: "",
  },
  {
    name: "Nour Youssfi",
    role: "collaborator",
    level: "Junior",
    coutHoraire: 10,
    department: "Comptabilité",
    specializations: ["Comptable"],
    academicLevel: "",
  },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log("MongoDB connected.\n");

  // ── Step 1: Update existing staff ──
  console.log("── Updating existing staff ──");
  for (const r of rates) {
    const update: Record<string, unknown> = { coutHoraire: r.coutHoraire };
    if (r.role) update.role = r.role;
    const res = await Expert.updateOne({ name: r.name }, { $set: update });
    if (res.matchedCount === 0) {
      console.log(`  ⚠  Not found: ${r.name}`);
    } else {
      const tag = r.role ? ` → role: ${r.role}` : "";
      console.log(`  ✅ Updated: ${r.name} — ${r.coutHoraire} DT/h${tag}`);
    }
  }

  // ── Step 2: Insert missing staff ──
  console.log("\n── Inserting missing staff ──");
  for (const s of newStaff) {
    const exists = await Expert.findOne({ name: s.name });
    if (exists) {
      console.log(`  ⏭  Already exists: ${s.name}`);
      continue;
    }
    await Expert.create(s);
    console.log(`  ✅ Inserted: ${s.name} — ${s.coutHoraire} DT/h`);
  }

  console.log("\nDone.");
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
