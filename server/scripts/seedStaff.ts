/**
 * seedStaff.ts  — Run: npx ts-node scripts/seedStaff.ts
 * Inserts all 13 B2A staff members with full HR data.
 * Skips records that already exist (matched by email or name for workers).
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Expert from "../src/models/Expert";

dotenv.config();

const DEFAULT_PASSWORD = "B2A2026!";

interface StaffSeed {
  name: string;
  email?: string;
  role: "admin" | "manager" | "collaborator" | "worker";
  level: "Junior" | "Mid" | "Senior" | "Partner";
  academicLevel: string;
  specializations: string[];
  // Personal
  cin?: string;
  cnss?: string;
  gender: string;
  dateOfBirth?: string;   // ISO date string
  placeOfBirth?: string;
  address?: string;
  civilStatus?: string;
  children?: number;
  // Contract
  hireDate?: string;
  contractType?: string;
  contractEndDate?: string;
  department?: string;
  positionCategory?: string;
  expStartDate?: string;
}

const staff: StaffSeed[] = [
  {
    name: "Dorsaf Ncibi",
    email: "assistance@b2a.com.tn",
    role: "collaborator",
    level: "Mid",
    academicLevel: "Master Prof en Réseaux Informatiques et Télécommunication",
    specializations: ["Assistante Administrative", "Support Opérations"],
    cin: "14205694",
    cnss: "17223740-04",
    gender: "Female",
    dateOfBirth: "1991-10-11",
    placeOfBirth: "Sidi Bouzid",
    address: "29 Rue Elmelaha Dar Fadhal Soukra",
    civilStatus: "Mariée",
    children: 2,
    hireDate: "2020-12-01",
    contractType: "CDI",
    department: "Administration générale",
    positionCategory: "B. Support",
    expStartDate: "2020-12-01",
  },
  {
    name: "Sana Flija",
    email: "sanab2a@b2a.com.tn",
    role: "manager",
    level: "Senior",
    academicLevel: "Maîtrise en Comptabilité",
    specializations: ["Comptable Manager"],
    cin: "06860505",
    cnss: "16118118-01",
    gender: "Female",
    dateOfBirth: "1983-02-14",
    placeOfBirth: "Sahline",
    address: "Avenue 1934 Carthage Salambo 20-25",
    civilStatus: "Mariée",
    children: 1,
    hireDate: "2019-05-01",
    contractType: "CDI",
    department: "Comptabilité",
    positionCategory: "Prod Mgt",
    expStartDate: "2011-05-01",
  },
  {
    name: "Saida Shili",
    // No email — external contractor
    role: "worker",
    level: "Mid",
    academicLevel: "Maîtrise en Comptabilité",
    specializations: ["Comptable Externe", "Sous-traitance"],
    cin: "04783087",
    gender: "Female",
    address: "103 Avenue 20 Mars Le Bardo Tunis",
    civilStatus: "Mariée",
    children: 2,
    hireDate: "2022-01-01",
    contractType: "Sous-traitance",
    department: "Administration générale",
    positionCategory: "B. Support",
  },
  {
    name: "Saoussen Maaoini",
    email: "compta5@b2a.com.tn",
    role: "collaborator",
    level: "Junior",
    academicLevel: "Master Prof en Comptabilité et Fiscalité",
    specializations: ["Auditeur Comptable Junior"],
    cin: "10013573",
    gender: "Female",
    dateOfBirth: "1997-07-02",
    placeOfBirth: "Tunis",
    address: "City Tadhamon Ariana",
    civilStatus: "Mariée",
    children: 0,
    hireDate: "2024-10-01",
    contractType: "CIVP 2",
    contractEndDate: "2025-09-09",
    department: "Comptabilité",
    positionCategory: "Prod Team",
    expStartDate: "2023-06-01",
  },
  {
    name: "Mohamed Nabil Ounaies",
    email: "mohamed-nabil-ounaies@b2a.com.tn",
    role: "collaborator",
    level: "Senior",
    academicLevel: "Maîtrise en Commerce",
    specializations: ["Comptable Senior"],
    cin: "04718541",
    cnss: "12893183-03",
    gender: "Male",
    dateOfBirth: "1983-09-13",
    placeOfBirth: "Tunis",
    address: "Rue de la Faculté Immeuble Hannibal A21 Cité Ennasser",
    civilStatus: "Marié",
    children: 2,
    hireDate: "2020-11-01",
    contractType: "CDI",
    department: "Comptabilité",
    positionCategory: "Prod Mgt",
    expStartDate: "2020-11-01",
  },
  {
    name: "Samia Trabelsi",
    // No email — support worker
    role: "worker",
    level: "Junior",
    academicLevel: "Secondaire",
    specializations: ["Femme de ménage"],
    cin: "04781367",
    gender: "Female",
    dateOfBirth: "1973-09-14",
    placeOfBirth: "Tunis",
    address: "Denden El Agba",
    civilStatus: "Mariée",
    children: 2,
    hireDate: "2024-07-01",
    contractType: "CDI",
    department: "Administration générale",
    positionCategory: "B. Support",
  },
  {
    name: "Fatma Ben Moussa",
    email: "comptable3@b2a.com.tn",
    role: "collaborator",
    level: "Senior",
    academicLevel: "Licence en Économie Gestion",
    specializations: ["Comptable Senior"],
    cin: "4835963",
    cnss: "17404549-03",
    gender: "Female",
    dateOfBirth: "1991-12-31",
    placeOfBirth: "Tunis",
    address: "Morneg Ben Arous",
    civilStatus: "Mariée",
    children: 0,
    hireDate: "2025-05-01",
    contractType: "CDI",
    department: "Comptabilité",
    positionCategory: "Prod Team",
    expStartDate: "2019-02-01",
  },
  {
    name: "Linda Louati",
    email: "comptable4@b2a.com.tn",
    role: "collaborator",
    level: "Junior",
    academicLevel: "BTP en Comptabilité",
    specializations: ["Assistante Comptable"],
    cin: "13033761",
    gender: "Female",
    dateOfBirth: "2002-07-11",
    placeOfBirth: "Tunis",
    address: "31 Rue 4338 Zahrouni Tunis",
    civilStatus: "Célibataire",
    children: 0,
    hireDate: "2025-07-01",
    contractType: "CAIP",
    department: "Comptabilité",
    positionCategory: "Prod Team",
    expStartDate: "2025-07-01",
  },
  {
    name: "Mohamed Missaoui",
    // No email — support worker
    role: "worker",
    level: "Junior",
    academicLevel: "Secondaire",
    specializations: ["Coursier"],
    cin: "8706443",
    cnss: "16123018-02",
    gender: "Male",
    dateOfBirth: "1986-04-15",
    placeOfBirth: "Tunis",
    address: "04 Rue Jektis Dar Fadhal Soukra",
    civilStatus: "Célibataire",
    children: 0,
    hireDate: "2021-12-01",
    contractType: "CDI",
    department: "Administration générale",
    positionCategory: "B. Support",
    expStartDate: "2021-12-01",
  },
  {
    name: "Bouthaina Trabelsi",
    email: "comptable6@b2a.com.tn",
    role: "collaborator",
    level: "Senior",
    academicLevel: "Technicien Supérieur en Comptabilité et Finance",
    specializations: ["Comptable Senior"],
    cin: "9517901",
    cnss: "17315241-02",
    gender: "Female",
    dateOfBirth: "1994-06-02",
    placeOfBirth: "Tunis",
    address: "10 Rue Tarek Ibn Zied Manouba",
    civilStatus: "Célibataire",
    children: 0,
    hireDate: "2025-04-01",
    contractType: "CDI",
    department: "Comptabilité",
    positionCategory: "Prod Team",
    expStartDate: "2018-04-01",
  },
  {
    name: "Malek Ghorbel",
    email: "comptable1@b2a.com.tn",
    role: "collaborator",
    level: "Senior",
    academicLevel: "Master Prof en Comptabilité Audit Contrôle",
    specializations: ["Comptable Senior"],
    cin: "13256135",
    cnss: "17670365-00",
    gender: "Male",
    dateOfBirth: "1995-06-05",
    placeOfBirth: "Gabès",
    address: "21 Rue Abed Rahmen Mami Borj Louzir Ariana",
    civilStatus: "Célibataire",
    children: 0,
    hireDate: "2025-04-01",
    contractType: "CDI",
    department: "Comptabilité",
    positionCategory: "Prod Team",
    expStartDate: "2021-02-01",
  },
  {
    name: "Oumaima Zaibi",
    email: "comptable2@b2a.com.tn",
    role: "collaborator",
    level: "Junior",
    academicLevel: "Master Pro en Management de la Performance et RSO",
    specializations: ["Auditeur Junior"],
    cin: "13013583",
    cnss: "17768079-09",
    gender: "Female",
    dateOfBirth: "1997-02-22",
    placeOfBirth: "Tunis",
    address: "5 Rue Kito Bardo",
    civilStatus: "Célibataire",
    children: 0,
    hireDate: "2025-07-01",
    contractType: "CDI",
    department: "Audit",
    positionCategory: "Prod Team",
    expStartDate: "2022-02-01",
  },
  {
    name: "Mohamed Ali Baatout",
    email: "consultant1@b2a.com.tn",
    role: "manager",
    level: "Senior",
    academicLevel: "Baccalauréat en Lettres et Arts",
    specializations: ["Responsable Customer Care"],
    cin: "05450699",
    cnss: "1613255700",
    gender: "Male",
    dateOfBirth: "1985-03-26",
    placeOfBirth: "Tunis",
    address: "Rue Mohamed 5 Lekram",
    civilStatus: "Marié",
    children: 2,
    hireDate: "2025-11-17",
    contractType: "CDI",
    department: "Service client",
    positionCategory: "Prod Team",
    expStartDate: "2010-01-01",
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log("MongoDB connected.\n");

  let inserted = 0;
  let skipped = 0;

  for (const s of staff) {
    const query = s.email
      ? { email: s.email.toLowerCase() }
      : { name: s.name };

    const exists = await Expert.findOne(query);
    if (exists) {
      console.log(`⏭  Skipped  (already exists): ${s.name}`);
      skipped++;
      continue;
    }

    const doc: Record<string, unknown> = {
      name: s.name,
      role: s.role,
      level: s.level,
      academicLevel: s.academicLevel,
      specializations: s.specializations,
      // Personal
      cin:          s.cin          ?? "",
      cnss:         s.cnss         ?? "",
      gender:       s.gender       ?? "",
      placeOfBirth: s.placeOfBirth ?? "",
      address:      s.address      ?? "",
      civilStatus:  s.civilStatus  ?? "",
      children:     s.children     ?? 0,
      // Contract
      contractType:     s.contractType     ?? "",
      department:       s.department       ?? "",
      positionCategory: s.positionCategory ?? "",
    };

    if (s.email)           { doc.email    = s.email.toLowerCase(); doc.password = DEFAULT_PASSWORD; }
    if (s.dateOfBirth)     doc.dateOfBirth     = new Date(s.dateOfBirth);
    if (s.hireDate)        doc.hireDate        = new Date(s.hireDate);
    if (s.contractEndDate) doc.contractEndDate = new Date(s.contractEndDate);
    if (s.expStartDate)    doc.expStartDate    = new Date(s.expStartDate);

    await Expert.create(doc);
    console.log(`✅ Inserted: ${s.name} (${s.role} / ${s.level})`);
    inserted++;
  }

  console.log(`\nDone — ${inserted} inserted, ${skipped} skipped.`);
  if (inserted > 0) console.log(`Default password for new accounts: "${DEFAULT_PASSWORD}"`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
