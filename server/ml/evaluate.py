"""
evaluate.py
Model quality scorecard for the estimation ML pipeline.

Usage:
  python evaluate.py
"""

from __future__ import annotations

import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

from preprocessing import PROCESSED_PATH, run_preprocessing, get_feature_columns


MODELS_DIR = Path(__file__).parent / "models"


def mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
	denom = np.maximum(np.abs(y_true), 1.0)
	return float(np.mean(np.abs((y_true - y_pred) / denom)) * 100)


def load_pickle(name: str):
	path = MODELS_DIR / f"{name}.pkl"
	if not path.exists():
		raise FileNotFoundError(f"Missing model artifact: {path}")
	with open(path, "rb") as f:
		return pickle.load(f)


def print_overall_metrics(df_test: pd.DataFrame) -> None:
	y_hours = df_test["Heures Réelles"].to_numpy()
	y_cost = df_test["Budget Réel (TND)"].to_numpy()

	pred_q10 = df_test["pred_q10"].to_numpy()
	pred_q50 = df_test["pred_q50"].to_numpy()
	pred_q90 = df_test["pred_q90"].to_numpy()
	pred_cost = df_test["pred_cost"].to_numpy()

	baseline_hours = df_test["Heures Estimées"].to_numpy()
	baseline_cost = df_test["Budget Estimé (TND)"].to_numpy()

	coverage_10_90 = float(np.mean((y_hours >= pred_q10) & (y_hours <= pred_q90)) * 100)
	below_q50 = float(np.mean(y_hours <= pred_q50) * 100)

	print("\n=== Overall Scorecard (Test Set) ===")
	print(f"Rows: {len(df_test)}")

	print("\nHours model (q50):")
	print(f"  MAE:  {mean_absolute_error(y_hours, pred_q50):.2f} h")
	print(f"  MAPE: {mape(y_hours, pred_q50):.2f}%")
	print(f"  R2:   {r2_score(y_hours, pred_q50):.4f}")

	print("\nCost model:")
	print(f"  MAE:  {mean_absolute_error(y_cost, pred_cost):.2f} TND")
	print(f"  MAPE: {mape(y_cost, pred_cost):.2f}%")
	print(f"  R2:   {r2_score(y_cost, pred_cost):.4f}")

	print("\nQuantile calibration (hours):")
	print(f"  Coverage q10-q90: {coverage_10_90:.2f}% (target around 80%)")
	print(f"  y <= q50 rate:    {below_q50:.2f}% (target around 50%)")

	print("\nBaseline comparison:")
	print(f"  Baseline hours MAE (Heures Estimees): {mean_absolute_error(y_hours, baseline_hours):.2f} h")
	print(f"  Model hours MAE (q50):                {mean_absolute_error(y_hours, pred_q50):.2f} h")
	print(f"  Baseline cost MAE (Budget Estime):    {mean_absolute_error(y_cost, baseline_cost):.2f} TND")
	print(f"  Model cost MAE:                       {mean_absolute_error(y_cost, pred_cost):.2f} TND")


def print_slice_metrics(df_test: pd.DataFrame, column: str, min_rows: int = 20) -> None:
	rows = []
	for value, grp in df_test.groupby(column):
		if len(grp) < min_rows:
			continue
		y = grp["Heures Réelles"].to_numpy()
		pred = grp["pred_q50"].to_numpy()
		cov = float(np.mean((y >= grp["pred_q10"].to_numpy()) & (y <= grp["pred_q90"].to_numpy())) * 100)
		rows.append({
			"slice": value,
			"n": len(grp),
			"hours_mae": float(mean_absolute_error(y, pred)),
			"hours_mape": mape(y, pred),
			"coverage_10_90": cov,
		})

	if not rows:
		print(f"\nNo groups with at least {min_rows} rows for {column}.")
		return

	out = pd.DataFrame(rows).sort_values("hours_mae")
	print(f"\n=== Slice Metrics by {column} (n>={min_rows}) ===")
	with pd.option_context("display.max_rows", 200, "display.max_colwidth", 80):
		print(out.to_string(index=False, float_format=lambda x: f"{x:.2f}"))


def main() -> None:
	if not PROCESSED_PATH.exists():
		print("Processed dataset not found; running preprocessing...")
		df = run_preprocessing(save=True)
	else:
		df = pd.read_csv(PROCESSED_PATH)

	feature_cols = get_feature_columns(df)
	X = df[feature_cols].fillna(0).to_numpy()
	y_hours = df["Heures Réelles"].to_numpy()
	y_cost = df["Budget Réel (TND)"].to_numpy()
	idx = np.arange(len(df))

	_, X_test, _, y_hours_test, _, y_cost_test, _, idx_test = train_test_split(
		X, y_hours, y_cost, idx, test_size=0.15, random_state=42
	)

	scaler = load_pickle("scaler")
	model_q10 = load_pickle("model_hours_q10")
	model_q50 = load_pickle("model_hours_q50")
	model_q90 = load_pickle("model_hours_q90")
	model_cost = load_pickle("model_cost")

	X_test_s = scaler.transform(X_test)

	pred_q10 = model_q10.predict(X_test_s)
	pred_q50 = model_q50.predict(X_test_s)
	pred_q90 = model_q90.predict(X_test_s)
	pred_cost = model_cost.predict(X_test_s)

	df_test = df.iloc[idx_test].copy().reset_index(drop=True)
	df_test["Heures Réelles"] = y_hours_test
	df_test["Budget Réel (TND)"] = y_cost_test
	df_test["pred_q10"] = pred_q10
	df_test["pred_q50"] = pred_q50
	df_test["pred_q90"] = pred_q90
	df_test["pred_cost"] = pred_cost

	print_overall_metrics(df_test)
	print_slice_metrics(df_test, "Type de Mission")
	print_slice_metrics(df_test, "Secteur d'Activité")
	print_slice_metrics(df_test, "complexity")


if __name__ == "__main__":
	main()
