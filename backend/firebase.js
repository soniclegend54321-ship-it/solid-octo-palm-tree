const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const path = require("path");
const fs = require("fs");

const dotenvPath = path.resolve(__dirname, "../.env/.env.txt");
if (fs.existsSync(dotenvPath)) {
  require("dotenv").config({ path: dotenvPath });
} else {
  require("dotenv").config();
}

let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } catch (err) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_KEY environment variable. Ensure it is valid JSON.");
  }
} else {
  let serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (serviceAccountPath && !path.isAbsolute(serviceAccountPath)) {
    serviceAccountPath = path.resolve(process.cwd(), serviceAccountPath);
  }
  if (!serviceAccountPath) {
    serviceAccountPath = path.resolve(__dirname, "electronic-repair-hub-firebase-adminsdk-fbsvc-2c532393fc.json");
  }
  
  if (fs.existsSync(serviceAccountPath)) {
    try {
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    } catch (err) {
      console.error(`Error reading Firebase service account file at ${serviceAccountPath}:`, err.message);
    }
  }
}

let db = null;
let authAdmin = null;

if (serviceAccount) {
  try {
    const app = initializeApp({
      credential: cert(serviceAccount),
    });
    db = getFirestore(app);
    authAdmin = getAuth(app);
    console.log("✅ Firebase Admin SDK initialized successfully");
  } catch (err) {
    console.error("Error initializing Firebase Admin SDK:", err.message);
  }
} else {
  console.warn("⚠️ Firebase service account key not found.");
  console.warn("   To enable server-side Firebase on Render, add FIREBASE_SERVICE_ACCOUNT_KEY environment variable.");
}

module.exports = { db, authAdmin };

