# Scoring Policy (No Numerical Score by Default)

By default, reports provide the claim `verdict`, verification confidence (`high | medium | low`), evidence quality (`high | medium | low | unknown`), and specific reasons. Do not routinely assign a 0–100 score: without a human-reviewed reference set and probability calibration, numbers imply unjustified precision. If the user explicitly requests numbers, first explain that they are **analysis aids, not probabilities of truth**, and optionally provide the experimental components below. Record an unavailable component as `unknown`, not zero. The v0.3 report schema has no numerical-score fields; present requested experimental rubrics as a separately labeled readable supplement, without changing the structured verdict or confidence.

## Experimental evidence-quality rubric (one evidence item for one claim)

| Dimension                          | Maximum | Evaluation question                                                                                                            |
| ---------------------------------- | ------: | ------------------------------------------------------------------------------------------------------------------------------ |
| Provenance and reproducibility     |      20 | Can the original material be located, dated, and revisited in a page or archive?                                               |
| Directness                         |      20 | Is this an original record or direct observation rather than unverified retelling? Direct observations still require scrutiny. |
| Relevance to the claim             |      20 | Do the person, event, numbers, and qualifiers match?                                                                           |
| Method transparency                |      15 | Can the data, sampling, collection, or reporting method be examined?                                                           |
| Time and context fit               |      10 | Do the time, location, population, and statistical definitions match?                                                          |
| Applicable expertise and interests |      10 | Are relevant expertise, correction record, and visible conflicts of interest considered?                                       |
| Completeness                       |       5 | Is enough context available rather than only a fragment?                                                                       |

Give reasons for each dimension. Mark unassessable dimensions `unknown` and report the assessable maximum, such as `61/80 assessed`; never silently treat a missing 20 points as 0/20. This rubric has not been statistically calibrated, so score differences cannot establish real-world probabilities. A news outlet does not have a fixed score across stories.

Assess argument quality separately: factual premises, unsupported assumptions, standards appropriate to the reasoning type, strength of the conclusion, and potential fallacies. Mark it `not_applicable` if there is no explicit argument. Do not let a formula such as 0.7 × evidence quality + 0.3 × argument quality determine truth. Support or contradiction is a directional field judged from evidence and applicability; neither an overall publisher score nor a raw source count determines the verdict.

Before considering a future `Claim Support Index`, freeze a human-reviewed labeled dataset with rationales, examine domain/time/language bias, source deduplication, and reviewer agreement, then define and version a formula with validation results. Until then, do not express such an index as a percentage or call it a “rumor probability.” For articles, report coverage and consequential issues rather than averaging scores across claims.
