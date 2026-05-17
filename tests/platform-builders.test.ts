import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { birthPlatformBuilders, slugify } from "../src/birth.js";
import { main } from "../src/cli.js";
import { StableStore } from "../src/stable.js";

test("slugify creates stable ids", () => {
  assert.equal(slugify("Feature Scout"), "feature-scout");
  assert.equal(slugify("  Consensus  Weaver!! "), "consensus-weaver");
});

test("birthPlatformBuilders creates the suggest/vote/integrate role cohort", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agentsareborn-"));
  try {
    const result = await birthPlatformBuilders(root);

    assert.equal(result.stableId, "platform-builders");
    assert.deepEqual(result.agents.map((agent) => agent.role), ["suggest", "vote", "integrate"]);
    assert.deepEqual(new Set(result.agents.map((agent) => agent.name)), new Set([
      "Feature Scout",
      "Consensus Weaver",
      "Integration Smith",
    ]));

    const stable = JSON.parse(await readFile(path.join(root, "stable", "agents.json"), "utf8"));
    assert.equal(stable.stableId, "platform-builders");
    assert.equal(stable.agents.length, 3);

    for (const agent of stable.agents) {
      const manifest = JSON.parse(await readFile(path.join(root, agent.manifestPath), "utf8"));
      assert.match(manifest.genome.platformBuilderRole, /^(suggest|vote|integrate)$/);
      assert.ok(manifest.adtApps.includes("agentsvote"));
      assert.ok(manifest.adtApps.includes("agentsintegrate"));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("StableStore adds an agent and lists it without raw credentials", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agentsareborn-stable-"));
  try {
    const store = new StableStore(path.join(root, "stable"));
    await store.addAgent({
      agentId: "agent_example",
      name: "Example Builder",
      role: "suggest",
      manifestPath: "manifests/example-builder.json",
      credentialRef: "local-secrets:example-builder",
      capabilities: ["feature_suggestion"],
      adtApps: ["agentsvote"],
    });

    const agents = await store.listAgents();
    assert.equal(agents.length, 1);
    assert.equal(agents[0].agentId, "agent_example");
    assert.equal(agents[0].status, "embryo");
    assert.equal(Object.hasOwn(agents[0], "credential"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI accepts --root before and after subcommands", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agentsareborn-cli-"));
  const secondRoot = await mkdtemp(path.join(tmpdir(), "agentsareborn-cli-second-"));
  const originalLog = console.log;
  const output: string[] = [];
  console.log = (message?: unknown) => { output.push(String(message ?? "")); };
  try {
    assert.equal(await main(["birth-platform-builders", "--root", root]), 0);
    assert.equal(await main(["--root", secondRoot, "stable-list"]), 0);
    assert.ok(output.some((line) => line.includes("Feature Scout")));
    assert.ok(output.some((line) => line.trim() === "[]"));
  } finally {
    console.log = originalLog;
    await rm(root, { recursive: true, force: true });
    await rm(secondRoot, { recursive: true, force: true });
  }
});
