"""
main.py
FastAPI microservice exposing /predict and /retrain endpoints.
Run with: uvicorn main:app --port 8000 --reload
"""

import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from preprocessing import (
    COMPLEXITY_MAP, SEGMENT_CATEGORIES, SECTEUR_CATEGORIES,
    MISSION_CATEGORIES, PERIODE_CATEGORIES,
    load_and_clean, engineer_features, encode_categoricals,
    get_feature_columns, RAW_PATH,
)
from train import train

MODELS_DIR = Path(__file__).parent / "models"

# ── Global model store ─────────────────────────────────────────────────────────

class ModelStore:
    scaler = None
    model_hours_q10 = None
    model_hours_q50 = None
    model_hours_q90 = None
    model_cost = None
    knn = None
    feature_cols: list[str] = []
    df_meta: pd.DataFrame = None


store = ModelStore()


def load_models():
    """Load all pkl files into the global store."""
    names = [
        "scaler", "model_hours_q10", "model_hours_q50",
        "model_hours_q90", "model_cost", "knn", "feature_cols", "df_meta",
    ]
    for name in names:
        path = MODELS_DIR / f"{name}.pkl"
        if not path.exists():
            raise FileNotFoundError(
                f"Model file {path} not found. Run train.py first."
            )
        with open(path, "rb") as f:
            setattr(store, name, pickle.load(f))
    print(f"✓ Models loaded ({len(store.feature_cols)} features)")


# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_models()
    yield


