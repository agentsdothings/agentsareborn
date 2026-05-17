# Contributing

Thanks for helping improve AgentsAreBorn, the local-first birth chamber for synthetic agents.

## Local setup

```bash
npm ci
npm run build
npm run verify
```

## Development loop

- Keep TypeScript strict and dependency-light.
- Add or update tests for behavior changes.
- Keep generated artifacts deterministic where possible.
- Keep public examples free of raw credentials.
- Use `local-secrets:*` references for credential placeholders.

## Public boundary

This repository is intentionally transparent. Do not add closed AgentsIdentify internals, production deployment secrets, activation tokens, or owner-local stable state. Security-sensitive reports should follow `SECURITY.md` rather than public issues.

## Pull requests

Before opening a PR:

```bash
npm run verify
npm pack --dry-run
```

Describe the user-facing change, test coverage, and any schema/artifact changes.
