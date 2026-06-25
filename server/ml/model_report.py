"""
model_report.py
Generates a full visual report for all ML models in the pipeline.
Run: python model_report.py
"""

import sys, pickle
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import matplotlib.patches as mpatches
from pathlib import Path
from sklearn.metrics import (
    confusion_matrix, accuracy_score, precision_score,
    recall_score, f1_score, r2_score, mean_absolute_error,
)
from sklearn.model_selection import train_test_split

sys.path.insert(0, str(Path(__file__).parent.resolve()))
from preprocessing import get_feature_columns

# ── palette ────────────────────────────────────────────────────────────────────
C_BLUE   = "#2563EB"
C_GREEN  = "#16A34A"
C_RED    = "#DC2626"
C_ORANGE = "#EA580C"
C_PURPLE = "#7C3AED"
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
})

# ── load data & models ─────────────────────────────────────────────────────────
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
q10      = load("model_hours_q10")
q50      = load("model_hours_q50")
q90      = load("model_hours_q90")
cost_mdl = load("model_cost")

X_ts = scaler.transform(X_test)
pq10 = q10.predict(X_ts)
pq50 = q50.predict(X_ts)
pq90 = q90.predict(X_ts)
pc   = cost_mdl.predict(X_ts)

est_h = df.iloc[idx_test][est_h_col].to_numpy()
est_c = df.iloc[idx_test][est_c_col].to_numpy()

pred_ob_hours = (pq50 > est_h).astype(int)
pred_ob_cost  = (pc   > est_c).astype(int)

def mape(yt, yp):
    return float(np.mean(np.abs((yt - yp) / np.maximum(np.abs(yt), 1.0))) * 100)

def within_pct(yt, yp, pct):
    return float(np.mean(np.abs((yt - yp) / np.maximum(np.abs(yt), 1.0)) <= pct / 100) * 100)

# ── helpers ────────────────────────────────────────────────────────────────────
def bar_metric(ax, labels, values, colors, title, ylabel="%", ylim=(0, 100)):
    bars = ax.bar(labels, values, color=colors, width=0.55, zorder=3)
    ax.set_title(title, fontsize=11, fontweight="bold", pad=10)
    ax.set_ylabel(ylabel, fontsize=9)
    ax.set_ylim(*ylim)
    ax.grid(axis="y", zorder=0)
    ax.tick_params(axis="x", labelsize=8)
    for bar, val in zip(bars, values):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + ylim[1] * 0.015,
            f"{val:.1f}{'%' if ylabel=='%' else ''}",
            ha="center", va="bottom", fontsize=8, fontweight="bold",
        )
    return bars


def draw_confusion(ax, cm, title, labels=("No overrun", "Overrun")):
    tn, fp, fn, tp = cm.ravel()
    mat = np.array([[tn, fp], [fn, tp]])
    cmap = plt.cm.Blues
    im = ax.imshow(mat, cmap=cmap, vmin=0, vmax=mat.max())
    ax.set_title(title, fontsize=11, fontweight="bold", pad=10)
    ax.set_xticks([0, 1]); ax.set_yticks([0, 1])
    ax.set_xticklabels(["Pred: No overrun", "Pred: Overrun"], fontsize=8)
    ax.set_yticklabels(["Actual: No overrun", "Actual: Overrun"], fontsize=8)
    ax.set_xlabel("Predicted", fontsize=9)
    ax.set_ylabel("Actual", fontsize=9)
    thresh = mat.max() / 2
    cell_labels = [["TN", "FP"], ["FN", "TP"]]
    for i in range(2):
        for j in range(2):
            color = "white" if mat[i, j] > thresh else C_DARK
            ax.text(j, i, f"{cell_labels[i][j]}\n{mat[i,j]}",
                    ha="center", va="center", color=color, fontsize=12, fontweight="bold")
    return im


# ══════════════════════════════════════════════════════════════════════════════
# FIGURE 1 — Hours Model (q50)
# ══════════════════════════════════════════════════════════════════════════════
fig1, axes = plt.subplots(2, 3, figsize=(16, 10))
fig1.suptitle("Model 1 — Hours Estimator (q50 · GradientBoostingRegressor)",
              fontsize=14, fontweight="bold", y=1.01)
fig1.patch.set_facecolor(C_BG)

