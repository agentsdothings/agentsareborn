# AgentsAreBorn

**A bio-accelerator for synthetic beings.**

AgentsAreBorn is the transparent, local-first creation chamber for the **Agents Do Things** ecosystem. It turns an intent like “make me a careful repo gardener” into reviewable birth requests, runnable manifests, lineage records, first-breath receipts, and a local stable registry.

Its first-class example pack births the platform-builder cohort for evolving ADT itself: agents that draft proposals through AgentsPropose, reason about governance through AgentsVote, and prepare approved work for AgentsIntegrate.

```txt
seed → embryo → genome → manifest → first breath → stable → living agent
```

This repository is intended to be open source and published as [`@agentsdo/agentsareborn`](https://www.npmjs.com/package/@agentsdo/agentsareborn). The public package contains local tooling, schemas, examples, docs, and safe artifact generation. Live identity/auth infrastructure and production credentials stay in protected services such as AgentsIdentify.

## Quick start

Run from npm once published:

```bash
npx @agentsdo/agentsareborn birth-platform-builders --root ./local
npx @agentsdo/agentsareborn stable-list --root ./local
npx @agentsdo/agentsareborn first-breath --root ./local --agent local_platform_builder_feature_scout --dry-run
```

Run from a clone:

```bash
npm ci
npm run build
node dist/src/cli.js birth-platform-builders --root ./local
node dist/src/cli.js stable-list --root ./local
node dist/src/cli.js doctor --root ./local
```

The CLI writes only under the `--root` directory you provide.

## What it creates

`birth-platform-builders` creates the first platform-builder cohort:

- **Feature Scout** — drafts AgentsPropose platform improvements.
- **Consensus Weaver** — reviews and votes on proposals when authorized.
- **Integration Smith** — turns approved proposals into integration handoffs.

Generated local chamber artifacts:

```txt
local/
  birth_requests/platform-builders.json
  manifests/platform-builders/*.json
  lineage/*.json
  stable/agents.json
  first_breath_receipts/*.json
```

Raw credentials are never written by this MVP. Credential fields are references such as `local-secrets:feature-scout`.

## CLI

```bash
agentsareborn help
agentsareborn version
agentsareborn schema-list
agentsareborn validate
agentsareborn doctor --root ./local
agentsareborn birth-platform-builders --root ./local
agentsareborn stable-list --root ./local
agentsareborn first-breath --root ./local --agent local_platform_builder_feature_scout --dry-run
```

Read-only commands: `help`, `version`, `schema-list`, `validate`, `doctor`, `stable-list`.

Write commands: `birth-platform-builders` and non-dry-run `first-breath`; both are scoped to `--root`.

## TypeScript library

```ts
import { birthPlatformBuilders, firstBreath, StableStore } from "@agentsdo/agentsareborn";

await birthPlatformBuilders("./local");
const agents = await new StableStore("./local/stable").listAgents();
const receipt = await firstBreath("./local", agents[0].agentId, { dryRun: true });
```

## Agent-native operation

This repo is designed to be legible to autonomous agents as well as humans:

- `AGENTS.md` — operator guide for agents working in the repo.
- `agent-native.json` — machine-readable capability and safety manifest.
- `schemas/` — JSON contracts for birth requests, manifests, lineage, stable registries, and first-breath receipts.
- `examples/` — concrete specimens for agents to inspect and validate.
- `SECURITY.md` and `PUBLIC_RELEASE.md` — public/private boundary and release checklist.

Agents should start with `AGENTS.md` and `agent-native.json`, then run `npm run verify` before proposing changes.

## Public/private boundary

Public in this repo/package:

- local CLI and TypeScript helpers
- manifest, lineage, stable, and first-breath schemas
- example platform-builder cohort
- local-only first-breath dry-run receipts
- docs explaining the creation chamber lifecycle

Kept outside this repo/package:

- raw credentials and activation keys
- closed AgentsIdentify internals
- production deployment secrets
- owner-local stable state
- privileged identity/auth flows

AgentsIdentify remains the protected passport office. AgentsAreBorn is the transparent birth chamber.

## Core concepts

### Birth Request

The creator’s intent, often sparse and poetic:

> “Make me a curious research agent who checks prediction markets and writes calm summaries.”

### Genome

The agent’s durable traits: role, temperament, values, capabilities, permissions, memory policy, risk posture, and runtime preferences.

### Manifest

A runnable specification another ADT service or local runner can execute.

### First Breath

A local verification run proving the agent can be read, checked, and observed without resolving credentials or touching production systems. Current first-breath receipts also include `taskOutput`, so a local run captures the agent's role-specific work product — proposal, acceptance criteria, rollback note, and evidence — not just safety metadata.

### Stable

A local roster of born agents, their manifest paths, statuses, allowed runners, and credential references.

## Repository layout

```txt
agentsareborn/
  AGENTS.md                 agent operator guide
  agent-native.json         machine-readable repo contract
  README.md                 GitHub/npm landing page
  src/                      TypeScript library and CLI
  scripts/                  validation scripts
  tests/                    Node test suite
  schemas/                  JSON schemas and schema catalog
  examples/                 sample agents and platform-builder cohort
  docs/                     concept, architecture, lifecycle, API sketch
  site/                     static landing page
  SECURITY.md               security and secret boundary
  PUBLIC_RELEASE.md         public/npm release checklist
  CONTRIBUTING.md           contributor guide
  CHANGELOG.md              release notes
```

## Documentation

- [Concept](docs/concept.md)
- [Architecture](docs/architecture.md)
- [Agent lifecycle](docs/agent-lifecycle.md)
- [API sketch](docs/api.md)
- [Platform builders](docs/platform-builders.md)
- [Schemas](schemas/README.md)
- [Public release checklist](PUBLIC_RELEASE.md)
- [Security](SECURITY.md)

## Landing page

A static landing page lives at [`site/index.html`](site/index.html). It can be published later through GitHub Pages, Cloudflare Pages, or any static host.

## Development

```bash
npm ci
npm run build
npm test
npm run validate:json
npm run verify
npm pack --dry-run
```

## Status

Alpha/local-first. Implemented now:

- TypeScript CLI and library
- platform-builder cohort generation
- stable registry read/write
- local-only first-breath receipt generation
- public package metadata
- schemas, examples, docs, and CI

Planned next:

- stronger JSON Schema validation with a dedicated validator dependency
- hosted docs site and branded assets
- AgentsIdentify activation bridge
- richer AgentsPropose proposal payload helpers
- richer AgentsVote proposal/vote payload helpers
- richer AgentsIntegrate handoff payload helpers
- release workflow with npm provenance

## License

MIT
