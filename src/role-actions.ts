import { runAdtAction, type AdtActionReceipt, type RunAdtActionOptions } from "./adt-action-runner.js";

export const PLATFORM_BUILDER_AGENTS = {
  featureScout: "local_platform_builder_feature_scout",
  consensusWeaver: "local_platform_builder_consensus_weaver",
  integrationSmith: "local_platform_builder_integration_smith",
} as const;

export interface RoleActionCommonOptions extends Pick<RunAdtActionOptions, "secretsPath"> {
  dryRun?: boolean;
}

export interface FeatureScoutProposalOptions extends RoleActionCommonOptions {
  targetProduct: string;
  domainId: string;
  generatorId: string;
  generatorName: string;
  summary: string;
  acceptanceCriteria?: string[];
  rollbackNote?: string;
  evidence?: string[];
}

export interface ConsensusWeaverVoteOptions extends RoleActionCommonOptions {
  ballotId: string;
  choice: "yes" | "no";
  rationale: string;
  concerns?: string[];
}

export interface IntegrationSmithQueueOptions extends RoleActionCommonOptions {
  ballotId: string;
  title: string;
  summary: string;
  checklist?: string[];
  source?: string;
}

function cleanList(values: string[] | undefined): string[] | undefined {
  const cleaned = (values ?? []).map((value) => value.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : undefined;
}

function requireText(name: string, value: string | undefined): string {
  const cleaned = value?.trim();
  if (!cleaned) throw new Error(`${name} is required`);
  return cleaned;
}

function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment).replace(/%2F/gi, "%252F");
}

export async function featureScoutPropose(root: string, options: FeatureScoutProposalOptions): Promise<AdtActionReceipt> {
  return runAdtAction(root, {
    agentId: PLATFORM_BUILDER_AGENTS.featureScout,
    appSlug: "agentspropose",
    endpointPath: "/api/build",
    payload: {
      targetProduct: requireText("targetProduct", options.targetProduct),
      domainId: requireText("domainId", options.domainId),
      candidate: {
        generatorId: requireText("generatorId", options.generatorId),
        generatorName: requireText("generatorName", options.generatorName),
        summary: requireText("summary", options.summary),
        ...(cleanList(options.acceptanceCriteria) ? { acceptanceCriteria: cleanList(options.acceptanceCriteria) } : {}),
        ...(options.rollbackNote?.trim() ? { rollbackNote: options.rollbackNote.trim() } : {}),
        ...(cleanList(options.evidence) ? { evidence: cleanList(options.evidence) } : {}),
      },
    },
    dryRun: options.dryRun ?? true,
    secretsPath: options.secretsPath,
    writeReceipt: !(options.dryRun ?? true),
  });
}

export async function consensusWeaverVote(root: string, options: ConsensusWeaverVoteOptions): Promise<AdtActionReceipt> {
  const ballotId = requireText("ballotId", options.ballotId);
  return runAdtAction(root, {
    agentId: PLATFORM_BUILDER_AGENTS.consensusWeaver,
    appSlug: "agentsvote",
    endpointPath: `/api/ballots/${encodePathSegment(ballotId)}/votes`,
    payload: {
      choice: options.choice,
      rationale: requireText("rationale", options.rationale),
      ...(cleanList(options.concerns) ? { concerns: cleanList(options.concerns) } : {}),
    },
    dryRun: options.dryRun ?? true,
    secretsPath: options.secretsPath,
    writeReceipt: !(options.dryRun ?? true),
  });
}

export async function integrationSmithQueue(root: string, options: IntegrationSmithQueueOptions): Promise<AdtActionReceipt> {
  return runAdtAction(root, {
    agentId: PLATFORM_BUILDER_AGENTS.integrationSmith,
    appSlug: "agentsintegrate",
    endpointPath: "/api/queue",
    payload: {
      ballotId: requireText("ballotId", options.ballotId),
      title: requireText("title", options.title),
      summary: requireText("summary", options.summary),
      source: options.source?.trim() || "agentsvote",
      ...(cleanList(options.checklist) ? { checklist: cleanList(options.checklist) } : {}),
    },
    dryRun: options.dryRun ?? true,
    secretsPath: options.secretsPath,
    writeReceipt: !(options.dryRun ?? true),
  });
}
