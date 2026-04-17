"""
train.py
Trains the ML models and saves them as .pkl files.

Models:
  1. GradientBoostingRegressor (quantile) x3  → hoursMin, hoursLikely, hoursMax
  2. GradientBoostingRegressor                → Budget Réel (cost prediction)
  3. KNeighborsRegressor                      → used for similar projects lookup
  4. StandardScaler                           → feature scaler
"""

import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

from preprocessing import run_preprocessing, get_feature_columns, PROCESSED_PATH

MODELS_DIR = Path(__file__).parent / "models"
MODELS_DIR.mkdir(exist_ok=True)


def train(force_preprocess: bool = False):
    # ── Load data ──────────────────────────────────────────────────────────────
    if force_preprocess or not PROCESSED_PATH.exists():
        df = run_preprocessing(save=True)
    else:
        print("Loading processed data from cache...")
        df = pd.read_csv(PROCESSED_PATH)

    feature_cols = get_feature_columns(df)
    X = df[feature_cols].fillna(0).values
    y_hours = df["Heures Réelles"].values
    y_cost = df["Budget Réel (TND)"].values

    print(f"\nTraining on {len(df)} rows, {len(feature_cols)} features")

    # ── Split ──────────────────────────────────────────────────────────────────
    X_train, X_test, yh_train, yh_test, yc_train, yc_test = train_test_split(
        X, y_hours, y_cost, test_size=0.15, random_state=42
    )

    # ── Scale ──────────────────────────────────────────────────────────────────
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    # ── Hours models (quantile regression) ────────────────────────────────────
    print("\nTraining hours quantile models...")
    models_hours = {}
    # Calibrated wider interval to improve empirical coverage on unseen data.
    # Kept artifact names (q10/q90) for API compatibility with existing code.
    for alpha, name in [(0.05, "q10"), (0.50, "q50"), (0.95, "q90")]:
        print(f"  Training {name} (alpha={alpha})...")
        m = GradientBoostingRegressor(
            loss="quantile",
            alpha=alpha,
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            min_samples_leaf=10,
            random_state=42,
        )
        m.fit(X_train_s, yh_train)
        pred = m.predict(X_test_s)
        mae = mean_absolute_error(yh_test, pred)
        print(f"    MAE: {mae:.1f} hours")
        models_hours[name] = m

    # Median model evaluation
    pred_median = models_hours["q50"].predict(X_test_s)
    r2 = r2_score(yh_test, pred_median)
    print(f"\n  Hours model R²: {r2:.4f}")
    print(f"  Hours model MAE (median): {mean_absolute_error(yh_test, pred_median):.1f}h")

    # ── Cost model ─────────────────────────────────────────────────────────────
    print("\nTraining cost model...")
    model_cost = GradientBoostingRegressor(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        min_samples_leaf=10,
        random_state=42,
    )
    model_cost.fit(X_train_s, yc_train)
    pred_cost = model_cost.predict(X_test_s)
    cost_mae = mean_absolute_error(yc_test, pred_cost)
    cost_r2 = r2_score(yc_test, pred_cost)
    print(f"  Cost model R²: {cost_r2:.4f}")
    print(f"  Cost model MAE: {cost_mae:.0f} TND")

    # ── KNN for similar projects ───────────────────────────────────────────────
    print("\nTraining KNN similarity model...")
    # Use all data (not just train) for the lookup index
    X_all_s = scaler.transform(df[feature_cols].fillna(0).values)
    knn = NearestNeighbors(n_neighbors=6, algorithm="ball_tree", metric="euclidean")
    knn.fit(X_all_s)
    print("  KNN fitted on full dataset")

    # ── Save everything ────────────────────────────────────────────────────────
    artifacts = {
        "scaler": scaler,
        "model_hours_q10": models_hours["q10"],
        "model_hours_q50": models_hours["q50"],
        "model_hours_q90": models_hours["q90"],
        "model_cost": model_cost,
        "knn": knn,
        "feature_cols": feature_cols,
        # Store raw processed df for similar project lookup (metadata only)
        "df_meta": df[[
            "ID Projet", "Nom du Client", "Type de Mission",
            "Secteur d'Activité", "Segment", "complexity",
            "Heures Estimées", "Heures Réelles", "Budget Estimé (TND)",
            "Budget Réel (TND)", "margin_pct", "over_budget",
        ]].reset_index(drop=True),
    }

    for name, obj in artifacts.items():
        path = MODELS_DIR / f"{name}.pkl"
        with open(path, "wb") as f:
            pickle.dump(obj, f)
        print(f"  Saved {path.name}")

    print("\n✓ Training complete. All models saved.")
    return artifacts


if __name__ == "__main__":
    train(force_preprocess=True)
