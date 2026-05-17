import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface ValidationResult {
  ok: boolean;
  filesChecked: number;
  warnings: string[];
}

async function* jsonFiles(root: string): AsyncGenerator<string> {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      yield* jsonFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      yield fullPath;
    }
  }
}

function assertCredentialRefsOnly(value: unknown, filePath: string, warnings: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) assertCredentialRefsOnly(item, filePath, warnings);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (["credential", "apiKey", "token", "password", "privateKey"].includes(key)) {
      warnings.push(`${filePath}: forbidden raw-secret-shaped field '${key}'`);
    }
    if (key === "credentialRef" && typeof child === "string" && !child.startsWith("local-secrets:")) {
      warnings.push(`${filePath}: credentialRef must use local-secrets:* placeholder`);
    }
    assertCredentialRefsOnly(child, filePath, warnings);
  }
}

function assertKnownArtifactShape(value: unknown, filePath: string, warnings: string[]): void {
  if (!value || typeof value !== "object") return;
  const artifact = value as Record<string, unknown>;
  if (filePath.endsWith("birth_requests/platform-builders.json") && typeof artifact.createdAt !== "string") {
    warnings.push(`${filePath}: birth request missing createdAt`);
  }
  if (filePath.includes("/manifests/") && (!artifact.agentId || !artifact.genome || !artifact.runtime)) {
    warnings.push(`${filePath}: manifest missing agentId/genome/runtime`);
  }
  if (filePath.endsWith("stable/agents.json") && !Array.isArray(artifact.agents)) {
    warnings.push(`${filePath}: stable registry missing agents array`);
  }
  if (filePath.includes("first_breath_receipts") && artifact.networkUsed !== false) {
    warnings.push(`${filePath}: first-breath receipts must be local-only by default`);
  }
}

export async function validateJsonArtifacts(baseDir = process.cwd()): Promise<ValidationResult> {
  const warnings: string[] = [];
  let filesChecked = 0;
  for (const root of ["schemas", "examples"]) {
    for await (const filePath of jsonFiles(path.join(baseDir, root))) {
      const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown;
      filesChecked += 1;
      assertCredentialRefsOnly(parsed, path.relative(baseDir, filePath), warnings);
      assertKnownArtifactShape(parsed, path.relative(baseDir, filePath), warnings);
    }
  }
  return { ok: warnings.length === 0, filesChecked, warnings };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await validateJsonArtifacts();
  if (!result.ok) {
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`validated JSON artifacts (${result.filesChecked} files)`);
  }
}
