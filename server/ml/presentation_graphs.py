"""
presentation_graphs.py
Generates 4 clean standalone graphs for the jury presentation.
"""

import sys, pickle
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path
from sklearn.metrics import (confusion_matrix, accuracy_score,
                             precision_score, recall_score, f1_score, r2_score,
                             mean_absolute_error)
from sklearn.model_selection import train_test_split

sys.path.insert(0, str(Path(__file__).parent.resolve()))
from preprocessing import get_feature_columns

C_BLUE   = "#2563EB"
C_GREEN  = "#16A34A"
C_RED    = "#DC2626"
C_ORANGE = "#EA580C"
C_GRAY   = "#6B7280"
C_BG     = "#F8FAFC"
C_DARK   = "#1E293B"

plt.rcParams.update({
    "figure.facecolor": C_BG,
    "axes.facecolor":   C_BG,
    "axes.edgecolor":   "#CBD5E1",
    "axes.labelcolor":  C_DARK,
    "xtick.color":      C_DARK,
    "ytick.color":      C_DARK,
    "text.color":       C_DARK,
    "grid.color":       "#E2E8F0",
    "grid.linestyle":   "--",
    "grid.alpha":       0.7,
    "font.family":      "sans-serif",
    "font.size":        13,
})

MODELS_DIR = Path(__file__).parent / "models"
df = pd.read_csv(Path(__file__).parent / "data" / "processed.csv", encoding="utf-8-sig")

hours_col = [c for c in df.columns if "elles" in c][0]
cost_col  = [c for c in df.columns if "el (TND)" in c][0]
est_h_col = [c for c in df.columns if "stim" in c and "eure" in c][0]
est_c_col = [c for c in df.columns if "stim" in c and "TND" in c and "udget" in c][0]

feature_cols = get_feature_columns(df)
X       = df[feature_cols].fillna(0).to_numpy()
y_hours = df[hours_col].to_numpy()
y_cost  = df[cost_col].to_numpy()
y_ob    = df["over_budget"].to_numpy()
idx     = np.arange(len(df))

_, X_test, _, yh_test, _, yc_test, _, yob_test, _, idx_test = train_test_split(
    X, y_hours, y_cost, y_ob, idx, test_size=0.15, random_state=42
)

def load(name):
    with open(MODELS_DIR / f"{name}.pkl", "rb") as f:
        return pickle.load(f)

scaler   = load("scaler")
q50      = load("model_hours_q50")
q10      = load("model_hours_q10")
q90      = load("model_hours_q90")
cost_mdl = load("model_cost")

X_ts = scaler.transform(X_test)
pq50 = q50.predict(X_ts)
pq10 = q10.predict(X_ts)
pq90 = q90.predict(X_ts)
pc   = cost_mdl.predict(X_ts)

est_h = df.iloc[idx_test][est_h_col].to_numpy()
est_c = df.iloc[idx_test][est_c_col].to_numpy()
pred_ob_hours = (pq50 > est_h).astype(int)


# ── GRAPH 1 — Actual vs Predicted (Hours) ─────────────────────────────────────
fig, ax = plt.subplots(figsize=(8, 7))
fig.patch.set_facecolor(C_BG)

ax.scatter(yh_test, pq50, alpha=0.4, s=22, color=C_BLUE, zorder=3, label="Projects")
lim = max(yh_test.max(), pq50.max()) * 1.05
ax.plot([0, lim], [0, lim], "--", color=C_RED, lw=2, label="Perfect prediction")
ax.set_xlabel("Actual Hours", fontsize=14)
ax.set_ylabel("Predicted Hours (GBM q50)", fontsize=14)
ax.set_title("Actual vs Predicted Hours", fontsize=16, fontweight="bold", pad=14)
ax.legend(fontsize=12)
ax.grid(zorder=0)
r2 = r2_score(yh_test, pq50)
mae = mean_absolute_error(yh_test, pq50)
ax.text(0.05, 0.93,
        f"R² = {r2*100:.1f}%\nMAE = {mae:.0f} hours",
        transform=ax.transAxes, fontsize=13, color=C_BLUE, fontweight="bold",
        bbox=dict(facecolor="white", alpha=0.7, edgecolor=C_BLUE, boxstyle="round,pad=0.4"))

fig.tight_layout()
fig.savefig("slide_1a_actual_vs_predicted.png", dpi=180, bbox_inches="tight")
print("Saved: slide_1a_actual_vs_predicted.png")
plt.close()


# ── GRAPH 2 — Baseline vs ML (Hours + Cost) ───────────────────────────────────
fig, ax = plt.subplots(figsize=(8, 7))
fig.patch.set_facecolor(C_BG)

base_h_mae = mean_absolute_error(yh_test, est_h)
mod_h_mae  = mean_absolute_error(yh_test, pq50)
base_c_mae = mean_absolute_error(yc_test, est_c)
mod_c_mae  = mean_absolute_error(yc_test, pc)

imp_h = (base_h_mae - mod_h_mae) / base_h_mae * 100
imp_c = (base_c_mae - mod_c_mae) / base_c_mae * 100

x = np.arange(2)
w = 0.35
b1 = ax.bar(x - w/2, [base_h_mae, base_c_mae], w,
            label="Human estimate", color=C_GRAY, zorder=3)
b2 = ax.bar(x + w/2, [mod_h_mae, mod_c_mae], w,
            label="GBM model", color=C_BLUE, zorder=3)

