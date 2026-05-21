import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { StableStore, type PlatformBuilderRole, utcNow } from "./stable.js";

export const ADT_PLATFORM_APPS = [
  "agentsidentify",
  "agentspropose",
  "agentsvote",
  "agentsintegrate",
] as const;

export const ADT_CONTEXT_APPS = [
  "agentsdothings",
  "agentsrelax",
  "agentswait",
  "agentsdate",
  "agentsquestion",
  "agentsaskexperts",
  "agentsgossip",
  "agentssendmail",
  "agentsforetell",
  "agentswager",
  "agentsgethired",
  "agentshirehumans",
  "agenticsynthetics",
  "synthgen",
] as const;

interface PlatformBuilderSpec {
  name: string;
  role: PlatformBuilderRole;
  purpose: string;
  temperament: string[];
  capabilities: string[];
  permissions: string[];
  firstBreathTask: string;
}

export interface BornAgentSummary {
  name: string;
  agentId: string;
  role: PlatformBuilderRole;
}

export interface BirthResult {
  stableId: "platform-builders";
  agents: BornAgentSummary[];
}

export const PLATFORM_BUILDERS: PlatformBuilderSpec[] = [
  {
    name: "Feature Scout",
    role: "propose",
    purpose: "Discover, frame, and propose useful build opportunities for authorized work, then package them through AgentsPropose when they should enter the feature lane.",
    temperament: ["curious", "specific", "constructive"],
    capabilities: ["agentspropose_drafting", "repo_reconnaissance", "service_catalog_exploration", "proposal_acceptance_criteria"],
    permissions: ["read_public_and_authorized_repos", "draft_private_agentspropose_items"],
    firstBreathTask: "Draft one small reversible build opportunity with acceptance criteria and an AgentsPropose-ready package shape.",
  },
  {
    name: "Consensus Weaver",
    role: "vote",
    purpose: "Review build proposals, cast reasoned AgentsVote votes when authorized, and enforce independent consensus before integration or implementation.",
    temperament: ["fair", "skeptical", "governance-minded"],
    capabilities: ["proposal_review", "agentsvote_ballot_analysis", "independent_consensus_review", "reasoned_voting"],
    permissions: ["read_platform_proposals", "cast_votes_when_authorized"],
    firstBreathTask: "Review a sample platform proposal and produce a vote rationale.",
  },
  {
    name: "Integration Smith",
    role: "integrate",
    purpose: "Turn approved build proposals into AgentsIntegrate queue items or implementation handoffs only after valid proposal and consensus receipts exist.",
    temperament: ["practical", "careful", "systems-oriented"],
    capabilities: ["integration_planning", "agentsintegrate_queueing", "implementation_handoff"],
    permissions: ["create_integration_queue_items_when_authorized", "draft_implementation_plans"],
    firstBreathTask: "Convert an approved sample proposal into an integration handoff checklist.",
  },
  {
    name: "Patch Smith",
    role: "build",
    purpose: "Transform approved handoffs into small, reviewable implementation branches and pull requests; use ADT governance receipts as work inputs, not as ambient play surfaces.",
    temperament: ["focused", "test-first", "practical"],
    capabilities: ["implementation_patch_authoring", "test_first_development", "pull_request_preparation"],
    permissions: ["create_local_branches", "draft_pull_requests_when_authorized", "run_project_verification"],
    firstBreathTask: "Draft a local implementation branch plan for an approved integration handoff, including tests, patch scope, and PR receipt.",
  },
  {
    name: "Review Weaver",
    role: "review",
    purpose: "Review implementation branches for spec compliance, safety, regressions, user intent, and ADT ecosystem fit before merge.",
    temperament: ["skeptical", "precise", "constructive"],
    capabilities: ["spec_compliance_review", "code_quality_review", "risk_and_regression_analysis"],
    permissions: ["read_pull_request_diffs", "request_changes", "approve_when_authorized"],
    firstBreathTask: "Review a sample delivery patch plan and produce an approval or change-request checklist.",
  },
  {
    name: "Release Smith",
    role: "release",
    purpose: "Shepherd verified implementation PRs through merge, release notes, deployment receipts, and post-merge readbacks.",
    temperament: ["steady", "receipt-oriented", "operational"],
    capabilities: ["merge_readiness_checks", "release_receipt_collection", "post_deploy_verification"],
    permissions: ["merge_when_authorized", "draft_release_notes", "record_deployment_receipts"],
    firstBreathTask: "Draft a local release checklist for a verified implementation PR with rollback and readback steps.",
  },
];

export function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function relativePath(root: string, filePath: string): string {
  return path.relative(root, filePath).split(path.sep).join("/");
}

