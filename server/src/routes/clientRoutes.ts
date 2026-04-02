import { Router } from "express";
import multer from "multer";
import { getClients, getClientById, createClient, updateClient, deleteClient, importClients } from "../controllers/clientController";
import { protect, authorize } from "../middleware/authMiddleware";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();
router.get("/",           protect, getClients);
router.get("/:id",        protect, getClientById);
router.post("/",          protect, authorize("admin", "manager"), createClient);
router.post("/import",    protect, authorize("admin", "manager"), upload.single("file"), importClients);
router.put("/:id",        protect, authorize("admin", "manager"), updateClient);
router.delete("/:id",     protect, authorize("admin"), deleteClient);

export default router;
