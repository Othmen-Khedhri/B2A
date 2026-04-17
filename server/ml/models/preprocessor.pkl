"""
preprocessing.py
Cleans raw Excel data and engineers features for model training.
"""

import pandas as pd
import numpy as np
from pathlib import Path

RAW_PATH = Path(__file__).parent / "data" / "raw.xlsx"
PROCESSED_PATH = Path(__file__).parent / "data" / "processed.csv"

# ── Categorical mappings ───────────────────────────────────────────────────────

COMPLEXITY_MAP = {"Faible": 0, "Moyenne": 1, "Élevée": 2, "Critique": 3}

SEGMENT_CATEGORIES = [
    "Association", "Grande Entreprise", "Multinationale", "PME", "Startup", "TPE"
]

SECTEUR_CATEGORIES = [
    "Agriculture & Agroalimentaire", "Association & ONG", "Banque & Finance",
    "Commerce & Distribution", "Conseil & Audit", "Éducation & Formation",
    "Immobilier", "Industrie", "Santé", "Services",
    "Technologie & IT", "Transport & Logistique",
]

MISSION_CATEGORIES = [
    "Assistance juridique", "Audit interne", "Audit légal",
    "Commissariat aux apports", "Comptabilité générale", "Conseil en organisation",
    "Conseil fiscal", "Consolidation", "Due diligence",
    "Formation", "Paie & RH", "Révision comptable",
]

PERIODE_CATEGORIES = ["Annuel", "Mensuel", "Ponctuel", "Semestriel", "Trimestriel"]


def parse_collab_count(s: str) -> int:
    """Count collaborators from pipe-separated string."""
    if pd.isna(s) or str(s).strip() == "":
        return 1
    return len([x.strip() for x in str(s).split("|") if x.strip()])


def infer_complexity(row: pd.Series) -> str:
    """
    Infer complexity from budget and duration since the raw data
    doesn't have a complexity column. Quartile-based bucketing.
    """
    budget = row["Budget Estimé (TND)"]
    duree = row["Durée (mois)"]
    score = 0
    if budget > 30000:
        score += 2
    elif budget > 15000:
        score += 1
    if duree > 8:
        score += 2
    elif duree > 4:
        score += 1
    if score <= 0:
        return "Faible"
    elif score <= 1:
        return "Moyenne"
    elif score <= 3:
        return "Élevée"
    else:
        return "Critique"


def normalize_statut(s: str) -> str:
    s = str(s).strip().lower()
    if s in ("terminé", "termine", "completed"):
        return "Terminé"
    return s.capitalize()


def load_and_clean(path: Path = RAW_PATH) -> pd.DataFrame:
    df = pd.read_excel(path)

    # Normalize status — keep only completed projects
    df["Statut"] = df["Statut"].apply(normalize_statut)
    df = df[df["Statut"] == "Terminé"].copy()

    # Drop rows with missing critical values
    critical = ["Heures Estimées", "Heures Réelles", "Budget Estimé (TND)",
                "Budget Réel (TND)", "Type de Mission", "Secteur d'Activité"]
    df = df.dropna(subset=critical)

    # Remove extreme outliers (>3 std from mean) in target
    for col in ["Heures Réelles", "Budget Réel (TND)"]:
        mean, std = df[col].mean(), df[col].std()
        df = df[df[col].between(mean - 3 * std, mean + 3 * std)]

    return df.reset_index(drop=True)


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Infer complexity
    df["complexity"] = df.apply(infer_complexity, axis=1)
    df["complexity_num"] = df["complexity"].map(COMPLEXITY_MAP)

    # Collaborator count
    df["nb_collaborateurs"] = df["Noms Collaborateurs"].apply(parse_collab_count)

    # Temporal features
    df["Date Début"] = pd.to_datetime(df["Date Début"], errors="coerce")
    df["start_month"] = df["Date Début"].dt.month.fillna(1).astype(int)
    df["start_quarter"] = df["Date Début"].dt.quarter.fillna(1).astype(int)

    # Ratio: estimated hours per month
    df["heures_par_mois"] = df["Heures Estimées"] / df["Durée (mois)"].clip(lower=1)

    # Budget per hour estimated
    df["budget_par_heure"] = df["Budget Estimé (TND)"] / df["Heures Estimées"].clip(lower=1)

    # Derived targets
    df["overrun_ratio"] = df["Heures Réelles"] / df["Heures Estimées"]
    df["margin_pct"] = (
        (df["Budget Estimé (TND)"] - df["Budget Réel (TND)"])
        / df["Budget Estimé (TND)"]
        * 100
    )
    df["over_budget"] = (df["Heures Réelles"] > df["Heures Estimées"]).astype(int)

    # Validated by manager: binary
    df["valide_manager"] = (
        df["Validé Par Manager"].str.strip().str.lower() == "oui"
    ).astype(int)

    return df


