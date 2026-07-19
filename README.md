# orchestrated-squad

Portable orchestration for software-delivery agents across Codex, Claude Code,
OpenCode, Devin CLI, and VS Code Copilot Chat.

The package installs runtime-native agent definitions and portable workflow
skills without replacing project instructions. `.workflow/` is the canonical,
resumable state; chat history is never the source of truth.

## Install

Run the interactive installer from the project to configure:

```bash
npx @gregori/orchestrated-squad@latest
```

For reproducible automation, pin the package version and choose a target:

```bash
npx @gregori/orchestrated-squad@latest install --target codex --yes
npx @gregori/orchestrated-squad@latest install --target all --yes
```

The default installation initializes `.squad/config.yaml`, `.workflow/`, and a
delimited managed block in `AGENTS.md` or `CLAUDE.md`. Use `--no-init` to copy
only runtime artifacts.

```text
squad install   --target codex|claude|opencode|devin|vscode|all
squad update
squad uninstall
squad doctor
squad list
squad telemetry export|purge|disable|contribute
```

`install.sh` and `install.ps1` are compatibility wrappers over the same Node
core. Run `squad doctor` before relying on a configured runtime or model.

## Workflow

```text
requirements → requirements review → design → planned
→ implementation → deterministic checks → review
→ test authoring (when needed) → verification → ready to finish → complete
```

The root session orchestrates the workflow. Specialists are direct children;
they return a compact result and update `.workflow/` before handoff. Writers
can run in parallel only with disjoint `write_scope` reservations. Reviews are
limited to two cycles.

Deterministic gates run lint, builds, tests, Git, and tracker preparation.
They are not separate LLM agents.

## Model policy

Model IDs change faster than workflow semantics. The canonical policy in
[`squad/models.yaml`](./squad/models.yaml) classifies work instead of hard
coding provider prices or historical model names:

| Class | Use |
|---|---|
| `deterministic` | No LLM: gates, checks, Git and mechanical publishing steps |
| `economy` | Derived documentation and tightly structured transformations |
| `standard` | Bounded requirements, implementation and test authoring |
| `premium` | Architecture ambiguity, security, migrations, production, debugging and critical review |

Renderers resolve these classes to the models available in each account and
runtime. `doctor` must reject unavailable choices rather than inventing a
fallback. Claude Code agent definitions use the documented aliases `haiku`,
`sonnet`, and `opus`; OpenCode users should select an available provider/model
through `/models`; Devin profiles use the configured capability probe.

Do not treat a model name or price in an old issue, README, or plan as a
runtime guarantee.

## Installed artifacts

| Target | Installed artifacts |
|---|---|
| Codex | `.codex/config.toml`, `.codex/agents/`, `.agents/skills/squad-*/`, `.workflow/` |
| Claude Code | `.claude/agents/`, merged `.claude/settings.json`, skills and managed `CLAUDE.md` block |
| OpenCode | `.opencode/agents/`, merged `opencode.json`, skills and managed `AGENTS.md` block |
| Devin CLI | `.devin/agents/*/AGENT.md`, skills and managed `AGENTS.md` block |
| VS Code | `.github/agents/` and `.github/skills/` |

The installer records owned files in `.squad/install-manifest.json`. `update`
preserves user changes and `uninstall` removes only unchanged, recorded files.
Use `--dry-run` to inspect every write first.

## Commands

The portable workflow commands have the same arguments across runtimes:

| Command | Purpose |
|---|---|
| `squad-init` | Inspect a project, record confirmed discoveries, then initialize state |
| `squad-feature` | Refine and implement a bounded feature or epic |
| `squad-plan` | Requirements, review and architecture without code changes |
| `squad-execute` | Execute an approved plan in dependency waves |
| `squad-review` | Run gates and an independent read-only review |
| `squad-test` | Author missing tests and run deterministic gates |
| `squad-debug --diagnose` | Investigate a bug without editing files |
| `squad-next`, `squad-status`, `squad-resume` | Read or continue a stored run |

Codex and Devin use skills, Claude Code uses skills/commands, and OpenCode uses
commands. The syntax varies by runtime; the command name and its state contract
do not.

## Local telemetry

Telemetry is local and opt-in for sharing. It records only operational
metadata such as duration, runtime, model class, gate outcome, and tokens/cost
when exposed. It never records prompts, diffs, file contents, secrets, branch
names, repository names, or absolute paths.

`squad telemetry contribute` opens a pull request with a sanitized aggregate
payload after at least five runs. The default upstream is
[`gregori/orchestrated-squad-metrics`](https://github.com/gregori/orchestrated-squad-metrics);
use `--repo owner/name` to select another repository. It requires authenticated
GitHub CLI access and preserves maintainer review before any merge.

## Development

```bash
npm run lint
npm test
npm run validate:contracts
npm run check:drift
npm pack --dry-run
```

Fixtures under `tests/fixtures/` validate the squad itself. They are not
included in the npm package and are never copied into installed projects.

## References

- [Codex CLI](https://help.openai.com/en/articles/11096431)
- [Claude Code subagents](https://code.claude.com/docs/en/sub-agents)
- [OpenCode agents](https://opencode.ai/docs/agents)
- [OpenCode models](https://opencode.ai/docs/models)
- [Devin CLI subagents](https://docs.devin.ai/cli/subagents)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
