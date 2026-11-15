# EasyApartment

Apartment management application built with NestJS, Next.js 16, PostgreSQL and Prisma. Features include admin/tenant authentication, rooms, rental contracts, monthly invoices, payment review, maintenance and an admin dashboard.

## Local setup

Requirements: Node.js 22.12+ (tested with Node 24), npm and PostgreSQL (tested with PostgreSQL 18).

1. Create an empty PostgreSQL database named `easyapartment_dev` using your PostgreSQL administrator account.
2. In `backend`, run `npm ci` and copy `.env.example` to `.env`. Set `DATABASE_URL`, two different random JWT secrets and a `SEED_PASSWORD` of at least 12 characters. Cloudinary credentials are needed for actual image uploads.
3. Run these commands in `backend`:

```sh
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

4. In a second terminal, enter `frontend`, run `npm ci`, copy `.env.example` to `.env`, then run `npm run dev`.
5. Open http://localhost:3001. The API is http://localhost:3000/api/v1.

The frontend uses `NEXT_PUBLIC_API_URL`, including `/api/v1`. Local CORS allows `http://localhost:3001`. Keep all actual environment files untracked. Never put database or JWT secrets in frontend environment variables.

## Demo data

The seed only runs against `easyapartment_dev`. It creates:

- `admin@example.test`: administrator.
- `tenant1@example.test`: tenant of room DEMO-101, with a contract, November 2026 invoice and maintenance request.
- `tenant2@example.test`: tenant without a contract, useful for testing access restrictions.
- DEMO-102: available room.

All three accounts initially use `SEED_PASSWORD` from `backend/.env`. Re-running the seed preserves existing records and passwords. Demo data is not intended for production.

## Verification

In `backend`:

```sh
npm run db:generate
npm run db:migrate
npm test -- --runInBand
npm run test:integration
```

The integration verifier starts the real application against `easyapartment_dev`, creates unique fixtures and removes only those fixtures. It checks registration, login, refresh rotation and concurrent replay rejection, logout, role/tenant isolation, rooms, contracts, invoices, duplicate rollback, meter restoration, maintenance and dashboard APIs. Cloudinary uploads and the rate limiter are replaced in this integration test; it does not prove external image storage works. Unit/API guard tests use database mocks.

In `frontend`:

```sh
npm run build -- --webpack
```

For production-style local startup, build the backend with `npm run build` then use `npm run start:prod`; start the built frontend with `npm start`.

## Database behavior

Prisma schema and committed SQL migrations live in `backend/prisma`. This version starts with fresh PostgreSQL data; it does not import old MongoDB records. API responses retain `_id` and nested room/tenant fields for frontend compatibility, but identifiers are UUIDs.

Contracts enforce one active contract per room. Deleting a contract cancels it and retains history. A contract with invoices cannot be reassigned to another room or tenant. Invoice totals use decimal arithmetic, water at 10 and electricity at 8 per unit. Only the latest unpaid invoice without payment evidence can be deleted; its meter readings are restored transactionally. Reviewed or submitted payments remain in history.

If PostgreSQL cannot connect, check the service, database existence and `DATABASE_URL`. Apply migrations before starting the API. For CORS errors, verify the frontend origin and backend API URL rather than disabling access controls.

## Project origins and credits

EasyApartment began as a student team project. This version is independently maintained by a member of the original team with the team's agreement. Credit for the original work goes to the EasyProperty Team; see the [original repository](https://github.com/kam345678/EasyApartment) for its contribution history.
