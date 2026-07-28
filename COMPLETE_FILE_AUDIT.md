# Complete first-party file inventory

Generated inventory of the first-party repository state on 2026-07-28T06:18:55.504Z.

## Outcome

- First-party files inventoried: **412**.
- Every row contains a hash of the exact file state.

This command is an inventory generator. It intentionally does **not** label files
as reviewed and does not claim that tests, builds, migrations, accessibility
checks, or release gates passed. Record executed verification and human review
evidence separately; an inventory script cannot self-certify those results.

## File inventory

| File | Layer | Bytes | SHA-256 (12) | Inventory status | Applicable verification |
|---|---:|---:|---:|---|---|
| `.dockerignore` | Configuration | 112 | `844507846169` | Inventoried | Configuration/documentation review |
| `.env.example` | Configuration | 2637 | `682c0c115532` | Inventoried | Configuration/documentation review |
| `.env.production.example` | Configuration | 1175 | `65183fc68009` | Inventoried | Configuration/documentation review |
| `.github/workflows/ci.yml` | Configuration | 2614 | `e0e2a90e5cd2` | Inventoried | Configuration/documentation review |
| `.gitignore` | Configuration | 275 | `8b7afb8dde87` | Inventoried | Configuration/documentation review |
| `.prettierrc.json` | Configuration | 145 | `8d96af5b7909` | Inventoried | Configuration/documentation review |
| `AUDIT_2026-07-25.md` | Documentation | 17991 | `22fbc4b68cf2` | Inventoried | Configuration/documentation review |
| `AUDIT_2026-07-28.md` | Documentation | 7322 | `96654a767c4e` | Inventoried | Configuration/documentation review |
| `BACKEND_FRONTEND_COVERAGE.md` | Documentation | 1016 | `8f6427795d2b` | Inventoried | Configuration/documentation review |
| `Dockerfile` | Configuration | 1615 | `e1a728317f10` | Inventoried | Configuration/documentation review |
| `FRAD_Recruitment_Preboarding_README.md` | Documentation | 96289 | `1fae6f8f53b7` | Inventoried | Configuration/documentation review |
| `IMPLEMENTATION_2026-07-25.md` | Documentation | 17705 | `3abefc3decc6` | Inventoried | Configuration/documentation review |
| `README.md` | Documentation | 7442 | `3905f278c4f5` | Inventoried | Configuration/documentation review |
| `README_CONFORMANCE_AUDIT.md` | Documentation | 11033 | `33c709817ecf` | Inventoried | Configuration/documentation review |
| `RECOMMENDATIONS_2026-07-25.md` | Documentation | 17878 | `3116896d15c6` | Inventoried | Configuration/documentation review |
| `RECOMMENDATIONS_IMPLEMENTED.md` | Documentation | 4994 | `276139d51c58` | Inventoried | Configuration/documentation review |
| `REMEDIATION.md` | Documentation | 611 | `7af2ace8a14a` | Inventoried | Configuration/documentation review |
| `UI_POLISH.md` | Documentation | 3623 | `a9c57254e509` | Inventoried | Configuration/documentation review |
| `docker-compose.production.yml` | Configuration | 1932 | `5ffa77d82f51` | Inventoried | Configuration/documentation review |
| `docker-compose.yml` | Configuration | 300 | `9952da7ce9b4` | Inventoried | Configuration/documentation review |
| `docs/PRODUCTION_RUNBOOK.md` | Documentation | 6467 | `6b370a66f689` | Inventoried | Configuration/documentation review |
| `docs/RELEASE_ACCEPTANCE.md` | Documentation | 1683 | `34398064a303` | Inventoried | Configuration/documentation review |
| `docs/SECURITY_AND_GOVERNANCE.md` | Documentation | 2404 | `aa4394e07c43` | Inventoried | Configuration/documentation review |
| `eslint.config.mjs` | Configuration | 2213 | `366ef85366ae` | Inventoried | TypeScript/build or runtime script review |
| `next-env.d.ts` | Configuration | 247 | `7b550dda9686` | Inventoried | TypeScript/build or runtime script review |
| `next.config.js` | Configuration | 1748 | `6e556b021be5` | Inventoried | TypeScript/build or runtime script review |
| `package-lock.json` | Configuration | 304768 | `4be6d381cd0d` | Inventoried | Configuration/documentation review |
| `package.json` | Configuration | 2359 | `d5660d21ab69` | Inventoried | Configuration/documentation review |
| `playwright.config.ts` | Configuration | 2750 | `67efa5bd5d73` | Inventoried | TypeScript/build or runtime script review |
| `postcss.config.js` | Configuration | 82 | `251ecddd4672` | Inventoried | TypeScript/build or runtime script review |
| `prisma/postgresql/migrations/0001_baseline/migration.sql` | PostgreSQL migration | 68635 | `4363151f3f82` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0002_operating_system/migration.sql` | PostgreSQL migration | 10860 | `d6cb63235abe` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0003_offer_reports/migration.sql` | PostgreSQL migration | 727 | `4b20f62ada20` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0004_reference_outcome_normalization/migration.sql` | PostgreSQL migration | 215 | `4dbd5757e056` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0005_hr_productivity_controls/migration.sql` | PostgreSQL migration | 3091 | `7fc300f8284e` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0006_mfa_lockout_sessions_search/migration.sql` | PostgreSQL migration | 7590 | `73b75688b195` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0007_scorecard_version_history/migration.sql` | PostgreSQL migration | 322 | `bea241696e5d` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/migration_lock.toml` | PostgreSQL migration | 24 | `1db17a8d051a` | Inventoried | Configuration/documentation review |
| `prisma/postgresql/schema.prisma` | Database | 74797 | `727fbeb51a00` | Inventoried | Prisma format/generate/validate |
| `prisma/schema.prisma` | Database | 74693 | `f3b550315e32` | Inventoried | Prisma format/generate/validate |
| `prisma/seed.ts` | Database | 35574 | `0e47d0352032` | Inventoried | TypeScript/build or runtime script review |
| `public/og.png` | Public asset | 2090346 | `70a363c6f9d9` | Inventoried | Visual asset review |
| `scripts/backup-postgres.sh` | Operations script | 372 | `652fdd1572f4` | Inventoried | Configuration/documentation review |
| `scripts/bootstrap-production-admin.ts` | Operations script | 2722 | `4de5475792d9` | Inventoried | TypeScript/build or runtime script review |
| `scripts/check-frontend-coverage.mjs` | Operations script | 2932 | `712fbf588849` | Inventoried | TypeScript/build or runtime script review |
| `scripts/generate-file-audit.mjs` | Operations script | 3939 | `6cb4a400ad31` | Inventoried | TypeScript/build or runtime script review |
| `scripts/generate-postgres-schema.mjs` | Operations script | 1220 | `8b456c877ca8` | Inventoried | TypeScript/build or runtime script review |
| `scripts/restore-postgres.sh` | Operations script | 972 | `1b814742ee9f` | Inventoried | Configuration/documentation review |
| `scripts/start-e2e.mjs` | Operations script | 1111 | `b0d7a3b1056f` | Inventoried | TypeScript/build or runtime script review |
| `scripts/start-production.sh` | Operations script | 2055 | `aa46faf59c38` | Inventoried | Configuration/documentation review |
| `src/app/admin/assessment-bank/page.tsx` | Page/layout | 1271 | `c9fb0fb235d2` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/automations/page.tsx` | Page/layout | 806 | `f2cb3c9ab455` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/configuration-releases/page.tsx` | Page/layout | 838 | `51373f4dedd1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/contract-types/page.tsx` | Page/layout | 667 | `701ae5bfe6d7` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/courses/page.tsx` | Page/layout | 1820 | `53fc53644a15` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/deletion-requests/page.tsx` | Page/layout | 4778 | `57e6b59f7594` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/departments/page.tsx` | Page/layout | 624 | `e69d66347de4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/document-requirements/page.tsx` | Page/layout | 1788 | `d0ab2ec870f5` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/document-types/page.tsx` | Page/layout | 767 | `2a4d1a6e395d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/duty-stations/page.tsx` | Page/layout | 774 | `21b1796f6357` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/forms/page.tsx` | Page/layout | 951 | `c6a7c6cc313d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/fraud-reports/page.tsx` | Page/layout | 983 | `3ecaa6636939` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/governance/page.tsx` | Page/layout | 13270 | `00727b5f22c6` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/interview-questions/page.tsx` | Page/layout | 1220 | `e187aa44a016` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/layout.tsx` | Page/layout | 4905 | `7f81346bb148` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/notification-templates/page.tsx` | Page/layout | 928 | `3d8b2edbf09c` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/operating-model/page.tsx` | Page/layout | 2580 | `2406d81a9256` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/permissions/page.tsx` | Page/layout | 582 | `4af8f6c5f471` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/policies/page.tsx` | Page/layout | 1749 | `620548bf426c` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/preboarding-packages/page.tsx` | Page/layout | 1416 | `1171f6b56df4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/projects/page.tsx` | Page/layout | 611 | `e44291043f93` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/roles/page.tsx` | Page/layout | 517 | `ce7c75d510f7` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/scorecards/page.tsx` | Page/layout | 1079 | `9b97ba3701ed` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/system-settings/page.tsx` | Page/layout | 9292 | `babaed34489f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/tasks/page.tsx` | Page/layout | 978 | `61516a3b980f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/templates/page.tsx` | Page/layout | 713 | `24c374bacf91` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/users/page.tsx` | Page/layout | 128 | `d4818d4c5d6b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/vacancy-categories/page.tsx` | Page/layout | 623 | `45ef49269d9f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/automations/route.ts` | API route | 4176 | `b4e18c788201` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/configuration-builder/route.ts` | API route | 10235 | `96443b2f1d7d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/configuration-releases/route.ts` | API route | 8246 | `f3eee1260cee` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/deletion-requests/route.ts` | API route | 9949 | `02da44d3d613` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/fraud-reports/route.ts` | API route | 3875 | `eff2f0c81e6c` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/generic/route.ts` | API route | 15304 | `8b4e3282cd0e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/governance/route.ts` | API route | 6262 | `72977d69f19e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/operating-model/route.ts` | API route | 6815 | `0d8956daaf12` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/users/[id]/route.ts` | API route | 4922 | `9a7a30ff55fd` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/assets/download/[id]/route.ts` | API route | 6654 | `ad5757ad165d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/assets/upload/route.ts` | API route | 3964 | `565137d9eca6` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/forgot-password/route.ts` | API route | 2191 | `8986281713dd` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/login/route.ts` | API route | 6541 | `1de48535d52b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/logout/route.ts` | API route | 1790 | `42908a221d4d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/mfa/challenge/route.ts` | API route | 4901 | `8737581e20a5` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/mfa/route.ts` | API route | 7687 | `bf825b09e8bc` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/register/route.ts` | API route | 5047 | `214f802560e9` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/reset-password/route.ts` | API route | 2161 | `781751264698` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/session/route.ts` | API route | 282 | `9feebca9f9af` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/sessions/route.ts` | API route | 2426 | `e7a8b96f88d1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/sso/callback/route.ts` | API route | 5017 | `67936a1b8850` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/sso/start/route.ts` | API route | 1818 | `641fd10bd164` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/verify-email/route.ts` | API route | 2796 | `01e2b3c88917` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/calendar/interviews/[id]/route.ts` | API route | 2425 | `b47d75d6b263` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/accommodations/route.ts` | API route | 2494 | `25d1d4bdffb7` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/account/route.ts` | API route | 5953 | `6dc39a4c33f2` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/applications/[id]/route.ts` | API route | 5475 | `cf37079a01f3` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/applications/route.ts` | API route | 16026 | `4fb542438293` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/assessments/[id]/answers/review/route.ts` | API route | 3201 | `ac56aab8631a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/assessments/[id]/answers/route.ts` | API route | 3475 | `6c324559bf95` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/assessments/[id]/route.ts` | API route | 1032 | `e0726d48c888` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/assessments/[id]/start/route.ts` | API route | 3638 | `9c126cb1af6d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/assessments/[id]/submit/route.ts` | API route | 11192 | `2505acd30ad1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/documents/[id]/route.ts` | API route | 2248 | `c347c1867e61` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/documents/route.ts` | API route | 2651 | `3028747a85c6` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/education/[id]/route.ts` | API route | 2789 | `4e887a2d6072` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/education/route.ts` | API route | 2382 | `f8bfa6aa2ab4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/employment/[id]/route.ts` | API route | 3513 | `ac6d3f5a3ac9` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/employment/route.ts` | API route | 3311 | `e47c0419463e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/interviews/[id]/respond/route.ts` | API route | 2090 | `eea086d20c7d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/licences/[id]/route.ts` | API route | 2716 | `5ec16b00559b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/licences/route.ts` | API route | 2167 | `7344e1d7c8d4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/offers/[id]/respond/route.ts` | API route | 9181 | `43f68abe7791` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/offers/[id]/route.ts` | API route | 4906 | `c779cdb4eb42` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/preboarding/actions/route.ts` | API route | 19522 | `fe1c848c3605` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/preboarding/confirm-start-date/route.ts` | API route | 2500 | `a02f5d0af85f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/preboarding/courses/[id]/certificate/route.ts` | API route | 3218 | `002a04ed8326` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/preboarding/route.ts` | API route | 3372 | `7de33f8ad6b2` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/privacy/export/route.ts` | API route | 8830 | `2f2adf81b5d6` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/profile-items/route.ts` | API route | 7713 | `0a88be6af168` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/profile/route.ts` | API route | 4515 | `7ef7dfbf4221` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/saved-searches/route.ts` | API route | 4544 | `4c484d89fb3f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/complaints/route.ts` | API route | 4781 | `9c00e280993b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/cron/process-schedules/route.ts` | API route | 2113 | `dc79e7efa369` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/health/route.ts` | API route | 1949 | `93770aca0399` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/messages/route.ts` | API route | 6531 | `f2e6dbf1812b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/notifications/route.ts` | API route | 1492 | `a6c30c9f2e57` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/public/fraud-reports/route.ts` | API route | 1745 | `abd0046e7a7c` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/public/reference/resolve/route.ts` | API route | 1821 | `6a41008e5978` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/public/reference/submit/route.ts` | API route | 3922 | `8e7e21ab6ad5` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/public/vacancies/[reference]/route.ts` | API route | 1272 | `efdf059421ac` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/public/vacancies/route.ts` | API route | 2989 | `2fedbf3f6fa3` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/accommodations/route.ts` | API route | 2319 | `335a16279d3e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/assign-reviewer/route.ts` | API route | 2153 | `6c5af55f50e1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/conflict/route.ts` | API route | 1643 | `d516f70c60c6` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/documentation/route.ts` | API route | 15453 | `0cffa57003e4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/erp-transfer/route.ts` | API route | 3644 | `e4143450270c` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/handover-summary/route.ts` | API route | 4270 | `b579f8df11a7` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/notes/route.ts` | API route | 1487 | `78bc210346f2` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/referees/route.ts` | API route | 5018 | `63b7c2e2cf1a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/resumption/route.ts` | API route | 4237 | `8fc8ba498bbe` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/route.ts` | API route | 8272 | `551418cdcc72` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/stage/route.ts` | API route | 2988 | `e8bd372c25a9` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/assisted/route.ts` | API route | 6897 | `32027853b651` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/bulk-actions/[id]/undo/route.ts` | API route | 2819 | `39f5973f6c10` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/bulk-actions/route.ts` | API route | 13356 | `c0183298d909` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/bulk-export/route.ts` | API route | 2387 | `347742605e54` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/bulk-stage-change/route.ts` | API route | 4178 | `4dee4a4fce52` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/route.ts` | API route | 3091 | `3e5c99f260a9` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/approvals/route.ts` | API route | 12805 | `8192bf8c7600` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/assessments/[id]/invite/route.ts` | API route | 2504 | `0f2761baa2e2` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/assessments/[id]/route.ts` | API route | 4529 | `005ca77c0719` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/assessments/route.ts` | API route | 3707 | `691807be4c65` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/candidate-assessments/[id]/answers/route.ts` | API route | 8794 | `c68ea8a13503` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/candidate-assessments/[id]/mark/route.ts` | API route | 4081 | `9a9e0796bc2d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/candidate-assessments/[id]/reset/route.ts` | API route | 2929 | `ad37ae0a55bc` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/complaints/route.ts` | API route | 3859 | `9f4a2af1221f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/data-quality/merges/route.ts` | API route | 11031 | `8a34324df105` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/eligibility/route.ts` | API route | 3350 | `ef39faf07d26` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/[id]/confirm-panel/route.ts` | API route | 3953 | `a69c1f7d157d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/[id]/invite/route.ts` | API route | 2086 | `c1c21714f4e3` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/[id]/panel/[memberId]/reopen/route.ts` | API route | 1255 | `164b3ff3e0f8` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/[id]/panel/[memberId]/resolve-conflict/route.ts` | API route | 1680 | `d0d7b74e9387` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/[id]/route.ts` | API route | 6161 | `b6fa49a4f0b4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/[id]/scores/route.ts` | API route | 10094 | `a36b5201df99` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/route.ts` | API route | 6349 | `3df26010fafc` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/offers/[id]/actions/route.ts` | API route | 8269 | `158f08e85847` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/offers/[id]/route.ts` | API route | 4032 | `8ec5d12c978f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/offers/route.ts` | API route | 4100 | `8bee2da97ebb` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/preboarding/[id]/manage/route.ts` | API route | 12184 | `acc53141caf1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/preboarding/[id]/route.ts` | API route | 3657 | `40ae087877c9` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/preboarding/clearance/route.ts` | API route | 3413 | `8b307f3f772b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/referees/[id]/send-reminder/route.ts` | API route | 1557 | `0b51d780a37c` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/referees/[id]/send-request/route.ts` | API route | 3413 | `a102f06bb5e7` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/reference-responses/[id]/verify/route.ts` | API route | 1016 | `ad73dbdccb52` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/reports/export/route.ts` | API route | 29820 | `936e12e4ce32` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/reports/schedules/route.ts` | API route | 3574 | `26f7bef9fa40` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/scorecards/[id]/reopen/route.ts` | API route | 1286 | `b96a17fe346e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/scorecards/[id]/route.ts` | API route | 1158 | `cd75a07de54f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/scorecards/route.ts` | API route | 9765 | `159d6bf60d16` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/search/route.ts` | API route | 7178 | `206d136d72ea` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/selections/route.ts` | API route | 7146 | `baa4f2cdb23a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/talent-pools/route.ts` | API route | 5935 | `0df0ab75f0dd` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/vacancies/[id]/actions/route.ts` | API route | 9135 | `95b78ad01fdb` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/vacancies/[id]/documentation/route.ts` | API route | 9317 | `8afe09be4a89` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/vacancies/[id]/route.ts` | API route | 7796 | `6dd123bc6399` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/vacancies/route.ts` | API route | 8142 | `5037e8cbdd41` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/work-items/[id]/route.ts` | API route | 2877 | `1d985cf3d534` | Inventoried | TypeScript/build or runtime script review |
| `src/app/auth/login/page.tsx` | Page/layout | 12565 | `a3d4d1488126` | Inventoried | TypeScript/build or runtime script review |
| `src/app/auth/register/page.tsx` | Page/layout | 9242 | `208f6adc33ee` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/accommodations/page.tsx` | Page/layout | 2713 | `62a7228f62d8` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/applications/DeleteDraftButton.tsx` | Page/layout | 1644 | `33d8a580a00f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/applications/[id]/page.tsx` | Page/layout | 7474 | `f59aef4d9ce3` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/applications/[id]/receipt/page.tsx` | Page/layout | 4878 | `1ef2625c8369` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/applications/apply/page.tsx` | Page/layout | 29083 | `0a59eeaeba7d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/applications/page.tsx` | Page/layout | 5666 | `d625a8ac427f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/assessments/[id]/page.tsx` | Page/layout | 17148 | `cfaa7710c9b7` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/assessments/page.tsx` | Page/layout | 3535 | `33aec51ff36f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/complaints/page.tsx` | Page/layout | 4900 | `1742cfb8f07d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/dashboard/page.tsx` | Page/layout | 16505 | `8ba8b61fd264` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/interviews/page.tsx` | Page/layout | 3954 | `d700afd0e91e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/messages/page.tsx` | Page/layout | 3466 | `f9929106f4dd` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/offers/[id]/page.tsx` | Page/layout | 14912 | `6df96ea5c7ff` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/offers/page.tsx` | Page/layout | 3225 | `07852268b631` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/courses/page.tsx` | Page/layout | 4156 | `439f26a8306a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/documents/page.tsx` | Page/layout | 3411 | `f46702349214` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/forms/page.tsx` | Page/layout | 4504 | `b57cb8ae4ac0` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/meetings/page.tsx` | Page/layout | 3488 | `092abc6333ad` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/page.tsx` | Page/layout | 19960 | `200bc06d0a61` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/policies/page.tsx` | Page/layout | 3500 | `cc47c2cb8da6` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/reporting-information/page.tsx` | Page/layout | 2629 | `0cc50c079de4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/tasks/page.tsx` | Page/layout | 2724 | `3cffc1cd34f7` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/profile/documents/page.tsx` | Page/layout | 14256 | `b5bb0f2c2699` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/profile/education/page.tsx` | Page/layout | 14096 | `4ea7d0e02362` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/profile/employment/page.tsx` | Page/layout | 15164 | `a4e2a35b77dd` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/profile/licences/page.tsx` | Page/layout | 11288 | `d14eba2b9e19` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/profile/page.tsx` | Page/layout | 10558 | `cc00bbf29b09` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/profile/personal/page.tsx` | Page/layout | 14648 | `733a391c03d9` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/settings/page.tsx` | Page/layout | 3105 | `04accc31bc13` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/tasks/page.tsx` | Page/layout | 10827 | `f61decc41a7f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/careers/[reference]/page.tsx` | Page/layout | 10472 | `0b0a58b12fb0` | Inventoried | TypeScript/build or runtime script review |
| `src/app/careers/page.tsx` | Page/layout | 12620 | `4d1f7675e3ce` | Inventoried | TypeScript/build or runtime script review |
| `src/app/complaints/page.tsx` | Page/layout | 7761 | `ec0d89936879` | Inventoried | TypeScript/build or runtime script review |
| `src/app/error.tsx` | Page/layout | 1646 | `754584e34e16` | Inventoried | TypeScript/build or runtime script review |
| `src/app/forgot-password/page.tsx` | Page/layout | 3927 | `8b68fbb3db9a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/global-error.tsx` | Page/layout | 865 | `bbcb1b0c358f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/globals.css` | Page/layout | 7114 | `8cf561c8841f` | Inventoried | Configuration/documentation review |
| `src/app/guidance/page.tsx` | Page/layout | 4530 | `c32eec13c965` | Inventoried | TypeScript/build or runtime script review |
| `src/app/layout.tsx` | Page/layout | 1882 | `8e0a6e6363e9` | Inventoried | TypeScript/build or runtime script review |
| `src/app/login/page.tsx` | Page/layout | 110 | `7865defb60f0` | Inventoried | TypeScript/build or runtime script review |
| `src/app/not-found.tsx` | Page/layout | 4224 | `f231bc00995d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/page.tsx` | Page/layout | 112 | `0bfc5000c7a0` | Inventoried | TypeScript/build or runtime script review |
| `src/app/privacy/page.tsx` | Page/layout | 3701 | `77d94f585738` | Inventoried | TypeScript/build or runtime script review |
| `src/app/public/reference/[token]/page.tsx` | Page/layout | 13700 | `ae84d5775281` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment-faq/page.tsx` | Page/layout | 5605 | `1bc41b1f9b70` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment-process/page.tsx` | Page/layout | 121 | `4a812f7b6e42` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/accommodations/page.tsx` | Page/layout | 3595 | `ed82b42cbdeb` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/applications/[id]/handover/page.tsx` | Page/layout | 21391 | `3312729d1e5c` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/applications/[id]/page.tsx` | Page/layout | 41073 | `4cd98b9314fc` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/applications/page.tsx` | Page/layout | 15541 | `638bf6f56ef0` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/approvals/page.tsx` | Page/layout | 11247 | `01601d26646b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/assessments/page.tsx` | Page/layout | 4999 | `196b3053b85d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/audit/page.tsx` | Page/layout | 4314 | `c78e94566fea` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/communications/page.tsx` | Page/layout | 7956 | `13dc5e81eab0` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/complaints/page.tsx` | Page/layout | 1260 | `0a83ea9e3797` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/dashboard/page.tsx` | Page/layout | 17910 | `699631af448b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/insights/page.tsx` | Page/layout | 17861 | `3e5aef27660a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/interviews/page.tsx` | Page/layout | 9111 | `4bacb828c939` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/offers/page.tsx` | Page/layout | 5867 | `b86d32db83fc` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/operations/page.tsx` | Page/layout | 6992 | `48e790fc01a1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/preboarding/[id]/page.tsx` | Page/layout | 25174 | `5d1fe72b68ba` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/preboarding/page.tsx` | Page/layout | 4593 | `b46750f08d7a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/quality/page.tsx` | Page/layout | 19056 | `72b25e044af5` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/references/page.tsx` | Page/layout | 5541 | `3537eb4b77dd` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/reports/page.tsx` | Page/layout | 9915 | `604d26217ddd` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/search/page.tsx` | Page/layout | 1314 | `7d93250f75da` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/selections/page.tsx` | Page/layout | 12044 | `50aea15c0cd8` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/settings/page.tsx` | Page/layout | 1629 | `4db572289241` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/talent-pools/page.tsx` | Page/layout | 3008 | `86ada4ac2477` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/vacancies/[id]/applications/page.tsx` | Page/layout | 4738 | `7101d09475b7` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/vacancies/[id]/edit/page.tsx` | Page/layout | 33534 | `d322bce47f99` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/vacancies/[id]/page.tsx` | Page/layout | 12978 | `a2970315c482` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/vacancies/new/page.tsx` | Page/layout | 29546 | `37cf31ab9a27` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/vacancies/page.tsx` | Page/layout | 7031 | `049fd85cc49c` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/work/page.tsx` | Page/layout | 16487 | `a48ddaff75b6` | Inventoried | TypeScript/build or runtime script review |
| `src/app/register/page.tsx` | Page/layout | 116 | `74fb86ec0398` | Inventoried | TypeScript/build or runtime script review |
| `src/app/report-fraud/page.tsx` | Page/layout | 6065 | `883b7c333b6c` | Inventoried | TypeScript/build or runtime script review |
| `src/app/report-recruitment-fraud/page.tsx` | Page/layout | 118 | `89d2b6fbe8d4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/reset-password/page.tsx` | Page/layout | 5714 | `37320f7f07b5` | Inventoried | TypeScript/build or runtime script review |
| `src/app/terms/page.tsx` | Page/layout | 2685 | `6671b28084a1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/verify-email/page.tsx` | Page/layout | 1808 | `affb05afa6c4` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AccommodationManager.tsx` | UI component | 6036 | `031154266ea1` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AdminCrud.tsx` | UI component | 21484 | `8aeee3928953` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AdminNav.tsx` | UI component | 1615 | `dad6fab95e8e` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AssessmentAnswerReview.tsx` | UI component | 10620 | `a10002a8d0f0` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AssessmentManager.tsx` | UI component | 34700 | `45e3c99ca1e6` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AssistedApplicationEntry.tsx` | UI component | 4079 | `af224c9fbf06` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AutomationManager.tsx` | UI component | 5024 | `3a082d20fcec` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/BulkApplicationActions.tsx` | UI component | 19387 | `5e463dadb15d` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/CandidateMergeManager.tsx` | UI component | 10972 | `dcb4242c07e2` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/CaseGovernanceActions.tsx` | UI component | 14229 | `577f21560409` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/ComplaintCaseManager.tsx` | UI component | 8149 | `bf9e23b58b40` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/ConfigurationBuilder.tsx` | UI component | 22473 | `264f73fac31a` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/ConfigurationReleaseManager.tsx` | UI component | 5807 | `54d757e5d118` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/FraudReportTriage.tsx` | UI component | 8505 | `013f098f948b` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/GlobalSearch.tsx` | UI component | 3473 | `74c8a329c9ce` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/InterviewCoordinationActions.tsx` | UI component | 11705 | `0facabe06625` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/InterviewManager.tsx` | UI component | 19143 | `8de9944828bd` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/OfferCorrection.tsx` | UI component | 5762 | `29395d44a401` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/OfferManager.tsx` | UI component | 8601 | `57e1f6dbe8d0` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/OperatingModelManager.tsx` | UI component | 7636 | `b294b8f748c8` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/ReferenceManager.tsx` | UI component | 9067 | `5ff17380ef37` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/ReportScheduler.tsx` | UI component | 5211 | `66c9c163ff57` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/TalentPoolManager.tsx` | UI component | 4908 | `9f5ec3cf022e` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/UserManager.tsx` | UI component | 4313 | `ce3d2733f0bc` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/WorkItemActions.tsx` | UI component | 2409 | `2a8cddb632fa` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/AccommodationRequestForm.tsx` | UI component | 3429 | `c00a0ddda0af` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/AccountSettingsActions.tsx` | UI component | 7010 | `bac38c176a39` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/AssessmentSubmissionReview.tsx` | UI component | 3963 | `256103a58ef5` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/Footer.tsx` | UI component | 4709 | `0a5bb86cc449` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/Header.tsx` | UI component | 16136 | `8112abec1c54` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/InterviewResponse.tsx` | UI component | 3880 | `e5f5555d015b` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/LegalDocument.tsx` | UI component | 2088 | `ef49d2725bd0` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/MessageComposer.tsx` | UI component | 3439 | `b59a3d3324fa` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/NotificationInbox.tsx` | UI component | 3886 | `30b1ebee150c` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/PreboardingActions.tsx` | UI component | 24298 | `5331aa2ae1dc` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/PrintButton.tsx` | UI component | 327 | `d46dc6a2443a` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/ProfileAdditionalDetails.tsx` | UI component | 9905 | `1c64a89eaaf3` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/SavedSearchManager.tsx` | UI component | 11081 | `ce4841396657` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/SecuritySettings.tsx` | UI component | 17110 | `2e1af6269d45` | Inventoried | TypeScript/build or runtime script review |
| `src/components/ui/Dialog.tsx` | UI component | 6281 | `50eb1758c2c5` | Inventoried | TypeScript/build or runtime script review |
| `src/components/ui/PageElements.tsx` | UI component | 2591 | `c8ab95b33e3c` | Inventoried | TypeScript/build or runtime script review |
| `src/components/ui/Pagination.tsx` | UI component | 4145 | `56c05affffe2` | Inventoried | TypeScript/build or runtime script review |
| `src/components/ui/Skeleton.tsx` | UI component | 648 | `2b28f266061c` | Inventoried | TypeScript/build or runtime script review |
| `src/components/ui/Toaster.tsx` | UI component | 2618 | `85d1a55d6af6` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/application-stages.ts` | Domain/infrastructure | 1416 | `39563ddfc4b6` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/approvals.ts` | Domain/infrastructure | 2071 | `ab3fde875abe` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/audit.ts` | Domain/infrastructure | 6693 | `5b9debb8f5f0` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/auth.ts` | Domain/infrastructure | 8017 | `1687e97c64b6` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/authz.ts` | Domain/infrastructure | 3590 | `3f84659d9660` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/automations.ts` | Domain/infrastructure | 4379 | `d9a93bc6854f` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/background-jobs.ts` | Domain/infrastructure | 27471 | `7904be293bf6` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/candidate-preboarding.ts` | Domain/infrastructure | 1263 | `0b69fffb36f8` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/candidate-status.ts` | Domain/infrastructure | 8742 | `333ee3d22909` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/concurrency.ts` | Domain/infrastructure | 596 | `6d33f9ea8924` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/configuration-releases.ts` | Domain/infrastructure | 6960 | `633b9c80b0b6` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/deterministic-shuffle.ts` | Domain/infrastructure | 581 | `056226ff74ce` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/eligibility.ts` | Domain/infrastructure | 5474 | `12279eac65c5` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/errors.ts` | Domain/infrastructure | 307 | `1ffe30835fff` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/export-files.ts` | Domain/infrastructure | 2382 | `d96c242e07ef` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/home-route.ts` | Domain/infrastructure | 796 | `41d7293e95b1` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/idempotency.ts` | Domain/infrastructure | 3654 | `fcb04787f951` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/job-alerts.ts` | Domain/infrastructure | 4616 | `719383057bc5` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/lockout.ts` | Domain/infrastructure | 3303 | `feca35cf64ad` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/logger.ts` | Domain/infrastructure | 1870 | `5ce879671496` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/mailer.ts` | Domain/infrastructure | 3067 | `e23541eedd6f` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/notifications.ts` | Domain/infrastructure | 1321 | `61b9cd2faf61` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/oidc.ts` | Domain/infrastructure | 2247 | `146d09e9fcd4` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/outbox.ts` | Domain/infrastructure | 6837 | `627fb09c4e96` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/pagination.ts` | Domain/infrastructure | 2470 | `271ce2034933` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/preboarding.ts` | Domain/infrastructure | 13203 | `b30a25e56eb2` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/prisma.ts` | Domain/infrastructure | 302 | `04d40d4f0693` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/profile-completion.server.ts` | Domain/infrastructure | 654 | `818a243c9807` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/profile-completion.ts` | Domain/infrastructure | 2025 | `3d442759218e` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/qr.ts` | Domain/infrastructure | 7880 | `b1e044c0865b` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/rate-limit.ts` | Domain/infrastructure | 3375 | `e1e89dc208be` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/rbac.ts` | Domain/infrastructure | 2279 | `2cb6dc7be255` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/recruitment-access.ts` | Domain/infrastructure | 1782 | `79445bcfd3d3` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/recruitment-scoring.server.ts` | Domain/infrastructure | 716 | `efb6e516ac99` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/recruitment-scoring.ts` | Domain/infrastructure | 1090 | `5242caece3b1` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/retention.ts` | Domain/infrastructure | 8915 | `33f60eb26a54` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/roles.ts` | Domain/infrastructure | 857 | `014f4a1032c7` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/s3.ts` | Domain/infrastructure | 8384 | `257a8c246d08` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/scheduled-report.ts` | Domain/infrastructure | 7117 | `7d22b2765693` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/search.ts` | Domain/infrastructure | 4951 | `8efdc80af697` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/secret-box.ts` | Domain/infrastructure | 1515 | `4a6c2d139619` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/session.ts` | Domain/infrastructure | 4262 | `27536d2b7318` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/simple-pdf.ts` | Domain/infrastructure | 2252 | `05e72e931a91` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/state-machine.ts` | Domain/infrastructure | 4594 | `dc8e2a059e87` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/tokens.ts` | Domain/infrastructure | 406 | `6bf244715b25` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/totp.ts` | Domain/infrastructure | 5167 | `7a72df2e942b` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/utils.ts` | Domain/infrastructure | 2494 | `958fa472f892` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/validation.ts` | Domain/infrastructure | 7597 | `95aaf7d25c50` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/virus-scan.ts` | Domain/infrastructure | 2542 | `98310fbab439` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/work-items.ts` | Domain/infrastructure | 16491 | `3243a8a77fa8` | Inventoried | TypeScript/build or runtime script review |
| `src/proxy.ts` | Configuration | 5355 | `91a63444afdb` | Inventoried | TypeScript/build or runtime script review |
| `src/types/nodemailer.d.ts` | Configuration | 143 | `ccdd0184266c` | Inventoried | TypeScript/build or runtime script review |
| `tailwind.config.js` | Configuration | 1788 | `cf3bfc550c6a` | Inventoried | TypeScript/build or runtime script review |
| `tests/authz-errors.test.ts` | Test | 1688 | `c6f490007e61` | Inventoried | Executed by unit/integration suite |
| `tests/candidate-status.test.ts` | Test | 1571 | `9c81db25c3c9` | Inventoried | Executed by unit/integration suite |
| `tests/e2e/accessibility-connectivity-acceptance.spec.ts` | Test | 5196 | `f0c66b972fad` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/admin-reports.spec.ts` | Test | 3569 | `b15d7b6ceb90` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/applications.spec.ts` | Test | 3534 | `e8e225996b94` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/assessments-interviews.spec.ts` | Test | 4029 | `3a01c2476bc5` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/auth-and-profile.spec.ts` | Test | 3446 | `a290c2ff586a` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/candidate-completion-acceptance.spec.ts` | Test | 11690 | `e9226e156635` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/core-workflows.spec.ts` | Test | 6210 | `d1eaedbda111` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/helpers.ts` | Test | 1449 | `71e21541c50d` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/operations-acceptance.spec.ts` | Test | 17384 | `e1c8e544ca04` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/page-coverage.spec.ts` | Test | 3621 | `d8593e6ab4e0` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/profile-workflows.spec.ts` | Test | 9067 | `c5b2e1ad3be0` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/public-and-access.spec.ts` | Test | 3644 | `baf3b615042e` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/role-workflow-acceptance.spec.ts` | Test | 11407 | `c95243090749` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/selection-offers-preboarding.spec.ts` | Test | 1666 | `f2a0b63ea4aa` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/specialist-roles.spec.ts` | Test | 2612 | `31922bbc5b32` | Inventoried | Executed by Playwright browser suite |
| `tests/home-route.test.ts` | Test | 1392 | `6059f57eb638` | Inventoried | Executed by unit/integration suite |
| `tests/integration/global-setup.ts` | Test | 948 | `932c2d555a1b` | Inventoried | Executed by unit/integration suite |
| `tests/integration/prisma-flow.test.ts` | Test | 14428 | `597e4bc68ef3` | Inventoried | Executed by unit/integration suite |
| `tests/pagination.test.ts` | Test | 2730 | `48255b0bb0a8` | Inventoried | Executed by unit/integration suite |
| `tests/rate-limit.test.ts` | Test | 668 | `7d9db9c62910` | Inventoried | Executed by unit/integration suite |
| `tests/recruitment-scoring.test.ts` | Test | 1245 | `792139013432` | Inventoried | Executed by unit/integration suite |
| `tests/roles.test.ts` | Test | 1213 | `6f5dd601d31e` | Inventoried | Executed by unit/integration suite |
| `tests/search.test.ts` | Test | 2123 | `57538178e4b9` | Inventoried | Executed by unit/integration suite |
| `tests/session-cookie.test.ts` | Test | 669 | `799e0ba7b97f` | Inventoried | Executed by unit/integration suite |
| `tests/setup.ts` | Test | 1052 | `2b0bd5c10de4` | Inventoried | Executed by unit/integration suite |
| `tests/state-machine-terminal.test.ts` | Test | 1531 | `886b061de714` | Inventoried | Executed by unit/integration suite |
| `tests/state-machine.test.ts` | Test | 2245 | `6c950330f1f5` | Inventoried | Executed by unit/integration suite |
| `tests/tokens.test.ts` | Test | 1121 | `725ed6555e89` | Inventoried | Executed by unit/integration suite |
| `tests/totp.test.ts` | Test | 4788 | `a36149068f3b` | Inventoried | Executed by unit/integration suite |
| `tests/validation.test.ts` | Test | 1809 | `261f3b41a6da` | Inventoried | Executed by unit/integration suite |
| `tests/virus-scan.test.ts` | Test | 474 | `ffa195595dd6` | Inventoried | Executed by unit/integration suite |
| `tsconfig.json` | Configuration | 848 | `0029995ded4c` | Inventoried | Configuration/documentation review |
| `vitest.config.ts` | Configuration | 439 | `5eb6beae5845` | Inventoried | TypeScript/build or runtime script review |
| `vitest.integration.config.ts` | Configuration | 607 | `3a43f3b36160` | Inventoried | TypeScript/build or runtime script review |