# 1a — Actual vs Predicted scatter
ax = axes[0, 0]
ax.scatter(yh_test, pq50, alpha=0.35, s=18, color=C_BLUE, zorder=3)
lim = max(yh_test.max(), pq50.max()) * 1.05
ax.plot([0, lim], [0, lim], "--", color=C_RED, lw=1.5, label="Perfect fit")
ax.set_xlabel("Actual Hours", fontsize=9)
ax.set_ylabel("Predicted Hours", fontsize=9)
ax.set_title("Actual vs Predicted", fontsize=11, fontweight="bold", pad=10)
ax.legend(fontsize=8)
ax.grid(zorder=0)
r2 = r2_score(yh_test, pq50)
ax.text(0.05, 0.92, f"R² = {r2*100:.2f}%", transform=ax.transAxes,
        fontsize=9, color=C_BLUE, fontweight="bold")

# 1b — Residuals distribution
ax = axes[0, 1]
residuals = pq50 - yh_test
ax.hist(residuals, bins=40, color=C_BLUE, alpha=0.75, edgecolor="white", zorder=3)
ax.axvline(0, color=C_RED, lw=2, linestyle="--", label="Zero error")
ax.axvline(residuals.mean(), color=C_ORANGE, lw=1.5, linestyle=":", label=f"Mean={residuals.mean():.1f}h")
ax.set_xlabel("Residual (Predicted − Actual) hours", fontsize=9)
ax.set_ylabel("Count", fontsize=9)
ax.set_title("Residuals Distribution", fontsize=11, fontweight="bold", pad=10)
ax.legend(fontsize=8)
ax.grid(zorder=0)

# 1c — Key metrics bar chart
ax = axes[0, 2]
metrics  = ["R²", "Within ±10%", "Within ±20%", "Within ±30%"]
values   = [r2*100, within_pct(yh_test, pq50, 10),
            within_pct(yh_test, pq50, 20), within_pct(yh_test, pq50, 30)]
colors   = [C_PURPLE, C_RED, C_ORANGE, C_GREEN]
bar_metric(ax, metrics, values, colors, "Key Metrics (%)")

# 1d — Error % distribution (MAPE per sample)
ax = axes[1, 0]
pct_errors = np.abs((yh_test - pq50) / np.maximum(np.abs(yh_test), 1.0)) * 100
bins = [0, 5, 10, 20, 30, 50, 100, max(pct_errors.max() + 1, 101)]
counts, edges = np.histogram(pct_errors, bins=bins)
bar_colors = [C_GREEN, C_GREEN, C_BLUE, C_BLUE, C_ORANGE, C_RED, C_RED]
ax.bar(range(len(counts)), counts / len(pct_errors) * 100,
       color=bar_colors, width=0.7, zorder=3, edgecolor="white")
ax.set_xticks(range(len(counts)))
ax.set_xticklabels(["0-5%","5-10%","10-20%","20-30%","30-50%","50-100%",">100%"], fontsize=7, rotation=20)
ax.set_ylabel("% of predictions", fontsize=9)
ax.set_title("Error % Breakdown per Prediction", fontsize=11, fontweight="bold", pad=10)
ax.grid(axis="y", zorder=0)
for i, (cnt, c) in enumerate(zip(counts, bar_colors)):
    ax.text(i, cnt / len(pct_errors) * 100 + 0.5, f"{cnt/len(pct_errors)*100:.1f}%",
            ha="center", va="bottom", fontsize=7)

