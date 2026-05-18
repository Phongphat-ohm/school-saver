# SchoolSaver Agent Guide

This file is for AI coding agents working on this repository. Read it before changing code.

## Project Overview

SchoolSaver is a classroom/school saving and collection management system. It manages workspaces, members, collection rounds, payments, overdue balances, reports, activity logs, account recovery, and public member-card payment lookup pages.

Primary users:
- Workspace owners/admins: manage users, members, rounds, payment methods, reports, and workspace settings.
- Collectors: receive payments and manage overdue payments.
- Viewers: view dashboard/reports where allowed.
- Public members: open a shared member-card URL, search themselves, check balances/history, and view payment QR/details.

## Tech Stack

- Framework: Next.js 16 App Router
- Language: TypeScript
- UI: React 19, Tailwind CSS 4, lucide-react icons
- Database: PostgreSQL
- ORM: Prisma 7 with generated client in `src/generated/prisma`
- Validation: Zod
- Auth/session: custom cookie session helpers in `src/lib/session.ts`
- Alerts/modals: SweetAlert2 via `src/lib/swal.ts`
- QR: `@lglab/react-qr-code`, `@yudiel/react-qr-scanner`
- Charts: Chart.js / react-chartjs-2
- Spreadsheet export: `xlsx`

Important commands:
- `bun run dev`
- `bun run typecheck`
- `bun run build`
- `bunx prisma generate`
- `bun run prisma:migrate`
- `bun run prisma:deploy`

Always run at least `bun run typecheck` after meaningful TypeScript changes. Run `bun run build` after route/schema/frontend work.

## Architecture Overview

The project uses a feature-first structure:

- `src/app/*`: Next.js App Router pages and route entry points.
- `src/features/<domain>/actions.ts`: server actions and database operations for one domain.
- `src/features/<domain>/schemas.ts`: Zod schemas for that domain.
- `src/features/<domain>/components/*`: UI components for that domain.
- `src/lib/*`: shared infrastructure helpers.
- `src/components/ui/*`: reusable low-level UI components.
- `src/components/layout/*`: app shell, sidebar, header, nav, role gate.
- `src/constants/*`: app constants such as routes, roles, statuses, payment method labels.
- `prisma/schema.prisma`: source of truth for data models.
- `prisma/migrations/*`: database migrations.

Most mutations are server actions. Client components call actions, show SweetAlert feedback, then `router.refresh()`.

## Data Model Summary

Main Prisma models:

- `User`: login account. Can be `ACTIVE` or `INACTIVE`; cancelled accounts have `cancelledAt`, `restoreUntil`, and can be restored within 30 days.
- `Workspace`: tenant/work area. Has `memberCardToken` for public member-card URLs.
- `WorkspaceMember`: user membership and role in a workspace. Removing a user from a workspace should remove/deactivate membership only, not cancel the `User` account.
- `WorkspaceInvitation`: invite and join-request workflow.
- `Member`: school/class member being charged/collected from. This is not the same as `User`.
- `CollectionRound`: collection cycle with target amount, date range, fine settings, and status.
- `MemberRound`: per-member balance state inside one round.
- `PaymentTransaction`: individual payment transaction.
- `PaymentMethod`: cash/bank/PromptPay/other payment methods and optional QR image.
- `ActivityLog`: audit/security/activity events with IP/user-agent/path metadata.
- `EmailVerificationOtp`, `PasswordResetToken`: account verification/recovery.

## Core Business Rules

- Workspace data must always be scoped by `workspaceId`.
- Use `getCurrentWorkspaceOrThrow()` for read actions that require current workspace.
- Use `requireWorkspaceRole(...)` for protected mutations.
- Role permissions are defined in `src/lib/permissions.ts`.
- Do not cancel or anonymize a `User` when removing them from a workspace. Only remove/deactivate the workspace membership.
- Account cancellation is separate and handled by `cancelMyAccountAction` in `src/features/users/actions.ts`.
- Cancelled accounts are restorable for 30 days via restore session and OTP.
- Login must verify username and password before revealing/handling inactive account restore flow.
- Dates and display time are intentionally based on Asia/Bangkok. Use helpers in `src/lib/date.ts`; do not hand-roll date formatting.
- Payment/fine status should be calculated through `calculateCurrentMemberRound()` in `src/lib/fine.ts`.
- Payment transaction edits/deletes must recalculate the related `MemberRound`.
- Activity/security-sensitive actions should log via `logActivity`, `logSecurityFailure`, or `writeActivityLog`.

