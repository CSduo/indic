import { Router } from "express";
import path from "path";
import fs from "fs";
import { UPLOADS_DIR } from "./submissions";

const router = Router();

// GET /api/uploads/:filename — serve uploaded files
router.get("/uploads/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    // Security: prevent directory traversal
    const safeName = path.basename(filename);
    const filePath = path.join(UPLOADS_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const ext = path.extname(safeName).toLowerCase();
    if (ext === ".pdf") {
      res.setHeader("Content-Type", "application/pdf");
    }
    res.setHeader("Content-Disposition", "inline");

    return res.sendFile(filePath);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
