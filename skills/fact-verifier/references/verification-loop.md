# Verification Modes and Evidence Loop

Read this when choosing depth, investigating a disputed claim, or resuming a long check. Modes change coverage, budget, and presentation, never the evidential standard.

| Mode       | Default use                                                                   | Coverage and output                                                                                                                                       |
| ---------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quick`    | One narrow claim or an explicit request for brevity                           | Investigate the selected proposition; a short verdict, direct sources, uncertainty, and closing summary can be sufficient. Disclose unexamined subclaims. |
| `standard` | Default for an article or several claims                                      | Inventory candidates, check central claims, disclose omissions, and show the claim/evidence relationship.                                                 |
| `deep`     | Explicit request, consequential disputed claims, complex lineage or causality | Investigate unresolved premises and alternative interpretations; provide the fuller audit trail.                                                          |

Infer a suitable mode from the request. Ask only when the budget or coverage tradeoff materially affects the user's goal. Do not force a tier selector or a fixed number of searches or sources. Upgrade when a supposedly narrow claim has consequential subclaims or conflicting evidence; explain scope and limits if resources prevent that upgrade. A comparison request uses the same modes and shared claim identities across texts, with text fidelity and external factuality assessed separately.

## Per-claim loop

1. **Frame questions.** Preserve the claim's exact qualifiers and split its unresolved premises into questions. Give each a stable ID, such as `C1.Q1`. Record important alternative interpretations. Recheck normalized wording against the original for negation, subject, time, units, population, comparison baseline, and certainty.
2. **Retrieve and record.** Associate every principal query with its `claimId`, round, purpose, outcome, time, and relevant `sourceIds`. Capture timestamps during the calls using the convention below. Use `success` for a completed search with results, `no_results` for a completed empty search, and `error` for a failed tool call. An irrelevant result is not an empty search. Record an inaccessible page as a source with its access status. Do not invent attempted queries when tools are unavailable.
3. **Extract and assess.** Link question findings to relevant evidence. Read source bodies and dates; classify stance, independence, applicability, and quality. A result snippet or several reproductions do not resolve a question. A primary document's own assertion may require independent scrutiny.
4. **Challenge.** For each checked factual claim, attempt at least one query against the emerging assessment. Link it with `purpose=counter`. Successful or empty countersearches show an attempt, not that all contrary evidence has been ruled out. If the attempt fails, record the failure and leave the requirement incomplete; do not report a completed directional verification.
5. **Check sufficiency.** Resolve a question only when cited evidence addresses its material conditions. If a premise remains open, refine the query using the missing person, period, dataset, language, or record. Avoid repeating a query that only retrieves the same upstream material.
6. **Stop explicitly.** Record completed rounds and a stop reason. Retain unresolved questions and material gaps. Save a checkpoint only when the task needs durable files and the host permits it; resume from actual saved evidence and queries, not reconstructed access history.

| `stopReason`          | Meaning and consequence                                                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `evidence_sufficient` | Material questions resolved, active countersearch completed, no material gap remains. It does not imply certainty or multiple independent sources.                                        |
| `budget_exhausted`    | Time, tool-call or context budget reached; explain what remains. A directional verdict still requires resolving the claim as written; unresolved material questions require `unverified`. |
| `source_unavailable`  | Necessary material could not be inspected, preventing a decision; use `unverified`. Nonessential access failures belong in limitations instead of this stop reason.                       |
| `unresolved_conflict` | Applicable evidence conflicts on a material premise. Use `unverified`; describe both sides without voting by URL count.                                                                   |
| `tool_unavailable`    | Online retrieval could not be performed. Use `unverified`; distinguish it from a completed search with no evidence.                                                                       |

Structured reports put this in `claims[].verification`. Question `queryIds` and `evidenceIds` point to the actual audit entries. Use the conventions below for rounds and gap placement; `unresolved_conflict` is a stop reason, not a verdict. Consult [evidence-conflicts.md](evidence-conflicts.md) when evidence appears to disagree.

## Rounds and parallel queries

A round is a group of principal searches planned from the same evidence state for one claim. Start at 1 and advance when results lead to a revised or refined search plan. Queries in that group share a round whether dispatched together or sequentially; parallelism, tool-call count, page fetches, and retries alone do not create new rounds. Each claim has its own numbering. Include failed search attempts in their planned round; do not omit them to make the audit look complete.

For example, support query `Q1` and counterquery `Q2` planned together for `C1` both have `round=1`. If their results reveal a missing observation condition, a refined `Q3` for `C1` has `round=2`. A first query for `C2` still has `round=1`, even if it runs later. `C1.verification.rounds` is then 2 and `C2.verification.rounds` is 1. With no attempted search it is 0; otherwise it equals the highest recorded query round for that claim.

## Material gaps and residual limitations

A gap is material when resolving it could reasonably change the verdict or a condition essential to the claim as written. Record material unresolved questions and their explanations in `verification.questions` and `remainingGaps`; they prevent a directional verdict even at budget exhaustion. Do not relabel a missing decisive source as a minor limitation merely to pass validation.

Non-material limitations belong in report-level `limitations`, naming the affected claim IDs, and in `confidence.reason` where relevant. For example, if independently inspected evidence already resolves `C1`, an unopened optional upstream letter may be a residual provenance limitation. If that letter is the only basis for the decisive assertion, its absence is a material gap instead. A lack of independent corroboration may remain a limitation when one uniquely authoritative record suffices; explain why that record answers this particular claim.

With `stopReason=evidence_sufficient`, all material questions must be resolved and `remainingGaps` must be `[]`; residual limitations may still be nonempty. Other stop reasons require an explanation of the limiting condition in `remainingGaps`. If a claim already meets sufficiency when the overall run reaches its budget, prefer `evidence_sufficient` for that claim and describe unfinished claims in coverage, rather than manufacturing a gap in the resolved claim.

## Capture search and retrieval times

Use timezone-bearing ISO 8601 timestamps from actual tool metadata or a system clock read during the operation. A tool's publication date, a search snippet's date, and the report's `checkedAt` are not access timestamps.

- Record each query's `searchedAt` when dispatching it. For a batch, queries dispatched together may share that observed dispatch time. Retain it if the attempt fails, with `outcome=error` and an explanatory note.
- Record a source's `retrievedAt` when its retrieval response arrives. Keep it associated with the version of the page actually used as evidence. For a failed retrieval, record the attempt's response time and `accessStatus=unavailable`; the timestamp does not imply the page was read, and that source cannot supply inspected evidence.
- Keep these records while retrieving, so a long run or context change does not require reconstructing access history. Failed or empty searches and unavailable pages retain their real attempt times.

In v0.3 both per-query `searchedAt` and per-source `retrievedAt` are required date-time strings. If an earlier run retained only a genuine run-level time window, disclose that window and the missing item times in readable output or an explicitly unvalidated draft. Do not insert an interval or null into these fields, copy `checkedAt` into them, or fabricate point timestamps to satisfy the schema. A fresh retrieval can establish a new access time, but cannot retroactively establish the old one; keep a new check distinct from the incomplete historical audit.

## Tool and context limits

Keep relevant evidence, contrary evidence, qualifiers, and source lineage when shortening context. Do not retain only recent or conclusion-friendly passages. Reopen a source if an omitted detail becomes material. Record unavailable or unknown model/tool versions as unknown or omit them; do not infer them from product names.
