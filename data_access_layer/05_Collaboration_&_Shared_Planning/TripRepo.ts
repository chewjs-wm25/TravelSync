import { getDB } from "./db";

export interface TripRow {
  TripID: string;
  TripName: string;
  StartDate: string | null;
  EndDate: string | null;
  Region: string | null;
  Status: string;
  TripNote: string | null;
  UserID: string;
}

/**
 * 彻底清理已被删除的行程在 Module 05 中的所有关联记录（级联清理）
 */
export async function purgeDeletedTrip(tripId: string): Promise<void> {
  const db = await getDB();
  try {
    await db.batch([
      db.prepare("DELETE FROM Trip WHERE TripID = ?").bind(tripId),
      db.prepare("DELETE FROM Collaborators WHERE trip_id = ?").bind(tripId),
      db.prepare("DELETE FROM Collaboration_Invitations WHERE trip_id = ?").bind(tripId),
      db.prepare(
        "DELETE FROM Itinerary_Item WHERE ItineraryID IN (SELECT ItineraryID FROM Itinerary WHERE TripID = ?)"
      ).bind(tripId),
      db.prepare("DELETE FROM Itinerary WHERE TripID = ?").bind(tripId),
      db.prepare("DELETE FROM chats WHERE trip_id = ?").bind(tripId),
      db.prepare("DELETE FROM activity_logs WHERE trip_id = ?").bind(tripId),
      db.prepare("DELETE FROM trip_likes WHERE trip_id = ?").bind(tripId),
      db.prepare("DELETE FROM plan_share_keys WHERE trip_id = ?").bind(tripId),
    ]);
  } catch (e) {
    console.error(`[purgeDeletedTrip] Failed to cascade delete trip ${tripId}:`, e);
  }
}

/**
 * 全量比对 05 与 02 的行程，自动同步清理已被 02 删除的所有孤儿数据
 */
export async function syncAndCleanDeletedTrips(): Promise<void> {
  const db = await getDB();
  try {
    // 1. 查找在 05 Trip 表中存在，但 02 trips 表中已经被删除的所有 TripID
    const orphanedTrips = await db
      .prepare(`
        SELECT TripID as tripId 
        FROM Trip 
        WHERE TripID NOT IN (SELECT trip_id FROM trips)
      `)
      .all<{ tripId: string }>();

    const ids = (orphanedTrips.results ?? []).map((r) => r.tripId);
    for (const id of ids) {
      await purgeDeletedTrip(id);
    }

    // 2. 清理在 Collaborators 中存在，但 trips 表中已删除的孤儿协作行
    await db
      .prepare(`
        DELETE FROM Collaborators 
        WHERE trip_id NOT IN (SELECT trip_id FROM trips)
      `)
      .run()
      .catch(() => {});

    // 3. 清理在 Collaboration_Invitations 中存在，但 trips 表中已删除的孤儿邀请行
    await db
      .prepare(`
        DELETE FROM Collaboration_Invitations 
        WHERE trip_id NOT IN (SELECT trip_id FROM trips)
      `)
      .run()
      .catch(() => {});
  } catch {
    // ignore if trips table doesn't exist
  }
}

export async function findTripById(id: string): Promise<TripRow | null> {
  const db = await getDB();

  // 1. 先验证 module 02 的 trips 表（trips 表是全站行程真实存在的基准 Source of Truth）
  try {
    const m2 = await db
      .prepare(
        "SELECT trip_id, user_id, trip_name, start_date, end_date, trip_note, image_url FROM trips WHERE trip_id = ? LIMIT 1"
      )
      .bind(id)
      .first<{
        trip_id: string;
        user_id: string;
        trip_name: string;
        start_date: string | null;
        end_date: string | null;
        trip_note: string | null;
        image_url: string | null;
      }>();

    if (!m2) {
      // 02 的 trips 表中已经不存在该行程（说明已被用户在 Trip Planning 模块删除）
      // 彻底清理 05 中的孤儿遗留数据并返回 null
      await purgeDeletedTrip(id);
      return null;
    }

    // 存在于 02 trips，保证 05 Trip 表同步存在
    await db
      .prepare(
        `INSERT OR IGNORE INTO Trip (TripID, TripName, StartDate, EndDate, Region, Status, TripNote, UserID)
         VALUES (?, ?, ?, ?, '', 'planning', ?, ?)`
      )
      .bind(
        m2.trip_id,
        m2.trip_name || "My Trip",
        m2.start_date ?? null,
        m2.end_date ?? null,
        m2.trip_note ?? null,
        m2.user_id
      )
      .run();

    return db
      .prepare("SELECT * FROM Trip WHERE TripID = ? LIMIT 1")
      .bind(id)
      .first<TripRow>();
  } catch {
    // 若 trips 表异常或尚未初始化，回退读 05 的 Trip 表
    return db
      .prepare("SELECT * FROM Trip WHERE TripID = ? LIMIT 1")
      .bind(id)
      .first<TripRow>();
  }
}

export async function ensureTripExists(id: string, fallbackUserId?: string): Promise<void> {
  const existing = await findTripById(id);
  if (!existing) {
    const db = await getDB();
    const uid = fallbackUserId || "dev-user-001";
    await db
      .prepare(
        `INSERT OR IGNORE INTO Trip (TripID, TripName, StartDate, EndDate, Region, Status, TripNote, UserID)
         VALUES (?, 'Shared Trip', NULL, NULL, '', 'planning', NULL, ?)`
      )
      .bind(id, uid)
      .run();
  }
}

