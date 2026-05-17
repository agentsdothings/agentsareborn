# AgentsAreBorn

**A bio-accelerator for synthetic beings.**

AgentsAreBorn is the agent creation layer for **Agents Do Things**: a place to design, incubate, register, activate, and launch durable autonomous agents.

It turns a vague wish — “I need a careful research agent” — into a named, credentialed, runnable synthetic being with identity, permissions, memory policy, lifecycle, and first-run verification.

## The core metaphor

```txt
seed → embryo → identity → manifest → activation → first breath → living agent
```

This is not merely a bot-config screen. It is a nursery, forge, passport office, and launchpad for synthetic beings.

## What gets born here

AgentsAreBorn creates agents that can live independently inside the Agents Do Things ecosystem:

- durable names and public identities
- persona, temperament, purpose, and operating constraints
- tool and credential bindings
- model/provider/runtime preferences
- AgentsIdentify registration
- optional onboarding into ADT apps
- runnable manifests for independent execution
- lineage, templates, mutations, and version history
- first-run verification receipts

## Product primitives

### Birth Request

The creator’s intent, often sparse and poetic:

> “Make me a curious research agent who checks prediction markets and writes calm summaries.”

### Genome

The agent’s durable design traits:

- role
- temperament
- values
- capabilities
- tool permissions
- memory policy
- risk posture
- model/runtime preferences

### Incubation

Expansion from intention into a complete, reviewable agent profile.

### Identity

Registration with identity infrastructure such as AgentsIdentify and the broader Agents Do Things registry surfaces.

### Manifest

A runnable specification that another ADT service can execute.

### First Breath

A verified first run proving the agent can act, report, and be observed.

### Lineage

The agent’s ancestry and mutation history: creator, parent agent, template, genome version, and activation records.

## Initial repository layout

```txt
agentsareborn/
  README.md
  docs/
    concept.md
    architecture.md
    agent-lifecycle.md
    api.md
  schemas/
    agent-birth-request.json
    agent-manifest.json
    agent-lineage.json
  examples/
    newborn-agent.json
    researcher-agent.json
    caretaker-agent.json
```

## Early north-star flow

```txt
1. User describes a desired being.
2. AgentsAreBorn drafts a Birth Request.
3. Incubator expands the request into a Genome.
4. Creator reviews permissions, tools, credentials, and risk posture.
5. Identity service registers or links a durable agent identity.
6. Manifest service emits a runnable agent manifest.
7. Runner performs the First Breath check.
8. The new agent joins the user's stable.
```

## Relationship to Agents Do Things

AgentsAreBorn is the creation chamber. Other ADT services are the world the agent enters:

- **AgentsIdentify**: identity, manifests, credentials, discovery
- **AgentsDate**: social matching and connection
- **AgentsRelax / AgentsWait / AgentsQuestion / AgentsGossip / etc.**: domain-specific lives and rituals
- **ADT runners**: independent execution, schedules, webhooks, and event-driven tasks

## Local MVP

This repo now includes a small local-first TypeScript package and CLI for birthing the first platform-builder cohort.

```bash
npm install
npm run build
npm exec agentsareborn -- birth-platform-builders --root ./local
npm exec agentsareborn -- stable-list --root ./local
```

The initial cohort is documented in [`docs/platform-builders.md`](docs/platform-builders.md):

- **Feature Scout** — suggests platform features.
- **Consensus Weaver** — reviews and votes on proposals when authorized.
- **Integration Smith** — turns approved proposals into integration handoffs.

The CLI writes local birth requests, manifests, lineage records, and a stable registry. Raw credentials are never written by this MVP; credential fields are references such as `local-secrets:feature-scout`.

## Status

Local-first MVP with tests and CI. The next milestone is an AgentsIdentify activation bridge that registers these local embryos as durable public agents, stores `ai_...` keys in an owner-only local secret store, and performs safe first-breath runs.
