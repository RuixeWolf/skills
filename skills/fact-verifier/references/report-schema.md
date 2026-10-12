# Report Fields and Presentation Rules

Use [report.schema.json](report.schema.json) for new machine-readable reports (Methodology v0.3). A conversational answer may convey the relevant information in Markdown; do not force a JSON artifact for a quick answer. Claims and articles share the model; articles additionally require `articleAssessment`. The validator recognizes legacy v0.2 using the unchanged [report.v0.2.schema.json](report.v0.2.schema.json), reports a compatibility warning, and never invents migration data.

1. At the top, present the input scope, verification date, most important claim-level verdicts, and a one-sentence rationale. For an article, lead with coverage and central issues instead of a spurious percentage for “the entire article's truth.”
2. `passages` retains brief source-text excerpts and locations. `attribution` distinguishes author assertions, quotations, denials, hypotheticals, and other forms. `claimIds` allows one passage to contain several propositions and one proposition to occur in several passages. Include selected-but-unchecked candidates in `claims` with `status=not_checked`, `verdict=null`, and a reason. Use `status=not_checkable` for opinions and other uncheckable material.
3. For `status=checked`, set a factual verdict and separate confidence rationale. Here `checked` means an assessment was made, including an offline assessment ending in `unverified`; it does not mean the claim was confirmed or online verification completed. For `not_checked`, verdict and confidence are null; for `not_checkable`, use `verdict=not_fact_checkable` and null confidence. `evidenceIds` points to individual evidence items; each item also points back to its claim and source. Keep quotations short and necessary, with a locator inside the source.
4. `sources[].derivedFrom` contains upstream source IDs; `evidence[].clusterId` identifies the upstream evidence cluster on which that particular item depends. A publisher may provide several items with different independence statuses. Never cluster merely by website domain. `originTrace` identifies only the earliest visible source found, with its caveat.
5. `arguments` records premises, assumptions, conclusion, reasoning type, and potential issues. Omit an argument entry when the source makes no explicit argument.
6. `audit.queries` records principal searches, IDs, target claims, rounds, times, purposes, outcomes, relevant source IDs, and error notes. `onlineChecked=true` means at least one search completed with `success` or `no_results`; it does not certify every claim. Failed attempts use `error` and do not qualify as completed countersearches. With no completed online search, use `onlineChecked=false` and no directional verdict.
7. `articleAssessment` gives a narrative account of what was and was not checked. Count unique atomic checkable claims; exclude composite parents. In v0.3 `unexamined` contains exactly the IDs of unchecked atomic checkable claims; their reasons and original passages remain in `claims` and `passages`. Revised reports have a new `reportId` and a `revision` record while retaining the earlier report.
8. Add `persuasionAnalysis` only when the two conditions in [persuasion-analysis.md](persuasion-analysis.md) are met, or when the user explicitly asks for neutral rhetorical analysis. State its `basis`. For each `techniques` item, link the observed passage and any related checked claims to the linguistic cue, possible psychological mechanism, and possible sharing effect. `communicativeFunction` describes what the wording could do, not the author's proven motive. `limits` makes this distinction explicit. Do not infer falsity from emotional language.
9. End every conversational report with a labeled **Analysis summary** after evidence, citations, and limitations. Make it brief and include the main outcome, checked scope, and key uncertainty; mention the strongest persuasive pattern only if analyzed. Every JSON report must populate `closingSummary`. Serialize or render it last even though JSON object member order is not semantically significant.

## v0.3 fields

| Field | Contract |
| --- | --- |
| `reportId`, `verificationMode` | Nonempty report identity and `quick | standard | deep`; give revisions a new identity. |
| `input.language` | Actual input language; preserve multilingual source languages separately. |
| `claims[].verification` | Required only for checked claims: nonempty `questions`, `rounds`, `stopReason`, `remainingGaps`. Questions have IDs, text, resolved/unresolved status, evidence IDs and query IDs. |
| `claims[].suggestedCorrection` | Optional text, reason, same-claim evidence IDs, and `correct | qualify | update | withhold`. Unverified claims may only suggest withholding. |
| `claims[].historyMatches` | Optional earlier report/claim identities, scope comparison, and `reuse_after_recheck | recheck | reject`. History never replaces fresh evidence. |
| `evidence[].contentKind` | `quote | summary`; `excerptOrSummary` remains the text field. Literal quotes can be compared with an explicitly supplied source-text map. |
| `evidence[].language`, `applicability`, `directness` | Language or null; period/region/population or null; `direct | indirect | unknown`. State unknowns instead of inventing scope. |
| `sources[].snapshot` | Optional `artifactPath` and SHA-256 metadata for a permitted saved copy. The validator never follows these paths, fetches URLs, or certifies the hash. |
| `audit.queries[]` | `id`, `claimId`, `round`, `text`, `purpose`, `searchedAt`, `outcome`, `sourceIds`; an error requires `note`. Empty/failed searches have no result source IDs. |
| `audit.finalReview` | Status, checked claim IDs, `summaryChecked`, and notes. Complete review covers every checked claim and the summary. Incomplete review is a draft warning. |
| `audit.model`, `audit.tools` | Optional known model name and tool name/version records; use null or omission for unknown versions. No hidden reasoning transcript is required. |
| `revision` | Earlier report identity, reason, and claim changes with old/new verdicts, rationale, and current evidence IDs. |

All IDs are local to their respective collections. Reference them exactly. Use `parentClaimId` for an actual retained composite claim; do not point to a nonexistent original. Every article candidate needs an original passage. Source dependencies and claim-parent relationships must be acyclic. Evidence must appear in its target claim's `evidenceIds`; question and correction references must belong to that claim.

See [verification-loop.md](verification-loop.md) for rounds, resolved questions, and stopping semantics; see [revision-policy.md](revision-policy.md) for corrections and review. A completed countersearch is required per checked claim before a directional verdict. An unverified claim with failed or unavailable countersearch can be retained with a warning and disclosed gap. `evidence_sufficient` cannot hide unresolved material questions or conflict. Stance requirements are minimum consistency checks: the model must still judge whether the evidence actually entails the claim.

## Validator use

With Node.js 24+, install dependencies from the skill directory. Then run there, or use absolute script and input paths from any working directory:

```bash
npm ci
node scripts/validate_report.mjs report.json
node scripts/validate_report.mjs report.json --source-texts source-texts.json --json
node scripts/validate_report.mjs revised.json --previous-report original.json --strict
```

`source-texts.json` is an object mapping source IDs to inspected full-text strings. The validator compares only `contentKind=quote`, preserving words, punctuation and numbers while normalizing Unicode NFC and whitespace. A summary is not a failed quotation. Missing comparison text produces a warning; a mismatching quote produces an error. Do not provide unrelated private source text.

Exit codes: **0** contract checks passed; **1** invalid report, or warnings with `--strict`; **2** unreadable/malformed input or invalid CLI usage. `--json` prints `valid`, `schemaVersion`, `errors`, and `warnings`; `valid` describes the contract independently of the strict exit policy. The tool reads inputs and emits diagnostics only; it never changes the report or supplies missing evidence.

Schema checks validate shapes, conditional fields, date-time and URI syntax. Project checks cover IDs, graph cycles, evidence links, coverage counts, query provenance, minimum stance consistency, final-review coverage, and supplied revision differences. Optional quote comparison proves only textual presence. These checks **cannot** establish URL availability, actual access history, source authenticity, semantic entailment, true independence, correct rhetorical triggers, or a correct verdict. See [evaluation rubric](../evals/rubric.md) for behavioral review.
