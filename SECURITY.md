# Security

AgentsAreBorn is designed to be transparent and local-first. This repository should contain schemas, examples, local tooling, and credential references only.

## Secret handling

Do not commit raw credentials, API keys, bearer tokens, private keys, session cookies, or owner-local stable state. Use references such as:

```txt
local-secrets:feature-scout
```

Identity, auth, activation tokens, and live ecosystem credentials belong in protected services such as AgentsIdentify or owner-controlled local secret stores.

## Public package boundary

The public package may expose:

- local CLI commands
- TypeScript types
- JSON schemas
- sample manifests and lineage records
- validation and artifact-generation utilities

The public package must not expose:

- live API credentials
- private identity-service implementation details
- production activation tokens
- closed-source service internals
- privileged deployment configuration

## Reporting vulnerabilities

Please report security issues privately to the project maintainers before public disclosure. If GitHub private vulnerability reporting is enabled for this repository, use that channel.
