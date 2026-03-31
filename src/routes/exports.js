const express = require("express");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.get("/csv", authRequired, async (req, res) => {
  try {
    const { phase, from, to } = req.query;

    const [rows] = await pool.query(
      `SELECT id, phase, entry_date, shift_name, batch_code, line_name, notes, created_at
       FROM production_entries
       WHERE (? IS NULL OR phase = ?)
         AND (? IS NULL OR entry_date >= ?)
         AND (? IS NULL OR entry_date <= ?)
       ORDER BY entry_date DESC`,
      [phase || null, phase || null, from || null, from || null, to || null, to || null]
    );

    const header = ["id", "phase", "entry_date", "shift_name", "batch_code", "line_name", "notes", "created_at"];
    const lines = [header.join(",")];

    for (const row of rows) {
      const values = header.map((key) => {
        const value = row[key] ?? "";
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      lines.push(values.join(","));
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="entries-export.csv"`);
    res.send(lines.join("\n"));
  } catch (error) {
    res.status(500).json({ error: "Failed to export csv" });
  }
});

module.exports = router;