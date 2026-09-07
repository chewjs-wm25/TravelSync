export type ScheduleInterval = {
  id?: string | null;
  start_time?: string | null; // expect ISO date-time or "YYYY-MM-DD HH:MM"
  end_time?: string | null; // same format as start_time
  /** Travel time required after this item before the next item can start. */
  travel_time_minutes?: number | null;
};

export type Conflict = {
  aId?: string | null;
  bId?: string | null;
  aStart: string;
  aEnd: string;
  bStart: string;
  bEnd: string;
};

export type DetectConflictResult = {
  hasConflict: boolean;
  message?: string | null;
  conflicts: Conflict[];
};

function tryParseDateTime(value: string): number | null {
  if (!value || value.trim().length === 0) return null;

  const v = value.trim();

  // Common case: "YYYY-MM-DD HH:MM" (no seconds, space separated)
  const spaceDateTimeMatch = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v);
  if (spaceDateTimeMatch) {
    // Convert to ISO by replacing space with 'T' and append seconds and Z (treat as UTC)
    // e.g. "2026-08-18 15:30" -> "2026-08-18T15:30:00Z"
    const iso = v.replace(" ", "T") + ":00Z";
    const ms = Date.parse(iso);
    return Number.isNaN(ms) ? null : ms;
  }

  // If contains a 'T' or timezone info, try direct parse
  const direct = Date.parse(v);
  if (!Number.isNaN(direct)) return direct;

  // Try replacing space with 'T' and appending seconds (no timezone)
  if (v.includes(" ")) {
    const isoLocal = v.replace(" ", "T") + ":00"; // no Z
    const ms2 = Date.parse(isoLocal);
    if (!Number.isNaN(ms2)) return ms2;
  }

  return null;
}

// Returns true if [aStart,aEnd) overlaps with [bStart,bEnd)
function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
) {
  // invalid intervals considered non-overlapping
  if (
    !Number.isFinite(aStart) ||
    !Number.isFinite(aEnd) ||
    !Number.isFinite(bStart) ||
    !Number.isFinite(bEnd)
  ) {
    return false;
  }

  if (aStart >= aEnd || bStart >= bEnd) return false;

  return aStart < bEnd && bStart < aEnd;
}

export function detectConflictSchedule(
  items: ScheduleInterval[]
): DetectConflictResult {
  const parsed: Array<{
    id?: string | null;
    rawStart: string;
    rawEnd: string;
    startMs: number | null;
    endMs: number | null;
    travelTimeMs: number;
  }> = [];

  for (const it of items) {
    const rawStart = it.start_time ?? "";
    const rawEnd = it.end_time ?? "";
    const startMs = tryParseDateTime(rawStart);
    const endMs = tryParseDateTime(rawEnd);
    const travelTimeMinutes = it.travel_time_minutes ?? 0;

    parsed.push({
      id: it.id ?? null,
      rawStart,
      rawEnd,
      startMs,
      endMs,
      travelTimeMs:
        Number.isFinite(travelTimeMinutes) && travelTimeMinutes > 0
          ? travelTimeMinutes * 60_000
          : 0,
    });
  }

  const conflicts: Conflict[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const a = parsed[i];
    // only check items with both start and end
    if (a.startMs === null || a.endMs === null) continue;

    for (let j = i + 1; j < parsed.length; j++) {
      const b = parsed[j];
      if (b.startMs === null || b.endMs === null) continue;

      const earlier = a.startMs <= b.startMs ? a : b;
      const later = earlier === a ? b : a;
      const earlierStart = earlier.startMs;
      const earlierEnd = earlier.endMs;
      const laterStart = later.startMs;
      const laterEnd = later.endMs;

      if (
        earlierStart === null ||
        earlierEnd === null ||
        laterStart === null ||
        laterEnd === null
      ) {
        continue;
      }

      if (
        intervalsOverlap(
          earlierStart,
          earlierEnd + earlier.travelTimeMs,
          laterStart,
          laterEnd
        )
      ) {
        conflicts.push({
          aId: a.id ?? null,
          bId: b.id ?? null,
          aStart: a.rawStart,
          aEnd: a.rawEnd,
          bStart: b.rawStart,
          bEnd: b.rawEnd,
        });
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    message: conflicts.length > 0 ? "Overlapping Detected" : null,
    conflicts,
  };
}