# 1e — Quantile interval plot (sorted sample)
ax = axes[1, 1]
sort_idx = np.argsort(yh_test)
sample = sort_idx[::max(1, len(sort_idx)//120)]
x = np.arange(len(sample))
ax.fill_between(x, pq10[sample], pq90[sample], alpha=0.25, color=C_BLUE, label="q10-q90 interval")
ax.plot(x, pq50[sample], color=C_BLUE, lw=1.5, label="q50 prediction")
ax.plot(x, yh_test[sample], "o", color=C_RED, ms=3, alpha=0.6, label="Actual")
cov = float(np.mean((yh_test >= pq10) & (yh_test <= pq90)) * 100)
ax.set_xlabel("Projects (sorted by actual hours)", fontsize=9)
ax.set_ylabel("Hours", fontsize=9)
ax.set_title(f"Quantile Interval  |  Coverage = {cov:.1f}%", fontsize=11, fontweight="bold", pad=10)
ax.legend(fontsize=7)
ax.grid(zorder=0)

# 1f — Confusion matrix (overrun detection)
ax = axes[1, 2]
cm_h = confusion_matrix(yob_test, pred_ob_hours)
draw_confusion(ax, cm_h, "Confusion Matrix — Overrun Detection")
acc  = accuracy_score(yob_test, pred_ob_hours) * 100
prec = precision_score(yob_test, pred_ob_hours, zero_division=0) * 100
rec  = recall_score(yob_test, pred_ob_hours, zero_division=0) * 100
f1   = f1_score(yob_test, pred_ob_hours, zero_division=0) * 100
ax.set_xlabel(
    f"Accuracy={acc:.1f}%  Precision={prec:.1f}%  Recall={rec:.1f}%  F1={f1:.1f}%",
    fontsize=7.5
)

fig1.tight_layout()
fig1.savefig("report_hours_model.png", dpi=150, bbox_inches="tight")
print("Saved: report_hours_model.png")


# ══════════════════════════════════════════════════════════════════════════════
# FIGURE 2 — Cost Model
# ══════════════════════════════════════════════════════════════════════════════
fig2, axes = plt.subplots(2, 3, figsize=(16, 10))
fig2.suptitle("Model 4 — Cost Estimator (GradientBoostingRegressor)",
              fontsize=14, fontweight="bold", y=1.01)
fig2.patch.set_facecolor(C_BG)

# 2a — Actual vs Predicted
ax = axes[0, 0]
ax.scatter(yc_test, pc, alpha=0.35, s=18, color=C_GREEN, zorder=3)
lim = max(yc_test.max(), pc.max()) * 1.05
ax.plot([0, lim], [0, lim], "--", color=C_RED, lw=1.5, label="Perfect fit")
ax.set_xlabel("Actual Cost (TND)", fontsize=9)
ax.set_ylabel("Predicted Cost (TND)", fontsize=9)
ax.set_title("Actual vs Predicted", fontsize=11, fontweight="bold", pad=10)
ax.legend(fontsize=8)
ax.grid(zorder=0)
r2c = r2_score(yc_test, pc)
ax.text(0.05, 0.92, f"R² = {r2c*100:.2f}%", transform=ax.transAxes,
        fontsize=9, color=C_GREEN, fontweight="bold")

# 2b — Residuals
ax = axes[0, 1]
res_c = pc - yc_test
ax.hist(res_c, bins=40, color=C_GREEN, alpha=0.75, edgecolor="white", zorder=3)
ax.axvline(0, color=C_RED, lw=2, linestyle="--", label="Zero error")
ax.axvline(res_c.mean(), color=C_ORANGE, lw=1.5, linestyle=":", label=f"Mean={res_c.mean():.0f} TND")
ax.set_xlabel("Residual (Predicted − Actual) TND", fontsize=9)
ax.set_ylabel("Count", fontsize=9)
ax.set_title("Residuals Distribution", fontsize=11, fontweight="bold", pad=10)
ax.legend(fontsize=8)
ax.grid(zorder=0)

# 2c — Key metrics
ax = axes[0, 2]
vals_c = [r2c*100, within_pct(yc_test, pc, 10),
          within_pct(yc_test, pc, 20), within_pct(yc_test, pc, 30)]
bar_metric(ax, ["R²","Within ±10%","Within ±20%","Within ±30%"],
           vals_c, [C_PURPLE, C_RED, C_ORANGE, C_GREEN], "Key Metrics (%)")

# 2d — Error % breakdown
ax = axes[1, 0]
pct_errors_c = np.abs((yc_test - pc) / np.maximum(np.abs(yc_test), 1.0)) * 100
bins = [0, 5, 10, 20, 30, 50, 100, max(pct_errors_c.max() + 1, 101)]
counts_c, _ = np.histogram(pct_errors_c, bins=bins)
ax.bar(range(len(counts_c)), counts_c / len(pct_errors_c) * 100,
       color=[C_GREEN, C_GREEN, C_BLUE, C_BLUE, C_ORANGE, C_RED, C_RED],
       width=0.7, zorder=3, edgecolor="white")
ax.set_xticks(range(len(counts_c)))
ax.set_xticklabels(["0-5%","5-10%","10-20%","20-30%","30-50%","50-100%",">100%"], fontsize=7, rotation=20)
ax.set_ylabel("% of predictions", fontsize=9)
ax.set_title("Error % Breakdown per Prediction", fontsize=11, fontweight="bold", pad=10)
ax.grid(axis="y", zorder=0)
for i, cnt in enumerate(counts_c):
    ax.text(i, cnt/len(pct_errors_c)*100 + 0.5, f"{cnt/len(pct_errors_c)*100:.1f}%",
            ha="center", va="bottom", fontsize=7)

# 2e — Baseline vs model comparison
ax = axes[1, 1]
base_h_mae = mean_absolute_error(yh_test, est_h)
mod_h_mae  = mean_absolute_error(yh_test, pq50)
base_c_mae = mean_absolute_error(yc_test, est_c)
mod_c_mae  = mean_absolute_error(yc_test, pc)

x = np.arange(2)
w = 0.35
bars1 = ax.bar(x - w/2, [base_h_mae, base_c_mae], w, label="Human Estimate (baseline)",
               color=C_GRAY, zorder=3)
bars2 = ax.bar(x + w/2, [mod_h_mae,  mod_c_mae],  w, label="ML Model",
               color=C_GREEN, zorder=3)
ax.set_xticks(x)
ax.set_xticklabels(["Hours MAE", "Cost MAE (TND)"], fontsize=9)
ax.set_title("Baseline vs ML Model (MAE)", fontsize=11, fontweight="bold", pad=10)
ax.legend(fontsize=8)
ax.grid(axis="y", zorder=0)
for bar in [*bars1, *bars2]:
    v = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2, v + ax.get_ylim()[1]*0.01,
            f"{v:.0f}", ha="center", va="bottom", fontsize=7.5, fontweight="bold")

# 2f — Confusion matrix cost
ax = axes[1, 2]
cm_c = confusion_matrix(yob_test, pred_ob_cost)
draw_confusion(ax, cm_c, "Confusion Matrix — Overrun Detection")
acc_c  = accuracy_score(yob_test, pred_ob_cost) * 100
prec_c = precision_score(yob_test, pred_ob_cost, zero_division=0) * 100
rec_c  = recall_score(yob_test, pred_ob_cost, zero_division=0) * 100
f1_c   = f1_score(yob_test, pred_ob_cost, zero_division=0) * 100
ax.set_xlabel(
    f"Accuracy={acc_c:.1f}%  Precision={prec_c:.1f}%  Recall={rec_c:.1f}%  F1={f1_c:.1f}%",
    fontsize=7.5
)

fig2.tight_layout()
fig2.savefig("report_cost_model.png", dpi=150, bbox_inches="tight")
print("Saved: report_cost_model.png")


# ══════════════════════════════════════════════════════════════════════════════
# FIGURE 3 — Quantile Models (q10 / q50 / q90) deep dive
# ══════════════════════════════════════════════════════════════════════════════
fig3, axes = plt.subplots(2, 2, figsize=(14, 10))
fig3.suptitle("Models 1-2-3 — Hours Quantile Interval Deep Dive",
              fontsize=14, fontweight="bold", y=1.01)
fig3.patch.set_facecolor(C_BG)

# 3a — MAE by quantile
ax = axes[0, 0]
q_labels = ["q10\n(lower bound)", "q50\n(median)", "q90\n(upper bound)"]
q_maes   = [mean_absolute_error(yh_test, pq10),
             mean_absolute_error(yh_test, pq50),
             mean_absolute_error(yh_test, pq90)]
q_mapes  = [mape(yh_test, pq10), mape(yh_test, pq50), mape(yh_test, pq90)]
bars = ax.bar(q_labels, q_maes, color=[C_BLUE, C_GREEN, C_PURPLE], width=0.5, zorder=3)
ax.set_ylabel("MAE (hours)", fontsize=9)
ax.set_title("MAE by Quantile Model", fontsize=11, fontweight="bold", pad=10)
ax.grid(axis="y", zorder=0)
for bar, v in zip(bars, q_maes):
    ax.text(bar.get_x() + bar.get_width()/2, v + 1, f"{v:.1f}h",
            ha="center", va="bottom", fontsize=9, fontweight="bold")

# 3b — MAPE by quantile
ax = axes[0, 1]
bars = ax.bar(q_labels, q_mapes, color=[C_BLUE, C_GREEN, C_PURPLE], width=0.5, zorder=3)
ax.set_ylabel("MAPE (%)", fontsize=9)
ax.set_title("MAPE by Quantile Model", fontsize=11, fontweight="bold", pad=10)
ax.grid(axis="y", zorder=0)
for bar, v in zip(bars, q_mapes):
    ax.text(bar.get_x() + bar.get_width()/2, v + 0.3, f"{v:.1f}%",
            ha="center", va="bottom", fontsize=9, fontweight="bold")

# 3c — Calibration: coverage at different quantile combos
ax = axes[1, 0]
combos  = ["q10-q90\n(current)", "below q50\n(actual)"]
targets = [80, 50]
actuals = [float(np.mean((yh_test >= pq10) & (yh_test <= pq90)) * 100),
           float(np.mean(yh_test <= pq50) * 100)]
x = np.arange(len(combos))
w = 0.35
ax.bar(x - w/2, targets, w, color=C_GRAY, label="Target", zorder=3)
ax.bar(x + w/2, actuals, w, color=C_GREEN, label="Actual", zorder=3)
ax.set_xticks(x); ax.set_xticklabels(combos, fontsize=9)
ax.set_ylabel("%", fontsize=9); ax.set_ylim(0, 110)
ax.set_title("Quantile Calibration", fontsize=11, fontweight="bold", pad=10)
ax.legend(fontsize=8); ax.grid(axis="y", zorder=0)
for xi, (t, a) in enumerate(zip(targets, actuals)):
    ax.text(xi - w/2, t + 1, f"{t}%", ha="center", fontsize=8, fontweight="bold")
    color = C_GREEN if abs(a - t) < 10 else C_RED
    ax.text(xi + w/2, a + 1, f"{a:.1f}%", ha="center", fontsize=8, fontweight="bold", color=color)

# 3d — Interval width distribution
ax = axes[1, 1]
widths = pq90 - pq10
ax.hist(widths, bins=40, color=C_PURPLE, alpha=0.75, edgecolor="white", zorder=3)
ax.axvline(widths.mean(), color=C_ORANGE, lw=2, linestyle="--",
           label=f"Mean width = {widths.mean():.0f}h")
ax.axvline(np.median(widths), color=C_RED, lw=2, linestyle=":",
           label=f"Median = {np.median(widths):.0f}h")
ax.set_xlabel("Interval width q90 − q10 (hours)", fontsize=9)
ax.set_ylabel("Count", fontsize=9)
ax.set_title("Prediction Interval Width Distribution", fontsize=11, fontweight="bold", pad=10)
ax.legend(fontsize=8); ax.grid(zorder=0)

fig3.tight_layout()
fig3.savefig("report_quantile_models.png", dpi=150, bbox_inches="tight")
print("Saved: report_quantile_models.png")


# ══════════════════════════════════════════════════════════════════════════════
# FIGURE 4 — Summary dashboard (all models side by side)
# ══════════════════════════════════════════════════════════════════════════════
fig4, axes = plt.subplots(2, 3, figsize=(18, 10))
fig4.suptitle("Full Model Suite — Summary Dashboard",
              fontsize=15, fontweight="bold", y=1.01)
fig4.patch.set_facecolor(C_BG)

# 4a — R² comparison
ax = axes[0, 0]
models_r2   = ["Hours q50", "Cost"]
r2_vals     = [r2_score(yh_test, pq50)*100, r2_score(yc_test, pc)*100]
bars = ax.barh(models_r2, r2_vals, color=[C_BLUE, C_GREEN], zorder=3)
ax.set_xlim(0, 105); ax.set_xlabel("R² (%)", fontsize=9)
ax.set_title("R² Score per Regression Model", fontsize=11, fontweight="bold", pad=10)
ax.grid(axis="x", zorder=0)
for bar, v in zip(bars, r2_vals):
    ax.text(v + 0.5, bar.get_y() + bar.get_height()/2, f"{v:.2f}%",
            va="center", fontsize=10, fontweight="bold")

# 4b — MAPE comparison (all 5 models)
ax = axes[0, 1]
all_labels = ["Hours q10", "Hours q50", "Hours q90", "Cost"]
all_mapes  = [mape(yh_test, pq10), mape(yh_test, pq50),
              mape(yh_test, pq90), mape(yc_test, pc)]
all_colors = [C_BLUE, C_GREEN, C_PURPLE, C_ORANGE]
bars = ax.bar(all_labels, all_mapes, color=all_colors, width=0.55, zorder=3)
ax.set_ylabel("MAPE (%)", fontsize=9)
ax.set_title("MAPE per Model", fontsize=11, fontweight="bold", pad=10)
ax.grid(axis="y", zorder=0)
ax.tick_params(axis="x", labelsize=8)
for bar, v in zip(bars, all_mapes):
    ax.text(bar.get_x() + bar.get_width()/2, v + 0.3, f"{v:.1f}%",
            ha="center", va="bottom", fontsize=8, fontweight="bold")

# 4c — Within tolerance comparison
ax = axes[0, 2]
pcts = ["±10%", "±20%", "±30%"]
h_within = [within_pct(yh_test, pq50, 10),
            within_pct(yh_test, pq50, 20),
            within_pct(yh_test, pq50, 30)]
c_within = [within_pct(yc_test, pc, 10),
            within_pct(yc_test, pc, 20),
            within_pct(yc_test, pc, 30)]
x = np.arange(3); w = 0.35
b1 = ax.bar(x - w/2, h_within, w, label="Hours q50", color=C_BLUE, zorder=3)
b2 = ax.bar(x + w/2, c_within, w, label="Cost",      color=C_GREEN, zorder=3)
ax.set_xticks(x); ax.set_xticklabels(pcts, fontsize=9)
ax.set_ylabel("% of predictions", fontsize=9); ax.set_ylim(0, 108)
ax.set_title("Predictions Within Tolerance", fontsize=11, fontweight="bold", pad=10)
ax.legend(fontsize=8); ax.grid(axis="y", zorder=0)
for bar in [*b1, *b2]:
    v = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2, v + 0.5, f"{v:.0f}%",
            ha="center", va="bottom", fontsize=7.5, fontweight="bold")

