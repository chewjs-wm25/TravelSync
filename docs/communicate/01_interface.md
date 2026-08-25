# 用户与账户管理 模块对接文档

## 1. 模块职责简述
> 负责用户注册、登录、会话管理、个人资料/安全/设置维护、邮箱验证及账户删除。对外提供统一的账户操作 API Route 与全局登录状态 Store。

## 2. 依赖项 (需要其他模块/环境支持)
- **依赖接口/组件：** 无（本模块为底层服务模块，不依赖其他业务模块）。
- **环境与 Context 依赖：**
  - Cloudflare D1 数据库绑定 `TEST_DB`（通过 `getCloudflareContext` 获取）
  - `JWT_SECRET` 环境变量（可选，开发环境使用默认值）
  - `GOOGLE_CLIENT_ID` / `GOOGLE_REDIRECT_URI`（可选，Google 登录功能）
  - `NODE_ENV=production` 时禁用测试账号删除

## 3. 暴露项 (提供给其他模块使用)
- **导出的组件/函数/API：**
  - `DashboardPage` — 账户仪表盘页面组件（含 Profile / Security / Settings / Delete 四个 Tab）
  - `AccountAction` — 账户操作请求函数类型，供 DashboardPage 调用
  - `useAuthStore`（Zustand Store）— 全站登录状态源，其他模块可读取 `isLoggedIn` / `user`
  - `mapAccountUser` — 将服务端 `PublicUser` 转换为前端 `User` 格式的工具函数
  - API Route: `POST /01_User_&_Account_Management/account-actions?action=<action>` — 统一账户操作入口
  - API Route: `GET /01_User_&_Account_Management/account-actions` — 获取当前登录用户
- **回调与触发事件：**
  - `onUserChange(user: DashboardUser)` — 用户资料更新后触发
  - `onLogout()` — 登出时触发

## 4. 核心 TypeScript 类型
```typescript
// 前端展示用户
interface DashboardUser {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  phone: string | null;
  profilePicture: string | null;
  createdAt: string;
  isVerified: boolean;
}

// 全站 Store 用户（useAuthStore）
interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
}

// 账户操作函数签名
type AccountAction = (
  action: string,
  data?: Record<string, unknown>
) => Promise<{ user?: DashboardUser; message?: string }>;

// API 请求参数
interface LoginInput {
  identifier: string;
  password: string;
  rememberMe: boolean;
  ipAddress?: string | null;
}

interface RegisterInput {
  username: string;
  fullName: string;
  email?: string;
  phone: string;
  icNumber: string;
  password: string;
  acceptTerms: boolean;
}

interface SettingsInput {
  notificationsEnabled: boolean;
  language: string;
  theme: "light" | "dark";
  privacyLevel: "private" | "contacts" | "public";
}
```

---

# User & Account Management Lightweight Integration Guide

## 1. Module Overview
> Handles user registration, login, session management, profile/security/settings maintenance, email verification, and account deletion. Provides a unified account-operation API Route and a global login-state Store.

## 2. Dependencies (Required from Other Modules/Environment)
- **Dependent Interfaces/Components:** None (this module is a foundational service with no dependencies on other business modules).
- **Environment & Context Dependencies:**
  - Cloudflare D1 database binding `TEST_DB` (obtained via `getCloudflareContext`)
  - `JWT_SECRET` env var (optional; falls back to a default in development)
  - `GOOGLE_CLIENT_ID` / `GOOGLE_REDIRECT_URI` (optional; Google sign-in)
  - Test-account deletion is disabled when `NODE_ENV=production`

## 3. Exports (Provided to Other Modules)
- **Exported Components/Functions/APIs:**
  - `DashboardPage` — Account dashboard page component (Profile / Security / Settings / Delete tabs)
  - `AccountAction` — Type for the request function used by DashboardPage
  - `useAuthStore` (Zustand Store) — Global login-state source; other modules can read `isLoggedIn` / `user`
  - `mapAccountUser` — Utility to convert server `PublicUser` to frontend `User` format
  - API Route: `POST /01_User_&_Account_Management/account-actions?action=<action>` — Unified account-operation endpoint
  - API Route: `GET /01_User_&_Account_Management/account-actions` — Retrieve current logged-in user
- **Callbacks & Events:**
  - `onUserChange(user: DashboardUser)` — Triggered after profile update
  - `onLogout()` — Triggered on sign-out

## 4. Core TypeScript Types
```typescript
// Frontend display user
interface DashboardUser {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  phone: string | null;
  profilePicture: string | null;
  createdAt: string;
  isVerified: boolean;
}

// Global store user (useAuthStore)
interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
}

// Account action function signature
type AccountAction = (
  action: string,
  data?: Record<string, unknown>
) => Promise<{ user?: DashboardUser; message?: string }>;

// API request parameters
interface LoginInput {
  identifier: string;
  password: string;
  rememberMe: boolean;
  ipAddress?: string | null;
}

interface RegisterInput {
  username: string;
  fullName: string;
  email?: string;
  phone: string;
  icNumber: string;
  password: string;
  acceptTerms: boolean;
}

interface SettingsInput {
  notificationsEnabled: boolean;
  language: string;
  theme: "light" | "dark";
  privacyLevel: "private" | "contacts" | "public";
}
```
