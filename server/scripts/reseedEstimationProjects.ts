/**
 * Clears estimationProjects and seeds 864 realistic records.
 * Coverage: 12 mission types × 12 sectors × 6 complexity variants each.
 * Hours, costs, margins, and overruns are derived from the same logic
 * used in preprocessing.py so the ML models train on meaningful variance.
 *
 * Run with:  npx ts-node scripts/reseedEstimationProjects.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import EstimationProject from "../src/models/EstimationProject";

// ── Constants (mirrors preprocessing.py categories) ──────────────────────────

const TYPES = [
  "Assistance juridique",
  "Audit interne",
  "Audit légal",
  "Commissariat aux apports",
  "Comptabilité générale",
  "Conseil en organisation",
  "Conseil fiscal",
  "Consolidation",
  "Due diligence",
  "Formation",
  "Paie & RH",
  "Révision comptable",
];

const SECTORS = [
  "Agriculture & Agroalimentaire",
  "Association & ONG",
  "Banque & Finance",
  "Commerce & Distribution",
  "Conseil & Audit",
  "Éducation & Formation",
  "Immobilier",
  "Industrie",
  "Santé",
  "Services",
  "Technologie & IT",
  "Transport & Logistique",
];

// 35 complexity slots per (type × sector) → 35 × 144 = 5040 total records
// Distribution: 23% Faible, 34% Moyenne, 29% Élevée, 14% Critique
const COMPLEXITY_SLOTS: Array<"Faible" | "Moyenne" | "Élevée" | "Critique"> = [
  "Faible",   "Faible",   "Faible",   "Faible",   "Faible",   "Faible",   "Faible",   "Faible",
  "Moyenne",  "Moyenne",  "Moyenne",  "Moyenne",  "Moyenne",  "Moyenne",  "Moyenne",
  "Moyenne",  "Moyenne",  "Moyenne",  "Moyenne",  "Moyenne",
  "Élevée",   "Élevée",   "Élevée",   "Élevée",   "Élevée",   "Élevée",   "Élevée",
  "Élevée",   "Élevée",   "Élevée",
  "Critique", "Critique", "Critique", "Critique", "Critique",
];

// Budgeted hours range by complexity
const H_BUDGET_RANGE = {
  Faible:   [20,  80],
  Moyenne:  [80,  250],
  Élevée:   [250, 600],
  Critique: [600, 1800],
} as const;

// Overrun probability by complexity
const OVERRUN_PROB = { Faible: 0.12, Moyenne: 0.28, Élevée: 0.42, Critique: 0.60 };

// Overrun magnitude when over-budget
const OVERRUN_RANGE = { Faible: [0.05, 0.20], Moyenne: [0.08, 0.30], Élevée: [0.12, 0.40], Critique: [0.15, 0.50] } as const;

// Hours saved when under-budget (fraction of hBudget actually used)
const UNDERRUN_RANGE = { Faible: [0.75, 0.98], Moyenne: [0.70, 0.97], Élevée: [0.65, 0.95], Critique: [0.60, 0.92] } as const;

// Mission type multiplier on hours (more documentation-heavy = higher)
const TYPE_MULT: Record<string, number> = {
  "Audit légal":             1.50,
  "Due diligence":           1.40,
  "Consolidation":           1.30,
  "Conseil en organisation": 1.25,
  "Audit interne":           1.20,
  "Révision comptable":      1.05,
  "Conseil fiscal":          1.00,
  "Commissariat aux apports":0.90,
  "Comptabilité générale":   0.80,
  "Assistance juridique":    0.70,
  "Paie & RH":               0.65,
  "Formation":               0.55,
};

// Sector multiplier on hours (regulatory burden / structural complexity)
const SECTOR_MULT: Record<string, number> = {
  "Banque & Finance":           1.35,
  "Industrie":                  1.20,
  "Technologie & IT":           1.15,
  "Transport & Logistique":     1.10,
  "Santé":                      1.05,
  "Commerce & Distribution":    1.00,
  "Services":                   1.00,
  "Immobilier":                 0.95,
  "Conseil & Audit":            0.90,
  "Agriculture & Agroalimentaire": 0.85,
  "Éducation & Formation":      0.80,
  "Association & ONG":          0.75,
};

// Weighted average hourly COST (TND) paid to staff — by complexity
const HOURLY_COST_RANGE = {
  Faible:   [29, 37],   // junior-heavy
  Moyenne:  [37, 46],   // junior + mid
  Élevée:   [44, 57],   // senior-heavy
  Critique: [54, 70],   // manager-led
} as const;

// Billing markup over cost (budgetHT / coutReel target) — by sector
const BILLING_MULT: Record<string, [number, number]> = {
  "Banque & Finance":           [1.35, 1.55],
  "Technologie & IT":           [1.30, 1.50],
  "Industrie":                  [1.28, 1.45],
  "Transport & Logistique":     [1.22, 1.40],
  "Santé":                      [1.20, 1.38],
  "Commerce & Distribution":    [1.18, 1.35],
  "Services":                   [1.15, 1.32],
  "Immobilier":                 [1.12, 1.30],
  "Conseil & Audit":            [1.10, 1.28],
  "Agriculture & Agroalimentaire": [1.05, 1.22],
  "Éducation & Formation":      [1.00, 1.18],
  "Association & ONG":          [0.85, 1.05],
};

// Lead collaborator names (real B2A staff)
const COLLABS = [
  "Dorsaf Ncibi", "Sana Flija", "Saida Shili", "Saoussen Maaoini",
  "Mohamed Nabil Ounaies", "Samia Trabelsi", "Fatma Ben Moussa",
  "Linda Louati", "Mohamed Missaoui", "Bouthaina Trabelsi",
  "Malek Ghorbel", "Oumaima Zaibi", "Mohamed Ali Baatout",
];

// Realistic Tunisian client names
const CLIENTS = [
  "Société Tunisienne d'Audit & Conseil", "STEG Régionale Sfax", "Banque de l'Habitat Tunis",
  "Poulina Group Holding", "Groupe Délice Danone", "Monoprix Tunisie SA",
  "Orange Tunisie SARL", "Tunisie Telecom SPA", "Attijari Bank Tunis",
  "Vermeg Technologies", "Hexabyte SARL", "Telnet Holding SA",
  "Société Les Ciments d'Enfidha", "SOTUVER SA", "Tunisair Technics",
  "Lesieur Cristal Tunisie", "Biat Capital Invest", "UIB Leasing",
  "Assurances STAR SA", "GAT Assurances", "Wifak International Bank",
  "Clinique El Manar Tunis", "Groupe Caducée Santé", "Polyclinique Bizerte",
  "Université Centrale Privée", "Institut Supérieur IHEC Sousse",
  "Lycée Pilote de l'Ariana", "Agri-Bio Manouba SARL", "Oliviers du Sud SA",
  "Société Horticole Nabeul", "Marjane Holding Tunisie", "Carrefour Lac Tunis",
  "Bricorama Tunisie SA", "Huilerie Sfax Export", "SOTRAPIL SA",
  "Transtu Transports Urbains", "Tunisie Autoroutes SA", "Port de Radès SPA",
  "Résidence Yasmine Hammamet", "Immo-Invest Sousse", "Carthage Estate SA",
  "Cabinet Aziz & Associés", "Fiduciaire Ben Salah", "KPMG Tunisie",
  "Association Tunisienne des Droits", "ONG Jeunes & Avenir", "Fondation Temimi",
  "Médicaments Sans Frontières TN", "Institut Arabe des Chefs d'Entreprises",
  "Fédération Tunisienne de Football", "Tunisian Business Angels Network",
  "Groupe Elloumi Industries", "Coficab Group SA", "Leoni Wiring Systems",
  "Yazaki Tunisie SARL", "Kromberg & Schubert TN", "Valeo Tunisie SA",
  "Société Magasin Général", "Electrostar SA", "Stafim Peugeot Tunisie",
  "Tunisie Lait SA", "Société SOTUMAG SA", "Plastimed SARL",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.round(rand(min, max));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Random ISO date between two years */
