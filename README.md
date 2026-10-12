# Agent Skills

A collection of reusable Agent Skills for AI coding agents.

This repository contains my personal shared skills for improving consistency, code quality, documentation, development workflows, verification, and other common software engineering and research tasks across compatible AI coding agents.

The skills are designed to be reusable across projects and, where supported, across different agent tools such as Codex, OpenCode, Claude Code, Cursor, GitHub Copilot, and other Agent Skills-compatible tools.

## Available Skills

### `fact-verifier`

Provides evidence-based fact-checking for statements, pasted articles, accessible article URLs, and AI-generated answers, with `quick`, `standard`, and `deep` modes that share the same evidence standard.

It covers:

- Atomic claim extraction that preserves negation, quantifiers, baselines, time, place, and the original degree of certainty
- Web evidence retrieval with counter-searches and source lineage tracing
- Verdicts kept separate from evidence quality, argument quality, and verification confidence
- Conditional argument and persuasion analysis, with `unverified` kept distinct from `false`
- Evidence-backed correction suggestions and revision tracking of prior reports
- Structured v0.3 reports with a local Node.js validator and synthetic behavioral evaluation cases

Online verification requires a real search or browser tool in the host agent; the skill does not bundle or require a specific search provider.

Skill source:

```text
skills/fact-verifier/SKILL.md
```

### `jsdoc-generation`

Provides consistent JSDoc generation standards for TypeScript, JavaScript, JSX, TSX, Vue, MTS, CTS, MJS, and CJS source files.

It defines guidelines for:

- Module-level declarations
- Function parameters and return values
- Interfaces and type fields
- Comment quality
- Local-scope documentation
- Maintaining existing JSDoc when code changes

Skill source:

```text
skills/jsdoc-generation/SKILL.md
```

## Installation

Install skills using the `skills` CLI.

### Install a specific skill

```bash
npx skills add RuixeWolf/skills --skill fact-verifier
npx skills add RuixeWolf/skills --skill jsdoc-generation
```

### Install globally

```bash
npx skills add RuixeWolf/skills --skill jsdoc-generation -g
```

### List available skills

```bash
npx skills add RuixeWolf/skills --list
```

As more skills are added, they can be installed individually using the same repository source and the corresponding skill name.

## Repository Structure

```text
skills/
├── README.md
└── skills/
    ├── fact-verifier/
    │   ├── SKILL.md
    │   ├── README.md
    │   ├── references/
    │   ├── scripts/
    │   ├── evals/
    │   ├── tests/
    │   └── package.json
    └── jsdoc-generation/
        └── SKILL.md
```

Future skills will follow the same structure:

```text
skills/
├── fact-verifier/
│   ├── SKILL.md
│   └── ...
├── jsdoc-generation/
│   └── SKILL.md
└── another-skill/
    └── SKILL.md
```

Each skill is self-contained in its own directory and uses `SKILL.md` as its entry point. Supporting files such as `references/`, `scripts/`, `evals/`, and `tests/` live alongside it within the skill directory.

## Design Principles

Skills in this repository generally follow these principles:

- **Reusable** — avoid project-specific assumptions unless the skill explicitly targets a particular stack.
- **Focused** — each skill should solve a clear and limited problem.
- **Practical** — instructions should improve real development workflows rather than add unnecessary ceremony.
- **Concise** — keep agent context efficient and avoid redundant guidance.
- **Compatible** — prefer conventions that can be shared across multiple AI coding agents.
- **Maintainable** — skills should be easy to update independently as tools and workflows evolve.

## Using Skills Globally

For agents that support shared Agent Skills directories, skills may also be stored globally under:

```text
~/.agents/skills/
```

For example:

```text
~/.agents/skills/
└── jsdoc-generation/
    └── SKILL.md
```

The exact discovery and loading behavior depends on the agent being used.

## Compatibility

Agent Skills support varies between tools.

Some agents can discover skills from a shared `.agents/skills` directory, while others may use their own configuration paths or require explicit installation.

The skill contents in this repository are intentionally kept as portable as possible, but individual agents may differ in:

- Skill discovery
- Automatic skill selection
- Instruction priority
- Global versus project-level loading
- Supported frontmatter fields

Always refer to the documentation of the agent you are using when configuring global or project-level skills.

## Development

### Formatting

The repository is formatted with [Prettier](https://prettier.io/). Node.js 24+ and npm are required.

```bash
npm ci                # Install the formatter
npm run format        # Format all files
npm run format:check  # Check formatting without writing
```

Indentation, line endings, and whitespace rules come from `.editorconfig`; Prettier-specific options live in `.prettierrc.json`. CI runs `npm run format:check` on every push and pull request.

Package management is standardized on npm: only `package-lock.json` files are committed, and lockfile URLs stay on the official registry (`registry.npmjs.org`) so the lockfiles remain portable. The root `.npmrc` pins the official registry for the root package; when updating dependencies inside a skill directory such as `skills/fact-verifier`, pass `--registry=https://registry.npmjs.org` to `npm install` so new lockfile entries keep the same source.

### Local Skill Discovery Link

Some agent tools discover project-level skills from a shared `.agents/skills` directory. To support them, the repository maps that path onto the top-level `skills` directory:

```text
.agents/skills -> skills
```

The link is created automatically when dependencies are installed (via the `postinstall` script) and can also be managed manually:

```bash
npm run skills:link    # Create the link (idempotent)
npm run skills:unlink  # Remove the link
```

On Windows the link is a directory junction and needs no administrator rights; on macOS and Linux it is a symbolic link. The link is machine-local and excluded from version control, so there is nothing to commit. If `.agents/skills` already exists as a real directory or file, these commands refuse to touch it and exit with an error.

## Contributing

This is primarily my personal collection of shared Agent Skills, but suggestions, improvements, and bug reports are welcome.

If you find an instruction unclear, overly restrictive, incompatible with a specific agent, or generally improvable, feel free to open an issue or pull request.

When proposing a new skill, prefer:

- One clearly defined responsibility
- A descriptive skill name
- A concise and specific `description`
- Instructions that are broadly reusable
- Minimal assumptions about a specific repository or framework unless intentional

## License

See the repository license for usage and redistribution terms.
