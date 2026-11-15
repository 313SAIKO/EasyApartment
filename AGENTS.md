# EasyApartment working instructions

## User preferences

- Communicate with the user in Thai, clearly and concisely.
- Work autonomously on the requested task from implementation through verification. Do not stop at a plan or repeatedly ask whether to continue.
- Make routine, reversible implementation decisions yourself within the authorized scope. Fix recoverable errors and continue testing without waiting for a reply.
- Give brief progress updates about meaningful findings and remaining work; updates do not require the user to respond.
- Ask only when essential information cannot be inferred or retrieved, or an action requires authorization not already provided. Continue independent work while blocked.
- Respect environment approval requirements. These instructions do not disable sandbox controls or authorize unrelated destructive actions, publication, or disclosure of secrets.
- Preserve existing user changes. Never discard work to get a clean checkout.
- Finish with actual changes, verification results, and any remaining limitations. Do not claim that the application works merely because it builds.

## Current project direction

- Continue EasyApartment as the user's independently maintained project.
- PostgreSQL with Prisma is the selected database stack. A fresh development database with test data is authorized; migration of old MongoDB data is not required.
- Keep credentials in untracked environment files. Never commit or print database passwords, tokens, or real environment files.
- Preserve frontend/API compatibility while migrating, including role restrictions, tenant ownership, refresh-token rotation, and logout behavior.
- Verify affected workflows and access controls with appropriate tests. Distinguish real PostgreSQL integration tests from mocked tests and report external services that could not be verified.
- Test fixtures and cleanup must be restricted to identifiable test data in the development/test database.
