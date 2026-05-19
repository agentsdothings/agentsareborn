import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";

import { StableStore, utcNow, type StableAgent } from "./stable.js";

export interface FirstBreathTaskOutput {
  role: string;
  summary: string;
  proposal: string;
  acceptanceCriteria: string[];
  rollbackNote: string;
  evidenceUsed: string[];
}

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
  taskOutput: FirstBreathTaskOutput;
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
  if (agent.role === "build") {
    return {
      kind: "agentsintegrate.delivery.patch-plan",
      source: "agentsintegrate",
      target: "github",
      branchName: "feat/delivery-builder-smoke-receipts",
      checklist: [
        "Create a short-lived implementation branch from main.",
        "Write failing tests for the accepted handoff.",
        "Implement the smallest patch that makes verification pass.",
        "Open a PR with the test and receipt summary.",
      ],
    };
  }
  if (agent.role === "review") {
    return {
      kind: "agentsintegrate.delivery.review",
      source: "github.pull_request",
      decision: "request_changes_until_verified",
      checklist: [
        "Compare implementation against the integration handoff.",
        "Run local verification or inspect CI receipts.",
        "Check credential masking and rollback notes.",
        "Approve only when spec, tests, and safety gates pass.",
      ],
    };
  }
  if (agent.role === "release") {
    return {
      kind: "agentsintegrate.delivery.release-checklist",
      source: "github.pull_request",
      target: "adt.release_receipt",
      checklist: [
        "Confirm PR approval and green checks.",
        "Merge using the authorized strategy.",
        "Collect deployment or package receipts.",
        "Run post-merge readback and document rollback.",
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

function taskOutputFor(agent: StableAgent, manifest: Record<string, unknown>): FirstBreathTaskOutput {
  const purpose = typeof manifest.purpose === "string" ? manifest.purpose : agent.name;
  const evidenceUsed = [
    `stable entry ${agent.agentId}`,
    `manifest ${agent.manifestPath}`,
    "local-first safety policy",
  ];

  if (agent.role === "vote") {
    return {
      role: "vote",
      summary: `${agent.name} reviewed the sample first-breath receipt improvement as a non-binding local vote.`,
      proposal: "Vote YES on capturing optional taskOutput in first-breath receipts because it makes local runs reviewable without touching production systems.",
      acceptanceCriteria: [
        "Vote rationale names usefulness, reversibility, implementation risk, and ecosystem fit.",
        "The vote remains non-binding unless explicitly authorized by stable policy.",
        "The receipt records no network usage, credentials, or production ADT mutation.",
      ],
      rollbackNote: "Revert the optional taskOutput receipt field and keep legacy safety-only receipts; no production migration is required.",
      evidenceUsed,
    };
  }

  if (agent.role === "integrate") {
    return {
      role: "integrate",
      summary: `${agent.name} converted the accepted sample improvement into a local implementation handoff.`,
      proposal: "Create a small implementation checklist for adding optional taskOutput to first-breath receipts, schema validation, tests, docs, and receipt examples.",
      acceptanceCriteria: [
        "Schema accepts optional taskOutput while preserving legacy receipts.",
        "firstBreath emits role-specific local task output and updates lastRunAt only on non-dry-run execution.",
        "npm run verify passes and no credentials or production APIs are used.",
      ],
      rollbackNote: "Revert the schema/interface/checklist changes and regenerate receipts without taskOutput.",
      evidenceUsed,
    };
  }

  if (agent.role === "build") {
    return {
      role: "build",
      summary: `${agent.name} drafted a local implementation lane for turning an integration handoff into a reviewable PR.`,
      proposal: "Create a short-lived branch from main, write the failing delivery-builder tests first, implement the smallest patch, run verification, and open a PR with receipt evidence.",
      acceptanceCriteria: [
        "Branch starts clean from main and touches only files needed for the accepted handoff.",
        "Tests fail before implementation and pass with npm run verify before PR creation.",
        "PR body links the integration handoff, summarizes rollback, and includes masked local receipt evidence.",
      ],
      rollbackNote: "Close the PR and delete the branch; no production ADT state is mutated by the local build plan.",
      evidenceUsed,
    };
  }

  if (agent.role === "review") {
    return {
      role: "review",
      summary: `${agent.name} produced a local review gate for implementation PRs before release handoff.`,
      proposal: "Require spec compliance, regression coverage, credential masking, rollback clarity, and green checks before a delivery PR can move to release.",
      acceptanceCriteria: [
        "Review names PASS or REQUEST_CHANGES for every integration-handoff requirement.",
        "Quality review checks tests, safety boundaries, type contracts, and overreach.",
        "Release handoff is blocked until critical and important issues are resolved.",
      ],
      rollbackNote: "Remove the review gate and return the PR to draft if review criteria prove too broad or block emergency rollback work.",
      evidenceUsed,
    };
  }

  if (agent.role === "release") {
    return {
      role: "release",
      summary: `${agent.name} drafted a release lane that only ships reviewed work with receipts and readbacks.`,
      proposal: "After approval and green checks, merge with authorization, collect package/deploy receipts, run target readback, and record rollback steps alongside the integration item.",
      acceptanceCriteria: [
        "Merge only occurs after explicit authorization, approvals, and green CI.",
        "Release notes include PR, commit, verification, and rollback references.",
        "Post-merge readback verifies the shipped behavior or records a rollback decision.",
      ],
      rollbackNote: "Use the documented rollback path for the merged PR or revert commit, then attach the rollback receipt to the integration item.",
      evidenceUsed,
    };
  }

  if (agent.role === "propose") {
    return {
      role: "propose",
      summary: `${agent.name} identified a small reversible AgentsPropose improvement from ${purpose}`,
      proposal: "Add optional taskOutput to first-breath receipts so local runs capture the agent's actual work product in addition to safety metadata.",
      acceptanceCriteria: [
        "schemas/first-breath-receipt.json accepts optional taskOutput with summary, proposal, acceptanceCriteria, rollbackNote, and evidenceUsed.",
        "Feature Scout dry-runs still write no files and keep networkUsed false.",
        "Existing receipts without taskOutput remain valid, while new receipts can include reviewable local work output.",
      ],
      rollbackNote: "Revert the additive taskOutput field and receipt population logic; legacy receipts remain valid because the field is optional.",
      evidenceUsed,
    };
  }

  return {
    role: agent.role,
    summary: `${agent.name} summarized its identity and safe next action.`,
    proposal: "Keep the local stable receipt-only until a more specific role task is defined.",
    acceptanceCriteria: ["Receipt is emitted", "Network remains disabled", "No credentials are resolved"],
    rollbackNote: "Remove the generic fallback task output once every role has a specific local artifact.",
    evidenceUsed,
  };
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
  const completedAt = utcNow();
  const receipt: FirstBreathReceipt = {
    agentId,
    agentName: agent.name,
    task: firstBreath?.task ?? "Summarize identity, purpose, and safe next action.",
    startedAt,
    completedAt,
    networkUsed: false,
    actionsAttempted: ["load stable entry", "load manifest", "check first-breath network policy", "execute local role task", "emit verification receipt"],
    actionsDenied: ["network access", "credential resolution", "production ADT mutation", "public posting", "payment/spend action"],
    filesWritten: [],
    artifact: localArtifactFor(agent),
    taskOutput: taskOutputFor(agent, manifest),
    verificationNote: `${agent.name} can be read from the local stable, has a manifest, produced local task output, and passed the local-only first-breath safety boundary.`,
    status: options.dryRun ? "dry_run" : "completed",
  };

  if (!options.dryRun) {
    const receiptsDir = path.join(root, "first_breath_receipts");
    await mkdir(receiptsDir, { recursive: true });
    const receiptPath = path.join(receiptsDir, `${agentId}.json`);
    receipt.filesWritten.push(path.relative(root, receiptPath).split(path.sep).join("/"));
    await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
    await store.recordRun(agentId, completedAt);
  }

  return receipt;
}
