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
2. **Retrieve and record.** Associate every principal query with its `claimId`, round, purpose, outcome, time, and relevant `sourceIds`. Use `success` for a completed search with results, `no_results` for a completed empty search, and `error` for a failed tool call. An irrelevant result is not an empty search. Record an inaccessible page as a source with its access status. Do not invent attempted queries when tools are unavailable.
3. **Extract and assess.** Link question findings to relevant evidence. Read source bodies and dates; classify stance, independence, applicability, and quality. A result snippet or several reproductions do not resolve a question. A primary document's own assertion may require independent scrutiny.
4. **Challenge.** For each checked factual claim, attempt at least one query against the emerging assessment. Link it with `purpose=counter`. Successful or empty countersearches show an attempt, not that all contrary evidence has been ruled out. If the attempt fails, record the failure and leave the requirement incomplete; do not report a completed directional verification.
5. **Check sufficiency.** Resolve a question only when cited evidence addresses its material conditions. If a premise remains open, refine the query using the missing person, period, dataset, language, or record. Avoid repeating a query that only retrieves the same upstream material.
6. **Stop explicitly.** Record completed rounds and a stop reason. Retain unresolved questions and material gaps. Save a checkpoint only when the task needs durable files and the host permits it; resume from actual saved evidence and queries, not reconstructed access history.

| `stopReason`          | Meaning and consequence                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `evidence_sufficient` | Material questions resolved, active countersearch completed, no material gap remains. It does not imply certainty or multiple independent sources.                              |
| `budget_exhausted`    | Time, tool-call or context budget reached; name the remaining gaps. A narrower directional conclusion is possible only if the claim as written is already adequately supported. |
| `source_unavailable`  | Necessary material could not be inspected. Use `unverified` if this prevents deciding the claim.                                                                                |
| `unresolved_conflict` | Applicable evidence conflicts on a material premise. Use `unverified`; describe both sides without voting by URL count.                                                         |
| `tool_unavailable`    | Online retrieval could not be performed. Use `unverified`; distinguish it from a completed search with no evidence.                                                             |

Structured reports put this in `claims[].verification`. Rounds count attempted retrieval rounds for that claim, including failed attempts; they equal the highest recorded query round, or zero when no query was attempted. Question `queryIds` and `evidenceIds` point to the actual audit entries. Material unresolved questions require an explanation in `remainingGaps` and prevent a directional verdict even at budget exhaustion. A lack of independent corroboration can be disclosed in confidence and limitations even when one uniquely authoritative record suffices.

## Tool and context limits

Keep relevant evidence, contrary evidence, qualifiers, and source lineage when shortening context. Do not retain only recent or conclusion-friendly passages. Reopen a source if an omitted detail becomes material. Record unavailable or unknown model/tool versions as unknown or omit them; do not infer them from product names.
