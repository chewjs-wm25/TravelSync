# 模块 05：协同合作与共享规划 (Collaboration & Shared Planning) 全函数逻辑与流程详细文档

本文档深入详细列出 Module 05 所有层级函数的执行流程、条件判断、替代分支及异常情况。

---

## 目录
1. [数据访问层 (Data Access Layer - DAL)](#1-数据访问层-data-access-layer---dal)
2. [业务逻辑层 (Business Logic Layer - BLL)](#2-业务逻辑层-business-logic-layer---bll)
3. [外部 API 层 (API Layer)](#3-外部-api-层-api-layer)
4. [路由接口层 (Route API Layer)](#4-路由接口层-route-api-layer)
5. [客户端状态机与组件交互 (Presentation / Store Layer)](#5-客户端状态机与组件交互)

---

# 1. 数据访问层 (Data Access Layer - DAL)

## 1.1 `CollaboratorRepo.ts`（协作者持久化仓库）

### 1. `findByTrip(tripId: string): Promise<CollaboratorWithAccount[]>`
- **功能**：查询指定行程的所有活跃协作者，并连表 `users` 表获取用户名、全名、邮箱和头像。
- **参数**：`tripId: string`（行程唯一标识）。
- **执行流程与步骤**：
  1. 调用 `await getDB()` 取得 Cloudflare D1 数据库实例连接。
  2. 构造 SQL 语句：
     ```sql
     SELECT c.*, u.username, u.full_name, u.email, u.profile_picture
     FROM Collaborators c
     JOIN users u ON u.id = c.user_id
     WHERE c.trip_id = ? AND c.status = 'active'
     ORDER BY c.joined_at ASC
     ```
  3. 执行 `.bind(tripId).all<CollaboratorWithAccount>()`。
  4. **分支与情况**：
     - 若结果 `res` 存在且 `res.results` 为有效数组：返回 `res.results`。
     - 若查询为空、数据库异常或无匹配数据：返回空数组 `[]`。
- **返回**：`CollaboratorWithAccount[]` 列表。

---

### 2. `insertCollaborator(c: { role: CollabRoleDB; trip_id: string; user_id: string; invited_by?: string | null }): Promise<void>`
- **功能**：向行程中新增协作者（幂等写入，已存在则忽略）。
- **参数**：包含角色、行程 ID、用户 ID 及可选的邀请人 ID。
- **执行流程与步骤**：
  1. 调用 `await getDB()`。
  2. 动态加载行程仓库：`const { ensureTripExists } = await import("./TripRepo")`。
  3. 调用 `await ensureTripExists(c.trip_id, c.user_id)`，确保 05 的 `Trip` 表中存在该行程记录（避免外键约束报错）。
  4. **邀请人有效性校验分支**：
     - **情况 1**：`c.invited_by` 存在时：
       - 执行 `SELECT id FROM users WHERE id = ? LIMIT 1` 查询该邀请人是否存在于用户表中。
       - 若存在：`validInviter = c.invited_by`。
       - 若不存在（如脏数据）：`validInviter = null`，避免违反外键约束。
     - **情况 2**：`c.invited_by` 未传或为空：`validInviter = null`。
  5. 构造并执行参数化插入：
     ```sql
     INSERT OR IGNORE INTO Collaborators (role, status, trip_id, user_id, invited_by)
     VALUES (?, 'active', ?, ?, ?)
     ```
     绑定参数为 `[c.role, c.trip_id, c.user_id, validInviter]`。

---

### 3. `updateRole(tripId: string, userId: string, role: CollabRoleDB): Promise<void>`
- **功能**：更新行程中某协作者的权限角色（如从 Viewer 升级为 Editor）。
- **步骤**：
  1. 获取数据库连接。
  2. 执行 `UPDATE Collaborators SET role = ? WHERE trip_id = ? AND user_id = ?`，参数为 `[role, tripId, userId]`。

---

### 4. `deleteCollaborator(tripId: string, userId: string): Promise<void>`
- **功能**：物理删除协作者（成员主动退出行程或被 Owner 移除）。
- **步骤**：
  1. 获取数据库连接。
  2. 执行 `DELETE FROM Collaborators WHERE trip_id = ? AND user_id = ?`，参数为 `[tripId, userId]`。

---

### 5. `updateLastSeen(tripId: string, userId: string): Promise<void>`
- **功能**：更新协作者在指定行程的最后在线时间（心跳机制），用于前端判定在线指示绿灯。
- **步骤**：
  1. 获取数据库连接。
  2. 获取当前 ISO 时间戳：`new Date().toISOString()`。
  3. 执行 `UPDATE Collaborators SET last_seen = ? WHERE trip_id = ? AND user_id = ?`。

---

### 6. `findTripIdsByUserId(userId: string): Promise<string[]>`
- **功能**：查询指定用户作为协作者加入的所有活跃行程 ID。
- **步骤**：
  1. 获取数据库连接。
  2. 执行 `SELECT DISTINCT trip_id FROM Collaborators WHERE user_id = ? AND status = 'active'`。
  3. 映射返回 `(res.results ?? []).map((r) => r.trip_id)`。

---

### 7. `countByTrip(tripId: string): Promise<number>`
- **功能**：统计指定行程当前活跃的协作者总人数（包含 Owner）。
- **步骤**：
  1. 执行 `SELECT COUNT(*) as cnt FROM Collaborators WHERE trip_id = ? AND status = 'active'`。
  2. 返回 `res?.cnt ?? 0`。

---

### 8. `deleteNonOwners(tripId: string, ownerId: string): Promise<number>`
- **功能**：当行程从共享切换为私有状态时，瞬间踢出除 Owner 外的所有其他协作者。
- **步骤**：
  1. 执行 `DELETE FROM Collaborators WHERE trip_id = ? AND user_id != ?`，绑定 `[tripId, ownerId]`。
  2. 返回被移除的成员数量 `res.meta.changes ?? 0`。

---

### 9. `ensureOwner(tripId: string, ownerId: string): Promise<void>`
- **功能**：确保 Owner 在 `Collaborators` 表中必定有一条记录（幂等）。
- **步骤**：
  1. 执行 `INSERT OR IGNORE INTO Collaborators (role, status, trip_id, user_id, invited_by) VALUES ('Owner', 'active', ?, ?, NULL)`。

---

## 1.2 `InviteRepo.ts`（邀请管理仓库）

### 1. `findByTrip(tripId: string): Promise<InviteWithSender[]>`
- **功能**：获取指定行程下的所有邀请记录，连表 `users` 表提取发送者姓名。
- **步骤**：
  1. 执行 SQL：
     ```sql
     SELECT i.*, COALESCE(u.full_name, u.username, 'A Member') AS sender_name
     FROM Collaboration_Invitations i
     LEFT JOIN users u ON u.id = i.sender_id
     WHERE i.trip_id = ?
     ORDER BY i.sent_at DESC
     ```
  2. 保护性检查：若 `res.results` 为数组则返回，否则返回 `[]`。

---

### 2. `findById(id: string): Promise<InviteRow | null>`
- **功能**：按邀请主键 `invitation_id` 查找单条记录。
- **步骤**：执行 `SELECT * FROM Collaboration_Invitations WHERE invitation_id = ? LIMIT 1`。

---

### 3. `findByToken(token: string): Promise<InviteWithSender | null>`
- **功能**：依据 48 位安全的 Token 查找邀请信息及发起者姓名。
- **步骤**：执行 `SELECT ... WHERE i.Token = ? LIMIT 1`，找不到则返回 `null`。

---

### 4. `insertInvite(i: { ... }): Promise<InviteRow>`
- **功能**：创建新的邀请记录。
- **步骤**：
  1. 使用 `crypto.randomUUID()` 生成新 `invitation_id`。
  2. 执行 `INSERT INTO Collaboration_Invitations (invitation_id, Token, receiver_email, role, status, expires_at, trip_id, sender_id, receiver_user_id) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)`。
  3. 参数中状态固定为 `'pending'`，`receiver_user_id` 若无则绑定 `null`。
  4. 重新调用 `findById(invitation_id)` 获取完整行对象并返回。

---

### 5. `findPendingForUser(userId: string, email?: string): Promise<ReceivedInviteWithDetails[]>`
- **功能**：在 Control Center 中查询当前登录用户收到的所有有效待处理邀请。
- **逻辑分支与判定**：
  1. 计算 `lowerEmail = email ? email.toLowerCase() : ""`。
  2. 复合匹配条件：
     - `i.receiver_user_id = ?`（直接匹配用户 ID）
     - 或 `lower(i.receiver_email) = lower(?) AND ? != ''`（通过绑定的邮箱匹配）。
  3. 状态限制：`i.status = 'pending'`。
  4. 有效期过滤：`datetime(i.expires_at) > datetime('now')`（已过期的不予展示）。
  5. 行程名称联查：通过 `LEFT JOIN Trip` 及 `LEFT JOIN trips` 双向兜底：`COALESCE(t.TripName, m2.trip_name, 'Shared Trip') AS trip_name`。

---

### 6. `updateStatus(id: string, status: InviteStatusDB): Promise<void>`
- **功能**：更新邀请状态（`pending` / `accepted` / `rejected` / `expired`）。
- **步骤**：执行 `UPDATE Collaboration_Invitations SET status = ? WHERE invitation_id = ?`。

---

### 7. `updateReceiverUserId(id: string, userId: string): Promise<void>`
- **功能**：当新用户通过链接注册或受邀用户登录后，将真实 `userId` 关联到邀请行。
- **步骤**：执行 `UPDATE Collaboration_Invitations SET receiver_user_id = ? WHERE invitation_id = ?`。

---

### 8. `expirePending(nowIso: string): Promise<InviteRow[]>`
- **功能**：批量扫描并过期所有超时的邀请（模拟 30 天自动过期）。
- **步骤**：
  1. 执行 `UPDATE Collaboration_Invitations SET status = 'expired' WHERE status = 'pending' AND expires_at <= ? RETURNING *`。
  2. 返回被标记为过期的邀请行数组。

---

### 9. `deleteInvite(id: string): Promise<void>`
- **功能**：彻底删除邀请行。
- **步骤**：执行 `DELETE FROM Collaboration_Invitations WHERE invitation_id = ?`。

---

## 1.3 `TripRepo.ts`（行程与数据对齐仓库）

### 1. `purgeDeletedTrip(tripId: string): Promise<void>`
- **功能**：彻底级联清理已被 Module 02 删除的行程在 Module 05 中的所有关联数据。
- **步骤与清理顺序**：
  - 使用原子批处理 `await db.batch([...])` 执行 9 步物理级联删除：
    1. `DELETE FROM Trip WHERE TripID = ?`
    2. `DELETE FROM Collaborators WHERE trip_id = ?`
    3. `DELETE FROM Collaboration_Invitations WHERE trip_id = ?`
    4. `DELETE FROM Itinerary_Item WHERE ItineraryID IN (SELECT ItineraryID FROM Itinerary WHERE TripID = ?)`
    5. `DELETE FROM Itinerary WHERE TripID = ?`
    6. `DELETE FROM chats WHERE trip_id = ?`
    7. `DELETE FROM activity_logs WHERE trip_id = ?`
    8. `DELETE FROM trip_likes WHERE trip_id = ?`
    9. `DELETE FROM plan_share_keys WHERE trip_id = ?`
  - 异常分支：`catch (e)` 捕获并记录错误日志，不向外抛出异常。

---

### 2. `syncAndCleanDeletedTrips(): Promise<void>`
- **功能**：全量比对 05 与 02 的行程，自动同步清理已被 02 删除的所有孤儿数据。
- **步骤**：
  1. 查询孤儿行程：`SELECT TripID as tripId FROM Trip WHERE TripID NOT IN (SELECT trip_id FROM trips)`。
  2. 遍历找到的每个孤儿 `tripId`，逐一调用 `await purgeDeletedTrip(id)`。
  3. 执行兜底清理：清理 `Collaborators` 中存在但在 `trips` 表中已删除的协作记录。
  4. 执行兜底清理：清理 `Collaboration_Invitations` 中存在但在 `trips` 表中已删除的邀请记录。
  5. 异常保护：若 `trips` 表尚未创建，静默捕获忽略。

---

### 3. `findTripById(id: string): Promise<TripRow | null>`
- **功能**：根据行程 ID 查询详情，以 Module 02 `trips` 表作为唯一基准真相源 (Source of Truth)。
- **核心判定与步骤**：
  1. **检查 Module 02 主表**：
     - 查询 `SELECT ... FROM trips WHERE trip_id = ? LIMIT 1`。
     - **分支 A（02 中已不存在该行程）**：说明该行程已在规划模块被用户删除。立即调用 `await purgeDeletedTrip(id)` 清理 05 孤儿数据，并返回 `null`。
     - **分支 B（02 中存在该行程）**：执行 `INSERT OR IGNORE INTO Trip (TripID, TripName, StartDate, EndDate, Region, Status, TripNote, UserID) VALUES (?, ?, ?, ?, '', 'planning', ?, ?)`，确保 05 的 `Trip` 镜像存在，保障外键完整性。
     - 查询并返回 05 `Trip` 表的记录。
  2. **异常回退分支**：若查询 02 产生错误（如环境未初始化），回退从 05 的 `Trip` 表中直接查出返回。

---

### 4. `ensureTripExists(id: string, fallbackUserId?: string): Promise<void>`
- **功能**：确保指定 ID 的行程在 05 `Trip` 表中存在，若不存在则创建占位行程。
- **步骤**：调用 `findTripById(id)`，若为 `null`，绑定 `fallbackUserId || 'dev-user-001'` 插入占位记录。

---

### 5. `insertTrip(t: { ... }): Promise<TripRow>`
- **功能**：向 05 的 `Trip` 表中插入新行程记录。
- **步骤**：未指定 `TripID` 时生成 `crypto.randomUUID()`，插入并返回 `findTripById(TripID)`。

---

### 6. `importFullTrip(userId: string, plan: ImportTripPayload): Promise<{ tripId: string; tripName: string }>`
- **功能**：**全流程深层导入函数**。将导入的旅行计划完整持久化到 Module 05 和 Module 02 的所有相关数据库表中。
- **详细步骤**：
  1. 生成全局唯一 `tripId = trip_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`。
  2. **写入 05 `Trip` 表**：插入行程名称、起止日期、区域、备注及所属用户。
  3. **写入 02 `trips` 表**：使用 `INSERT OR REPLACE INTO trips` 写入，确保行程在规划主页能够被立即看见和编辑。
  4. **共享模式判断**：
     - `if (plan.isShared)`：向 `Collaborators` 表插入 Owner 行（`role = 'Owner', status = 'active'`）。
  5. **记录动态**：向 `activity_logs` 插入 `'imported trip plan "..."'`。
  6. **逐日循环写入 Itineraries**：
     - 初始化 `dayIdx = 0`。
     - 遍历 `plan.itineraries` 中的每个 `day`：
       - `dayIdx += 1`。
       - 生成 `itineraryId = itin_${uuid}`。
       - 标题取 `day.title || 'Day ' + dayIdx`，日期取 `day.date`。
       - 写入 05 的 `Itinerary` 表。
       - 写入 02 的 `itineraries` 表。
       - **遍历当天的具体项 `day.items`**：
         - 生成 `itemId = it_${uuid}`。
         - 校验 `validTypes = ['attraction', 'restaurant', 'hotel', 'transport', 'activity', 'other']`，不合法则降级为 `'attraction'`。
         - 写入 05 的 `Itinerary_Item` 表（状态为 `'planned'`）。
         - 写入 02 的 `itinerary_items` 表（包含经纬度 `lat`, `lon`, 图片 `imageUrl`, 排序位置 `position` 等）。
  7. 返回 `{ tripId, tripName: plan.tripName }`。

---

## 1.4 `ItemRepo.ts` 与 `ItineraryRepo.ts`

### 1. `ItemRepo.findByItinerary(ids: string[]): Promise<ItemRow[]>`
- **步骤**：`if (ids.length === 0) return []`。动态拼接 `?` 占位符后执行 `SELECT * FROM Itinerary_Item WHERE ItineraryID IN (...)`。

### 2. `ItemRepo.findById(id: string): Promise<ItemRow | null>`
- **步骤**：执行 `SELECT * FROM Itinerary_Item WHERE ItemID = ? LIMIT 1`。

### 3. `ItemRepo.insertItem(i: { ... }): Promise<ItemRow>`
- **步骤**：生成 `ItemID = crypto.randomUUID()`，插入 `Itinerary_Item`（类型为 `'attraction'`），最后调用 `findById` 返回。

### 4. `ItemRepo.deleteItem(id: string): Promise<void>`
- **步骤**：执行 `DELETE FROM Itinerary_Item WHERE ItemID = ?`。

### 5. `ItineraryRepo.findByTrip(tripId: string): Promise<ItineraryRow[]>`
- **步骤**：执行 `SELECT * FROM Itinerary WHERE TripID = ? ORDER BY Date ASC`。

### 6. `ItineraryRepo.insertItinerary(i: { Title, Date?, TripID }): Promise<ItineraryRow>`
- **步骤**：生成 `ItineraryID`，写入数据库并返回对象。

---

## 1.5 `ShareKeyRepo.ts`（分享码仓库）

### 1. `insertShareKey(entry: { ... }): Promise<ShareKeyRow>`
- **步骤**：执行 `INSERT OR REPLACE INTO plan_share_keys`，初始 `use_count = 0`，随后调用 `findByKey` 校验并返回。

### 2. `findByKey(shareKey: string): Promise<ShareKeyRow | null>`
- **步骤**：去除首尾空格，执行 `WHERE UPPER(share_key) = UPPER(?) LIMIT 1`。

### 3. `findLatestByTrip(tripId: string, createdBy?: string): Promise<ShareKeyRow | null>`
- **步骤**：若有 `createdBy` 则过滤创建人，否则取该行程最新生成的一条记录返回。

### 4. `incrementUsage(shareKey: string): Promise<void>`
- **步骤**：执行 `UPDATE plan_share_keys SET use_count = use_count + 1 WHERE UPPER(share_key) = UPPER(?)`。

---

## 1.6 `TripLikeRepo.ts`（点赞社交仓库）

### 1. `getLikes(tripId: string, currentUserId?: string): Promise<TripLikeData>`
- **步骤**：
  1. 连表查询 `trip_likes` 与 `users`：提取所有点赞人的 ID、姓名及头像。
  2. 统计数量：`count = likers.length`。
  3. 判定当前用户：`likedByMe = currentUserId ? likers.some(l => l.id === currentUserId) : false`。
  4. 返回 `{ count, likedByMe, likers }`。

### 2. `toggleLike(tripId: string, userId: string)`
- **步骤**：
  1. 调用 `ensureTripExists(tripId, userId)`。
  2. 查询是否有点赞记录。
  3. **分支判定**：
     - 若已存在：执行 `DELETE FROM trip_likes ...`。
     - 若不存在：生成 UUID 执行 `INSERT OR IGNORE INTO trip_likes ...`。
  4. 重新拉取最新数据返回。

### 3. `getBatchLikeCounts(tripIds: string[]): Promise<Record<string, number>>`
- **步骤**：若 `tripIds` 为空返回 `{}`。使用 `GROUP BY trip_id` 批量统计点赞数并组装为字典返回。

---

## 1.7 `ActivityLogRepo.ts`、`MessageRepo.ts`、`AccountRepo.ts`

- **`ActivityLogRepo.findByTrip`**：拉取最新的 50 条动态日志（`ORDER BY id DESC LIMIT 50`）。
- **`ActivityLogRepo.insertActivity`**：确保行程存在后写入日志，静默忽略所有异常。
- **`MessageRepo.findByTrip`**：按 `id ASC` 顺序获取行程的全部群聊评论。
- **`MessageRepo.insertChat`**：插入新评论并返回自增的 `id`。
- **`AccountRepo.findAccountById / Email / Username`**：查询 Module 01 的 `users` 表。
- **`AccountRepo.insertAccount`**：快速为受邀用户建档（默认角色为 `'user'`）。

---

# 2. 业务逻辑层 (Business Logic Layer - BLL)

## 2.1 `RolePermissions.ts`（RBAC 权限判定）

### `can(role: CollabRole, permission: Permission): boolean`
- **权限定义与归属**：
  - `Owner`：拥有所有权限（`view`, `invite`, `cancelInvite`, `changeRole`, `removeMember`, `editItinerary`, `comment`, `manageTrip`）。
  - `Editor`：拥有编辑与协同权限（`view`, `editItinerary`, `comment`, `manageTrip`, `leave`）。**绝对禁止邀请新成员、撤销邀请、改角色或踢人**。
  - `Viewer`：只读权限（`view`, `leave`）。
- **流程**：检索对应角色的权限列表，返回 `ROLE_PERMISSIONS[role].includes(permission)`。

---

## 2.2 `InvitationService.ts`（邀请计算）

### 1. `generateInviteToken(): string`
- **步骤**：优先调用 Web Crypto 的 `crypto.getRandomValues` 填充 24 字节安全随机数，降级使用 `Math.random`，转为 48 位 16 进制字符串。

### 2. `isInviteExpired(expiresAt: number, now = Date.now()): boolean`
- **步骤**：直接判断 `now > expiresAt`。超过 30 天自动失效。

### 3. `daysRemaining(expiresAt: number, now = Date.now()): number`
- **步骤**：计算公式 `Math.max(0, Math.ceil((expiresAt - now) / 86400000))`。

---

## 2.3 `PlanImportExportService.ts`（导入导出与分享码服务）

### 1. `generateTripExportJSON(trip: CollabTrip, detailedDays?: ExportedItineraryDay[]): ExportedTripPlan`
- **分支逻辑**：
  - **情况 1**：若传入了 `detailedDays`，直接使用该明细。
  - **情况 2**：若无 `detailedDays` 但包含 `trip.items`，按 `item.day` 自动聚合到 Map 中，并依据行程 `startDate` 顺延推导每一天的自然日期。
  - 打包带有 `version: "1.0"`、`app: "TravelSync"` 及 ISO 时间戳的标准化对象。

### 2. `getFullTripExportData(tripId: string, _userId?: string): Promise<ExportedTripPlan>`
- **步骤**：
  1. 查询 `findTripById(tripId)`，缺失时兜底查 02 `trips` 表。
  2. 查询 05 `Itinerary`，缺失时兜底查 02 `itineraries`。
  3. 查询 05 `Itinerary_Item`，缺失时兜底查 02 `itinerary_items`（含经纬度、图片等）。
  4. 组装为标准导出数据返回。

### 3. `parseAndValidateTripPlan(jsonText: string)`
- **全方位校验与解析逻辑**：
  1. 空值检查：若非有效文本，返回 `Empty file content`。
  2. JSON 反序列化异常保护：`try { JSON.parse } catch`。
  3. 根节点必须为对象。
  4. 智能嗅探行程标题（兼容 `tripName`, `trip_name`, `name`, `title`），起止日期及备注。
  5. **日程结构化分支**：
     - **分支 A（嵌套数组）**：检测 `itineraries` / `days` / `itinerary`。遍历每一日并通过 `sanitizeItem` 净化地点。
     - **分支 B（平铺数组）**：检测 `items`。按 `item.day` 进行多日分组。
     - **分支 C（空白行程）**：自动生成 `Day 1` 初始结构。
  6. 自动推导起止日期：若缺失则根据首日和末日日期反推。
  7. 返回 `{ success: true, plan }`。

### 4. `cleanShareKeyInput(rawInput: string): string`
- **步骤**：支持用户直接粘贴形如 `http://...?importKey=PLAN-XXXX-XXXX` 的完整浏览器链接，自动提取出其中的 Code，过滤特殊符号并转换为大写。

### 5. `createPlanShareKey(tripId: string, userId: string, expiresDays?: number)`
- **步骤**：抓取行程导出快照 -> 查询该行程是否已有活跃 Key（有则复用，无则生成 `PLAN-XXXX-XXXX`）-> 计算过期时间 -> 存入数据库并返回。

### 6. `getPlanByShareKey(keyOrUrl: string)`
- **步骤**：清洗输入 -> 查询记录（找不到报 404）-> 检查过期时间 -> 解析快照 JSON -> 异步累加使用次数 -> 返回待导入计划。

---

## 2.4 `GoogleCalendarSyncService.ts`（谷歌日历同步服务）

### 1. `convertTripToGoogleCalendarEvents(trip: CollabTrip): GoogleCalendarEventPayload[]`
- **错峰排期算法**：
  1. 生成行程整体全天概览事件（标注马来西亚时区及行程备注）。
  2. 按天分组所有景点地点。
  3. 每天每个景点错峰计算：
     - `startHour = Math.min(9 + Math.floor(idx * 2.5), 21)`。
     - `startMinute = (idx * 30) % 60`。
     - `endHour = Math.min(startHour + 2, 23)`。
     - 强绑定马来西亚时区 `Asia/Kuala_Lumpur` (UTC+8)。

### 2. `requestGoogleCalendarAccessToken(clientId): Promise<string>`
- **步骤**：原生注入 Google Identity Services SDK 脚本，初始化 OAuth2 客户端并申请 `https://www.googleapis.com/auth/calendar.events` 权限。

### 3. `syncTripToGoogleCalendar(accessToken, trip, onProgress?): Promise<SyncTripResult>`
- **步骤**：将事件逐个提交给 Google REST API，实时触发 `onProgress` 进度回调。

---

## 2.5 `server/PermissionValidator.ts`（服务端鉴权拦截器）

### `requirePermission(tripId: string, userId: string, permission: Permission): Promise<void>`
- **判定全流程**：
  1. 拉取行程协作者列表：`CollaboratorRepo.findByTrip(tripId)`。
  2. 匹配当前用户角色。
  3. **未入表时判定 Owner**：查 05 `Trip.UserID` 或 02 `trips.user_id`；若匹配则调用 `ensureOwner` 自动补录，视为 Owner。
  4. **拒绝拦截**：
     - 用户未匹配：抛出 `"You are not a member of this trip."`。
     - 权限不足：抛出 `"Role ... does not have permission: ..."`。

---

## 2.6 `server/TripShareService.ts`（控制中心聚合与共享切换）

### 1. `buildControlCenterData(ownedRaw, viewerId: string): Promise<ControlCenterData>`
- **步骤**：
  1. 遍历 `ownedRaw`，并行拉取每个行程的协作者数量、待处理邀请及当前用户身份。
  2. 收集加入的行程：从 `CollaboratorRepo` 查找已加入行程，**严格剔除自身拥有的行程以及已在 02 中删除的孤儿行程**，形成 `joined` 清单。
  3. 拉取待处理邀请：调用 `InviteRepo.findPendingForUser` 匹配邮箱或用户 ID。

### 2. `setTripShareStatus(tripId: string, actorId: string, isShared: boolean)`
- **分支逻辑**：
  1. 权限拦截：必须为行程 Owner。
  2. **切换为私有 (`isShared = false`)**：
     - 踢出非 Owner：`CollaboratorRepo.deleteNonOwners`。
     - 删除协作表中自身的 Owner 行。
     - 将所有未处理邀请标记为 `expired`。
     - 记录日志 `"disabled sharing - removed all collaborators"`。
  3. **切换为共享 (`isShared = true`)**：
     - 确保 05 `Trip` 镜像存在。
     - 确保 Owner 记录存在。
     - 记录日志 `"enabled sharing"`。

---

## 2.7 `server/CollabBootstrap.ts`（协作聚合加载）

### `loadBootstrap(tripId: string, meUserId: string): Promise<BootstrapOutput>`
- **步骤**：
  1. 查询行程，若属于 02 私有行程首次打开则自动镜像到 05 并补全 Owner 行。
  2. 触发在线心跳：`CollaboratorRepo.updateLastSeen(tripId, meUserId)`。
  3. 并行拉取日程、协作者、邀请、群聊、动态日志、点赞数据。
  4. 若 05 日程为空，自动降级从 02 表拉取日程与地点。
  5. 组装为前端统一的 `CollabTrip`。

---

## 2.8 `server/EventBroadcaster.ts`（SSE 广播器）

- **`addListener(userId, tripId, controller)`**：为客户端登记 SSE 长连接。
- **`removeListener(userId, tripId)`**：连接关闭时安全注销。
- **`broadcast(tripId, event, excludeUserId?)`**：向同行程在线协同者广播事件，可排除发送者本人。
- **`sendHeartbeat()`**：每 30 秒发送一次心跳保活包，自动识别并清理断开连接。

---

## 2.9 `store/CollabStore.ts`（客户端状态机、短轮询与乐观更新）

- **短轮询机制 (`startPolling`)**：每 1500ms（`POLL_INTERVAL_MS = 1500`）触发 `silentRefresh`。在执行本地写操作期间（`isWriting = true`）自动暂停轮询，防止乐观更新被旧状态覆盖。
- **乐观更新策略**：
  - **`addItem`**：本地立即向 `items` 追加项，网络请求失败由后续轮询回滚。
  - **`removeItem`**：本地立即从 `items` 中过滤移除。
  - **`addComment`**：本地立即生成以 `temp-` 为前缀的临时评论，服务端写完后下次轮询自动匹配去重合并。
  - **`toggleLike`**：本地立即增减点赞数并更新红心状态，随后异步与后端对齐。
  - **`changeRole` / `removeMember`**：立即在本地列表中更新成员角色或剔除成员。

---

# 3. 外部 API 层 (API Layer)

## 3.1 `collab.ts`
- 封装全部与后端 Route API 沟通的方法：
  - 自动附加 `Content-Type: application/json`、`x-demo-user-id` 及 `x-trip-id` 请求头。
  - 包含 `bootstrap`, `listControlCenter`, `toggleShare`, `invite`, `cancelInvite`, `updateInvite`, `expireInvites`, `changeRole`, `removeMember`, `leaveTrip`, `addItem`, `removeItem`, `addComment`, `getComments`, `getLikes`, `toggleLike`, `importTrip`, `getTripExport`, `createPlanShareKey`, `getPlanByShareKey`。

## 3.2 `GoogleCalendarApi.ts`
- **`insertGoogleCalendarEvent`**：直接调用 Google Calendar v3 REST API 向 Primary 日历插入事件。
- **`buildGoogleCalendarWebIntentUrl`**：构造免登录的 Google 日历 Web Intent 网页模板链接。

## 3.3 `email.ts`
- **`sendInviteEmail`**：直接向 EmailJS 外部服务器发送请求，真实投递邀请邮件至受邀者邮箱（附带专属加入链接及 30 天有效期提醒）。

---

# 4. 路由接口层 (Route API Layer)

所有路由运行在 Next.js App Router 上，部署至 Cloudflare Workers。

### 1. `GET /api/collab/bootstrap`
- 提取 `tripId` 与用户 ID，调用 `loadBootstrap` 返回行程全景数据。

### 2. `POST /api/collab/invites`
- 校验 `invite` 权限 -> 校验是否邀请自己 -> 校验是否已在行程中 -> 校验是否有待处理邀请 -> 写入邀请表生成 30 天 Token -> 写入动态 -> SSE 广播。

### 3. `PATCH /api/collab/invites/[inviteId]/status`
- 处理受邀者接受 (`accepted`) 或拒绝 (`rejected`) 邀请。若接受，自动将用户插入 `Collaborators` 表并广播 `member_joined`。

### 4. `POST /api/collab/invites/register`
- 供未注册用户通过邮件专属链接一步完成账号注册与行程加入：
  - 校验 Token 有效性与未过期。
  - 调用 `AuthService.register`（与 Module 01 规则及 PBKDF2 100,000 次哈希完全一致）。
  - 接受邀请并添加为协作者，下发 Session Cookie。

### 5. `PATCH /api/collab/trips/[tripId]/share`
- 切换共享状态：私有化时调用 `setTripShareStatus` 批量踢出非 Owner 并作废邀请。

### 6. `POST /api/collab/import`
- 支持 JSON 文本、标准结构或分享码导入，调用 `TripRepo.importFullTrip` 级联落库。

### 7. `GET /api/collab/share-key/[key]`
- 根据分享码解析行程，供前端在导入前进行可视化预览。

---

# 5. 客户端状态机与组件交互

1. **`CollaborationPageClient.tsx`**：主交互页面，支持根据 URL 参数 `?trip=...`、`?invite=...` 或 `?importKey=...` 动态唤起对应行程、接受邀请弹窗或免文件导入预览。
2. **`ControlCenter.tsx`**：显示“我拥有的行程”、“我加入的行程”及“待处理的邀请”，支持一键切换行程、开启/关闭共享模式。
3. **`ImportTripModal.tsx` 与 `ExportTripModal.tsx`**：支持通过专属分享码（PLAN-XXXX-XXXX）或标准 JSON 文件双向导入导出行程。
4. **`GoogleCalendarSyncModal.tsx`**：支持一键授权同步至谷歌日历或通过 Web Intent 快捷保存。
