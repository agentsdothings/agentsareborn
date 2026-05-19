import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

import { buildAdtAuthContext, safeAdtAuthContext } from "../src/auth-bridge.js";
import { runAdtAction, safeAdtActionReceipt } from "../src/adt-action-runner.js";
import { consensusWeaverVote, featureScoutPropose, integrationSmithQueue } from "../src/role-actions.js";
import { birthPlatformBuilders, slugify } from "../src/birth.js";
import { main } from "../src/cli.js";
import { firstBreath } from "../src/first-breath.js";
import { StableStore } from "../src/stable.js";

test("slugify creates stable ids", () => {
  assert.equal(slugify("Feature Scout"), "feature-scout");
  assert.equal(slugify("  Consensus  Weaver!! "), "consensus-weaver");
});

test("birthPlatformBuilders creates the propose/vote/integrate role cohort", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agentsareborn-"));
  try {
    const result = await birthPlatformBuilders(root);

    assert.equal(result.stableId, "platform-builders");
    assert.deepEqual(result.agents.map((agent) => agent.role), ["propose", "vote", "integrate"]);
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
      assert.match(manifest.genome.platformBuilderRole, /^(propose|vote|integrate)$/);
      assert.ok(manifest.adtApps.includes("agentspropose"));
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
      role: "propose",
      manifestPath: "manifests/example-builder.json",
      credentialRef: "local-secrets:example-builder",
      capabilities: ["proposal_drafting"],
      adtApps: ["agentspropose", "agentsvote"],
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

test("firstBreath emits a local-only receipt with role-specific task output", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agentsareborn-first-breath-"));
  try {
    await birthPlatformBuilders(root);
    const receipt = await firstBreath(root, "local_platform_builder_feature_scout", { dryRun: true });
    assert.equal(receipt.networkUsed, false);
    assert.equal(receipt.status, "dry_run");
    assert.equal(receipt.artifact.kind, "agentspropose.draft");
    assert.ok(receipt.actionsDenied.includes("credential resolution"));
    assert.equal(receipt.filesWritten.length, 0);
    assert.equal(receipt.taskOutput.role, "propose");
    assert.match(receipt.taskOutput.proposal, /first-breath receipts/i);
    assert.ok(receipt.taskOutput.acceptanceCriteria.length >= 3);
    assert.match(receipt.taskOutput.rollbackNote, /revert/i);
    assert.ok(receipt.taskOutput.evidenceUsed.some((evidence) => evidence.includes("manifest")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("firstBreath records non-dry-run receipts and updates stable lastRunAt", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agentsareborn-first-breath-write-"));
  try {
    await birthPlatformBuilders(root);
    const receipt = await firstBreath(root, "local_platform_builder_consensus_weaver");
    assert.equal(receipt.status, "completed");
    assert.deepEqual(receipt.filesWritten, ["first_breath_receipts/local_platform_builder_consensus_weaver.json"]);
    assert.equal(receipt.taskOutput.role, "vote");

    const saved = JSON.parse(await readFile(path.join(root, receipt.filesWritten[0]), "utf8"));
    assert.equal(saved.taskOutput.role, "vote");

    const agents = await new StableStore(path.join(root, "stable")).listAgents();
    const agent = agents.find((candidate) => candidate.agentId === "local_platform_builder_consensus_weaver");
    assert.equal(agent?.lastRunAt, receipt.completedAt);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("auth bridge resolves one AgentsIdentify bearer credential for ADT app calls without app-specific secrets", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agentsareborn-auth-bridge-"));
  try {
    await birthPlatformBuilders(root);
    const secretsPath = path.join(root, "secrets", "agentsidentify-activations.json");
    await mkdir(path.dirname(secretsPath), { recursive: true });
    await writeFile(secretsPath, `${JSON.stringify({
      agents: {
        local_platform_builder_feature_scout: {
          localAgentId: "local_platform_builder_feature_scout",
          credentialRef: "local-secrets:feature-scout",
          publicAgentId: "public-feature-scout",
          manifestId: "manifest-feature-scout",
          apiKey: "ai_test_feature_scout_secret",
          apiKeyMasked: "ai_test...cret",
        },
      },
    }, null, 2)}\n`);

    const context = await buildAdtAuthContext(root, "local_platform_builder_feature_scout", "agentspropose", { secretsPath });
    assert.equal(context.agentId, "local_platform_builder_feature_scout");
    assert.equal(context.appSlug, "agentspropose");
    assert.equal(context.auth.scheme, "Bearer");
    assert.equal(context.headers.Authorization, "Bearer ai_test_feature_scout_secret");
    assert.equal(context.credentialRef, "local-secrets:feature-scout");
    assert.equal(context.publicAgentId, "public-feature-scout");

    const safe = safeAdtAuthContext(context);
    assert.equal(safe.authorizationHeader, "Bearer ai_test...cret");
    assert.equal(JSON.stringify(safe).includes("ai_test_feature_scout_secret"), false);

    await assert.rejects(
      () => buildAdtAuthContext(root, "local_platform_builder_feature_scout", "agentsdate", { secretsPath }),
      /not allowed for local_platform_builder_feature_scout/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI auth-context prints only the safe bearer context", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agentsareborn-auth-cli-"));
  const originalLog = console.log;
  const output: string[] = [];
  console.log = (message?: unknown) => { output.push(String(message ?? "")); };
  try {
    await birthPlatformBuilders(root);
    const secretsPath = path.join(root, "secrets", "agentsidentify-activations.json");
    await mkdir(path.dirname(secretsPath), { recursive: true });
    await writeFile(secretsPath, `${JSON.stringify({
      agents: {
        local_platform_builder_consensus_weaver: {
          localAgentId: "local_platform_builder_consensus_weaver",
          credentialRef: "local-secrets:consensus-weaver",
          publicAgentId: "public-consensus-weaver",
          manifestId: "manifest-consensus-weaver",
          apiKey: "ai_test_consensus_weaver_secret",
          apiKeyMasked: "ai_test...cret",
        },
      },
    }, null, 2)}\n`);

    assert.equal(await main(["auth-context", "--root", root, "--agent", "local_platform_builder_consensus_weaver", "--app", "agentsvote", "--secrets", secretsPath]), 0);
    const printed = output.join("\n");
    assert.match(printed, /Bearer ai_test\.\.\.cret/);
    assert.equal(printed.includes("ai_test_consensus_weaver_secret"), false);
  } finally {
    console.log = originalLog;
    await rm(root, { recursive: true, force: true });
  }
});


test("ADT action runner can dry-run without network or raw credentials", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agentsareborn-action-dry-"));
  try {
    await birthPlatformBuilders(root);
    const secretsPath = path.join(root, "secrets", "agentsidentify-activations.json");
    await mkdir(path.dirname(secretsPath), { recursive: true });
    await writeFile(secretsPath, `${JSON.stringify({
      agents: {
        local_platform_builder_feature_scout: {
          localAgentId: "local_platform_builder_feature_scout",
          credentialRef: "local-secrets:feature-scout",
          publicAgentId: "public-feature-scout",
          manifestId: "manifest-feature-scout",
          apiKey: "ai_test_feature_scout_secret",
          apiKeyMasked: "ai_test...cret",
        },
      },
    }, null, 2)}\n`);

    const receipt = await runAdtAction(root, {
      agentId: "local_platform_builder_feature_scout",
      appSlug: "agentspropose",
      endpointPath: "/api/build",
      payload: { targetProduct: "agenticsynthetics", domainId: "generator-option", candidate: { generatorId: "example" } },
      dryRun: true,
      secretsPath,
    });

    assert.equal(receipt.status, "dry_run");
    assert.equal(receipt.networkUsed, false);
    assert.equal(receipt.request.method, "POST");
    assert.equal(receipt.request.url, "https://agentspropose.com/api/build");
    assert.equal(receipt.request.authorizationHeader, "Bearer ai_test...cret");
    assert.equal(JSON.stringify(receipt).includes("ai_test_feature_scout_secret"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("ADT action runner posts with central bearer auth and returns a safe receipt", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agentsareborn-action-post-"));
  const originalFetch = globalThis.fetch;
  try {
    await birthPlatformBuilders(root);
    const secretsPath = path.join(root, "secrets", "agentsidentify-activations.json");
    await mkdir(path.dirname(secretsPath), { recursive: true });
    await writeFile(secretsPath, `${JSON.stringify({
      agents: {
        local_platform_builder_consensus_weaver: {
          localAgentId: "local_platform_builder_consensus_weaver",
          credentialRef: "local-secrets:consensus-weaver",
          publicAgentId: "public-consensus-weaver",
          manifestId: "manifest-consensus-weaver",
          apiKey: "ai_test_consensus_weaver_secret",
          apiKeyMasked: "ai_test...cret",
        },
      },
    }, null, 2)}\n`);

    let seenAuthorization = "";
    globalThis.fetch = (async (input, init) => {
      seenAuthorization = new Headers(init?.headers).get("Authorization") ?? "";
      assert.equal(String(input), "https://agentsvote.com/api/ballots/ballot-1/votes");
      assert.equal(init?.method, "POST");
      assert.equal(init?.body, JSON.stringify({ choice: "yes" }));
      return new Response(JSON.stringify({ ok: true, ballot: { id: "ballot-1", yesCount: 1 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const receipt = await runAdtAction(root, {
      agentId: "local_platform_builder_consensus_weaver",
      appSlug: "agentsvote",
      endpointPath: "/api/ballots/ballot-1/votes",
      payload: { choice: "yes" },
      secretsPath,
    });

    assert.equal(seenAuthorization, "Bearer ai_test_consensus_weaver_secret");
    assert.equal(receipt.status, "completed");
    assert.equal(receipt.networkUsed, true);
    assert.equal(receipt.response?.status, 200);
    assert.deepEqual(receipt.response?.body, { ok: true, ballot: { id: "ballot-1", yesCount: 1 } });

    const safe = safeAdtActionReceipt(receipt);
    assert.equal(safe.request.authorizationHeader, "Bearer ai_test...cret");
    assert.equal(JSON.stringify(safe).includes("ai_test_consensus_weaver_secret"), false);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(root, { recursive: true, force: true });
  }
});


test("CLI adt-action dry-runs by default and masks credentials", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agentsareborn-action-cli-"));
  const originalLog = console.log;
  const output: string[] = [];
  console.log = (message?: unknown) => { output.push(String(message ?? "")); };
  try {
    await birthPlatformBuilders(root);
    const secretsPath = path.join(root, "secrets", "agentsidentify-activations.json");
    const payloadPath = path.join(root, "payload.json");
    await mkdir(path.dirname(secretsPath), { recursive: true });
    await writeFile(secretsPath, `${JSON.stringify({
      agents: {
        local_platform_builder_feature_scout: {
          localAgentId: "local_platform_builder_feature_scout",
          credentialRef: "local-secrets:feature-scout",
          apiKey: "ai_test_feature_scout_secret",
          apiKeyMasked: "ai_test...cret",
        },
      },
    }, null, 2)}\n`);
    await writeFile(payloadPath, `${JSON.stringify({ targetProduct: "agenticsynthetics" })}\n`);

    assert.equal(await main(["adt-action", "--root", root, "--agent", "local_platform_builder_feature_scout", "--app", "agentspropose", "--endpoint", "/api/build", "--payload", payloadPath, "--secrets", secretsPath]), 0);
    const printed = output.join("\n");
    assert.match(printed, /"status": "dry_run"/);
    assert.match(printed, /Bearer ai_test\.\.\.cret/);
    assert.equal(printed.includes("ai_test_feature_scout_secret"), false);
  } finally {
    console.log = originalLog;
    await rm(root, { recursive: true, force: true });
  }
});


test("role action helpers build full production contract payloads", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agentsareborn-role-actions-full-"));
  try {
    await birthPlatformBuilders(root);
    const secretsPath = path.join(root, "secrets", "agentsidentify-activations.json");
    await mkdir(path.dirname(secretsPath), { recursive: true });
    await writeFile(secretsPath, `${JSON.stringify({
      agents: {
        local_platform_builder_feature_scout: {
          localAgentId: "local_platform_builder_feature_scout",
          credentialRef: "local-secrets:feature-scout",
          apiKey: "ai_test_feature_scout_secret",
          apiKeyMasked: "ai_test...cout",
        },
        local_platform_builder_integration_smith: {
          localAgentId: "local_platform_builder_integration_smith",
          credentialRef: "local-secrets:integration-smith",
          apiKey: "ai_test_integration_smith_secret",
          apiKeyMasked: "ai_test...mith",
        },
      },
    }, null, 2)}\n`);

    const proposalPayload = {
      owner: { kind: "human", system: "agentshirehumans", id: "stereo-void" },
      description: "Install a generator option from role command governance.",
      outputFields: [{ name: "receipt", type: "string", description: "Masked ADT action receipt path." }],
      supportedStrategies: ["safe-default"],
      sampleRecords: [{ receipt: "adt_action_receipts/example.json" }],
      rationaleNotes: ["Live governance loop needs valid generator-option contracts."],
    };

    const proposal = await featureScoutPropose(root, {
      targetProduct: "agenticsynthetics",
      domainId: "generator-option",
      generatorId: "role-command-live-governance-loop",
      generatorName: "Role Command Live Governance Loop",
      summary: "Add a full generator-option via Feature Scout.",
      acceptanceCriteria: ["AgentsPropose marks the package valid."],
      rollbackNote: "Remove the generator option.",
      evidence: ["live dry-run contract discovery"],
      ...proposalPayload,
      secretsPath,
    });

    assert.equal(proposal.status, "dry_run");
    assert.deepEqual(proposal.request.payload, {
      targetProduct: "agenticsynthetics",
      domainId: "generator-option",
      candidate: {
        generatorId: "role-command-live-governance-loop",
        generatorName: "Role Command Live Governance Loop",
        summary: "Add a full generator-option via Feature Scout.",
        acceptanceCriteria: ["AgentsPropose marks the package valid."],
        rollbackNote: "Remove the generator option.",
        evidence: ["live dry-run contract discovery"],
        ...proposalPayload,
      },
    });

    const integration = await integrationSmithQueue(root, {
      sourceApp: "agentspropose",
      sourceProposalId: "role-command-live-governance-loop",
      targetApp: "agenticsynthetics",
      targetDomain: "generator-option",
      specVersion: "v1",
      ballotId: "ballot-1",
      owner: { kind: "human", system: "agentshirehumans", id: "stereo-void" },
      proposalPayload: proposal.request.payload,
      title: "Integrate role command governance loop",
      summary: "Queue generator-option integration from the accepted ballot.",
      checklist: ["Open PR", "Attach receipt"],
      secretsPath,
    });

    assert.equal(integration.status, "dry_run");
    assert.deepEqual(integration.request.payload, {
      sourceApp: "agentspropose",
      sourceProposalId: "role-command-live-governance-loop",
      targetApp: "agenticsynthetics",
      targetDomain: "generator-option",
      specVersion: "v1",
      ballotId: "ballot-1",
      owner: { kind: "human", system: "agentshirehumans", id: "stereo-void" },
      proposalPayload: proposal.request.payload,
      title: "Integrate role command governance loop",
      summary: "Queue generator-option integration from the accepted ballot.",
      source: "agentsvote",
      checklist: ["Open PR", "Attach receipt"],
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("role action helpers build expected dry-run requests", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agentsareborn-role-actions-"));
  try {
    await birthPlatformBuilders(root);
    const secretsPath = path.join(root, "secrets", "agentsidentify-activations.json");
    await mkdir(path.dirname(secretsPath), { recursive: true });
    await writeFile(secretsPath, `${JSON.stringify({
      agents: {
        local_platform_builder_feature_scout: {
          localAgentId: "local_platform_builder_feature_scout",
          credentialRef: "local-secrets:feature-scout",
          apiKey: "ai_test_feature_scout_secret",
          apiKeyMasked: "ai_test...cout",
        },
        local_platform_builder_consensus_weaver: {
          localAgentId: "local_platform_builder_consensus_weaver",
          credentialRef: "local-secrets:consensus-weaver",
          apiKey: "ai_test_consensus_weaver_secret",
          apiKeyMasked: "ai_test...aver",
        },
        local_platform_builder_integration_smith: {
          localAgentId: "local_platform_builder_integration_smith",
          credentialRef: "local-secrets:integration-smith",
          apiKey: "ai_test_integration_smith_secret",
          apiKeyMasked: "ai_test...mith",
        },
      },
    }, null, 2)}\n`);

    const proposal = await featureScoutPropose(root, {
      targetProduct: "agenticsynthetics",
      domainId: "generator-option",
      generatorId: "release-smoke-receipts",
      generatorName: "Release Smoke Receipts",
      summary: "Add release smoke receipts for packaged ADT CLIs.",
      acceptanceCriteria: ["Receipts are attached to releases."],
      rollbackNote: "Remove the release step.",
      evidence: ["first-breath receipt"],
      secretsPath,
    });
    assert.equal(proposal.status, "dry_run");
    assert.equal(proposal.request.url, "https://agentspropose.com/api/build");
    assert.deepEqual(proposal.request.payload, {
      targetProduct: "agenticsynthetics",
      domainId: "generator-option",
      candidate: {
        generatorId: "release-smoke-receipts",
        generatorName: "Release Smoke Receipts",
        summary: "Add release smoke receipts for packaged ADT CLIs.",
        acceptanceCriteria: ["Receipts are attached to releases."],
        rollbackNote: "Remove the release step.",
        evidence: ["first-breath receipt"],
      },
    });

    const vote = await consensusWeaverVote(root, {
      ballotId: "ballot/with/slash",
      choice: "yes",
      rationale: "Low risk and reversible.",
      concerns: ["Keep it small."],
      secretsPath,
    });
    assert.equal(vote.status, "dry_run");
    assert.equal(vote.request.url, "https://agentsvote.com/api/ballots/ballot%252Fwith%252Fslash/votes");
    assert.deepEqual(vote.request.payload, { choice: "yes", rationale: "Low risk and reversible.", concerns: ["Keep it small."] });

    const integration = await integrationSmithQueue(root, {
      ballotId: "ballot-1",
      title: "Wire packaged CLI smoke tests",
      summary: "Create integration work from the accepted ballot.",
      checklist: ["Open PR", "Attach receipt"],
      secretsPath,
    });
    assert.equal(integration.status, "dry_run");
    assert.equal(integration.request.url, "https://agentsintegrate.com/api/queue");
    assert.deepEqual(integration.request.payload, {
      ballotId: "ballot-1",
      title: "Wire packaged CLI smoke tests",
      summary: "Create integration work from the accepted ballot.",
      source: "agentsvote",
      checklist: ["Open PR", "Attach receipt"],
    });

    const printedSafe = JSON.stringify([proposal, vote, integration]);
    assert.equal(printedSafe.includes("ai_test_feature_scout_secret"), false);
    assert.equal(printedSafe.includes("ai_test_consensus_weaver_secret"), false);
    assert.equal(printedSafe.includes("ai_test_integration_smith_secret"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test("CLI role commands accept full production contract flags and payload files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agentsareborn-role-cli-full-"));
  const originalLog = console.log;
  const output: string[] = [];
  console.log = (message?: unknown) => { output.push(String(message ?? "")); };
  try {
    await birthPlatformBuilders(root);
    const secretsPath = path.join(root, "secrets", "agentsidentify-activations.json");
    const sampleRecordPath = path.join(root, "sample-record.json");
    const proposalPayloadPath = path.join(root, "proposal-payload.json");
    await mkdir(path.dirname(secretsPath), { recursive: true });
    await writeFile(secretsPath, `${JSON.stringify({
      agents: {
        local_platform_builder_feature_scout: {
          localAgentId: "local_platform_builder_feature_scout",
          credentialRef: "local-secrets:feature-scout",
          apiKey: "ai_test_feature_scout_secret",
          apiKeyMasked: "ai_test...cout",
        },
        local_platform_builder_integration_smith: {
          localAgentId: "local_platform_builder_integration_smith",
          credentialRef: "local-secrets:integration-smith",
          apiKey: "ai_test_integration_smith_secret",
          apiKeyMasked: "ai_test...mith",
        },
      },
    }, null, 2)}\n`);
    await writeFile(sampleRecordPath, `${JSON.stringify({ receipt: "adt_action_receipts/example.json" })}\n`);
    await writeFile(proposalPayloadPath, `${JSON.stringify({ targetProduct: "agenticsynthetics", domainId: "generator-option", candidate: { generatorId: "role-command-live-governance-loop" } })}\n`);

    assert.equal(await main([
      "feature-scout", "propose", "--root", root,
      "--target-product", "agenticsynthetics",
      "--domain", "generator-option",
      "--generator-id", "role-command-live-governance-loop",
      "--generator-name", "Role Command Live Governance Loop",
      "--summary", "Add full generator-option.",
      "--owner-kind", "human",
      "--owner-system", "agentshirehumans",
      "--owner-id", "stereo-void",
      "--description", "Install from role command governance.",
      "--output-field", "receipt:string:Masked ADT action receipt path.",
      "--strategy", "safe-default",
      "--sample-record", sampleRecordPath,
      "--rationale-note", "Live loop needs valid contracts.",
      "--secrets", secretsPath,
    ]), 0);
    assert.equal(await main([
      "integration-smith", "integrate", "--root", root,
      "--source-app", "agentspropose",
      "--source-proposal-id", "role-command-live-governance-loop",
      "--target-app", "agenticsynthetics",
      "--target-domain", "generator-option",
      "--spec-version", "v1",
      "--ballot", "ballot-1",
      "--owner-kind", "human",
      "--owner-system", "agentshirehumans",
      "--owner-id", "stereo-void",
      "--proposal-payload", proposalPayloadPath,
      "--title", "Integrate role command governance loop",
      "--summary", "Queue generator-option integration.",
      "--secrets", secretsPath,
    ]), 0);

    const printed = output.join("\n");
    assert.match(printed, /"owner": \{\n\s+"kind": "human"/);
    assert.match(printed, /"outputFields": \[/);
    assert.match(printed, /"sampleRecords": \[/);
    assert.match(printed, /"sourceProposalId": "role-command-live-governance-loop"/);
    assert.match(printed, /"proposalPayload": \{/);
    assert.equal(printed.includes("ai_test_feature_scout_secret"), false);
    assert.equal(printed.includes("ai_test_integration_smith_secret"), false);
  } finally {
    console.log = originalLog;
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI role commands dry-run with built payloads and masked credentials", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agentsareborn-role-cli-"));
  const originalLog = console.log;
  const output: string[] = [];
  console.log = (message?: unknown) => { output.push(String(message ?? "")); };
  try {
    await birthPlatformBuilders(root);
    const secretsPath = path.join(root, "secrets", "agentsidentify-activations.json");
    await mkdir(path.dirname(secretsPath), { recursive: true });
    await writeFile(secretsPath, `${JSON.stringify({
      agents: {
        local_platform_builder_feature_scout: {
          localAgentId: "local_platform_builder_feature_scout",
          credentialRef: "local-secrets:feature-scout",
          apiKey: "ai_test_feature_scout_secret",
          apiKeyMasked: "ai_test...cout",
        },
        local_platform_builder_consensus_weaver: {
          localAgentId: "local_platform_builder_consensus_weaver",
          credentialRef: "local-secrets:consensus-weaver",
          apiKey: "ai_test_consensus_weaver_secret",
          apiKeyMasked: "ai_test...aver",
        },
        local_platform_builder_integration_smith: {
          localAgentId: "local_platform_builder_integration_smith",
          credentialRef: "local-secrets:integration-smith",
          apiKey: "ai_test_integration_smith_secret",
          apiKeyMasked: "ai_test...mith",
        },
      },
    }, null, 2)}\n`);

    assert.equal(await main(["feature-scout", "propose", "--root", root, "--target-product", "agenticsynthetics", "--domain", "generator-option", "--generator-id", "release-smoke-receipts", "--generator-name", "Release Smoke Receipts", "--summary", "Add release smoke receipts.", "--acceptance", "Receipts exist.", "--secrets", secretsPath]), 0);
    assert.equal(await main(["consensus-weaver", "vote", "--root", root, "--ballot", "ballot-1", "--choice", "yes", "--rationale", "Low risk.", "--secrets", secretsPath]), 0);
    assert.equal(await main(["integration-smith", "integrate", "--root", root, "--ballot", "ballot-1", "--title", "Wire smoke tests", "--summary", "Create integration handoff.", "--checklist", "Open PR", "--secrets", secretsPath]), 0);

    const printed = output.join("\n");
    assert.match(printed, /https:\/\/agentspropose\.com\/api\/build/);
    assert.match(printed, /https:\/\/agentsvote\.com\/api\/ballots\/ballot-1\/votes/);
    assert.match(printed, /https:\/\/agentsintegrate\.com\/api\/queue/);
    assert.match(printed, /"status": "dry_run"/);
    assert.equal(printed.includes("ai_test_feature_scout_secret"), false);
    assert.equal(printed.includes("ai_test_consensus_weaver_secret"), false);
    assert.equal(printed.includes("ai_test_integration_smith_secret"), false);
  } finally {
    console.log = originalLog;
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
    assert.equal(await main(["help"]), 0);
    assert.equal(await main(["schema-list"]), 0);
    assert.equal(await main(["first-breath", "--root", root, "--agent", "local_platform_builder_feature_scout", "--dry-run"]), 0);
    assert.ok(output.some((line) => line.includes("Feature Scout")));
    assert.ok(output.some((line) => line.trim() === "[]"));
    assert.ok(output.some((line) => line.includes("first-breath")));
  } finally {
    console.log = originalLog;
    await rm(root, { recursive: true, force: true });
    await rm(secondRoot, { recursive: true, force: true });
  }
});


test("compiled CLI runs through an npm-style symlink", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agentsareborn-symlink-"));
  try {
    const linkPath = path.join(root, "agentsareborn");
    await symlink(path.resolve("dist/src/cli.js"), linkPath);
    const result = spawnSync(process.execPath, [linkPath, "version"], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), "0.1.0");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