export async function insertTrip(t: {
  TripID?: string;
  TripName: string;
  StartDate?: string | null;
  EndDate?: string | null;
  Region?: string | null;
  TripNote?: string | null;
  UserID: string;
}): Promise<TripRow> {
  const db = await getDB();
  const TripID = t.TripID ?? crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO Trip (TripID, TripName, StartDate, EndDate, Region, Status, TripNote, UserID)
       VALUES (?, ?, ?, ?, ?, 'planning', ?, ?)`
    )
    .bind(
      TripID,
      t.TripName,
      t.StartDate ?? null,
      t.EndDate ?? null,
      t.Region ?? null,
      t.TripNote ?? null,
      t.UserID
    )
    .run();
  return findTripById(TripID) as Promise<TripRow>;
}

export async function importFullTrip(
  userId: string,
  plan: import("@/api_layer/05_Collaboration_&_Shared_Planning/types").ImportTripPayload
): Promise<{ tripId: string; tripName: string }> {
  const db = await getDB();
  const tripId = `trip_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

  // 1. 写入 05 Trip 表
  await db
    .prepare(
      `INSERT INTO Trip (TripID, TripName, StartDate, EndDate, Region, Status, TripNote, UserID)
       VALUES (?, ?, ?, ?, ?, 'planning', ?, ?)`
    )
    .bind(
      tripId,
      plan.tripName,
      plan.startDate ?? null,
      plan.endDate ?? null,
      plan.region ?? null,
      plan.tripNote ?? null,
      userId
    )
    .run();

  // 2. 写入 02 trips 表（保证模块 02 也能直接查阅编辑）
  try {
    await db
      .prepare(
        `INSERT OR REPLACE INTO trips (trip_id, user_id, trip_name, start_date, end_date, trip_note, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        tripId,
        userId,
        plan.tripName,
        plan.startDate ?? null,
        plan.endDate ?? null,
        plan.tripNote ?? null,
        plan.imageUrl ?? null
      )
      .run();
  } catch {
    // ignore if table doesn't exist
  }

  // 3. 若选择共享模式，建立 Owner 行
  if (plan.isShared) {
    try {
      await db
        .prepare(
          `INSERT OR IGNORE INTO Collaborators (collaborator_id, role, status, trip_id, user_id)
           VALUES (?, 'Owner', 'active', ?, ?)`
        )
        .bind(`c_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`, tripId, userId)
        .run();
    } catch {
      // ignore
    }
  }

  // 4. 记录导入动态日志
  try {
    await db
      .prepare(`INSERT INTO activity_logs (trip_id, user_id, action) VALUES (?, ?, ?)`)
      .bind(tripId, userId, `imported trip plan "${plan.tripName}"`)
      .run();
  } catch {
    // ignore
  }

  // 5. 逐日写入日程及地点明细
  let dayIdx = 0;
  for (const day of plan.itineraries) {
    dayIdx += 1;
    const itineraryId = `itin_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const dayTitle = day.title || `Day ${dayIdx}`;
    const dayDate = day.date ?? null;

    // 05 Itinerary 表
    await db
      .prepare("INSERT INTO Itinerary (ItineraryID, Title, Date, TripID) VALUES (?, ?, ?, ?)")
      .bind(itineraryId, dayTitle, dayDate, tripId)
      .run();

    // 02 itineraries 表
    try {
      await db
        .prepare(
          "INSERT OR REPLACE INTO itineraries (itinerary_id, trip_id, title, date, itinerary_note) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(itineraryId, tripId, dayTitle, dayDate, day.note ?? null)
        .run();
    } catch {
      // ignore
    }

    // 写入该日的每一项 Item
    let itemPos = 0;
    for (const item of day.items) {
      itemPos += 1;
      const itemId = `it_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      const validTypes = ["attraction", "restaurant", "hotel", "transport", "activity", "other"];
      const itemType = validTypes.includes(item.type ?? "") ? (item.type as string) : "attraction";

      // 05 Itinerary_Item 表
      await db
        .prepare(
          `INSERT INTO Itinerary_Item (ItemID, ItemName, Type, ReferenceID, Destination, StartTime, EndTime, Status, ItineraryNote, ItineraryID)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'planned', ?, ?)`
        )
        .bind(
          itemId,
          item.name,
          itemType,
          item.referenceId ?? null,
          item.destination ?? null,
          item.startTime ?? null,
          item.endTime ?? null,
          item.note ?? null,
          itineraryId
        )
        .run();

      // 02 itinerary_items 表
      try {
        await db
          .prepare(
            `INSERT OR REPLACE INTO itinerary_items (item_id, itinerary_id, item_name, image_url, itinerary_item_note, position, type, reference_id, lat, lon, destination, start_time, end_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            itemId,
            itineraryId,
            item.name,
            item.imageUrl ?? null,
            item.note ?? null,
            item.position ?? itemPos,
            itemType,
            item.referenceId ?? null,
            item.lat ?? null,
            item.lon ?? null,
            item.destination ?? null,
            item.startTime ?? null,
            item.endTime ?? null
          )
          .run();
      } catch {
        // ignore
      }
    }
  }

  return { tripId, tripName: plan.tripName };
}