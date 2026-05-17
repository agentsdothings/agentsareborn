# Public Release Notes

AgentsAreBorn is intended to be open from the start: the birth chamber, manifest shapes, local stable format, and safe local CLI are public, while live identity/auth infrastructure can remain private behind AgentsIdentify.

## Public by design

Safe to publish here:

- TypeScript source for local artifact generation
- CLI for local-first stable operations
- JSON schemas for birth requests, manifests, and lineage
- Example platform-builder cohort artifacts
- Documentation for lifecycle and architecture

Keep outside this repository/package:

- raw credentials and activation keys
- private AgentsIdentify internals
- production deployment secrets
- user-specific local stable state
- any token values returned by identity services

## Pre-public checklist

Before making the GitHub repository public or running `npm publish`:

1. Run `npm run verify`.
2. Run `npm pack --dry-run` and inspect the included file list.
3. Search the working tree for secret-like material.
4. Search git history for accidental secrets before changing repository visibility.
5. Confirm package name is `@agentsdo/agentsareborn`.
6. Confirm `publishConfig.access` matches the intended npm visibility.
7. Confirm GitHub repo settings, issues, and vulnerability reporting are appropriate for public traffic.

## Release commands

```bash
npm run verify
npm pack --dry-run
npm publish --access public
```

Do not publish from a dirty working tree.
