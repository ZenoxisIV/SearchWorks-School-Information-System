Overview
--------
SearchWorks is a small school information system built with [Next.js](https://nextjs.org/) (App Router), [Fastify](https://fastify.dev/) (server routes), [Drizzle ORM](https://orm.drizzle.team/), and [Neon](https://neon.com/).

Setup
-----
1. Prerequisites
   - [Node.js](https://nodejs.org/en/download) 18+ (recommended)
   - [pnpm](https://pnpm.io/)
   - A Postgres-compatible database ([Neon](https://neon.com/) or [PostgreSQL](https://www.postgresql.org/))

2. Clone and install

```bash
git clone <repo-url>
cd SearchWorks-School-Information-System/sw-sis-app
pnpm install
```

3. Environment

- Create a `.env` file at the application's root directory (`sw-sis-app`). Required environment variables:

```
DATABASE_URL=postgresql://user:password@host:port/dbname
JWT_SECRET=<long-random-secret-at-least-32-chars>
COOKIE_SECRET=<optional; fallback to JWT_SECRET if not provided>
NODE_ENV=development
```

4. Database

- Generate and push schema (if you use Drizzle migrations / generate):

```bash
pnpm run db:generate   # generates migration / types (drizzle-kit)
pnpm run db:push       # push migrations to the database (drizzle-kit)
```

5. Seed data

- The repository includes a seed script at `db/seed.ts`. Run:

```bash
pnpm run db:seed
```

This script inserts an admin user, example courses, subjects, prerequisites, and 50 students.

6. Run the app

```bash
pnpm run dev
```

Environment Variables
------------------
- `DATABASE_URL` (required): connection string for the database used by Drizzle.
- `JWT_SECRET` (required): secret used to sign JWT tokens. Must be set and preferably >= 32 characters in production.
- `COOKIE_SECRET` (optional): cookie signing secret. If omitted, `JWT_SECRET` is used.
- `NODE_ENV` (optional): `development` or `production`.

Seed Instructions
-------------------------
- Script location: `db/seed.ts`.
- How to run: `pnpm db:seed` (the script uses `tsx` and will load `.env` automatically per the `package.json` script).
- What it creates:
  - Admin user: `admin@searchworks.edu.ph` / password `admin123`
  - 5 courses and 15 subjects (3 per course)
  - Several prerequisite relations
  - 50 students distributed across the courses

Admin Credentials
-----------------
- Email: `admin@searchworks.edu.ph`
- Password: `admin123`

Key Assumptions and Validation Rules
-----------------------------------

- How prerequisites are considered “taken/passed”
  - A prerequisite subject is considered "taken and passed" only when there is a `grades` record for that student & subject where the `remarks` column equals `PASSED`.
  - The prerequisite checker is implemented in `lib/routes/utils.ts` (function `checkPrerequisites`) and uses `remarks === "PASSED"` to determine passing.

- Passing grade threshold / remarks rule
  - Final grade computation uses a weighted average by default: Prelim 20%, Midterm 30%, Finals 50%.
  - The computed weighted average is rounded to the nearest 0.25 increment (Math.round(value * 4) / 4).
  - Mapping to `remarks`:
    - `PASSED` if final grade <= 3.0
    - `FAILED` if final grade > 3.0
  - Implementation: `lib/grades.ts` (`calculateFinalGrade` and `calculateSimpleAverage`).

- Reservation behavior when missing prerequisites (error format)
  - When attempting to create a reservation via `POST /api/reservations`, the server verifies that the student belongs to the same course and that all prerequisites are satisfied.
  - If prerequisites are missing, the response is HTTP 400 with JSON body:

```json
{ "message": "Missing prerequisites: [CODE1, CODE2]" }
```

  - If the student and subject courses don't match, the response is HTTP 400 with `{ "message": "Subject doesn't match student's course." }`.
  - If the reservation already exists, the server responds with HTTP 400 and `{ "message": "Already reserved." }`.

Seed Scripts
------------
- Primary seed entrypoint: `db/seed.ts` (runs with `pnpm db:seed`).
- The seed script performs the following major steps:
  1. Creates an admin user (email and password printed to console).
  2. Inserts courses.
  3. Inserts subjects and links them to courses.
  4. Inserts subject prerequisite relationships.
  5. Inserts a set of example students.

Code References
---------------
- Prerequisite checking: `lib/routes/utils.ts`
- Grade calculation: `lib/grades.ts`
- Seed script: `db/seed.ts`
- Reservation endpoints: `lib/routes/reservations.ts`

Video Demo
---------------
See the demo through this [YouTube](https://youtu.be/mlzT2eWtQck) link.

License
-------
See repository `LICENSE`.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
