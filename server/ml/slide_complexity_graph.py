"""
slide_complexity_graph.py
Generates "Predicted Mission Hours by Complexity Level" using real model predictions.
"""

import sys, pickle
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path
from sklearn.model_selection import train_test_split

sys.path.insert(0, str(Path(__file__).parent.resolve()))
from preprocessing import get_feature_columns, COMPLEXITY_MAP

MODELS_DIR = Path(__file__).parent / "models"
df = pd.read_csv(Path(__file__).parent / "data" / "processed.csv", encoding="utf-8-sig")

hours_col = [c for c in df.columns if "elles" in c][0]
feature_cols = get_feature_columns(df)

X       = df[feature_cols].fillna(0).to_numpy()
y_hours = df[hours_col].to_numpy()
idx     = np.arange(len(df))

_, _, _, _, _, idx_test = train_test_split(X, y_hours, idx, test_size=0.15, random_state=42)

def load(name):
    with open(MODELS_DIR / f"{name}.pkl", "rb") as f:
        return pickle.load(f)

scaler = load("scaler")
q10    = load("model_hours_q10")
q50    = load("model_hours_q50")
q90    = load("model_hours_q90")

X_all_s = scaler.transform(X)
pq10_all = q10.predict(X_all_s)
pq50_all = q50.predict(X_all_s)
pq90_all = q90.predict(X_all_s)

# Complexity labels in order
complexity_order = ["Faible", "Moyenne", "Élevée", "Critique"]
complexity_col   = "complexity"

records = []
for label in complexity_order:
    mask = df[complexity_col] == label
    if mask.sum() == 0:
        continue
    records.append({
        "label":   label,
        "n":       mask.sum(),
        "q10_med": np.median(pq10_all[mask]),
        "q50_med": np.median(pq50_all[mask]),
        "q90_med": np.median(pq90_all[mask]),
        "q10_p25": np.percentile(pq10_all[mask], 25),
        "q10_p75": np.percentile(pq10_all[mask], 75),
        "q50_p25": np.percentile(pq50_all[mask], 25),
        "q50_p75": np.percentile(pq50_all[mask], 75),
        "q90_p25": np.percentile(pq90_all[mask], 25),
        "q90_p75": np.percentile(pq90_all[mask], 75),
    })

res = pd.DataFrame(records)
x   = np.arange(len(res))

# ── Plot ───────────────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(10, 6))
fig.patch.set_facecolor("#F8FAFC")
ax.set_facecolor("#F8FAFC")

ax.fill_between(x, res["q10_med"], res["q90_med"],
                alpha=0.12, color="#2563EB", label="_nolegend_")

ax.plot(x, res["q10_med"], "o-", color="#16A34A", lw=2.5, ms=8,
        label="Q10 — Optimistic")
ax.plot(x, res["q50_med"], "o-", color="#EAB308", lw=2.5, ms=8,
        label="Q50 — Median Estimate")
ax.plot(x, res["q90_med"], "o-", color="#DC2626", lw=2.5, ms=8,
        label="Q90 — Pessimistic")

for i, row in res.iterrows():
    for col, color in [("q10_med", "#16A34A"), ("q50_med", "#EAB308"), ("q90_med", "#DC2626")]:
        ax.annotate(f"{row[col]:.0f}h",
                    xy=(i, row[col]),
                    xytext=(0, 10), textcoords="offset points",
                    ha="center", fontsize=10, fontweight="bold", color=color)

ax.set_xticks(x)
ax.set_xticklabels(
    [f"{row['label']}\n(n={row['n']})" for _, row in res.iterrows()],
    fontsize=12
)
ax.set_ylabel("Estimated Hours", fontsize=13)
ax.set_title("Predicted Mission Hours by Complexity Level", fontsize=16, fontweight="bold", pad=16)
ax.legend(fontsize=11, loc="upper left",
          framealpha=0.85, edgecolor="#CBD5E1")
ax.grid(axis="y", linestyle="--", alpha=0.6, color="#E2E8F0")
ax.spines[["top", "right"]].set_visible(False)
ax.set_ylim(0, res["q90_med"].max() * 1.25)

fig.text(0.12, 0.01, "B2A Smart-Resource", fontsize=9, color="#9CA3AF")

fig.tight_layout()
fig.savefig("slide_complexity_hours.png", dpi=180, bbox_inches="tight")
print("Saved: slide_complexity_hours.png")
plt.show()
