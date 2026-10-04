/* ════════════════════════════════════════════════════════
   Auth Middleware — Verify Firebase ID Token
   ════════════════════════════════════════════════════════ */

const { authAdmin } = require("../firebase");

/**
 * Verifies the Firebase ID token from the Authorization header.
 * Attaches the decoded token (uid, email, role, etc.) to req.user.
 */
async function verifyToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing authorization token" });
  }

  try {
    const decoded = await authAdmin.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Checks if the authenticated user has one of the allowed roles.
 * Roles are stored as Firebase custom claims.
 * Usage: requireRole("technician", "admin")
 */
function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.user?.role || "customer";
    if (roles.includes(userRole)) {
      return next();
    }
    return res.status(403).json({
      error: `Access denied. Required role: ${roles.join(" or ")}`,
    });
  };
}

module.exports = { verifyToken, requireRole };
