/* ════════════════════════════════════════════════════════
   Device / FCM Token Routes
   ════════════════════════════════════════════════════════ */

const express = require("express");
const router = express.Router();
const { db } = require("../firebase");
const { verifyToken } = require("../middleware/auth");

/**
 * POST /api/devices/token
 * Save the user's FCM push notification token.
 * Body: { token: "fcm-token-string" }
 */
router.post("/token", verifyToken, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "FCM token is required" });
    }

    await db.collection("users").doc(req.user.uid).update({
      fcmToken: token,
    });

    res.json({ message: "FCM token saved" });
  } catch (err) {
    console.error("Save FCM token error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
