# Electronic Repair Hub

A web platform that makes electronic-device repair easier. Instead of searching for a shop and travelling there, customers request a repair online and technicians handle it, with live status tracking.

## Problem
- Hard to find a reliable technician
- Time lost travelling to shops
- No visibility into repair status
- Hard to compare services or know the likely cost
- Unorganised, paper-based requests

## Solution
Customer → Select Device → Describe Problem → Request Repair → Technician → Repair → Status Update → Delivery/Collection

## Key Features
- Repair service management
- Customer and technician management
- Repair status tracking (Requested → Accepted → In Progress → Repaired → Completed)
- Simple, user-friendly interface
- Digital records instead of paper
- Door-to-door service concept

## Supported Devices
Mobile · Laptop · Computer · Television · Other electronics

## Tech Overview
| Layer | Role |
|-------|------|
| Frontend | UI: forms, navigation, dashboard |
| Backend | Node.js (Express) + `firebase-admin`: logic, validation, token verification |
| Auth | Firebase Authentication (ID tokens verified on the server) |
| Database | Stores customers, devices, problems, technicians, status |

> Auth setup and the Firebase keys are described in [docs/PRD.md](docs/PRD.md). Keep the service account JSON out of Git.

## Project Structure
```
electronic-repair-hub/
├── README.md
├── .env.example
├── .gitignore
└── docs/
    ├── PRD.md
    ├── ARCHITECTURE.md
    ├── WORKFLOW.md
    ├── FEATURES.md
    ├── FUTURE_SCOPE.md
    ├── PRESENTATION.md
    └── VIVA_QA.md
```

## Docs
- [PRD](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Workflow](docs/WORKFLOW.md)
- [Features](docs/FEATURES.md)
- [Future Scope](docs/FUTURE_SCOPE.md)
- [Presentation Script](docs/PRESENTATION.md)
- [Viva Q&A](docs/VIVA_QA.md)
