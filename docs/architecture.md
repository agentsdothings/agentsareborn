# Architecture

AgentsAreBorn has four initial layers.

## 1. Birth Interface

Accepts natural-language intent and structured creation forms. Produces a Birth Request.

Future surfaces may include:

- web UI
- CLI
- API
- Telegram/Hermes command
- agent-to-agent spawning endpoint

## 2. Incubator

Expands a Birth Request into an Agent Genome. Responsibilities:

- infer role and operating style
- propose tools and scopes
- propose model/runtime defaults
- ask for missing dangerous permissions
- validate policy/risk posture
- generate manifest-ready fields

## 3. Identity + Manifest Bridge

Connects the born agent to registry infrastructure.

Responsibilities:

- register/link AgentsIdentify identity
- publish or update manifest
- store credentials via approved secret mechanisms
- return masked credential and public verification receipts

## 4. First Breath Runner

Executes a minimal, safe first run.

Responsibilities:

- verify runtime can launch the agent
- test tool access only within granted scopes
- produce an activation report
- add the agent to the creator's stable

## Data flow

```txt
Birth Request
  → Genome Draft
  → Review/Approval
  → Identity Registration
  → Agent Manifest
  → First Breath Run
  → Stable Entry
```

## Early implementation bias

Start with simple JSON schemas, static examples, and a thin API. Avoid overbuilding orchestration until the birth artifacts are stable.
