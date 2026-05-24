// ─── Application-wide numeric constants ──────────────────────────────────────
// Centralising these here means changing a threshold requires editing one file,
// not hunting through controllers.

// Standard full-time capacity per month used for burnout detection (hours)
export const MONTHLY_HOURS_CAPACITY  = 160;

// Pace index value above which a project is considered "At Risk" (yellow zone)
export const PACE_AT_RISK_THRESHOLD  = 1.0;

// Pace index value above which a project is considered "Burning" (red zone)
export const PACE_BURNING_THRESHOLD  = 1.2;

// Maximum consecutive failed login attempts before the account is temporarily locked
export const MAX_LOGIN_ATTEMPTS      = 5;

// How long (ms) to lock an account after hitting MAX_LOGIN_ATTEMPTS — 15 minutes
export const LOCK_DURATION_MS        = 15 * 60 * 1000;

// Client-side inactivity timeout before auto-logout — 15 minutes
// Referenced here for documentation; enforced in AuthContext.tsx on the frontend
export const INACTIVITY_MS           = 15 * 60 * 1000;

// Hours per month above which an expert is flagged for burnout risk
export const BURNOUT_LOAD_THRESHOLD  = 160;

// Number of newly completed projects that triggers an automatic ML model retrain
export const AUTO_RETRAIN_THRESHOLD  = 10;
