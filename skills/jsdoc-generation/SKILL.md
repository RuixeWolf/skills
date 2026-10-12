---
name: jsdoc-generation
description: Apply JSDoc generation standards when generating, editing, refactoring, or reviewing TypeScript, JavaScript, JSX, TSX, Vue, MTS, CTS, MJS, or CJS source code. Use this skill whenever changes involve files with .ts, .tsx, .js, .jsx, .vue, .mts, .cts, .mjs, or .cjs extensions and JSDoc comments may need to be added, updated, or preserved.
---

# JSDoc Generation Standards

Apply these standards when generating or modifying TypeScript, JavaScript, JSX, TSX, Vue, MTS, CTS, MJS, or CJS source code.

## Requirements

Use this checklist in order when generating or modifying code:

1. **Module-level declarations**

   - Add a short JSDoc summary above each module-level variable declared with `const`, `let`, or `var`.
   - Add a short JSDoc summary above each module-level function, class, type alias, interface, and enum.

2. **Function signatures**

   - Add `@param` for every function parameter.
   - Add `@returns` when the function return type is not `void`.
   - Apply the same rules to function-type fields and callable properties where appropriate.

3. **Interface and type fields**

   - Add concise JSDoc only when the meaning, purpose, constraints, units, or usage of the field are not obvious from its name and type.

## Comment Quality

Keep JSDoc concise and practical.

Prefer comments that explain:

- intent;
- units;
- constraints;
- side effects;
- non-obvious behavior;
- important usage requirements.

Avoid comments that only restate the identifier name, type, or implementation.

## Local-Scope Exception

Do not add JSDoc to variables declared inside function or method bodies unless the comment materially improves understanding of non-obvious intent, constraints, units, or behavior.

## Existing Documentation

When modifying existing code:

- Preserve useful existing JSDoc.
- Update JSDoc when the corresponding behavior, parameters, return value, or constraints change.
- Remove or correct stale documentation.
- Do not duplicate equivalent comments.
- Follow the surrounding project's established JSDoc style when it is compatible with these rules.
