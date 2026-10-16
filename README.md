# Udhaar Hub

> A multi-tenant digital **khata** (credit ledger) and debt-recovery app for shopkeepers in Pakistan.
> Record what customers owe, track payments, and see at a glance who needs a reminder.

![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)

**Status:** actively developed. The backend, web app and automated tests are complete; deployment is next.

---

## Why this exists

Small shops in Pakistan run on *udhaar* (credit), usually tracked in a paper notebook. Balances get lost, nobody
remembers who is late, and there is no history to point to when a customer disagrees. Udhaar Hub replaces the
notebook with a simple, mobile-first app where each shop has its own private ledger.

## Features

- **Business accounts** - sign up with a phone number; each shop is a separate, isolated tenant.
- **Debtor management** - add customers, search and filter them, open a full ledger per person.
- **Charges and payments** - record credit given and money received, with optional due dates and notes.
- **Live balances** - always computed from the ledger, never stored, so they cannot drift out of sync.
- **Overdue tracking** - configurable per business, aware of the shop's local timezone.
- **Dashboard** - total outstanding, collected this month, overdue debtors, upcoming due dates, recent activity.
- **Safe corrections** - mistakes are *reversed*, not deleted, so the history stays trustworthy.
- **Close / reopen debtors** - closing someone who still owes money requires explicit confirmation.
- **Responsive UI** - a mobile-first layout with a bottom tab bar, and a desktop layout with a top navbar.

## Screenshots

> Add your screenshots to `docs/screenshots/` and they will show up here.

| Dashboard (mobile) | Debtors (desktop) | Debtor ledger |
| :---: | :---: | :---: |
| ![Dashboard](docs/screenshots/dashboard-mobile.png) | ![Debtors](docs/screenshots/debtors-desktop.png) | ![Ledger](docs/screenshots/ledger.png) |

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React (Vite), React Router, Tailwind CSS v4, Axios, date-fns |
| Backend | Node.js, Express 5 |
| Database | MongoDB (Atlas) with Mongoose |
| Auth | JWT in an HttpOnly cookie, bcrypt password hashing, CSRF protection |
| Testing | Node's built-in test runner, Supertest, mongodb-memory-server |

## How the business rules work

**Balance**

```
currentBalance = openingBalance + sum(active charges) - sum(active payments)
```

It is computed on every request. Overpaying is allowed: a negative balance simply means the customer has
advance credit.

**Append-only ledger.** Amounts are immutable after creation. A wrong entry is *reversed* (its status becomes
`reversed` and it stops counting toward the balance). There are no delete endpoints on purpose, which preserves
a full audit trail.

**Overdue rule.** A debtor is overdue when **all** of these are true:

1. The debtor is not closed.
2. Their balance is greater than zero.
3. **Either** more than *N* days have passed since their last payment (or since their first charge, if they have
   never paid) **or** an active charge has a due date that has fully passed.

*N* is configurable per business (default 15). A charge due *today* is not overdue yet. "Today" and "this month"
are calculated in the business's own timezone (default `Asia/Karachi`), not the server's.

## Architecture and security

- **Multi-tenancy.** Every record carries a `companyId`, and every query is scoped to the authenticated user's
  company. Cross-tenant access returns a plain 404 so it does not reveal whether a record exists.
- **Authentication.** The JWT lives in an `HttpOnly` cookie, so JavaScript can never read it. Cookies are
  `SameSite=Lax` in development and `SameSite=None; Secure` in production.
- **CSRF protection.** Double-submit cookie pattern: state-changing requests must send an `X-CSRF-Token` header
  matching the CSRF cookie, compared in constant time.
- **Rate limiting.** Login and signup are limited to 5 attempts per 15 minutes per IP.
- **Atomic signup.** Creating a company and its owner happens inside a single MongoDB transaction.
- **Verified isolation.** An automated test suite creates two businesses and checks that neither can read or
  modify the other's debtors, charges, payments, dashboard or settings.

## Project structure

