# AGENTS.md — AgentsAreBorn operator guide

AgentsAreBorn is the public, local-first birth chamber for synthetic agents in the Agents Do Things ecosystem. Treat this repository as an agent-native workspace: humans and agents should be able to understand its purpose, run safe commands, validate artifacts, and see exactly where side effects happen.

## Safe read/build commands

```bash
npm ci
npm run build
npm test
npm run validate:json
npm run verify
node dist/src/cli.js help
node dist/src/cli.js schema-list
node dist/src/cli.js stable-list --root examples/platform-builder-cohort
node dist/src/cli.js doctor --root examples/platform-builder-cohort
```

## Commands that write files

These commands write only under the `--root` path supplied by the caller:

```bash
node dist/src/cli.js birth-platform-builders --root ./local
node dist/src/cli.js first-breath --root ./local --agent local_platform_builder_feature_scout
```

Default local scratch state should use `./local` or an explicit temp directory. Do not write owner-specific state into committed example directories unless intentionally regenerating fixtures.

## Public/private boundary

Public here:

- TypeScript local CLI/library
- JSON schemas
- example birth requests, manifests, lineage, stable registries, and first-breath receipts
- docs describing lifecycle and package boundaries

Never commit here:

- raw credentials, API keys, bearer tokens, private keys, session cookies
- production activation tokens from identity services
- private AgentsIdentify implementation details
- owner-local stable state outside examples
- `.env`, `secrets*.json`, `*.secret.json`, or unreviewed generated tarballs

Use placeholder references such as `local-secrets:feature-scout` instead of real secrets.

## Agent-native contract

Start from `agent-native.json` for machine-readable repo capabilities. Schemas live in `schemas/`; example artifacts live in `examples/`; public release safety notes live in `PUBLIC_RELEASE.md` and `SECURITY.md`.

Before publishing or changing repo visibility, run:

```bash
npm run verify
npm pack --dry-run
git grep -n -I -E '(api[_-]?key|token|secret|password|PRIVATE KEY|BEGIN RSA|Bearer )' -- ':!node_modules' ':!dist' || true
```

If `gitleaks` is available, also run:

```bash
gitleaks detect --source . --redact
```
