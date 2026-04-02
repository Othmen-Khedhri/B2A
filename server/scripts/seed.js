/**
 * seed.js — Full MongoDB seeder from BD_Pilotage_Cabinet_2025 (2).xlsx
 * Run: node scripts/seed.js
 *
 * Populates: users (collaborateurs), clients, projects, timeEntries, conges
 * Uses upsert on all collections — safe to re-run.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const XLSX     = require('xlsx');
const bcrypt   = require('bcryptjs');
const path     = require('path');

const EXCEL = path.join(__dirname, '../../client/src/assets/BD_Pilotage_Cabinet_2025 (2).xlsx');
const MONGO = process.env.MONGO_URI;

// ── Minimal inline schemas (mirrors the real models exactly) ─────────────────

const ExpertSchema = new mongoose.Schema({
  name: String, email: String, password: { type: String, select: false },
  role: { type: String, default: 'collaborator' },
  level: { type: String, default: 'Junior' },
  coutHoraire: { type: Number, default: 0 },
  currentLoad: { type: Number, default: 0 },
  totalHours:  { type: Number, default: 0 },
  burnoutFlags: { flagged: { type: Boolean, default: false }, reasons: [String] },
  externalId: String,   // C01, C02 …
  manager: String,
}, { timestamps: true });

const ClientSchema = new mongoose.Schema({
  name: String, sector: String, siret: String,
  formeJuridique: String, pays: String,
  segment: String, etat: String, externalId: String,
}, { timestamps: true });

const ProjectSchema = new mongoose.Schema({
  externalId: String,       // PRJ-0001 …
  codeSage: String,
  name: String,             // client — type mission as display name
  clientName: String,
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  type: String,
  manager: String,
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expert' },
  startDate: Date, endDate: Date,
  status: { type: String, default: 'active' },
  budgetHours: Number, budgetCost: Number,
  hoursConsumed: Number, costConsumed: Number,
  marge: Number, marginPercent: Number,
  overBudget: Boolean,
  sector: String, complexity: String,
  assignedStaff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Expert' }],
  paceIndexHours: { type: Number, default: 0 },
  paceIndexCost:  { type: Number, default: 0 },
  grossMargin:    { type: Number, default: 0 },
  effectiveCostPerHour: { type: Number, default: 0 },
  responsiblePartnerName: String,
  invoicedAmount: { type: Number, default: 0 },
  alertsSent: [],
}, { timestamps: true });

const TimeEntrySchema = new mongoose.Schema({
  externalId: String,      // TS-000001 …
  expertId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Expert' },
  expertName: String,
  projectId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  projectName: String,
  date: Date,
  periode: String,         // 2025-01
  mois: Number, annee: Number,
  heuresTheorique: Number,
  hours: Number,           // heuresSaisies
  heuresFacturables: Number,
  tauxHoraire: Number,
  coutTND: Number,
  tsRempli: Boolean, tsValide: Boolean,
  anomalie: String,
  validationStatus: { type: String, default: 'validated' },
}, { timestamps: true });

const Expert  = mongoose.model('Expert',    ExpertSchema,    'users');
const Client  = mongoose.model('Client',    ClientSchema,    'clients');
const Project = mongoose.model('Project',   ProjectSchema,   'projects');
const TS      = mongoose.model('TimeEntry', TimeEntrySchema, 'timeEntries');

const CongeSchema = new mongoose.Schema({
  expertId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Expert', required: true },
  expertName: { type: String, required: true },
  dateStart:  { type: Date, required: true },
  dateEnd:    { type: Date, required: true },
  type:       { type: String, default: 'Annuel' },
  days:       { type: Number, required: true },
  approved:   { type: Boolean, default: true },
}, { timestamps: true });
const Conge = mongoose.model('Conge', CongeSchema, 'conges');

// ── Helpers ──────────────────────────────────────────────────────────────────

const toNum = v => Number(v) || 0;

const excelDateToJS = v => {
  if (v instanceof Date) return v;
  if (typeof v === 'number') {
    const d = new Date((v - 25569) * 86400 * 1000);
    return d;
  }
  return new Date(v);
};

const statusMap = { 'En cours': 'active', 'Terminé': 'completed', 'En attente': 'on-hold' };
const levelMap  = { 'Junior': 'Junior', 'Senior': 'Senior', 'Manager': 'Senior' };  // Manager → Senior level

// ── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGO);
  console.log('✓ MongoDB connected');

  const wb = XLSX.readFile(EXCEL);

  // ── 1. COLLABORATEURS ───────────────────────────────────────────────────────
  console.log('\n── Seeding collaborateurs …');
  const collabRows = XLSX.utils.sheet_to_json(wb.Sheets['2_Collaborateurs'], { header: 1, defval: '' }).slice(2);
  const expertMap  = {};  // externalId → ObjectId

  const defaultHash = await bcrypt.hash('B2A@2025!', 12);

  for (const r of collabRows) {
    const externalId = String(r[0]).trim();  // C01
    const name       = String(r[1]).trim();
    const manager    = String(r[2]).trim();
    const niveau     = String(r[3]).trim();
    const tjm        = toNum(r[4]);
    const tauxH      = toNum(r[6]);
    const email      = String(r[7]).trim();

    const doc = await Expert.findOneAndUpdate(
      { externalId },
      {
        externalId, name, email,
        password: defaultHash,
        role: niveau === 'Manager' ? 'manager' : 'collaborator',
        level: levelMap[niveau] || 'Junior',
        coutHoraire: tauxH,
        manager,
        burnoutFlags: { flagged: false, reasons: [] },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    expertMap[externalId] = doc._id;
    expertMap[name]       = doc._id;  // also index by name
    process.stdout.write(`  ${externalId} ${name}\n`);
  }
  console.log(`✓ ${collabRows.length} collaborateurs upserted`);

  // ── 2. CLIENTS ──────────────────────────────────────────────────────────────
  console.log('\n── Seeding clients …');
  const clientRows = XLSX.utils.sheet_to_json(wb.Sheets['1_Clients'], { header: 1, defval: '' }).slice(2);
  const clientMap  = {};  // name → ObjectId

  for (const r of clientRows) {
    const name           = String(r[0]).trim();
    const siret          = String(r[1]).trim();
    const formeJuridique = String(r[2]).trim();
    const pays           = String(r[3]).trim();
    const etat           = String(r[5]).trim();
    const segment        = String(r[6]).trim();
    const sector         = String(r[7]).trim();

    const doc = await Client.findOneAndUpdate(
      { name },
      { name, siret, formeJuridique, pays, etat, segment, sector, externalId: name },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    clientMap[name] = doc._id;
  }
  console.log(`✓ ${clientRows.length} clients upserted`);

  // ── 3. PROJECTS ─────────────────────────────────────────────────────────────
  console.log('\n── Seeding projects …');
  const projRows = XLSX.utils.sheet_to_json(wb.Sheets['3_Projets'], { header: 1, defval: '' }).slice(2);
  const projectMap = {};  // externalId → ObjectId

  for (const r of projRows) {
    const externalId  = String(r[0]).trim();   // PRJ-0001
    const codeSage    = String(r[1]).trim();
    const clientName  = String(r[2]).trim();
    const type        = String(r[3]).trim();
    const managerName = String(r[4]).trim();
    const startDate   = excelDateToJS(r[5]);
    const endDate     = excelDateToJS(r[6]);
    const statusRaw   = String(r[7]).trim();
    const budgetHT    = toNum(r[8]);
    const hBudget     = toNum(r[9]);
    const hReal       = toNum(r[10]);
    const coutReel    = toNum(r[11]);
    const marge       = toNum(r[12]);
    const rentPct     = toNum(r[13]);
    const overBudget  = r[14] === 'OUI';
    const sector      = String(r[15]).trim();
    const complexity  = String(r[16]).trim();
    const collabPrincipalId = String(r[17]).trim();  // C08

    const status = statusMap[statusRaw] || 'active';
    const paceIndexHours = hBudget > 0 ? hReal / hBudget : 0;

    const assignedIds = [];
    if (expertMap[collabPrincipalId]) assignedIds.push(expertMap[collabPrincipalId]);

    const doc = await Project.findOneAndUpdate(
      { externalId },
      {
        externalId, codeSage,
        name: `${clientName} — ${type}`,
        clientName,
        clientId: clientMap[clientName] || null,
        type, manager: managerName,
        managerId: expertMap[managerName] || null,
        startDate, endDate, status,
        budgetHours: hBudget, budgetCost: budgetHT,
        hoursConsumed: hReal, costConsumed: coutReel,
        marge, marginPercent: rentPct,
        grossMargin: marge,
        overBudget, sector, complexity,
        assignedStaff: assignedIds,
        paceIndexHours,
        responsiblePartnerName: managerName,
        effectiveCostPerHour: hReal > 0 ? coutReel / hReal : 0,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    projectMap[externalId] = doc._id;
  }
  console.log(`✓ ${projRows.length} projects upserted`);

  // ── 4. TIME ENTRIES ─────────────────────────────────────────────────────────
  console.log('\n── Seeding time entries (4140 rows) …');
  const tsRows = XLSX.utils.sheet_to_json(wb.Sheets['4_TimeSheets'], { header: 1, defval: '' }).slice(2);

  // Clear existing time entries to avoid duplicates on re-run
  await TS.deleteMany({});
  console.log('  Cleared existing timeEntries');

  const BATCH = 200;
  let inserted = 0, skipped = 0;
  const docs = [];

  for (const r of tsRows) {
    const externalId  = String(r[0]).trim();   // TS-000001
    const projId      = String(r[1]).trim();   // PRJ-0001
    const collabId    = String(r[2]).trim();   // C08
    const collabName  = String(r[3]).trim();
    const mois        = toNum(r[5]);
    const annee       = toNum(r[6]);
    const periode     = String(r[7]).trim();   // 2025-01
    const hTheo       = toNum(r[8]);
    const hSaisies    = toNum(r[9]);
    const hFact       = toNum(r[10]);
    const tauxH       = toNum(r[11]);
    const coutTND     = toNum(r[12]);
    const tsRempli    = r[13] === 'OUI';
    const tsValide    = r[14] === 'OUI';
    const anomalie    = String(r[15]).trim();

    if (!projectMap[projId] || !expertMap[collabId]) {
      skipped++;
      continue;
    }

    docs.push({
      externalId,
      expertId:   expertMap[collabId],
      expertName: collabName,
      projectId:  projectMap[projId],
      projectName: projId,
      date: new Date(`${annee}-${String(mois).padStart(2,'0')}-01`),
      periode, mois, annee,
      heuresTheorique: hTheo,
      hours: hSaisies,
      heuresFacturables: hFact,
      tauxHoraire: tauxH,
      coutTND,
      tsRempli, tsValide,
      anomalie: anomalie || 'OK',
      validationStatus: tsValide ? 'validated' : 'pending',
    });

    if (docs.length >= BATCH) {
      await TS.insertMany(docs);
      inserted += docs.length;
      docs.length = 0;
      process.stdout.write(`  ${inserted} / ${tsRows.length}\r`);
    }
  }
  if (docs.length > 0) {
    await TS.insertMany(docs);
    inserted += docs.length;
  }

  console.log(`\n✓ ${inserted} time entries inserted (${skipped} skipped — missing project/collab ref)`);

  // ── 5. Update expert workload from timesheets ────────────────────────────────
  console.log('\n── Updating expert workload …');
  const tsAgg = await TS.aggregate([
    { $group: { _id: '$expertId', totalHours: { $sum: '$hours' }, totalFact: { $sum: '$heuresFacturables' } } }
  ]);
  for (const agg of tsAgg) {
    await Expert.findByIdAndUpdate(agg._id, {
      totalHours: agg.totalHours,
      currentLoad: Math.round(agg.totalFact / 12),  // avg monthly billable
    });
  }
  console.log(`✓ ${tsAgg.length} expert workloads updated`);

  // ── 6. Update project hours consumed from timesheets ────────────────────────
  console.log('\n── Recalculating project pace indexes …');
  const projAgg = await TS.aggregate([
    { $group: { _id: '$projectId', totalHours: { $sum: '$hours' }, totalCost: { $sum: '$coutTND' } } }
  ]);
  for (const agg of projAgg) {
    const p = await Project.findById(agg._id);
    if (!p) continue;
    const paceIndexHours = p.budgetHours > 0 ? agg.totalHours / p.budgetHours : 0;
    const paceIndexCost  = p.budgetCost  > 0 ? agg.totalCost  / p.budgetCost  : 0;
    await Project.findByIdAndUpdate(agg._id, {
      hoursConsumed: agg.totalHours,
      costConsumed:  agg.totalCost,
      paceIndexHours,
      paceIndexCost,
      effectiveCostPerHour: agg.totalHours > 0 ? agg.totalCost / agg.totalHours : 0,
    });
  }
  console.log(`✓ ${projAgg.length} project pace indexes updated`);

  // ── 7. CONGÉS ───────────────────────────────────────────────────────────────
  console.log('\n── Seeding congés …');
  await Conge.deleteMany({});

  // Realistic 2025 leave entries — 18 days annual + occasional sick/exceptional
  // Tunisian labour law: 18 working days paid annual leave per year
  const congeRaw = [
    // Bouthaina Trabelsi
    { name: 'Bouthaina Trabelsi',    ds: '2025-01-06', de: '2025-01-10', type: 'Annuel',      days: 5  },
    { name: 'Bouthaina Trabelsi',    ds: '2025-04-21', de: '2025-04-25', type: 'Annuel',      days: 5  },
    { name: 'Bouthaina Trabelsi',    ds: '2025-07-14', de: '2025-07-25', type: 'Annuel',      days: 8  },
    { name: 'Bouthaina Trabelsi',    ds: '2025-03-10', de: '2025-03-11', type: 'Maladie',     days: 2  },
    // CYRINE BEN MLOUKA
    { name: 'CYRINE BEN MLOUKA',     ds: '2025-02-17', de: '2025-02-21', type: 'Annuel',      days: 5  },
    { name: 'CYRINE BEN MLOUKA',     ds: '2025-06-02', de: '2025-06-06', type: 'Annuel',      days: 5  },
    { name: 'CYRINE BEN MLOUKA',     ds: '2025-08-11', de: '2025-08-22', type: 'Annuel',      days: 8  },
    { name: 'CYRINE BEN MLOUKA',     ds: '2025-11-03', de: '2025-11-05', type: 'Exceptionnel',days: 3  },
    // Fatma Ben Moussa
    { name: 'Fatma Ben Moussa',      ds: '2025-01-20', de: '2025-01-24', type: 'Annuel',      days: 5  },
    { name: 'Fatma Ben Moussa',      ds: '2025-05-05', de: '2025-05-09', type: 'Annuel',      days: 5  },
    { name: 'Fatma Ben Moussa',      ds: '2025-08-04', de: '2025-08-15', type: 'Annuel',      days: 8  },
    { name: 'Fatma Ben Moussa',      ds: '2025-09-22', de: '2025-09-23', type: 'Maladie',     days: 2  },
    // Ghalia Arfaoui
    { name: 'Ghalia Arfaoui',        ds: '2025-03-03', de: '2025-03-07', type: 'Annuel',      days: 5  },
    { name: 'Ghalia Arfaoui',        ds: '2025-07-07', de: '2025-07-18', type: 'Annuel',      days: 8  },
    { name: 'Ghalia Arfaoui',        ds: '2025-10-06', de: '2025-10-10', type: 'Annuel',      days: 5  },
    { name: 'Ghalia Arfaoui',        ds: '2025-05-14', de: '2025-05-14', type: 'Maladie',     days: 1  },
    // Hela Hammami
    { name: 'Hela Hammami',          ds: '2025-04-07', de: '2025-04-11', type: 'Annuel',      days: 5  },
    { name: 'Hela Hammami',          ds: '2025-07-28', de: '2025-08-08', type: 'Annuel',      days: 8  },
    { name: 'Hela Hammami',          ds: '2025-11-17', de: '2025-11-21', type: 'Annuel',      days: 5  },
    { name: 'Hela Hammami',          ds: '2025-02-05', de: '2025-02-06', type: 'Maladie',     days: 2  },
    // Linda Louati
    { name: 'Linda Louati',          ds: '2025-01-13', de: '2025-01-17', type: 'Annuel',      days: 5  },
    { name: 'Linda Louati',          ds: '2025-06-16', de: '2025-06-20', type: 'Annuel',      days: 5  },
    { name: 'Linda Louati',          ds: '2025-08-18', de: '2025-08-29', type: 'Annuel',      days: 8  },
    { name: 'Linda Louati',          ds: '2025-04-02', de: '2025-04-02', type: 'Exceptionnel',days: 1  },
    // MOHAMED NABIL OUNAIES
    { name: 'MOHAMED NABIL OUNAIES', ds: '2025-02-24', de: '2025-02-28', type: 'Annuel',      days: 5  },
    { name: 'MOHAMED NABIL OUNAIES', ds: '2025-07-21', de: '2025-08-01', type: 'Annuel',      days: 8  },
    { name: 'MOHAMED NABIL OUNAIES', ds: '2025-12-22', de: '2025-12-31', type: 'Annuel',      days: 5  },
    { name: 'MOHAMED NABIL OUNAIES', ds: '2025-10-13', de: '2025-10-15', type: 'Exceptionnel',days: 3, approved: false },
    // Malek Ghorbel
    { name: 'Malek Ghorbel',         ds: '2025-03-17', de: '2025-03-21', type: 'Annuel',      days: 5  },
    { name: 'Malek Ghorbel',         ds: '2025-06-23', de: '2025-07-04', type: 'Annuel',      days: 8  },
    { name: 'Malek Ghorbel',         ds: '2025-09-15', de: '2025-09-19', type: 'Annuel',      days: 5  },
    { name: 'Malek Ghorbel',         ds: '2025-11-10', de: '2025-11-11', type: 'Maladie',     days: 2  },
    // Mohamed Ali BAATOUT
    { name: 'Mohamed Ali BAATOUT',   ds: '2025-01-27', de: '2025-01-31', type: 'Annuel',      days: 5  },
    { name: 'Mohamed Ali BAATOUT',   ds: '2025-05-19', de: '2025-05-23', type: 'Annuel',      days: 5  },
    { name: 'Mohamed Ali BAATOUT',   ds: '2025-08-25', de: '2025-09-05', type: 'Annuel',      days: 8  },
    { name: 'Mohamed Ali BAATOUT',   ds: '2025-12-01', de: '2025-12-01', type: 'Maladie',     days: 1  },
    // Mohamed FERJANI
    { name: 'Mohamed FERJANI',       ds: '2025-04-14', de: '2025-04-18', type: 'Annuel',      days: 5  },
    { name: 'Mohamed FERJANI',       ds: '2025-07-14', de: '2025-07-25', type: 'Annuel',      days: 8  },
    { name: 'Mohamed FERJANI',       ds: '2025-10-20', de: '2025-10-24', type: 'Annuel',      days: 5  },
    { name: 'Mohamed FERJANI',       ds: '2025-06-09', de: '2025-06-10', type: 'Maladie',     days: 2  },
    // Nour Hamed
    { name: 'Nour Hamed',            ds: '2025-02-10', de: '2025-02-14', type: 'Annuel',      days: 5  },
    { name: 'Nour Hamed',            ds: '2025-06-30', de: '2025-07-11', type: 'Annuel',      days: 8  },
    { name: 'Nour Hamed',            ds: '2025-11-24', de: '2025-11-28', type: 'Annuel',      days: 5  },
    { name: 'Nour Hamed',            ds: '2025-09-08', de: '2025-09-09', type: 'Maladie',     days: 2  },
    // Oumayma Zaibi
    { name: 'Oumayma Zaibi',         ds: '2025-03-24', de: '2025-03-28', type: 'Annuel',      days: 5  },
    { name: 'Oumayma Zaibi',         ds: '2025-07-07', de: '2025-07-18', type: 'Annuel',      days: 8  },
    { name: 'Oumayma Zaibi',         ds: '2025-10-27', de: '2025-10-31', type: 'Annuel',      days: 5  },
    // SANA FLIJA
    { name: 'SANA FLIJA',            ds: '2025-01-27', de: '2025-01-31', type: 'Annuel',      days: 5  },
    { name: 'SANA FLIJA',            ds: '2025-06-09', de: '2025-06-20', type: 'Annuel',      days: 8  },
    { name: 'SANA FLIJA',            ds: '2025-09-22', de: '2025-09-26', type: 'Annuel',      days: 5  },
    { name: 'SANA FLIJA',            ds: '2025-04-28', de: '2025-04-29', type: 'Exceptionnel',days: 2  },
    // Saoussen Maaoini
    { name: 'Saoussen Maaoini',      ds: '2025-02-03', de: '2025-02-07', type: 'Annuel',      days: 5  },
    { name: 'Saoussen Maaoini',      ds: '2025-05-26', de: '2025-06-06', type: 'Annuel',      days: 8  },
    { name: 'Saoussen Maaoini',      ds: '2025-09-29', de: '2025-10-03', type: 'Annuel',      days: 5  },
    { name: 'Saoussen Maaoini',      ds: '2025-07-21', de: '2025-07-21', type: 'Maladie',     days: 1  },
    // WAEL ELHAJRI
    { name: 'WAEL ELHAJRI',          ds: '2025-03-10', de: '2025-03-14', type: 'Annuel',      days: 5  },
    { name: 'WAEL ELHAJRI',          ds: '2025-07-28', de: '2025-08-08', type: 'Annuel',      days: 8  },
    { name: 'WAEL ELHAJRI',          ds: '2025-12-15', de: '2025-12-19', type: 'Annuel',      days: 5  },
    { name: 'WAEL ELHAJRI',          ds: '2025-11-03', de: '2025-11-04', type: 'Exceptionnel',days: 2, approved: false },
  ];

  const congeDocs = [];
  for (const c of congeRaw) {
    const expertId = expertMap[c.name];
    if (!expertId) { console.warn(`  ⚠ No expertId for: ${c.name}`); continue; }
    congeDocs.push({
      expertId,
      expertName: c.name,
      dateStart:  new Date(c.ds),
      dateEnd:    new Date(c.de),
      type:       c.type,
      days:       c.days,
      approved:   c.approved !== undefined ? c.approved : true,
    });
  }
  await Conge.insertMany(congeDocs);
  console.log(`✓ ${congeDocs.length} congés inserted`);

  // ── Summary ──────────────────────────────────────────────────────────────────
  const counts = {
    experts:  await Expert.countDocuments(),
    clients:  await Client.countDocuments(),
    projects: await Project.countDocuments(),
    entries:  await TS.countDocuments(),
    conges:   await Conge.countDocuments(),
  };

  console.log('\n══════════════════════════════════════');
  console.log('  SEED COMPLETE');
  console.log('══════════════════════════════════════');
  console.log(`  Experts    : ${counts.experts}`);
  console.log(`  Clients    : ${counts.clients}`);
  console.log(`  Projects   : ${counts.projects}`);
  console.log(`  TimeEntries: ${counts.entries}`);
  console.log(`  Congés     : ${counts.conges}`);
  console.log('══════════════════════════════════════\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
