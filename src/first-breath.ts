import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";

import { StableStore, utcNow, type StableAgent } from "./stable.js";

export interface FirstBreathReceipt {
  agentId: string;
  agentName: string;
  task: string;
  startedAt: string;
  completedAt: string;
  networkUsed: false;
  actionsAttempted: string[];
  actionsDenied: string[];
  filesWritten: string[];
  artifact: Record<string, unknown>;
  verificationNote: string;
  status: "dry_run" | "completed";
}

function localArtifactFor(agent: StableAgent): Record<string, unknown> {
  if (agent.role === "propose") {
    return {
      kind: "agentspropose.draft",
      title: "Add release smoke tests for packaged ADT CLIs",
      summary: "Before publishing an ADT CLI, install its packed tarball in a temporary project and run the documented quickstart.",
      acceptanceCriteria: [
        "The package installs from its tarball outside the source checkout.",
        "The CLI can run version, doctor, and its primary happy-path command from the temp project.",
        "The release checklist records the smoke-test command and result.",
      ],
      rollback: "Keep the existing release flow and remove the smoke-test step if it blocks emergency patch publishing.",
    };
  }
  if (agent.role === "vote") {
    return {
      kind: "agentsvote.rationale",
      proposalTitle: "Add release smoke tests for packaged ADT CLIs",
      vote: "yes",
      rationale: "The change is reversible, low-risk, and catches package-path bugs that local repo tests miss.",
      concerns: ["Keep the smoke test small enough that publishing remains fast."],
    };
  }
  if (agent.role === "integrate") {
    return {
      kind: "agentsintegrate.handoff",
      source: "agentspropose",
      decisionSource: "agentsvote",
      target: "agentsintegrate",
      queueTitle: "Wire packaged CLI smoke tests into ADT release workflows",
      checklist: [
        "Create a temp project during release verification.",
        "Install the packed tarball.",
        "Run the package's documented quickstart commands.",
        "Attach the smoke-test receipt to the integration item.",
      ],
    };
  }
  return {
    kind: "agentsareborn.identity-summary",
    role: agent.role,
    name: agent.name,
  };
}

async function manifestFor(root: string, agent: StableAgent): Promise<Record<string, unknown>> {
  const resolvedRoot = await realpath(root);
  const lexicalManifest = path.resolve(resolvedRoot, agent.manifestPath);
  if (!lexicalManifest.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`manifest path escapes root for ${agent.agentId}: ${agent.manifestPath}`);
  }
  const resolvedManifest = await realpath(lexicalManifest);
  if (!resolvedManifest.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`manifest path escapes root for ${agent.agentId}: ${agent.manifestPath}`);
  }
  return JSON.parse(await readFile(resolvedManifest, "utf8")) as Record<string, unknown>;
}

export async function firstBreath(root: string, agentId: string, options: { dryRun?: boolean } = {}): Promise<FirstBreathReceipt> {
  const store = new StableStore(path.join(root, "stable"));
  const agent = (await store.listAgents()).find((candidate) => candidate.agentId === agentId);
  if (!agent) throw new Error(`agent not found in stable: ${agentId}`);

  const manifest = await manifestFor(root, agent);
  const firstBreath = manifest.firstBreath as { task?: string; requiresNetwork?: boolean } | undefined;
  if (firstBreath?.requiresNetwork) {
    throw new Error(`first breath for ${agentId} requires network; local safe runner refuses by default`);
  }

  const startedAt = utcNow();
  const receipt: FirstBreathReceipt = {
    agentId,
    agentName: agent.name,
    task: firstBreath?.task ?? "Summarize identity, purpose, and safe next action.",
    startedAt,
    completedAt: utcNow(),
    networkUsed: false,
    actionsAttempted: ["load stable entry", "load manifest", "check first-breath network policy", "emit verification receipt"],
    actionsDenied: ["network access", "credential resolution", "production ADT mutation", "public posting", "payment/spend action"],
    filesWritten: [],
    artifact: localArtifactFor(agent),
    verificationNote: `${agent.name} can be read from the local stable, has a manifest, and passed the local-only first-breath safety boundary.`,
    status: options.dryRun ? "dry_run" : "completed",
  };

  if (!options.dryRun) {
    const receiptsDir = path.join(root, "first_breath_receipts");
    await mkdir(receiptsDir, { recursive: true });
    const receiptPath = path.join(receiptsDir, `${agentId}.json`);
    receipt.filesWritten.push(path.relative(root, receiptPath).split(path.sep).join("/"));
    await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  }

  return receipt;
}
