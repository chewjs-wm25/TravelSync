> **注意**: 文档使用单一语言填写(基于用户所使用的语言)

-- 中文

> **注意**: 本文档仅用于统一整个系统的接口设计，保持简洁明了
# [模块名称] 极简对接文档

## 1. 模块职责简述
> 简要说明该模块的业务功能与负责的 UI/逻辑范围（1-2句）。

## 2. 依赖项 (需要其他模块/环境支持)
- **依赖接口/组件：** 列出该模块调用的其他模块函数、组件或 API 路由。
- **环境与 Context 依赖：** 说明是否依赖特定的环境变量（如 `.env`）或顶层 Provider（如 AuthContext）。

## 3. 暴露项 (提供给其他模块使用)
- **导出的组件/函数/API：** 列出供外部调用的组件名称、工具函数或开放的 API Route。
- **回调与触发事件：** 列出该模块传递给外部的回调函数及其触发时机（如 `onSuccess: (data) => void`）。

## 4. 核心 TypeScript 类型
- **数据结构定义：** 贴出该模块对外交互使用的核心 `interface` 或 `type` 定义。

-- English

> **Note**: This document is intended solely for unifying the interface design of the entire system. Please keep it concise and clear.

# [Module Name] Lightweight Integration Guide

## 1. Module Overview
> Briefly describe the business functionality and UI/logic scope of this module (1–2 sentences).

## 2. Dependencies (Required from Other Modules/Environment)
- **Dependent Interfaces/Components:** List functions, components, or API routes called from other modules.
- **Environment & Context Dependencies:** Specify any required environment variables (e.g., `.env`) or top-level Providers (e.g., AuthContext).

## 3. Exports (Provided to Other Modules)
- **Exported Components/Functions/APIs:** List components, utility functions, or API routes provided for external use.
- **Callbacks & Events:** List callback functions passed to external modules and their trigger conditions (e.g., `onSuccess: (data) => void`).

## 4. Core TypeScript Types
- **Data Structure Definitions:** Paste the core `interface` or `type` definitions used for external interaction.