// ─── Leave routes ─────────────────────────────────────────────────────────────
// Mounted at: /api/leaves
//
// Manages collaborator leave records (paid leave, sick leave, exceptional leave).
// Leaves have a start and end date and are linked to an Expert by collabId.
//
// Endpoint summary:
//
//   GET  /        — list leave records; supports filters:
//                   ?collabId= (one collaborator's leaves)
//                   ?month= & ?year= (overlap filter: leaves that touch that month)
//                   The overlap query uses: dateStart <= monthEnd AND dateEnd >= monthStart
//                   so partial-month leaves are included correctly.
//                   Readable by any authenticated user.
//
//   POST /        — create a leave record (admin or manager)
//                   Leaves created manually are set to status "Approuvé" by default.
//                   Leaves imported via the bulk import endpoint are also auto-approved.
//
//   PUT  /:id     — update a leave record (admin or manager)
//                   Used to correct dates, type, or status.
//
//   DELETE /:id   — delete a leave record (admin only)
//                   Removing a leave is considered a destructive HR action,
//                   so it requires admin privileges.
//
// Leave types (stored in the `type` field on each document):
//   "Annuel"        — standard paid vacation
//   "Maladie"       — sick leave
//   "Exceptionnel"  — special circumstances (bereavement, etc.)

import { Router } from "express";
import { getLeaves, createLeave, updateLeave, deleteLeave } from "../controllers/leaveController";
import { protect, authorize } from "../middleware/authMiddleware";

const router = Router();

// ── Read (any authenticated user) ────────────────────────────────────────────
router.get("/",       protect, getLeaves);

// ── Write (admin or manager) ──────────────────────────────────────────────────
router.post("/",      protect, authorize("admin", "manager"), createLeave);
router.put("/:id",    protect, authorize("admin", "manager"), updateLeave);

// ── Delete (admin only) ───────────────────────────────────────────────────────
router.delete("/:id", protect, authorize("admin"), deleteLeave);

export default router;
