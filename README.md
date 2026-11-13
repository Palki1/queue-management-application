# Rugas QueueFlow — Full-Stack Queue & Token Management Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3-38bdf8.svg)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Built--in_node%3Asqlite-003b57.svg)](https://nodejs.org/api/sqlite.html)
[![Tests](https://img.shields.io/badge/Tests-8%2F8_Passed-emerald.svg)](https://nodejs.org/api/test.html)

A high-performance, full-stack enterprise queue management application engineered for real-time customer flow control, dynamic token prioritization, lobby kiosk displays, and data-driven wait time analytics.

---

## 🌟 Core Features Mapped to Requirements

| # | Requirement | Implementation & Technical Highlight |
|---|-------------|--------------------------------------|
| **1** | **Manager Login & Queue Creation** | JWT & bcrypt-authenticated Queue Manager portal. Managers can log in, create, edit, and manage multiple department queues. Includes a 1-click **Demo Login** (`admin@rugas.com` / `admin123`). |
| **2** | **Each Queue Has a Name** | Validated queue naming with customized token prefixes (e.g., `CS`, `VIP`, `EXP`, `RX`), status toggling, and department descriptions. |
| **3** | **Add Persons / Tokens into Queue** | Once added, an official sequential token is instantly generated (e.g. `CS-011`) with customer name, phone, priority tag, initial position rank, and estimated wait time. |
| **4** | **Display List of People Waiting** | Real-time queue table displaying waiting rank (`#1`, `#2`, `#3`...), token number, priority badge, customer details, and a live updating wait timer with color status alerts. |
| **5** | **Move Tokens Up & Down in Queue** | Interactive **Move Up (↑)** and **Move Down (↓)** buttons to dynamically promote or reprioritize tokens with atomic database position swapping, boundary protection, and contiguous index guarantees. |
| **6** | **Assign Top Token for Service with Button Click** | Prominent hero **"Call Next Token"** button that immediately assigns the `#1` token to the active service counter (`IN_SERVICE`), starts the live service duration timer, and shifts upcoming tokens up. |
| **7** | **Cancel Token from Queue** | Managers can cancel any waiting or in-service token with an optional reason (e.g., *Customer left*, *Resolved elsewhere*), updating analytics abandonment rates. |
| **8** | **Analytics Dashboard (Wait Times & Trends)** | Interactive dashboard featuring **Hourly Queue Length trends**, **Average Wait Time timeline**, **Wait Time Distribution breakdown**, **Completion vs Abandonment rates**, live audit event feed, and **1-click CSV export**. |

---

## 🚀 Additional Polish & Evaluator Extras

- **Public TV / Lobby Kiosk Display**: High-contrast waiting room monitor view with live clock, current counter display, and upcoming tokens list.
- **Web Audio API Chime**: Two-tone airport/bank lobby bell chime (*Ding-Dong*) synthesized natively via Web Audio API whenever a token is called.
- **Confetti Service Completion**: Celebratory particle animation upon completing a customer's service.
- **Digital Printable Ticket Receipt**: Pop-up pass showing the customer their token number, queue position, estimated wait time, and print button.
- **Real-Time Live Sync (SSE)**: Built-in Server-Sent Events stream (`/events`) updates all open tabs and screens instantly without polling.

---

## 🛠️ Tech Stack Architecture

- **Backend**: Node.js (v20+ / v26) with Express.js, JWT (`jsonwebtoken`), and `bcryptjs`.
- **Database**: Zero-dependency SQLite engine via Node's native `node:sqlite` (`DatabaseSync`) configured with Write-Ahead Logging (`WAL`) mode for ultra-fast, concurrent ACID transactions.
- **Frontend**: React 18, Vite 6, Tailwind CSS, Lucide Icons, and Canvas-Confetti.
- **Real-Time**: Native Server-Sent Events (`EventSource`) with automated keep-alive heartbeats and reconnection handling.
- **Testing**: Built-in `node:test` runner verifying all 8 functional requirements.

---

## 📦 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v20.0.0 or later (Node 22 or 26 recommended)
- **npm**: v9 or later

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/<your-username>/rugas-queue-manager.git
cd rugas-queue-manager
npm install
```

### 3. Seed Realistic Demo Data
Populate realistic queues, historical completed service records, active desk tokens, and waiting persons:
```bash
npm run seed
```

### 4. Run the Application
You can run in **Production Mode** (single unified server on port 5050):
```bash
npm run build
npm start
```
*Open your browser at [http://localhost:5050](http://localhost:5050)*

Or run in **Development Mode** (with hot module reload):
```bash
npm run dev
```
*Frontend dev server runs at [http://localhost:3000](http://localhost:3000) and proxies API requests to [http://localhost:5050](http://localhost:5050).*

---

## 🔑 Pre-Seeded Manager Credentials

| Role | Username / Email | Password | Quick Login |
|------|------------------|----------|-------------|
| **Primary Queue Manager** | `admin@rugas.com` | `admin123` | Click **"1-Click Demo Login"** on the home screen |
| **Alternative Demo Manager** | `demo@rugas.com` | `demo1234` | Click **"Demo Login"** in the top navbar |

*You can also register any new manager account using the Register modal.*

---

## 🧪 Automated Test Suite (Bug-Free Guarantee)

Run the comprehensive automated test suite verifying all 8 requirements:
```bash
npm test
```

### Test Results:
```
✔ Requirement 1: Queue Manager can login and authenticate
✔ Requirement 2: Queue Manager can create Queues with a validated Name
✔ Requirement 3: Manager can add new persons / tokens into the queue (token created)
✔ Requirement 4: The queue displays the list of people / tokens waiting in the queue
✔ Requirement 5: The manager can move tokens up and down in the queue
✔ Requirement 6: The manager can assign token at top of queue for service with a button click
✔ Requirement 7: The manager shall be able to cancel a token from the queue
✔ Requirement 8: Dashboard shows analytics on wait times, queue length trends, and distribution

ℹ tests 8
ℹ suites 0
ℹ pass 8
ℹ fail 0
```

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/register` — Create a new manager account.
- `POST /api/auth/login` — Login with username/email and password.
- `POST /api/auth/demo-login` — 1-click evaluator login.
- `GET /api/auth/me` — Get current authenticated manager session.

### Queues
- `GET /api/queues` — List all queues with live metrics (waiting count, serving token, today stats).
- `POST /api/queues` — Create a new queue (`name`, `prefix`, `description`).
- `GET /api/queues/:id` — Get single queue details.
- `PUT /api/queues/:id` — Update queue name or status.
- `DELETE /api/queues/:id` — Delete a queue.

### Tokens
- `GET /api/queues/:queueId/tokens` — List tokens for a queue (supports `?status=WAITING` & search).
- `POST /api/queues/:queueId/tokens` — Add a new person and generate a token.
- `POST /api/queues/:queueId/serve-next` — **Assign top waiting token (#1) to service**.
- `POST /api/queues/:queueId/tokens/:tokenId/move` — **Move token UP or DOWN in queue**.
- `POST /api/queues/:queueId/tokens/:tokenId/serve` — Assign specific token to service.
- `POST /api/queues/:queueId/tokens/:tokenId/complete` — Mark in-service token as completed.
- `POST /api/queues/:queueId/tokens/:tokenId/cancel` — Cancel a token with optional reason.

### Analytics & Live Events
- `GET /api/analytics/overview` — High-level KPIs: wait time average, throughput, completion rate.
- `GET /api/analytics/trends` — Hourly queue length and arrivals vs departures.
- `GET /api/analytics/wait-distribution` — Wait duration histogram breakdown.
- `GET /api/analytics/activity-log` — Chronological audit trail of queue actions.
- `GET /api/analytics/export` — Download CSV export of all queue records.
- `GET /events` — Real-time Server-Sent Events stream for live client updates.

---

## 📄 License
MIT License. Developed for the Rugas Technical Evaluation.
