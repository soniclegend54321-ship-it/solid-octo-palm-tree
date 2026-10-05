/* ════════════════════════════════════════════════════════
   Repair Request Routes — Full CRUD + Status Lifecycle
   ════════════════════════════════════════════════════════ */

const express = require("express");
const router = express.Router();
const { db } = require("../firebase");
const { verifyToken, requireRole } = require("../middleware/auth");

// Valid status transitions
const STATUS_ORDER = ["requested", "accepted", "in-progress", "repaired", "completed"];

/**
 * Generate a unique repair ID like RH1025
 */
function generateRepairId() {
  return "RH" + Math.floor(1000 + Math.random() * 9000);
}

// ── Validation helper ──
function validateRequestBody(body) {
  const { deviceType, problem } = body;
  const validDevices = ["mobile", "laptop", "computer", "television", "other"];
  const errors = [];

  if (!deviceType || !validDevices.includes(deviceType)) {
    errors.push(`deviceType must be one of: ${validDevices.join(", ")}`);
  }
  if (!problem || problem.trim().length < 5) {
    errors.push("problem must be at least 5 characters");
  }
  return errors;
}

/**
 * POST /api/requests
 * Customer creates a new repair request.
 */
router.post("/", verifyToken, async (req, res) => {
  try {
    const errors = validateRequestBody(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const { deviceType, deviceModel, problem, address, phone } = req.body;
    const repairId = generateRepairId();

    const requestData = {
      repairId,
      customerId: req.user.uid,
      customerName: req.user.name || req.user.email || "Customer",
      customerEmail: req.user.email,
      deviceType,
      deviceModel: deviceModel?.trim() || "",
      problem: problem.trim(),
      address: address?.trim() || "",
      phone: phone?.trim() || "",
      status: "requested",
      technicianId: null,
      technicianName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection("requests").add(requestData);

    res.status(201).json({
      message: "Repair request created",
      request: { id: docRef.id, ...requestData },
    });
  } catch (err) {
    console.error("Create request error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/requests/mine
 * Customer gets their own repair requests.
 */
router.get("/mine", verifyToken, async (req, res) => {
  try {
    const snapshot = await db
      .collection("requests")
      .where("customerId", "==", req.user.uid)
      .orderBy("createdAt", "desc")
      .get();

    const requests = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
    }));

    res.json({ requests });
  } catch (err) {
    console.error("Get my requests error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/requests/open
 * Technician views all open (status=requested) repair requests.
 */
router.get("/open", verifyToken, requireRole("technician", "admin"), async (req, res) => {
  try {
    const snapshot = await db
      .collection("requests")
      .where("status", "==", "requested")
      .orderBy("createdAt", "desc")
      .get();

    const requests = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
    }));

    res.json({ requests });
  } catch (err) {
    console.error("Get open requests error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/requests/all
 * Admin views ALL repair requests.
 */
router.get("/all", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const snapshot = await db
      .collection("requests")
      .orderBy("createdAt", "desc")
      .get();

    const requests = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
    }));

    res.json({ requests });
  } catch (err) {
    console.error("Get all requests error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/requests/track/:repairId
 * Public: Track a repair by its repair ID (e.g. RH1025).
 * No authentication required.
 */
router.get("/track/:repairId", async (req, res) => {
  try {
    const { repairId } = req.params;
    const snapshot = await db
      .collection("requests")
      .where("repairId", "==", repairId.toUpperCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "Repair request not found" });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Return limited info (no address/phone for privacy)
    res.json({
      request: {
        repairId: data.repairId,
        deviceType: data.deviceType,
        deviceModel: data.deviceModel,
        problem: data.problem,
        status: data.status,
        customerName: data.customerName,
        technicianName: data.technicianName,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      },
    });
  } catch (err) {
    console.error("Track request error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/requests/:id
 * Get a specific repair request by Firestore document ID.
 */
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const docRef = await db.collection("requests").doc(req.params.id).get();
    if (!docRef.exists) {
      return res.status(404).json({ error: "Request not found" });
    }

    const data = docRef.data();
    // Check ownership (customer can only see their own; technician/admin can see all)
    const userRole = req.user.role || "customer";
    if (userRole === "customer" && data.customerId !== req.user.uid) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({
      request: {
        id: docRef.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      },
    });
  } catch (err) {
    console.error("Get request error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/requests/:id/accept
 * Technician accepts an open repair request.
 */
router.patch("/:id/accept", verifyToken, requireRole("technician", "admin"), async (req, res) => {
  try {
    const docRef = db.collection("requests").doc(req.params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (docSnap.data().status !== "requested") {
      return res.status(400).json({ error: "Request has already been accepted" });
    }

    // Get technician name from Firestore user profile
    let techName = req.user.email;
    try {
      const techDoc = await db.collection("users").doc(req.user.uid).get();
      if (techDoc.exists) {
        techName = techDoc.data().name || req.user.email;
      }
    } catch { /* use email as fallback */ }

    await docRef.update({
      status: "accepted",
      technicianId: req.user.uid,
      technicianName: techName,
      updatedAt: new Date(),
    });

    res.json({ message: "Request accepted", repairId: docSnap.data().repairId });
  } catch (err) {
    console.error("Accept request error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/requests/:id/status
 * Technician/Admin updates the status of a repair request.
 * Body: { status: "in-progress" | "repaired" | "completed" }
 */
router.patch("/:id/status", verifyToken, requireRole("technician", "admin"), async (req, res) => {
  try {
    const { status } = req.body;

    if (!STATUS_ORDER.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${STATUS_ORDER.join(", ")}`,
      });
    }

    const docRef = db.collection("requests").doc(req.params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Request not found" });
    }

    const currentStatus = docSnap.data().status;
    const currentIdx = STATUS_ORDER.indexOf(currentStatus);
    const newIdx = STATUS_ORDER.indexOf(status);

    // Ensure forward progression only
    if (newIdx <= currentIdx) {
      return res.status(400).json({
        error: `Cannot move from "${currentStatus}" to "${status}". Status must progress forward.`,
      });
    }

    await docRef.update({
      status,
      updatedAt: new Date(),
    });

    res.json({
      message: `Status updated to "${status}"`,
      repairId: docSnap.data().repairId,
    });
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/requests/:id
 * Admin can delete a repair request.
 */
router.delete("/:id", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const docRef = db.collection("requests").doc(req.params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Request not found" });
    }

    await docRef.delete();
    res.json({ message: "Request deleted", repairId: docSnap.data().repairId });
  } catch (err) {
    console.error("Delete request error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
