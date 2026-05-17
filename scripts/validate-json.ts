import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

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

for (const root of ["schemas", "examples"]) {
  for await (const filePath of jsonFiles(root)) {
    JSON.parse(await readFile(filePath, "utf8"));
  }
}

console.log("validated JSON artifacts");
