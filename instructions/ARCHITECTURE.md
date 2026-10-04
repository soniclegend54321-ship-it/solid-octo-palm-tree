# Architecture

```
CUSTOMER
   ↓
FRONTEND (website UI)
   ↓
BACKEND / API
   ↓
DATABASE
   ↓
TECHNICIAN / ADMIN
```

## Layers
**Frontend** – what the user sees: buttons, forms, navigation, cards, menus, service info, customer dashboard. Sends requests to the backend on user actions.

**Backend** – the logic: user requests, repair bookings, customer and technician info, repair status, authentication, database communication, business rules.

**Database** – persistent storage so data survives page refreshes.

## Sample Record
| Field | Example |
|-------|---------|
| Customer | Rahul |
| Device | Laptop |
| Problem | Not powering on |
| Technician | Technician A |
| Status | In Progress |
| Repair ID | RH1025 |

The backend performs create, read, update and delete (CRUD) operations on these records.

## Button Click Flow ("Book Repair")
```
User clicks "Book Repair"
 → Frontend captures input
 → Request sent to backend
 → Backend validates data
 → Data stored in database
 → Confirmation returned
 → User sees successful booking
```

## Note
Backend: Node.js with `firebase-admin`. Authentication uses Firebase ID tokens verified by the backend (see PRD.md, section 6). Only name other technologies (frontend framework, database) once they are confirmed in your code.
