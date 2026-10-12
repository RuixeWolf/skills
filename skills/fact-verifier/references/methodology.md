# Fact Verification Methodology v0.3

This specification governs the Evidence-Based Fact Verification Agent. It covers a statement, passage, article, article URL, or AI-generated answer. Its purpose is a traceable evidence and reasoning chain. Select `quick`, `standard`, or `deep` using [verification-loop.md](verification-loop.md); mode changes coverage and effort, never the truth standard. For comparisons, preserve each answer and its citations separately before aligning atomic claims.

## 1. Input and verification targets

Preserve the original input or a privacy-limited summary. Record the mode (`claim | article`), language, `checkedAt` with timezone, article provenance, and access status. For an article, retrieve the body, headline, captions, relevant links, and publication/update dates. If the full text cannot be accessed, restrict the assessment to the material actually read. Do not claim to have analyzed the “full article” based only on search snippets for a URL.

Extract candidate claims passage by passage. Record `passageId`, paragraph/headline or character-range locator, brief original excerpt, speaker or quotation `attribution`, presentation (author assertion, quotation, denial, hypothetical, question, or satire), and surrounding context. Mark attribution `uncertain` if the text does not establish who is asserting the claim. A quotation can be a verification target, but “Person P said X” and “X is true” are different claims. Include the headline as a candidate: it may assert more than the body. Do not treat spelling, rhetoric, or a pure value judgment as a factual error.

Classify candidates as `checkable`, `opinion`, `prediction`, `ambiguous`, or `not_claim`. When a factual statement omits an essential person, time, or place, use the interpretation most faithful to the wording and state the assumption. If plausible interpretations change the verdict, examine them separately or ask for clarification. Never silently supply a missing condition.

Split a compound statement into the smallest factual propositions that can independently be true or false. For example, “Company A went bankrupt and laid off 5,000 workers” requires a claim about the relevant bankruptcy proceeding in a particular jurisdiction and period, and a separate claim about layoffs in the specified period. Connect the original and atomic claims with `parentClaimId`. Preserve negation, magnitude, causality, and comparison conditions. Do not turn “announced a plan” into “carried out the plan.”

### Article claim selection and coverage

First list candidates, deduplicate them, and map their relationships. Prioritize with stated criteria: the headline and central thesis, importance to the article's conclusion, potential real-world impact, checkability of explicit numbers/dates, and passages the user names. Check all central claims by default. If a long article cannot be covered fully, investigate the highest-priority claims, state the candidate count and selection rationale, list consequential unchecked claims, and limit the conclusion to the checked portion. Verify repeated versions once while preserving locations. Count unique atomic checkable candidates; retain a composite parent as `not_checked` with its decomposition reason, and exclude it from both coverage counts and the unchecked atomic list. Do not claim full article coverage when independent candidates remain unchecked.

## 2. Search and stopping conditions

For each claim, generate searches that do not presuppose a position: names and aliases, event and date, supporting terms, denials or counterexamples, neutral descriptions, official records or original datasets, early appearances, and other languages when useful. Seek suitable primary material first, then secondary reporting that can independently verify it. Primary material can still be biased or mistaken. Link principal queries to the claim and its verification questions, recording round, purpose, outcome, time, relevant sources, and failures. Follow [verification-loop.md](verification-loop.md) to assess sufficiency and refine queries.

Inspect the original page and evidence locator. Check that the event, region, period, and statistical definitions match. Examine versions and publication dates; search-result ordering is not chronological evidence. Complete at least one active countersearch per checked factual claim before a directional verdict. Failed countersearches leave this step incomplete; use `unverified` and explain the limitation. Record “not found” as a search outcome and coverage limitation, not proof of nonexistence. Do not silently discard an inaccessible or suspect source.

Stop when key premises are covered, the most plausible alternative explanations have been examined, counterevidence has been sought, and further search is unlikely to add much; or stop when tool/time limits are reached and clearly disclose the gaps. Extend investigation when a claim is consequential or disputed and conflicts remain unresolved, and avoid a strong verdict. When only one relevant authoritative record exists, disclose the lack of independent corroboration instead of mechanically requiring a nonexistent second source.

## 3. Evidence items and source lineage

A `source` is a locatable carrier of information; an `evidence` item is a short passage, datum, or verifiable observation relevant to one claim. A page may provide multiple evidence items, and the same material may have different stances toward different claims. Record `claimId`, `sourceId`, `locator`, `contentKind` (`quote | summary`), `excerptOrSummary`, language, applicability (period/region/population), stance, directness, quality and rationale. Record publisher, source type, publication/retrieval times and access status on the source. Use null for unknown scope fields rather than guessing. If retaining a permitted snapshot, identify its local artifact and hash; the validator never opens paths embedded in reports.

Record upstream material in `derivedFrom`: cited documents, wire stories, social posts, databases, and interviews. Use `clusterId` to group items dependent on common upstream evidence. Republishing and reanalysis of the same dataset do not create independent corroboration. If a report adds its own interview or new original data, record that contribution as a separate evidence item. Mark independence `unknown` when it cannot be established. “Earliest visible source found” is limited to the search conducted; distinguish publication, archive, and repost times. An official announcement can establish that an authority announced something without independently proving every real-world assertion in the announcement. A claim does not prove itself.

