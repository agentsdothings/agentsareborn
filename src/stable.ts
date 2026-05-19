import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type PlatformBuilderRole = "propose" | "vote" | "integrate" | "build" | "review" | "release";

export interface StableAgent {
  agentId: string;
  name: string;
  role: PlatformBuilderRole | string;
  status: "embryo" | "active" | "paused" | "retired";
  origin: "agentsareborn";
  manifestPath: string;
  credentialRef: string;
  capabilities: string[];
  adtApps: string[];
  allowedRunners: string[];
  createdAt: string;
  lastRunAt: string | null;
}

export interface StableRegistry {
  stableId: string;
  description: string;
  agents: StableAgent[];
  updatedAt: string;
}

export interface AddAgentInput {
  agentId: string;
  name: string;
  role: PlatformBuilderRole | string;
  manifestPath: string;
  credentialRef: string;
  capabilities: string[];
  adtApps: string[];
  status?: StableAgent["status"];
}

export function utcNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export class StableStore {
  readonly root: string;
  readonly filePath: string;

  constructor(root: string) {
    this.root = root;
    this.filePath = path.join(root, "agents.json");
  }

  private empty(): StableRegistry {
    return {
      stableId: "platform-builders",
      description: "Local stable of platform-builder agents born by AgentsAreBorn.",
      agents: [],
      updatedAt: utcNow(),
    };
  }

  async load(): Promise<StableRegistry> {
    try {
      return JSON.parse(await readFile(this.filePath, "utf8")) as StableRegistry;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return this.empty();
      }
      throw error;
    }
  }

  async save(stable: StableRegistry): Promise<void> {
    stable.updatedAt = utcNow();
    await mkdir(this.root, { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(stable, null, 2)}\n`);
  }

  async addAgent(input: AddAgentInput): Promise<StableAgent> {
    const stable = await this.load();
    const agents = stable.agents.filter((agent) => agent.agentId !== input.agentId);
    const entry: StableAgent = {
      agentId: input.agentId,
      name: input.name,
      role: input.role,
      status: input.status ?? "embryo",
      origin: "agentsareborn",
      manifestPath: input.manifestPath,
      credentialRef: input.credentialRef,
      capabilities: [...input.capabilities],
      adtApps: [...input.adtApps],
      allowedRunners: ["hermes", "cron", "webhook"],
      createdAt: utcNow(),
      lastRunAt: null,
    };
    agents.push(entry);
    stable.agents = agents.sort((a, b) => a.name.localeCompare(b.name));
    await this.save(stable);
    return entry;
  }

  async listAgents(): Promise<StableAgent[]> {
    return (await this.load()).agents;
  }

  async recordRun(agentId: string, completedAt = utcNow()): Promise<StableAgent> {
    const stable = await this.load();
    const index = stable.agents.findIndex((agent) => agent.agentId === agentId);
    if (index === -1) throw new Error(`agent not found in stable: ${agentId}`);
    const updated: StableAgent = { ...stable.agents[index], lastRunAt: completedAt };
    stable.agents[index] = updated;
    await this.save(stable);
    return updated;
  }
}
