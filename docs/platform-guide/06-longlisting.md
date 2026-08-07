# 6. Longlisting

Longlisting decides who is *eligible*. Shortlisting, later, decides who is *best*. Keeping those separate is what lets the first be automatic and the second stay human.

## 6.1 Rule types

Eighteen rule types are available, covering every criterion the specification calls for.

| Rule | What it evaluates |
| --- | --- |
| Minimum academic qualification | Highest qualification held, compared on a rank ladder |
| Required field of study | Field of study across all education entries |
| Minimum years of experience | Total employment, overlaps merged |
| Minimum NGO experience | Employment at recognisably humanitarian organisations |
| Minimum technical experience | Employment matching configured keywords in title or duties |
| Minimum management experience | Employment indicating supervisory responsibility |
| Required professional licence | Verified, unexpired licences |
| Required certification | Current certifications |
| Required language | Language at or above a configured level |
| Required computer skill | Skill at or above a configured proficiency |
| Required sector experience | Sector signals across employer, title and duties |
| Duty-station acceptance | Relocation willingness or stated location preferences |
| Work authorisation | Right to work |
| Availability before a date | Earliest start date |
| Willingness to travel | A specific application answer |
| Mandatory document | Documents supplied |
| Mandatory question | A question was answered at all |
| Specific answer | An answer compared with equals, in, contains, true, at-least, at-most, before or after |

## 6.2 Rule classification

Each rule is marked with how it behaves when unmet. This is the difference between a criterion that disqualifies and one that merely informs.

| Classification | Effect |
| --- | --- |
| Mandatory knockout | Failure makes the applicant automatically ineligible |
| Scored | Contributes a weighted score; never disqualifies |
| Preferred | Recorded for the shortlist; never affects the longlist |
| Informational | Captured for reporting only |

## 6.3 Four outcomes per rule, not two

Every rule returns one of four results:

- **Met** — the requirement is satisfied
- **Not met** — it demonstrably is not
- **Unclear** — the evidence does not settle it
- **Not applicable** — the rule does not apply to this application

*Unclear* is the important one, and it is what makes the engine safe. Examples of where it is returned rather than a rejection:

- A qualification the ladder does not recognise, such as a foreign award — this is the "equivalent qualification" case a human must decide
- A licence that is held but not yet verified
- A certification held but expired
- A candidate who stated no location preference at all
- A skill claimed with no stated proficiency
- Any rule type the engine does not recognise

An unrecognised rule type never silently passes an applicant. It produces *unclear* and goes to a human.

## 6.4 How an application is placed

```
Is the application complete?  -- no -->  INCOMPLETE_APPLICATION
       | yes
       v
Is it a second application from the same candidate?  -- yes -->  DUPLICATE_APPLICATION
       | no
       v
Did any mandatory knockout return NOT MET?  -- yes -->  AUTOMATICALLY_INELIGIBLE
       | no                                              (deciding rule recorded)
       v
Did any mandatory knockout return UNCLEAR?  -- yes -->  REQUIRES_REVIEW
       | no                                              (deciding rule recorded)
       v
Are there any mandatory rules at all?  -- no -->  REQUIRES_REVIEW
       | yes
       v
AUTOMATICALLY_ELIGIBLE
```

^ Figure 4. Precedence is deliberate: a definite failure outranks an unclear result, and an empty rule set can never make anyone automatically eligible.

Preferred and informational rules never change the outcome. A scored rule contributes to the eligibility score but cannot disqualify.

## 6.5 The eligibility score

Where scored rules are configured, the platform computes an eligibility score as the weighted sum of those that were met, alongside the maximum available. Where none are configured the score is reported as absent rather than as zero, because those mean different things.

## 6.6 Running a longlist

A run may be triggered manually, on deadline close, or as a re-run. It requires at least one mandatory rule and a published vacancy — running against a draft would evaluate nothing while implying a result.

The run:

1. Supersedes any earlier unconfirmed run, so only one proposal is ever live
2. Snapshots the rule set, making the run reproducible
3. Identifies duplicate candidates with a single grouped query
4. Evaluates every application in cursor-paged batches, writing results in bulk per page
5. Records, for each application, the per-rule outcomes, the score, and the rule that decided it
6. Produces the summary

A single unparseable application is recorded as requiring review rather than abandoning the run — the safe direction.

## 6.7 The summary

| Counter | Meaning |
| --- | --- |
| Total applications | Everything not still in draft |
| Complete / incomplete | Whether mandatory documents and answers were supplied |
| Automatically eligible | Cleared every mandatory rule |
| Automatically ineligible | Failed at least one |
| Requires review | At least one mandatory rule was unclear |
| Duplicates | A second application from the same candidate |
| Reason distribution | Count per rule, so the most common blocker is visible |

The reason distribution is the most useful number in the platform for improving a vacancy: if one rule accounts for eighty percent of rejections, either the criterion or its wording is wrong.

## 6.8 The exception queue

Reviewers see only what the engine could not settle. For each, the queue shows every rule with what was expected, what was found and the outcome, with the deciding rule highlighted.

A decision requires:

- One of three outcomes: eligible, not eligible, or more information needed
- An approved **reason code**, not free text alone
- A written justification of at least ten characters
- Supporting evidence, where the reason code asserts a fact the engine could not see

| Reason code | Evidence required | Approval required |
| --- | --- | --- |
| Equivalent qualification | Yes | Yes |
| Equivalent experience | Yes | No |
| Missing document since received | Yes | No |
| Approved policy exception | Yes | Yes |
| Data entry corrected | No | No |
| System parsing error | No | No |
| Reasonable accommodation | No | No |
| Duplicate resolved | No | No |

## 6.9 Overrides

Resolving an *unclear* case is ordinary review work. **Reversing a definite automatic outcome is not** — turning an automatically ineligible applicant into an eligible one, or the reverse, requires override authority held by the HR Manager.

The original automatic result is written once, at evaluation time, and is never modified. An override sits alongside it. Both are shown in the queue and in the exceptions report, so it is always possible to see what the rules said and what a human decided instead.

## 6.10 Rule locking

Before publication, rules are freely editable and every change is audited.

After publication they lock. A change becomes a proposal that:

- Requires HR Manager approval, from someone other than the person proposing it
- Records the complete before and after
- Records how many applications existed at the time
- **Triggers a mandatory fairness review** if that count is above zero, and the approval cannot complete without a written fairness note

Adding an entirely new rule after publication is refused outright — that is a different vacancy, and it should be one.

## 6.11 Confirming the longlist

Confirmation is what produces the longlist. Until then the outcome is a proposal and no application has moved.

The platform refuses to confirm while any exception remains undecided. On confirmation it moves each application to the stage its outcome implies, respecting any human decision that overrode the automatic one, and never dragging an application backwards out of a later stage it has since reached.

The confirmation is signed by the HR Manager, inside the same transaction as the stage changes. If the signature cannot be written, none of the moves happen either. There is no state in which a longlist exists without a signed approval behind it.
