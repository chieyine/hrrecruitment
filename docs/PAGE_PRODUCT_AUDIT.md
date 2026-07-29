# FRAD Recruitment page product audit

Last reviewed: 29 July 2026

This is the route-level product decision record. It is deliberately separate from
`COMPLETE_FILE_AUDIT.md`: an inventory proves that a file exists; this review
asks whether each page earns its place in the product.

## Standard applied

Every retained page must:

- give the user one obvious next action;
- use the language of the task, not system or governance jargon;
- show only controls the signed-in role can use;
- keep sensitive information out of panels, selectors and unrelated roles;
- preserve a clear record of material decisions;
- work on a small screen and with keyboard navigation;
- use restrained FRAD typography, spacing and colour instead of decorative
  dashboard cards.

`Keep` means the task deserves a page. `Merge` means the route remains only as a
safe redirect. `Support` means a focused editor reached from a parent page; it
does not belong in primary navigation.

## Public and account pages

| Route                       | Decision                 | Product purpose                                 |
| --------------------------- | ------------------------ | ----------------------------------------------- |
| `/`                         | Merge → `/careers`       | One public entry point                          |
| `/careers`                  | Keep                     | Search and compare open roles                   |
| `/careers/[reference]`      | Keep                     | Read the complete role and start an application |
| `/guidance`                 | Keep                     | Explain the real selection process              |
| `/recruitment-process`      | Merge → `/guidance`      | Remove duplicate guidance                       |
| `/recruitment-faq`          | Keep                     | Candidate help, adjustments and fraud warnings  |
| `/complaints`               | Keep                     | Raise a recruitment concern                     |
| `/report-fraud`             | Keep                     | Report fee requests and impersonation           |
| `/report-recruitment-fraud` | Merge → `/report-fraud`  | Remove duplicate reporting route                |
| `/public/reference/[token]` | Keep                     | Secure, single-purpose referee response         |
| `/privacy`                  | Keep                     | Recruitment privacy notice                      |
| `/terms`                    | Keep                     | Service terms                                   |
| `/auth/login`               | Keep                     | Sign in                                         |
| `/login`                    | Merge → `/auth/login`    | Compatibility route                             |
| `/auth/register`            | Keep                     | Create a reusable candidate account             |
| `/register`                 | Merge → `/auth/register` | Compatibility route                             |
| `/forgot-password`          | Keep                     | Request password reset                          |
| `/reset-password`           | Keep                     | Set a new password                              |
| `/verify-email`             | Keep                     | Confirm account email                           |

## Candidate pages

| Route                                          | Decision                          | Product purpose                                                     |
| ---------------------------------------------- | --------------------------------- | ------------------------------------------------------------------- |
| `/candidate/dashboard`                         | Keep                              | Plain-language home with the next important action                  |
| `/candidate/tasks`                             | Keep                              | Single queue for assessments, interviews, offers and starting steps |
| `/candidate/applications`                      | Keep                              | All applications and their current state                            |
| `/candidate/applications/apply`                | Keep                              | Autosaved, review-before-submit application                         |
| `/candidate/applications/[id]`                 | Keep                              | One complete application activity record                            |
| `/candidate/applications/[id]/receipt`         | Support                           | Printable proof of submission                                       |
| `/candidate/assessments`                       | Merge → `/candidate/tasks`        | No separate assessment inbox                                        |
| `/candidate/assessments/[id]`                  | Keep                              | Focused assessment-taking surface                                   |
| `/candidate/interviews`                        | Keep                              | Interview time, venue and attendance actions                        |
| `/candidate/messages`                          | Keep                              | Application-linked conversations                                    |
| `/candidate/offers`                            | Merge → `/candidate/applications` | Offers belong to the application                                    |
| `/candidate/offers/[id]`                       | Keep                              | View the issued PDF, terms and recorded response                    |
| `/candidate/preboarding`                       | Keep                              | “Before you start” progress and next action                         |
| `/candidate/preboarding/documents`             | Support                           | Submit requested evidence and view the accepted version             |
| `/candidate/preboarding/policies`              | Support                           | Read the official PDF and acknowledge its version                   |
| `/candidate/preboarding/courses`               | Support                           | Complete modules, assessment and recorded learning evidence         |
| `/candidate/preboarding/forms`                 | Support                           | Complete assigned starter forms                                     |
| `/candidate/preboarding/meetings`              | Support                           | See scheduled starter meetings                                      |
| `/candidate/preboarding/reporting-information` | Support                           | First-day location and reporting details                            |
| `/candidate/preboarding/tasks`                 | Support                           | Complete exceptional tasks not covered elsewhere                    |
| `/candidate/profile`                           | Keep                              | Reusable CV-style candidate record and readiness                    |
| `/candidate/profile/personal`                  | Support                           | Edit identity and contact details                                   |
| `/candidate/profile/education`                 | Support                           | Edit education history                                              |
| `/candidate/profile/employment`                | Support                           | Edit employment history                                             |
| `/candidate/profile/licences`                  | Support                           | Edit licences and memberships                                       |
| `/candidate/profile/documents`                 | Support                           | Maintain reusable application documents                             |
| `/candidate/settings`                          | Keep                              | Security, notifications, future-role consent and privacy            |
| `/candidate/accommodations`                    | Keep                              | Privately request and track an adjustment                           |
| `/candidate/complaints`                        | Keep                              | Track concerns raised by the candidate                              |

