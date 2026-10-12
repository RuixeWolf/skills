/** Contract regressions; these do not measure an agent's factual accuracy. */

/** Run regressions using Node's built-in test runner. */
import { describe, beforeEach, test } from 'node:test';
/** Compare structured diagnostics and input snapshots. */
import assert from 'node:assert/strict';
/** Execute the real CLI to verify argument handling and exit codes. */
import { spawnSync } from 'node:child_process';
/** Create isolated input fixtures for filesystem and CLI checks. */
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
/** Use the system temporary directory without relying on the working directory. */
import { tmpdir } from 'node:os';
/** Resolve fixture and script paths. */
import path from 'node:path';
/** Convert module-relative fixture URLs into local filesystem paths. */
import { fileURLToPath } from 'node:url';
/** Exercise the validator's public module API. */
import { loadJson, parseJson, validateReport } from '../scripts/validate_report.mjs';
/** Exercise evaluation fixtures and comparison independently of the CLI. */
import { readRecords, compare } from '../scripts/evaluate_cases.mjs';

/** Absolute skill directory for tests launched from any location. */
const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Collect stable error codes, ignoring schema-engine-specific prose.
 * @param {object} report - Report under test.
 * @param {object|null} texts - Optional inspected source texts.
 * @param {object|null} previous - Optional earlier report.
 * @returns {Set<string>} Reported error codes.
 */
function codes(report, texts = null, previous = null) {
  return new Set(validateReport(report, texts, previous).errors.map((issue) => issue.code));
}

/** Run a helper as a child process with captured UTF-8 diagnostics.
 * @param {string} script - Script basename.
 * @param {string[]} args - CLI arguments.
 * @param {string} cwd - Child working directory.
 * @returns {object} Process output and exit status.
 */
function runCli(script, args, cwd = ROOT) {
  return spawnSync(process.execPath, [path.join(ROOT, 'scripts', script), ...args], { cwd, encoding: 'utf8' });
}

/** Clean up temporary files even when an assertion fails.
 * @param {Function} callback - Synchronous test work accepting a directory path.
 */