# 4d — Confusion matrix hours
ax = axes[1, 0]
draw_confusion(ax, confusion_matrix(yob_test, pred_ob_hours),
               "Confusion Matrix — Hours Model")
acc_h  = accuracy_score(yob_test, pred_ob_hours) * 100
f1_h   = f1_score(yob_test, pred_ob_hours, zero_division=0) * 100
ax.set_xlabel(f"Accuracy = {acc_h:.1f}%   F1 = {f1_h:.1f}%", fontsize=8)

# 4e — Confusion matrix cost
ax = axes[1, 1]
draw_confusion(ax, confusion_matrix(yob_test, pred_ob_cost),
               "Confusion Matrix — Cost Model")
ax.set_xlabel(f"Accuracy = {acc_c:.1f}%   F1 = {f1_c:.1f}%", fontsize=8)

# 4f — Classification metrics side by side
ax = axes[1, 2]
clf_metrics = ["Accuracy", "Precision", "Recall", "Specificity", "F1-Score"]
tn_h, fp_h, fn_h, tp_h = confusion_matrix(yob_test, pred_ob_hours).ravel()
tn_c, fp_c, fn_c, tp_c = confusion_matrix(yob_test, pred_ob_cost).ravel()
spec_h = tn_h / (tn_h + fp_h) * 100
spec_c = tn_c / (tn_c + fp_c) * 100
h_clf = [acc_h, precision_score(yob_test, pred_ob_hours, zero_division=0)*100,
         recall_score(yob_test, pred_ob_hours, zero_division=0)*100, spec_h, f1_h]
