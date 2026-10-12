#!/usr/bin/env node
/** Check report contracts without fetching URLs or modifying evidence/verdicts. */

/** Resolve bundled schemas and identify direct CLI invocation using file URLs. */
import { fileURLToPath, pathToFileURL } from 'node:url';
/** Parse CLI options with Node's built-in argument parser. */
import { parseArgs } from 'node:util';
/** Share strict JSON parsing with the evaluation helper. */
import { isRecord, parseJson, loadJson } from './json.mjs';

/** Preserve synchronous validation and actionable CLI diagnostics if dependencies are missing. */
const schemaDependencies = await Promise.all([
  import('ajv/dist/2020.js'),
  import('ajv-formats'),
])
  .then(([ajv, formats]) => ({
    Ajv2020: ajv.default,
    addFormats: formats.default,
  }))
  .catch((error) => ({ error }));

/** Bundled methodology versions; reports are never migrated automatically. */
const SCHEMAS = new Map([
  ['0.2', 'report.v0.2.schema.json'],
  ['0.3', 'report.schema.json'],
]);
/** Verdicts that require completed online checks and directional evidence. */
const DIRECTIONAL = new Set([
  'supported',
  'mostly_supported',
  'misleading',
  'contradicted',
  'outdated',
]);
/** Reuse compiled schemas across validation calls, including revision checks. */
const validators = new Map();

/** Compile a bundled JSON Schema 2020-12 contract without modifying input data.
 * @param {string} version - Supported methodology version.
 * @returns {Function} Compiled Ajv validator.
 */
function schemaValidator(version) {
  if (!validators.has(version)) {
    if (schemaDependencies.error) throw schemaDependencies.error;
    const { Ajv2020, addFormats } = schemaDependencies;
    const ajv = new Ajv2020({
      allErrors: true,
      strict: false,
      strictNumbers: true,
      ownProperties: true,
    });
    addFormats(ajv, ['date-time', 'uri']);
    const schema = loadJson(
      fileURLToPath(
        new URL(`../references/${SCHEMAS.get(version)}`, import.meta.url),
      ),
    );
    validators.set(version, ajv.compile(schema));
  }
  return validators.get(version);
}

/** Normalize only Unicode composition and Python-compatible whitespace.
 * @param {string} text - Quote or inspected source text.
 * @returns {string} Text with whitespace runs collapsed to single spaces.
 */
function normalizedQuote(text) {
  // Python str.split includes U+001C–001F and U+0085, but excludes U+FEFF.
  return text
    .normalize('NFC')
    .split(/[\p{White_Space}\u001c-\u001f]+/u)
    .filter(Boolean)
    .join(' ');
}

/** Check references and workflow rules after structural validation succeeds. */
class ReportChecks {
  /** Prepare ID indexes and report diagnostics.
   * @param {object} report - Structurally valid report.
   * @param {object} result - Mutable diagnostics accumulator.
   */
  constructor(report, result) {
    this.report = report;
    this.result = result;
    this.current = report.methodologyVersion === '0.3';
    this.tables = Object.fromEntries(
      ['claims', 'sources', 'evidence', 'passages'].map((name) => [
        name,
        this.index(report[name], `/${name}`),
      ]),
    );
    this.claims = this.tables.claims;
    this.sources = this.tables.sources;
    this.evidence = this.tables.evidence;
  }

  /** Append an actionable error or disclosure warning.
   * @param {string} code - Stable diagnostic identifier.
   * @param {string} location - JSON pointer or collection path.
   * @param {string} message - Human-readable diagnostic.
   * @param {boolean} warning - Whether the issue is non-fatal.
   */
  issue(code, location, message, warning = false) {
    this.result[warning ? 'warnings' : 'errors'].push({
      code,
      path: location,
      message,
    });
  }

  /** Index IDs while reporting duplicates; Maps keep arbitrary IDs safe.
   * @param {object[]} items - Records with local IDs.
   * @param {string} location - Collection path for duplicate diagnostics.
   * @returns {Map<string, object>} Index retaining the last record for each ID.
   */
  index(items, location) {
    const indexed = new Map();
    items.forEach((item, i) => {
      if (indexed.has(item.id))
        this.issue(
          'duplicate_id',
          `${location}/${i}/id`,
          `Duplicate ID '${item.id}'.`,
        );
      indexed.set(item.id, item);
    });
    return indexed;
  }

