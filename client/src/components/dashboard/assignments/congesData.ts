export interface Conge {
  expertName: string;
  dateStart: string; // ISO date string
  dateEnd: string;
  type: "Annuel" | "Maladie" | "Exceptionnel" | "Sans solde";
  days: number;
  approved: boolean;
}

// Realistic 2025 congé data for 15 collaborators
// Tunisian labor law: 18 days annual leave + occasional sick leave
export const CONGES: Conge[] = [
  // ── Bouthaina Trabelsi ──────────────────────────────────────────────────────
  { expertName: "Bouthaina Trabelsi",  dateStart: "2025-01-06", dateEnd: "2025-01-10", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Bouthaina Trabelsi",  dateStart: "2025-04-21", dateEnd: "2025-04-25", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Bouthaina Trabelsi",  dateStart: "2025-07-14", dateEnd: "2025-07-25", type: "Annuel",      days: 8,  approved: true  },
  { expertName: "Bouthaina Trabelsi",  dateStart: "2025-03-10", dateEnd: "2025-03-11", type: "Maladie",     days: 2,  approved: true  },

  // ── CYRINE BEN MLOUKA ────────────────────────────────────────────────────────
  { expertName: "CYRINE BEN MLOUKA",   dateStart: "2025-02-17", dateEnd: "2025-02-21", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "CYRINE BEN MLOUKA",   dateStart: "2025-06-02", dateEnd: "2025-06-06", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "CYRINE BEN MLOUKA",   dateStart: "2025-08-11", dateEnd: "2025-08-22", type: "Annuel",      days: 8,  approved: true  },
  { expertName: "CYRINE BEN MLOUKA",   dateStart: "2025-11-03", dateEnd: "2025-11-05", type: "Exceptionnel",days: 3,  approved: true  },

  // ── Fatma Ben Moussa ────────────────────────────────────────────────────────
  { expertName: "Fatma Ben Moussa",    dateStart: "2025-01-20", dateEnd: "2025-01-24", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Fatma Ben Moussa",    dateStart: "2025-05-05", dateEnd: "2025-05-09", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Fatma Ben Moussa",    dateStart: "2025-08-04", dateEnd: "2025-08-15", type: "Annuel",      days: 8,  approved: true  },
  { expertName: "Fatma Ben Moussa",    dateStart: "2025-09-22", dateEnd: "2025-09-23", type: "Maladie",     days: 2,  approved: true  },

  // ── Ghalia Arfaoui ──────────────────────────────────────────────────────────
  { expertName: "Ghalia Arfaoui",      dateStart: "2025-03-03", dateEnd: "2025-03-07", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Ghalia Arfaoui",      dateStart: "2025-07-07", dateEnd: "2025-07-18", type: "Annuel",      days: 8,  approved: true  },
  { expertName: "Ghalia Arfaoui",      dateStart: "2025-10-06", dateEnd: "2025-10-10", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Ghalia Arfaoui",      dateStart: "2025-05-14", dateEnd: "2025-05-14", type: "Maladie",     days: 1,  approved: true  },

  // ── Hela Hammami ────────────────────────────────────────────────────────────
  { expertName: "Hela Hammami",        dateStart: "2025-04-07", dateEnd: "2025-04-11", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Hela Hammami",        dateStart: "2025-07-28", dateEnd: "2025-08-08", type: "Annuel",      days: 8,  approved: true  },
  { expertName: "Hela Hammami",        dateStart: "2025-11-17", dateEnd: "2025-11-21", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Hela Hammami",        dateStart: "2025-02-05", dateEnd: "2025-02-06", type: "Maladie",     days: 2,  approved: true  },

  // ── Linda Louati ────────────────────────────────────────────────────────────
  { expertName: "Linda Louati",        dateStart: "2025-01-13", dateEnd: "2025-01-17", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Linda Louati",        dateStart: "2025-06-16", dateEnd: "2025-06-20", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Linda Louati",        dateStart: "2025-08-18", dateEnd: "2025-08-29", type: "Annuel",      days: 8,  approved: true  },
  { expertName: "Linda Louati",        dateStart: "2025-04-02", dateEnd: "2025-04-02", type: "Exceptionnel",days: 1,  approved: true  },

  // ── MOHAMED NABIL OUNAIES ───────────────────────────────────────────────────
  { expertName: "MOHAMED NABIL OUNAIES", dateStart: "2025-02-24", dateEnd: "2025-02-28", type: "Annuel",    days: 5,  approved: true  },
  { expertName: "MOHAMED NABIL OUNAIES", dateStart: "2025-07-21", dateEnd: "2025-08-01", type: "Annuel",    days: 8,  approved: true  },
  { expertName: "MOHAMED NABIL OUNAIES", dateStart: "2025-12-22", dateEnd: "2025-12-31", type: "Annuel",    days: 5,  approved: true  },
  { expertName: "MOHAMED NABIL OUNAIES", dateStart: "2025-10-13", dateEnd: "2025-10-15", type: "Exceptionnel",days: 3,approved: false },

  // ── Malek Ghorbel ───────────────────────────────────────────────────────────
  { expertName: "Malek Ghorbel",       dateStart: "2025-03-17", dateEnd: "2025-03-21", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Malek Ghorbel",       dateStart: "2025-06-23", dateEnd: "2025-07-04", type: "Annuel",      days: 8,  approved: true  },
  { expertName: "Malek Ghorbel",       dateStart: "2025-09-15", dateEnd: "2025-09-19", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Malek Ghorbel",       dateStart: "2025-11-10", dateEnd: "2025-11-11", type: "Maladie",     days: 2,  approved: true  },

  // ── Mohamed Ali BAATOUT ─────────────────────────────────────────────────────
  { expertName: "Mohamed Ali BAATOUT", dateStart: "2025-01-27", dateEnd: "2025-01-31", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Mohamed Ali BAATOUT", dateStart: "2025-05-19", dateEnd: "2025-05-23", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Mohamed Ali BAATOUT", dateStart: "2025-08-25", dateEnd: "2025-09-05", type: "Annuel",      days: 8,  approved: true  },
  { expertName: "Mohamed Ali BAATOUT", dateStart: "2025-12-01", dateEnd: "2025-12-01", type: "Maladie",     days: 1,  approved: true  },

  // ── Mohamed FERJANI ─────────────────────────────────────────────────────────
  { expertName: "Mohamed FERJANI",     dateStart: "2025-04-14", dateEnd: "2025-04-18", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Mohamed FERJANI",     dateStart: "2025-07-14", dateEnd: "2025-07-25", type: "Annuel",      days: 8,  approved: true  },
  { expertName: "Mohamed FERJANI",     dateStart: "2025-10-20", dateEnd: "2025-10-24", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Mohamed FERJANI",     dateStart: "2025-06-09", dateEnd: "2025-06-10", type: "Maladie",     days: 2,  approved: true  },

  // ── Nour Hamed ──────────────────────────────────────────────────────────────
  { expertName: "Nour Hamed",          dateStart: "2025-02-10", dateEnd: "2025-02-14", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Nour Hamed",          dateStart: "2025-06-30", dateEnd: "2025-07-11", type: "Annuel",      days: 8,  approved: true  },
  { expertName: "Nour Hamed",          dateStart: "2025-11-24", dateEnd: "2025-11-28", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Nour Hamed",          dateStart: "2025-09-08", dateEnd: "2025-09-09", type: "Maladie",     days: 2,  approved: true  },

  // ── Oumayma Zaibi ───────────────────────────────────────────────────────────
  { expertName: "Oumayma Zaibi",       dateStart: "2025-03-24", dateEnd: "2025-03-28", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Oumayma Zaibi",       dateStart: "2025-07-07", dateEnd: "2025-07-18", type: "Annuel",      days: 8,  approved: true  },
  { expertName: "Oumayma Zaibi",       dateStart: "2025-10-27", dateEnd: "2025-10-31", type: "Annuel",      days: 5,  approved: true  },

  // ── SANA FLIJA ──────────────────────────────────────────────────────────────
  { expertName: "SANA FLIJA",          dateStart: "2025-01-27", dateEnd: "2025-01-31", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "SANA FLIJA",          dateStart: "2025-06-09", dateEnd: "2025-06-20", type: "Annuel",      days: 8,  approved: true  },
  { expertName: "SANA FLIJA",          dateStart: "2025-09-22", dateEnd: "2025-09-26", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "SANA FLIJA",          dateStart: "2025-04-28", dateEnd: "2025-04-29", type: "Exceptionnel",days: 2,  approved: true  },

  // ── Saoussen Maaoini ────────────────────────────────────────────────────────
  { expertName: "Saoussen Maaoini",    dateStart: "2025-02-03", dateEnd: "2025-02-07", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Saoussen Maaoini",    dateStart: "2025-05-26", dateEnd: "2025-06-06", type: "Annuel",      days: 8,  approved: true  },
  { expertName: "Saoussen Maaoini",    dateStart: "2025-09-29", dateEnd: "2025-10-03", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "Saoussen Maaoini",    dateStart: "2025-07-21", dateEnd: "2025-07-21", type: "Maladie",     days: 1,  approved: true  },

  // ── WAEL ELHAJRI ────────────────────────────────────────────────────────────
  { expertName: "WAEL ELHAJRI",        dateStart: "2025-03-10", dateEnd: "2025-03-14", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "WAEL ELHAJRI",        dateStart: "2025-07-28", dateEnd: "2025-08-08", type: "Annuel",      days: 8,  approved: true  },
  { expertName: "WAEL ELHAJRI",        dateStart: "2025-12-15", dateEnd: "2025-12-19", type: "Annuel",      days: 5,  approved: true  },
  { expertName: "WAEL ELHAJRI",        dateStart: "2025-11-03", dateEnd: "2025-11-04", type: "Exceptionnel",days: 2,  approved: false },
];

/** Sum approved congé days per collaborator name */
export function getTotalConges(name: string): number {
  return CONGES
    .filter(c => c.expertName === name && c.approved)
    .reduce((sum, c) => sum + c.days, 0);
}

/** Get congés by type for a collaborator */
export function getCongesByType(name: string): Record<string, number> {
  const result: Record<string, number> = {};
  CONGES
    .filter(c => c.expertName === name && c.approved)
    .forEach(c => { result[c.type] = (result[c.type] || 0) + c.days; });
  return result;
}

/** Check if a collaborator is currently on leave for a given date (ISO string) */
export function isOnLeave(name: string, dateISO: string): boolean {
  const d = new Date(dateISO).getTime();
  return CONGES.some(c =>
    c.expertName === name &&
    c.approved &&
    new Date(c.dateStart).getTime() <= d &&
    new Date(c.dateEnd).getTime() >= d
  );
}

/** Get the active leave entry for a collaborator at a given date, or null */
export function getActiveLeave(name: string, dateISO: string): Conge | null {
  const d = new Date(dateISO).getTime();
  return CONGES.find(c =>
    c.expertName === name &&
    c.approved &&
    new Date(c.dateStart).getTime() <= d &&
    new Date(c.dateEnd).getTime() >= d
  ) ?? null;
}