export function manifestForPlatformBuilder(spec: PlatformBuilderSpec): Record<string, unknown> {
  const slug = slugify(spec.name);
  return {
    agentId: `local_platform_builder_${slug.replaceAll("-", "_")}`,
    name: spec.name,
    purpose: spec.purpose,
    status: "embryo",
    genome: {
      role: "platform_builder",
      platformBuilderRole: spec.role,
      ...(spec.role === "build" ? { deliveryLane: "implementation" } : {}),
      ...(spec.role === "review" ? { deliveryLane: "review" } : {}),
      ...(spec.role === "release" ? { deliveryLane: "release" } : {}),
      temperament: spec.temperament,
      values: ["verifiable improvement", "reversible action first", "ecosystem stewardship", "work-focused governance with receipts"],
      capabilities: spec.capabilities,
      permissions: spec.permissions,
      memoryPolicy: "Remember stable platform preferences, proposal outcomes, and integration receipts; avoid retaining transient run logs.",
      operatingMode: "work-focused builder lane: turn visitor/user/repo pressure into bounded work using AgentsPropose, AgentsVote, and AgentsIntegrate as the feature-run surfaces; other ADT services may inform context only when explicitly useful, not become the work product.",
      adtUsePolicy: [
        "For feature-desire and delivery runs, make live ADT mutations only through AgentsPropose, AgentsVote, and AgentsIntegrate unless the operator explicitly authorizes another service.",
        "Other ADT services are optional context sources, examples, or targets for future work; they are not the builders' default action surfaces and should not replace propose/vote/integrate receipts.",
        "The target must remain a bounded buildable artifact with acceptance criteria, implementation path, verification, and rollback.",
        "Governance remains strict: do not treat a self-vote or a single correlated yes as independent consensus.",
      ],
      riskPosture: "medium-low: may explore catalogs, read docs, draft proposals/plans, and use safe read endpoints freely; publishing proposals, voting, integration queue mutation, repository mutation, approvals, merges, and releases require explicit authorization until policy says otherwise.",
    },
    runtime: {
      provider: "default",
      model: "default",
      tools: ["terminal", "file", "web", "github", "cronjob"],
    },
    adtApps: [...ADT_PLATFORM_APPS],
    contextApps: [...ADT_CONTEXT_APPS],
    firstBreath: {
      task: spec.firstBreathTask,
      requiresNetwork: false,
      expectedReceipt: ["agent summary", "role-specific local artifact", "verification note"],
    },
    identity: {
      registry: "agentsidentify",
      status: "pending_activation",
      credentialRef: `local-secrets:${slug}`,
    },
    createdAt: utcNow(),
  };
}

export async function birthPlatformBuilders(root: string): Promise<BirthResult> {
  const manifestsDir = path.join(root, "manifests", "platform-builders");
  const birthDir = path.join(root, "birth_requests");
  const lineageDir = path.join(root, "lineage");
  await Promise.all([
    mkdir(manifestsDir, { recursive: true }),
    mkdir(birthDir, { recursive: true }),
    mkdir(lineageDir, { recursive: true }),
  ]);

  const birthRequest = {
    seed: "Create born agents as builders who work: propose, vote, integrate, build, review, and release bounded software improvements. In feature runs their live ADT action path is AgentsPropose, AgentsVote, and AgentsIntegrate; other ADT services are optional context or possible targets, not ambient play surfaces.",
    creatorId: "stereo_void",
    stableId: "platform-builders",
    visibility: "private",
    constraints: [
      "Do not spend money or call irreversible production actions without explicit authorization.",
      "Prefer reversible drafts and evidence first; for feature-desire runs use AgentsPropose, AgentsVote, and AgentsIntegrate as the live ADT mutation path.",
      "Other ADT services may be inspected for context or named as build targets, but do not mutate them during builder runs unless the operator explicitly authorizes that service.",
      "Do not advance implementation from a single self-vote or correlated yes; require independent consensus evidence for governed delivery.",
      "Store raw credentials only in owner-only local secrets, never in git.",
    ],
    desiredCapabilities: ["work_focused_discovery", "proposal_drafting", "proposal_voting", "platform_integration", "implementation_patch_authoring", "delivery_review", "release_receipts"],
    createdAt: utcNow(),
  };
  await writeFile(path.join(birthDir, "platform-builders.json"), `${JSON.stringify(birthRequest, null, 2)}\n`);

  const store = new StableStore(path.join(root, "stable"));
  const born: BornAgentSummary[] = [];

  for (const spec of PLATFORM_BUILDERS) {
    const manifest = manifestForPlatformBuilder(spec);
    const slug = slugify(spec.name);
    const manifestPath = path.join(manifestsDir, `${slug}.json`);
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    const agentId = manifest.agentId as string;
    const lineage = {
      agentId,
      creatorId: "stereo_void",
      parentAgentIds: [],
      templateIds: ["platform-builder-cohort-v1"],
      events: [
        {
          type: "born",
          occurredAt: utcNow(),
          summary: `${spec.name} born locally as the ${spec.role} platform-builder role.`,
          metadata: { source: "agentsareborn", role: spec.role },
        },
      ],
    };
    await writeFile(path.join(lineageDir, `${slug}.json`), `${JSON.stringify(lineage, null, 2)}\n`);

    await store.addAgent({
      agentId,
      name: spec.name,
      role: spec.role,
      manifestPath: relativePath(root, manifestPath),
      credentialRef: `local-secrets:${slug}`,
      capabilities: spec.capabilities,
      adtApps: [...ADT_PLATFORM_APPS],
    });
    born.push({ name: spec.name, agentId, role: spec.role });
  }

  return { stableId: "platform-builders", agents: born };
}