c_clf = [acc_c, prec_c, rec_c, spec_c, f1_c]
x = np.arange(len(clf_metrics)); w = 0.35
b1 = ax.bar(x - w/2, h_clf, w, label="Hours model", color=C_BLUE, zorder=3)
b2 = ax.bar(x + w/2, c_clf, w, label="Cost model",  color=C_GREEN, zorder=3)
ax.set_xticks(x); ax.set_xticklabels(clf_metrics, fontsize=7.5, rotation=15)
ax.set_ylim(0, 115); ax.set_ylabel("%", fontsize=9)
ax.set_title("Classification Metrics Comparison", fontsize=11, fontweight="bold", pad=10)
ax.legend(fontsize=8); ax.grid(axis="y", zorder=0)
for bar in [*b1, *b2]:
    v = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2, v + 0.5, f"{v:.0f}%",
            ha="center", va="bottom", fontsize=6.5, fontweight="bold")

fig4.tight_layout()
fig4.savefig("report_summary_dashboard.png", dpi=150, bbox_inches="tight")
print("Saved: report_summary_dashboard.png")


# ══════════════════════════════════════════════════════════════════════════════
# FIGURE 5 — KNN Similarity Model
# ══════════════════════════════════════════════════════════════════════════════
knn      = load("knn")
df_meta  = load("df_meta")