## Coding Style

- Prefer TypeScript with explicit domain shapes where practical; avoid `any` unless matching existing component patterns.
- Keep server actions in `actions.ts`; keep validation in `schemas.ts`.
- Use Zod for all user/action input validation.
- Use shared result helpers from `src/lib/result.ts`: `successResult` and `errorResult`.
- Use shared UI components from `src/components/ui/*` before creating new component primitives.
- Use `Button`, `Input`, `Select`, `Modal`, `EmptyState`, `Card`, `StatusBadge` consistently.
- Use lucide-react icons for icon buttons and labels.
- Use SweetAlert helpers from `src/lib/swal.ts` for confirmations, loading, success, error, and typed confirmation.
- Use `formatMoney()` from `src/lib/money.ts`.
- Use `formatThaiDate`, `formatThaiDateTime`, `formatInputDate`, `startOfDay`, `endOfDay` from `src/lib/date.ts`.
- For Prisma changes: update `prisma/schema.prisma`, add a migration, run/generate Prisma Client.
- After adding new Prisma fields, run `bunx prisma generate` or `bun run build`.
- Revalidate affected pages using `revalidatePath()` in server actions after mutations.
- Prefer responsive Tailwind layouts. Mobile should be usable for payment/member-card flows.
- Avoid unrelated refactors. Keep changes close to the requested feature.

## UI/UX Conventions

- Admin/collector flows use dense, practical dashboard UI.
- Public member-card pages are mobile-first and responsive.
- Destructive actions should use SweetAlert confirmation.
- Workspace delete uses text input confirmation.
- Payment receive/edit/delete should show loading and success/error alerts.
- Do not expose private workspace data on public pages except the intended member-card lookup result.

## Important Files

