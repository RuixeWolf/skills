/** Strict JSON input shared by the report validator and case comparator. */

/** Read bytes without silently replacing invalid UTF-8. */
import { readFileSync } from 'node:fs';

/** Identify JSON objects without treating null or arrays as records.
 * @param {unknown} value - Candidate value.
 * @returns {boolean} Whether the value is an object record.
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Reject duplicate members, including escaped aliases, and nonfinite numbers.
 * @param {string} text - JSON document without a byte-order mark.
 * @returns {any} Parsed JSON value.
 */
function parseJson(text) {
  const value = JSON.parse(text);
  // JSON.parse validates syntax first; this walk checks information it discards.
  const tokens = text.match(/"(?:[^"\\]|\\[\s\S])*"|[{}\[\]:,]|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g);
  let offset = 0;

  /** Inspect one value in an already syntactically valid token stream. */
  function inspect() {
    const token = tokens[offset++];
    if (token === '{') {
      const keys = new Set();
      while (tokens[offset] !== '}') {
        const key = JSON.parse(tokens[offset++]);
        if (keys.has(key)) throw new SyntaxError(`Duplicate JSON member: ${key}`);
        keys.add(key);
        offset++; // Colon.
        inspect();
        if (tokens[offset] === ',') offset++;
      }
      offset++;
    } else if (token === '[') {
      while (tokens[offset] !== ']') {
        inspect();
        if (tokens[offset] === ',') offset++;
      }
      offset++;
    } else if (/^-?\d/.test(token) && !Number.isFinite(Number(token))) {
      throw new SyntaxError(`Nonfinite JSON number: ${token}`);
    }
  }

  inspect();
  return value;
}

/** Decode UTF-8, accepting an optional leading byte-order mark.
 * @param {string} path - Local input path.
 * @returns {string} Decoded text.
 */
function readUtf8(path) {
  return new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(path));
}

/** Read a strict JSON document from disk.
 * @param {string} path - Local input path.
 * @returns {any} Parsed JSON value.
 */
function loadJson(path) {
  return parseJson(readUtf8(path));
}

export { isRecord, parseJson, readUtf8, loadJson };
