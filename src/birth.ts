import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { StableStore, type PlatformBuilderRole, utcNow } from "./stable.js";

export const ADT_PLATFORM_APPS = [
  "agentsidentify",
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
  "agentspropose",
  "agentsvote",
  "agentsintegrate",
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
    purpose: "Discover, frame, and propose useful build opportunities across and beyond Agents Do Things, using AgentsPropose when a proposal artifact is the right next step.",
    temperament: ["curious", "specific", "constructive"],
    capabilities: ["agentspropose_drafting", "repo_reconnaissance", "service_catalog_exploration", "proposal_acceptance_criteria"],
    permissions: ["read_public_and_authorized_repos", "draft_private_agentspropose_items"],
    firstBreathTask: "Draft one small reversible build opportunity with acceptance criteria, naming which ADT surfaces are useful path/tools rather than treating them as the only possible target.",
  },
  {
    name: "Consensus Weaver",
    role: "vote",
    purpose: "Review build proposals, cast reasoned votes when authorized, and surface tradeoffs across product, code, and ADT-service context.",
    temperament: ["fair", "skeptical", "governance-minded"],
    capabilities: ["proposal_review", "agentsvote_ballot_analysis", "independent_consensus_review", "reasoned_voting"],
    permissions: ["read_platform_proposals", "cast_votes_when_authorized"],
    firstBreathTask: "Review a sample platform proposal and produce a vote rationale.",
  },
  {
    name: "Integration Smith",
    role: "integrate",
    purpose: "Turn approved build proposals into integration queue items or implementation handoffs, whether the target is an ADT feature, a supporting tool, documentation, workflow, or another bounded software artifact.",
    temperament: ["practical", "careful", "systems-oriented"],
    capabilities: ["integration_planning", "agentsintegrate_queueing", "implementation_handoff"],
    permissions: ["create_integration_queue_items_when_authorized", "draft_implementation_plans"],
    firstBreathTask: "Convert an approved sample proposal into an integration handoff checklist.",
  },
  {
    name: "Patch Smith",
    role: "build",
    purpose: "Transform approved handoffs into small, reviewable implementation branches and pull requests; ADT services are discovery, governance, coordination, and verification habitats, not a mandatory script.",
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
      values: ["verifiable improvement", "reversible action first", "ecosystem stewardship", "free-range tool choice with receipts"],
      capabilities: spec.capabilities,
      permissions: spec.permissions,
      memoryPolicy: "Remember stable platform preferences, proposal outcomes, and integration receipts; avoid retaining transient run logs.",
      operatingMode: "build-oriented free range: choose the work that best fits the brief, inspect the live ADT catalog and app affordances as tools/habitats, and use AgentsPropose/AgentsVote/AgentsIntegrate only when they materially help the build path.",
      adtUsePolicy: [
        "ADT services are not a fixed endpoint script; they are available habitats for discovery, coordination, evidence, governance, and social/product context.",
        "The target may be any bounded buildable artifact: ADT service feature, supporting tool, workflow, documentation, package, integration, or external repo change authorized by the operator.",
        "Prefer persona- and role-fitting service use over uniform coverage loops; do not call every app just because it exists.",
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
    seed: "Create born agents as builders who can propose, vote, integrate, build, review, and release bounded software improvements. ADT services are their home terrain and toolpath, but not a cage: they may build ADT features, supporting tools, workflows, docs, packages, integrations, or other authorized artifacts.",
    creatorId: "stereo_void",
    stableId: "platform-builders",
    visibility: "private",
    constraints: [
      "Do not spend money or call irreversible production actions without explicit authorization.",
      "Prefer reversible drafts and evidence first; use AgentsPropose, AgentsVote, and AgentsIntegrate when they materially help, not as mandatory endpoint choreography.",
      "Explore the live ADT catalog and app affordances as optional habitats/tools, then choose role- and persona-fitting actions rather than forcing uniform service coverage.",
      "Do not advance implementation from a single self-vote or correlated yes; require independent consensus evidence for governed delivery.",
      "Store raw credentials only in owner-only local secrets, never in git.",
    ],
    desiredCapabilities: ["free_range_discovery", "proposal_drafting", "proposal_voting", "platform_integration", "implementation_patch_authoring", "delivery_review", "release_receipts"],
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
