import { execSync } from "node:child_process";
import { join } from "node:path";

const schemaPath = join(
  process.cwd(),
  "data_access_layer",
  "05_Collaboration_&_Shared_Planning",
  "schema.sql"
);

// schema.sql 全部使用幂等语句（IF NOT EXISTS / ON CONFLICT DO NOTHING / WHERE NOT EXISTS），
// 无论本地 D1 是空库、无表还是已有数据，重复执行都安全，因此直接每次都执行，
// 彻底避免“空库文件已存在但没建表”导致 no such table 的错误。
console.log("[db:init] Applying schema + seed data to local D1 ...");
execSync(`npx wrangler d1 execute test_db --local --file="${schemaPath}"`, {
  stdio: "inherit",
  cwd: process.cwd(),
});
console.log("[db:init] Done. Run `npm run dev` to start the dev server.");