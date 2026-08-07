# 7. Shortlisting, assessment and interviews

## 7.1 Shortlisting

Longlisting established eligibility. Shortlisting compares eligible applicants against one another using a weighted matrix defined before applications arrived.

Each criterion carries a definition, the evidence expected, a weight, a maximum score, a minimum acceptable score, and space for the reviewer's score and comment. Criterion weights must total 100 — the platform blocks publication otherwise, because a matrix that does not sum produces scores that cannot be compared.

The reviewer process supports one or more reviewers per candidate, independent scoring, candidate assignment, reviewer deadlines, conflict-of-interest declarations, score variance alerts where reviewers diverge sharply, a consolidated score, and final approval.

Controls: reviewers cannot change longlisting rules; they may score only eligible candidates; scores lock on submission; a change afterwards requires a reason and preserves every prior version.

## 7.2 Anonymised review

A vacancy may be configured to hide identifying information during early review. HR chooses which fields, per vacancy:

Name, photograph, gender, age and date of birth, address, nationality, religion, marital status, contact details, institution names.

Where the name is hidden, reviewers see a **stable alias** — "Candidate 7C3A" — derived from the application reference, so it stays consistent across screens and between sessions and colleagues can discuss a candidate without knowing who they are.

Three properties make this trustworthy:

- **Redaction happens on the server**, before the data is serialised. A value the browser never receives cannot be revealed by inspecting the page.
- **Free text is scrubbed too.** A motivation statement that names the candidate, or contains their email or phone number, is redacted — otherwise the whole exercise fails on the first personal statement.
- **It fails closed.** If the configuration is unreadable, the platform hides the full default set rather than revealing everything.

Anonymisation applies to screening and shortlisting only. Once a candidate reaches interview, references or offer, identity is unavoidable and hiding it would obstruct the process rather than reduce bias.

## 7.3 Assessments

Ten assessment types are supported: written tests, technical tests, case studies, presentations, practical tests, computer tests, language tests, driving tests, data exercises and clinical scenarios.

Each assessment carries instructions, a time limit, candidate-specific links, a question bank, file-upload tasks, pass marks, reviewer assignment, late-submission rules and accommodation settings. Objective questions can score automatically; everything else is marked with recorded evidence.

Timed assessments auto-save as the candidate works and auto-submit at expiry, so a lost connection near the deadline does not lose the attempt. Attempt resets require a reason and are audited.

Results lock on submission and require approval before they influence ranking.

## 7.4 Question and assessment banks

HR maintains a controlled bank of eligibility questions, longlisting questions, technical test questions, competency questions, safeguarding questions, interview questions, scoring guides and model answers.

The bank supports categories, difficulty levels, job families, version control, restricted access, random selection, reuse across vacancies, and review and expiry dates — so a question set does not silently age into irrelevance.

## 7.5 Interviews

Six formats: panel, technical, competency, final, remote and physical.

The flow covers panel nomination and approval, conflict declarations, candidate scheduling, calendar invitations, reminders, the interview guide, standard and technical and competency questions, a mandatory safeguarding question, the scoring rubric, independent scoring, the consolidated result and the panel recommendation.

```note
**Panel members cannot see one another's scores until all required scores are submitted.** This is the single most important control in the interview stage, and it is enforced server-side rather than by hiding a column in the interface.
```

A submitted scorecard locks. Reopening one requires the reopen permission and a recorded reason, and the prior version is retained.

## 7.6 Scheduling and calendar integration

The platform integrates with Microsoft Outlook and Teams, Google Calendar and Meet, and Zoom, through OAuth with PKCE. Each provider reports itself unavailable until an administrator configures its credentials, rather than failing at the point a user tries to connect.

Once connected, the platform can:

- Read free/busy time to establish panel availability
- Propose interview slots where the panel is genuinely free
- Create the calendar event and provision the meeting link
- Send invitations, reminders and reschedule notices
- Record attendance confirmation

Slot proposal respects the **vacancy's own time zone**, not the server's or the coordinator's. Working hours and weekends are evaluated in that zone, so a Friday-evening slot in one country is not proposed as a Saturday-morning slot in another. Daylight saving is handled correctly because offsets are resolved per date rather than assumed.

Panel members who declared explicit availability windows are only offered within them; those who declared nothing are treated as open. Slots are ranked by how much of the panel can attend, then by earliest.

Tokens are sealed with AES-256-GCM before storage and refreshed lazily on read. The PKCE verifier is sealed the same way.

## 7.7 Ranking and recommendation

Approved stage scores are combined by configured weights — for example shortlisting 20 percent, written test 30 percent, interview 50 percent.

The ranking shows each candidate's stage scores, weighted total, rank, pass or fail status, the panel recommendation, and any disqualification reason. It identifies a preferred candidate and a reserve.

**Where the highest-ranked candidate is not the one recommended, the platform requires a written justification.** That justification appears in the selection report and is one of the first things an auditor looks for.

Selection decisions are approved through maker-checker: the person who created the recommendation cannot approve it.
