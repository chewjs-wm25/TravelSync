# 05_Collaboration_&_Shared_Planning 极简对接文档

## 1. 模块职责简述
提供行程协作功能，支持多人共同编辑行程明细、发送评论、管理成员角色与邀请。包含邀请流程、权限控制、活动日志记录。

## 2. 依赖项 (需要其他模块/环境支持)
- **依赖接口/组件：**
  - `01_User_&_Account_Management` → `AccountRepo.findAccountById` / `AccountRepo.findAccountByEmail` — 邀请接受时查找或创建用户
  - `02_Trip_Planning_&_Itinerary_Management` → `ItineraryRepo.findByTrip` / `ItemRepo.insertItem` — 行程明细 CRUD
- **环境与 Context 依赖：**
  - 无特殊环境变量依赖
  - 通过 Header `x-demo-user-id` 传递当前用户身份（Demo 模式）

## 3. 暴露项 (提供给其他模块使用)
- **导出的组件/函数/API：**
  - `GET /api/collab/bootstrap` — 一次性拉取完整行程状态（成员、邀请、明细、评论、活动）
  - `POST /api/collab/invites` — 发起邀请
  - `DELETE /api/collab/invites/{inviteId}` — 取消邀请
  - `PATCH /api/collab/invites/{inviteId}/status` — 接受/拒绝邀请
  - `PATCH /api/collab/members/{memberUserId}` — 修改成员角色
  - `DELETE /api/collab/members/{memberUserId}` — 移除成员
  - `DELETE /api/collab/members/leave` — 退出行程
  - `POST /api/collab/items` — 新增行程明细
  - `DELETE /api/collab/items/{itemId}` — 删除行程明细
  - `POST /api/collab/messages` — 发送评论
  - `GET /api/collab/messages` — 获取评论列表
- **回调与触发事件：**
  - `ActivityLogger.logActivity()` — 所有写操作完成后记录活动日志
  - `sendInviteEmail()` — 发送邀请邮件（EmailJS 异步）

## 4. 核心 TypeScript 类型
```typescript
export type CollabRole = "Owner" | "Editor" | "Viewer";
export type InviteRole = "Editor" | "Viewer";
export type InviteStatus = "pending" | "accepted" | "rejected" | "expired";

export interface CollabMember {
  id: string;
  name: string;
  email: string;
  role: CollabRole;
  avatar: string;
  online: boolean;
}

export interface CollabInvite {
  id: string;
  token: string;
  email: string;
  role: InviteRole;
  status: InviteStatus;
  invitedAt: number;
  expiresAt: number;
  invitedBy: string;
}

export interface ItineraryItem {
  id: string;
  day: number;
  title: string;
  note?: string;
}

export interface CollabComment {
  id: string;
  authorId: string;
  authorName: string;
  avatar: string;
  time: string;
  text: string;
  own: boolean;
}

export interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  at: number;
}

export interface CollabTrip {
  id: string;
  name: string;
  dates: string;
  region: string;
  members: CollabMember[];
  invites: CollabInvite[];
  items: ItineraryItem[];
  comments: CollabComment[];
  activity: ActivityEntry[];
}

export type InviteResult = { ok: boolean; message?: string; invite?: CollabInvite };

export interface BootstrapResponse {
  ok: boolean;
  trip: CollabTrip;
  meUserId: string;
}
```