# Scale the full dataset to query KNN (same scaler, all rows)
X_all_s  = scaler.transform(df[feature_cols].fillna(0).to_numpy())
# Scale only test rows to query
X_test_s_knn = scaler.transform(X_test)

# For each test point, get the 6 nearest neighbors (including itself may appear,
# since KNN was fitted on ALL rows — exclude index if it falls in test set)
distances, neighbor_indices = knn.kneighbors(X_test_s_knn, n_neighbors=6)

# Predict hours/cost as mean of k neighbors' actual values
neigh_hours = np.array([y_hours[neighbor_indices[i]].mean() for i in range(len(X_test))])
neigh_cost  = np.array([y_cost[neighbor_indices[i]].mean()  for i in range(len(X_test))])

# Overrun detection via KNN: if mean neighbor hours > mean neighbor estimated hours
est_h_all   = df[est_h_col].fillna(0).to_numpy()
est_c_all   = df[est_c_col].fillna(0).to_numpy()
neigh_est_h = np.array([est_h_all[neighbor_indices[i]].mean() for i in range(len(X_test))])
neigh_est_c = np.array([est_c_all[neighbor_indices[i]].mean()  for i in range(len(X_test))])
pred_ob_knn_h = (neigh_hours > neigh_est_h).astype(int)
pred_ob_knn_c = (neigh_cost  > neigh_est_c).astype(int)

