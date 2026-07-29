-- Install and align the built-in operating roles.
-- Recruitment officers run daily work; HR managers make exceptions and
-- approvals; system administrators remain in the technical control plane.

INSERT INTO "Role" ("id", "name", "description")
VALUES
  ('builtin-role-public', 'PUBLIC', 'Public visitor'),
  ('builtin-role-candidate', 'CANDIDATE', 'Job applicant and preboarding candidate'),
  (
    'builtin-role-recruitment-officer',
    'RECRUITMENT_OFFICER',
    'HR recruitment officer managing vacancies and candidates'
  ),
  ('builtin-role-hr-manager', 'HR_MANAGER', 'HR manager approving vacancies, offers and waivers'),
  (
    'builtin-role-hiring-manager',
    'HIRING_MANAGER',
    'Hiring manager reviewing assigned candidates and panels'
  ),
  ('builtin-role-panel-member', 'PANEL_MEMBER', 'Interview panel scoring member'),
  ('builtin-role-referee', 'REFEREE', 'External referee completing reference checks'),
  ('builtin-role-approver', 'APPROVER', 'Executive approver'),
  ('builtin-role-course-admin', 'COURSE_ADMIN', 'Preboarding course administrator'),
  ('builtin-role-system-admin', 'SYSTEM_ADMIN', 'System administrator'),
  ('builtin-role-auditor', 'AUDITOR', 'Read-only compliance auditor')
ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "code", "description")
VALUES
  ('builtin-permission-wildcard', '*', 'Legacy wildcard; not assigned to built-in roles'),
  ('builtin-permission-vacancy-create-all', 'vacancy.create.all', 'Create vacancies'),
  ('builtin-permission-vacancy-read-all', 'vacancy.read.all', 'Read all vacancies'),
  (
    'builtin-permission-vacancy-read-assigned',
    'vacancy.read.assigned',
    'Read vacancies owned by or assigned to the user'
  ),
  ('builtin-permission-vacancy-update-all', 'vacancy.update.all', 'Update vacancies'),
  (
    'builtin-permission-application-read-assigned',
    'application.read.assigned',
    'Read assigned applications'
  ),
  ('builtin-permission-application-read-all', 'application.read.all', 'Read all applications'),
  (
    'builtin-permission-application-stage-change',
    'application.stage.change',
    'Change application stage'
  ),
  ('builtin-permission-scorecard-submit', 'scorecard.submit', 'Submit scorecards'),
  (
    'builtin-permission-scorecard-reopen',
    'scorecard.reopen',
    'Reopen submitted scorecards with a reason'
  ),
  ('builtin-permission-assessment-manage', 'assessment.manage', 'Manage assessments'),
  ('builtin-permission-interview-manage', 'interview.manage', 'Manage interviews'),
  (
    'builtin-permission-interview-score-assigned',
    'interview.score.assigned',
    'Score interviews assigned to the user'
  ),
  ('builtin-permission-reference-manage', 'reference.manage', 'Manage reference checks'),
  ('builtin-permission-offer-manage', 'offer.manage', 'Manage offers'),
  ('builtin-permission-preboarding-manage', 'preboarding.manage', 'Manage preboarding'),
  (
    'builtin-permission-preboarding-clearance',
    'preboarding.clearance',
    'Issue final preboarding clearance'
  ),
  ('builtin-permission-resumption-confirm', 'resumption.confirm', 'Confirm actual resumption'),
  ('builtin-permission-course-manage', 'course.manage', 'Manage course content and enrolment'),
  (
    'builtin-permission-preboarding-restricted-read',
    'preboarding.restricted.read',
    'Read restricted bank, pension, medical, accessibility and next-of-kin forms'
  ),
  ('builtin-permission-erp-transfer', 'erp.transfer', 'Record ERP transfer'),
  ('builtin-permission-admin-manage', 'admin.manage', 'Administer configuration'),
  ('builtin-permission-audit-read', 'audit.read', 'Read audit logs'),
  (
    'builtin-permission-report-export',
    'report.export',
    'Export recruitment and preboarding reports'
  ),
  (
    'builtin-permission-complaint-manage',
    'complaint.manage',
    'Manage restricted complaints and case records'
  ),
  (
    'builtin-permission-governance-manage',
    'governance.manage',
    'Manage legal holds, retention and access reviews'
  )
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";

