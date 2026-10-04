/* ════════════════════════════════════════════════════════
   Auth Routes — User Registration & Role Management
   ════════════════════════════════════════════════════════ */

const express = require("express");
const router = express.Router();
const { db, authAdmin } = require("../firebase");
const { verifyToken, requireRole } = require("../middleware/auth");

/**
 * POST /api/auth/register
 * After the client creates a Firebase Auth account (client-side),
 * this endpoint stores the user profile in Firestore and sets
 * the custom claim (role).
 *
 * Body: { name, role }
 * Header: Authorization: Bearer <idToken>
 */
router.post("/register", verifyToken, async (req, res) => {
  try {
    const { name, role } = req.body;
    const uid = req.user.uid;
    const email = req.user.email;
    const validRoles = ["customer", "technician"];
    const userRole = validRoles.includes(role) ? role : "customer";

    // Set custom claim so the role is embedded in future tokens
    await authAdmin.setCustomUserClaims(uid, { role: userRole });

    // Store user profile in Firestore
    await db.collection("users").doc(uid).set(
      {
        uid,
        name: name || email.split("@")[0],
        email,
        role: userRole,
        fcmToken: null,
        createdAt: new Date(),
      },
      { merge: true }
    );

    res.status(201).json({
      message: "User registered successfully",
      user: { uid, name: name || email.split("@")[0], email, role: userRole },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auth/me
 * Returns the current user's profile from Firestore.
 */
router.get("/me", verifyToken, async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User profile not found" });
    }
    res.json({ user: userDoc.data() });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/auth/role/:uid
 * Admin-only: Update a user's role.
 */
router.patch("/role/:uid", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { uid } = req.params;
    const { role } = req.body;
    const validRoles = ["customer", "technician", "admin"];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    await authAdmin.setCustomUserClaims(uid, { role });
    await db.collection("users").doc(uid).update({ role });

    res.json({ message: `Role updated to ${role} for user ${uid}` });
  } catch (err) {
    console.error("Role update error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
