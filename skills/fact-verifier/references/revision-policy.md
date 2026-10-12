# Corrections, Final Review, and History Reuse

Read this when producing a correction, revising a previous report, checking an AI-generated answer, or reusing earlier checks.

## Evidence-backed suggested corrections

Preserve the original claim and verdict. A `suggestedCorrection` offers a replacement sentence, its reason, evidence IDs, and a `changeKind`:

- `correct`: replace a demonstrated error;
- `qualify`: restore a missing denominator, scope, uncertainty, or comparison;
- `update`: state the old and current dates or status;
- `withhold`: explain that the available material does not justify the assertion.

Show how the replacement differs from the original. Narrowing a sentence is a suggested edit, never a silent change to the verification target. Check the replacement itself against the cited evidence; do not invent a replacement number or negate an unverified claim. A `withhold` suggestion may have no evidence IDs when retrieval genuinely failed. Never edit or publish the user's original text unless that action is requested or already authorized.

For AI-generated content, keep three questions distinct: what the original answer said, whether its citations faithfully support it, and whether external evidence establishes the claim. Agreement between models is not independent factual corroboration.

## Independent final review step

After drafting, review the report with attention on verification rather than composition. This is a separate work step, not a promise that a second pass or model is infallible. A second agent is optional only when the host permits delegation and the task benefits from it.

Check:

1. Normalized claims and corrections preserve attribution, negation, quantifiers, units, dates, population, baseline, and certainty.
2. Every factual assertion in the report, including the opening and `closingSummary`, follows from inspected evidence or is clearly marked as an inference or limitation. Do not add a number, causal link, or author motive in the summary.
3. Citations lead to the exact evidence and claim; quotes are literal and summaries preserve scope. A matching quote still needs a semantic support check.
4. Repeated evidence has not become independent corroboration; unresolved conflicts and unavailable sources remain visible.
5. Article counts and unchecked items agree, and persuasion analysis follows its separate trigger.

Record `audit.finalReview` with reviewed checked-claim IDs, whether the summary was checked, status, and notes. Fix discovered errors before setting `status=complete`. An incomplete review can be saved as a draft but must be labeled incomplete. For a JSON deliverable, run `node scripts/validate_report.mjs`; interpret its warnings and correct actionable errors. Never silently auto-fill evidence or change a verdict to make validation pass.

## Revisions

Give each structured report a new `reportId`. A revision includes `revision.previousReportId`, an explanation, and `changes` recording each changed claim's old verdict, new verdict, rationale, and current evidence IDs. Keep claim IDs stable when the proposition is unchanged; describe substantive scope changes instead of pretending to compare identical claims. Retain the previous report when permitted; do not silently overwrite it.

Use `--previous-report` during validation when the prior v0.3 report is available. The validator compares shared claim IDs and verdict changes; it cannot infer semantic equivalence when IDs or propositions change. Legacy v0.2 reports lack report identities: preserve them, explain migration, and create a new v0.3 record rather than inventing missing history.

## Reuse earlier checks

Use only earlier reports actually available in the authorized workspace or supplied by the user. Do not create a hidden global history database or browse unrelated private records. Search for equivalent claims before repeating work when history is readily available; absence of a history store does not block a new check.

For each candidate, compare subject, predicate, attribution, negation, quantifiers, event time, region, population, units, and definitions. Record `historyMatches` with the earlier report/claim IDs, context comparison, and action:

- `reuse_after_recheck`: equivalent scope, key upstream material reopened and applicability checked at the current verification time;
- `recheck`: relevant but changed, stale, conflicting, or incompletely documented;
- `reject`: similar wording describes a different proposition.

A historical report is a search lead, not new independent evidence. Carry forward source lineage and access history accurately; record current retrieval dates only for sources actually reopened. If current access fails, preserve the old assessment as historical, explain the failure, and avoid claiming a fresh verified result. New evidence can change a verdict without making the earlier time-bounded assessment dishonest.
