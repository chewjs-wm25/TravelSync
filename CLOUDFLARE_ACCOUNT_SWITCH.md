# Cloudflare 环境与数据库切换指南 (Environment Switch Guide)

本文件详细记录了原队友环境（`chewjs-wm25`）的全部配置、迁移至个人新账号环境的配置对照，以及**如何一键无缝换回原环境**的完整操作指南。

---

## 📌 一、原队友环境配置档案（用于日后换回）

在切换前，原生产环境绑定的配置如下（请妥善保存此段）：

### 1. 基础信息
* **线上域名**：`https://travel-sync.chewjs-wm25.workers.dev/`
* **账号标识**：`chewjs-wm25`

### 2. 原 `wrangler.json` 完整配置（备份在 `wrangler.chewjs.json`）
```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "travel-sync",
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-09-23",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "TEST_DB",
      "database_name": "travel-sync-db",
      "database_id": "b8a7cfde-c66a-486e-90bb-faa54f601422"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "TEST_KV",
      "id": "e33eb7cf0a3d4e29a057608a4e440a3d"
    },
    {
      "binding": "PLACE_IMAGE_CACHE",
      "id": "f99dacc70ac04f1084099f9ce746bd7c"
    }
  ],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

---

## 📌 二、你的个人账号环境配置（切换后生效）

| 资源项 | Binding 变量名 | 原队友配置 (chewjs-wm25) | 你的个人账号配置 (当前生效) |
| :--- | :--- | :--- | :--- |
| **Worker 域名** | - | `travel-sync.chewjs-wm25.workers.dev` | `https://travel-sync.ts-chank.workers.dev/` |
| **D1 数据库** | `TEST_DB` | `b8a7cfde-c66a-486e-90bb-faa54f601422` | `ff8b814d-2393-4515-9735-4f1b9e16d1f8` |
| **KV 缓存 1** | `TEST_KV` | `e33eb7cf0a3d4e29a057608a4e440a3d` | `59a9bdab76e148d38763247078e9ec0f` |
| **KV 缓存 2** | `PLACE_IMAGE_CACHE` | `f99dacc70ac04f1084099f9ce746bd7c` | `f009f30105d843f0a4d2e554dc2b192f` |

### 你的个人账号当前 `wrangler.json` 内容：
```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "travel-sync",
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-09-23",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "TEST_DB",
      "database_name": "travel-sync-db",
      "database_id": "ff8b814d-2393-4515-9735-4f1b9e16d1f8"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "TEST_KV",
      "id": "59a9bdab76e148d38763247078e9ec0f"
    },
    {
      "binding": "PLACE_IMAGE_CACHE",
      "id": "f009f30105d843f0a4d2e554dc2b192f"
    }
  ],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

---

## 📌 三、一键换回原队友环境操作（日后需要时执行）

当你的测试/开发完成，需要切回原队友环境时，只需执行以下 2 步：

### 第 1 步：还原 `wrangler.json`
把根目录下的 `wrangler.chewjs.json` 内容直接复制覆盖回 `wrangler.json`。

### 第 2 步：切换账号登录（或直接由队友电脑部署）
* 如果直接在队友电脑上：直接运行 `npm run deploy` 即可。
* 如果在你的电脑上登录队友账号：
  ```bash
  npx wrangler logout
  npx wrangler login
  ```
  在浏览器登录队友账号后，运行 `npm run deploy`。