function randDate(yearMin: number, yearMax: number): Date {
  const start = new Date(yearMin, 0, 1).getTime();
  const end   = new Date(yearMax, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start));
}

// ── Record generator ──────────────────────────────────────────────────────────

function generateRecord(
  type: string,
  sector: string,
  complexity: "Faible" | "Moyenne" | "Élevée" | "Critique",
  index: number,
) {
  const [hMin, hMax] = H_BUDGET_RANGE[complexity];
  const typeMult   = TYPE_MULT[type]   ?? 1.0;
  const sectorMult = SECTOR_MULT[sector] ?? 1.0;

  // Budgeted hours — apply multipliers then add 5–15% noise
  const baseHBudget = rand(hMin, hMax) * typeMult * sectorMult;
  const hBudget     = Math.max(8, Math.round(baseHBudget * rand(0.90, 1.12)));

  // Decide if over-budget
  const isOverBudget = Math.random() < OVERRUN_PROB[complexity];

  let hReal: number;
  if (isOverBudget) {
    const [oMin, oMax] = OVERRUN_RANGE[complexity];
    hReal = Math.round(hBudget * (1 + rand(oMin, oMax)));
  } else {
    const [uMin, uMax] = UNDERRUN_RANGE[complexity];
    hReal = Math.round(hBudget * rand(uMin, uMax));
  }

  // Hourly cost
  const [cMin, cMax] = HOURLY_COST_RANGE[complexity];
  const hourlyRate   = rand(cMin, cMax);

  const coutReel = round2(hReal * hourlyRate);

  // Billing markup
  const [bMin, bMax] = BILLING_MULT[sector] ?? [1.15, 1.35];
  let   billingMult  = rand(bMin, bMax);

  // Overbudget projects often cannot fully bill the overrun → compress billing
  if (isOverBudget) billingMult *= rand(0.75, 0.95);

  const budgetHT = round2(hBudget * hourlyRate * billingMult);
  const marge    = round2(budgetHT - coutReel);
  const rentPct  = round2(budgetHT > 0 ? (marge / budgetHT) * 100 : 0);

  return {
    client:          pick(CLIENTS),
    type,
    sector,
    complexity,
    hBudget,
    hReal,
    coutReel,
    budgetHT,
    marge,
    rentPct,
    overBudget:      isOverBudget,
    collabPrincipal: pick(COLLABS),
    source:          "upload" as const,
    createdAt:       randDate(2021, 2025),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log("✅  Connected to MongoDB");

  // 1 — Delete old records
  const deleted = await EstimationProject.deleteMany({});
  console.log(`🗑️   Deleted ${deleted.deletedCount} old records`);

  // 2 — Generate 5040 records: 12 types × 12 sectors × 35 complexity slots
  const records: ReturnType<typeof generateRecord>[] = [];

  let i = 0;
  for (const type of TYPES) {
    for (const sector of SECTORS) {
      for (const complexity of COMPLEXITY_SLOTS) {
        records.push(generateRecord(type, sector, complexity, i++));
      }
    }
  }

  // 3 — Insert in bulk
  await EstimationProject.insertMany(records, { ordered: false });

  // 4 — Summary
  const total = await EstimationProject.countDocuments();

  const byComplexity = await EstimationProject.aggregate([
    { $group: { _id: "$complexity", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const overBudgetCount = await EstimationProject.countDocuments({ overBudget: true });
  const pctOver = ((overBudgetCount / total) * 100).toFixed(1);

  console.log(`\n✅  Seeded ${total} records`);
  console.log("\nComplexity distribution:");
  for (const row of byComplexity) {
    console.log(`  ${row._id.padEnd(10)} ${row.count}`);
  }
  console.log(`\nOver-budget: ${overBudgetCount} / ${total} (${pctOver}%)`);
  console.log("\n⚠️  Run POST /retrain to rebuild the ML models on the new data.");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