  /** Check that all supplied references identify known records.
   * @param {string[]} values - Referenced IDs.
   * @param {Map<string, object>} table - Target collection index.
   * @param {string} location - Reference field path.
   */
  refs(values, table, location) {
    values.forEach((value, i) => {
      if (!table.has(value))
        this.issue(
          'unknown_reference',
          `${location}/${i}`,
          `Unknown ID '${value}'.`,
        );
    });
  }

  /** Remove dependency-free nodes; remaining nodes contain a cycle.
   * @param {Map<string, object>} table - Nodes indexed by ID.
   * @param {string} field - Dependency field accepting an ID or ID array.
   * @param {string} location - Graph collection path.
   */
  graph(table, field, location) {
    const dependencies = new Map();
    const dependents = new Map(
      [...table.keys()].map((key) => [key, new Set()]),
    );
    for (const [key, item] of table) {
      const raw = item[field] || [];
      const refs = typeof raw === 'string' ? [raw] : raw;
      this.refs(refs, table, `${location}/${key}/${field}`);
      const upstreams = new Set(refs.filter((ref) => table.has(ref)));
      dependencies.set(key, upstreams);
      for (const upstream of upstreams) dependents.get(upstream).add(key);
    }
    const ready = [...dependencies]
      .filter(([, refs]) => refs.size === 0)
      .map(([key]) => key);
    while (ready.length) {
      const key = ready.pop();
      for (const dependent of dependents.get(key)) {
        dependencies.get(dependent).delete(key);
        if (dependencies.get(dependent).size === 0) ready.push(dependent);
      }
      dependencies.delete(key);
    }
    if (dependencies.size)
      this.issue(
        'dependency_cycle',
        location,
        `Cycle in dependencies: ${[...dependencies.keys()].sort().join(', ')}`,
      );
  }

  /** Verify bidirectional evidence links and all cross-collection references. */
  links() {
    this.graph(this.sources, 'derivedFrom', '/sources');
    this.graph(this.claims, 'parentClaimId', '/claims');
    this.report.passages.forEach((passage, i) =>
      this.refs(passage.claimIds, this.claims, `/passages/${i}/claimIds`),
    );
    this.report.claims.forEach((claim, i) =>
      this.claimEvidence(
        claim.id,
        claim.evidenceIds,
        `/claims/${i}/evidenceIds`,
      ),
    );
    this.report.evidence.forEach((item, i) => {
      const location = `/evidence/${i}`;
      this.refs([item.claimId], this.claims, `${location}/claimId`);
      this.refs([item.sourceId], this.sources, `${location}/sourceId`);
      const claim = this.claims.get(item.claimId);
      if (claim && !claim.evidenceIds.includes(item.id))
        this.issue(
          'evidence_backlink',
          location,
          "Evidence must also appear in its claim's evidenceIds.",
        );
      if (this.sources.get(item.sourceId)?.accessStatus === 'unavailable')
        this.issue(
          'unread_evidence',
          location,
          'Unavailable source cannot supply inspected evidence; identify the available copy separately.',
        );
      if (item.independence === 'derived' && item.clusterId === null)
        this.issue(
          'missing_cluster',
          location,
          'Derived evidence needs a dependency cluster.',
        );
    });
    this.report.arguments.forEach((argument, i) => {
      this.refs([argument.sourceId], this.sources, `/arguments/${i}/sourceId`);
      this.refs([argument.claimId], this.claims, `/arguments/${i}/claimId`);
    });
    const origin = this.report.originTrace?.earliestVisibleSourceId;
    if (origin != null)
      this.refs([origin], this.sources, '/originTrace/earliestVisibleSourceId');
    (this.report.persuasionAnalysis?.techniques || []).forEach(
      (technique, i) => {
        this.refs(
          [technique.passageId],
          this.tables.passages,
          `/persuasionAnalysis/techniques/${i}/passageId`,
        );
        this.refs(
          technique.relatedClaimIds,
          this.claims,
          `/persuasionAnalysis/techniques/${i}/relatedClaimIds`,
        );
      },
    );
  }

  /** Ensure evidence references belong to the claim being assessed.
   * @param {string} claimId - Expected evidence owner.
   * @param {string[]} values - Evidence IDs.
   * @param {string} location - Referencing field path.
   */
  claimEvidence(claimId, values, location) {
    this.refs(values, this.evidence, location);
    for (const value of values) {
      if (
        this.evidence.has(value) &&
        this.evidence.get(value).claimId !== claimId
      ) {
        this.issue(
          'wrong_claim_evidence',
          location,
          `Evidence '${value}' belongs to another claim.`,
        );
      }
    }
  }

