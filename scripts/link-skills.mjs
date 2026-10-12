#!/usr/bin/env node
/** Link this repository's skills into .agents/skills for local agent discovery. */

/** Inspect and modify filesystem entries without shelling out. */
import {
  lstatSync,
  mkdirSync,
  realpathSync,
  rmdirSync,
  statSync,
  symlinkSync,
  unlinkSync,
} from 'node:fs';
/** Join cross-platform paths. */
import path from 'node:path';
/** Parse CLI flags without a third-party command framework. */
import { parseArgs } from 'node:util';
/** Derive the repository root from this script's own location. */
import { fileURLToPath } from 'node:url';

/** Repository root, derived from this script's location rather than the cwd. */
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
/** Source directory holding the distributable skills. */
const skillsDir = path.join(repoRoot, 'skills');
/** Project-level agent tool directory. */
const agentsDir = path.join(repoRoot, '.agents');
/** Discovery path that agent tools read. */
const linkPath = path.join(agentsDir, 'skills');
/** Repository-relative link path used in status and error messages. */
const LINK_LABEL = '.agents/skills';

/** Report a failure and exit without touching anything else.
 * @param {string} message - Cause of the failure.
 * @returns {never} Never returns; the process exits.
 */
function fail(message) {
  console.error(`link-skills: ${message}`);
  process.exit(1);
}

/** Stat a path, treating a missing entry as absent.
 * @param {string} target - Absolute path to inspect.
 * @param {boolean} [follow] - Follow a final link instead of reporting it.
 * @returns {import('node:fs').Stats | null} Metadata, or null when absent.
 */
function statOrNull(target, follow = false) {
  try {
    return (follow ? statSync : lstatSync)(target);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

/** Check whether the existing link resolves to the skills directory.
 * @returns {boolean} True when current; foreign or broken links are false.
 */
function linkIsCurrent() {
  try {
    return realpathSync(linkPath) === realpathSync(skillsDir);
  } catch {
    return false;
  }
}

/** Remove the existing link without following it to its target. */
function removeLink() {
  if (process.platform !== 'win32') {
    unlinkSync(linkPath);
    return;
  }
  try {
    // Windows directory reparse points (junctions) are removed with rmdir.
    rmdirSync(linkPath);
  } catch {
    // File links are not directories and need unlink instead.
    unlinkSync(linkPath);
  }
}

/** Create the discovery link that maps .agents/skills onto skills/. */
function createLink() {
  if (process.platform === 'win32') {
    // Junctions store an absolute target and need no administrator rights.
    symlinkSync(path.resolve(skillsDir), linkPath, 'junction');
    return;
  }
  // POSIX links stay relative so a moved checkout keeps working.
  symlinkSync(
    path.relative(path.dirname(linkPath), skillsDir),
    linkPath,
    'dir',
  );
}

/** Ensure the source skills directory exists before touching the link. */
function assertSkillsDirectory() {
  if (!statOrNull(skillsDir, true)?.isDirectory()) {
    fail(`missing skills directory: ${path.relative(repoRoot, skillsDir)}`);
  }
}

/** Create or refresh the link, leaving real directories and files untouched. */
function linkSkills() {
  assertSkillsDirectory();

  const agents = statOrNull(agentsDir, true);
  if (agents && !agents.isDirectory()) {
    fail('.agents exists but is not a directory');
  }
  if (!agents) mkdirSync(agentsDir, { recursive: true });

  const existing = statOrNull(linkPath);
  if (!existing) {
    createLink();
    console.log(`Linked ${LINK_LABEL} -> skills.`);
    return;
  }
  if (!existing.isSymbolicLink()) {
    fail(
      `refusing to replace ${LINK_LABEL}: it is not a link; ` +
        'remove it manually if intended',
    );
  }
  if (linkIsCurrent()) return;
  removeLink();
  createLink();
  console.log(`Recreated outdated link: ${LINK_LABEL} -> skills.`);
}

/** Remove the link, refusing to delete anything that is not a link. */
function unlinkSkills() {
  const existing = statOrNull(linkPath);
  if (!existing) {
    console.log(`Nothing to remove: ${LINK_LABEL} is not present.`);
    return;
  }
  if (!existing.isSymbolicLink()) {
    fail(
      `refusing to remove ${LINK_LABEL}: it is not a link; ` +
        'remove it manually if intended',
    );
  }
  removeLink();
  console.log(`Removed link: ${LINK_LABEL}.`);
}

/** Parse CLI flags, exiting with usage on unknown options.
 * @returns {{ unlink: boolean }} Requested operation.
 */
function parseFlags() {
  try {
    const { values } = parseArgs({
      allowPositionals: false,
      options: { unlink: { type: 'boolean', default: false } },
    });
    return { unlink: values.unlink };
  } catch {
    fail('usage: node scripts/link-skills.mjs [--unlink]');
  }
}

/** Requested operation parsed from the command line. */
const flags = parseFlags();

if (flags.unlink) {
  unlinkSkills();
} else {
  linkSkills();
}
