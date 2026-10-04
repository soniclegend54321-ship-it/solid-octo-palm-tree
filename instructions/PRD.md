# Product Requirements Document (PRD): Electronic Repair Hub

## 1. Overview
Electronic Repair Hub is a Node.js web platform where customers request repairs for electronic devices (mobile, laptop, computer, TV, other) and technicians accept, repair and update the status of those requests.

## 2. Goals
- Let customers request a repair online instead of visiting multiple shops
- Let technicians view and manage incoming requests
- Give customers real-time visibility into repair status
- Keep repair records digital

## 3. Users
| Role | Needs |
|------|-------|
| Customer | Create requests, track status |
| Technician | View requests, accept, update status |
| Admin | Manage users and requests |

## 4. Functional Requirements
1. Sign up / log in (Firebase Authentication)
2. Create a repair request: device type + problem description
3. Technician views open requests and accepts one
4. Status lifecycle: Requested → Accepted → In Progress → Repaired → Completed
5. Customer dashboard with request history and current status
6. Push notification to the customer on each status change
7. Role-based access (customer / technician / admin)

## 5. Tech Stack
| Layer | Choice |
|-------|--------|
| Frontend | Web UI (framework to be confirmed) |
| Backend | Node.js (Express) with `firebase-admin` |
| Auth | Firebase Authentication |
| Database | Firestore (or confirm your choice) |
| Notifications | Firebase Cloud Messaging (FCM) with Web Push key |

## 6. Authentication & Firebase Configuration
Firebase project ID: `electronic-repair-hub`

### 6.1 Service account (server-side, Admin SDK)
- Use the downloaded service account JSON (`electronic-repair-hub-firebase-adminsdk-fbsvc-*.json`) for backend authentication.
- Store it **outside version control** and load it via an environment variable:
  ```js
  // firebase.js
  const admin = require("firebase-admin");
  const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

  module.exports = admin;
  ```
- **Never** commit the JSON, paste its contents into docs, or expose it to the frontend.

### 6.2 Web Push key (client-side, FCM)
Use this Web Push certificate (VAPID public) key when requesting a notification token in the browser:
```
BD3Fw7KA2TW8VWGXVWYmmHhXffu3DTvxqWtZQMR_IuKlobgpe7jgvT59bpxSFLPG7_K2qNieC1h9tbN5N_253pg
```
```js
// client
const token = await getToken(messaging, { vapidKey: process.env.FIREBASE_VAPID_KEY });
```
This is a public key and is safe in frontend code.

### 6.3 Auth flow
```
User logs in (Firebase client SDK)
 → Client receives ID token
 → Client sends token: Authorization: Bearer <idToken>
 → Node middleware: admin.auth().verifyIdToken(idToken)
 → req.user = decoded token (uid, role)
 → Route handler runs
```
```js
// authMiddleware.js
const admin = require("./firebase");

module.exports = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};
```
Roles are stored as Firebase custom claims (`admin.auth().setCustomUserClaims(uid, { role })`) and checked in middleware.

### 6.4 Environment variables (`.env`)
```
FIREBASE_SERVICE_ACCOUNT_PATH=./secrets/serviceAccount.json
FIREBASE_PROJECT_ID=electronic-repair-hub
FIREBASE_VAPID_KEY=BD3Fw7KA2TW8VWGXVWYmmHhXffu3DTvxqWtZQMR_IuKlobgpe7jgvT59bpxSFLPG7_K2qNieC1h9tbN5N_253pg
PORT=3000
```

## 7. API (draft)
| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| POST | /api/requests | Customer | Create repair request |
| GET | /api/requests/mine | Customer | List own requests |
| GET | /api/requests/open | Technician | List open requests |
| PATCH | /api/requests/:id/accept | Technician | Accept request |
| PATCH | /api/requests/:id/status | Technician | Update status |
| POST | /api/devices/token | Any user | Save FCM token |

## 8. Data Model (draft)
`requests`: `id, customerId, deviceType, problem, technicianId, status, createdAt, updatedAt`
`users`: `uid, name, role, fcmToken`

## 9. Security Requirements
- Service account stays server-side only, excluded via `.gitignore`
- Every protected route verifies the Firebase ID token
- Role checks on technician/admin routes
- Validate all request input on the server
- Firestore security rules deny direct client access to other users' data

## 10. Out of Scope (v1)
Payments, live location, chat, ratings, AI diagnosis. See [FUTURE_SCOPE.md](FUTURE_SCOPE.md).
