import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildAdtAuthContext, safeAdtAuthContext, type AuthBridgeOptions } from "./auth-bridge.js";
import { utcNow } from "./stable.js";

const DEFAULT_APP_ORIGINS: Record<string, string> = {
  agentspropose: "https://agentspropose.com",
  agentsvote: "https://agentsvote.com",
  agentsintegrate: "https://agentsintegrate.com",
};

export interface RunAdtActionOptions extends AuthBridgeOptions {
  agentId: string;
  appSlug: string;
  endpointPath: string;
  payload?: unknown;
  method?: "GET" | "POST";
  dryRun?: boolean;
  origin?: string;
  writeReceipt?: boolean;
}

export interface AdtActionReceipt {
  agentId: string;
  agentName: string;
  appSlug: string;
  credentialRef: string;
  publicAgentId?: string;
  manifestId?: string;
  startedAt: string;
  completedAt: string;
  status: "dry_run" | "completed" | "failed";
  networkUsed: boolean;
  request: {
    method: "GET" | "POST";
    url: string;
    endpointPath: string;
    authorizationHeader: string;
    payload?: unknown;
  };
  response?: {
    ok: boolean;
    status: number;
    body: unknown;
  };
  filesWritten: string[];
}

function appOrigin(appSlug: string, override?: string): string {
  return (override ?? DEFAULT_APP_ORIGINS[appSlug] ?? `https://${appSlug}.com`).replace(/\/$/, "");
}

function normalizeEndpointPath(endpointPath: string): string {
  const trimmed = endpointPath.trim();
  if (!trimmed) throw new Error("endpointPath is required");
  if (/^https?:\/\//i.test(trimmed)) throw new Error("endpointPath must be a path, not an absolute URL");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function receiptFileName(agentId: string, appSlug: string, completedAt: string): string {
  const stamp = completedAt.replace(/[:.]/g, "-");
  return `${stamp}_${agentId}_${appSlug}.json`;
}

export async function runAdtAction(root: string, options: RunAdtActionOptions): Promise<AdtActionReceipt> {
  const startedAt = utcNow();
  const method = options.method ?? "POST";
  const endpointPath = normalizeEndpointPath(options.endpointPath);
  const authContext = await buildAdtAuthContext(root, options.agentId, options.appSlug, { secretsPath: options.secretsPath });
  const safeAuth = safeAdtAuthContext(authContext);
  const url = `${appOrigin(options.appSlug, options.origin)}${endpointPath}`;

  const baseReceipt = {
    agentId: authContext.agentId,
    agentName: authContext.agentName,
    appSlug: options.appSlug,
    credentialRef: authContext.credentialRef,
    publicAgentId: authContext.publicAgentId,
    manifestId: authContext.manifestId,
    startedAt,
    request: {
      method,
      url,
      endpointPath,
      authorizationHeader: safeAuth.authorizationHeader,
      ...(options.payload === undefined ? {} : { payload: options.payload }),
    },
    filesWritten: [] as string[],
  };

  if (options.dryRun) {
    return {
      ...baseReceipt,
      completedAt: utcNow(),
      status: "dry_run",
      networkUsed: false,
    };
  }

  const response = await fetch(url, {
    method,
    headers: {
      ...authContext.headers,
      ...(options.payload === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(options.payload === undefined ? {} : { body: JSON.stringify(options.payload) }),
  });
  const contentType = response.headers.get("Content-Type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  const completedAt = utcNow();
  const receipt: AdtActionReceipt = {
    ...baseReceipt,
    completedAt,
    status: response.ok ? "completed" : "failed",
    networkUsed: true,
    response: {
      ok: response.ok,
      status: response.status,
      body,
    },
  };

  if (options.writeReceipt) {
    const receiptsDir = path.join(root, "adt_action_receipts");
    await mkdir(receiptsDir, { recursive: true });
    const receiptPath = path.join(receiptsDir, receiptFileName(options.agentId, options.appSlug, completedAt));
    receipt.filesWritten.push(path.relative(root, receiptPath).split(path.sep).join("/"));
    await writeFile(receiptPath, `${JSON.stringify(safeAdtActionReceipt(receipt), null, 2)}\n`);
  }

  return receipt;
}

export function safeAdtActionReceipt(receipt: AdtActionReceipt): AdtActionReceipt {
  return JSON.parse(JSON.stringify(receipt)) as AdtActionReceipt;
}
