# Production release acceptance

The source implementation is release-candidate complete when automated checks
pass. Production go-live additionally requires the following evidence and named
FRAD sign-off because code cannot supply infrastructure, policies or user
acceptance on its own.

- [ ] Product owner confirms the end-to-end vacancy-to-ERP handover scenarios.
- [ ] HR validates scorecards, approvals, offers, readiness gates and reports.
- [ ] Privacy lead approves notices, consent text, retention durations, deletion
  handling, legal-hold procedure and complaint response targets.
- [ ] Security validates OIDC/MFA, least privilege, TLS, S3/KMS policy, ClamAV,
  secrets, dependency advisories and penetration-test remediation.
- [ ] Accessibility testing covers keyboard-only use, screen reader flows, focus,
  errors, contrast and document alternatives against the agreed WCAG target.
- [ ] Operations proves monitoring, alerts, cron execution, backup restoration,
  rollback and incident escalation.
- [ ] Email domain authentication and delivery/bounce handling are verified.
- [ ] Performance/load tests use expected application and file-upload volumes.
- [ ] No seed/demo users or real data remain in the release environment.

The approved exclusions are WhatsApp delivery, multilingual pages, candidate
imports, advanced question banks, advanced/remote proctoring, and all AI
summaries. They are not release gaps. Provider-backed SMS, e-signature, and
external job-board publishing remain optional adapters. Consent-led talent
pools, calendar files, automated reference requests, complaint handling,
accommodations, and decision-quality analytics are implemented.