Application shell and routing:
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/proxy.ts`
- `src/constants/routes.ts`
- `src/components/layout/AppLayout.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/RoleGate.tsx`

Database and infrastructure:
- `prisma/schema.prisma`
- `prisma/migrations/`
- `src/lib/prisma.ts`
- `src/lib/session.ts`
- `src/lib/auth.ts`
- `src/lib/permissions.ts`
- `src/lib/workspace.ts`
- `src/lib/result.ts`
- `src/lib/date.ts`
- `src/lib/fine.ts`
- `src/lib/activity-log.ts`
- `src/lib/email-verification.ts`
- `src/lib/password-reset.ts`
- `src/lib/swal.ts`

Authentication and account lifecycle:
- `src/features/auth/actions.ts`
- `src/features/auth/schemas.ts`
- `src/features/auth/components/LoginForm.tsx`
- `src/features/auth/components/RegisterForm.tsx`
- `src/features/auth/components/RestoreAccountForm.tsx`
- `src/app/restore-account/page.tsx`
- `src/features/users/actions.ts`
- `src/features/settings/components/AccountCancellationForm.tsx`

Workspace and users:
- `src/features/workspace/actions.ts`
- `src/features/workspace/schemas.ts`
- `src/features/workspace/components/WorkspaceMemberList.tsx`
- `src/features/workspace/components/WorkspaceInviteForm.tsx`
- `src/features/workspace/components/WorkspaceJoinQr.tsx`
- `src/features/workspace/components/WorkspaceMemberCardLink.tsx`
- `src/app/workspaces/manage/page.tsx`
- `src/features/users/components/UserTable.tsx`
- `src/features/users/components/UserForm.tsx`

Members:
- `src/features/members/actions.ts`
- `src/features/members/schemas.ts`
- `src/features/members/components/MemberTable.tsx`
- `src/features/members/components/MemberForm.tsx`
- `src/features/members/components/MemberCard.tsx`
- `src/features/members/components/MemberQrButton.tsx`
- `src/app/members/page.tsx`

Rounds and collection:
- `src/features/rounds/actions.ts`
- `src/features/rounds/schemas.ts`
- `src/features/rounds/components/RoundTable.tsx`
- `src/features/rounds/components/RoundForm.tsx`
- `src/features/rounds/components/RoundMemberList.tsx`
- `src/features/rounds/components/RoundSummary.tsx`
- `src/features/rounds/components/RoundDepositExportButton.tsx`
- `src/app/rounds/page.tsx`
- `src/app/rounds/[id]/page.tsx`

Payments:
- `src/features/payments/actions.ts`
- `src/features/payments/schemas.ts`
- `src/features/payments/components/PaymentForm.tsx`
- `src/features/payments/components/PaymentCard.tsx`
- `src/features/payments/components/PaymentSearch.tsx`
- `src/features/payments/components/PaymentRoundFilter.tsx`
- `src/features/payments/components/PaymentHistory.tsx`
- `src/features/payments/components/CancelPaymentButton.tsx`
- `src/app/payments/page.tsx`
- `src/app/payments/history/page.tsx`
- `src/app/overdue/page.tsx`

Payment methods:
- `src/features/payment-methods/actions.ts`
- `src/features/payment-methods/schemas.ts`
- `src/features/payment-methods/components/PaymentMethodForm.tsx`
- `src/features/payment-methods/components/PaymentMethodTable.tsx`
- `src/app/payment-methods/page.tsx`

Dashboard and reports:
- `src/features/dashboard/actions.ts`
- `src/features/dashboard/components/DashboardCards.tsx`
- `src/features/dashboard/components/RoundTotals.tsx`
- `src/features/dashboard/components/OpenRounds.tsx`
- `src/features/dashboard/components/RecentTransactions.tsx`
- `src/app/dashboard/page.tsx`
- `src/features/reports/actions.ts`
- `src/features/reports/components/ReportDashboard.tsx`
- `src/app/reports/page.tsx`

Public member card:
- `src/app/member-card/[token]/page.tsx`
- `src/features/member-card/actions.ts`
- `src/features/member-card/components/PublicMemberCard.tsx`

Activity logs:
- `src/features/activity-logs/actions.ts`
- `src/features/activity-logs/components/ActivityLogList.tsx`
- `src/app/activity-logs/page.tsx`

## Feature Notes

### Payments

Use `payMemberRoundAction()` to create payments. Use `updatePaymentTransactionAction()` to edit payment transactions. Use `cancelPaymentTransactionAction()` to delete/cancel payment transactions. All of these should keep `MemberRound` totals/statuses correct.

### Member Card

Workspace admins share `/member-card/[memberCardToken]`. The public page allows searching members and viewing balances/history/payment QR. `memberCardToken` is stored on `Workspace`; do not replace it with raw workspace IDs in public URLs.

### Account Restore

Inactive/cancelled users must log in with correct username and password first. Login creates a restore session and redirects to `/restore-account?username=...`. Direct access to restore page without restore session or username should redirect to login.

### Activity Log / Bot Blocking

Activity logging includes IP/user-agent/method/path. Login failures are security logged. `isRequestIpBlocked()` protects repeated failure abuse. Do not remove this from login flow.

## Common Verification Checklist

Before finishing a change:

1. Run `bun run typecheck`.
2. Run `bun run build` for route, Prisma, schema, or frontend page changes.
3. Confirm affected pages are revalidated after mutations.
4. Confirm workspace-scoped queries include `workspaceId`.
5. Confirm protected actions use `requireWorkspaceRole`.
6. Confirm public pages do not require normal auth unless intended.
7. Confirm payment changes recalculate `MemberRound`.

## Known Warning

There is also an `AGENTS.md` file with a Next.js 16 warning. Keep that warning in mind: App Router APIs and conventions may differ from older Next.js versions.