## Recruitment and HR pages

| Route                                      | Decision                                     | Product purpose and owner                                       |
| ------------------------------------------ | -------------------------------------------- | --------------------------------------------------------------- |
| `/recruitment/dashboard`                   | Keep                                         | Role-aware home; officer work first                             |
| `/recruitment/work`                        | Keep                                         | Officer/team queue ordered by attention required                |
| `/recruitment/operations`                  | Merge → `/recruitment/work`                  | Remove duplicate queue                                          |
| `/recruitment/search`                      | Keep                                         | Find a candidate, application or vacancy                        |
| `/recruitment/vacancies`                   | Keep                                         | Vacancy register                                                |
| `/recruitment/vacancies/new`               | Keep                                         | Officer/manager creates a draft                                 |
| `/recruitment/vacancies/[id]`              | Keep                                         | Vacancy record, history and allowed actions                     |
| `/recruitment/vacancies/[id]/edit`         | Support                                      | Edit a vacancy before approval/opening                          |
| `/recruitment/vacancies/[id]/applications` | Support                                      | Vacancy-specific applicant list                                 |
| `/recruitment/applications`                | Keep                                         | Recruitment-wide application register                           |
| `/recruitment/applications/[id]`           | Keep                                         | Evidence, screening, decisions and case history                 |
| `/recruitment/applications/[id]/handover`  | Support                                      | Controlled employee-system handover after readiness             |
| `/recruitment/assessments`                 | Keep                                         | Create, schedule and monitor assessments                        |
| `/recruitment/interviews`                  | Keep                                         | Schedule panels and complete interview work                     |
| `/recruitment/selections`                  | Keep                                         | Compare final evidence and recommend an outcome                 |
| `/recruitment/approvals`                   | Keep                                         | Assigned independent decisions; never self-approval             |
| `/recruitment/offers`                      | Keep                                         | Officer prepares; assigned approver decides; officer issues PDF |
| `/recruitment/references`                  | Keep                                         | Request, remind and review references                           |
| `/recruitment/preboarding`                 | Keep                                         | New-starter readiness register                                  |
| `/recruitment/preboarding/[id]`            | Keep                                         | Officer manages items; HR manager waives or clears              |
| `/recruitment/communications`              | Keep                                         | Candidate conversations and delivery failures                   |
| `/recruitment/accommodations`              | Keep                                         | Restricted HR adjustment record; manager decides                |
| `/recruitment/complaints`                  | Keep                                         | Restricted complaint casework                                   |
| `/recruitment/talent-pools`                | Keep                                         | Consent-based future-role lists                                 |
| `/recruitment/quality`                     | Keep                                         | Exceptions and decision checks, not decorative analytics        |
| `/recruitment/reports`                     | Keep                                         | Insights, downloads and scheduled reports in one page           |
| `/recruitment/insights`                    | Merge → `/recruitment/reports?view=overview` | Remove duplicate reporting page                                 |
| `/recruitment/audit`                       | Keep                                         | Searchable audit evidence for authorised roles                  |
| `/recruitment/settings`                    | Keep                                         | Staff account security only                                     |

