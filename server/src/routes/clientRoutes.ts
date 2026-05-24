// ─── Client routes ────────────────────────────────────────────────────────────
// Mounted at: /api/clients
//
// Clients represent the firm's customer portfolio. Each Client document holds
// contact info, CRM metadata, and the TVA/tax regime. Clients are linked to
// Projects, TimeEntries, and AnnualBudgets.
//
// Endpoint summary:
//
//   GET  /         — list all clients; supports ?search=, ?active= filters
//                    Readable by any authenticated user.
//
//   GET  /:id      — fetch one client by MongoDB ObjectId
//                    Readable by any authenticated user.
//
//   POST /         — create a new client (admin or manager)
//
//   POST /import   — bulk import clients from a CRM Excel export (admin or manager)
//                    importClients() handles three encoding variants of "TVARégime"
//                    column name and matches records by externalId first, then by name.
//                    Existing clients are updated (upsert); new ones are created.
//
//   PUT  /:id      — update a client (admin or manager)
//
//   DELETE /:id    — delete a client (admin only)
//                    Destructive — should only be done if the client has no projects.
//
// IMPORTANT: POST /import must appear before PUT /:id and GET /:id so Express
// does not try to match the literal string "import" as a MongoDB ObjectId.
// (POST / and POST /import are distinct paths, so Express handles them correctly
// by path matching, but explicit ordering is still the safest practice.)
//
// File upload notes:
//   - multer.memoryStorage() — Excel file never written to disk.

import { Router } from "express";
import multer from "multer";
import { getClients, getClientById, createClient, updateClient, deleteClient, importClients } from "../controllers/clientController";
import { protect, authorize } from "../middleware/authMiddleware";

// In-memory upload — CRM Excel file is parsed from buffer, never saved to disk.
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// ── Read (any authenticated user) ────────────────────────────────────────────
router.get("/",        protect, getClients);
router.get("/:id",     protect, getClientById);

// ── Write (admin or manager) ──────────────────────────────────────────────────
router.post("/",       protect, authorize("admin", "manager"), createClient);
router.post("/import", protect, authorize("admin", "manager"), upload.single("file"), importClients);
router.put("/:id",     protect, authorize("admin", "manager"), updateClient);

// ── Delete (admin only) ───────────────────────────────────────────────────────
router.delete("/:id",  protect, authorize("admin"), deleteClient);

export default router;