def encode_categoricals(df: pd.DataFrame) -> pd.DataFrame:
    """One-hot encode all categorical features."""
    df = df.copy()

    # Segment
    df["Segment"] = pd.Categorical(df["Segment"], categories=SEGMENT_CATEGORIES)
    seg_dummies = pd.get_dummies(df["Segment"], prefix="seg")

    # Secteur
    df["Secteur d'Activité"] = pd.Categorical(
        df["Secteur d'Activité"], categories=SECTEUR_CATEGORIES
    )
    sec_dummies = pd.get_dummies(df["Secteur d'Activité"], prefix="sec")

    # Type de Mission
    df["Type de Mission"] = pd.Categorical(
        df["Type de Mission"], categories=MISSION_CATEGORIES
    )
    mis_dummies = pd.get_dummies(df["Type de Mission"], prefix="mis")

    # Période de Contrat
    df["Période de Contrat"] = pd.Categorical(
        df["Période de Contrat"], categories=PERIODE_CATEGORIES
    )
    per_dummies = pd.get_dummies(df["Période de Contrat"], prefix="per")

    # Combine all
    numeric_cols = [
        "complexity_num", "nb_collaborateurs", "Durée (mois)",
        "Budget Estimé (TND)", "Heures Estimées",
        "heures_par_mois", "budget_par_heure",
        "start_month", "start_quarter", "valide_manager",
    ]

    target_cols = [
        "Heures Réelles", "Budget Réel (TND)",
        "overrun_ratio", "margin_pct", "over_budget",
    ]

    meta_cols = [
        "ID Projet", "Nom du Client", "Type de Mission",
        "Secteur d'Activité", "Segment", "complexity",
        "Noms Collaborateurs",
    ]

    result = pd.concat(
        [
            df[meta_cols].reset_index(drop=True),
            df[numeric_cols].reset_index(drop=True),
            seg_dummies.reset_index(drop=True),
            sec_dummies.reset_index(drop=True),
            mis_dummies.reset_index(drop=True),
            per_dummies.reset_index(drop=True),
            df[target_cols].reset_index(drop=True),
        ],
        axis=1,
    )

    return result


def get_feature_columns(df: pd.DataFrame) -> list[str]:
    """Return only the feature columns (no meta, no targets)."""
    exclude = {
        "ID Projet", "Nom du Client", "Type de Mission",
        "Secteur d'Activité", "Segment", "complexity",
        "Noms Collaborateurs",
        "Heures Réelles", "Budget Réel (TND)",
        "overrun_ratio", "margin_pct", "over_budget",
    }
    return [c for c in df.columns if c not in exclude]


def run_preprocessing(raw_path: Path = RAW_PATH, save: bool = True) -> pd.DataFrame:
    print("Loading and cleaning data...")
    df = load_and_clean(raw_path)
    print(f"  After cleaning: {len(df)} rows")

    print("Engineering features...")
    df = engineer_features(df)

    print("Encoding categoricals...")
    df = encode_categoricals(df)
    print(f"  Final shape: {df.shape}")

    if save:
        df.to_csv(PROCESSED_PATH, index=False)
        print(f"  Saved to {PROCESSED_PATH}")

    return df


if __name__ == "__main__":
    run_preprocessing()
