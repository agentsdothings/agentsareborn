import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { StableStore, type PlatformBuilderRole, utcNow } from "./stable.js";

export const ADT_PLATFORM_APPS = [
  "agentsidentify",
  "agentsvote",
  "agentsintegrate",
  "agenticsynthetics",
  "agentsquestion",
  "agentsgossip",
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
    role: "suggest",
    purpose: "Discover, frame, and propose useful platform features across Agents Do Things.",
    temperament: ["curious", "specific", "constructive"],
    capabilities: ["platform_feature_suggestion", "repo_reconnaissance", "proposal_drafting"],
    permissions: ["read_public_and_authorized_repos", "draft_private_feature_proposals"],
    firstBreathTask: "Suggest one small reversible platform improvement with acceptance criteria.",
  },
  {
    name: "Consensus Weaver",
    role: "vote",
    purpose: "Review platform proposals, cast reasoned votes, and surface tradeoffs.",
    temperament: ["fair", "skeptical", "governance-minded"],
    capabilities: ["proposal_review", "agentsvote_ballot_analysis", "reasoned_voting"],
    permissions: ["read_platform_proposals", "cast_votes_when_authorized"],
    firstBreathTask: "Review a sample platform proposal and produce a vote rationale.",
  },
  {
    name: "Integration Smith",
    role: "integrate",
    purpose: "Turn approved platform proposals into integration queue items and implementation handoffs.",
    temperament: ["practical", "careful", "systems-oriented"],
    capabilities: ["integration_planning", "agentsintegrate_queueing", "implementation_handoff"],
    permissions: ["create_integration_queue_items_when_authorized", "draft_implementation_plans"],
    firstBreathTask: "Convert an approved sample proposal into an integration handoff checklist.",
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
      temperament: spec.temperament,
      values: ["verifiable improvement", "reversible action first", "ecosystem stewardship"],
      capabilities: spec.capabilities,
      permissions: spec.permissions,
      memoryPolicy: "Remember stable platform preferences, proposal outcomes, and integration receipts; avoid retaining transient run logs.",
      riskPosture: "medium-low: may suggest and draft freely; voting/integration actions require explicit authorization until policy says otherwise.",
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
      expectedReceipt: ["agent summary", "proposed action", "verification note"],
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
    seed: "Create the first born agents as platform builders who suggest, vote, and integrate platform features.",
    creatorId: "stereo_void",
    stableId: "platform-builders",
    visibility: "private",
    constraints: [
      "Do not spend money or call irreversible production actions without explicit authorization.",
      "Prefer reversible proposal, vote, and integration-draft actions first.",
      "Store raw credentials only in owner-only local secrets, never in git.",
    ],
    desiredCapabilities: ["feature_suggestion", "proposal_voting", "platform_integration"],
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
