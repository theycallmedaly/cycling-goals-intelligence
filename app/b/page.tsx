'use client';

import { FormEvent, useMemo, useState } from 'react';
import { calculateGoalPace, getPeriodBounds, type Timeframe, type Weekday } from '@/lib/calculations';

type Metric = 'distance' | 'elevation';
type GoalInput = { goal: number; current: number };
type GoalData = Record<Timeframe, Record<Metric, GoalInput>>;
type FormKey = `${Timeframe}_${Metric}_${'goal' | 'current'}`;
type FormValues = Record<FormKey, string>;

const periods: { id: Timeframe; label: string }[] = [
  { id: 'year', label: 'Annual' },
  { id: 'month', label: 'Monthly' },
  { id: 'week', label: 'Weekly' },
];

const metrics: { id: Metric; label: string; unit: string; icon: string }[] = [
  { id: 'distance', label: 'Mileage', unit: 'mi', icon: '↗' },
  { id: 'elevation', label: 'Elevation', unit: 'ft', icon: '▲' },
];

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const blankValues = Object.fromEntries(
  periods.flatMap((period) => metrics.flatMap((metric) => [
    [`${period.id}_${metric.id}_goal`, ''],
    [`${period.id}_${metric.id}_current`, ''],
  ])),
) as FormValues;

const todayIso = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const format = (value: number, metric: Metric) => new Intl.NumberFormat('en-US', {
  maximumFractionDigits: metric === 'distance' ? 1 : 0,
}).format(value);

export default function VersionB() {
  const [values, setValues] = useState<FormValues>(blankValues);
  const [submitted, setSubmitted] = useState<GoalData | null>(null);
  const [asOf, setAsOf] = useState(todayIso);
  const [weekStartsOn, setWeekStartsOn] = useState<Weekday>(1);

  const results = useMemo(() => submitted && metrics.map((metric) => ({
    ...metric,
    periods: periods.map((period) => {
      const bounds = getPeriodBounds(period.id, asOf, weekStartsOn);
      return { ...period, bounds, input: submitted[period.id][metric.id], result: calculateGoalPace({ ...submitted[period.id][metric.id], ...bounds }) };
    }),
  })), [submitted, asOf, weekStartsOn]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = {} as GoalData;
    for (const period of periods) {
      data[period.id] = {} as Record<Metric, GoalInput>;
      for (const metric of metrics) {
        data[period.id][metric.id] = {
          goal: Number(values[`${period.id}_${metric.id}_goal`]) || 0,
          current: Number(values[`${period.id}_${metric.id}_current`]) || 0,
        };
      }
    }
    setSubmitted(data);
    requestAnimationFrame(() => document.getElementById('your-results')?.scrollIntoView({ behavior: 'smooth' }));
  };

  return (
    <main className="version-b">
      <header className="topbar">
        <a className="brand" href="/b"><span className="brand-mark">CG</span><span>Cycling Goals <b>Intelligence</b></span></a>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="version-link" href="/">View Version A</a>
      </header>

      <section className="b-hero">
        <p className="kicker"><span /> Version B · anonymous calculator</p>
        <h1>Tell us your goals.<br />Get today&apos;s pace.</h1>
        <p className="intro">No account or connection required. Enter your current totals and goals to calculate what you need to ride each day.</p>
      </section>

      <form className="goal-form" onSubmit={submit}>
        <div className="form-settings">
          <label>Progress through<input type="date" required value={asOf} onChange={(event) => setAsOf(event.target.value)} /></label>
          <label>My week starts on<select value={weekStartsOn} onChange={(event) => setWeekStartsOn(Number(event.target.value) as Weekday)}>{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
          <p><b>Private by design.</b> These values stay in this browser session and are not saved.</p>
        </div>

        <div className="form-columns">
          {metrics.map((metric) => (
            <fieldset key={metric.id}>
              <legend><span className={`metric-icon ${metric.id}`}>{metric.icon}</span><span><b>{metric.label}</b><small>{metric.unit === 'mi' ? 'Miles' : 'Feet climbed'}</small></span></legend>
              {periods.map((period) => (
                <div className="form-period" key={period.id}>
                  <h2>{period.label}</h2>
                  <label>{period.label} {metric.label.toLowerCase()} goal
                    <span className="number-input"><input type="number" min="0" step="any" required inputMode="decimal" value={values[`${period.id}_${metric.id}_goal`]} onChange={(event) => setValues({ ...values, [`${period.id}_${metric.id}_goal`]: event.target.value })} /><i>{metric.unit}</i></span>
                  </label>
                  <label>{period.label} {metric.label.toLowerCase()} so far
                    <span className="number-input"><input type="number" min="0" step="any" required inputMode="decimal" value={values[`${period.id}_${metric.id}_current`]} onChange={(event) => setValues({ ...values, [`${period.id}_${metric.id}_current`]: event.target.value })} /><i>{metric.unit}</i></span>
                  </label>
                </div>
              ))}
            </fieldset>
          ))}
        </div>
        <button className="calculate-button" type="submit">Calculate my pace <span>→</span></button>
      </form>

      {results && <section className="b-results" id="your-results">
        <div className="results-heading"><div><p className="kicker"><span /> Your results</p><h2>Your pace from here.</h2></div><button onClick={() => document.querySelector('.goal-form')?.scrollIntoView({ behavior: 'smooth' })}>Edit answers</button></div>
        {results.map((metric) => <article className="result-group" key={metric.id}>
          <div className="period-heading"><div><p>{metric.id === 'distance' ? 'MILEAGE' : 'CLIMBING'}</p><h2>{metric.label} goals</h2></div><span>Weekly · Monthly · Annual</span></div>
          <div className="metric-grid three-up">{metric.periods.slice().reverse().map((period) => {
            const behind = period.result.aheadBehind < 0;
            return <section className="metric-card" key={period.id}>
              <div className="metric-title"><span className={`metric-icon ${metric.id}`}>{metric.icon}</span><div><p>{period.label}</p><span>{period.bounds.startLabel} — {period.bounds.endLabel}</span></div></div>
              <div className="primary-stat"><strong>{format(period.input.current, metric.id)}</strong><span> of {format(period.input.goal, metric.id)} {metric.unit}</span></div>
              <div className="stat-grid"><div><span>Pace</span><strong className={behind ? 'behind' : 'ahead'}>{behind ? '−' : '+'}{format(Math.abs(period.result.aheadBehind), metric.id)} {metric.unit}</strong></div><div><span>Remaining</span><strong>{format(period.result.remaining, metric.id)} {metric.unit}</strong></div><div><span>Immediate catch-up</span><strong>{behind ? `${format(period.result.catchUpToday, metric.id)} ${metric.unit}` : '—'}</strong></div></div>
              <div className="pace-callout steady"><span>Ride daily to finish</span><strong>{format(period.result.requiredPerDay, metric.id)} <small>{metric.unit}/day</small></strong></div>
            </section>;
          })}</div>
        </article>)}
      </section>}

      <footer><div><span className="brand-mark small">CG</span><b>Cycling Goals Intelligence</b></div><p>Version B · Anonymous, form-driven pace calculator</p></footer>
    </main>
  );
}
