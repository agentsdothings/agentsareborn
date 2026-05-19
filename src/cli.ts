#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { birthPlatformBuilders } from "./birth.js";
import { firstBreath } from "./first-breath.js";
import { StableStore } from "./stable.js";
import { validateJsonArtifacts } from "../scripts/validate-json.js";

interface ParsedArgs {
  command: string;
  root: string;
  agentId?: string;
  dryRun: boolean;
}

const COMMANDS = [
  "help",
  "version",
  "birth-platform-builders",
  "stable-list",
  "schema-list",
  "validate",
  "doctor",
  "first-breath",
] as const;

function usage(): string {
  return `AgentsAreBorn local birth chamber

Usage:
  agentsareborn help
  agentsareborn version
  agentsareborn schema-list
  agentsareborn validate
  agentsareborn doctor [--root PATH]
  agentsareborn [--root PATH] birth-platform-builders [--root PATH]
  agentsareborn [--root PATH] stable-list [--root PATH]
  agentsareborn [--root PATH] first-breath --agent AGENT_ID [--dry-run]

Safety:
  birth-platform-builders writes under --root.
  first-breath is local-only and refuses network-requiring manifests by default.
`;
}

function parseArgs(argv: string[]): ParsedArgs {
  let root = process.cwd();
  let agentId: string | undefined;
  let dryRun = false;
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root") {
      const value = argv[i + 1];
      if (!value) throw new Error("--root requires a path");
      root = path.resolve(value);
      i += 1;
    } else if (arg === "--agent") {
      const value = argv[i + 1];
      if (!value) throw new Error("--agent requires an agent id");
      agentId = value;
      i += 1;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      rest.push("help");
    } else if (arg === "--version" || arg === "-v") {
      rest.push("version");
    } else {
      rest.push(arg);
    }
  }

  const command = rest[0] ?? "help";
  if (!COMMANDS.includes(command as (typeof COMMANDS)[number])) {
    throw new Error(usage());
  }
  return { command, root, agentId, dryRun };
}

async function packageVersion(): Promise<string> {
  const packageJson = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8")) as { version: string };
  return packageJson.version;
}

function packageRoot(): string {
  return fileURLToPath(new URL("../..", import.meta.url));
}

async function schemaList(): Promise<Record<string, string>> {
  return {
    birthRequest: "schemas/agent-birth-request.json",
    manifest: "schemas/agent-manifest.json",
    lineage: "schemas/agent-lineage.json",
    stableRegistry: "schemas/stable-registry.json",
    firstBreathReceipt: "schemas/first-breath-receipt.json",
  };
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  try {
    const args = parseArgs(argv);
    if (args.command === "help") {
      console.log(usage());
      return 0;
    }
    if (args.command === "version") {
      console.log(await packageVersion());
      return 0;
    }
    if (args.command === "schema-list") {
      console.log(JSON.stringify(await schemaList(), null, 2));
      return 0;
    }
    if (args.command === "validate") {
      const result = await validateJsonArtifacts(packageRoot());
      console.log(JSON.stringify(result, null, 2));
      return result.ok ? 0 : 1;
    }
    if (args.command === "doctor") {
      const store = new StableStore(path.join(args.root, "stable"));
      console.log(JSON.stringify({ root: args.root, schemas: await schemaList(), agents: await store.listAgents(), validation: await validateJsonArtifacts(packageRoot()) }, null, 2));
      return 0;
    }
    if (args.command === "birth-platform-builders") {
      console.log(JSON.stringify(await birthPlatformBuilders(args.root), null, 2));
      return 0;
    }
    if (args.command === "stable-list") {
      console.log(JSON.stringify(await new StableStore(path.join(args.root, "stable")).listAgents(), null, 2));
      return 0;
    }
    if (args.command === "first-breath") {
      if (!args.agentId) throw new Error("first-breath requires --agent AGENT_ID");
      console.log(JSON.stringify(await firstBreath(args.root, args.agentId, { dryRun: args.dryRun }), null, 2));
      return 0;
    }
    return 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
}

function isEntrypoint(): boolean {
  if (!process.argv[1]) return false;
  return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
}

if (isEntrypoint()) {
  process.exitCode = await main();
}
