# Queue Management System

A comprehensive, production-ready queueing system for multi-lane service environments. Built with Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, and MySQL (Prisma ORM).

---

## 🚀 Features

### User Roles
- **Admin**: Full dashboard access, manage users and lanes
- **User (Cashier/Staff)**: Queue operations for assigned lanes (Next, Call, Buzz, Serve)
- **Display**: Real-time display of all active lanes and queue status
- **Reservation**: Customer-facing interface to get queue numbers and wait times

### Core Functions
- **Admin Dashboard**: Manage lanes, users, assignments, and view live stats
- **Queue Operations**: Advance, call, buzz, and serve queue numbers (per lane, per day, with daily reset)
- **Reservation System**: Customers select a lane, get a queue number, and see estimated wait
- **Display System**: Shows all active lanes, current/next numbers, and queue status in real time
- **Role-based Authentication**: Custom, secure, no third-party providers
- **Daily Reset**: Queue numbers and stats are always based on today’s operations only
- **Responsive UI**: Built with shadcn/ui and Tailwind CSS for a modern, accessible experience
- **Physical Ticket Printing**: Print queue tickets for customers (if printer is connected)
- **Real-Time Updates**: All interfaces update automatically for live queue status

### Tech Stack
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: MySQL
- **Authentication**: Custom JWT-based

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- MySQL

### Installation
```bash
git clone <repo-url>
cd queue
npm install
```

### Environment Setup
Copy `.env.example` to `.env` and update DB credentials and secrets.

### Database Setup
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run build:production
```

---

## 🧑‍💻 Demo Users (Default Seed)
- **Admin**: admin / admin123
- **Cashier 1**: c1 / 123
- **Cashier 2**: c2 / 123

## 🏢 Demo Lanes (Default Seed)
- **Regular Lane**: General queue for all customers
- **PWD Lane**: Priority for PWDs and Senior Citizens

---

## 🗂️ Project Structure
```
src/
  app/
    admin/         # Admin dashboard
    user/          # Cashier interface
    display/       # Display screens
    reservation/   # Customer reservation
    api/           # API routes
  components/
    ui/            # shadcn/ui components
  lib/             # Auth, Prisma, utils
prisma/            # Prisma schema & migrations
public/            # Static assets
scripts/           # Seed and utility scripts
```

---

## 🔗 Key API Endpoints
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout
- `GET /api/lanes` — List all lanes (today's stats)
- `GET /api/queue/reservation` — Lane status for reservation (today only)
- `POST /api/queue/reservation` — Get a new queue number
- `POST /api/queue/operations` — Queue actions (Next, Call, Buzz, Serve)
- `GET /api/users/assigned-lanes` — Lanes assigned to current user (today only)

---

## 📝 Development Scripts
- `npm run dev` — Start dev server
- `npm run build` — Build for production
- `npm run build:production` — Create deployable package
- `npm run db:generate` — Generate Prisma client
- `npm run db:push` — Push schema to DB
- `npm run db:seed` — Seed DB with demo data

---

## 🏗️ Database Entities
- **User**: System users (admin, cashier, etc.)
- **Lane**: Service lanes (regular, PWD, etc.)
- **LaneUser**: Assignment of users to lanes
- **QueueItem**: Queue entries (per lane, per day)

---

## 📦 Production Deployment
1. Run `npm run build:production` (see `production/` folder)
2. Copy `production/` to your server
3. Run `deploy.bat` as Administrator

---

## 📄 License
MIT

---

## ❤️ Support This Project

If you find this project useful, consider supporting me:

- 💖 [GitHub Sponsors](https://github.com/sponsors/kmredosendo)
- ☕ [Buy Me a Coffee](https://buymeacoffee.com/arbitex)
- 🎁 [Ko-fi](https://ko-fi.com/arbitex)

Your support keeps this project alive and maintained!

---

For questions or support, open an issue in this repository.
