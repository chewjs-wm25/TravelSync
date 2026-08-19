import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const d1Dir = join(process.cwd(), ".wrangler", "state", "v3", "d1");

function hasLocalDb() {
  if (!existsSync(d1Dir)) return false;
  const stack = [d1Dir];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return false;
    }
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) stack.push(path);
      else if (entry.name.endsWith(".sqlite")) return true;
    }
  }
  return false;
}

if (hasLocalDb()) {
  console.log("[db:init] Local D1 database already exists, skip initialization.");
} else {
  console.log("[db:init] No local D1 database found, creating schema + seed data ...");
  execSync("npx wrangler d1 execute test_db --local --file=schema.sql", {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  console.log("[db:init] Done. Run `npm run dev` to start the dev server.");
}
