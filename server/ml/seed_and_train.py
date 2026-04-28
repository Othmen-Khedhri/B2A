"""
seed_and_train.py
Converts estimationProjects.json → raw.xlsx format, then retrains all ML models.

Run with:  python seed_and_train.py
"""

import json
import random
import numpy as np
import pandas as pd
from pathlib import Path

random.seed(42)
np.random.seed(42)

JSON_PATH  = Path(__file__).parent.parent / "scripts" / "estimationProjects.json"
RAW_PATH   = Path(__file__).parent / "data" / "raw.xlsx"

# ── Derived field helpers ──────────────────────────────────────────────────────

COMPLEXITY_DUREE = {
    "Faible":   (1,  3),
    "Moyenne":  (3,  8),
    "Élevée":   (6,  18),
    "Critique": (12, 36),
}

# Contract period weights by mission type
PERIODE_WEIGHTS = {
    "Comptabilité générale": ["Mensuel", "Annuel", "Mensuel", "Mensuel"],
    "Paie & RH":             ["Mensuel", "Mensuel", "Annuel", "Mensuel"],
    "Audit légal":           ["Annuel", "Annuel", "Ponctuel"],
    "Audit interne":         ["Annuel", "Annuel", "Semestriel"],
    "Révision comptable":    ["Annuel", "Semestriel", "Trimestriel"],
    "Formation":             ["Ponctuel", "Ponctuel", "Trimestriel"],
    "Assistance juridique":  ["Ponctuel", "Annuel"],
    "Due diligence":         ["Ponctuel", "Ponctuel"],
    "Consolidation":         ["Annuel", "Semestriel"],
    "Conseil fiscal":        ["Annuel", "Trimestriel", "Ponctuel"],
    "Conseil en organisation": ["Ponctuel", "Semestriel", "Annuel"],
    "Commissariat aux apports": ["Ponctuel", "Ponctuel", "Annuel"],
}
DEFAULT_PERIODES = ["Annuel", "Mensuel", "Ponctuel", "Semestriel", "Trimestriel"]

SEGMENTS = ["PME", "PME", "Grande Entreprise", "TPE", "Startup",
            "Association", "Multinationale", "PME", "Grande Entreprise", "TPE"]

def derive_duree(complexity: str) -> int:
    lo, hi = COMPLEXITY_DUREE[complexity]
    return random.randint(lo, hi)

def derive_periode(mission_type: str) -> str:
    options = PERIODE_WEIGHTS.get(mission_type, DEFAULT_PERIODES)
    return random.choice(options)

def derive_segment(sector: str) -> str:
    if sector == "Association & ONG":
        return "Association"
    if sector == "Banque & Finance":
        return random.choice(["Grande Entreprise", "Multinationale"])
    if sector in ("Technologie & IT", "Services"):
        return random.choice(["PME", "Startup", "Grande Entreprise"])
    return random.choice(SEGMENTS)

# ── Load JSON ──────────────────────────────────────────────────────────────────

print(f"Loading {JSON_PATH} ...")
with open(JSON_PATH, "r", encoding="utf-8") as f:
    records = json.load(f)

print(f"  {len(records)} records loaded")

# ── Map to Excel column format expected by preprocessing.py ───────────────────

rows = []
for i, r in enumerate(records):
    mission_type = r["type"]
    sector       = r["sector"]
    complexity   = r["complexity"]
    duree        = derive_duree(complexity)

    rows.append({
        "ID Projet":              f"GEN-{i+1:05d}",
        "Nom du Client":          r["client"],
        "Type de Mission":        mission_type,
        "Secteur d'Activité":     sector,
        "Segment":                derive_segment(sector),
        "Période de Contrat":     derive_periode(mission_type),
        "Statut":                 "Terminé",
        "Date Début":             r.get("createdAt", "2023-01-01")[:10],
        "Durée (mois)":           duree,
        "Heures Estimées":        r["hBudget"],
        "Heures Réelles":         r["hReal"],
        "Budget Estimé (TND)":    r["budgetHT"],
        "Budget Réel (TND)":      r["coutReel"],
        "Noms Collaborateurs":    r.get("collabPrincipal", ""),
        "Validé Par Manager":     random.choice(["Oui", "Oui", "Non"]),
    })

df = pd.DataFrame(rows)

print(f"\nDataFrame shape: {df.shape}")
print(f"Columns: {list(df.columns)}")
print(f"\nSample row:\n{df.iloc[0].to_dict()}")

# ── Save as raw.xlsx ───────────────────────────────────────────────────────────

RAW_PATH.parent.mkdir(parents=True, exist_ok=True)
df.to_excel(RAW_PATH, index=False)
print(f"\nSaved to {RAW_PATH}")

# ── Run training ───────────────────────────────────────────────────────────────

print("\n" + "="*60)
print("Starting model training...")
print("="*60 + "\n")

from train import train
train(force_preprocess=True)

print("\nAll done. Models are ready.")
