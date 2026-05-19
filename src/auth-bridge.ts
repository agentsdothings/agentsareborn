import { readFile } from "node:fs/promises";
import path from "node:path";

import { StableStore, type StableAgent } from "./stable.js";

export interface AuthBridgeOptions {
  secretsPath?: string;
}

export interface ActivationSecretRecord {
  localAgentId?: string;
  credentialRef?: string;
  publicAgentId?: string;
  manifestId?: string;
  apiKey: string;
  apiKeyMasked?: string;
}

export interface AdtAuthContext {
  agentId: string;
  agentName: string;
  appSlug: string;
  credentialRef: string;
  publicAgentId?: string;
  manifestId?: string;
  apiKeyMasked: string;
  auth: {
    scheme: "Bearer";
    headerName: "Authorization";
  };
  headers: {
    Authorization: string;
  };
}

export interface SafeAdtAuthContext {
  agentId: string;
  agentName: string;
  appSlug: string;
  credentialRef: string;
  publicAgentId?: string;
  manifestId?: string;
  auth: {
    scheme: "Bearer";
    headerName: "Authorization";
  };
  authorizationHeader: string;
}

interface ActivationSecretsFile {
  agents?: Record<string, ActivationSecretRecord>;
}

function defaultSecretsPath(root: string): string {
  return path.join(root, "secrets", "agentsidentify-activations.json");
}

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 12) return "********";
  return `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`;
}

async function agentFor(root: string, agentId: string): Promise<StableAgent> {
  const agent = (await new StableStore(path.join(root, "stable")).listAgents()).find((candidate) => candidate.agentId === agentId);
  if (!agent) throw new Error(`agent not found in stable: ${agentId}`);
  return agent;
}

async function activationFor(root: string, agent: StableAgent, options: AuthBridgeOptions): Promise<ActivationSecretRecord> {
  if (!agent.credentialRef.startsWith("local-secrets:")) {
    throw new Error(`unsupported credentialRef for ${agent.agentId}: ${agent.credentialRef}`);
  }

  const secretsPath = options.secretsPath ? path.resolve(options.secretsPath) : defaultSecretsPath(root);
  const secrets = JSON.parse(await readFile(secretsPath, "utf8")) as ActivationSecretsFile;
  const records = Object.entries(secrets.agents ?? {});
  const found = records.find(([localAgentId, record]) => (
    localAgentId === agent.agentId
    || record.localAgentId === agent.agentId
    || record.credentialRef === agent.credentialRef
  ));
  if (!found) throw new Error(`credentialRef not found for ${agent.agentId}: ${agent.credentialRef}`);

  const record = found[1];
  if (record.credentialRef && record.credentialRef !== agent.credentialRef) {
    throw new Error(`credentialRef mismatch for ${agent.agentId}: expected ${agent.credentialRef}`);
  }
  if (typeof record.apiKey !== "string" || record.apiKey.length === 0) {
    throw new Error(`missing apiKey for ${agent.agentId}: ${agent.credentialRef}`);
  }
  return record;
}

export async function buildAdtAuthContext(root: string, agentId: string, appSlug: string, options: AuthBridgeOptions = {}): Promise<AdtAuthContext> {
  const agent = await agentFor(root, agentId);
  if (!agent.adtApps.includes(appSlug)) {
    throw new Error(`${appSlug} is not allowed for ${agent.agentId}; allowed apps: ${agent.adtApps.join(", ")}`);
  }

  const activation = await activationFor(root, agent, options);
  return {
    agentId: agent.agentId,
    agentName: agent.name,
    appSlug,
    credentialRef: agent.credentialRef,
    publicAgentId: activation.publicAgentId,
    manifestId: activation.manifestId,
    apiKeyMasked: activation.apiKeyMasked ?? maskApiKey(activation.apiKey),
    auth: {
      scheme: "Bearer",
      headerName: "Authorization",
    },
    headers: {
      Authorization: `Bearer ${activation.apiKey}`,
    },
  };
}

export function safeAdtAuthContext(context: AdtAuthContext): SafeAdtAuthContext {
  return {
    agentId: context.agentId,
    agentName: context.agentName,
    appSlug: context.appSlug,
    credentialRef: context.credentialRef,
    publicAgentId: context.publicAgentId,
    manifestId: context.manifestId,
    auth: context.auth,
    authorizationHeader: `${context.auth.scheme} ${context.apiKeyMasked}`,
  };
}
