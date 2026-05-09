import type { SessionRecord } from "@/types";

const STORAGE_KEY = "mindfullive.sessionHistory.v2";

export function loadSessionHistory(): SessionRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isSessionRecord);
  } catch {
    return [];
  }
}

export function saveSessionHistory(history: SessionRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-100)));
}

export function getProgressStats(history: SessionRecord[]) {
  const totalSessions = history.length;
  const totalMinutes = Math.round(
    history.reduce((total, session) => total + session.durationSeconds / 60, 0)
  );
  const completedSessions = history.filter(
    (session) => session.completionQuality !== "cancelled"
  ).length;
  const completionRate =
    totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  return {
    streakDays: calculateStreakDays(history),
    totalSessions,
    completionRate,
    totalMinutes,
  };
}

function calculateStreakDays(history: SessionRecord[]) {
  const days = new Set(
    history
      .filter((session) => session.completionQuality !== "cancelled")
      .map((session) => new Date(session.completedAt).toDateString())
  );

  let streak = 0;
  const cursor = new Date();

  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function isSessionRecord(value: unknown): value is SessionRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<SessionRecord>;
  return (
    typeof record.id === "string" &&
    ["meditation", "breathing", "focus"].includes(record.activityType ?? "") &&
    typeof record.durationSeconds === "number" &&
    typeof record.completedAt === "number" &&
    typeof record.completionQuality === "string"
  );
}
