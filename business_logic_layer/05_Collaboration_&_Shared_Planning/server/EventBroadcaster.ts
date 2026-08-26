/**
 * SSE 事件广播服务
 * 管理所有活跃的 SSE 连接，支持按 tripId 广播事件
 */

export type SSEEvent =
  | { type: "member_joined"; member: { id: string; name: string; email: string; role: string; avatar: string } }
  | { type: "member_left"; userId: string }
  | { type: "member_removed"; userId: string }
  | { type: "role_changed"; userId: string; role: string }
  | { type: "invite_created"; invite: { id: string; email: string; role: string; status: string; invitedBy: string } }
  | { type: "invite_cancelled"; inviteId: string }
  | { type: "item_added"; item: { itemId: string; day: number; name: string; note?: string } }
  | { type: "item_removed"; itemId: string }
  | { type: "comment_added"; comment: { id: string; authorId: string; authorName: string; avatar: string; time: string; text: string } }
  | { type: "activity"; entry: { id: string; actor: string; action: string; at: number } }
  | { type: "heartbeat"; timestamp: number };

interface Listener {
  userId: string;
  tripId: string;
  controller: ReadableStreamDefaultController;
  lastActivity: number;
}

class EventBroadcaster {
  private listeners: Map<string, Listener[]> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // 启动心跳，每30秒发送一次
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
  }

  /**
   * 添加 SSE 连接监听器
   */
  addListener(userId: string, tripId: string, controller: ReadableStreamDefaultController): void {
    const key = this.getTripKey(tripId);
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }

    // 移除该用户之前的连接（避免重复）
    this.removeListener(userId, tripId);

    this.listeners.get(key)!.push({
      userId,
      tripId,
      controller,
      lastActivity: Date.now(),
    });

    console.log(`[SSE] User ${userId} connected to trip ${tripId}. Total listeners: ${this.getListenerCount(tripId)}`);
  }

  /**
   * 移除 SSE 连接监听器
   */
  removeListener(userId: string, tripId: string): void {
    const key = this.getTripKey(tripId);
    const listeners = this.listeners.get(key);
    if (!listeners) return;

    const index = listeners.findIndex((l) => l.userId === userId);
    if (index !== -1) {
      listeners.splice(index, 1);
      console.log(`[SSE] User ${userId} disconnected from trip ${tripId}`);
    }

    // 清理空的 trip
    if (listeners.length === 0) {
      this.listeners.delete(key);
    }
  }

  /**
   * 向同 trip 的所有连接广播事件（排除发送者自己）
   */
  broadcast(tripId: string, event: SSEEvent, excludeUserId?: string): void {
    const key = this.getTripKey(tripId);
    const listeners = this.listeners.get(key);
    if (!listeners || listeners.length === 0) return;

    const data = `data: ${JSON.stringify(event)}\n\n`;
    const deadListeners: Listener[] = [];

    for (const listener of listeners) {
      // 跳过发送者自己（如果指定了）
      if (excludeUserId && listener.userId === excludeUserId) continue;

      try {
        listener.controller.enqueue(data);
        listener.lastActivity = Date.now();
      } catch {
        // 连接已关闭，标记为死连接
        deadListeners.push(listener);
      }
    }

    // 清理死连接
    for (const dead of deadListeners) {
      this.removeListener(dead.userId, tripId);
    }
  }

  /**
   * 向同 trip 的所有连接广播事件（包括发送者自己）
   */
  broadcastToAll(tripId: string, event: SSEEvent): void {
    this.broadcast(tripId, event);
  }

  /**
   * 获取指定 trip 的在线用户数
   */
  getOnlineCount(tripId: string): number {
    return this.getListenerCount(tripId);
  }

  /**
   * 获取指定 trip 的所有在线用户 ID
   */
  getOnlineUserIds(tripId: string): string[] {
    const key = this.getTripKey(tripId);
    const listeners = this.listeners.get(key);
    if (!listeners) return [];
    return listeners.map((l) => l.userId);
  }

  /**
   * 发送心跳保活
   */
  private sendHeartbeat(): void {
    const event: SSEEvent = { type: "heartbeat", timestamp: Date.now() };
    const data = `data: ${JSON.stringify(event)}\n\n`;

    for (const [key, listeners] of this.listeners.entries()) {
      const deadListeners: Listener[] = [];

      for (const listener of listeners) {
        try {
          listener.controller.enqueue(data);
        } catch {
          deadListeners.push(listener);
        }
      }

      // 清理死连接
      for (const dead of deadListeners) {
        this.removeListener(dead.userId, dead.tripId);
      }
    }
  }

  private getTripKey(tripId: string): string {
    return `trip:${tripId}`;
  }

  private getListenerCount(tripId: string): number {
    const key = this.getTripKey(tripId);
    return this.listeners.get(key)?.length ?? 0;
  }
}

// 导出单例
export const broadcaster = new EventBroadcaster();