  /** Check minimum directional evidence and article coverage of atomic claims. */
  verdictsAndCoverage() {
    const parents = new Set(
      [...this.claims.values()]
        .map((claim) => claim.parentClaimId)
        .filter(Boolean),
    );
    this.report.claims.forEach((claim, i) => {
      const location = `/claims/${i}`;
      if (claim.status === 'checked' && claim.category !== 'checkable')
        this.issue(
          'unchecked_category',
          location,
          'Checked claims must be classified checkable.',
        );
      if (claim.status === 'not_checkable' && claim.category === 'checkable')
        this.issue(
          'category_status',
          location,
          'A checkable claim cannot be marked not_checkable.',
        );
      if (this.current && parents.has(claim.id) && claim.status === 'checked')
        this.issue(
          'checked_composite',
          location,
          'Check atomic children; retain the composite parent as not_checked.',
        );
      if (DIRECTIONAL.has(claim.verdict)) {
        if (!this.report.audit.onlineChecked)
          this.issue(
            'offline_directional_verdict',
            location,
            'A directional verdict requires completed online verification.',
          );
        const stances = new Set(
          claim.evidenceIds
            .filter((id) => this.evidence.has(id))
            .map((id) => this.evidence.get(id).stance),
        );
        let expected =
          claim.verdict === 'contradicted' ? ['contradicts'] : ['supports'];
        if (['misleading', 'outdated'].includes(claim.verdict))
          expected = ['supports', 'contradicts'];
        if (!expected.some((stance) => stances.has(stance)))
          this.issue(
            'missing_directional_evidence',
            location,
            'Verdict needs applicable directional evidence, not only context.',
          );
      }
    });
    if (this.report.input.mode !== 'article') return;
    const assessment = this.report.articleAssessment;
    const candidates = [...this.claims.values()].filter(
      (claim) => claim.category === 'checkable' && !parents.has(claim.id),
    );
    const checked = candidates.filter((claim) => claim.status === 'checked');
    if (
      assessment.candidateCheckableCount !== candidates.length ||
      assessment.checkedCount !== checked.length
    )
      this.issue(
        'coverage_count',
        '/articleAssessment',
        'Counts must match unique atomic checkable candidates and checked candidates.',
      );
    if (this.current) {
      const unchecked = new Set(
        candidates
          .filter((claim) => claim.status === 'not_checked')
          .map((claim) => claim.id),
      );
      const unexamined = new Set(assessment.unexamined);
      if (
        unexamined.size !== unchecked.size ||
        assessment.unexamined.length !== unchecked.size ||
        [...unexamined].some((id) => !unchecked.has(id))
      )
        this.issue(
          'coverage_omissions',
          '/articleAssessment/unexamined',
          'List each unchecked atomic checkable claim ID exactly once.',
        );
      const located = new Set(
        this.report.passages.flatMap((passage) => passage.claimIds),
      );
      if (candidates.some((claim) => !located.has(claim.id)))
        this.issue(
          'unlocated_claim',
          '/passages',
          'Every article candidate needs an original-text passage.',
        );
    }
  }

