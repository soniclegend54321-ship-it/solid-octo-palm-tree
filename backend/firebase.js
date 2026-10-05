/* ════════════════════════════════════════════════════════
   Electronic Repair Hub — Firebase Admin SDK Initialization
   ════════════════════════════════════════════════════════ */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env/.env.txt") });

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } catch (err) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_KEY. Please ensure it is valid JSON.");
    throw err;
  }
} else {
  let serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (serviceAccountPath && !path.isAbsolute(serviceAccountPath)) {
    serviceAccountPath = path.resolve(process.cwd(), serviceAccountPath);
  }
  if (!serviceAccountPath) {
    serviceAccountPath = path.resolve(__dirname, "electronic-repair-hub-firebase-adminsdk-fbsvc-2c532393fc.json");
  }
  
  serviceAccount = require(serviceAccountPath);
}

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);
const authAdmin = getAuth(app);

module.exports = { db, authAdmin };
