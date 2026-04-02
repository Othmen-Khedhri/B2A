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

// 44 completed projects extracted from BD_Pilotage_Cabinet_2025 (2).xlsx — Sheet 3_Projets
export const HISTORICAL_PROJECTS: HistoricalProject[] = [
  {"id":"PRJ-0003","client":"ATUGE","type":"Audit interne","budgetHT":40000,"hBudget":160,"hReal":97,"coutReel":33950,"marge":6050,"rentPct":15.1,"overBudget":false,"sector":"Association & ONG","complexity":"Faible","collabPrincipal":"Mohamed Ali BAATOUT"},
  {"id":"PRJ-0009","client":"ELCTRO MED","type":"Assistance juridique","budgetHT":12000,"hBudget":48,"hReal":43,"coutReel":10750,"marge":1250,"rentPct":10.4,"overBudget":false,"sector":"Services","complexity":"Moyenne","collabPrincipal":"CYRINE BEN MLOUKA"},
  {"id":"PRJ-0012","client":"JEDAF","type":"Révision comptable","budgetHT":8000,"hBudget":32,"hReal":29,"coutReel":8700,"marge":-700,"rentPct":-8.8,"overBudget":false,"sector":"Transport & Logistique","complexity":"Moyenne","collabPrincipal":"Hela Hammami"},
  {"id":"PRJ-0013","client":"CEMAT","type":"Commissariat aux apports","budgetHT":50000,"hBudget":143,"hReal":98,"coutReel":29400,"marge":20600,"rentPct":41.2,"overBudget":false,"sector":"Association & ONG","complexity":"Faible","collabPrincipal":"WAEL ELHAJRI"},
  {"id":"PRJ-0015","client":"AGR","type":"Assistance juridique","budgetHT":10000,"hBudget":40,"hReal":29,"coutReel":10150,"marge":-150,"rentPct":-1.5,"overBudget":false,"sector":"Conseil & Audit","complexity":"Faible","collabPrincipal":"Saoussen Maaoini"},
  {"id":"PRJ-0017","client":"OPEN CODE","type":"Comptabilité générale","budgetHT":12000,"hBudget":34,"hReal":45,"coutReel":11250,"marge":750,"rentPct":6.2,"overBudget":true,"sector":"Technologie & IT","complexity":"Critique","collabPrincipal":"Mohamed Ali BAATOUT"},
  {"id":"PRJ-0020","client":"ISAC PRO","type":"Paie & RH","budgetHT":8000,"hBudget":23,"hReal":14,"coutReel":4900,"marge":3100,"rentPct":38.8,"overBudget":false,"sector":"Technologie & IT","complexity":"Faible","collabPrincipal":"Mohamed FERJANI"},
  {"id":"PRJ-0022","client":"NEOCORTEX","type":"Conseil fiscal","budgetHT":50000,"hBudget":200,"hReal":149,"coutReel":52150,"marge":-2150,"rentPct":-4.3,"overBudget":false,"sector":"Transport & Logistique","complexity":"Faible","collabPrincipal":"Mohamed Ali BAATOUT"},
  {"id":"PRJ-0023","client":"AFEK TOUNS","type":"Commissariat aux apports","budgetHT":20000,"hBudget":80,"hReal":107,"coutReel":26750,"marge":-6750,"rentPct":-33.8,"overBudget":true,"sector":"Services","complexity":"Critique","collabPrincipal":"Mohamed Ali BAATOUT"},
  {"id":"PRJ-0025","client":"SYNDIC SPIEF","type":"Paie & RH","budgetHT":8000,"hBudget":32,"hReal":32,"coutReel":8000,"marge":0,"rentPct":0,"overBudget":false,"sector":"Transport & Logistique","complexity":"Moyenne","collabPrincipal":"WAEL ELHAJRI"},
  {"id":"PRJ-0027","client":"FTLM","type":"Consolidation","budgetHT":30000,"hBudget":120,"hReal":116,"coutReel":34800,"marge":-4800,"rentPct":-16,"overBudget":false,"sector":"Santé","complexity":"Moyenne","collabPrincipal":"Malek Ghorbel"},
  {"id":"PRJ-0033","client":"SESAMm","type":"Due diligence","budgetHT":8000,"hBudget":23,"hReal":26,"coutReel":9100,"marge":-1100,"rentPct":-13.8,"overBudget":true,"sector":"Association & ONG","complexity":"Élevée","collabPrincipal":"SANA FLIJA"},
  {"id":"PRJ-0035","client":"INES IMMOBILIERE","type":"Audit interne","budgetHT":40000,"hBudget":114,"hReal":86,"coutReel":25800,"marge":14200,"rentPct":35.5,"overBudget":false,"sector":"Immobilier","complexity":"Faible","collabPrincipal":"Nour Hamed"},
  {"id":"PRJ-0036","client":"A2C","type":"Assistance juridique","budgetHT":30000,"hBudget":100,"hReal":63,"coutReel":15750,"marge":14250,"rentPct":47.5,"overBudget":false,"sector":"Industrie","complexity":"Faible","collabPrincipal":"SANA FLIJA"},
  {"id":"PRJ-0037","client":"UTIQUE FRUIT","type":"Conseil en organisation","budgetHT":15000,"hBudget":43,"hReal":29,"coutReel":7250,"marge":7750,"rentPct":51.7,"overBudget":false,"sector":"Technologie & IT","complexity":"Faible","collabPrincipal":"Oumayma Zaibi"},
  {"id":"PRJ-0042","client":"EY ATELIR","type":"Révision comptable","budgetHT":20000,"hBudget":67,"hReal":60,"coutReel":15000,"marge":5000,"rentPct":25,"overBudget":false,"sector":"Services","complexity":"Moyenne","collabPrincipal":"Malek Ghorbel"},
  {"id":"PRJ-0044","client":"ASSOCIATION CFIP Columbia","type":"Formation","budgetHT":15000,"hBudget":43,"hReal":36,"coutReel":12600,"marge":2400,"rentPct":16,"overBudget":false,"sector":"Association & ONG","complexity":"Faible","collabPrincipal":"Mohamed Ali BAATOUT"},
  {"id":"PRJ-0046","client":"LTEC","type":"Audit interne","budgetHT":12000,"hBudget":48,"hReal":53,"coutReel":18550,"marge":-6550,"rentPct":-54.6,"overBudget":true,"sector":"Technologie & IT","complexity":"Élevée","collabPrincipal":"Fatma Ben Moussa"},
  {"id":"PRJ-0047","client":"FLAT6LABS","type":"Consolidation","budgetHT":40000,"hBudget":160,"hReal":163,"coutReel":48900,"marge":-8900,"rentPct":-22.2,"overBudget":true,"sector":"Banque & Finance","complexity":"Moyenne","collabPrincipal":"CYRINE BEN MLOUKA"},
  {"id":"PRJ-0056","client":"LEVESQUE CONSEIL","type":"Assistance juridique","budgetHT":30000,"hBudget":100,"hReal":78,"coutReel":23400,"marge":6600,"rentPct":22,"overBudget":false,"sector":"Conseil & Audit","complexity":"Faible","collabPrincipal":"MOHAMED NABIL OUNAIES"},
  {"id":"PRJ-0057","client":"SLASHUP EX MBAZ","type":"Assistance juridique","budgetHT":8000,"hBudget":27,"hReal":18,"coutReel":5400,"marge":2600,"rentPct":32.5,"overBudget":false,"sector":"Technologie & IT","complexity":"Faible","collabPrincipal":"Fatma Ben Moussa"},
  {"id":"PRJ-0061","client":"MUNICIPALITE DE TUNIS","type":"Conseil en organisation","budgetHT":25000,"hBudget":71,"hReal":91,"coutReel":31850,"marge":-6850,"rentPct":-27.4,"overBudget":true,"sector":"Technologie & IT","complexity":"Critique","collabPrincipal":"Oumayma Zaibi"},
  {"id":"PRJ-0064","client":"TECFAB","type":"Assistance juridique","budgetHT":5000,"hBudget":20,"hReal":26,"coutReel":6500,"marge":-1500,"rentPct":-30,"overBudget":true,"sector":"Industrie","complexity":"Critique","collabPrincipal":"Linda Louati"},
  {"id":"PRJ-0065","client":"ALTAHIR","type":"Formation","budgetHT":10000,"hBudget":29,"hReal":22,"coutReel":6600,"marge":3400,"rentPct":34,"overBudget":false,"sector":"Agriculture & Agroalimentaire","complexity":"Faible","collabPrincipal":"CYRINE BEN MLOUKA"},
  {"id":"PRJ-0066","client":"SMT","type":"Due diligence","budgetHT":10000,"hBudget":33,"hReal":24,"coutReel":6000,"marge":4000,"rentPct":40,"overBudget":false,"sector":"Transport & Logistique","complexity":"Faible","collabPrincipal":"Nour Hamed"},
  {"id":"PRJ-0068","client":"ANAVA SEED FUND","type":"Conseil en organisation","budgetHT":12000,"hBudget":34,"hReal":41,"coutReel":10250,"marge":1750,"rentPct":14.6,"overBudget":true,"sector":"Banque & Finance","complexity":"Critique","collabPrincipal":"Hela Hammami"},
  {"id":"PRJ-0069","client":"Harvard Global Research","type":"Due diligence","budgetHT":40000,"hBudget":133,"hReal":81,"coutReel":24300,"marge":15700,"rentPct":39.2,"overBudget":false,"sector":"Association & ONG","complexity":"Faible","collabPrincipal":"Nour Hamed"},
  {"id":"PRJ-0079","client":"MJ CONSULTING AND TRADING","type":"Paie & RH","budgetHT":15000,"hBudget":60,"hReal":42,"coutReel":10500,"marge":4500,"rentPct":30,"overBudget":false,"sector":"Conseil & Audit","complexity":"Faible","collabPrincipal":"Malek Ghorbel"},
  {"id":"PRJ-0086","client":"B2A","type":"Révision comptable","budgetHT":15000,"hBudget":43,"hReal":40,"coutReel":10000,"marge":5000,"rentPct":33.3,"overBudget":false,"sector":"Transport & Logistique","complexity":"Moyenne","collabPrincipal":"Nour Hamed"},
  {"id":"PRJ-0087","client":"Tunisian center for social entrepreneurship","type":"Consolidation","budgetHT":50000,"hBudget":167,"hReal":181,"coutReel":45250,"marge":4750,"rentPct":9.5,"overBudget":true,"sector":"Conseil & Audit","complexity":"Élevée","collabPrincipal":"Mohamed Ali BAATOUT"},
  {"id":"PRJ-0090","client":"TRIBE","type":"Due diligence","budgetHT":50000,"hBudget":143,"hReal":88,"coutReel":26400,"marge":23600,"rentPct":47.2,"overBudget":false,"sector":"Association & ONG","complexity":"Faible","collabPrincipal":"Oumayma Zaibi"},
  {"id":"PRJ-0095","client":"Société du Produit Fini","type":"Formation","budgetHT":30000,"hBudget":100,"hReal":130,"coutReel":45500,"marge":-15500,"rentPct":-51.7,"overBudget":true,"sector":"Technologie & IT","complexity":"Critique","collabPrincipal":"Mohamed Ali BAATOUT"},
  {"id":"PRJ-0096","client":"BFC-ISO 37001","type":"Révision comptable","budgetHT":8000,"hBudget":32,"hReal":27,"coutReel":9450,"marge":-1450,"rentPct":-18.1,"overBudget":false,"sector":"Banque & Finance","complexity":"Faible","collabPrincipal":"Saoussen Maaoini"},
  {"id":"PRJ-0097","client":"Weeky stratup","type":"Commissariat aux apports","budgetHT":8000,"hBudget":23,"hReal":16,"coutReel":4800,"marge":3200,"rentPct":40,"overBudget":false,"sector":"Agriculture & Agroalimentaire","complexity":"Faible","collabPrincipal":"Linda Louati"},
  {"id":"PRJ-0103","client":"STE AKKARI & DRISSI","type":"Due diligence","budgetHT":8000,"hBudget":23,"hReal":21,"coutReel":5250,"marge":2750,"rentPct":34.4,"overBudget":false,"sector":"Industrie","complexity":"Moyenne","collabPrincipal":"CYRINE BEN MLOUKA"},
  {"id":"PRJ-0104","client":"STE AKKARI & DRISSI","type":"Audit légal","budgetHT":30000,"hBudget":86,"hReal":107,"coutReel":37450,"marge":-7450,"rentPct":-24.8,"overBudget":true,"sector":"Industrie","complexity":"Critique","collabPrincipal":"Linda Louati"},
  {"id":"PRJ-0113","client":"CYRINE BEN ROMDHANE","type":"Formation","budgetHT":20000,"hBudget":57,"hReal":65,"coutReel":22750,"marge":-2750,"rentPct":-13.8,"overBudget":true,"sector":"Banque & Finance","complexity":"Élevée","collabPrincipal":"Mohamed FERJANI"},
  {"id":"PRJ-0115","client":"ASSOCIATION LA MAISON ROTARY","type":"Consolidation","budgetHT":20000,"hBudget":67,"hReal":84,"coutReel":29400,"marge":-9400,"rentPct":-47,"overBudget":true,"sector":"Association & ONG","complexity":"Critique","collabPrincipal":"Ghalia Arfaoui"},
  {"id":"PRJ-0116","client":"ASSOCIATION LA MAISON ROTARY","type":"Assistance juridique","budgetHT":15000,"hBudget":60,"hReal":51,"coutReel":15300,"marge":-300,"rentPct":-2,"overBudget":false,"sector":"Association & ONG","complexity":"Faible","collabPrincipal":"CYRINE BEN MLOUKA"},
  {"id":"PRJ-0118","client":"Ressourcethica","type":"Commissariat aux apports","budgetHT":5000,"hBudget":14,"hReal":15,"coutReel":4500,"marge":500,"rentPct":10,"overBudget":true,"sector":"Services","complexity":"Élevée","collabPrincipal":"Malek Ghorbel"},
  {"id":"PRJ-0119","client":"Bizerta Resort","type":"Conseil en organisation","budgetHT":20000,"hBudget":67,"hReal":88,"coutReel":30800,"marge":-10800,"rentPct":-54,"overBudget":true,"sector":"Services","complexity":"Critique","collabPrincipal":"Mohamed Ali BAATOUT"},
  {"id":"PRJ-0120","client":"WTMC","type":"Paie & RH","budgetHT":8000,"hBudget":32,"hReal":22,"coutReel":5500,"marge":2500,"rentPct":31.2,"overBudget":false,"sector":"Association & ONG","complexity":"Faible","collabPrincipal":"Nour Hamed"},
  {"id":"PRJ-0122","client":"SIT SPA","type":"Assistance juridique","budgetHT":25000,"hBudget":71,"hReal":87,"coutReel":26100,"marge":-1100,"rentPct":-4.4,"overBudget":true,"sector":"Technologie & IT","complexity":"Critique","collabPrincipal":"Bouthaina Trabelsi"},
  {"id":"PRJ-0125","client":"WT MC","type":"Conseil en organisation","budgetHT":12000,"hBudget":48,"hReal":38,"coutReel":13300,"marge":-1300,"rentPct":-10.8,"overBudget":false,"sector":"Services","complexity":"Faible","collabPrincipal":"Nour Hamed"},
];

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