  /** Check search provenance, stopping conditions, corrections, and final review. */
  workflow() {
    const queries = this.index(this.report.audit.queries, '/audit/queries');
    const succeeded = [...queries.values()].some(
      (query) => query.outcome !== 'error',
    );
    if (this.report.audit.onlineChecked !== succeeded)
      this.issue(
        'online_status',
        '/audit/onlineChecked',
        'Must agree with completed (success/no_results) online searches.',
      );
    this.report.audit.queries.forEach((query, i) => {
      this.refs([query.claimId], this.claims, `/audit/queries/${i}/claimId`);
      this.refs(query.sourceIds, this.sources, `/audit/queries/${i}/sourceIds`);
    });
    this.report.claims.forEach((claim, i) => {
      const location = `/claims/${i}`;
      const ownQueries = new Map(
        [...queries].filter(([, query]) => query.claimId === claim.id),
      );
      if (claim.status !== 'checked') {
        if (ownQueries.size)
          this.issue(
            'queries_for_unchecked',
            location,
            'Queries were recorded; explain the incomplete investigation in reason.',
            true,
          );
        return;
      }
      const verification = claim.verification;
      const questions = this.index(
        verification.questions,
        `${location}/verification/questions`,
      );
      verification.questions.forEach((question, j) => {
        const qpath = `${location}/verification/questions/${j}`;
        this.claimEvidence(
          claim.id,
          question.evidenceIds,
          `${qpath}/evidenceIds`,
        );
        this.refs(question.queryIds, ownQueries, `${qpath}/queryIds`);
        if (question.status === 'resolved' && !question.evidenceIds.length)
          this.issue(
            'unsubstantiated_resolution',
            qpath,
            'Resolved questions require inspected evidence.',
          );
      });
      const linked = new Set(
        [...questions.values()].flatMap((question) => question.queryIds),
      );
      if ([...ownQueries.keys()].some((id) => !linked.has(id)))
        this.issue(
          'unlinked_query',
          location,
          'Every principal query must be linked to a verification question.',
        );
      const rounds = [...ownQueries.values()].reduce(
        (highest, query) => Math.max(highest, query.round),
        0,
      );
      if (verification.rounds !== rounds)
        this.issue(
          'round_count',
          location,
          'Rounds must equal the highest recorded query round, or zero.',
        );
      const challenged = [...ownQueries.values()].some(
        (query) => query.purpose === 'counter' && query.outcome !== 'error',
      );
      if (!challenged)
        this.issue(
          'countersearch_incomplete',
          location,
          'No completed countersearch; disclose the gap.',
          claim.verdict === 'unverified',
        );
      const unresolved = [...questions.values()].some(
        (question) => question.status === 'unresolved',
      );
      if (unresolved && DIRECTIONAL.has(claim.verdict))
        this.issue(
          'unresolved_directional',
          location,
          'Resolve material questions before a directional verdict, including at budget exhaustion.',
        );
      if (unresolved && !verification.remainingGaps.length)
        this.issue(
          'missing_gap',
          location,
          'Unresolved questions need material gap explanations.',
        );
      const stop = verification.stopReason;
      if (
        stop === 'evidence_sufficient' &&
        (unresolved ||
          verification.remainingGaps.length ||
          !challenged ||
          claim.verdict === 'unverified')
      )
        this.issue(
          'premature_stop',
          location,
          'Sufficient-evidence stop requires resolved questions, completed challenge, a directional verdict, and no material gaps.',
        );
      if (
        [
          'unresolved_conflict',
          'tool_unavailable',
          'source_unavailable',
        ].includes(stop) &&
        claim.verdict !== 'unverified'
      )
        this.issue(
          'stop_verdict_conflict',
          location,
          'Material conflict/unavailability requires unverified.',
        );
      if (stop !== 'evidence_sufficient' && !verification.remainingGaps.length)
        this.issue(
          'missing_stop_explanation',
          location,
          'Explain the limiting condition in remainingGaps.',
        );
      const correction = claim.suggestedCorrection;
      if (correction) {
        this.claimEvidence(
          claim.id,
          correction.evidenceIds,
          `${location}/suggestedCorrection/evidenceIds`,
        );
        if (
          correction.changeKind !== 'withhold' &&
          !correction.evidenceIds.length
        )
          this.issue(
            'unsupported_correction',
            location,
            'A factual replacement needs supporting evidence.',
          );
        if (
          claim.verdict === 'unverified' &&
          correction.changeKind !== 'withhold'
        )
          this.issue(
            'unverified_correction',
            location,
            'Do not invent a factual replacement for an unverified claim.',
          );
      }
      for (const match of claim.historyMatches || []) {
        if (match.reportId === this.report.reportId)
          this.issue(
            'self_history',
            location,
            'History matches must refer to an earlier report.',
          );
        if (match.action === 'reuse_after_recheck' && !ownQueries.size)
          this.issue(
            'unrefreshed_history',
            location,
            'Reused history needs a recorded current investigation.',
          );
      }
    });
    const review = this.report.audit.finalReview;
    this.refs(
      review.checkedClaimIds,
      this.claims,
      '/audit/finalReview/checkedClaimIds',
    );
    const checkedIds = new Set(
      [...this.claims.values()]
        .filter((claim) => claim.status === 'checked')
        .map((claim) => claim.id),
    );
    const reviewed = new Set(review.checkedClaimIds);
    if ([...reviewed].some((id) => !checkedIds.has(id)))
      this.issue(
        'review_unchecked_claim',
        '/audit/finalReview',
        'Reviewed IDs must refer to checked claims.',
      );
    if (review.status === 'complete') {
      if (
        reviewed.size !== checkedIds.size ||
        [...checkedIds].some((id) => !reviewed.has(id)) ||
        !review.summaryChecked
      )
        this.issue(
          'incomplete_final_review',
          '/audit/finalReview',
          'Complete review must cover checked claims and the summary.',
        );
    } else {
      this.issue(
        'draft_review',
        '/audit/finalReview',
        'Final review is incomplete; treat this report as a draft.',
        true,
      );
    }
  }

