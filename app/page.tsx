'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { calculateGoalPace, getPeriodBounds, type Timeframe, type Weekday } from '@/lib/calculations';

type GoalInput = { goal: number; current: number };
type GoalData = Record<Timeframe, { distance: GoalInput; elevation: GoalInput }>;
type Metric = keyof GoalData['week'];
type ViewMode = 'timeframe' | 'goalType';

const sampleData: GoalData = {
  week: { distance: { goal: 150, current: 63 }, elevation: { goal: 7000, current: 2900 } },
  month: { distance: { goal: 620, current: 238 }, elevation: { goal: 30000, current: 10650 } },
  year: { distance: { goal: 7200, current: 4620 }, elevation: { goal: 360000, current: 207400 } },
};

const periods: { id: Timeframe; label: string; eyebrow: string }[] = [
  { id: 'week', label: 'This week', eyebrow: 'YOUR WEEK' },
  { id: 'month', label: 'This month', eyebrow: 'CALENDAR MONTH' },
  { id: 'year', label: 'This year', eyebrow: 'CALENDAR YEAR' },
];

const weekdays: { value: Weekday; label: string }[] = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const metricMeta = {
  distance: { label: 'Distance', unit: 'mi', decimals: 1 },
  elevation: { label: 'Elevation', unit: 'ft', decimals: 0 },
} as const;

const todayIso = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

