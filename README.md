# orchestrated-squad

Portable orchestration for software-delivery agents across Codex, Claude Code,
OpenCode, Devin CLI, VS Code Copilot Chat, and oh-my-pi.

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
squad install   --target codex|claude|opencode|devin|vscode|omp|all
squad update
squad uninstall
squad doctor
squad list
squad telemetry export|purge|disable|contribute
squad state     init|status|check|transition|annotate|reserve|release
squad gate      <run-id> [--gates lint,test,scope]
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

### Run state and gates

The workflow rules are enforced in code, not only in skill prose
([ADR 0002](docs/adr/0002-guard-de-transicoes.md)):

- `squad/workflows/feature.json` declares the allowed transitions, the
  preconditions of each phase, the cycle transitions and the required gates.
- `squad state transition <run-id> --to <phase> --next "<action>"` is the only
  supported way to change a run. A refused transition exits with code 1 and
  lists its reasons (for example, a required gate that has not passed since the
  last implementation, or a missing review record). Refusals are recorded as
  `transition_refused` events.
- After `max_cycles` review cycles the run must move to `blocked` with a
  reason; a blocked run resumes only to the phase where it stopped.
- Phases can declare a `write_allowlist` (`.workflow/` for read-only phases
  such as `review`, `requirements_review`, `verification` and the debug
  `diagnosis`). Leaving such a phase is refused when any other file changed
  since it started ([ADR 0003](docs/adr/0003-workflow-de-debug-e-allowlist-de-escrita.md)).
- Read-only specialists (product-manager, requirements-reviewer,
  tech-analyst, reviewer, bug-triager) have no write tools in any runtime and
  a `PreToolUse` deny hook (`squad hook read-only`) in Claude Code and VS Code.
  They return their result as text and the root records it with
  `squad state record <run-id> --artifact <name> --stdin`
  ([ADR 0004](docs/adr/0004-especialistas-somente-leitura.md)).
- The **active run** is the one named in `.workflow/active` (set by
  `squad state init` or `activate`, cleared by `complete` or
  `squad state abandon <run-id> --reason …`). Only the active run restricts
  edits through the `phase-guard` hook, so a forgotten run never locks the
  project ([ADR 0006](docs/adr/0006-run-ativa-explicita.md)).
- `squad-debug` has its own graph (`squad/workflows/debug.json`):
  `initialized → diagnosis → diagnosed → complete`.
- `squad gate <run-id>` runs the gates with the commands from
  `.squad/config.yaml`, never commands chosen by an agent. `test` and `scope`
  are always required: a required gate without a command is `blocked`, and
  `scope` fails when a file changed by the run is outside the reserved
  `write_scope` (files already dirty when the run started count only if they
  change again).

Skills and hooks call the **local runtime** installed in `.squad/bin/`
(`node .squad/bin/squad.mjs state|gate|hook …`): no network, no `npx`
latency and always the installed version ([ADR 0005](docs/adr/0005-runtime-local-e-hooks.md)).
`squad doctor` checks that it matches the package version.

### Hooks

| Hook | Scope | Installed in |
|---|---|---|
| `hook read-only` | per agent: read-only specialists | `.claude/agents/*.md`, `.github/agents/*.agent.md` frontmatter, `.codex/agents/*.toml` |
| `hook phase-guard` | global: denies writes outside the active phase's `write_allowlist` | `.claude/settings.json`, `.devin/config.json`, `.codex/hooks.json` |

Codex loads project hooks only from trusted projects and asks you to review
each hook once (`/hooks` in the CLI); a changed hook must be trusted again.
Hook commands use POSIX shell syntax; on Windows they require Git Bash or
Cygwin.

A denial prints a `permissionDecision: deny` JSON on stdout, the reason on
stderr and exits with code 2, so the same command works in Claude Code, VS Code
and Devin CLI. Set `SQUAD_HOOK_LOG=1` to append one line per call (tool,
session, decision; no content) to `.workflow/hook-log.jsonl`, for example to
check whether a harness fires hooks inside subagents.

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
through `/models`; Devin profiles use the configured capability probe. oh-my-pi
agents carry provider-qualified fallback chains (economy: `glm-5.3-flash` →
`gpt-5.6-luna` → `gemini-3.1-flash-lite`; standard: `muse-spark-1.3` →
`gpt-5.6-terra` → `sonnet-5`; premium: `gpt-5.6-sol` → `sonnet-5` → `opus-5`)
validated against live account auth.

Do not treat a model name or price in an old issue, README, or plan as a
runtime guarantee.

## Installed artifacts

| Target | Installed artifacts |
|---|---|
| Codex | `.codex/config.toml`, `.codex/agents/`, `.agents/skills/squad-*/`, `.workflow/` |
| Claude Code | `.claude/agents/`, `.claude/skills/`, merged `.claude/settings.json`, and managed `CLAUDE.md` block |
| OpenCode | `.opencode/agents/`, `.opencode/commands/`, merged `opencode.json`, skills and managed `AGENTS.md` block |
| Devin CLI | `.devin/agents/*/AGENT.md`, skills and managed `AGENTS.md` block |
| VS Code | `.github/agents/` and `.github/skills/` |
| oh-my-pi | `.omp/agents/`, `.omp/commands/`, `.omp/skills/squad-*/` and managed `AGENTS.md` block |

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
| `squad-finish` | Finalize a verified run after an explicit external-action checkpoint |
| `squad-status` | Read the stored run, gates, blockers, and next action |
| `squad-resume`, `squad-next` | Continue a stored run from the recorded next action |
| `squad-yolo` | Drive a bounded feature through all safe phases with minimal interruptions |

Codex, Devin, and VS Code use the portable skills; Claude Code exposes them as
project skills (`/squad-*`); OpenCode exposes matching slash commands
(`/squad-*`). The command name and its state contract do not vary by runtime.

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

`check:drift` also verifies that `.claude/agents/*.md` declare the alias of
their canonical model class (`economy → haiku`, `standard → sonnet`,
`premium → opus`) and that read-only specialists have no write path in any
runtime.

## Roadmap

The planned evolution of the workflow (questions gate, acceptance tests,
fast path, model diversity, metrics, PRs per deliverable slice and dynamic
model routing) is in [docs/PROPOSTA-EVOLUCAO.md](docs/PROPOSTA-EVOLUCAO.md).

Fixtures under `tests/fixtures/` validate the squad itself. They are not
included in the npm package and are never copied into installed projects.

## References

- [Codex CLI](https://help.openai.com/en/articles/11096431)
- [Claude Code subagents](https://code.claude.com/docs/en/sub-agents)
- [OpenCode agents](https://opencode.ai/docs/agents)
- [OpenCode models](https://opencode.ai/docs/models)
- [Devin CLI subagents](https://docs.devin.ai/cli/subagents)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
