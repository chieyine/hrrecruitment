# UI/UX and copy review

Status: 24 July 2026

## Outcome

The interface now uses a consistent, restrained design system across public,
candidate, recruitment and administration areas. Copy is written as practical
guidance: it tells the reader what happened, what they can do, and what happens
next. A repository-wide check found no common synthetic marketing phrases in
user-facing React pages.

## Shared experience

- A consistent page shell, introduction, section, form, status, empty-state,
  button and table language is defined in `src/app/globals.css` and
  `src/components/ui/PageElements.tsx`.
- The header understands signed-in state and the current route. Public,
  candidate and staff navigation use plain labels and visible active states.
- The administration navigation is grouped by the way staff work:
  organisation, recruitment, preboarding, communication and control.
- Dialogs trap and restore focus; toasts use live regions; keyboard focus is
  visible; reduced-motion preferences are respected.
- Mobile navigation and layouts are covered by the Playwright mobile projects.

## Candidate experience

- The account dashboard prioritises live applications and actions instead of
  decorative cards.
- The application form has a required-item checklist, honest autosave state,
  offline local recovery, review-before-submit and a printable receipt.
- Drafts are always labelled as drafts and submitted applications cannot be
  mistaken for editable drafts.
- Account settings explain mandatory recruitment updates separately from the
  optional talent-pool choice.
- Notifications, privacy choices, complaints and fraud reporting use direct,
  calm language and clear confirmations.
- Privacy, terms, guidance and FAQs have been rewritten in plain language.

## Staff experience

- The applications workspace has useful search, stage filters, saved views,
  record counts, selection controls, safe bulk-stage previews and a predictable
  table layout.
- Search now includes candidate email and vacancy reference at the API as well
  as in the interface.
- The recruitment dashboard emphasises workload and current pipeline state.
- The audit trail translates internal event names into readable activity,
  combines record type and identifier, and distinguishes missing reasons.
- Candidate 360 shows the current case position, answers, milestone evidence,
  chronological history and controlled case-file downloads in one workspace.
- My Work separates overdue, due-today, urgent and blocked exceptions and
  materialises missing assessment marks, panel scores, preboarding items and
  offer responses.
- System settings include a deployment-readiness view without exposing secret
  values, plus message-delivery and scheduler health.
- Configuration lists have search, counts, accessible empty states and clearer
  dependency warnings.
- The quality view identifies possible duplicate candidates for controlled
  human review; it never merges records automatically.

## Intentionally sober visual direction

The product avoids oversized gradients, excessive rounded cards, invented
metrics, vague slogans and decorative motion. Colour communicates status or
navigation, while typography, spacing and borders carry the hierarchy. This is
appropriate for a recruitment system handling consequential decisions.

## Verification

Run:

```text
npx tsc --noEmit
npm run lint
npm test
npm run test:integration
npm run build
npm run test:e2e
```

External assistive-technology sessions and testing against FRAD's production
services remain deployment acceptance work, not claims made by this local UI
review.