## Recruitment setup and technical administration

These pages are intentionally utilitarian. A global product does not make every
reference-data editor look like a marketing page; it makes the editor consistent,
fast, legible and hard to misuse.

| Route                           | Decision                          | Product purpose and owner                                    |
| ------------------------------- | --------------------------------- | ------------------------------------------------------------ |
| `/admin/departments`            | Keep                              | HR manager maintains recruitment departments                 |
| `/admin/projects`               | Keep                              | HR manager maintains funded projects                         |
| `/admin/duty-stations`          | Keep                              | HR manager maintains work locations                          |
| `/admin/vacancy-categories`     | Keep                              | HR manager maintains job families                            |
| `/admin/contract-types`         | Keep                              | HR manager maintains engagement types                        |
| `/admin/scorecards`             | Keep                              | HR manager versions selection criteria                       |
| `/admin/assessment-bank`        | Merge → `/recruitment/vacancies`  | Questions belong to a vacancy workflow                       |
| `/admin/interview-questions`    | Merge → `/recruitment/interviews` | Questions belong to interview setup                          |
| `/admin/templates`              | Keep                              | HR manager versions offer wording                            |
| `/admin/notification-templates` | Keep                              | HR manager versions candidate notices                        |
| `/admin/preboarding-packages`   | Keep                              | HR manager assembles starter requirements                    |
| `/admin/document-requirements`  | Keep                              | HR manager defines evidence rules                            |
| `/admin/document-types`         | Keep                              | HR manager defines reusable document types                   |
| `/admin/forms`                  | Keep                              | HR manager versions starter forms                            |
| `/admin/policies`               | Keep                              | HR manager publishes official policy PDFs                    |
| `/admin/tasks`                  | Keep                              | HR manager maintains exceptional starter tasks               |
| `/admin/courses`                | Keep                              | Course administrator versions learning and quizzes           |
| `/admin/configuration-releases` | Keep                              | HR manager/course admin reviews and publishes changes        |
| `/admin/automations`            | Keep                              | Recruitment manager controls business automations            |
| `/admin/fraud-reports`          | Keep                              | Recruitment team triages suspected fraud                     |
| `/admin/users`                  | Keep                              | System administrator manages accounts                        |
| `/admin/roles`                  | Keep                              | System administrator manages technical roles                 |
| `/admin/permissions`            | Keep                              | System administrator inspects permission definitions         |
| `/admin/system-settings`        | Keep                              | System administrator checks platform readiness and secrets   |
| `/admin/deletion-requests`      | Keep                              | Privacy role handles deletion decisions                      |
| `/admin/governance`             | Keep                              | Privacy/security role handles legal holds and access reviews |
| `/admin/operating-model`        | Keep                              | Read-only explanation of role ownership                      |

## Document and learning decisions

### Offers

The candidate sees the exact issued PDF inside the offer page and can download
it. The PDF carries FRAD letterhead, a reference, issue date, candidate name,
offer wording, key terms, conditions, deadline and page numbering. Staff can
open the same stored PDF from the offer register. A rendered HTML approximation
is not treated as the official offer.

### Starting documents

FRAD policies are official, versioned PDFs viewed in the service before
acknowledgement. Candidate-supplied documents retain their original file,
review status, expiry where relevant and replacement history. Forms that need
structured answers remain web forms because they are easier to validate and
report than uploaded scans.

### Courses

FRAD-owned courses should be delivered inside the service. Each module records
completion against the candidate assignment, and the final assessment stays
locked until every module is complete. Quiz attempts, pass mark and completion
time provide stronger evidence than an uploaded file.

An uploaded certificate remains an exception for training hosted by an external
provider. An upload proves possession of a certificate, not that the person
watched or understood the material. For high-risk training, add identity
reconfirmation and a meaningful assessment; passive video tracking alone is not
proof of attention.
