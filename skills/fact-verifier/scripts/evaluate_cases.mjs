#!/usr/bin/env node
/** Compare case verdicts; free-text reasoning still requires human review. */

/** Locate bundled cases independently of the working directory. */
import path from 'node:path';
/** Resolve bundled inputs and identify direct CLI invocation using file URLs. */
import { fileURLToPath, pathToFileURL } from 'node:url';
/** Parse CLI flags without a third-party command framework. */
import { parseArgs } from 'node:util';
/** Share duplicate-member and UTF-8 checks with the validator. */
import { isRecord, parseJson, readUtf8 } from './json.mjs';

/** Synthetic fixture set used unless a caller supplies --cases. */
const DEFAULT_CASES = fileURLToPath(
  new URL('../evals/cases.jsonl', import.meta.url),
);
/** Verdict strings and the null value used for unchecked claims. */
const VERDICTS = new Set([
  'supported',
  'mostly_supported',
  'misleading',
  'contradicted',
  'unverified',
  'outdated',
  'not_fact_checkable',
  null,
]);

/** Read strict JSON Lines, requiring nonempty unique record IDs.
 * @param {string} filename - UTF-8 JSON Lines input path.
 * @param {string} idKey - Field containing each record's local ID.
 * @returns {Map<string, object>} Records indexed by ID.
 */
function readRecords(filename, idKey) {
  const records = new Map();
  const lines = readUtf8(filename).split(
    /\r\n|[\n\r\v\f\u001c-\u001e\u0085\u2028\u2029]/u,
  );
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    const item = parseJson(line);
    if (
      !isRecord(item) ||
      typeof item[idKey] !== 'string' ||
      !item[idKey].trim()
    )
      throw new Error(
        `${path.basename(filename)}:${i + 1}: expected an object with nonempty ${idKey}`,
      );
    if (records.has(item[idKey]))
      throw new Error(
        `${path.basename(filename)}:${i + 1}: duplicate ${idKey} '${item[idKey]}'`,
      );
    records.set(item[idKey], item);
  });
  if (!records.size) throw new Error(`${path.basename(filename)}: no records`);
  return records;
}

/** Compare verdict labels while leaving behavioral dimensions explicitly unscored.
 * @param {Map<string, object>} cases - Expected case records.
 * @param {Map<string, object>} predictions - Submitted prediction records.
 * @returns {object} Agreement, coverage gaps, and provisional-expectation flags.
 */
function compare(cases, predictions) {
  const result = {
    completeAgreement: true,
    provisionalExpectations: false,
    expectedClaims: 0,
    matchingVerdicts: 0,
    missingCases: [...cases.keys()].filter((id) => !predictions.has(id)).sort(),
    unexpectedCases: [...predictions.keys()]
      .filter((id) => !cases.has(id))
      .sort(),
    disagreements: [],
    missingClaims: [],
    unexpectedClaims: [],
    unscoredDimensions: [
      'claim meaning and extraction',
      'source fidelity and entailment',
      'search behavior',
      'reasoning and uncertainty',
      'correction quality',
      'persuasion analysis',
      'required/forbidden free-text findings',
    ],
  };
  // Validate every supplied prediction, including unexpected case IDs.
  for (const [caseId, prediction] of predictions) {
    const verdicts = prediction?.verdicts;
    if (
      !isRecord(verdicts) ||
      Object.entries(verdicts).some(
        ([key, value]) => !key.trim() || !VERDICTS.has(value),
      )
    )
      throw new Error(
        `${caseId}: verdicts must map claim IDs to known verdicts or null for unchecked claims`,
      );
  }
  for (const [caseId, caseRecord] of cases) {
    const status = caseRecord.reviewStatus;
    if (!['synthetic_unreviewed', 'human_reviewed'].includes(status))
      throw new Error(`${caseId}: missing/unknown reviewStatus`);
    const review = caseRecord.review;
    if (
      status === 'human_reviewed' &&
      (!review ||
        (isRecord(review) && !Object.keys(review).length) ||
        (Array.isArray(review) && !review.length))
    )
      throw new Error(`${caseId}: human_reviewed requires review provenance`);
    result.provisionalExpectations ||= status !== 'human_reviewed';
    const expectation = caseRecord.expected;
    if (!isRecord(expectation))
      throw new Error(`${caseId}: expected must be an object`);
    const claims = expectation.claims;
    if (!Array.isArray(claims) || !claims.length)
      throw new Error(`${caseId}: expected.claims must be a nonempty list`);
    const expected = new Map();
    for (const claim of claims) {
      if (
        !isRecord(claim) ||
        typeof claim.id !== 'string' ||
        !claim.id.trim() ||
        !Object.hasOwn(claim, 'verdict')
      )
        throw new Error(`${caseId}: invalid expected claim`);
      if (!VERDICTS.has(claim.verdict) || expected.has(claim.id))
        throw new Error(
          `${caseId}: invalid verdict or duplicate expected claim`,
        );
      expected.set(claim.id, claim.verdict);
    }
    result.expectedClaims += expected.size;
    const actual = predictions.get(caseId)?.verdicts || {};
    for (const [claimId, verdict] of expected) {
      if (!Object.hasOwn(actual, claimId))
        result.missingClaims.push({ caseId, claimId });
      else if (actual[claimId] === verdict) result.matchingVerdicts++;
      else
        result.disagreements.push({
          caseId,
          claimId,
          expected: verdict,
          actual: actual[claimId],
        });
    }
    for (const claimId of Object.keys(actual)) {
      if (!expected.has(claimId))
        result.unexpectedClaims.push({ caseId, claimId });
    }
  }
  result.completeAgreement = ![
    'missingCases',
    'unexpectedCases',
    'disagreements',
    'missingClaims',
    'unexpectedClaims',
  ].some((key) => result[key].length);
  return result;
}

/** Run the comparator CLI with stable success, disagreement, and input exit codes.
 * @param {string[]} argv - Arguments without the Node executable and script.
 * @returns {number} Zero for agreement, one for differences, two for bad input.
 */
function main(argv = process.argv.slice(2)) {
  const usage =
    'Usage: node scripts/evaluate_cases.mjs <predictions.jsonl> [--cases <cases.jsonl>]';
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        cases: { type: 'string', default: DEFAULT_CASES },
        help: { type: 'boolean', short: 'h' },
      },
    });
    if (values.help) {
      console.log(
        `${usage}\nCompare case verdicts; free-text reasoning still requires human review.`,
      );
      return 0;
    }
    if (positionals.length !== 1) throw new Error(usage);
    const result = compare(
      readRecords(values.cases, 'id'),
      readRecords(positionals[0], 'caseId'),
    );
    console.log(JSON.stringify(result, null, 2));
    return result.completeAgreement ? 0 : 1;
  } catch (error) {
    console.error(`Cannot compare evaluation inputs: ${error.message}`);
    return 2;
  }
}

export { readRecords, compare, main };
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exitCode = main();
