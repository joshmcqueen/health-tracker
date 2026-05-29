# Health Tracker

A lightweight, mobile-first health tracker inspired by MyFitnessPal. It tracks weight, foods, reusable meals, daily calorie and macro intake, and visual trends over time.

The app is built for one personal user and does not include authentication.

## Stack

- Vite + React + TypeScript
- Node + Express
- SQLite via `better-sqlite3`
- pnpm
- TanStack Query
- Recharts

## Features

- Add, edit, and delete weight logs
- Use the Food screen as a focused daily diary for the selected date
- Add, edit, and delete saved foods on a dedicated Foods screen
- Create foods from nutrition facts labels and scale calories/macros by serving quantity
- Create, edit, and delete reusable meals on a dedicated Meals screen
- Log saved foods or meals into the current day
- Track configurable calorie, protein, carb, and fat goals
- View charts for weight, calories, and macros over time
- Store all data locally in SQLite

## Getting Started

Install dependencies:

```bash
pnpm install
```

Run the app locally:

```bash
pnpm dev
```

Open:

```text
http://localhost:5173
```

The API runs on:

```text
http://localhost:3001
```

## Database

The SQLite database is created automatically at:

```text
data/health-tracker.sqlite
```

Seed the database with sample foods, meals, weight logs, and food logs:

```bash
pnpm seed
```

The seed script is safe to rerun for demo data. It reuses existing named foods, recreates the sample meals, and refreshes seeded food logs for the sample date range.

## Scripts

```bash
pnpm dev       # Run Vite and the Express API together
pnpm build     # Type-check and build the frontend/backend
pnpm start     # Run the built production server
pnpm seed      # Add sample data to SQLite
pnpm test      # Run backend behavior tests
```

## Project Layout

```text
src/       React app and mobile UI
server/    Express API, SQLite setup, repository, seed script
shared/    Shared TypeScript types
tests/     Backend behavior tests
data/      Local SQLite database, ignored by git
```

## Notes

- Weight defaults to pounds.
- Nutrition is stored per labeled serving.
- The Food screen only shows the selected day's totals, quick log controls, and logged entries.
- Saved food and meal management live on separate screens to keep daily logging simple.
- Logged food and meals are saved as nutrition snapshots so older logs remain stable if a food or meal changes later.
- External nutrition APIs and barcode scanning are not included in this first version.