-- Remove the historical administrator wildcard before installing explicit
-- control-plane grants.
DELETE FROM "RolePermission"
WHERE "roleId" IN (SELECT "id" FROM "Role" WHERE "name" = 'SYSTEM_ADMIN')
  AND "permissionId" IN (SELECT "id" FROM "Permission" WHERE "code" = '*');

WITH policy ("roleName", "permissionCode") AS (
  VALUES
    ('SYSTEM_ADMIN', 'admin.manage'),
    ('SYSTEM_ADMIN', 'audit.read'),
    ('SYSTEM_ADMIN', 'governance.manage'),
    ('HR_MANAGER', 'vacancy.create.all'),
    ('HR_MANAGER', 'vacancy.read.all'),
    ('HR_MANAGER', 'vacancy.update.all'),
    ('HR_MANAGER', 'application.read.all'),
    ('HR_MANAGER', 'application.stage.change'),
    ('HR_MANAGER', 'scorecard.submit'),
    ('HR_MANAGER', 'scorecard.reopen'),
    ('HR_MANAGER', 'assessment.manage'),
    ('HR_MANAGER', 'interview.manage'),
    ('HR_MANAGER', 'reference.manage'),
    ('HR_MANAGER', 'offer.manage'),
    ('HR_MANAGER', 'preboarding.manage'),
    ('HR_MANAGER', 'preboarding.clearance'),
    ('HR_MANAGER', 'resumption.confirm'),
    ('HR_MANAGER', 'preboarding.restricted.read'),
    ('HR_MANAGER', 'erp.transfer'),
    ('HR_MANAGER', 'audit.read'),
    ('HR_MANAGER', 'report.export'),
    ('HR_MANAGER', 'complaint.manage'),
    ('HR_MANAGER', 'governance.manage'),
    ('RECRUITMENT_OFFICER', 'vacancy.create.all'),
    ('RECRUITMENT_OFFICER', 'vacancy.read.all'),
    ('RECRUITMENT_OFFICER', 'vacancy.update.all'),
    ('RECRUITMENT_OFFICER', 'application.read.all'),
    ('RECRUITMENT_OFFICER', 'application.stage.change'),
    ('RECRUITMENT_OFFICER', 'scorecard.submit'),
    ('RECRUITMENT_OFFICER', 'assessment.manage'),
    ('RECRUITMENT_OFFICER', 'interview.manage'),
    ('RECRUITMENT_OFFICER', 'interview.score.assigned'),
    ('RECRUITMENT_OFFICER', 'reference.manage'),
    ('RECRUITMENT_OFFICER', 'offer.manage'),
    ('RECRUITMENT_OFFICER', 'preboarding.manage'),
    ('RECRUITMENT_OFFICER', 'resumption.confirm'),
    ('RECRUITMENT_OFFICER', 'erp.transfer'),
    ('RECRUITMENT_OFFICER', 'complaint.manage'),
    ('HIRING_MANAGER', 'vacancy.read.assigned'),
    ('HIRING_MANAGER', 'application.read.assigned'),
    ('HIRING_MANAGER', 'scorecard.submit'),
    ('HIRING_MANAGER', 'interview.manage'),
    ('HIRING_MANAGER', 'interview.score.assigned'),
    ('PANEL_MEMBER', 'application.read.assigned'),
    ('PANEL_MEMBER', 'interview.score.assigned'),
    ('COURSE_ADMIN', 'course.manage'),
    ('AUDITOR', 'vacancy.read.all'),
    ('AUDITOR', 'application.read.all'),
    ('AUDITOR', 'audit.read'),
    ('AUDITOR', 'report.export')
)
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT
  'builtin-role-permission-' || LOWER(REPLACE(policy."roleName", '_', '-')) || '-' ||
    REPLACE(policy."permissionCode", '.', '-'),
  role."id",
  permission."id"
FROM policy
JOIN "Role" AS role ON role."name" = policy."roleName"
JOIN "Permission" AS permission ON permission."code" = policy."permissionCode"
ON CONFLICT DO NOTHING;
