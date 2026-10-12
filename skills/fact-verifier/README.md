# fact-verifier

An evidence-based Agent Skill for checking statements, articles, URLs, and AI-generated answers. It preserves claim scope, traces source dependencies, separates verdicts from confidence, and explains what remains unverified. Responds in the user's language.

## Use

Invoke `$fact-verifier` with the content to check. The host needs a real search/browser tool for online verification; this skill does not bundle or require a specific search provider.

- **Quick:** a narrow claim or short answer request.
- **Standard:** default for articles and multiple claims, with central-claim coverage and disclosed omissions.
- **Deep:** consequential disputes, complex evidence lineage, or an explicit request for deeper checking.

All modes preserve the same evidence standard. Markdown is sufficient for a quick answer. Structured reports use Methodology / Schema **v0.3**. Numerical truth scores, publisher-score voting, and full media forensics are outside the default workflow.

## Local report validation

Node.js **24+** and npm are required only for the helper scripts. Run these commands from this skill directory:

```bash
npm ci
node scripts/validate-report.mjs report.json
node scripts/validate-report.mjs report.json --source-texts source-texts.json --json
node scripts/validate-report.mjs revised.json --previous-report original.json --strict
npm test
```

`ajv` and `ajv-formats` provide JSON Schema 2020-12 and format checks. Shared JSON input checks reject duplicate members and nonfinite numbers. The script adds ID/reference, lineage-cycle, article-count, per-claim search, review, and revision consistency checks. It never fetches URLs, follows report-supplied file paths, edits reports, or infers truth from validation success. `--source-texts` explicitly supplies an ID-to-text JSON map for literal quote comparison. Read [report-schema.md](references/report-schema.md) for diagnostic details and exit codes.

An executable **synthetic** example is included:

```bash
node scripts/validate-report.mjs evals/examples/supported-report.json --source-texts evals/examples/source-texts.json --strict
```

Its source URLs and search history are fictional fixture data, not evidence of real online access.

### v0.2 compatibility

The original v0.2 schema is retained as [report.v0.2.schema.json](references/report.v0.2.schema.json). The validator selects the schema using `methodologyVersion`; old reports receive a legacy warning and the applicable consistency checks. They do not gain v0.3 guarantees by relabeling the version. New reports need actual query IDs/outcomes, applicability fields, final review, and report identity. Preserve the old record and write a new report when migrating; do not fabricate missing metadata.

## Workflow additions in v0.3

1. Validate structured reports and the relationship among claims, evidence, sources, and queries.
2. Exercise the skill against explicit behavioral cases and review criteria.
3. Track questions, evidence sufficiency, refined searches, unresolved gaps, and stop reasons.
4. Offer evidence-backed corrections and review the completed report for unsupported synthesis.
5. Compare earlier claim scope and reopen key sources before reusing prior checks.

Detailed instructions remain in [SKILL.md](SKILL.md), [methodology.md](references/methodology.md), [verification-loop.md](references/verification-loop.md), and [revision-policy.md](references/revision-policy.md). Conditional argument and persuasion analysis remain separate from fact verdicts.

## Behavioral evaluation

[evals/cases.jsonl](evals/cases.jsonl) contains synthetic cases with provisional expected verdicts and review findings. They cover ordinary verification, partial coverage, attribution, satire, statistics, dates, provenance, access failures, corrections, history, and prompt injection. **They have not been human reviewed and do not establish real-world accuracy.** Software tests check the validator, not the reasoning ability of the host agent.

Use [evals/rubric.md](evals/rubric.md) to run a blind agent evaluation and have a person review claim extraction, evidence fidelity, and uncertainty. To compare submitted case verdicts with the provisional expectations:

```bash
node scripts/evaluate-cases.mjs predictions.jsonl
```

Each prediction has `caseId`, `verdicts` (an object mapping expected claim IDs to verdicts), and optional `notes`. The script reports matches, disagreements, missing cases/claims and extra claims, with nonzero exit on disagreement or incomplete coverage. It does not score the free-text reasoning or certify the expectations. Never report these results as calibrated truth probabilities.

## Design references and attribution

The following four Skills informed this revision; links were reviewed on **2026-10-12**. Workflow ideas were adapted to this project's evidence policy. The report schema, Node.js implementation, and synthetic cases were written for this repository; third-party code or documentation was not copied wholesale.

| Reference                                                                                                                                     | Adopted ideas                                                                                                                                       | Deliberate differences                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [petar-nauka/fact-check-skill](https://github.com/petar-nauka/fact-check-skill/blob/main/SKILL.md)                                            | Evidence ledger, selectable depth, executable output validation, explicit corrections.                                                              | Keep verdict, evidence quality and confidence separate; do not adopt its weighted MFS. HTML rendering is deferred.                                            |
| [jwynia/agent-skills — fact-check](https://github.com/jwynia/agent-skills/blob/main/skills/general/research/verification/fact-check/SKILL.md) | Separate verification/review step after composition; check fabrication, attribution and temporal drift.                                             | A separate pass is a useful work pattern, not proof that the model can reliably find every error.                                                             |
| [analystacademy/claude-skills — factcheck](https://github.com/analystacademy/claude-skills/blob/main/factcheck/SKILL.md)                      | Quick / Standard / Deep modes and actionable replacement sentences.                                                                                 | Infer the default mode; no mandatory tier prompt, fixed search count, or verdict based on viral popularity.                                                   |
| [ASI2030/Fact-Check-X](https://github.com/ASI2030/Fact-Check-X/blob/main/README.en.md)                                                        | Preserve original AI answers/citations, compare atomic claims, distinguish source fidelity from authoritative verification, retain audit artifacts. | Keep `unverified` distinct from fabricated or misleading; no mandatory stage confirmations, platform account setup, or specific commercial search dependency. |

The existing methodology also cites the [IFCN Code of Principles](https://ifcncodeofprinciples.poynter.org/the-commitments). The project's verdict labels and report contract are its own design, not an IFCN scoring system.