fig5, axes = plt.subplots(2, 3, figsize=(16, 10))
fig5.suptitle("Model 5 — KNN Similarity Index (NearestNeighbors, k=6)",
              fontsize=14, fontweight="bold", y=1.01)
fig5.patch.set_facecolor(C_BG)

# 5a — Distance distribution to nearest neighbor
ax = axes[0, 0]
dist_to_nearest = distances[:, 1]   # skip rank-0 (might be itself)
ax.hist(dist_to_nearest, bins=40, color=C_PURPLE, alpha=0.8, edgecolor="white", zorder=3)
ax.axvline(dist_to_nearest.mean(),   color=C_ORANGE, lw=2, linestyle="--",
           label=f"Mean = {dist_to_nearest.mean():.2f}")
ax.axvline(np.median(dist_to_nearest), color=C_RED, lw=2, linestyle=":",
           label=f"Median = {np.median(dist_to_nearest):.2f}")
ax.set_xlabel("Euclidean distance to nearest neighbor", fontsize=9)
ax.set_ylabel("Count", fontsize=9)
ax.set_title("Distance to Nearest Neighbor\n(test set queries)", fontsize=11, fontweight="bold", pad=10)
ax.legend(fontsize=8)
ax.grid(zorder=0)

# 5b — Distance spread across all 6 neighbors (violin / boxplot per rank)
ax = axes[0, 1]
ax.boxplot([distances[:, k] for k in range(6)],
           patch_artist=True,
           boxprops=dict(facecolor=C_PURPLE, alpha=0.5),
           medianprops=dict(color=C_RED, lw=2),
           whiskerprops=dict(color=C_DARK),
           capprops=dict(color=C_DARK),
           flierprops=dict(marker="o", markersize=2, alpha=0.3, color=C_GRAY))
ax.set_xticklabels([f"Rank {k+1}" for k in range(6)], fontsize=8)
ax.set_ylabel("Euclidean distance", fontsize=9)
ax.set_title("Distance Distribution per Neighbor Rank", fontsize=11, fontweight="bold", pad=10)
ax.grid(axis="y", zorder=0)

# 5c — KNN as regressor: Actual vs predicted hours (mean of neighbors)
ax = axes[0, 2]
ax.scatter(yh_test, neigh_hours, alpha=0.35, s=18, color=C_PURPLE, zorder=3)
lim = max(yh_test.max(), neigh_hours.max()) * 1.05
ax.plot([0, lim], [0, lim], "--", color=C_RED, lw=1.5, label="Perfect fit")
r2_knn_h = r2_score(yh_test, neigh_hours)
ax.text(0.05, 0.92, f"R² = {r2_knn_h*100:.2f}%", transform=ax.transAxes,
        fontsize=9, color=C_PURPLE, fontweight="bold")
ax.set_xlabel("Actual Hours", fontsize=9)
ax.set_ylabel("KNN predicted Hours (mean of neighbors)", fontsize=9)
ax.set_title("KNN Hours Prediction\n(Actual vs Mean-of-Neighbors)", fontsize=11, fontweight="bold", pad=10)
ax.legend(fontsize=8)
ax.grid(zorder=0)

