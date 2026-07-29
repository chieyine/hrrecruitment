# Complete first-party file inventory

Generated inventory of the first-party repository state on 2026-07-29T14:19:37.862Z.

## Outcome

- First-party files inventoried: **449**.
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
| `docs/PAGE_BY_PAGE_REVIEW.md` | Documentation | 175911 | `bff9388ecad5` | Inventoried | Configuration/documentation review |
| `docs/PAGE_PRODUCT_AUDIT.md` | Documentation | 18733 | `681caf0b2bc0` | Inventoried | Configuration/documentation review |
| `docs/PRODUCTION_RUNBOOK.md` | Documentation | 6467 | `6b370a66f689` | Inventoried | Configuration/documentation review |
| `docs/RELEASE_ACCEPTANCE.md` | Documentation | 1683 | `34398064a303` | Inventoried | Configuration/documentation review |
| `docs/SECURITY_AND_GOVERNANCE.md` | Documentation | 2902 | `80a79016271e` | Inventoried | Configuration/documentation review |
| `eslint.config.mjs` | Configuration | 2213 | `366ef85366ae` | Inventoried | TypeScript/build or runtime script review |
| `next-env.d.ts` | Configuration | 247 | `7b550dda9686` | Inventoried | TypeScript/build or runtime script review |
| `next.config.js` | Configuration | 3083 | `be50ae0bba62` | Inventoried | TypeScript/build or runtime script review |
| `package-lock.json` | Configuration | 304768 | `4be6d381cd0d` | Inventoried | Configuration/documentation review |
| `package.json` | Configuration | 2370 | `48dc355689ba` | Inventoried | Configuration/documentation review |
| `playwright.config.ts` | Configuration | 2750 | `67efa5bd5d73` | Inventoried | TypeScript/build or runtime script review |
| `postcss.config.js` | Configuration | 82 | `251ecddd4672` | Inventoried | TypeScript/build or runtime script review |
| `prisma/postgresql/migrations/0001_baseline/migration.sql` | PostgreSQL migration | 68635 | `4363151f3f82` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0002_operating_system/migration.sql` | PostgreSQL migration | 10860 | `d6cb63235abe` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0003_offer_reports/migration.sql` | PostgreSQL migration | 727 | `4b20f62ada20` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0004_reference_outcome_normalization/migration.sql` | PostgreSQL migration | 215 | `4dbd5757e056` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0005_hr_productivity_controls/migration.sql` | PostgreSQL migration | 3091 | `7fc300f8284e` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0006_mfa_lockout_sessions_search/migration.sql` | PostgreSQL migration | 7590 | `73b75688b195` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0007_scorecard_version_history/migration.sql` | PostgreSQL migration | 322 | `bea241696e5d` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0008_role_separation/migration.sql` | PostgreSQL migration | 7108 | `5e7d0d95ea63` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0009_course_completion_evidence/migration.sql` | PostgreSQL migration | 1313 | `97add2d492da` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0010_fraud_report_reference/migration.sql` | PostgreSQL migration | 153 | `ad5df726bc44` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0011_application_reference/migration.sql` | PostgreSQL migration | 362 | `cf3578b5e9de` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0012_accommodation_application_relation/migration.sql` | PostgreSQL migration | 369 | `0cf5ff867fd8` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0013_complaint_application_relation/migration.sql` | PostgreSQL migration | 405 | `e70f7729bcf3` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0014_current_education/migration.sql` | PostgreSQL migration | 167 | `467a5beb0ab0` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0015_preboarding_task_versions/migration.sql` | PostgreSQL migration | 87 | `fb106da57d3e` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0016_offer_template_snapshot/migration.sql` | PostgreSQL migration | 60 | `f8a140b7359d` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/migration_lock.toml` | PostgreSQL migration | 24 | `1db17a8d051a` | Inventoried | Configuration/documentation review |
| `prisma/postgresql/schema.prisma` | Database | 75996 | `85d53ad5c536` | Inventoried | Prisma format/generate/validate |
| `prisma/schema.prisma` | Database | 75907 | `f10659600090` | Inventoried | Prisma format/generate/validate |
| `prisma/seed.ts` | Database | 35694 | `2d4d2c6c9687` | Inventoried | TypeScript/build or runtime script review |
| `public/og.png` | Public asset | 2090346 | `70a363c6f9d9` | Inventoried | Visual asset review |
| `scripts/backup-postgres.sh` | Operations script | 372 | `652fdd1572f4` | Inventoried | Configuration/documentation review |
| `scripts/bootstrap-production-admin.ts` | Operations script | 3024 | `bae4fd76ee09` | Inventoried | TypeScript/build or runtime script review |
| `scripts/check-frontend-coverage.mjs` | Operations script | 2932 | `712fbf588849` | Inventoried | TypeScript/build or runtime script review |
| `scripts/generate-file-audit.mjs` | Operations script | 3939 | `6cb4a400ad31` | Inventoried | TypeScript/build or runtime script review |
| `scripts/generate-postgres-schema.mjs` | Operations script | 1220 | `8b456c877ca8` | Inventoried | TypeScript/build or runtime script review |
| `scripts/restore-postgres.sh` | Operations script | 972 | `1b814742ee9f` | Inventoried | Configuration/documentation review |
| `scripts/start-e2e.mjs` | Operations script | 1450 | `bcf81399d280` | Inventoried | TypeScript/build or runtime script review |
| `scripts/start-production.sh` | Operations script | 2055 | `aa46faf59c38` | Inventoried | Configuration/documentation review |
| `src/app/admin/assessment-bank/page.tsx` | Page/layout | 137 | `66a6a4184005` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/automations/page.tsx` | Page/layout | 938 | `e06fcec92cbc` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/configuration-releases/page.tsx` | Page/layout | 844 | `d415ea9b5e37` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/contract-types/page.tsx` | Page/layout | 729 | `b18070c7c46e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/courses/page.tsx` | Page/layout | 1819 | `06346b65a0f1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/deletion-requests/page.tsx` | Page/layout | 414 | `ddff56948f2b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/departments/page.tsx` | Page/layout | 752 | `d1c5b5fd0776` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/document-requirements/page.tsx` | Page/layout | 2538 | `10039eac633e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/document-types/page.tsx` | Page/layout | 1345 | `35e50d11764b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/duty-stations/page.tsx` | Page/layout | 1079 | `c8ee29c20116` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/forms/page.tsx` | Page/layout | 1492 | `617f3b978d8a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/fraud-reports/page.tsx` | Page/layout | 1329 | `d40314f3293e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/governance/page.tsx` | Page/layout | 458 | `0e3fec3ee610` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/interview-questions/page.tsx` | Page/layout | 140 | `b7be71741066` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/layout.tsx` | Page/layout | 5561 | `fe3b8b5e360e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/notification-templates/page.tsx` | Page/layout | 996 | `b962488e8bc9` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/operating-model/page.tsx` | Page/layout | 934 | `ec9421575130` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/permissions/page.tsx` | Page/layout | 122 | `07acfbbfc5f9` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/policies/page.tsx` | Page/layout | 2249 | `3b120d425eaa` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/preboarding-packages/page.tsx` | Page/layout | 1186 | `4e244125fd98` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/projects/page.tsx` | Page/layout | 764 | `77e0c7318cad` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/roles/page.tsx` | Page/layout | 10026 | `3095641e1338` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/scorecards/page.tsx` | Page/layout | 1952 | `769da3fa9a88` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/system-settings/page.tsx` | Page/layout | 12711 | `1a62ac505484` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/tasks/page.tsx` | Page/layout | 2296 | `de4776dc5c6d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/templates/page.tsx` | Page/layout | 1751 | `62f00e1cf8ab` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/users/page.tsx` | Page/layout | 405 | `edf0a5c8a765` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/vacancy-categories/page.tsx` | Page/layout | 1460 | `3f0e7994a302` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/automations/route.ts` | API route | 4359 | `6c8cf2a6a149` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/configuration-builder/route.ts` | API route | 17921 | `093e9361a82b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/configuration-releases/route.ts` | API route | 13602 | `b6a866b91d7a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/deletion-requests/route.ts` | API route | 12136 | `a0ad134a8269` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/fraud-reports/route.ts` | API route | 4531 | `64c48ea6a07d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/generic/route.ts` | API route | 35123 | `843fc89bf768` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/governance/route.ts` | API route | 11256 | `987fa5bea802` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/operating-model/route.ts` | API route | 4619 | `bb12150283c9` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/users/[id]/route.ts` | API route | 5621 | `ada6f2fdfe69` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/assets/download/[id]/route.ts` | API route | 8361 | `0c4eb8667802` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/assets/upload/route.ts` | API route | 3964 | `565137d9eca6` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/forgot-password/route.ts` | API route | 2261 | `f1ce2c1f159d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/login/route.ts` | API route | 6541 | `1de48535d52b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/logout/route.ts` | API route | 1790 | `42908a221d4d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/mfa/challenge/route.ts` | API route | 4901 | `8737581e20a5` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/mfa/route.ts` | API route | 7687 | `bf825b09e8bc` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/register/route.ts` | API route | 4830 | `0f4618b356c3` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/reset-password/route.ts` | API route | 2161 | `781751264698` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/session/route.ts` | API route | 282 | `9feebca9f9af` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/sessions/route.ts` | API route | 2426 | `e7a8b96f88d1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/sso/callback/route.ts` | API route | 5344 | `65308ef18c32` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/sso/start/route.ts` | API route | 2053 | `528395e11357` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/verify-email/route.ts` | API route | 2796 | `01e2b3c88917` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/calendar/interviews/[id]/route.ts` | API route | 2425 | `b47d75d6b263` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/accommodations/route.ts` | API route | 2620 | `620886f20dff` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/account/route.ts` | API route | 3427 | `ba3d093c3fb0` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/applications/[id]/route.ts` | API route | 6537 | `4abca9075198` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/applications/route.ts` | API route | 16322 | `cf4b33af40c8` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/assessments/[id]/answers/review/route.ts` | API route | 3201 | `ac56aab8631a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/assessments/[id]/answers/route.ts` | API route | 3475 | `6c324559bf95` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/assessments/[id]/route.ts` | API route | 1082 | `88c6083cd856` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/assessments/[id]/start/route.ts` | API route | 3641 | `3bd588ad26a4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/assessments/[id]/submit/route.ts` | API route | 8859 | `277bd117aef5` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/documents/[id]/route.ts` | API route | 2687 | `7ce6cad25f21` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/documents/route.ts` | API route | 3928 | `b7601c1525ae` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/education/[id]/route.ts` | API route | 3378 | `1c06d3b7ab96` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/education/route.ts` | API route | 3011 | `06fd7c019194` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/employment/[id]/route.ts` | API route | 3514 | `de19f0d63cee` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/employment/route.ts` | API route | 3290 | `40eb7a51c151` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/interviews/[id]/respond/route.ts` | API route | 2424 | `01e997afda67` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/licences/[id]/route.ts` | API route | 2716 | `5ec16b00559b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/licences/route.ts` | API route | 2167 | `7344e1d7c8d4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/offers/[id]/respond/route.ts` | API route | 9658 | `b8f9b85a021e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/offers/[id]/route.ts` | API route | 3677 | `514d10ffa641` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/preboarding/actions/route.ts` | API route | 25349 | `f73e15c2ce60` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/preboarding/confirm-start-date/route.ts` | API route | 2527 | `29ba2ce66c4c` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/preboarding/courses/[id]/certificate/route.ts` | API route | 3218 | `002a04ed8326` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/preboarding/route.ts` | API route | 3372 | `7de33f8ad6b2` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/privacy/export/route.ts` | API route | 8830 | `2f2adf81b5d6` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/profile-items/route.ts` | API route | 7713 | `0a88be6af168` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/profile/route.ts` | API route | 4500 | `2652d5e01edd` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/saved-searches/route.ts` | API route | 4614 | `a73142da8d1a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/complaints/[id]/comments/route.ts` | API route | 2174 | `b36e53bdeb69` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/complaints/route.ts` | API route | 5234 | `ddbcffe59b60` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/cron/process-schedules/route.ts` | API route | 2113 | `dc79e7efa369` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/health/route.ts` | API route | 1949 | `93770aca0399` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/messages/route.ts` | API route | 6353 | `43e447e073b5` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/public/fraud-reports/route.ts` | API route | 2099 | `0d578b2ef1ff` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/public/reference/resolve/route.ts` | API route | 1821 | `6a41008e5978` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/public/reference/submit/route.ts` | API route | 3683 | `8a55248fee70` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/public/vacancies/[reference]/route.ts` | API route | 1296 | `9531bad35a39` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/public/vacancies/route.ts` | API route | 3119 | `15d0602db466` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/accommodations/route.ts` | API route | 3242 | `50c11439a4c1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/assign-reviewer/route.ts` | API route | 2153 | `6c5af55f50e1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/conflict/route.ts` | API route | 1643 | `d516f70c60c6` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/documentation/route.ts` | API route | 15453 | `0cffa57003e4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/erp-transfer/route.ts` | API route | 3999 | `e610e36963d3` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/handover-summary/route.ts` | API route | 4035 | `6bf07472a343` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/notes/route.ts` | API route | 1487 | `78bc210346f2` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/referees/route.ts` | API route | 5395 | `af30f701ff3a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/resumption/route.ts` | API route | 5974 | `96a96eb515fb` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/route.ts` | API route | 13450 | `f4df083c2f98` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/stage/route.ts` | API route | 3251 | `a1c71039252f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/assisted/route.ts` | API route | 7401 | `9f77441607fa` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/bulk-actions/[id]/undo/route.ts` | API route | 2753 | `88c14581cf04` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/bulk-actions/route.ts` | API route | 13356 | `c0183298d909` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/bulk-export/route.ts` | API route | 2387 | `347742605e54` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/bulk-stage-change/route.ts` | API route | 4178 | `4dee4a4fce52` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/route.ts` | API route | 3137 | `115d7da0be09` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/approvals/route.ts` | API route | 15361 | `28825192e17c` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/assessments/[id]/invite/route.ts` | API route | 2848 | `2921f52fc096` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/assessments/[id]/route.ts` | API route | 5357 | `c9c3b8a590b8` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/assessments/route.ts` | API route | 5001 | `dd7f1d0b1390` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/candidate-assessments/[id]/answers/route.ts` | API route | 8820 | `a58364044a80` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/candidate-assessments/[id]/mark/route.ts` | API route | 5299 | `b865ddad9c0e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/candidate-assessments/[id]/reset/route.ts` | API route | 2929 | `ad37ae0a55bc` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/complaints/route.ts` | API route | 5560 | `9ac94fa5e09a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/data-quality/merges/route.ts` | API route | 11590 | `36be2ebdc437` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/eligibility/route.ts` | API route | 3350 | `ef39faf07d26` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/[id]/confirm-panel/route.ts` | API route | 3953 | `a69c1f7d157d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/[id]/invite/route.ts` | API route | 2620 | `2431eb45f097` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/[id]/panel/[memberId]/reopen/route.ts` | API route | 1255 | `164b3ff3e0f8` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/[id]/panel/[memberId]/resolve-conflict/route.ts` | API route | 1664 | `2c12e9b8333c` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/[id]/route.ts` | API route | 6856 | `3c383e3d25b2` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/[id]/scores/route.ts` | API route | 10190 | `514195b9aceb` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/route.ts` | API route | 6011 | `4c39d96987f1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/offers/[id]/actions/route.ts` | API route | 6286 | `7651c058c70d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/offers/[id]/preview/route.ts` | API route | 1941 | `aaa6e2177a0f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/offers/[id]/route.ts` | API route | 5572 | `c58be4e5c1d6` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/offers/route.ts` | API route | 5740 | `816261412a1a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/preboarding/[id]/manage/route.ts` | API route | 12642 | `89905812cce1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/preboarding/[id]/route.ts` | API route | 3705 | `2503c0ceac23` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/preboarding/clearance/route.ts` | API route | 4510 | `70b490cc0644` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/referees/[id]/send-reminder/route.ts` | API route | 1601 | `37d00002a9d0` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/referees/[id]/send-request/route.ts` | API route | 3687 | `31a85c7086e8` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/reference-responses/[id]/verify/route.ts` | API route | 2401 | `76b5beb3bd4e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/reports/export/route.ts` | API route | 30011 | `7515b8f2da4c` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/reports/schedules/route.ts` | API route | 4345 | `1d9048d09050` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/scorecards/[id]/reopen/route.ts` | API route | 1286 | `b96a17fe346e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/scorecards/[id]/route.ts` | API route | 1158 | `cd75a07de54f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/scorecards/route.ts` | API route | 9765 | `159d6bf60d16` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/search/route.ts` | API route | 8658 | `a8f46e5ce6c8` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/selections/route.ts` | API route | 9931 | `0f29f1e94041` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/talent-pools/route.ts` | API route | 7769 | `e12785f779e2` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/vacancies/[id]/actions/route.ts` | API route | 8372 | `0f2f60f0386f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/vacancies/[id]/documentation/route.ts` | API route | 9317 | `8afe09be4a89` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/vacancies/[id]/route.ts` | API route | 9693 | `1b2831cd5276` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/vacancies/route.ts` | API route | 9683 | `d1f881c95add` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/work-items/[id]/route.ts` | API route | 2887 | `d3108fdb579a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/auth/login/page.tsx` | Page/layout | 12803 | `47079ef8105e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/auth/register/page.tsx` | Page/layout | 11947 | `4757d5b2e807` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/accommodations/page.tsx` | Page/layout | 6047 | `6599c7226d54` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/applications/DeleteDraftButton.tsx` | Page/layout | 1890 | `4350a011581b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/applications/[id]/page.tsx` | Page/layout | 15065 | `5361852400d1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/applications/[id]/receipt/page.tsx` | Page/layout | 5168 | `0a5dd08000a2` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/applications/apply/page.tsx` | Page/layout | 29330 | `d973b0d89b5d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/applications/page.tsx` | Page/layout | 6174 | `5aa9ab2ebdf6` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/assessments/[id]/page.tsx` | Page/layout | 17702 | `0f1393dd4c7f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/complaints/ComplaintReply.tsx` | Page/layout | 1690 | `717cd9a407b1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/complaints/page.tsx` | Page/layout | 5327 | `09a196213db6` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/dashboard/page.tsx` | Page/layout | 14995 | `0352e2ca689b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/interviews/page.tsx` | Page/layout | 7389 | `245cfe4308bb` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/layout.tsx` | Page/layout | 412 | `758881a10506` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/messages/page.tsx` | Page/layout | 7823 | `76a11d772366` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/offers/[id]/page.tsx` | Page/layout | 15969 | `6b71dcf86563` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/courses/page.tsx` | Page/layout | 3320 | `04f7db1af815` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/documents/page.tsx` | Page/layout | 9394 | `7c341f0488e3` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/forms/page.tsx` | Page/layout | 5557 | `c40fc00200da` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/meetings/page.tsx` | Page/layout | 5050 | `4de3902e6f10` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/page.tsx` | Page/layout | 14748 | `d9fec6010129` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/policies/page.tsx` | Page/layout | 6658 | `57615143b226` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/reporting-information/page.tsx` | Page/layout | 2883 | `5f60b109862c` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/tasks/page.tsx` | Page/layout | 4216 | `07bfff6f0ff6` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/profile/documents/page.tsx` | Page/layout | 14696 | `dbabf1706ec2` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/profile/education/page.tsx` | Page/layout | 16612 | `01888afd4c53` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/profile/employment/page.tsx` | Page/layout | 13924 | `c5e4262e60df` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/profile/licences/page.tsx` | Page/layout | 13736 | `af805e18e6fd` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/profile/page.tsx` | Page/layout | 9320 | `dd9d7b0092d0` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/profile/personal/page.tsx` | Page/layout | 12116 | `76d3500fa431` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/settings/page.tsx` | Page/layout | 3058 | `54244deab5b9` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/tasks/page.tsx` | Page/layout | 5777 | `d97f57e3ac07` | Inventoried | TypeScript/build or runtime script review |
| `src/app/careers/[reference]/page.tsx` | Page/layout | 13430 | `73b741a98ad7` | Inventoried | TypeScript/build or runtime script review |
| `src/app/careers/page.tsx` | Page/layout | 15748 | `058f35dfc876` | Inventoried | TypeScript/build or runtime script review |
| `src/app/complaints/page.tsx` | Page/layout | 7916 | `23d4b7c9a62a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/error.tsx` | Page/layout | 1646 | `754584e34e16` | Inventoried | TypeScript/build or runtime script review |
| `src/app/forgot-password/page.tsx` | Page/layout | 5697 | `98dae290f6e7` | Inventoried | TypeScript/build or runtime script review |
| `src/app/global-error.tsx` | Page/layout | 865 | `bbcb1b0c358f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/globals.css` | Page/layout | 7114 | `8cf561c8841f` | Inventoried | Configuration/documentation review |
| `src/app/guidance/page.tsx` | Page/layout | 4809 | `9193b5ce3918` | Inventoried | TypeScript/build or runtime script review |
| `src/app/layout.tsx` | Page/layout | 1882 | `8e0a6e6363e9` | Inventoried | TypeScript/build or runtime script review |
| `src/app/not-found.tsx` | Page/layout | 4224 | `f231bc00995d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/page.tsx` | Page/layout | 112 | `0bfc5000c7a0` | Inventoried | TypeScript/build or runtime script review |
| `src/app/privacy/page.tsx` | Page/layout | 4135 | `776092d4fb43` | Inventoried | TypeScript/build or runtime script review |
| `src/app/public/reference/[token]/page.tsx` | Page/layout | 14358 | `5f452082f846` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment-faq/page.tsx` | Page/layout | 6073 | `e23de07f1778` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/accommodations/page.tsx` | Page/layout | 3845 | `b93ff3cc411b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/applications/[id]/handover/page.tsx` | Page/layout | 20633 | `f7623c657765` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/applications/[id]/page.tsx` | Page/layout | 39910 | `90ee2867c4aa` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/applications/page.tsx` | Page/layout | 906 | `0dd09e2ca3f3` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/approvals/layout.tsx` | Page/layout | 604 | `485a8fc85c29` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/approvals/page.tsx` | Page/layout | 14288 | `9c59694a6aca` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/assessments/page.tsx` | Page/layout | 3972 | `57437354a8ce` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/audit/page.tsx` | Page/layout | 12510 | `3332c59ea812` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/communications/page.tsx` | Page/layout | 15198 | `42ea210b69f8` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/complaints/page.tsx` | Page/layout | 2733 | `d55b85f75112` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/dashboard/page.tsx` | Page/layout | 15346 | `2a71eab534f9` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/insights/page.tsx` | Page/layout | 148 | `1a0c9ee01d3a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/interviews/page.tsx` | Page/layout | 16366 | `8625ce4cc835` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/offers/page.tsx` | Page/layout | 13437 | `73fffb27ef32` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/operations/page.tsx` | Page/layout | 151 | `709f8dabfb6b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/preboarding/[id]/page.tsx` | Page/layout | 38606 | `fcab13759408` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/preboarding/layout.tsx` | Page/layout | 597 | `bb02e209295b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/preboarding/page.tsx` | Page/layout | 10689 | `7f8f1b38380b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/quality/page.tsx` | Page/layout | 22541 | `dbf1e2747c32` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/references/page.tsx` | Page/layout | 16465 | `95470b1a918e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/reports/page.tsx` | Page/layout | 11684 | `756245a0d9c6` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/search/page.tsx` | Page/layout | 1261 | `5ff98f634199` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/selections/page.tsx` | Page/layout | 1474 | `e6fc887e2a7f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/settings/page.tsx` | Page/layout | 1212 | `b08ea7379512` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/talent-pools/page.tsx` | Page/layout | 3933 | `bda5cee2726a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/vacancies/[id]/edit/page.tsx` | Page/layout | 1088 | `d788bcfe11c1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/vacancies/[id]/page.tsx` | Page/layout | 10762 | `b878b8b3181a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/vacancies/new/page.tsx` | Page/layout | 724 | `649788ffdf50` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/vacancies/page.tsx` | Page/layout | 9176 | `fc165aa537f0` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/work/page.tsx` | Page/layout | 11742 | `52dbc092e0a5` | Inventoried | TypeScript/build or runtime script review |
| `src/app/report-fraud/page.tsx` | Page/layout | 6214 | `68ddf7535bea` | Inventoried | TypeScript/build or runtime script review |
| `src/app/reset-password/page.tsx` | Page/layout | 7707 | `e46c7a427e10` | Inventoried | TypeScript/build or runtime script review |
| `src/app/terms/page.tsx` | Page/layout | 2757 | `59894835bc97` | Inventoried | TypeScript/build or runtime script review |
| `src/app/verify-email/page.tsx` | Page/layout | 4569 | `3a12ec62bd53` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AccommodationManager.tsx` | UI component | 7777 | `1e5b10df60fc` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AdminCrud.tsx` | UI component | 23982 | `33e26a14a17f` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AdminNav.tsx` | UI component | 1621 | `d1e9a40f2ca8` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AssessmentAnswerReview.tsx` | UI component | 10750 | `d3e3bc4ab642` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AssessmentManager.tsx` | UI component | 37034 | `57c74d96b5e9` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AssistedApplicationEntry.tsx` | UI component | 13594 | `36cd667fef13` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AutomationManager.tsx` | UI component | 9397 | `53be79c36ade` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/BulkApplicationActions.tsx` | UI component | 19387 | `5e463dadb15d` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/CandidateMergeManager.tsx` | UI component | 11057 | `da76d9e0bcdc` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/CaseGovernanceActions.tsx` | UI component | 14412 | `46862959c635` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/ComplaintCaseManager.tsx` | UI component | 11546 | `2d3c86b3d518` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/ConfigurationBuilder.tsx` | UI component | 28110 | `a15e5c4ff53b` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/ConfigurationReleaseManager.tsx` | UI component | 8564 | `0c8cc21b3eca` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/FormSchemaEditor.tsx` | UI component | 6285 | `fdd8a700377d` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/FraudReportTriage.tsx` | UI component | 15284 | `10ebf790b2fe` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/GlobalSearch.tsx` | UI component | 8624 | `93b8cb2a2807` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/GovernanceManager.tsx` | UI component | 24804 | `7d7f07f10af2` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/InterviewCoordinationActions.tsx` | UI component | 12137 | `8a9bf2493ab3` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/InterviewManager.tsx` | UI component | 20805 | `8c287928ee70` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/MessageTemplateBodyEditor.tsx` | UI component | 2007 | `3f2b62bb6920` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/OfferCorrection.tsx` | UI component | 5675 | `355305afd889` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/OfferManager.tsx` | UI component | 7820 | `3af011b4eabf` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/OfferTemplateBodyEditor.tsx` | UI component | 3245 | `95740a2a2e35` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/OperatingModelManager.tsx` | UI component | 12456 | `2c73c1d061a1` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/PolicyFileEditor.tsx` | UI component | 2220 | `46cd7ab61a03` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/PrivacyRequestManager.tsx` | UI component | 15341 | `7bc5a6b49727` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/ReferenceManager.tsx` | UI component | 12340 | `baaeefec44f7` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/ReportScheduler.tsx` | UI component | 6142 | `95708a734141` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/TalentPoolManager.tsx` | UI component | 16102 | `bdad4684daa2` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/UserManager.tsx` | UI component | 13146 | `90cd984f0d1d` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/WorkItemActions.tsx` | UI component | 2409 | `2a8cddb632fa` | Inventoried | TypeScript/build or runtime script review |
| `src/components/candidate/CourseLearningExperience.tsx` | UI component | 11575 | `3b64a2f739d4` | Inventoried | TypeScript/build or runtime script review |
| `src/components/recruitment/ApplicationsRegister.tsx` | UI component | 12684 | `859604a4bcce` | Inventoried | TypeScript/build or runtime script review |
| `src/components/recruitment/EditVacancyForm.tsx` | UI component | 23656 | `26a6186e008d` | Inventoried | TypeScript/build or runtime script review |
| `src/components/recruitment/NewVacancyForm.tsx` | UI component | 11854 | `85c5a909ab23` | Inventoried | TypeScript/build or runtime script review |
| `src/components/recruitment/RecruitmentInsightsOverview.tsx` | UI component | 15815 | `5116f6799f14` | Inventoried | TypeScript/build or runtime script review |
| `src/components/recruitment/SelectionWorkspace.tsx` | UI component | 13045 | `90a3249c341e` | Inventoried | TypeScript/build or runtime script review |
| `src/components/recruitment/VacancyLifecycleActions.tsx` | UI component | 4046 | `c0ce0f73e8fb` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/AccommodationRequestForm.tsx` | UI component | 3696 | `1a1a89741185` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/AccountSettingsActions.tsx` | UI component | 5229 | `43f0dfdd4a45` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/AssessmentSubmissionReview.tsx` | UI component | 3963 | `256103a58ef5` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/ControlledDocumentViewer.tsx` | UI component | 2498 | `455ed1d2d013` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/Footer.tsx` | UI component | 4699 | `764a56045459` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/Header.tsx` | UI component | 19345 | `bf2d9f22762f` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/InterviewResponse.tsx` | UI component | 4410 | `8590f9f30a7e` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/LegalDocument.tsx` | UI component | 2088 | `ef49d2725bd0` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/MessageComposer.tsx` | UI component | 4584 | `b69e87e18d23` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/PreboardingActions.tsx` | UI component | 26409 | `c767f7622c0d` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/PrintButton.tsx` | UI component | 327 | `d46dc6a2443a` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/ProfileAdditionalDetails.tsx` | UI component | 12634 | `c78c711739ba` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/SavedSearchManager.tsx` | UI component | 12225 | `7c1b3dcd9be7` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/SecuritySettings.tsx` | UI component | 18246 | `b7fd2911930b` | Inventoried | TypeScript/build or runtime script review |
| `src/components/ui/Dialog.tsx` | UI component | 6281 | `50eb1758c2c5` | Inventoried | TypeScript/build or runtime script review |
| `src/components/ui/PageElements.tsx` | UI component | 2591 | `c8ab95b33e3c` | Inventoried | TypeScript/build or runtime script review |
| `src/components/ui/Pagination.tsx` | UI component | 4145 | `56c05affffe2` | Inventoried | TypeScript/build or runtime script review |
| `src/components/ui/Skeleton.tsx` | UI component | 648 | `2b28f266061c` | Inventoried | TypeScript/build or runtime script review |
| `src/components/ui/Toaster.tsx` | UI component | 2618 | `85d1a55d6af6` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/application-reference.ts` | Domain/infrastructure | 186 | `bb63d922d1e5` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/application-stages.ts` | Domain/infrastructure | 1416 | `39563ddfc4b6` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/approvals.ts` | Domain/infrastructure | 2152 | `f581d1f77712` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/audit.ts` | Domain/infrastructure | 6693 | `5b9debb8f5f0` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/auth.ts` | Domain/infrastructure | 8017 | `1687e97c64b6` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/authz.ts` | Domain/infrastructure | 4149 | `470445936ca7` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/automations.ts` | Domain/infrastructure | 4388 | `79219356d8ea` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/background-jobs.ts` | Domain/infrastructure | 27471 | `7904be293bf6` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/candidate-preboarding.ts` | Domain/infrastructure | 2100 | `8d7d8be9cb1e` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/candidate-status.ts` | Domain/infrastructure | 8742 | `333ee3d22909` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/candidate-tasks.ts` | Domain/infrastructure | 8229 | `ae285f7aff14` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/complaint-workflow.ts` | Domain/infrastructure | 601 | `1b30255f53b6` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/concurrency.ts` | Domain/infrastructure | 596 | `6d33f9ea8924` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/configuration-releases.ts` | Domain/infrastructure | 7832 | `1614f6459c94` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/deterministic-shuffle.ts` | Domain/infrastructure | 581 | `056226ff74ce` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/eligibility.ts` | Domain/infrastructure | 5474 | `12279eac65c5` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/errors.ts` | Domain/infrastructure | 307 | `1ffe30835fff` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/export-files.ts` | Domain/infrastructure | 2382 | `d96c242e07ef` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/form-template-fields.ts` | Domain/infrastructure | 319 | `6ecac7d80c06` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/form-template.ts` | Domain/infrastructure | 2253 | `c8abbb3529c9` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/home-route.ts` | Domain/infrastructure | 866 | `7f5cfd5cd28f` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/idempotency.ts` | Domain/infrastructure | 3654 | `fcb04787f951` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/job-alerts.ts` | Domain/infrastructure | 4715 | `2d60f03fb28b` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/lockout.ts` | Domain/infrastructure | 3303 | `feca35cf64ad` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/logger.ts` | Domain/infrastructure | 1870 | `5ce879671496` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/mailer.ts` | Domain/infrastructure | 3067 | `e23541eedd6f` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/message-template-fields.ts` | Domain/infrastructure | 680 | `9d98305a3010` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/message-template.ts` | Domain/infrastructure | 1202 | `9beb430a4248` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/notifications.ts` | Domain/infrastructure | 1401 | `d33a906a74be` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/offer-document.ts` | Domain/infrastructure | 2661 | `e662fda1560b` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/offer-template-fields.ts` | Domain/infrastructure | 981 | `1739fd034561` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/offer-template.ts` | Domain/infrastructure | 1558 | `cc21881c3042` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/oidc.ts` | Domain/infrastructure | 2247 | `146d09e9fcd4` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/outbox.ts` | Domain/infrastructure | 6837 | `627fb09c4e96` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/pagination.ts` | Domain/infrastructure | 2470 | `271ce2034933` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/policy-template.ts` | Domain/infrastructure | 983 | `3fc2bd3655a4` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/preboarding.ts` | Domain/infrastructure | 12632 | `2de9b037aa40` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/prisma.ts` | Domain/infrastructure | 302 | `04d40d4f0693` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/profile-completion.server.ts` | Domain/infrastructure | 654 | `818a243c9807` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/profile-completion.ts` | Domain/infrastructure | 1393 | `085b7af485c3` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/qr.ts` | Domain/infrastructure | 7880 | `b1e044c0865b` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/rate-limit.ts` | Domain/infrastructure | 3375 | `e1e89dc208be` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/rbac.ts` | Domain/infrastructure | 2093 | `da9a60792004` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/recruitment-access.ts` | Domain/infrastructure | 1782 | `79445bcfd3d3` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/recruitment-role-policy.ts` | Domain/infrastructure | 1147 | `f117166ed265` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/recruitment-scoring.server.ts` | Domain/infrastructure | 716 | `efb6e516ac99` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/recruitment-scoring.ts` | Domain/infrastructure | 1090 | `5242caece3b1` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/references.ts` | Domain/infrastructure | 1571 | `7eac016e608f` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/retention.ts` | Domain/infrastructure | 8915 | `33f60eb26a54` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/roles.ts` | Domain/infrastructure | 857 | `014f4a1032c7` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/s3.ts` | Domain/infrastructure | 8384 | `257a8c246d08` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/scheduled-report.ts` | Domain/infrastructure | 7117 | `7d22b2765693` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/search.ts` | Domain/infrastructure | 4951 | `8efdc80af697` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/secret-box.ts` | Domain/infrastructure | 1515 | `4a6c2d139619` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/session.ts` | Domain/infrastructure | 4262 | `27536d2b7318` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/simple-pdf.ts` | Domain/infrastructure | 8726 | `24bdd2a5c7ae` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/state-machine.ts` | Domain/infrastructure | 4594 | `dc8e2a059e87` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/tokens.ts` | Domain/infrastructure | 406 | `6bf244715b25` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/totp.ts` | Domain/infrastructure | 5167 | `7a72df2e942b` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/utils.ts` | Domain/infrastructure | 2521 | `beada2c85d66` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/validation.ts` | Domain/infrastructure | 8256 | `1d770c31be65` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/virus-scan.ts` | Domain/infrastructure | 2542 | `98310fbab439` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/work-items.ts` | Domain/infrastructure | 16491 | `3243a8a77fa8` | Inventoried | TypeScript/build or runtime script review |
| `src/proxy.ts` | Configuration | 6811 | `3b964eeddf93` | Inventoried | TypeScript/build or runtime script review |
| `src/types/nodemailer.d.ts` | Configuration | 143 | `ccdd0184266c` | Inventoried | TypeScript/build or runtime script review |
| `tailwind.config.js` | Configuration | 1788 | `cf3bfc550c6a` | Inventoried | TypeScript/build or runtime script review |
| `tests/authz-errors.test.ts` | Test | 1688 | `c6f490007e61` | Inventoried | Executed by unit/integration suite |
| `tests/candidate-status.test.ts` | Test | 1571 | `9c81db25c3c9` | Inventoried | Executed by unit/integration suite |
| `tests/e2e/accessibility-connectivity-acceptance.spec.ts` | Test | 5196 | `f0c66b972fad` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/admin-reports.spec.ts` | Test | 3743 | `09335c52ef38` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/applications.spec.ts` | Test | 3534 | `e8e225996b94` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/assessments-interviews.spec.ts` | Test | 4023 | `b384e3d87475` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/auth-and-profile.spec.ts` | Test | 3446 | `a290c2ff586a` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/candidate-completion-acceptance.spec.ts` | Test | 12836 | `7984deeb4e64` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/core-workflows.spec.ts` | Test | 6223 | `824df31a6c64` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/helpers.ts` | Test | 1449 | `71e21541c50d` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/operations-acceptance.spec.ts` | Test | 17384 | `e1c8e544ca04` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/page-coverage.spec.ts` | Test | 4267 | `d321d52969f2` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/profile-workflows.spec.ts` | Test | 9067 | `c5b2e1ad3be0` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/public-and-access.spec.ts` | Test | 3644 | `baf3b615042e` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/role-workflow-acceptance.spec.ts` | Test | 11596 | `df9ce43d94b7` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/selection-offers-preboarding.spec.ts` | Test | 1681 | `a64422d725ea` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/specialist-roles.spec.ts` | Test | 3796 | `2d5be860dda1` | Inventoried | Executed by Playwright browser suite |
| `tests/home-route.test.ts` | Test | 1471 | `40c7601c51f9` | Inventoried | Executed by unit/integration suite |
| `tests/integration/global-setup.ts` | Test | 1012 | `20ca6be97522` | Inventoried | Executed by unit/integration suite |
| `tests/integration/prisma-flow.test.ts` | Test | 15963 | `518d6f2c810f` | Inventoried | Executed by unit/integration suite |
| `tests/pagination.test.ts` | Test | 2730 | `48255b0bb0a8` | Inventoried | Executed by unit/integration suite |
| `tests/rate-limit.test.ts` | Test | 668 | `7d9db9c62910` | Inventoried | Executed by unit/integration suite |
| `tests/recruitment-role-policy.test.ts` | Test | 1571 | `5cc4f0afa548` | Inventoried | Executed by unit/integration suite |
| `tests/recruitment-scoring.test.ts` | Test | 1245 | `792139013432` | Inventoried | Executed by unit/integration suite |
| `tests/role-separation.test.ts` | Test | 944 | `410c508a2c59` | Inventoried | Executed by unit/integration suite |
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
