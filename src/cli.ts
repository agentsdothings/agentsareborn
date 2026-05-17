#!/usr/bin/env node
import path from "node:path";

import { birthPlatformBuilders } from "./birth.js";
import { StableStore } from "./stable.js";

interface ParsedArgs {
  command: string;
  root: string;
}

function usage(): string {
  return `AgentsAreBorn local birth chamber\n\nUsage:\n  agentsareborn [--root PATH] birth-platform-builders [--root PATH]\n  agentsareborn [--root PATH] stable-list [--root PATH]\n`;
}

function parseArgs(argv: string[]): ParsedArgs {
  let root = process.cwd();
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root") {
      const value = argv[i + 1];
      if (!value) throw new Error("--root requires a path");
      root = path.resolve(value);
      i += 1;
    } else {
      rest.push(arg);
    }
  }

  const command = rest[0];
  if (!command || !["birth-platform-builders", "stable-list"].includes(command)) {
    throw new Error(usage());
  }
  return { command, root };
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  try {
    const args = parseArgs(argv);
    if (args.command === "birth-platform-builders") {
      console.log(JSON.stringify(await birthPlatformBuilders(args.root), null, 2));
      return 0;
    }
    if (args.command === "stable-list") {
      console.log(JSON.stringify(await new StableStore(path.join(args.root, "stable")).listAgents(), null, 2));
      return 0;
    }
    return 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main();
}