function withTempDirectory(callback) {
  const directory = mkdtempSync(path.join(tmpdir(), 'fact-verifier-'));
  try {
    callback(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe('Report validation', () => {
  let report;
  let texts;
  beforeEach(() => {
    report = loadJson(path.join(ROOT, 'evals/examples/supported-report.json'));
    texts = loadJson(path.join(ROOT, 'evals/examples/source-texts.json'));
  });

  test('supported report and literal quote pass without warnings', () => {
    const result = validateReport(report, texts);
    assert.equal(result.valid, true);
    assert.deepEqual(result.warnings, []);
  });

  test('legacy report is checked without silent migration', () => {
    const legacy = loadJson(path.join(ROOT, 'evals/examples/legacy-report.json'));
    const before = structuredClone(legacy);
    const result = validateReport(legacy);
    assert.equal(result.valid, true);
    assert.equal(result.warnings[0].code, 'legacy_report');
    assert.deepEqual(legacy, before);
  });

  test('unknown versions and nonobjects receive explicit diagnostics', () => {
    for (const value of [[], null, { methodologyVersion: [] }, { methodologyVersion: '9' }, { methodologyVersion: '__proto__' }]) {
      assert.equal(validateReport(value).errors[0].code, 'unsupported_version');
    }
  });

  test('relabeling a legacy report does not satisfy the current schema', () => {
    const legacy = loadJson(path.join(ROOT, 'evals/examples/legacy-report.json'));
    legacy.methodologyVersion = '0.3';
    assert(codes(legacy).has('schema'));
  });

  for (const [name, mutate, expectedCode] of [
    ['timestamp requires timezone', (r) => { r.checkedAt = '2026-10-12T14:00:00'; }, 'schema'],
    ['timestamp rejects impossible calendar dates', (r) => { r.checkedAt = '2026-02-30T14:00:00Z'; }, 'schema'],
    ['source URL requires URI syntax', (r) => { r.sources[0].url = 'this is not a URI'; }, 'schema'],
    ['duplicate claim and query IDs are detected', (r) => { r.claims.push(structuredClone(r.claims[0])); r.audit.queries[1].id = 'Q1'; }, 'duplicate_id'],
    ['evidence IDs must exist', (r) => { r.claims[0].evidenceIds = ['missing']; }, 'unknown_reference'],
    ['evidence must belong to the referencing claim', (r) => { r.evidence[0].claimId = 'C2'; }, 'wrong_claim_evidence'],
    ['evidence requires a claim backlink', (r) => { r.claims[0].evidenceIds = []; }, 'evidence_backlink'],
    ['context alone cannot support a directional verdict', (r) => { r.evidence[0].stance = 'context'; }, 'missing_directional_evidence'],
    ['unavailable sources cannot supply evidence', (r) => { r.sources[0].accessStatus = 'unavailable'; }, 'unread_evidence'],
    ['derived evidence requires a cluster', (r) => { Object.assign(r.evidence[0], { independence: 'derived', clusterId: null }); }, 'missing_cluster'],
    ['offline status cannot establish a false claim', (r) => { r.audit.onlineChecked = false; r.claims[0].verdict = 'contradicted'; }, 'offline_directional_verdict'],
    ['failed countersearch does not qualify', (r) => { Object.assign(r.audit.queries[1], { outcome: 'error', note: 'Timeout' }); }, 'countersearch_incomplete'],
    ['failed search cannot retain successful source results', (r) => { Object.assign(r.audit.queries[0], { outcome: 'error', note: 'Timeout' }); }, 'schema'],
    ['query claim references must exist', (r) => { r.audit.queries[1].claimId = 'unknown'; }, 'unknown_reference'],
    ['principal queries must be linked to questions', (r) => { r.claims[0].verification.questions[0].queryIds = ['Q1']; }, 'unlinked_query'],
    ['round count tracks search attempts', (r) => { r.claims[0].verification.rounds = 1; }, 'round_count'],
    ['unresolved questions cannot stop as sufficient', (r) => { r.claims[0].verification.questions[0].status = 'unresolved'; }, 'premature_stop'],
    ['unresolved questions require gap explanations', (r) => { r.claims[0].verification.questions[0].status = 'unresolved'; }, 'missing_gap'],
    ['blank quotes cannot match', (r) => { r.evidence[0].excerptOrSummary = '  \n '; }, 'quote_blank'],
    ['complete review must cover claims and summary', (r) => { Object.assign(r.audit.finalReview, { checkedClaimIds: [], summaryChecked: false }); }, 'incomplete_final_review'],
    ['factual corrections require supporting evidence', (r) => { r.claims[0].suggestedCorrection = { text: 'Changed fact.', reason: 'Correction', evidenceIds: [], changeKind: 'correct' }; }, 'unsupported_correction'],
    ['history cannot identify the current report', (r) => { r.claims[0].historyMatches = [{ reportId: r.reportId, claimId: 'C1', contextComparison: 'Same', action: 'reuse_after_recheck' }]; }, 'self_history'],
  ]) {
    test(name, () => {
      mutate(report);
      assert(codes(report, texts).has(expectedCode));
    });
  }

  test('source lineage must be acyclic', () => {
    const second = { ...structuredClone(report.sources[0]), id: 'S2', derivedFrom: ['S1'] };
    report.sources[0].derivedFrom = ['S2'];
    report.sources.push(second);
    assert(codes(report).has('dependency_cycle'));
  });

  test('claim parent graph rejects cycles and unknown parents', () => {
    report.claims[0].parentClaimId = 'C1';
    assert(codes(report).has('dependency_cycle'));
    report.claims[0].parentClaimId = 'unknown';
    assert(codes(report).has('unknown_reference'));
  });

  test('empty countersearch counts as an attempt', () => {
    assert.equal(report.audit.queries[1].outcome, 'no_results');
    assert(!codes(report).has('countersearch_incomplete'));
  });

  test('offline abstention remains valid with a disclosure warning', () => {
    const claim = report.claims[0];
    Object.assign(claim, { verdict: 'unverified', evidenceIds: [] });
    Object.assign(claim.verification, { rounds: 0, stopReason: 'tool_unavailable', remainingGaps: ['No web tool.'] });
    Object.assign(claim.verification.questions[0], { status: 'unresolved', evidenceIds: [], queryIds: [] });
    Object.assign(report, { evidence: [], sources: [] });
    Object.assign(report.audit, { onlineChecked: false, queries: [] });
    const result = validateReport(report);
    assert.equal(result.valid, true, JSON.stringify(result));
    assert(result.warnings.some((issue) => issue.code === 'countersearch_incomplete'));
  });

  test('article coverage counts and unchecked IDs match atomic candidates', () => {
    report.input.mode = 'article';
    report.articleAssessment = { candidateCheckableCount: 3, checkedCount: 1, selectionReason: 'Only C1 checked', unexamined: ['C2', 'C3'], headlineAssessment: 'None', summary: 'Partial coverage' };
    for (const id of ['C2', 'C3']) {
      report.claims.push({ id, normalizedText: 'The park area is 5 hectares.', category: 'checkable', status: 'not_checked', verdict: null, confidence: null, evidenceIds: [], reason: 'Outside requested scope' });
      report.passages[0].claimIds.push(id);
    }
    assert.equal(validateReport(report).valid, true);
    report.articleAssessment.unexamined = ['C2', 'C2'];
    assert(codes(report).has('coverage_omissions'));
    report.articleAssessment.unexamined = [];
    assert(codes(report).has('coverage_omissions'));
    report.articleAssessment.checkedCount = 2;
    assert(codes(report).has('coverage_count'));
  });

  test('article candidates need original-text locations', () => {
    report.input.mode = 'article';
    report.articleAssessment = { candidateCheckableCount: 1, checkedCount: 1, selectionReason: 'All', unexamined: [], headlineAssessment: 'None', summary: 'All checked' };
    report.passages = [];
    assert(codes(report).has('unlocated_claim'));
  });

  test('quote comparison preserves numbers and punctuation', () => {
    for (const text of ['The Northbridge tower is 43 metres tall.', 'The Northbridge tower is 42 metres tall!']) {
      assert(codes(report, { S1: text }).has('quote_mismatch'));
    }
  });

  test('quote comparison normalizes Unicode NFC and Python whitespace', () => {
    assert.equal(validateReport(report, { S1: 'The Northbridge\n tower is 42 metres tall.' }).valid, true);
    report.evidence[0].excerptOrSummary = 'Café\u001c42';
    assert.equal(validateReport(report, { S1: 'Cafe\u0301\u008542' }).valid, true);
    assert(codes(report, { S1: 'Café\ufeff42' }).has('quote_mismatch'));
  });

  test('budget limits do not resolve material questions', () => {
    Object.assign(report.claims[0].verification, { stopReason: 'budget_exhausted', remainingGaps: ['Measurement scope unresolved'] });
    report.claims[0].verification.questions[0].status = 'unresolved';
    assert(codes(report).has('unresolved_directional'));
  });

  test('summaries are not compared as literal quotations', () => {
    Object.assign(report.evidence[0], { contentKind: 'summary', excerptOrSummary: 'Register reports a height of 42 m.' });
    const result = validateReport(report, texts);
    assert.equal(result.valid, true);
    assert.deepEqual(result.warnings, []);
  });

  test('missing quotation text produces a warning', () => {
    assert(validateReport(report).warnings.some((issue) => issue.code === 'quote_not_compared'));
  });

  test('source text maps require string values', () => {
    for (const value of [{ S1: { text: 'wrong shape' } }, [], 'wrong shape']) {
      assert(codes(report, value).has('source_texts_shape'));
    }
  });

  test('incomplete review remains a draft warning', () => {
    report.audit.finalReview.status = 'incomplete';
    assert(validateReport(report).warnings.some((issue) => issue.code === 'draft_review'));
  });

  test('revision verdict changes are compared with the previous report', () => {
    const previous = structuredClone(report);
    report.reportId = 'synthetic-revision-002';
    report.claims[0].verdict = 'contradicted';
    report.evidence[0].stance = 'contradicts';
    report.revision = { previousReportId: previous.reportId, reason: 'New measurement', changes: [] };
    assert(codes(report, null, previous).has('missing_revision_change'));
    report.revision.changes = [{ claimId: 'C1', previousVerdict: 'supported', newVerdict: 'contradicted', reason: 'New record', evidenceIds: ['E1'] }];
    assert.equal(validateReport(report, null, previous).valid, true);
    report.revision.changes[0].previousVerdict = 'unverified';
    assert(codes(report, null, previous).has('revision_old_verdict'));
  });

  test('validation does not mutate reports, source texts, or previous reports', () => {
    const previous = structuredClone(report);
    const before = structuredClone({ report, texts, previous });
    validateReport(report, texts, previous);
    assert.deepEqual({ report, texts, previous }, before);
    report.unexpected = 'keep this field even though it is invalid';
    validateReport(report);
    assert.equal(report.unexpected, 'keep this field even though it is invalid');
  });

  test('arbitrary IDs do not collide with JavaScript object prototypes', () => {
    report.sources[0].id = '__proto__';
    report.evidence[0].sourceId = '__proto__';
    report.audit.queries[0].sourceIds = ['__proto__'];
    const safeTexts = JSON.parse('{"__proto__":"The Northbridge tower is 42 metres tall."}');
    assert.equal(validateReport(report, safeTexts).valid, true);
  });

  test('validator CLI resolves schemas outside the skill directory', () => {
    withTempDirectory((directory) => {
      const run = runCli('validate_report.mjs', [path.join(ROOT, 'evals/examples/supported-report.json'), '--source-texts', path.join(ROOT, 'evals/examples/source-texts.json'), '--json', '--strict'], directory);
      assert.equal(run.status, 0, run.stderr + run.stdout);
      assert.equal(JSON.parse(run.stdout).valid, true);
    });
  });

  test('validator CLI distinguishes warnings, invalid reports, and unreadable input', () => {
    const filename = path.join(ROOT, 'evals/examples/supported-report.json');
    const warning = runCli('validate_report.mjs', [filename, '--strict', '--json']);
    assert.equal(warning.status, 1);
    assert.equal(JSON.parse(warning.stdout).valid, true);
    assert.equal(runCli('validate_report.mjs', [filename]).status, 0);
    assert.equal(runCli('validate_report.mjs', [`${filename}.missing`]).status, 2);
    withTempDirectory((directory) => {
      const input = path.join(directory, 'input.json');
      writeFileSync(input, '{"methodologyVersion":"9"}');
      assert.equal(runCli('validate_report.mjs', [input]).status, 1);
      for (const text of ['{"a":1,"a":2}', '{"a":NaN}', '{"a":1e999}', '{']) {
        writeFileSync(input, text);
        assert.equal(runCli('validate_report.mjs', [input]).status, 2);
      }
    });
  });

  test('validator CLI loads previous reports for revision comparison', () => {
    withTempDirectory((directory) => {
      const previousFile = path.join(directory, 'original.json');
      const currentFile = path.join(directory, 'revised.json');
      writeFileSync(previousFile, JSON.stringify(report));
      report.reportId = 'synthetic-revision-002';
      report.revision = { previousReportId: 'synthetic-supported-001', reason: 'Fresh review, same verdict', changes: [] };
      writeFileSync(currentFile, JSON.stringify(report));
      const run = runCli('validate_report.mjs', [currentFile, '--previous-report', previousFile, '--source-texts', path.join(ROOT, 'evals/examples/source-texts.json'), '--json', '--strict']);
      assert.equal(run.status, 0, run.stderr + run.stdout);
    });
  });
});

describe('Strict JSON input', () => {
  test('duplicate members, escaped aliases, and nonfinite values are rejected', () => {
    for (const text of ['{"a":1,"a":2}', '{"x":{"a":1,"\\u0061":2}}', '[{"a":1,"a":2}]', '{"a":NaN}', '{"a":Infinity}', '{"a":-Infinity}', '{"a":1e999}']) {
      assert.throws(() => parseJson(text));
    }
  });

  test('nested values, repeated keys in distinct objects, and escaped strings remain valid', () => {
    for (const text of ['null', 'true', '42', '"a\\\"b"', '{"a":[],"b":{},"c":[{"x":1},{"x":2}]}', '{"\\u0061":"line\\ntext","__proto__":{}}']) {
      assert.deepEqual(parseJson(text), JSON.parse(text));
    }
  });

  test('BOM files are accepted and invalid UTF-8 is rejected', () => {
    withTempDirectory((directory) => {
      const input = path.join(directory, 'input.json');
      writeFileSync(input, '\ufeff{"a":1}');
      assert.deepEqual(loadJson(input), { a: 1 });
      writeFileSync(input, Buffer.from([0x22, 0xff, 0x22]));
      assert.throws(() => loadJson(input));
    });
  });
});

describe('Evaluation comparison', () => {
  let cases;
  let predictions;
  beforeEach(() => {
    cases = readRecords(path.join(ROOT, 'evals/cases.jsonl'), 'id');
    predictions = new Map([...cases].map(([key, record]) => [key, { caseId: key, verdicts: Object.fromEntries(record.expected.claims.map((claim) => [claim.id, claim.verdict])) }]));
  });

  test('fixtures retain provisional expectations and unscored reasoning dimensions', () => {
    assert.equal(cases.size, 30);
    const result = compare(cases, predictions);
    assert.equal(result.completeAgreement, true);
    assert.equal(result.provisionalExpectations, true);
    assert(result.unscoredDimensions.length);
    assert.equal(result.matchingVerdicts, result.expectedClaims);
  });

  test('missing cases and extra claims are reported', () => {
    predictions.delete('case-01');
    predictions.get('case-02').verdicts.invented = 'supported';
    const result = compare(cases, predictions);
    assert.equal(result.completeAgreement, false);
    assert.deepEqual(result.missingCases, ['case-01']);
    assert(result.unexpectedClaims.length);
  });

  test('unverified and contradicted are distinct verdicts', () => {
    predictions.get('case-03').verdicts.C1 = 'contradicted';
    assert.equal(compare(cases, predictions).disagreements[0].expected, 'unverified');
  });

  test('unknown verdicts, including on unexpected cases, are input errors', () => {
    predictions.get('case-01').verdicts.C1 = 'true-ish';
    assert.throws(() => compare(cases, predictions));
    predictions.delete('case-01');
    predictions.set('unknown-case', { verdicts: { C1: 1 } });
    assert.throws(() => compare(cases, predictions));
  });

  test('malformed case expectations are input errors', () => {
    cases.get('case-01').expected = ['wrong shape'];
    assert.throws(() => compare(cases, predictions));
  });

  test('duplicate expected claims and missing review provenance are rejected', () => {
    const record = cases.get('case-01');
    record.expected.claims.push(structuredClone(record.expected.claims[0]));
    assert.throws(() => compare(cases, predictions), /duplicate expected claim/);
    record.expected.claims.pop();
    record.reviewStatus = 'human_reviewed';
    record.review = {};
    assert.throws(() => compare(cases, predictions), /review provenance/);
  });

  test('JSON Lines rejects malformed, duplicate, and empty records', () => {
    withTempDirectory((directory) => {
      const filename = path.join(directory, 'predictions.jsonl');
      for (const text of ['', '\n \n', '[]', '{"caseId":" "}', '{"caseId":"a"}\n{"caseId":"a"}', '{"caseId":"a","caseId":"b"}']) {
        writeFileSync(filename, text);
        assert.throws(() => readRecords(filename, 'caseId'));
      }
      writeFileSync(filename, '\ufeff\r\n{"caseId":"__proto__","verdicts":{}}\r\n');
      assert.equal(readRecords(filename, 'caseId').has('__proto__'), true);
    });
  });

  test('evaluation CLI handles default cases, differences, bad inputs, and custom cases', () => {
    withTempDirectory((directory) => {
      const filename = path.join(directory, 'predictions.jsonl');
      const customCases = path.join(directory, 'cases.jsonl');
      writeFileSync(filename, [...predictions.values()].map((record) => JSON.stringify(record)).join('\n'));
      const run = runCli('evaluate_cases.mjs', [filename], directory);
      assert.equal(run.status, 0, run.stderr + run.stdout);
      assert.equal(JSON.parse(run.stdout).completeAgreement, true);
      const first = predictions.get('case-01');
      writeFileSync(filename, JSON.stringify(first));
      assert.equal(runCli('evaluate_cases.mjs', [filename]).status, 1);
      writeFileSync(customCases, JSON.stringify(cases.get('case-01')));
      assert.equal(runCli('evaluate_cases.mjs', [filename, '--cases', customCases], directory).status, 0);
      writeFileSync(filename, '{"caseId":"case-01","verdicts":{"C1":"true-ish"}}');
      assert.equal(runCli('evaluate_cases.mjs', [filename]).status, 2);
      assert.equal(runCli('evaluate_cases.mjs', [`${filename}.missing`]).status, 2);
    });
  });
});

describe('CLI usage', () => {
  for (const script of ['validate_report.mjs', 'evaluate_cases.mjs']) {
    test(`${script} reports usage errors and supports help`, () => {
      for (const args of [[], ['one', 'two'], ['--unknown'], ['--cases']]) {
        const run = runCli(script, args);
        assert.equal(run.status, 2, run.stderr + run.stdout);
      }
      assert.equal(runCli(script, ['--help']).status, 0);
      assert.equal(runCli(script, ['-h']).status, 0);
    });
  }
});
