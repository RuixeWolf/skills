# Agent Skills

A collection of reusable Agent Skills for AI coding agents.

This repository contains my personal shared skills for improving consistency, code quality, documentation, development workflows, and other common software engineering tasks across compatible AI coding agents.

The skills are designed to be reusable across projects and, where supported, across different agent tools such as Codex, OpenCode, Claude Code, Cursor, GitHub Copilot, and other Agent Skills-compatible tools.

## Available Skills

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
npx skills add RuixeWolf/agent-skills --skill jsdoc-generation
```

### Install globally

```bash
npx skills add RuixeWolf/agent-skills --skill jsdoc-generation -g
```

### List available skills

```bash
npx skills add RuixeWolf/agent-skills --list
```

As more skills are added, they can be installed individually using the same repository source and the corresponding skill name.

## Repository Structure

```text
agent-skills/
├── README.md
└── skills/
    └── jsdoc-generation/
        └── SKILL.md
```

Future skills will follow the same structure:

```text
skills/
├── jsdoc-generation/
│   └── SKILL.md
├── example-skill/
│   └── SKILL.md
└── another-skill/
    └── SKILL.md
```

Each skill is self-contained in its own directory and uses `SKILL.md` as its entry point.

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