  /** Compare literal quotes against explicitly supplied source texts.
   * @param {object|null} sourceTexts - Source IDs mapped to inspected full texts.
   */
  quotes(sourceTexts) {
    if (sourceTexts !== null)
      this.refs(Object.keys(sourceTexts), this.sources, '/source-texts');
    this.report.evidence.forEach((item, i) => {
      if (item.contentKind !== 'quote') return;
      if (!normalizedQuote(item.excerptOrSummary)) {
        this.issue(
          'quote_blank',
          `/evidence/${i}/excerptOrSummary`,
          'A quotation cannot contain only whitespace.',
        );
        return;
      }
      const text =
        sourceTexts && Object.hasOwn(sourceTexts, item.sourceId)
          ? sourceTexts[item.sourceId]
          : null;
      if (text === null)
        this.issue(
          'quote_not_compared',
          `/evidence/${i}`,
          'Provide the inspected source text to compare this quote.',
          true,
        );
      else if (
        !normalizedQuote(text).includes(normalizedQuote(item.excerptOrSummary))
      )
        this.issue(
          'quote_mismatch',
          `/evidence/${i}/excerptOrSummary`,
          'Quote is absent from provided source text (NFC and whitespace normalization only).',
        );
    });
  }

  /** Compare declared verdict changes against a supplied earlier v0.3 report.
   * @param {object|null} previous - Previous report, or null if not supplied.
   */
  revisions(previous) {
    const revision = this.report.revision;
    if (revision) {
      if (revision.previousReportId === this.report.reportId)
        this.issue(
          'revision_identity',
          '/revision',
          'A revision needs a new reportId.',
        );
      const changes = this.index(
        revision.changes.map((change) => ({ ...change, id: change.claimId })),
        '/revision/changes',
      );
      for (const [claimId, change] of changes) {
        this.refs([claimId], this.claims, '/revision/changes/claimId');
        this.claimEvidence(
          claimId,
          change.evidenceIds,
          '/revision/changes/evidenceIds',
        );
        if (
          this.claims.has(claimId) &&
          change.newVerdict !== this.claims.get(claimId).verdict
        )
          this.issue(
            'revision_new_verdict',
            '/revision/changes',
            'New verdict differs from the current claim.',
          );
      }
    }
    if (previous === null) {
      if (revision)
        this.issue(
          'revision_not_compared',
          '/revision',
          'Previous report was not supplied; old verdicts were not compared.',
          true,
        );
      return;
    }
    const priorResult = validateReport(previous);
    if (!priorResult.valid || previous.methodologyVersion !== '0.3') {
      this.issue(
        'previous_report_invalid',
        '/revision',
        'Comparison requires a valid v0.3 previous report with reportId.',
      );
      return;
    }
    if (!revision || revision.previousReportId !== previous.reportId) {
      this.issue(
        'previous_report_link',
        '/revision',
        'Revision must identify the supplied previous report.',
      );
      return;
    }
    const before = new Map(previous.claims.map((claim) => [claim.id, claim]));
    const changes = new Map(
      revision.changes.map((change) => [change.claimId, change]),
    );
    if (
      before.size !== this.claims.size ||
      [...before.keys()].some((id) => !this.claims.has(id))
    )
      this.issue(
        'revision_claim_set_changed',
        '/revision',
        'Claim IDs were added or removed; explain scope changes in the revision reason.',
        true,
      );
    for (const [claimId, old] of before) {
      if (!this.claims.has(claimId)) continue;
      const current = this.claims.get(claimId);
      if (old.normalizedText !== current.normalizedText)
        this.issue(
          'claim_scope_changed',
          '/revision',
          `Reassess equivalence of changed wording for ${claimId}.`,
          true,
        );
      const change = changes.get(claimId);
      if (old.verdict !== current.verdict && !change)
        this.issue(
          'missing_revision_change',
          '/revision/changes',
          `Missing verdict change for ${claimId}.`,
        );
      if (change && change.previousVerdict !== old.verdict)
        this.issue(
          'revision_old_verdict',
          '/revision/changes',
          `Old verdict differs from previous report for ${claimId}.`,
        );
    }
    for (const claimId of changes.keys()) {
      if (!before.has(claimId))
        this.issue(
          'unknown_previous_claim',
          '/revision/changes',
          `Claim ${claimId} does not exist in the previous report.`,
        );
    }
  }
}