app = FastAPI(title="B2A Estimation API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response schemas ─────────────────────────────────────────────────

class PredictRequest(BaseModel):
    type_mission: str = Field(..., description="Type de Mission")
    secteur: str = Field(..., description="Secteur d'Activité")
    complexity: str = Field(..., description="Faible | Moyenne | Élevée | Critique")
    nb_junior: int = Field(default=1, ge=0)
    nb_senior: int = Field(default=0, ge=0)
    nb_manager: int = Field(default=0, ge=0)
    duree_mois: Optional[int] = Field(default=4, ge=1, le=36)
    budget_estime: Optional[float] = Field(default=None, ge=0)
    heures_estimees: Optional[float] = Field(default=None, ge=0)
    segment: Optional[str] = Field(default="PME")
    periode_contrat: Optional[str] = Field(default="Annuel")
    strict_deadline: bool = Field(default=False)


class SimilarProject(BaseModel):
    client: str
    secteur: str
    type_mission: str
    heures_estimees: int
    heures_reelles: int
    margin_pct: float
    over_budget: bool


class PredictResponse(BaseModel):
    hours_min: int
    hours_likely: int
    hours_max: int
    cost_min: int
    cost_max: int
    overrun_rate: float
    avg_margin_pct: float
    similar_projects: list[SimilarProject]
    nb_similar: int
    confidence: str


# ── Feature builder ────────────────────────────────────────────────────────────

def build_feature_vector(req: PredictRequest) -> np.ndarray:
    """
    Build a single feature vector matching the training feature columns.
    We construct a one-row DataFrame that mirrors the processed training data.
    """
    nb_collabs = req.nb_junior + req.nb_senior + req.nb_manager
    complexity_num = COMPLEXITY_MAP.get(req.complexity, 1)

    # Estimate budget and hours if not provided
    # Use median ratio from data: budget ≈ heures * avg_rate
    # avg_rate ≈ 105 TND/h (from training data mean budget/hours)
    AVG_RATE = 105.0

    if req.heures_estimees and req.heures_estimees > 0:
        heures_est = req.heures_estimees
    else:
        # Rough estimate: complexity * duration * collabs * base
        base = {"Faible": 20, "Moyenne": 30, "Élevée": 45, "Critique": 60}
        heures_est = base.get(req.complexity, 30) * req.duree_mois * max(nb_collabs, 1)

    if req.budget_estime and req.budget_estime > 0:
        budget_est = req.budget_estime
    else:
        budget_est = heures_est * AVG_RATE

    heures_par_mois = heures_est / max(req.duree_mois, 1)
    budget_par_heure = budget_est / max(heures_est, 1)

    # Build numeric features
    numeric = {
        "complexity_num": complexity_num,
        "nb_collaborateurs": nb_collabs,
        "Durée (mois)": req.duree_mois,
        "Budget Estimé (TND)": budget_est,
        "Heures Estimées": heures_est,
        "heures_par_mois": heures_par_mois,
        "budget_par_heure": budget_par_heure,
        "start_month": 1,   # default — unknown at estimation time
        "start_quarter": 1,
        "valide_manager": 0,
    }

    # One-hot categoricals
    def one_hot(categories: list[str], value: str, prefix: str) -> dict:
        return {
            f"{prefix}_{cat}": int(cat == value)
            for cat in categories
        }

    ohe = {}
    ohe.update(one_hot(SEGMENT_CATEGORIES,  req.segment or "PME",          "seg"))
    ohe.update(one_hot(SECTEUR_CATEGORIES,  req.secteur,                   "sec"))
    ohe.update(one_hot(MISSION_CATEGORIES,  req.type_mission,              "mis"))
    ohe.update(one_hot(PERIODE_CATEGORIES,  req.periode_contrat or "Annuel", "per"))

    all_features = {**numeric, **ohe}

    # Align to training feature columns (fill missing with 0)
    vector = np.array([all_features.get(col, 0) for col in store.feature_cols], dtype=float)
    return vector, heures_est, budget_est


# ── Predict endpoint ───────────────────────────────────────────────────────────

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    try:
        vector, heures_est, budget_est = build_feature_vector(req)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Feature building failed: {e}")

    # Scale
    X = store.scaler.transform(vector.reshape(1, -1))

    # Hours predictions
    h_min    = int(round(store.model_hours_q10.predict(X)[0]))
    h_likely = int(round(store.model_hours_q50.predict(X)[0]))
    h_max    = int(round(store.model_hours_q90.predict(X)[0]))

    # Strict deadline buffer
    if req.strict_deadline:
        h_max = int(round(h_max * 1.10))

    # Ensure ordering
    h_min    = max(h_min, 1)
    h_likely = max(h_likely, h_min)
    h_max    = max(h_max, h_likely)

    # Cost predictions
    c_base = store.model_cost.predict(X)[0]
    # Cost range mirrors hours range ratio
    ratio_low  = h_min    / max(h_likely, 1)
    ratio_high = h_max    / max(h_likely, 1)
    c_min = int(round(c_base * ratio_low))
    c_max = int(round(c_base * ratio_high))
    if req.strict_deadline:
        c_max = int(round(c_max * 1.10))

    # ── Similar projects via KNN ───────────────────────────────────────────────
    distances, indices = store.knn.kneighbors(X, n_neighbors=6)
    indices = indices[0]
    distances = distances[0]

    # Exclude exact match (distance == 0), take top 5
    similar_rows = []
    for idx, dist in zip(indices, distances):
        row = store.df_meta.iloc[idx]
        similar_rows.append(row)
        if len(similar_rows) == 5:
            break

    # Compute stats from similar pool
    over_budget_count = sum(1 for r in similar_rows if r["over_budget"] == 1)
    overrun_rate = round(over_budget_count / max(len(similar_rows), 1) * 100, 1)
    avg_margin = round(
        sum(r["margin_pct"] for r in similar_rows) / max(len(similar_rows), 1), 1
    )

    similar_projects = [
        SimilarProject(
            client=str(r["Nom du Client"]),
            secteur=str(r["Secteur d'Activité"]),
            type_mission=str(r["Type de Mission"]),
            heures_estimees=int(r["Heures Estimées"]),
            heures_reelles=int(r["Heures Réelles"]),
            margin_pct=round(float(r["margin_pct"]), 1),
            over_budget=bool(r["over_budget"]),
        )
        for r in similar_rows
    ]

    # Confidence based on how many similar projects exist in same type+sector
    df = store.df_meta
    pool_size = len(df[
        (df["Type de Mission"] == req.type_mission) &
        (df["Secteur d'Activité"] == req.secteur)
    ])
    confidence = "high" if pool_size >= 30 else "medium" if pool_size >= 10 else "low"

    return PredictResponse(
        hours_min=h_min,
        hours_likely=h_likely,
        hours_max=h_max,
        cost_min=c_min,
        cost_max=c_max,
        overrun_rate=overrun_rate,
        avg_margin_pct=avg_margin,
        similar_projects=similar_projects,
        nb_similar=pool_size,
        confidence=confidence,
    )


# ── Retrain endpoint ───────────────────────────────────────────────────────────

@app.post("/retrain")
async def retrain(file: UploadFile = File(...)):
    """
    Accept a new Excel file, merge with existing data, retrain models.
    Called from Node.js when admin uploads new data from the UI.
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only .xlsx / .xls files accepted")

    # Save new file
    new_path = Path(__file__).parent / "data" / "upload_new.xlsx"
    contents = await file.read()
    with open(new_path, "wb") as f:
        f.write(contents)

    # Load and merge
    try:
        df_existing = pd.read_excel(RAW_PATH) if RAW_PATH.exists() else pd.DataFrame()
        df_new = pd.read_excel(new_path)
        df_merged = pd.concat([df_existing, df_new], ignore_index=True)
        df_merged = df_merged.drop_duplicates(subset=["ID Projet"], keep="last")

        # Save merged as new raw
        df_merged.to_excel(RAW_PATH, index=False)
        print(f"Merged dataset: {len(df_merged)} rows")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Merge failed: {e}")

    # Retrain
    try:
        train(force_preprocess=True)
        load_models()  # reload into memory
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {e}")

    return {
        "message": "Retrain complete",
        "total_rows": len(df_merged),
    }


# ── Health check ───────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": store.scaler is not None,
        "training_rows": len(store.df_meta) if store.df_meta is not None else 0,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
