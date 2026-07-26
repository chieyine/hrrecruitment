# Complete first-party file inventory

Generated inventory of the first-party repository state on 2026-07-24T13:30:39.348Z.

## Outcome

- First-party files inventoried: **391**.
- Every row contains a hash of the exact file state.

This command is an inventory generator. It intentionally does **not** label files
as reviewed and does not claim that tests, builds, migrations, accessibility
checks, or release gates passed. Record executed verification and human review
evidence separately; an inventory script cannot self-certify those results.

## File inventory

| File | Layer | Bytes | SHA-256 (12) | Inventory status | Applicable verification |
|---|---:|---:|---:|---|---|
| `.dockerignore` | Configuration | 112 | `844507846169` | Inventoried | Configuration/documentation review |
| `.env.example` | Configuration | 1262 | `132350b4e524` | Inventoried | Configuration/documentation review |
| `.env.production.example` | Configuration | 1061 | `76ae126d378f` | Inventoried | Configuration/documentation review |
| `.eslintrc.json` | Configuration | 218 | `c39ee3059991` | Inventoried | Configuration/documentation review |
| `.github/workflows/ci.yml` | Configuration | 1965 | `4017bec521d9` | Inventoried | Configuration/documentation review |
| `.gitignore` | Configuration | 222 | `0d9a7131c49d` | Inventoried | Configuration/documentation review |
| `Dockerfile` | Configuration | 526 | `02ddd7129585` | Inventoried | Configuration/documentation review |
| `FRAD_Recruitment_Preboarding_README.md` | Documentation | 96289 | `1fae6f8f53b7` | Inventoried | Configuration/documentation review |
| `README.md` | Documentation | 7048 | `545647a3160b` | Inventoried | Configuration/documentation review |
| `README_CONFORMANCE_AUDIT.md` | Documentation | 10910 | `2390993318be` | Inventoried | Configuration/documentation review |
| `RECOMMENDATIONS_IMPLEMENTED.md` | Documentation | 4969 | `68784ebb3d81` | Inventoried | Configuration/documentation review |
| `REMEDIATION.md` | Documentation | 611 | `7af2ace8a14a` | Inventoried | Configuration/documentation review |
| `UI_POLISH.md` | Documentation | 3623 | `a9c57254e509` | Inventoried | Configuration/documentation review |
| `docker-compose.production.yml` | Configuration | 1932 | `5ffa77d82f51` | Inventoried | Configuration/documentation review |
| `docs/PRODUCTION_RUNBOOK.md` | Documentation | 6467 | `6b370a66f689` | Inventoried | Configuration/documentation review |
| `docs/RELEASE_ACCEPTANCE.md` | Documentation | 1683 | `34398064a303` | Inventoried | Configuration/documentation review |
| `docs/SECURITY_AND_GOVERNANCE.md` | Documentation | 2404 | `aa4394e07c43` | Inventoried | Configuration/documentation review |
| `next-env.d.ts` | Configuration | 228 | `9dd9d642cdb8` | Inventoried | TypeScript/build or runtime script review |
| `next.config.js` | Configuration | 1178 | `99213c1fc2c1` | Inventoried | TypeScript/build or runtime script review |
| `package-lock.json` | Configuration | 295299 | `b683d587da43` | Inventoried | Configuration/documentation review |
| `package.json` | Configuration | 2128 | `b03e506dd677` | Inventoried | Configuration/documentation review |
| `playwright.config.ts` | Configuration | 2096 | `6a8ba30728b8` | Inventoried | TypeScript/build or runtime script review |
| `postcss.config.js` | Configuration | 82 | `251ecddd4672` | Inventoried | TypeScript/build or runtime script review |
| `prisma/migrations/20260722180438_init/migration.sql` | SQLite migration | 44592 | `30bc4112d710` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260722203000_compliance_models/migration.sql` | SQLite migration | 2271 | `d2c0ffa16703` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260722213000_session_and_offer_signature/migration.sql` | SQLite migration | 299 | `cb11d7433b59` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260722214500_confirmed_start_date/migration.sql` | SQLite migration | 156 | `bc0e020f5bc3` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260722221500_candidate_requirement_flags/migration.sql` | SQLite migration | 458 | `521ebd049e82` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260722222500_policy_signature_audit/migration.sql` | SQLite migration | 166 | `be76bd586a36` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260722223500_interview_submission_versions/migration.sql` | SQLite migration | 402 | `21d7aabbd3a7` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260722224500_assessment_answer_unique/migration.sql` | SQLite migration | 176 | `69ef507a529c` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260722225500_preboarding_due_dates/migration.sql` | SQLite migration | 211 | `e4485e154070` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260722230500_document_versions/migration.sql` | SQLite migration | 545 | `3f1858aa42c4` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260722231500_offer_versions/migration.sql` | SQLite migration | 209 | `97da7f801e62` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260722232500_vacancy_categories/migration.sql` | SQLite migration | 432 | `1ed084cc14d9` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260722234000_reliability_governance/migration.sql` | SQLite migration | 6868 | `66c8c63ace59` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260722235000_assignment_snapshots/migration.sql` | SQLite migration | 461 | `0a17251b677e` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260722235900_workflow_uniqueness/migration.sql` | SQLite migration | 2189 | `f521ac0e3c59` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260723000000_distributed_rate_limit/migration.sql` | SQLite migration | 260 | `7f2bdc34439c` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260723000500_job_lease/migration.sql` | SQLite migration | 173 | `cafee720b040` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260723001000_form_sensitivity/migration.sql` | SQLite migration | 102 | `b29824025309` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260723001000_staff_sso/migration.sql` | SQLite migration | 571 | `9f1e85fcfd8f` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260723002000_audit_chain_head/migration.sql` | SQLite migration | 168 | `d8f5e78b0ee8` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260723002500_outbox_lease/migration.sql` | SQLite migration | 58 | `d87169cd7cb5` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260723010000_recruitment_operating_system/migration.sql` | SQLite migration | 7361 | `285e5b7645cd` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260723130000_reconcile_relational_constraints/migration.sql` | SQLite migration | 7040 | `45fb73af40f4` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260723150000_offer_candidate_response/migration.sql` | SQLite migration | 147 | `fd491e159c10` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260723151000_scheduled_reports/migration.sql` | SQLite migration | 635 | `5295a0ebe4b9` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260723152000_reference_outcome_normalization/migration.sql` | SQLite migration | 215 | `4dbd5757e056` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260724090000_hr_productivity_controls/migration.sql` | SQLite migration | 2846 | `7f043c6d89ff` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/20260724135000_complete_workflow_details/migration.sql` | SQLite migration | 3765 | `47c9fe94492e` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/migrations/migration_lock.toml` | SQLite migration | 122 | `299b191f637f` | Inventoried | Configuration/documentation review |
| `prisma/postgresql/migrations/0001_baseline/migration.sql` | PostgreSQL migration | 68635 | `4363151f3f82` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0002_operating_system/migration.sql` | PostgreSQL migration | 10860 | `d6cb63235abe` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0003_offer_reports/migration.sql` | PostgreSQL migration | 727 | `4b20f62ada20` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0004_reference_outcome_normalization/migration.sql` | PostgreSQL migration | 215 | `4dbd5757e056` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/0005_hr_productivity_controls/migration.sql` | PostgreSQL migration | 3091 | `7fc300f8284e` | Inventoried | Fresh migration suite; upgrade copy check |
| `prisma/postgresql/migrations/migration_lock.toml` | PostgreSQL migration | 24 | `1db17a8d051a` | Inventoried | Configuration/documentation review |
| `prisma/postgresql/schema.prisma` | Database | 71524 | `9a3af693182f` | Inventoried | Prisma format/generate/validate |
| `prisma/schema.prisma` | Database | 71431 | `28b3d33c5baa` | Inventoried | Prisma format/generate/validate |
| `prisma/seed.ts` | Database | 32875 | `4af090206dd5` | Inventoried | TypeScript/build or runtime script review |
| `public/og.png` | Public asset | 2090346 | `70a363c6f9d9` | Inventoried | Visual asset review |
| `scripts/backup-postgres.sh` | Operations script | 372 | `652fdd1572f4` | Inventoried | Configuration/documentation review |
| `scripts/bootstrap-production-admin.ts` | Operations script | 2634 | `d47ebae83f90` | Inventoried | TypeScript/build or runtime script review |
| `scripts/generate-file-audit.mjs` | Operations script | 3851 | `a7b5da402470` | Inventoried | TypeScript/build or runtime script review |
| `scripts/generate-postgres-schema.mjs` | Operations script | 647 | `72c04bc7db37` | Inventoried | TypeScript/build or runtime script review |
| `scripts/restore-postgres.sh` | Operations script | 972 | `1b814742ee9f` | Inventoried | Configuration/documentation review |
| `scripts/start-e2e.mjs` | Operations script | 1825 | `14b3d9e57658` | Inventoried | TypeScript/build or runtime script review |
| `scripts/start-production.sh` | Operations script | 929 | `0e4f2f290ad1` | Inventoried | Configuration/documentation review |
| `src/app/admin/assessment-bank/page.tsx` | Page/layout | 1268 | `4cdf63896ce7` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/automations/page.tsx` | Page/layout | 972 | `42efdcff3bed` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/configuration-releases/page.tsx` | Page/layout | 1004 | `9038cc9b3203` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/contract-types/page.tsx` | Page/layout | 495 | `85617e7b0c69` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/courses/page.tsx` | Page/layout | 1669 | `d66d2649e3e1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/deletion-requests/page.tsx` | Page/layout | 4757 | `01714bcec2fd` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/departments/page.tsx` | Page/layout | 624 | `e69d66347de4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/document-types/page.tsx` | Page/layout | 579 | `fc655048e905` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/duty-stations/page.tsx` | Page/layout | 774 | `21b1796f6357` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/forms/page.tsx` | Page/layout | 951 | `c6a7c6cc313d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/governance/page.tsx` | Page/layout | 11023 | `151d07e9998a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/interview-questions/page.tsx` | Page/layout | 1217 | `b623913d2628` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/layout.tsx` | Page/layout | 3261 | `bf9226f521b4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/notification-templates/page.tsx` | Page/layout | 869 | `243887097c18` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/operating-model/page.tsx` | Page/layout | 2026 | `c541d3477dfd` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/permissions/page.tsx` | Page/layout | 582 | `4af8f6c5f471` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/policies/page.tsx` | Page/layout | 1627 | `914ed05655bc` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/preboarding-packages/page.tsx` | Page/layout | 1279 | `58758676bbc1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/projects/page.tsx` | Page/layout | 611 | `e44291043f93` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/roles/page.tsx` | Page/layout | 517 | `ce7c75d510f7` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/scorecards/page.tsx` | Page/layout | 958 | `a5fe9bcd26f3` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/system-settings/page.tsx` | Page/layout | 7537 | `c5d9144cc5f3` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/tasks/page.tsx` | Page/layout | 978 | `61516a3b980f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/templates/page.tsx` | Page/layout | 539 | `71322bc2a76c` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/users/page.tsx` | Page/layout | 128 | `d4818d4c5d6b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/admin/vacancy-categories/page.tsx` | Page/layout | 513 | `4ade5da21a75` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/automations/route.ts` | API route | 3799 | `764ff5e1fd38` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/configuration-builder/route.ts` | API route | 9244 | `1830585bd49e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/configuration-releases/route.ts` | API route | 7434 | `1fb6245f3895` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/deletion-requests/route.ts` | API route | 8654 | `472a33d26c4f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/generic/route.ts` | API route | 12018 | `ead5f19d15cc` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/governance/route.ts` | API route | 5443 | `cb74c2b50d4b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/operating-model/route.ts` | API route | 6554 | `0731d7a0e0f4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/admin/users/[id]/route.ts` | API route | 4623 | `f4aceabc4a9a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/assets/download/[id]/route.ts` | API route | 5449 | `a57aae16f5a7` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/assets/upload/route.ts` | API route | 3917 | `f1d4243b3f49` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/forgot-password/route.ts` | API route | 2162 | `f1817adaf7f3` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/login/route.ts` | API route | 4123 | `4a0945ea0ec0` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/logout/route.ts` | API route | 429 | `d5bb63e56c9b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/register/route.ts` | API route | 4984 | `8c6a735c29ca` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/reset-password/route.ts` | API route | 1757 | `3d977fb2f041` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/session/route.ts` | API route | 283 | `375847e441d0` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/sso/callback/route.ts` | API route | 4089 | `ebbf4e16975b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/sso/start/route.ts` | API route | 1452 | `7c8874151059` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/auth/verify-email/route.ts` | API route | 2022 | `d35bd0dffdfe` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/calendar/interviews/[id]/route.ts` | API route | 2366 | `db56c97026f1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/accommodations/route.ts` | API route | 2403 | `af52889c9105` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/account/route.ts` | API route | 5837 | `1607d4b8dd79` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/applications/[id]/route.ts` | API route | 3405 | `9e996c04bf07` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/applications/route.ts` | API route | 14490 | `33aa84d8f4bf` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/assessments/[id]/answers/route.ts` | API route | 3350 | `27f59a83d14a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/assessments/[id]/route.ts` | API route | 921 | `b05fa67386ac` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/assessments/[id]/start/route.ts` | API route | 3369 | `6d30cf287dba` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/assessments/[id]/submit/route.ts` | API route | 10743 | `38d9fa543a8d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/documents/[id]/route.ts` | API route | 2044 | `0c04c76075e3` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/documents/route.ts` | API route | 1863 | `803b9d29f8b4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/education/[id]/route.ts` | API route | 2543 | `23f8dcba4e60` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/education/route.ts` | API route | 2158 | `8eae349ddafa` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/employment/[id]/route.ts` | API route | 3210 | `e40c64eb0df2` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/employment/route.ts` | API route | 2958 | `d71159479816` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/interviews/[id]/respond/route.ts` | API route | 1669 | `27de6c783147` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/licences/[id]/route.ts` | API route | 2478 | `c4c38d570fe2` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/licences/route.ts` | API route | 1963 | `f7b6c1c2ea27` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/offers/[id]/respond/route.ts` | API route | 8315 | `2ed448d87430` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/offers/[id]/route.ts` | API route | 4133 | `cddafbf2fc9a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/preboarding/actions/route.ts` | API route | 18281 | `d3a71cb07fc4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/preboarding/confirm-start-date/route.ts` | API route | 2265 | `fab42bf55cbc` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/preboarding/courses/[id]/certificate/route.ts` | API route | 2728 | `58824ab7f57a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/preboarding/route.ts` | API route | 2240 | `4c8e884f909b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/privacy/export/route.ts` | API route | 7486 | `3b1842f2db26` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/profile-items/route.ts` | API route | 6776 | `57e8a8e8de94` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/candidate/profile/route.ts` | API route | 4325 | `a2f641a61f55` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/complaints/route.ts` | API route | 4422 | `b70b893d3303` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/cron/process-schedules/route.ts` | API route | 1475 | `0ca0851d6c59` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/health/route.ts` | API route | 1422 | `b886b265a7f0` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/messages/route.ts` | API route | 6236 | `7b0375c012f2` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/notifications/route.ts` | API route | 1352 | `e5c0c914ddd8` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/public/fraud-reports/route.ts` | API route | 1385 | `8bdc70bd9fed` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/public/reference/resolve/route.ts` | API route | 1821 | `6a41008e5978` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/public/reference/submit/route.ts` | API route | 3785 | `c6b4cc9780f2` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/public/vacancies/[reference]/route.ts` | API route | 907 | `a4ebde2c920e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/public/vacancies/route.ts` | API route | 1462 | `3ad570fd3012` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/accommodations/route.ts` | API route | 2241 | `e2034c726074` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/assign-reviewer/route.ts` | API route | 2059 | `5680bbc0345a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/conflict/route.ts` | API route | 1485 | `7655447b5980` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/documentation/route.ts` | API route | 12749 | `b60aa7df7f9c` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/erp-transfer/route.ts` | API route | 3571 | `3eca8e3ab81c` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/handover-summary/route.ts` | API route | 4037 | `0d189ffc2cff` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/notes/route.ts` | API route | 1449 | `60e8e4abb8af` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/referees/route.ts` | API route | 4041 | `cdb4a6520785` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/resumption/route.ts` | API route | 3745 | `5fd5ac537567` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/route.ts` | API route | 7683 | `b3c85887debe` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/[id]/stage/route.ts` | API route | 2822 | `578280c624ca` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/assisted/route.ts` | API route | 5617 | `8cb4444fed69` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/bulk-actions/[id]/undo/route.ts` | API route | 2505 | `5a5867c7884e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/bulk-actions/route.ts` | API route | 11803 | `ac9f7d86b66e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/bulk-export/route.ts` | API route | 2104 | `11176054299e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/bulk-message/route.ts` | API route | 1658 | `e18fca09b54b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/bulk-stage-change/route.ts` | API route | 3719 | `2d161524cb65` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/applications/route.ts` | API route | 1812 | `9decff46facb` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/approvals/route.ts` | API route | 11915 | `6380143171c4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/assessments/[id]/invite/route.ts` | API route | 2216 | `23545c2f681f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/assessments/[id]/route.ts` | API route | 3977 | `8a43fa04d0c6` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/assessments/route.ts` | API route | 3138 | `1074e8854ea4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/candidate-assessments/[id]/mark/route.ts` | API route | 3667 | `cedc033004e9` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/candidate-assessments/[id]/reset/route.ts` | API route | 2574 | `800934b6b935` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/complaints/route.ts` | API route | 3578 | `dc6dfdef8d65` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/data-quality/merges/route.ts` | API route | 9854 | `f845abd0bf2e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/eligibility/route.ts` | API route | 3022 | `e20961312437` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/[id]/confirm-panel/route.ts` | API route | 3669 | `b4508b4ad8b7` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/[id]/invite/route.ts` | API route | 1914 | `7b373d00e32f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/[id]/panel/[memberId]/reopen/route.ts` | API route | 1116 | `6a66ba7def71` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/[id]/panel/[memberId]/resolve-conflict/route.ts` | API route | 1497 | `09c235cfbc25` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/[id]/route.ts` | API route | 5556 | `44ce0e2cc6b0` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/[id]/scores/route.ts` | API route | 9294 | `c865eb680225` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/interviews/route.ts` | API route | 5588 | `822f724b4dc7` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/offers/[id]/actions/route.ts` | API route | 7294 | `0abaeaaab349` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/offers/[id]/route.ts` | API route | 3589 | `bc9c7e8e970f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/offers/route.ts` | API route | 3735 | `d04065b52fe4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/preboarding/[id]/manage/route.ts` | API route | 10526 | `d5b576763f0c` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/preboarding/[id]/route.ts` | API route | 3494 | `b51c19f9eb21` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/preboarding/clearance/route.ts` | API route | 3364 | `8f911ba69c44` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/referees/[id]/send-reminder/route.ts` | API route | 1279 | `4877dc0378a9` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/referees/[id]/send-request/route.ts` | API route | 3259 | `99bb1b029585` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/reference-responses/[id]/verify/route.ts` | API route | 824 | `ebb27aade226` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/reports/export/route.ts` | API route | 26732 | `227244a5cae1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/reports/schedules/route.ts` | API route | 3108 | `23be7e6727ea` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/scorecards/[id]/reopen/route.ts` | API route | 1184 | `fe4eaea19ac7` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/scorecards/[id]/route.ts` | API route | 1037 | `b68a7788660c` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/scorecards/route.ts` | API route | 8118 | `95c58d2a97af` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/search/route.ts` | API route | 3334 | `76ca9f88e159` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/selections/route.ts` | API route | 6483 | `ffa1918fbd4f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/talent-pools/route.ts` | API route | 5583 | `8135d1854e84` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/vacancies/[id]/actions/route.ts` | API route | 7983 | `8f8fbc88fafd` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/vacancies/[id]/documentation/route.ts` | API route | 7310 | `0915c5c15a3e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/vacancies/[id]/route.ts` | API route | 7168 | `c3ca697f0b55` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/vacancies/route.ts` | API route | 6695 | `40ca6df4c1a8` | Inventoried | TypeScript/build or runtime script review |
| `src/app/api/recruitment/work-items/[id]/route.ts` | API route | 2799 | `405cb561820f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/auth/login/page.tsx` | Page/layout | 7428 | `46ab7d95f24e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/auth/register/page.tsx` | Page/layout | 8195 | `c0575a9c78ff` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/accommodations/page.tsx` | Page/layout | 2245 | `766669ca0379` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/applications/[id]/page.tsx` | Page/layout | 6587 | `99119dd318f3` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/applications/[id]/receipt/page.tsx` | Page/layout | 4248 | `ddf4e6f95ccd` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/applications/apply/page.tsx` | Page/layout | 23412 | `ade51204eae0` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/applications/page.tsx` | Page/layout | 4872 | `ae933e8a33e3` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/assessments/[id]/page.tsx` | Page/layout | 13159 | `0810d923bbd1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/assessments/page.tsx` | Page/layout | 3050 | `11484e196c69` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/complaints/page.tsx` | Page/layout | 1865 | `163990cb209a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/dashboard/page.tsx` | Page/layout | 13512 | `f79e42ed1f37` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/interviews/page.tsx` | Page/layout | 3629 | `556e3dac7722` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/messages/page.tsx` | Page/layout | 3317 | `b21c75046f00` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/offers/[id]/page.tsx` | Page/layout | 13368 | `37ca212c3bf5` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/offers/page.tsx` | Page/layout | 2989 | `9b268653919f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/courses/page.tsx` | Page/layout | 3331 | `bbd25c191b54` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/documents/page.tsx` | Page/layout | 2963 | `4947b87a4fb5` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/forms/page.tsx` | Page/layout | 3934 | `07c2f7b39b25` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/meetings/page.tsx` | Page/layout | 2881 | `98412654124a` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/page.tsx` | Page/layout | 12722 | `3c0cc08f6355` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/policies/page.tsx` | Page/layout | 3126 | `79d760c2b0b1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/reporting-information/page.tsx` | Page/layout | 2517 | `5ffc9a75afe7` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/preboarding/tasks/page.tsx` | Page/layout | 2541 | `41786c0a9847` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/profile/documents/page.tsx` | Page/layout | 12500 | `a14a13407c4b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/profile/education/page.tsx` | Page/layout | 11743 | `7ecd5e75b7f0` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/profile/employment/page.tsx` | Page/layout | 12355 | `354c36ce15dd` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/profile/licences/page.tsx` | Page/layout | 9654 | `59c00644b8c1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/profile/page.tsx` | Page/layout | 9853 | `e13312e55b09` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/profile/personal/page.tsx` | Page/layout | 12949 | `195d5c441982` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/settings/page.tsx` | Page/layout | 2790 | `6719d8eb0896` | Inventoried | TypeScript/build or runtime script review |
| `src/app/candidate/tasks/page.tsx` | Page/layout | 8816 | `56daaa047fd9` | Inventoried | TypeScript/build or runtime script review |
| `src/app/careers/[reference]/page.tsx` | Page/layout | 9566 | `319f2f4937e6` | Inventoried | TypeScript/build or runtime script review |
| `src/app/careers/page.tsx` | Page/layout | 11138 | `bd9afbe935ba` | Inventoried | TypeScript/build or runtime script review |
| `src/app/complaints/page.tsx` | Page/layout | 6635 | `36383aba97a4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/error.tsx` | Page/layout | 1679 | `2448f041fa0b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/forgot-password/page.tsx` | Page/layout | 3777 | `26b00565288f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/global-error.tsx` | Page/layout | 885 | `19d435283267` | Inventoried | TypeScript/build or runtime script review |
| `src/app/globals.css` | Page/layout | 5149 | `d9e4bc304dfd` | Inventoried | Configuration/documentation review |
| `src/app/guidance/page.tsx` | Page/layout | 4376 | `dbe4884d8231` | Inventoried | TypeScript/build or runtime script review |
| `src/app/layout.tsx` | Page/layout | 1859 | `e835bf407637` | Inventoried | TypeScript/build or runtime script review |
| `src/app/login/page.tsx` | Page/layout | 108 | `1515d2d89b23` | Inventoried | TypeScript/build or runtime script review |
| `src/app/not-found.tsx` | Page/layout | 4127 | `5fe9b6153976` | Inventoried | TypeScript/build or runtime script review |
| `src/app/page.tsx` | Page/layout | 112 | `0bfc5000c7a0` | Inventoried | TypeScript/build or runtime script review |
| `src/app/privacy/page.tsx` | Page/layout | 3651 | `72f7e00dbcef` | Inventoried | TypeScript/build or runtime script review |
| `src/app/public/reference/[token]/page.tsx` | Page/layout | 12077 | `101c77731aa4` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment-faq/page.tsx` | Page/layout | 5389 | `12f4ea7542e5` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment-process/page.tsx` | Page/layout | 119 | `5cd3d4e82295` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/accommodations/page.tsx` | Page/layout | 2091 | `6bf351f6a342` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/applications/[id]/handover/page.tsx` | Page/layout | 18144 | `4fd31154453e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/applications/[id]/page.tsx` | Page/layout | 33323 | `167d5219cac9` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/applications/page.tsx` | Page/layout | 10596 | `2b7e89b682c0` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/approvals/page.tsx` | Page/layout | 10009 | `c84dce3f551e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/assessments/page.tsx` | Page/layout | 3979 | `34ecd24770c7` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/audit/page.tsx` | Page/layout | 4296 | `edfdd9b2ae63` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/communications/page.tsx` | Page/layout | 3790 | `60f905ee2909` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/complaints/page.tsx` | Page/layout | 1181 | `1afc4e22b212` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/dashboard/page.tsx` | Page/layout | 9987 | `23c655a07d94` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/insights/page.tsx` | Page/layout | 12612 | `57ef27605fd8` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/interviews/page.tsx` | Page/layout | 6365 | `e0be2ccf35ca` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/offers/page.tsx` | Page/layout | 4611 | `4a6397198bc2` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/operations/page.tsx` | Page/layout | 5311 | `7e00994ea7d6` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/preboarding/[id]/page.tsx` | Page/layout | 20348 | `17b3335c89d8` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/preboarding/page.tsx` | Page/layout | 4424 | `9dab88e51f50` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/quality/page.tsx` | Page/layout | 10619 | `0bffd0017cc7` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/references/page.tsx` | Page/layout | 4562 | `4c1940a91b38` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/reports/page.tsx` | Page/layout | 8688 | `88a877eabb9d` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/search/page.tsx` | Page/layout | 1074 | `627b71772fb3` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/selections/page.tsx` | Page/layout | 9818 | `136b41574b4b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/talent-pools/page.tsx` | Page/layout | 2874 | `a494fde05c6e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/vacancies/[id]/applications/page.tsx` | Page/layout | 4599 | `2f2015383a5e` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/vacancies/[id]/page.tsx` | Page/layout | 10303 | `fdaa236d47f8` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/vacancies/new/page.tsx` | Page/layout | 21799 | `7517c27fb480` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/vacancies/page.tsx` | Page/layout | 4493 | `5bda04b8d475` | Inventoried | TypeScript/build or runtime script review |
| `src/app/recruitment/work/page.tsx` | Page/layout | 11945 | `f1bf8ad94854` | Inventoried | TypeScript/build or runtime script review |
| `src/app/register/page.tsx` | Page/layout | 114 | `5479fea6b75b` | Inventoried | TypeScript/build or runtime script review |
| `src/app/report-fraud/page.tsx` | Page/layout | 5091 | `e3878602a55f` | Inventoried | TypeScript/build or runtime script review |
| `src/app/report-recruitment-fraud/page.tsx` | Page/layout | 116 | `787c03de4c39` | Inventoried | TypeScript/build or runtime script review |
| `src/app/reset-password/page.tsx` | Page/layout | 5494 | `5c17d0aa1ce1` | Inventoried | TypeScript/build or runtime script review |
| `src/app/terms/page.tsx` | Page/layout | 2635 | `c80bf11aad48` | Inventoried | TypeScript/build or runtime script review |
| `src/app/verify-email/page.tsx` | Page/layout | 1644 | `89a14ab26cbc` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AccommodationManager.tsx` | UI component | 3807 | `7532ab035a11` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AdminCrud.tsx` | UI component | 18667 | `cd98c6e4a123` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AdminNav.tsx` | UI component | 1201 | `de6fd04e891a` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AssessmentManager.tsx` | UI component | 14942 | `1662968a5007` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AssistedApplicationEntry.tsx` | UI component | 3055 | `9a7a21d32840` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/AutomationManager.tsx` | UI component | 3932 | `e58cfa728180` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/BulkApplicationActions.tsx` | UI component | 14762 | `78650192fd6a` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/CandidateMergeManager.tsx` | UI component | 7446 | `86b4d2914cd5` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/ComplaintCaseManager.tsx` | UI component | 6743 | `26b2c399a3c8` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/ConfigurationBuilder.tsx` | UI component | 17583 | `ad91c5461850` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/ConfigurationReleaseManager.tsx` | UI component | 4308 | `c61115472bb4` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/GlobalSearch.tsx` | UI component | 2677 | `aa63467a9601` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/InterviewManager.tsx` | UI component | 14441 | `bf837c80621b` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/OfferManager.tsx` | UI component | 7026 | `3bd987e8b939` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/OperatingModelManager.tsx` | UI component | 6841 | `5de7b66f1a49` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/ReferenceManager.tsx` | UI component | 7140 | `fc84a9c0a615` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/ReportScheduler.tsx` | UI component | 3834 | `ec4f69e38c8e` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/TalentPoolManager.tsx` | UI component | 4091 | `d918d54cf1cf` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/UserManager.tsx` | UI component | 2930 | `844c31939d26` | Inventoried | TypeScript/build or runtime script review |
| `src/components/admin/WorkItemActions.tsx` | UI component | 2127 | `f36d924e772e` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/AccommodationRequestForm.tsx` | UI component | 2902 | `3c71cf31e7aa` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/AccountSettingsActions.tsx` | UI component | 6357 | `afe919f2c329` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/Footer.tsx` | UI component | 2535 | `bc0537a21db0` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/Header.tsx` | UI component | 8669 | `d7c0c1568026` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/InterviewResponse.tsx` | UI component | 3512 | `71f594e5adb4` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/LegalDocument.tsx` | UI component | 1958 | `939ed8230bfa` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/MessageComposer.tsx` | UI component | 3261 | `f17ed83df808` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/NotificationInbox.tsx` | UI component | 2868 | `1aacae6e7a47` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/PreboardingActions.tsx` | UI component | 19975 | `130e081fef04` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/PrintButton.tsx` | UI component | 327 | `d46dc6a2443a` | Inventoried | TypeScript/build or runtime script review |
| `src/components/shared/ProfileAdditionalDetails.tsx` | UI component | 8320 | `91d6b2da8340` | Inventoried | TypeScript/build or runtime script review |
| `src/components/ui/Dialog.tsx` | UI component | 6475 | `19de6f544583` | Inventoried | TypeScript/build or runtime script review |
| `src/components/ui/PageElements.tsx` | UI component | 2276 | `81761a1e64ad` | Inventoried | TypeScript/build or runtime script review |
| `src/components/ui/Skeleton.tsx` | UI component | 651 | `4047ba968992` | Inventoried | TypeScript/build or runtime script review |
| `src/components/ui/Toaster.tsx` | UI component | 2592 | `f27629a9fa2b` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/approvals.ts` | Domain/infrastructure | 670 | `49496a0c391e` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/audit.ts` | Domain/infrastructure | 4763 | `83045d77eba3` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/auth.ts` | Domain/infrastructure | 5622 | `f8d4fd12b27c` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/authz.ts` | Domain/infrastructure | 2120 | `a9cfcf50ff6d` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/automations.ts` | Domain/infrastructure | 4073 | `9c526405b994` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/background-jobs.ts` | Domain/infrastructure | 23533 | `6f85d7a861ad` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/candidate-preboarding.ts` | Domain/infrastructure | 1229 | `661b48e776aa` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/candidate-status.ts` | Domain/infrastructure | 8218 | `1cb67a99c69a` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/concurrency.ts` | Domain/infrastructure | 596 | `6d33f9ea8924` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/configuration-releases.ts` | Domain/infrastructure | 6220 | `b8b9b9b8ec9a` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/deterministic-shuffle.ts` | Domain/infrastructure | 581 | `056226ff74ce` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/eligibility.ts` | Domain/infrastructure | 5100 | `72605cfd367e` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/errors.ts` | Domain/infrastructure | 307 | `1ffe30835fff` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/export-files.ts` | Domain/infrastructure | 2338 | `919b1b6f7994` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/idempotency.ts` | Domain/infrastructure | 2058 | `9b6f700429b2` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/logger.ts` | Domain/infrastructure | 1721 | `a599af0de53d` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/mailer.ts` | Domain/infrastructure | 2488 | `ec3e277ea5f1` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/notifications.ts` | Domain/infrastructure | 1173 | `13f2d63214e6` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/oidc.ts` | Domain/infrastructure | 1948 | `a4b16475b0f5` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/outbox.ts` | Domain/infrastructure | 5324 | `ba4cb71107eb` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/preboarding.ts` | Domain/infrastructure | 11974 | `49d2f0d8b46f` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/prisma.ts` | Domain/infrastructure | 302 | `04d40d4f0693` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/profile-completion.server.ts` | Domain/infrastructure | 654 | `818a243c9807` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/profile-completion.ts` | Domain/infrastructure | 2006 | `f7b394de8790` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/rate-limit.ts` | Domain/infrastructure | 3267 | `461a63221436` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/rbac.ts` | Domain/infrastructure | 2303 | `afbaab224009` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/recruitment-access.ts` | Domain/infrastructure | 1778 | `89b47475ee39` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/recruitment-scoring.ts` | Domain/infrastructure | 1346 | `1a63d95ae5d2` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/retention.ts` | Domain/infrastructure | 3329 | `b30c937587ea` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/s3.ts` | Domain/infrastructure | 7270 | `e0c37c8a2204` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/scheduled-report.ts` | Domain/infrastructure | 6717 | `cf81ea54378c` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/simple-pdf.ts` | Domain/infrastructure | 2127 | `622067d148e9` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/state-machine.ts` | Domain/infrastructure | 3965 | `8fe34feb5c88` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/tokens.ts` | Domain/infrastructure | 406 | `6bf244715b25` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/utils.ts` | Domain/infrastructure | 1858 | `7c2bfdff131b` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/validation.ts` | Domain/infrastructure | 7378 | `f6b38e1f0066` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/virus-scan.ts` | Domain/infrastructure | 2449 | `3067daa0ae18` | Inventoried | TypeScript/build or runtime script review |
| `src/lib/work-items.ts` | Domain/infrastructure | 15221 | `67c3de94a774` | Inventoried | TypeScript/build or runtime script review |
| `src/middleware.ts` | Configuration | 4414 | `e1fc6adf7723` | Inventoried | TypeScript/build or runtime script review |
| `src/types/nodemailer.d.ts` | Configuration | 143 | `ccdd0184266c` | Inventoried | TypeScript/build or runtime script review |
| `tailwind.config.js` | Configuration | 1813 | `c392bbdd4784` | Inventoried | TypeScript/build or runtime script review |
| `tests/candidate-status.test.ts` | Test | 1469 | `f2e97fad1a4f` | Inventoried | Executed by unit/integration suite |
| `tests/e2e/accessibility-connectivity-acceptance.spec.ts` | Test | 5087 | `df1e6298bc27` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/admin-reports.spec.ts` | Test | 3555 | `6ad87c0c637e` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/applications.spec.ts` | Test | 2779 | `abdcd687e758` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/assessments-interviews.spec.ts` | Test | 4013 | `d8b499ad223d` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/auth-and-profile.spec.ts` | Test | 3491 | `9237b8ef2066` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/candidate-completion-acceptance.spec.ts` | Test | 11233 | `3a02c5ce4be7` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/core-workflows.spec.ts` | Test | 5448 | `2a189a9da6e3` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/helpers.ts` | Test | 1433 | `5f7c9e63bbf1` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/operations-acceptance.spec.ts` | Test | 17206 | `ba1b43fa7bcd` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/page-coverage.spec.ts` | Test | 3354 | `3bc0bb744755` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/profile-workflows.spec.ts` | Test | 8738 | `72c252893319` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/public-and-access.spec.ts` | Test | 3634 | `058eacb86855` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/role-workflow-acceptance.spec.ts` | Test | 11231 | `04ab2b3aa594` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/selection-offers-preboarding.spec.ts` | Test | 1684 | `0405cff14cf1` | Inventoried | Executed by Playwright browser suite |
| `tests/e2e/specialist-roles.spec.ts` | Test | 2535 | `07b1b9cdebb7` | Inventoried | Executed by Playwright browser suite |
| `tests/integration/global-setup.ts` | Test | 1227 | `7b3f301ab86d` | Inventoried | Executed by unit/integration suite |
| `tests/integration/prisma-flow.test.ts` | Test | 13502 | `719c9811b657` | Inventoried | Executed by unit/integration suite |
| `tests/rate-limit.test.ts` | Test | 668 | `7d9db9c62910` | Inventoried | Executed by unit/integration suite |
| `tests/recruitment-scoring.test.ts` | Test | 1245 | `792139013432` | Inventoried | Executed by unit/integration suite |
| `tests/setup.ts` | Test | 517 | `218458bc4e4e` | Inventoried | Executed by unit/integration suite |
| `tests/state-machine.test.ts` | Test | 2245 | `6c950330f1f5` | Inventoried | Executed by unit/integration suite |
| `tests/tokens.test.ts` | Test | 1092 | `81e0e07403d2` | Inventoried | Executed by unit/integration suite |
| `tests/validation.test.ts` | Test | 1604 | `0a164001967a` | Inventoried | Executed by unit/integration suite |
| `tests/virus-scan.test.ts` | Test | 474 | `ffa195595dd6` | Inventoried | Executed by unit/integration suite |
| `tsconfig.json` | Configuration | 701 | `0aed51fd98a8` | Inventoried | Configuration/documentation review |
| `vitest.config.ts` | Configuration | 439 | `5eb6beae5845` | Inventoried | TypeScript/build or runtime script review |
| `vitest.integration.config.ts` | Configuration | 707 | `6b164c5f7147` | Inventoried | TypeScript/build or runtime script review |
