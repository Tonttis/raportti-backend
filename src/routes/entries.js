const express = require("express");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.get("/", authRequired, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, phase, entry_date, shift_name, batch_code, line_name, notes, created_at
       FROM production_entries
       ORDER BY created_at DESC
       LIMIT 100`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

router.post("/:phase", authRequired, async (req, res) => {
  const { phase } = req.params;
  const { entry_date, shift_name, batch_code, line_name, notes, payload } = req.body;

  if (!["boiling", "packaging", "separation"].includes(phase)) {
    return res.status(400).json({ error: "Invalid phase" });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [insertResult] = await conn.query(
      `INSERT INTO production_entries
       (phase, entry_date, shift_name, batch_code, line_name, operator_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [phase, entry_date, shift_name, batch_code, line_name, req.user.id, notes]
    );

    const entryId = insertResult.insertId;

    if (phase === "boiling") {
      await conn.query(
        `INSERT INTO boiling_entries
         (entry_id, recipe_name, target_temp, actual_temp, duration_min, quantity_kg, waste_kg, deviation_note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entryId,
          payload.recipe_name,
          payload.target_temp,
          payload.actual_temp,
          payload.duration_min,
          payload.quantity_kg,
          payload.waste_kg,
          payload.deviation_note
        ]
      );
    }

    if (phase === "packaging") {
      await conn.query(
        `INSERT INTO packaging_entries
         (entry_id, package_type, units_total, defective_units, downtime_min, packaging_note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          entryId,
          payload.package_type,
          payload.units_total,
          payload.defective_units,
          payload.downtime_min,
          payload.packaging_note
        ]
      );
    }

    if (phase === "separation") {
      await conn.query(
        `INSERT INTO separation_entries
         (entry_id, machine_name, input_kg, output_kg, quality_grade, maintenance_note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          entryId,
          payload.machine_name,
          payload.input_kg,
          payload.output_kg,
          payload.quality_grade,
          payload.maintenance_note
        ]
      );
    }

    await conn.commit();
    res.status(201).json({ success: true, entryId });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: "Failed to save entry" });
  } finally {
    conn.release();
  }
});

module.exports = router;