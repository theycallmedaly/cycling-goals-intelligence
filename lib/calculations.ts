export type Timeframe = 'week' | 'month' | 'year';
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type PaceInput = { goal: number; current: number; start: string; end: string; asOf: string; blockedDates?: string[] };
const DAY_MS = 86_400_000;
const parseDate = (iso: string) => new Date(`${iso}T12:00:00Z`);
const toIso = (date: Date) => date.toISOString().slice(0, 10);
const daysInclusive = (start: string, end: string) => Math.max(0, Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / DAY_MS) + 1);
const shortDate = (iso: string) => parseDate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function getPeriodBounds(timeframe: Timeframe, asOf: string, weekStartsOn: Weekday = 1) {
  const date = parseDate(asOf);
  let start: Date;
  let end: Date;
  if (timeframe === 'week') {
    const startOffset = (date.getUTCDay() - weekStartsOn + 7) % 7;
    start = new Date(date.getTime() - startOffset * DAY_MS);
    end = new Date(start.getTime() + 6 * DAY_MS);
  } else if (timeframe === 'month') {
    start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12));
    end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12));
  } else {
    start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1, 12));
    end = new Date(Date.UTC(date.getUTCFullYear(), 11, 31, 12));
  }
  return { start: toIso(start), end: toIso(end), asOf, startLabel: shortDate(toIso(start)), endLabel: shortDate(toIso(end)) };
}

export function calculateGoalPace({ goal, current, start, end, asOf, blockedDates = [] }: PaceInput) {
  const totalDays = daysInclusive(start, end);
  const elapsedDays = Math.min(totalDays, daysInclusive(start, asOf));
  const remainingDays = Math.max(0, daysInclusive(asOf, end));
  const targetProgress = totalDays ? goal * (elapsedDays / totalDays) : goal;
  const aheadBehind = current - targetProgress;
  const remaining = Math.max(0, goal - current);
  const baselinePerDay = totalDays ? goal / totalDays : 0;
  const blockedDays = new Set(blockedDates.filter((date) => date >= asOf && date <= end)).size;
  const rideDaysRemaining = Math.max(0, remainingDays - blockedDays);
  const requiredPerDay = rideDaysRemaining ? remaining / rideDaysRemaining : remaining ? Number.POSITIVE_INFINITY : 0;
  const nextMidnightTarget = Math.min(goal, targetProgress + baselinePerDay);
  const catchUpToday = Math.max(0, nextMidnightTarget - current);
  return { totalDays, elapsedDays, remainingDays, blockedDays, rideDaysRemaining, targetProgress, aheadBehind, remaining, baselinePerDay, requiredPerDay, catchUpToday, progressPercent: goal ? current / goal * 100 : 0, targetPercent: goal ? targetProgress / goal * 100 : 0 };
}
