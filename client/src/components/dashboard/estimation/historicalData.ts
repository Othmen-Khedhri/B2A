export interface HistoricalProject {
  id: string;
  client: string;
  type: string;
  budgetHT: number;
  hBudget: number;
  hReal: number;
  coutReel: number;
  marge: number;
  rentPct: number;
  overBudget: boolean;
  sector: string;
  complexity: string;
  collabPrincipal: string;
}

export const HISTORICAL_PROJECTS: HistoricalProject[] = [];

// Hourly rates by level (from Sheet 2_Collaborateurs)
export const HOURLY_RATES = {
  Junior: 31.25,
  Senior: 43.75,
  Manager: 62.5,
};

// All project types from the Excel
export const PROJECT_TYPES = [
  "Audit légal",
  "Audit interne",
  "Conseil en organisation",
  "Conseil fiscal",
  "Assistance juridique",
  "Révision comptable",
  "Comptabilité générale",
  "Commissariat aux apports",
  "Consolidation",
  "Due diligence",
  "Formation",
  "Paie & RH",
];

// All sectors from the Excel
export const CLIENT_SECTORS = [
  "Technologie & IT",
  "Association & ONG",
  "Conseil & Audit",
  "Banque & Finance",
  "Industrie",
  "Services",
  "Transport & Logistique",
  "Commerce & Distribution",
  "Santé",
  "Immobilier",
  "Agriculture & Agroalimentaire",
  "Education & Formation",
];

export const COMPLEXITY_LEVELS = ["Faible", "Moyenne", "Élevée", "Critique"] as const;
export type ComplexityLevel = typeof COMPLEXITY_LEVELS[number];
