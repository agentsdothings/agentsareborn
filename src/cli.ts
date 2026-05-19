#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runAdtAction, safeAdtActionReceipt } from "./adt-action-runner.js";
import { buildAdtAuthContext, safeAdtAuthContext } from "./auth-bridge.js";
import { birthPlatformBuilders } from "./birth.js";
import { firstBreath } from "./first-breath.js";
import { consensusWeaverVote, featureScoutPropose, integrationSmithQueue } from "./role-actions.js";
import { StableStore } from "./stable.js";
import { validateJsonArtifacts } from "../scripts/validate-json.js";

interface ParsedArgs {
  command: string;
  subcommand?: string;
  root: string;
  agentId?: string;
  appSlug?: string;
  endpointPath?: string;
  payloadPath?: string;
  secretsPath?: string;
  execute: boolean;
  dryRun: boolean;
  targetProduct?: string;
  domainId?: string;
  generatorId?: string;
  generatorName?: string;
  summary?: string;
  description?: string;
  ownerKind?: string;
  ownerSystem?: string;
  ownerId?: string;
  ballotId?: string;
  choice?: "yes" | "no";
  rationale?: string;
  title?: string;
  source?: string;
  sourceApp?: string;
  sourceProposalId?: string;
  targetApp?: string;
  targetDomain?: string;
  specVersion?: string;
  proposalPayloadPath?: string;
  acceptanceCriteria: string[];
  evidence: string[];
  concerns: string[];
  checklist: string[];
  outputFields: string[];
  strategies: string[];
  sampleRecordPaths: string[];
  rationaleNotes: string[];
  rollbackNote?: string;
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
  "auth-context",
  "adt-action",
  "feature-scout",
  "consensus-weaver",
  "integration-smith",
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
  agentsareborn [--root PATH] auth-context --agent AGENT_ID --app APP_SLUG [--secrets PATH]
  agentsareborn [--root PATH] adt-action --agent AGENT_ID --app APP_SLUG --endpoint PATH --payload FILE [--execute] [--secrets PATH]
  agentsareborn [--root PATH] feature-scout propose --target-product PRODUCT --domain DOMAIN --generator-id ID --generator-name NAME --summary TEXT [--owner-kind KIND --owner-system SYSTEM --owner-id ID] [--description TEXT] [--output-field name:type:description...] [--strategy TEXT...] [--sample-record FILE...] [--rationale-note TEXT...] [--acceptance TEXT...] [--rollback TEXT] [--evidence TEXT...] [--execute] [--secrets PATH]
  agentsareborn [--root PATH] consensus-weaver vote --ballot BALLOT_ID --choice yes|no --rationale TEXT [--concern TEXT...] [--execute] [--secrets PATH]
  agentsareborn [--root PATH] integration-smith integrate --ballot BALLOT_ID --title TEXT --summary TEXT [--source-app APP --source-proposal-id ID --target-app APP --target-domain DOMAIN --spec-version VERSION] [--owner-kind KIND --owner-system SYSTEM --owner-id ID] [--proposal-payload FILE] [--checklist TEXT...] [--execute] [--secrets PATH]

Safety:
  birth-platform-builders writes under --root.
  first-breath is local-only and refuses network-requiring manifests by default.
  auth-context prints a masked AgentsIdentify bearer context; it never prints raw API keys.
  adt-action and role commands dry-run by default; pass --execute to send the request.
`;
}

function parseArgs(argv: string[]): ParsedArgs {
  let root = process.cwd();
  let agentId: string | undefined;
  let appSlug: string | undefined;
  let endpointPath: string | undefined;
  let payloadPath: string | undefined;
  let secretsPath: string | undefined;
  let execute = false;
  let dryRun = false;
  let targetProduct: string | undefined;
  let domainId: string | undefined;
  let generatorId: string | undefined;
  let generatorName: string | undefined;
  let summary: string | undefined;
  let description: string | undefined;
  let ownerKind: string | undefined;
  let ownerSystem: string | undefined;
  let ownerId: string | undefined;
  let ballotId: string | undefined;
  let choice: "yes" | "no" | undefined;
  let rationale: string | undefined;
  let title: string | undefined;
  let source: string | undefined;
  let sourceApp: string | undefined;
  let sourceProposalId: string | undefined;
  let targetApp: string | undefined;
  let targetDomain: string | undefined;
  let specVersion: string | undefined;
  let proposalPayloadPath: string | undefined;
  let rollbackNote: string | undefined;
  const acceptanceCriteria: string[] = [];
  const evidence: string[] = [];
  const concerns: string[] = [];
  const checklist: string[] = [];
  const outputFields: string[] = [];
  const strategies: string[] = [];
  const sampleRecordPaths: string[] = [];
  const rationaleNotes: string[] = [];
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
    } else if (arg === "--app") {
      const value = argv[i + 1];
      if (!value) throw new Error("--app requires an ADT app slug");
      appSlug = value;
      i += 1;
    } else if (arg === "--endpoint") {
      const value = argv[i + 1];
      if (!value) throw new Error("--endpoint requires a path");
      endpointPath = value;
      i += 1;
    } else if (arg === "--payload") {
      const value = argv[i + 1];
      if (!value) throw new Error("--payload requires a file path");
      payloadPath = path.resolve(value);
      i += 1;
    } else if (arg === "--secrets") {
      const value = argv[i + 1];
      if (!value) throw new Error("--secrets requires a path");
      secretsPath = path.resolve(value);
      i += 1;
    } else if (arg === "--target-product") {
      const value = argv[i + 1];
      if (!value) throw new Error("--target-product requires a value");
      targetProduct = value;
      i += 1;
    } else if (arg === "--domain") {
      const value = argv[i + 1];
      if (!value) throw new Error("--domain requires a value");
      domainId = value;
      i += 1;
    } else if (arg === "--generator-id") {
      const value = argv[i + 1];
      if (!value) throw new Error("--generator-id requires a value");
      generatorId = value;
      i += 1;
    } else if (arg === "--generator-name") {
      const value = argv[i + 1];
      if (!value) throw new Error("--generator-name requires a value");
      generatorName = value;
      i += 1;
    } else if (arg === "--summary") {
      const value = argv[i + 1];
      if (!value) throw new Error("--summary requires a value");
      summary = value;
      i += 1;
    } else if (arg === "--description") {
      const value = argv[i + 1];
      if (!value) throw new Error("--description requires a value");
      description = value;
      i += 1;
    } else if (arg === "--owner-kind") {
      const value = argv[i + 1];
      if (!value) throw new Error("--owner-kind requires a value");
      ownerKind = value;
      i += 1;
    } else if (arg === "--owner-system") {
      const value = argv[i + 1];
      if (!value) throw new Error("--owner-system requires a value");
      ownerSystem = value;
      i += 1;
    } else if (arg === "--owner-id") {
      const value = argv[i + 1];
      if (!value) throw new Error("--owner-id requires a value");
      ownerId = value;
      i += 1;
    } else if (arg === "--output-field") {
      const value = argv[i + 1];
      if (!value) throw new Error("--output-field requires name:type:description");
      outputFields.push(value);
      i += 1;
    } else if (arg === "--strategy") {
      const value = argv[i + 1];
      if (!value) throw new Error("--strategy requires a value");
      strategies.push(value);
      i += 1;
    } else if (arg === "--sample-record") {
      const value = argv[i + 1];
      if (!value) throw new Error("--sample-record requires a JSON file path");
      sampleRecordPaths.push(path.resolve(value));
      i += 1;
    } else if (arg === "--rationale-note") {
      const value = argv[i + 1];
      if (!value) throw new Error("--rationale-note requires a value");
      rationaleNotes.push(value);
      i += 1;
    } else if (arg === "--acceptance") {
      const value = argv[i + 1];
      if (!value) throw new Error("--acceptance requires a value");
      acceptanceCriteria.push(value);
      i += 1;
    } else if (arg === "--rollback") {
      const value = argv[i + 1];
      if (!value) throw new Error("--rollback requires a value");
      rollbackNote = value;
      i += 1;
    } else if (arg === "--evidence") {
      const value = argv[i + 1];
      if (!value) throw new Error("--evidence requires a value");
      evidence.push(value);
      i += 1;
    } else if (arg === "--ballot") {
      const value = argv[i + 1];
      if (!value) throw new Error("--ballot requires an id");
      ballotId = value;
      i += 1;
    } else if (arg === "--choice") {
      const value = argv[i + 1];
      if (value !== "yes" && value !== "no") throw new Error("--choice must be yes or no");
      choice = value;
      i += 1;
    } else if (arg === "--rationale") {
      const value = argv[i + 1];
      if (!value) throw new Error("--rationale requires a value");
      rationale = value;
      i += 1;
    } else if (arg === "--concern") {
      const value = argv[i + 1];
      if (!value) throw new Error("--concern requires a value");
      concerns.push(value);
      i += 1;
    } else if (arg === "--title") {
      const value = argv[i + 1];
      if (!value) throw new Error("--title requires a value");
      title = value;
      i += 1;
    } else if (arg === "--source") {
      const value = argv[i + 1];
      if (!value) throw new Error("--source requires a value");
      source = value;
      i += 1;
    } else if (arg === "--source-app") {
      const value = argv[i + 1];
      if (!value) throw new Error("--source-app requires a value");
      sourceApp = value;
      i += 1;
    } else if (arg === "--source-proposal-id") {
      const value = argv[i + 1];
      if (!value) throw new Error("--source-proposal-id requires a value");
      sourceProposalId = value;
      i += 1;
    } else if (arg === "--target-app") {
      const value = argv[i + 1];
      if (!value) throw new Error("--target-app requires a value");
      targetApp = value;
      i += 1;
    } else if (arg === "--target-domain") {
      const value = argv[i + 1];
      if (!value) throw new Error("--target-domain requires a value");
      targetDomain = value;
      i += 1;
    } else if (arg === "--spec-version") {
      const value = argv[i + 1];
      if (!value) throw new Error("--spec-version requires a value");
      specVersion = value;
      i += 1;
    } else if (arg === "--proposal-payload") {
      const value = argv[i + 1];
      if (!value) throw new Error("--proposal-payload requires a JSON file path");
      proposalPayloadPath = path.resolve(value);
      i += 1;
    } else if (arg === "--checklist") {
      const value = argv[i + 1];
      if (!value) throw new Error("--checklist requires a value");
      checklist.push(value);
      i += 1;
    } else if (arg === "--execute") {
      execute = true;
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
  const subcommand = rest[1];
  if (!COMMANDS.includes(command as (typeof COMMANDS)[number])) {
    throw new Error(usage());
  }
  return {
    command,
    subcommand,
    root,
    agentId,
    appSlug,
    endpointPath,
    payloadPath,
    secretsPath,
    execute,
    dryRun,
    targetProduct,
    domainId,
    generatorId,
    generatorName,
    summary,
    description,
    ownerKind,
    ownerSystem,
    ownerId,
    ballotId,
    choice,
    rationale,
    title,
    source,
    sourceApp,
    sourceProposalId,
    targetApp,
    targetDomain,
    specVersion,
    proposalPayloadPath,
    acceptanceCriteria,
    evidence,
    concerns,
    checklist,
    outputFields,
    strategies,
    sampleRecordPaths,
    rationaleNotes,
    rollbackNote,
  };
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

function ownerFromArgs(args: ParsedArgs): { kind: string; system: string; id: string } | undefined {
  if (!args.ownerKind && !args.ownerSystem && !args.ownerId) return undefined;
  return {
    kind: args.ownerKind ?? "",
    system: args.ownerSystem ?? "",
    id: args.ownerId ?? "",
  };
}

function parseOutputField(value: string): { name: string; type: string; description: string } {
  const [name, type, ...descriptionParts] = value.split(":");
  const description = descriptionParts.join(":");
  if (!name || !type || !description) throw new Error("--output-field must be name:type:description");
  return { name, type, description };
}

async function readJsonFile(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readJsonFiles(filePaths: string[]): Promise<Record<string, unknown>[] | undefined> {
  if (filePaths.length === 0) return undefined;
  const records = await Promise.all(filePaths.map(async (filePath) => readJsonFile(filePath)));
  return records.map((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error(`--sample-record must point to a JSON object: ${filePaths[index]}`);
    }
    return record as Record<string, unknown>;
  });
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
    if (args.command === "auth-context") {
      if (!args.agentId) throw new Error("auth-context requires --agent AGENT_ID");
      if (!args.appSlug) throw new Error("auth-context requires --app APP_SLUG");
      const context = await buildAdtAuthContext(args.root, args.agentId, args.appSlug, { secretsPath: args.secretsPath });
      console.log(JSON.stringify(safeAdtAuthContext(context), null, 2));
      return 0;
    }
    if (args.command === "adt-action") {
      if (!args.agentId) throw new Error("adt-action requires --agent AGENT_ID");
      if (!args.appSlug) throw new Error("adt-action requires --app APP_SLUG");
      if (!args.endpointPath) throw new Error("adt-action requires --endpoint PATH");
      const payload = args.payloadPath ? JSON.parse(await readFile(args.payloadPath, "utf8")) : undefined;
      const receipt = await runAdtAction(args.root, {
        agentId: args.agentId,
        appSlug: args.appSlug,
        endpointPath: args.endpointPath,
        payload,
        dryRun: !args.execute,
        secretsPath: args.secretsPath,
        writeReceipt: args.execute,
      });
      console.log(JSON.stringify(safeAdtActionReceipt(receipt), null, 2));
      return receipt.status === "failed" ? 1 : 0;
    }
    if (args.command === "feature-scout") {
      if (args.subcommand !== "propose") throw new Error("feature-scout requires subcommand: propose");
      const receipt = await featureScoutPropose(args.root, {
        targetProduct: args.targetProduct ?? "",
        domainId: args.domainId ?? "",
        generatorId: args.generatorId ?? "",
        generatorName: args.generatorName ?? "",
        summary: args.summary ?? "",
        acceptanceCriteria: args.acceptanceCriteria,
        rollbackNote: args.rollbackNote,
        evidence: args.evidence,
        owner: ownerFromArgs(args),
        description: args.description,
        outputFields: args.outputFields.map(parseOutputField),
        supportedStrategies: args.strategies,
        sampleRecords: await readJsonFiles(args.sampleRecordPaths),
        rationaleNotes: args.rationaleNotes,
        dryRun: !args.execute,
        secretsPath: args.secretsPath,
      });
      console.log(JSON.stringify(safeAdtActionReceipt(receipt), null, 2));
      return receipt.status === "failed" ? 1 : 0;
    }
    if (args.command === "consensus-weaver") {
      if (args.subcommand !== "vote") throw new Error("consensus-weaver requires subcommand: vote");
      const receipt = await consensusWeaverVote(args.root, {
        ballotId: args.ballotId ?? "",
        choice: args.choice ?? "yes",
        rationale: args.rationale ?? "",
        concerns: args.concerns,
        dryRun: !args.execute,
        secretsPath: args.secretsPath,
      });
      console.log(JSON.stringify(safeAdtActionReceipt(receipt), null, 2));
      return receipt.status === "failed" ? 1 : 0;
    }
    if (args.command === "integration-smith") {
      if (args.subcommand !== "integrate") throw new Error("integration-smith requires subcommand: integrate");
      const receipt = await integrationSmithQueue(args.root, {
        ballotId: args.ballotId ?? "",
        title: args.title ?? "",
        summary: args.summary ?? "",
        checklist: args.checklist,
        source: args.source,
        sourceApp: args.sourceApp,
        sourceProposalId: args.sourceProposalId,
        targetApp: args.targetApp,
        targetDomain: args.targetDomain,
        specVersion: args.specVersion,
        owner: ownerFromArgs(args),
        proposalPayload: args.proposalPayloadPath ? await readJsonFile(args.proposalPayloadPath) : undefined,
        dryRun: !args.execute,
        secretsPath: args.secretsPath,
      });
      console.log(JSON.stringify(safeAdtActionReceipt(receipt), null, 2));
      return receipt.status === "failed" ? 1 : 0;
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
