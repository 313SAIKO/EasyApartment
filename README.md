# EasyApartment

[![CI](https://github.com/313SAIKO/EasyApartment/actions/workflows/ci.yml/badge.svg)](https://github.com/313SAIKO/EasyApartment/actions/workflows/ci.yml)

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

GitHub Actions runs [CI](https://github.com/313SAIKO/EasyApartment/actions/workflows/ci.yml) on every push and pull request, and can also be started manually from the Actions tab. Two jobs run on Ubuntu with Node.js 24:

- **Backend:** installs locked dependencies, generates Prisma, applies migrations to a fresh PostgreSQL 18 service, runs unit/access-control tests, builds NestJS and tests real persisted workflows. Test JWT secrets are generated for each run; no repository secrets or local `.env` files are required.
- **Frontend:** builds Next.js and runs Chromium tests at desktop and mobile sizes. UI tests mock API responses; Cloudinary is mocked in backend integration tests. Browser reports, screenshots and failure traces are available under the run's artifacts for seven days.

The PostgreSQL service is disposable and bound to runner loopback. It contains only test fixtures and is removed after the job. A failed build or test makes its CI job fail; the badge above shows the workflow status.

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
npx playwright install chromium
npm run test:ui
```

The browser suite starts the built frontend on port 3101. It covers all 16 screen routes at desktop and mobile sizes, navigation, empty/error states, profile saving, contract edit/cancel, registration retry, billing, maintenance, recovery and CSV download. API responses are mocked in these UI tests; PostgreSQL behavior is checked separately by the backend integration verifier. Screenshots and failure traces are written to the ignored `frontend/test-results` directory. Set `NEXT_PUBLIC_API_URL` to an API URL ending in `/api/v1` before building.

For production-style local startup, build the backend with `npm run build` then use `npm run start:prod`; start the built frontend with `npm start`.

## Database behavior

Prisma schema and committed SQL migrations live in `backend/prisma`. This version starts with fresh PostgreSQL data; it does not import old MongoDB records. API responses retain `_id` and nested room/tenant fields for frontend compatibility, but identifiers are UUIDs.

Contracts enforce one active contract per room. Deleting a contract cancels it and retains history. A contract with invoices cannot be reassigned to another room or tenant. Invoice totals use decimal arithmetic, water at 10 and electricity at 8 per unit. Only the latest unpaid invoice without payment evidence can be deleted; its meter readings are restored transactionally. Reviewed or submitted payments remain in history.

If PostgreSQL cannot connect, check the service, database existence and `DATABASE_URL`. Apply migrations before starting the API. For CORS errors, verify the frontend origin and backend API URL rather than disabling access controls.

## Portfolio demo workflows

- Logout, password changes and administrator password resets revoke existing access and refresh tokens. Each protected request checks the current account role. After upgrading to the session-version migration, sign in again; older tokens are rejected.
- Room occupancy is controlled by active contracts. Manually marking an occupied room as available (or an empty room as occupied) returns a conflict. Bulk room creation rolls back the entire batch if any room fails.
- Reports (`/admin/reports`) filter invoices by billing month, show billed/confirmed/outstanding totals, and export CSV. Confirmed totals belong to the invoice period, not the month cash was received.
- Forgotten passwords use administrator-assisted recovery: the tenant contacts the apartment administrator, who verifies their identity and uses **กู้บัญชีผู้เช่า** to generate a temporary password. The tenant can then change it under **บัญชีของฉัน**. There is no automated reset email service; administrator-account recovery is outside this demo workflow.
- Removing an avatar clears the image from that user's profile. It does not delete the cloud asset; cloud ownership verification and asset cleanup are deferred with the upload security work. Cloudinary is still required for real uploads.
- Tenant profile editing saves only the signed-in account’s name and phone; roles, email and other accounts cannot be changed through this endpoint. Registration keeps a newly created account available for retry if contract creation fails; retry in the same page and retain the temporary password before leaving.
- Integration tests also cover immediate token revocation, tenant password recovery, bulk rollback, room-status conflicts, report totals/access, and avatar removal. Cloudinary remains mocked.

## Project origins and credits

EasyApartment began as a student team project. This version is independently maintained by a member of the original team with the team's agreement. Credit for the original work goes to the EasyProperty Team; see the [original repository](https://github.com/kam345678/EasyApartment) for its contribution history.
