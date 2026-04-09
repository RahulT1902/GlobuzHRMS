# GlobuzHRMS

A production-grade ERP and HRMS ecosystem designed for operational intelligence and seamless procurement workflows.

## 🚀 Key Modules
- **Procurement Hub**: End-to-end order lifecycle (Draft -> Submitted -> Approved -> Ordered -> Received).
- **Inventory Intelligence**: Real-time stock tracking, ledger entries, and automated audit logs.
- **Admin Configuration**: Master data management (Vendors, Products, Categories, Units).
- **Notification System**: Role-aware task badges and automated vendor email notifications via Resend.

## 🛠️ Project Structure
- `/backend`: Node.js, Express, Prisma (PostgreSQL).
- `/frontend`: React, Vite, TailwindCSS (Vanilla CSS components).

## ⚙️ Quick Start

### 1. Requirements
- Node.js (v18+)
- PostgreSQL (or Neon DB)

### 2. Installation
```bash
# Install root dependencies (if any)
npm install

# Backend setup
cd backend
npm install
cp .env.example .env  # Then update your variables
npx prisma generate
npx prisma migrate dev

# Frontend setup
cd ../frontend
npm install
```

### 3. Running Locally
```bash
# From root (if concurrent script setup) or individually:
cd backend && npm run dev
cd frontend && npm run dev
```

## 🔒 Security
- **Identity**: JWT-based authentication with token versioning.
- **Transactions**: Atomic DB transactions for procurement and inventory log integrity.
- **Environment**: Secrets are strictly isolated via `.env` (never committed).

---
© 2026 Globuz HRMS
