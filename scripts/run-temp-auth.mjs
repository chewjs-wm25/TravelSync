import { spawn } from "node:child_process";
import readline from "node:readline";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_CLIENT_ID = "1027473678070-2r0m2qlvttlk6fnsmui7mfpc0jcv1q8e.apps.googleusercontent.com";
const ENV_PATH = path.resolve(process.cwd(), ".env.local");

// Check if .env.local already exists before running
const envExistedBefore = fs.existsSync(ENV_PATH);

function cleanup() {
  if (!envExistedBefore && fs.existsSync(ENV_PATH)) {
    try {
      // Overwrite with empty string first for security, then delete
      fs.writeFileSync(ENV_PATH, "");
      fs.unlinkSync(ENV_PATH);
      console.log("\n🔒 [Security] Temporary secrets safely wiped and deleted from disk.");
    } catch {
      // Ignore
    }
  }
}

// Ensure cleanup triggers on any exit signal
process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});
process.on("uncaughtException", (err) => {
  cleanup();
  console.error(err);
  process.exit(1);
});

async function askQuestion(query, isPassword = false) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (isPassword) {
      process.stdout.write(query);
      let password = "";
      const onData = (char) => {
        char = char.toString();
        switch (char) {
          case "\n":
          case "\r":
          case "\u0004":
            process.stdin.removeListener("data", onData);
            break;
          case "\u0003": // Ctrl+C
            cleanup();
            process.exit(0);
            break;
          case "\u007f": // Backspace
          case "\b":
            if (password.length > 0) {
              password = password.slice(0, -1);
              process.stdout.write("\b \b");
            }
            break;
          default:
            password += char;
            process.stdout.write("*");
            break;
        }
      };

      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();
      process.stdin.on("data", onData);

      rl.question("", () => {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        rl.close();
        console.log();
        resolve(password.trim());
      });
    } else {
      rl.question(query, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

async function main() {
  console.log("==================================================");
  console.log("🔐 TravelSync 临时安全启动工具 (Zero-Footprint)");
  console.log("==================================================");
  console.log("此脚本会将密钥安全加载到内存中，并在退出时自动清除所有痕迹。\n");

  const inputId = await askQuestion(
    `👉 请输入 Google Client ID (直接回车使用默认配置):\n> `
  );
  const clientId = inputId || DEFAULT_CLIENT_ID;

  const clientSecret = await askQuestion(
    `👉 请输入 Google Client Secret (输入内容将自动打码遮蔽):\n> `,
    true
  );

  if (!clientSecret) {
    console.log("⚠️ 未输入 Secret，取消启动。");
    process.exit(1);
  }

  // Write temporary .env.local for tooling that reads local files
  fs.writeFileSync(
    ENV_PATH,
    `GOOGLE_CLIENT_ID=${clientId}\nGOOGLE_CLIENT_SECRET=${clientSecret}\n`
  );

  console.log("\n🚀 正在启动服务 (npm run preview)...");
  console.log("💡 按 [Ctrl + C] 停止服务，将自动销毁本地密钥记录。\n");

  const child = spawn("npm", ["run", "preview"], {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      GOOGLE_CLIENT_ID: clientId,
      GOOGLE_CLIENT_SECRET: clientSecret,
    },
  });

  child.on("exit", (code) => {
    cleanup();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  cleanup();
  console.error("Error:", err);
  process.exit(1);
});
