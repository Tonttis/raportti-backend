const express = require("express");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.get("/daily", authRequired, async (req, res) => {
  try {
    const { date } = req.query;
    const [rows] = await pool.query(
      `SELECT phase, COUNT(*) AS total_entries
       FROM production_entries
       WHERE entry_date = ?
       GROUP BY phase`,
      [date]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch daily report" });
  }
});

router.get("/waste", authRequired, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pe.entry_date, SUM(be.waste_kg) AS total_waste_kg
       FROM production_entries pe
       JOIN boiling_entries be ON be.entry_id = pe.id
       GROUP BY pe.entry_date
       ORDER BY pe.entry_date DESC
       LIMIT 30`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch waste report" });
  }
});

module.exports = router;