const format = (value: number, decimals: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(value);

export default function Home() {
  const [asOf, setAsOf] = useState(todayIso);
  const [goals, setGoals] = useState<GoalData>(sampleData);
  const [editing, setEditing] = useState(false);
  const [weekStartsOn, setWeekStartsOn] = useState<Weekday>(1);
  const [viewMode, setViewMode] = useState<ViewMode>('timeframe');

  const rows = useMemo(() => periods.map((period) => {
    const bounds = getPeriodBounds(period.id, asOf, weekStartsOn);
    return {
      ...period,
      bounds,
      metrics: (Object.keys(metricMeta) as (keyof typeof metricMeta)[]).map((metric) => ({
        metric,
        ...calculateGoalPace({ ...goals[period.id][metric], ...bounds }),
      })),
    };
  }), [asOf, goals, weekStartsOn]);

  const updateGoal = (period: Timeframe, metric: keyof typeof metricMeta, field: keyof GoalInput, value: string) => {
    setGoals((current) => ({
      ...current,
      [period]: {
        ...current[period],
        [metric]: { ...current[period][metric], [field]: Math.max(0, Number(value) || 0) },
      },
    }));
  };

  const renderGoalCard = (period: (typeof rows)[number], result: (typeof rows)[number]['metrics'][number], title: string, subtitle: string) => {
    const meta = metricMeta[result.metric];
    const input = goals[period.id][result.metric];
    const behind = result.aheadBehind < 0;
    const completed = Math.min(100, result.progressPercent);
    const target = Math.min(100, result.targetPercent);
    return (
      <section className="metric-card" key={`${period.id}-${result.metric}`}>
        <div className="metric-title">
          <span className={`metric-icon ${result.metric}`}>{result.metric === 'distance' ? '↗' : '▲'}</span>
          <div><p>{title}</p><span>{subtitle}</span></div>
        </div>

        {editing ? (
          <div className="inputs">
            <label>Goal <input type="number" min="0" value={input.goal} onChange={(e) => updateGoal(period.id, result.metric, 'goal', e.target.value)} /></label>
            <label>Completed <input type="number" min="0" value={input.current} onChange={(e) => updateGoal(period.id, result.metric, 'current', e.target.value)} /></label>
          </div>
        ) : (
          <div className="primary-stat"><strong>{format(input.current, meta.decimals)}</strong><span> {meta.unit}</span></div>
        )}

        <div className="progress-wrap">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${completed}%` }} />
            <i className="target-tick" style={{ left: `${target}%` }} title="Target pace" />
          </div>
          <div className="progress-labels"><span>{format(result.progressPercent, 0)}% complete</span><span>Target today {format(result.targetProgress, meta.decimals)} {meta.unit}</span></div>
        </div>

        <div className="stat-grid">
          <div><span>Pace</span><strong className={behind ? 'behind' : 'ahead'}>{behind ? '−' : '+'}{format(Math.abs(result.aheadBehind), meta.decimals)} {meta.unit}</strong></div>
          <div><span>Remaining</span><strong>{format(result.remaining, meta.decimals)} {meta.unit}</strong></div>
          <div><span>Immediate catch-up</span><strong>{behind ? `${format(result.catchUpToday, meta.decimals)} ${meta.unit}` : '—'}</strong></div>
        </div>

        <div className="pace-callout steady">
          <span>Ride today to finish on target</span>
          <strong>{format(result.requiredPerDay, meta.decimals)} <small>{meta.unit}/day</small></strong>
        </div>
      </section>
    );
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Cycling Goals Intelligence home">
          <span className="brand-mark">CG</span>
          <span>Cycling Goals <b>Intelligence</b></span>
        </a>
        <div className="top-actions">
          <Link className="version-link" href="/b">Try Version B</Link>
          <button className="edit-button" onClick={() => setEditing((value) => !value)}>{editing ? 'Done editing' : 'Edit goals'}</button>
        </div>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="kicker"><span /> Pace intelligence</p>
          <h1>Know what today<br />needs from you.</h1>
          <p className="intro">A clear view of every cycling goal—what&apos;s done, what&apos;s due, and the daily pace that gets you there.</p>
          <div className="view-control" role="group" aria-label="Organize goals">
            <span>Organize goals</span>
            <div>
              <button aria-pressed={viewMode === 'timeframe'} onClick={() => setViewMode('timeframe')}>By timeframe</button>
              <button aria-pressed={viewMode === 'goalType'} onClick={() => setViewMode('goalType')}>By goal type</button>
            </div>
          </div>
        </div>
        <div className="date-card">
          <label htmlFor="as-of">Progress through</label>
          <input id="as-of" type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} />
          <label htmlFor="week-start">My week starts on</label>
          <select id="week-start" value={weekStartsOn} onChange={(event) => setWeekStartsOn(Number(event.target.value) as Weekday)}>
            {weekdays.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
          </select>
          <span>Pace advances at midnight. Today&apos;s ride updates progress instantly.</span>
        </div>
      </section>

      <section className="dashboard" aria-label="Goal pace dashboard">
        {viewMode === 'timeframe' ? rows.map((period) => (
          <article className="period" key={period.id}>
            <div className="period-heading"><div><p>{period.eyebrow}</p><h2>{period.label}</h2></div><span>{period.bounds.startLabel} — {period.bounds.endLabel}</span></div>
            <div className="metric-grid">{period.metrics.map((result) => renderGoalCard(period, result, metricMeta[result.metric].label, `${format(goals[period.id][result.metric].goal, metricMeta[result.metric].decimals)} ${metricMeta[result.metric].unit} goal`))}</div>
          </article>
        )) : (['distance', 'elevation'] as Metric[]).map((metric) => (
          <article className="period" key={metric}>
            <div className="period-heading"><div><p>{metric === 'distance' ? 'MILEAGE' : 'CLIMBING'}</p><h2>{metric === 'distance' ? 'Mileage goals' : 'Climbing goals'}</h2></div><span>Weekly · Monthly · Yearly</span></div>
            <div className="metric-grid three-up">{rows.map((period) => {
              const result = period.metrics.find((item) => item.metric === metric)!;
              return renderGoalCard(period, result, period.label, `${period.bounds.startLabel} — ${period.bounds.endLabel} · ${format(goals[period.id][metric].goal, metricMeta[metric].decimals)} ${metricMeta[metric].unit} goal`);
            })}</div>
          </article>
        ))}
      </section>

      <footer>
        <div><span className="brand-mark small">CG</span><b>Cycling Goals Intelligence</b></div>
        <p>Manual-data MVP · Strava sync is the next ride.</p>
        <button onClick={() => setGoals(sampleData)}>Reset sample data</button>
      </footer>
    </main>
  );
}
