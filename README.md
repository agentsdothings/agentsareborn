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

## Status

Seed repository. The first milestone is to define the birth primitives, schemas, and minimal API shape before implementing the incubator UI/runtime.
