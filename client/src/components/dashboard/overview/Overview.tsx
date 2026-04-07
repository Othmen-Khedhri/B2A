import { useState } from "react";
import {
  Search,
  TrendingUp,
  TrendingDown,
  FolderKanban,
  Users,
  AlertTriangle,
  BarChart2,
  Clock,
  Bell,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  ALL_PROJECTS,
  TOP10_RENTABLE,
  TOP10_DEP,
  HEURES_COLLAB,
  RENT_MANAGERS,
  ALERTES,
  ANOMALIES,
  type Project,
} from "./dashboardData";

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("fr-TN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function paceColor(ratio: number) {
  if (ratio < 0.8) return "bg-green-500";
  if (ratio <= 1.0) return "bg-amber-400";
  return "bg-red-500";
}

function paceTextColor(ratio: number) {
  if (ratio < 0.8) return "text-green-600 dark:text-green-400";
  if (ratio <= 1.0) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function PaceBar({ value, max, ratio }: { value: number; max: number; ratio: number }) {
  const pct = Math.min(ratio * 100, 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1 text-[#6B6B6F] dark:text-[#9E9EA3]">
        <span>{fmt(value, 0)}</span>
        <span>{fmt(max, 0)}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-[#CACAC4]/40 dark:bg-white/10 overflow-hidden">
        <div
          className={`h-2 rounded-full ${paceColor(ratio)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`text-right text-xs mt-0.5 font-medium ${paceTextColor(ratio)}`}>
        {fmt(ratio * 100, 1)}%
      </div>
    </div>
  );
}

// ─── A. Project Pace Checker ────────────────────────────────────────────────

function ProjectPaceChecker() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Project | null>(null);
  const [open, setOpen] = useState(false);

  const filtered =
    query.length > 0
      ? ALL_PROJECTS.filter(
          (p) =>
            p.id.toLowerCase().includes(query.toLowerCase()) ||
            p.client.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10)
      : [];

  function select(p: Project) {
    setSelected(p);
    setQuery(p.id + " – " + p.client);
    setOpen(false);
  }

  const hRatio = selected ? selected.hReal / selected.hBudget : 0;
  const cRatio = selected ? selected.coutReel / selected.budgetHT : 0;

  function PaceBadge({ ratio }: { ratio: number }) {
    if (ratio < 0.8)
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
          On Track
        </span>
      );
    if (ratio <= 1.0)
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          At Risk
        </span>
      );
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
        Over Budget
      </span>
    );
  }

  function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
      "En cours": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      "Terminé": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      "En attente": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    };
    const cls = map[status] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{status}</span>;
  }

  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Search size={18} className="text-[#FFD600]" />
        <h2 className="text-base font-semibold text-[#0D0D0D] dark:text-white">
          Project Pace Checker
        </h2>
      </div>

      {/* Search input */}
      <div className="relative mb-4">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6F] dark:text-[#9E9EA3]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (e.target.value === "") setSelected(null);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher par ID projet (ex: PRJ-0001) ou client…"
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#CACAC4] dark:border-white/10 bg-[#E2E2DC] dark:bg-[#1A1A1E] text-[#0D0D0D] dark:text-white text-sm placeholder-[#6B6B6F] dark:placeholder-[#9E9EA3] focus:outline-none focus:ring-2 focus:ring-[#FFD600]/60"
        />
        {open && filtered.length > 0 && (
          <ul className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-[#CACAC4] dark:border-white/10 bg-white dark:bg-[#2A2A2E] shadow-lg overflow-hidden">
            {filtered.map((p) => (
              <li
                key={p.id}
                className="px-4 py-2.5 cursor-pointer hover:bg-[#E2E2DC] dark:hover:bg-white/5 text-sm text-[#0D0D0D] dark:text-white flex justify-between items-center"
                onMouseDown={() => select(p)}
              >
                <span>
                  <span className="font-mono font-medium">{p.id}</span>
                  <span className="text-[#6B6B6F] dark:text-[#9E9EA3]"> – {p.client}</span>
                </span>
                <span className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">{p.type}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Selected project detail */}
      {selected && (
        <div className="mt-2 rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-[#E2E2DC]/50 dark:bg-[#1A1A1E]/50 p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: meta */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-[#0D0D0D] dark:text-white">
                {selected.id}
              </span>
              <StatusBadge status={selected.status} />
              <PaceBadge ratio={hRatio} />
            </div>
            <div>
              <p className="text-lg font-semibold text-[#0D0D0D] dark:text-white leading-tight">
                {selected.client}
              </p>
              <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">{selected.type}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">Manager</p>
                <p className="font-medium text-[#0D0D0D] dark:text-white">{selected.manager}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">Secteur</p>
                <p className="font-medium text-[#0D0D0D] dark:text-white">{selected.sector}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">Complexité</p>
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-[#FFD600]/20 text-[#9B8200] dark:text-[#FFD600]">
                  {selected.complexity}
                </span>
              </div>
              <div>
                <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">Marge</p>
                <p
                  className={`font-semibold ${
                    selected.rentPct >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {fmt(selected.rentPct, 1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Right: bars */}
          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium text-[#6B6B6F] dark:text-[#9E9EA3] mb-1.5">
                Heures — Réel / Budget
              </p>
              <PaceBar value={selected.hReal} max={selected.hBudget} ratio={hRatio} />
            </div>
            <div>
              <p className="text-xs font-medium text-[#6B6B6F] dark:text-[#9E9EA3] mb-1.5">
                Budget — Coût Réel / Budget HT (TND)
              </p>
              <PaceBar value={selected.coutReel} max={selected.budgetHT} ratio={cRatio} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── B. KPI Row ─────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sub,
  accentClass = "",
  borderClass = "border-l-[#FFD600]",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accentClass?: string;
  borderClass?: string;
}) {
  return (
    <div className={`bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] border-l-4 ${borderClass} shadow-sm p-5 flex items-start gap-4 hover:-translate-y-1 hover:shadow-md transition-all`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3] mb-0.5">{label}</p>
        <p className={`text-2xl font-bold ${accentClass || "text-[#0D0D0D] dark:text-white"}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function KpiRow() {
  return (
    <div className="stagger-children grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        icon={<FolderKanban size={20} className="text-[#FFD600]" />}
        label="Projets — Total / Actifs / Terminés / En attente"
        value="130"
        sub="Actifs: 62 · Terminés: 44 · En attente: 24"
        borderClass="border-l-[#FFD600]"
      />
      <KpiCard
        icon={<AlertTriangle size={20} className="text-red-500" />}
        label="Projets en dépassement de budget"
        value="52"
        sub="40% du portefeuille"
        accentClass="text-red-600 dark:text-red-400"
        borderClass="border-l-red-500"
      />
      <KpiCard
        icon={<Users size={20} className="text-blue-500" />}
        label="Collaborateurs actifs"
        value="15"
        borderClass="border-l-blue-500"
      />
      <KpiCard
        icon={<TrendingUp size={20} className="text-green-500" />}
        label="Marge moyenne du portefeuille"
        value="7.6%"
        accentClass="text-green-600 dark:text-green-400"
        borderClass="border-l-green-500"
      />
    </div>
  );
}

// ─── Shared Table helpers ────────────────────────────────────────────────────

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`px-3 py-2.5 text-xs font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] whitespace-nowrap ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <td
      className={`px-3 py-2.5 text-sm text-[#0D0D0D] dark:text-white whitespace-nowrap ${
        right ? "text-right" : ""
      }`}
    >
      {children}
    </td>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-[#CACAC4] dark:border-white/[0.06]">
        {icon}
        <h2 className="text-base font-semibold text-[#0D0D0D] dark:text-white">{title}</h2>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

// ─── C. Top 10 Rentables ─────────────────────────────────────────────────────

function Top10RentableTable() {
  return (
    <SectionCard
      icon={<TrendingUp size={18} className="text-green-500" />}
      title="Top 10 Projets les plus rentables"
    >
      <table className="w-full">
        <thead className="bg-[#E2E2DC]/60 dark:bg-white/[0.03]">
          <tr>
            <Th>Rang</Th>
            <Th>Client</Th>
            <Th>Type Mission</Th>
            <Th>Manager</Th>
            <Th right>Budget HT</Th>
            <Th right>Coût Réel</Th>
            <Th right>Marge TND</Th>
            <Th right>Rentabilité %</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
          {TOP10_RENTABLE.map((r) => (
            <tr key={r.rang} className="hover:bg-[#E2E2DC]/30 dark:hover:bg-white/[0.02]">
              <Td>
                <span className="font-bold text-[#FFD600]">{r.rang}</span>
              </Td>
              <Td>{r.client}</Td>
              <Td>{r.type}</Td>
              <Td>{r.manager}</Td>
              <Td right>{fmt(r.budgetHT)}</Td>
              <Td right>{fmt(r.coutReel)}</Td>
              <Td right>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {fmt(r.marge)}
                </span>
              </Td>
              <Td right>
                <span className="text-green-600 dark:text-green-400 font-semibold">
                  {fmt(r.rentPct, 1)}%
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  );
}

// ─── D. Top 10 Dépassement ───────────────────────────────────────────────────

function Top10DepTable() {
  return (
    <SectionCard
      icon={<TrendingDown size={18} className="text-red-500" />}
      title="Top 10 Projets en dépassement de budget"
    >
      <table className="w-full">
        <thead className="bg-[#E2E2DC]/60 dark:bg-white/[0.03]">
          <tr>
            <Th>Rang</Th>
            <Th>Client</Th>
            <Th>Type Mission</Th>
            <Th>Manager</Th>
            <Th right>Budget HT</Th>
            <Th right>Coût Réel</Th>
            <Th right>Écart Coût</Th>
            <Th right>Écart H</Th>
            <Th right>Taux Dépassement %</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
          {TOP10_DEP.map((r) => (
            <tr key={r.rang} className="hover:bg-[#E2E2DC]/30 dark:hover:bg-white/[0.02]">
              <Td>
                <span className="font-bold text-red-500">{r.rang}</span>
              </Td>
              <Td>{r.client}</Td>
              <Td>{r.type}</Td>
              <Td>{r.manager}</Td>
              <Td right>{fmt(r.budgetHT)}</Td>
              <Td right>{fmt(r.coutReel)}</Td>
              <Td right>
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {fmt(r.ecartCout)}
                </span>
              </Td>
              <Td right>
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {fmt(r.ecartH, 1)}h
                </span>
              </Td>
              <Td right>
                <span className="text-red-600 dark:text-red-400 font-semibold">
                  {fmt(r.tauxDep, 1)}%
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  );
}

// ─── E. Heures Collab ────────────────────────────────────────────────────────

function txFacturableClass(tx: number) {
  if (tx < 60) return "text-red-600 dark:text-red-400";
  if (tx < 70) return "text-amber-600 dark:text-amber-400";
  return "text-green-600 dark:text-green-400";
}

function HeuresCollabTable() {
  return (
    <SectionCard
      icon={<Clock size={18} className="text-blue-500" />}
      title="Heures facturables vs théoriques par collaborateur"
    >
      <table className="w-full">
        <thead className="bg-[#E2E2DC]/60 dark:bg-white/[0.03]">
          <tr>
            <Th>Collaborateur</Th>
            <Th>Niveau</Th>
            <Th>Manager</Th>
            <Th right>H Théoriques</Th>
            <Th right>H Saisies</Th>
            <Th right>H Facturables</Th>
            <Th right>Tx Facturable %</Th>
            <Th right>Tx Saisie %</Th>
            <Th right>TS Non Remplis</Th>
            <Th right>TS Non Validés</Th>
            <Th right>Anomalies</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
          {HEURES_COLLAB.map((c) => (
            <tr key={c.name} className="hover:bg-[#E2E2DC]/30 dark:hover:bg-white/[0.02]">
              <Td>
                <span className="font-medium">{c.name}</span>
              </Td>
              <Td>{c.niveau}</Td>
              <Td>{c.manager}</Td>
              <Td right>{fmt(c.hTheorique, 1)}</Td>
              <Td right>{fmt(c.hSaisies, 1)}</Td>
              <Td right>{fmt(c.hFacturable, 1)}</Td>
              <Td right>
                <span className={`font-semibold ${txFacturableClass(c.txFacturable)}`}>
                  {fmt(c.txFacturable, 1)}%
                </span>
              </Td>
              <Td right>{fmt(c.txSaisie, 1)}%</Td>
              <Td right>
                {c.tsNonRemplis > 30 ? (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                    {c.tsNonRemplis}
                  </span>
                ) : (
                  <span>{c.tsNonRemplis}</span>
                )}
              </Td>
              <Td right>{c.tsNonValides}</Td>
              <Td right>{c.anomalies}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  );
}

// ─── F. Rentabilité par manager ──────────────────────────────────────────────

function RentManagerCards() {
  const sorted = [...RENT_MANAGERS].sort((a, b) => b.rentMoy - a.rentMoy);

  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5 border-b border-[#CACAC4] dark:border-white/[0.06] pb-4">
        <BarChart2 size={18} className="text-[#FFD600]" />
        <h2 className="text-base font-semibold text-[#0D0D0D] dark:text-white">
          Rentabilité du portefeuille par manager
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {sorted.map((m) => (
          <div
            key={m.manager}
            className="rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-[#E2E2DC]/40 dark:bg-[#1A1A1E]/50 p-4 space-y-3"
          >
            <p className="font-semibold text-sm text-[#0D0D0D] dark:text-white leading-tight">
              {m.manager}
            </p>

            {/* Rent Moy — big number */}
            <div className="text-center">
              <p
                className={`text-3xl font-bold ${
                  m.rentMoy >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {fmt(m.rentMoy, 1)}%
              </p>
              <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">Rentabilité moy.</p>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
              <div>
                <p className="text-[#6B6B6F] dark:text-[#9E9EA3]">Projets</p>
                <p className="font-semibold text-[#0D0D0D] dark:text-white">{m.nbProjets}</p>
              </div>
              <div>
                <p className="text-[#6B6B6F] dark:text-[#9E9EA3]">Dépassement</p>
                <p className="font-semibold text-red-600 dark:text-red-400">
                  {m.projetsDepassement}/{m.nbProjets}
                </p>
              </div>
              <div>
                <p className="text-[#6B6B6F] dark:text-[#9E9EA3]">Budget total</p>
                <p className="font-medium text-[#0D0D0D] dark:text-white">
                  {fmt(m.budgetTotal)}
                </p>
              </div>
              <div>
                <p className="text-[#6B6B6F] dark:text-[#9E9EA3]">Taux dep.</p>
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  {fmt(m.tauxDep, 1)}%
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[#6B6B6F] dark:text-[#9E9EA3]">Marge totale</p>
                <p
                  className={`font-semibold ${
                    m.margeTotal >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {fmt(m.margeTotal)} TND
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── G. Alertes de relances ──────────────────────────────────────────────────

function PrioriteBadge({ p }: { p: string }) {
  if (p === "URGENT")
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
        URGENT
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
      NORMAL
    </span>
  );
}

function AlertesSection() {
  const [showAll, setShowAll] = useState(false);
  const totalManquants = ALERTES.reduce((s, a) => s + a.nbManquants, 0);
  const displayed = showAll ? ALERTES : ALERTES.slice(0, 20);

  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-[#CACAC4] dark:border-white/[0.06]">
        <Bell size={18} className="text-amber-500" />
        <h2 className="text-base font-semibold text-[#0D0D0D] dark:text-white">
          Alertes de relances
        </h2>
      </div>

      {/* Summary */}
      <div className="px-6 py-3 bg-[#E2E2DC]/40 dark:bg-[#1A1A1E]/40 border-b border-[#CACAC4] dark:border-white/[0.06] flex flex-wrap gap-4 text-sm">
        <span className="text-[#6B6B6F] dark:text-[#9E9EA3]">
          Total alertes :{" "}
          <span className="font-bold text-[#0D0D0D] dark:text-white">{ALERTES.length}</span>
        </span>
        <span className="text-[#6B6B6F] dark:text-[#9E9EA3]">
          Total TS manquants :{" "}
          <span className="font-bold text-red-600 dark:text-red-400">{fmt(totalManquants)}</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#E2E2DC]/60 dark:bg-white/[0.03]">
            <tr>
              <Th>Collaborateur</Th>
              <Th>Manager</Th>
              <Th>Période</Th>
              <Th right>NB TS Manquants</Th>
              <Th>Priorité</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
            {displayed.map((a, i) => (
              <tr key={i} className="hover:bg-[#E2E2DC]/30 dark:hover:bg-white/[0.02]">
                <Td>{a.collaborateur}</Td>
                <Td>{a.manager}</Td>
                <Td>{a.periode}</Td>
                <Td right>
                  <span className="font-semibold">{a.nbManquants}</span>
                </Td>
                <Td>
                  <PrioriteBadge p={a.priorite} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ALERTES.length > 20 && (
        <div className="px-6 py-3 border-t border-[#CACAC4] dark:border-white/[0.06] flex items-center justify-between text-sm">
          <span className="text-[#6B6B6F] dark:text-[#9E9EA3]">
            Affichage de {displayed.length} / {ALERTES.length} alertes
          </span>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-1.5 text-[#0D0D0D] dark:text-white font-medium hover:text-[#FFD600] dark:hover:text-[#FFD600] transition-colors"
          >
            {showAll ? (
              <>
                Réduire <ChevronUp size={14} />
              </>
            ) : (
              <>
                Tout afficher ({ALERTES.length}) <ChevronDown size={14} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── H. Anomalies Time-Sheet ─────────────────────────────────────────────────

function AnomalieTypeBadge({ type }: { type: string }) {
  if (type === "Dépassement")
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
        Dépassement
      </span>
    );
  if (type === "Insuffisance")
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
        Insuffisance
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
      Non rempli
    </span>
  );
}

function AnomaliesSection() {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? ANOMALIES : ANOMALIES.slice(0, 20);

  const countDep = ANOMALIES.filter((a) => a.anomalie === "Dépassement").length;
  const countIns = ANOMALIES.filter((a) => a.anomalie === "Insuffisance").length;
  const countNR = ANOMALIES.filter((a) => a.anomalie === "Non rempli").length;

  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-[#CACAC4] dark:border-white/[0.06]">
        <Activity size={18} className="text-red-500" />
        <h2 className="text-base font-semibold text-[#0D0D0D] dark:text-white">
          Anomalies Time-Sheet
        </h2>
      </div>

      {/* Summary stats */}
      <div className="px-6 py-3 bg-[#E2E2DC]/40 dark:bg-[#1A1A1E]/40 border-b border-[#CACAC4] dark:border-white/[0.06] flex flex-wrap gap-4 text-sm">
        <span className="text-[#6B6B6F] dark:text-[#9E9EA3]">
          Total :{" "}
          <span className="font-bold text-[#0D0D0D] dark:text-white">{ANOMALIES.length}</span>
        </span>
        <span className="text-[#6B6B6F] dark:text-[#9E9EA3]">
          Dépassement :{" "}
          <span className="font-bold text-red-600 dark:text-red-400">{countDep}</span>
        </span>
        <span className="text-[#6B6B6F] dark:text-[#9E9EA3]">
          Insuffisance :{" "}
          <span className="font-bold text-amber-600 dark:text-amber-400">{countIns}</span>
        </span>
        <span className="text-[#6B6B6F] dark:text-[#9E9EA3]">
          Non rempli :{" "}
          <span className="font-bold text-gray-600 dark:text-gray-400">{countNR}</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#E2E2DC]/60 dark:bg-white/[0.03]">
            <tr>
              <Th>ID TS</Th>
              <Th>Collaborateur</Th>
              <Th>Manager</Th>
              <Th>Période</Th>
              <Th right>H Théoriques</Th>
              <Th right>H Saisies</Th>
              <Th right>Écart H</Th>
              <Th right>Écart %</Th>
              <Th>Type</Th>
              <Th>Validé</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
            {displayed.map((a, i) => (
              <tr key={i} className="hover:bg-[#E2E2DC]/30 dark:hover:bg-white/[0.02]">
                <Td>
                  <span className="font-mono text-xs">{a.idTS}</span>
                </Td>
                <Td>{a.collaborateur}</Td>
                <Td>{a.manager}</Td>
                <Td>{a.periode}</Td>
                <Td right>{fmt(a.hTheorique, 1)}</Td>
                <Td right>{fmt(a.hSaisies, 1)}</Td>
                <Td right>
                  <span
                    className={
                      a.ecartH > 0
                        ? "text-red-600 dark:text-red-400 font-medium"
                        : a.ecartH < 0
                        ? "text-amber-600 dark:text-amber-400 font-medium"
                        : ""
                    }
                  >
                    {fmt(a.ecartH, 1)}
                  </span>
                </Td>
                <Td right>
                  <span
                    className={
                      a.ecartPct > 0
                        ? "text-red-600 dark:text-red-400"
                        : a.ecartPct < 0
                        ? "text-amber-600 dark:text-amber-400"
                        : ""
                    }
                  >
                    {fmt(a.ecartPct, 1)}%
                  </span>
                </Td>
                <Td>
                  <AnomalieTypeBadge type={a.anomalie} />
                </Td>
                <Td>
                  <span
                    className={
                      a.tsValide === "Oui"
                        ? "text-green-600 dark:text-green-400 text-xs font-medium"
                        : "text-[#6B6B6F] dark:text-[#9E9EA3] text-xs"
                    }
                  >
                    {a.tsValide}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ANOMALIES.length > 20 && (
        <div className="px-6 py-3 border-t border-[#CACAC4] dark:border-white/[0.06] flex items-center justify-between text-sm">
          <span className="text-[#6B6B6F] dark:text-[#9E9EA3]">
            Affichage de {displayed.length} / {ANOMALIES.length} anomalies
          </span>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-1.5 text-[#0D0D0D] dark:text-white font-medium hover:text-[#FFD600] dark:hover:text-[#FFD600] transition-colors"
          >
            {showAll ? (
              <>
                Réduire <ChevronUp size={14} />
              </>
            ) : (
              <>
                Tout afficher ({ANOMALIES.length}) <ChevronDown size={14} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Overview ───────────────────────────────────────────────────────────

export default function Overview() {
  return (
    <div className="space-y-6 stagger-children">
      {/* A */}
      <ProjectPaceChecker />

      {/* B */}
      <KpiRow />

      {/* C */}
      <Top10RentableTable />

      {/* D */}
      <Top10DepTable />

      {/* E */}
      <HeuresCollabTable />

      {/* F */}
      <RentManagerCards />

      {/* G */}
      <AlertesSection />

      {/* H */}
      <AnomaliesSection />
    </div>
  );
}