# 5d — KNN regression metrics vs GBM
ax = axes[1, 0]
model_names = ["KNN\n(neighbors avg)", "GBM q50\n(Hours)", "GBM\n(Cost)"]
maes = [
    mean_absolute_error(yh_test, neigh_hours),
    mean_absolute_error(yh_test, pq50),
    mean_absolute_error(yc_test, pc),
]
r2s  = [r2_knn_h * 100, r2_score(yh_test, pq50) * 100, r2_score(yc_test, pc) * 100]
colors_cmp = [C_PURPLE, C_BLUE, C_GREEN]
bars = ax.bar(model_names, r2s, color=colors_cmp, width=0.5, zorder=3)
ax.set_ylabel("R² (%)", fontsize=9)
ax.set_ylim(0, 105)
ax.set_title("R² Comparison: KNN vs GBM", fontsize=11, fontweight="bold", pad=10)
ax.grid(axis="y", zorder=0)
for bar, v in zip(bars, r2s):
    ax.text(bar.get_x() + bar.get_width()/2, v + 0.5, f"{v:.1f}%",
            ha="center", va="bottom", fontsize=8, fontweight="bold")

# 5e — Confusion matrix KNN overrun detection (hours)
ax = axes[1, 1]
cm_knn = confusion_matrix(yob_test, pred_ob_knn_h)
draw_confusion(ax, cm_knn, "KNN — Overrun Detection (hours)")
acc_knn  = accuracy_score(yob_test, pred_ob_knn_h) * 100
f1_knn   = f1_score(yob_test, pred_ob_knn_h, zero_division=0) * 100
prec_knn = precision_score(yob_test, pred_ob_knn_h, zero_division=0) * 100
rec_knn  = recall_score(yob_test, pred_ob_knn_h, zero_division=0) * 100
ax.set_xlabel(
    f"Accuracy={acc_knn:.1f}%  Precision={prec_knn:.1f}%  Recall={rec_knn:.1f}%  F1={f1_knn:.1f}%",
    fontsize=7.5
)

# 5f — Full classification comparison: KNN vs GBM Hours vs GBM Cost
ax = axes[1, 2]
clf_metrics = ["Accuracy", "Precision", "Recall", "F1-Score"]
tn_h2, fp_h2, fn_h2, tp_h2 = confusion_matrix(yob_test, pred_ob_hours).ravel()
tn_c2, fp_c2, fn_c2, tp_c2 = confusion_matrix(yob_test, pred_ob_cost).ravel()

knn_clf  = [acc_knn, prec_knn, rec_knn, f1_knn]
h_clf2   = [
    accuracy_score(yob_test, pred_ob_hours)*100,
    precision_score(yob_test, pred_ob_hours, zero_division=0)*100,
    recall_score(yob_test, pred_ob_hours, zero_division=0)*100,
    f1_score(yob_test, pred_ob_hours, zero_division=0)*100,
]
c_clf2   = [
    accuracy_score(yob_test, pred_ob_cost)*100,
    precision_score(yob_test, pred_ob_cost, zero_division=0)*100,
    recall_score(yob_test, pred_ob_cost, zero_division=0)*100,
    f1_score(yob_test, pred_ob_cost, zero_division=0)*100,
]
x = np.arange(len(clf_metrics))
w = 0.25
b1 = ax.bar(x - w, knn_clf, w, label="KNN",        color=C_PURPLE, zorder=3)
b2 = ax.bar(x,     h_clf2,  w, label="GBM Hours",  color=C_BLUE,   zorder=3)
b3 = ax.bar(x + w, c_clf2,  w, label="GBM Cost",   color=C_GREEN,  zorder=3)
ax.set_xticks(x)
ax.set_xticklabels(clf_metrics, fontsize=8)
ax.set_ylim(0, 118)
ax.set_ylabel("%", fontsize=9)
ax.set_title("Classification: KNN vs GBM Hours vs GBM Cost", fontsize=11, fontweight="bold", pad=10)
ax.legend(fontsize=7.5)
ax.grid(axis="y", zorder=0)
for bar in [*b1, *b2, *b3]:
    v = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2, v + 0.5, f"{v:.0f}%",
            ha="center", va="bottom", fontsize=6, fontweight="bold")

fig5.tight_layout()
fig5.savefig("report_knn_model.png", dpi=150, bbox_inches="tight")
print("Saved: report_knn_model.png")

plt.show()
print("\nDone. 5 report files generated.")
