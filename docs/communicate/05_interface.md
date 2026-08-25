# 05_Collaboration_&_Shared_Planning 极简对接文档

## 1. 模块职责简述
提供行程协作功能，支持多人共同编辑行程明细、发送评论、管理成员角色与邀请。包含邀请流程、权限控制、活动日志记录。

## 2. 依赖项 (需要其他模块/环境支持)
- **依赖接口/组件：**
  - `01_User_&_Account_Management` → `AccountRepo.findAccountById` / `AccountRepo.findAccountByEmail` — 邀请接受时查找或创建用户（模块 01 暴露，见模块 01 接口文档 §3）
  - `02_Trip_Planning_&_Itinerary_Management` → `ItineraryRepo.findByTrip` / `ItemRepo.insertItem` — 行程明细 CRUD（数据归属模块 02，字段以模块 02 的 `CollaborationItem` 为准；模块 05 的 `ItineraryItem` 与其字段对齐）
  - `02_Trip_Planning_&_Itinerary_Management` → `getCollaborationTripData(tripId): CollaborationTripData` — 协作行程基础数据（tripId / tripName / startDate / endDate / itineraries）
- **环境与 Context 依赖：**
  - 无特殊环境变量依赖
  - 通过 Header `x-demo-user-id` 传递当前用户身份（Demo 模式）
  - Cloudflare KV：`invite:{token}`（邀请 Token，30 天过期）；Cloudflare D1：`collab_members`、`collab_roles`、`trip_versions`、`activity_logs`、`notifications`、`chat_messages` 表
  - 邮件服务（EmailJS，异步发送邀请邮件）

## 3. 暴露项 (提供给其他模块使用)
- **导出的组件/函数/API：**（路径遵循 guideline §5：`/0N_<Module_Name>/api/<resource>`）
  - `GET /05_Collaboration_&_Shared_Planning/api/collab/bootstrap` — 一次性拉取完整行程状态（成员、邀请、明细、评论、活动）
  - `POST /05_Collaboration_&_Shared_Planning/api/collab/invites` — 发起邀请
  - `DELETE /05_Collaboration_&_Shared_Planning/api/collab/invites/{inviteId}` — 取消邀请
  - `PATCH /05_Collaboration_&_Shared_Planning/api/collab/invites/{inviteId}/status` — 接受/拒绝邀请
  - `PATCH /05_Collaboration_&_Shared_Planning/api/collab/members/{memberUserId}` — 修改成员角色
  - `DELETE /05_Collaboration_&_Shared_Planning/api/collab/members/{memberUserId}` — 移除成员
  - `DELETE /05_Collaboration_&_Shared_Planning/api/collab/members/leave` — 退出行程
  - `POST /05_Collaboration_&_Shared_Planning/api/collab/items` — 新增行程明细（经模块 02 `ItemRepo.insertItem` 落库）
  - `DELETE /05_Collaboration_&_Shared_Planning/api/collab/items/{itemId}` — 删除行程明细
  - `POST /05_Collaboration_&_Shared_Planning/api/collab/messages` — 发送评论
  - `GET /05_Collaboration_&_Shared_Planning/api/collab/messages` — 获取评论列表
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

/** 行程明细 —— 与模块 02 的 CollaborationItem 字段完全对齐（单一数据模型，数据归属模块 02） */
export interface ItineraryItem {
  itemId: string;
  placeId?: string | null;
  name: string;        // 与 CollaborationItem.name 一致
  day: number;         // 第几天（平铺展示用；可由所属行程日期派生）
  note?: string;
  lat?: number | null; // 扁平坐标标准（guideline §5）
  lon?: number | null;
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

/** 协作行程聚合视图 = 模块 02 CollaborationTripData 基础字段 + 本模块协作数据 */
export interface CollabTrip {
  tripId: string;              // 与 CollaborationTripData.tripId 一致
  tripName: string;            // 与 CollaborationTripData.tripName 一致
  startDate?: string | null;   // 与 CollaborationTripData.startDate 一致
  endDate?: string | null;     // 与 CollaborationTripData.endDate 一致
  region?: string;             // 州/省（可选，来自模块 02 StateInfo.name）
  members: CollabMember[];
  invites: CollabInvite[];
  items: ItineraryItem[];      // 与模块 02 CollaborationItem 对齐
  comments: CollabComment[];
  activity: ActivityEntry[];
}

export type InviteResult = { success: boolean; message?: string; invite?: CollabInvite };

export interface BootstrapResponse {
  success: boolean;
  trip: CollabTrip;
  meUserId: string;
}
```