```
UdhaarHub/
├── backend/
│   ├── server.js            # entry point (connects to MongoDB, starts the server)
│   ├── src/
│   │   ├── app.js           # Express app, middleware, routes
│   │   ├── config/          # environment config, database connection
│   │   ├── controllers/     # auth, debtor, charge, payment, dashboard, company, user
│   │   ├── middlewares/     # auth, CSRF, rate limiting
│   │   ├── models/          # User, Company, Debtor, Charge, Payment
│   │   ├── routes/
│   │   └── utils/           # password, phone, token helpers
│   └── tests/               # isolation and business-rule tests
└── frontend/
    └── src/
        ├── api/             # Axios client and API modules
        ├── components/      # shared UI (navbar, tab bar, rows, modals)
        ├── context/         # AuthContext
        ├── hooks/
        ├── pages/           # Dashboard, Debtors, Activity, Settings, forms
        └── utils/
```

## Getting started

### Prerequisites

- Node.js 20 or newer
- A MongoDB **replica set**. A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works out of the box.
  A standalone local MongoDB will not work, because signup uses transactions.

### 1. Clone

```bash
git clone https://github.com/<your-username>/UdhaarHub.git
cd UdhaarHub
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill in your values (see below)
npm run dev               # or: npx nodemon server.js
```

The API runs on `http://localhost:5000`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`, create an account and add your first debtor.

### Environment variables

**`backend/.env`**

| Variable | Required | Description |
| --- | --- | --- |
| `MONGO_URI` | yes | MongoDB connection string (Atlas) |
| `JWT_SECRET` | yes | Long random string used to sign tokens |
| `JWT_EXPIRY` | no | Token lifetime, default `30d` |
| `PORT` | no | Server port, default `5000` |
| `FRONTEND_URL` | yes | Allowed origin for CORS and cookies, e.g. `http://localhost:5173` |

**`frontend/.env`**

| Variable | Description |
| --- | --- |
| `VITE_API_BASE_URL` | Backend API base URL, e.g. `http://localhost:5000/api` |

Never commit a real `.env` file. Only the `.env.example` files belong in the repository.

## Running the tests

```bash
cd backend
npm test
```

The suite runs 40 tests against a throwaway in-memory MongoDB. It never reads your real `.env` or touches your
real database. The first run downloads a MongoDB binary, so it needs an internet connection and takes a minute.

## API overview

All routes except signup and login require the auth cookie. State-changing requests also need the
`X-CSRF-Token` header.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Debtors | `POST /api/debtors`, `GET /api/debtors`, `GET /api/debtors/:id`, `PATCH /api/debtors/:id`, `PATCH /api/debtors/:id/status`, `GET /api/debtors/:id/ledger` |
| Charges | `POST /api/charges`, `GET /api/charges`, `GET /api/charges/:id`, `PATCH /api/charges/:id`, `POST /api/charges/:id/reverse` |
| Payments | `POST /api/payments`, `GET /api/payments`, `GET /api/payments/:id`, `PATCH /api/payments/:id`, `POST /api/payments/:id/reverse` |
| Dashboard | `GET /api/dashboard/summary`, `/debtors`, `/overdue`, `/recent-activity`, `/upcoming` |
| Settings | `GET` and `PATCH /api/companies/:id`, `PATCH /api/users/me` |

## Roadmap

- [ ] Deployment (Render for the API, Vercel for the web app)
- [ ] Redesign the remaining desktop pages (debtor detail, forms, settings, login)
- [ ] Profile photos for debtors
- [ ] PDF export of a debtor's ledger
- [ ] WhatsApp / SMS payment reminders
- [ ] Staff accounts with roles
- [ ] Urdu language support

## Author

**Asnain Younas** - BS Computer Science student, Agriculture University of Peshawar.

- GitHub: [@asnainyounas](https://github.com/asnainyounas)
- LinkedIn: [Asnain Younas](https://www.linkedin.com/in/asnain-younas-a5b9643b7/)

---

*Built as a portfolio project to practise full-stack development: multi-tenant data modelling, secure
authentication, and testing the business rules that matter.*