## 4. Evaluate evidence and arguments separately

Check each evidence item for locatable provenance, coverage of the actual proposition, first-hand status, acquisition method, currency, scope, interests, and missing context; mark uncertain fields. Give a written rationale and an evidence-quality grade of `high | medium | low | unknown`. When a source reaches its conclusion through reasoning, separate asserted facts, implicit assumptions, inference, and conclusion as detailed in [argument-analysis.md](argument-analysis.md). If a table or announcement offers no explicit argument, mark argument quality `not_applicable` rather than penalizing it.

Evidence quality measures how useful this particular material is for this particular claim; it is not a permanent reputation score for its publisher. Label suspected fallacies `potential`, retaining the relevant wording and explanation. Persuasive language or a sensational headline alone does not make a factual proposition false.

## 5. Claim verdict, confidence, and article assessment

Compare support and contradiction by independent evidence cluster, directness, and applicability. Do not vote by URL count or add source scores. Use these `verdict` values:

| Value | Use when |
| --- | --- |
| `supported` | Reliable evidence clearly supports the proposition with its stated qualifiers. |
| `mostly_supported` | The core fact holds, but some details are inaccurate without changing its essential meaning. |
| `misleading` | Some facts may hold, but missing context, a comparison baseline, or time frame creates a materially wrong impression. |
| `contradicted` | Applicable, reliable evidence directly conflicts with the core proposition. |
| `unverified` | Available evidence is insufficient or inaccessible, conflicts remain unresolved, or it is too early to know. |
| `outdated` | The claim can be established for an earlier time but is no longer true as framed now; specify both times. |
| `not_fact_checkable` | A pure value judgment, operationally vague assertion, or prediction without an observable present fact. |

If atomic claims within one original statement have different outcomes, show them side by side rather than compressing them into one true/false label. `misleading` and `outdated` are not weaker forms of falsehood; explain the mechanism and relevant dates. `unverified` is not `contradicted`. Assign confidence separately as `high | medium | low`, with reasons covering key-claim coverage, primary material and independent clusters, reproducibility, conflicts, search coverage, and recent change. Confidence is confidence in this assessment, not the probability that the user's statement is true. If the record cannot support a directional verdict, use `unverified` even if many pages repeat the same source.

For an article, output `articleAssessment`: the assessed text scope, count of candidate checkable claims, count checked, results and passage locations, fit between headline and body, significant omitted context and its effect, unchecked subjects, and a carefully scoped narrative summary. Do not average claims or use majority vote to declare an entire article true or false: one central consequential error can matter more than several correct peripheral details. Assess the overall framing only after adequately covering and explaining the central thesis.

## 6. Conditional linguistic and psychological analysis of persuasive framing

After verifying claims, assess whether both of these conditions are met within the examined input: (a) multiple consequential, distinct factual claims are contradicted or materially misleading on sufficiently strong evidence; and (b) emotionally charged language is repeated or prominent enough to shape the text's framing. Do not substitute a fixed percentage or a raw count of false sentences for a judgment about the central claims and the amount of text actually checked. For a partial article, limit the assessment to the examined passages and never say the whole article contains “many false claims” unless coverage supports it. Unsupported or unverified claims do not count as disproven. If either condition is absent, omit the default persuasion section; a user may separately request a stylistic analysis without implying falsity.

If both conditions hold, follow [persuasion-analysis.md](persuasion-analysis.md). Link each observed linguistic device to a short source passage and, where relevant, to a checked claim. Explain the plausible attention, emotion, or sharing mechanism as a conditional interpretation, with its limitations. Separate the textual pattern from the author's unobservable intention and from any unmeasured real-world sharing outcome. This section does not alter claim verdicts or confidence scores.

End **every** user-facing verification report with a short labeled “Analysis summary” (translated to the user's language if appropriate). State the central verdict or mixed results, the assessed scope and coverage, the strongest remaining uncertainty, and, when triggered, the principal documented persuasion pattern. Put this section after evidence, limitations, and citations so the answer actually ends with the overview; do not repeat long tables. The structured report must contain `closingSummary`.

## 7. Audit, corrections, and scope

Use the JSON fields in [report-schema.md](report-schema.md), or a readable equivalent, to record queries, evidence, lineage, verdict rationale, limitations, and known method/model versions. Follow [revision-policy.md](revision-policy.md) for evidence-backed corrections, an independent final review step, new report IDs and verdict-change records, and context-sensitive history reuse. Reopen key sources before claiming a fresh verification; historical agreement is not new evidence. For JSON delivery run the contract validator, inspect warnings, and disclose incomplete validation. Keep public quotations brief and avoid unrelated private data. This skill does not provide full media forensics, calibrated truth probabilities, or definitive lie detection.

This method draws on principles of transparent fact-checking, suitable primary evidence, independent corroboration, and presentation of supporting and opposing material in the [IFCN Code of Principles](https://ifcncodeofprinciples.poynter.org/the-commitments). Its classifications, article-coverage rules, and report fields are project design choices, not an official IFCN scoring method.