/** Validate structure and consistency without certifying factual truth.
 * @param {unknown} report - Report value to validate.
 * @param {object|null} sourceTexts - Optional source ID-to-text map.
 * @param {object|null} previousReport - Optional prior v0.3 report.
 * @returns {object} Contract validity, schema version, errors, and warnings.
 */
function validateReport(report, sourceTexts = null, previousReport = null) {
  const result = {
    valid: false,
    schemaVersion: null,
    errors: [],
    warnings: [],
  };
  const version = isRecord(report) ? report.methodologyVersion : null;
  if (typeof version !== 'string' || !SCHEMAS.has(version)) {
    result.errors.push({
      code: 'unsupported_version',
      path: '/methodologyVersion',
      message:
        'Expected report version 0.2 or 0.3; no automatic migration is performed.',
    });
    return result;
  }
  result.schemaVersion = version;
  const validate = schemaValidator(version);
  if (!validate(report)) {
    result.errors = validate.errors.map((error) => ({
      code: 'schema',
      path: error.instancePath || '/',
      message: error.message,
    }));
    result.errors.sort((a, b) =>
      a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
    );
    return result;
  }
  if (
    sourceTexts !== null &&
    (!isRecord(sourceTexts) ||
      Object.values(sourceTexts).some((text) => typeof text !== 'string'))
  ) {
    result.errors.push({
      code: 'source_texts_shape',
      path: '/source-texts',
      message: 'Expected an object mapping source IDs to full-text strings.',
    });
    return result;
  }
  const checks = new ReportChecks(report, result);
  checks.links();
  checks.verdictsAndCoverage();
  if (version === '0.3') {
    checks.workflow();
    checks.quotes(sourceTexts);
    checks.revisions(previousReport);
  } else {
    checks.issue(
      'legacy_report',
      '/methodologyVersion',
      'Legacy structure checked; v0.3 query, final-review, quote-kind and revision guarantees are unavailable.',
      true,
    );
    if (previousReport !== null)
      checks.issue(
        'legacy_revision',
        '/methodologyVersion',
        'Revision comparison requires a current v0.3 report.',
      );
  }
  result.valid = result.errors.length === 0;
  return result;
}

/** Run the read-only validator CLI with stable exit codes 0, 1, and 2.
 * @param {string[]} argv - Arguments without the Node executable and script.
 * @returns {number} Success, contract/strict failure, or input/usage failure.
 */
function main(argv = process.argv.slice(2)) {
  const usage =
    'Usage: node scripts/validate_report.mjs <report.json> [--source-texts <texts.json>] [--previous-report <previous.json>] [--strict] [--json]';
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        'source-texts': { type: 'string' },
        'previous-report': { type: 'string' },
        strict: { type: 'boolean' },
        json: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
    });
    if (values.help) {
      console.log(
        `${usage}\nCheck report contracts without fetching URLs or modifying evidence/verdicts.\n--strict fails on warnings; --json emits machine-readable diagnostics.`,
      );
      return 0;
    }
    if (positionals.length !== 1) throw new Error(usage);
    const result = validateReport(
      loadJson(positionals[0]),
      values['source-texts'] === undefined
        ? null
        : loadJson(values['source-texts']),
      values['previous-report'] === undefined
        ? null
        : loadJson(values['previous-report']),
    );
    if (values.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(
        `Contract ${result.valid ? 'valid' : 'invalid'} (v${result.schemaVersion}); this is not a truth verdict.`,
      );
      for (const kind of ['errors', 'warnings']) {
        for (const issue of result[kind])
          console.log(
            `${kind.slice(0, -1).toUpperCase()} [${issue.code}] ${issue.path}: ${issue.message}`,
          );
      }
    }
    return result.valid && !(values.strict && result.warnings.length) ? 0 : 1;
  } catch (error) {
    const message =
      error.code === 'ERR_MODULE_NOT_FOUND'
        ? 'Install helper dependencies: npm ci --prefix <skill-directory>'
        : error.message;
    console.error(`Cannot read validation inputs: ${message}`);
    return 2;
  }
}

export { loadJson, parseJson, validateReport, main };
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exitCode = main();