ax.set_xticks(x)
ax.set_xticklabels(["Hours  (MAE in hours)", "Cost  (MAE in TND)"], fontsize=13)
ax.set_ylabel("Mean Absolute Error", fontsize=14)
ax.set_title("Human Estimate vs GBM Model\n(lower is better)", fontsize=16, fontweight="bold", pad=14)
ax.legend(fontsize=12)
ax.grid(axis="y", zorder=0)

for bar in [*b1, *b2]:
    v = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2, v + ax.get_ylim()[1]*0.01,
            f"{v:.0f}", ha="center", va="bottom", fontsize=12, fontweight="bold")

ax.text(0 + w/2 + 0.02, mod_h_mae + base_h_mae * 0.12,
        f"−{imp_h:.0f}%", color=C_GREEN, fontsize=14, fontweight="bold", ha="center")
ax.text(1 + w/2 + 0.02, mod_c_mae + base_c_mae * 0.05,
        f"−{imp_c:.0f}%", color=C_GREEN, fontsize=14, fontweight="bold", ha="center")

fig.tight_layout()
fig.savefig("slide_1b_baseline_vs_model.png", dpi=180, bbox_inches="tight")
print("Saved: slide_1b_baseline_vs_model.png")
plt.close()


# ── GRAPH 3 — Confusion Matrix (Hours overrun detection) ──────────────────────
fig, ax = plt.subplots(figsize=(7, 6))
fig.patch.set_facecolor(C_BG)

cm = confusion_matrix(yob_test, pred_ob_hours)
tn, fp, fn, tp = cm.ravel()
mat = np.array([[tn, fp], [fn, tp]])

im = ax.imshow(mat, cmap=plt.cm.Blues, vmin=0, vmax=mat.max())
ax.set_xticks([0, 1])
ax.set_yticks([0, 1])
ax.set_xticklabels(["Predicted: No overrun", "Predicted: Overrun"], fontsize=12)
ax.set_yticklabels(["Actual: No overrun", "Actual: Overrun"], fontsize=12)
ax.set_xlabel("Predicted", fontsize=13)
ax.set_ylabel("Actual", fontsize=13)
ax.set_title("Overrun Detection — Confusion Matrix\n(GBM Hours Model)", fontsize=15, fontweight="bold", pad=14)

thresh = mat.max() / 2
cell_labels = [["TN", "FP"], ["FN", "TP"]]
for i in range(2):
    for j in range(2):
        color = "white" if mat[i, j] > thresh else C_DARK
        ax.text(j, i, f"{cell_labels[i][j]}\n{mat[i,j]}",
                ha="center", va="center", color=color, fontsize=18, fontweight="bold")

acc  = accuracy_score(yob_test, pred_ob_hours) * 100
prec = precision_score(yob_test, pred_ob_hours, zero_division=0) * 100
rec  = recall_score(yob_test, pred_ob_hours, zero_division=0) * 100
f1   = f1_score(yob_test, pred_ob_hours, zero_division=0) * 100
ax.set_xlabel(
    f"Accuracy = {acc:.1f}%     Precision = {prec:.1f}%     Recall = {rec:.1f}%     F1 = {f1:.1f}%",
    fontsize=11
)

fig.tight_layout()
fig.savefig("slide_2a_confusion_matrix.png", dpi=180, bbox_inches="tight")
print("Saved: slide_2a_confusion_matrix.png")
plt.close()


# ── GRAPH 4 — Quantile Interval (calibrated range) ────────────────────────────
fig, ax = plt.subplots(figsize=(9, 6))
fig.patch.set_facecolor(C_BG)

sort_idx = np.argsort(yh_test)
sample   = sort_idx[::max(1, len(sort_idx) // 120)]
x        = np.arange(len(sample))

ax.fill_between(x, pq10[sample], pq90[sample],
                alpha=0.25, color=C_BLUE, label="Confidence interval (q10–q90)")
ax.plot(x, pq50[sample], color=C_BLUE, lw=2, label="GBM prediction (q50)")
ax.plot(x, yh_test[sample], "o", color=C_RED, ms=4, alpha=0.65, label="Actual hours")

cov = float(np.mean((yh_test >= pq10) & (yh_test <= pq90)) * 100)
below50 = float(np.mean(yh_test <= pq50) * 100)

ax.set_xlabel("Projects (sorted by actual hours)", fontsize=14)
ax.set_ylabel("Hours", fontsize=14)
ax.set_title("Calibrated Prediction Interval\n(every prediction comes with a range)", fontsize=15, fontweight="bold", pad=14)
ax.legend(fontsize=11, loc="upper left")
ax.grid(zorder=0)
ax.text(0.98, 0.06,
        f"Interval coverage: {cov:.1f}%  (target 80%)\nActual ≤ q50: {below50:.1f}%  (target 50%)",
        transform=ax.transAxes, fontsize=11, color=C_BLUE, fontweight="bold",
        ha="right", va="bottom",
        bbox=dict(facecolor="white", alpha=0.75, edgecolor=C_BLUE, boxstyle="round,pad=0.4"))

fig.tight_layout()
fig.savefig("slide_2b_quantile_interval.png", dpi=180, bbox_inches="tight")
print("Saved: slide_2b_quantile_interval.png")
plt.close()

print("\nDone. 4 presentation graphs saved in server/ml/")
