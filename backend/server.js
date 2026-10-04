/* ════════════════════════════════════════════════════════
   Electronic Repair Hub — Express Server
   ════════════════════════════════════════════════════════

   Endpoints:
   ──────────────────────────────────────────────────────
   POST   /api/auth/register        Register user profile
   GET    /api/auth/me              Get current user profile
   PATCH  /api/auth/role/:uid       Admin: change user role

   POST   /api/requests             Create repair request
   GET    /api/requests/mine        Customer's own requests
   GET    /api/requests/open        Technician: open requests
   GET    /api/requests/all         Admin: all requests
   GET    /api/requests/track/:id   Public: track by repair ID
   GET    /api/requests/:id         Get single request
   PATCH  /api/requests/:id/accept  Technician: accept request
   PATCH  /api/requests/:id/status  Technician: update status
   DELETE /api/requests/:id         Admin: delete request

   POST   /api/devices/token        Save FCM token
   ──────────────────────────────────────────────────────
*/

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env/.env.txt") });

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security & parsing ──
app.use(helmet({
  contentSecurityPolicy: false,   // Allow inline scripts for dev
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Serve frontend static files ──
app.use(express.static(path.join(__dirname, "../front end")));

// ── API Routes ──
const authRoutes = require("./routes/auth");
const requestRoutes = require("./routes/requests");
const deviceRoutes = require("./routes/devices");

app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/devices", deviceRoutes);

// ── Health check ──
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Electronic Repair Hub API",
    timestamp: new Date().toISOString(),
  });
});

// ── SPA fallback: serve index.html for any non-API route ──
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(__dirname, "../front end/index.html"));
});

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`\n⚡ Electronic Repair Hub API`);
  console.log(`  Server running on http://localhost:${PORT}`);
  console.log(`  Frontend served from: ../front end/`);
  console.log(`  API base: http://localhost:${PORT}/api\n`);
});

module.exports = app;
