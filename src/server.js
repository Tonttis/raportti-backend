require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const authRoutes = require("./routes/auth");
const entryRoutes = require("./routes/entries");
const reportRoutes = require("./routes/reports");
const exportRoutes = require("./routes/exports");

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: false
}));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "reporting-backend" });
});

app.get("/health/db", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok, DATABASE() AS db");
    res.json({
      ok: true,
      database: rows[0].db,
      result: rows[0].ok
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.use("/auth", authRoutes);
app.use("/entries", entryRoutes);
app.use("/reports", reportRoutes);
app.use("/exports", exportRoutes);

const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => {
  console.log(`Backend running on port ${port}`);
});
