'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { calculateGoalPace, getPeriodBounds, type Timeframe, type Weekday } from '@/lib/calculations';

type Metric = 'distance' | 'elevation';
type GoalInput = { goal: number; current: number };
type GoalData = Record<Timeframe, Record<Metric, GoalInput | null>>;
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
const weekdayChoices: { value: Weekday; label: string; long: string }[] = [
  { value: 1, label: 'M', long: 'Monday' }, { value: 2, label: 'T', long: 'Tuesday' },
  { value: 3, label: 'W', long: 'Wednesday' }, { value: 4, label: 'Th', long: 'Thursday' },
  { value: 5, label: 'F', long: 'Friday' }, { value: 6, label: 'Sa', long: 'Saturday' },
  { value: 0, label: 'Su', long: 'Sunday' },
];
const STORAGE_KEY = 'cycling-goals-intelligence-version-b';
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

const parseIso = (iso: string) => new Date(`${iso}T12:00:00Z`);
const toIso = (date: Date) => date.toISOString().slice(0, 10);
const endOfYear = (iso: string) => `${iso.slice(0, 4)}-12-31`;
const datesBetween = (start: string, end: string) => {
  const dates: string[] = [];
  for (const date = parseIso(start); date <= parseIso(end); date.setUTCDate(date.getUTCDate() + 1)) dates.push(toIso(date));
  return dates;
};
const effectiveBlockedDates = (explicit: string[], recurring: Weekday[], start: string) => {
  const selected = new Set(explicit.filter((date) => date >= start && date <= endOfYear(start)));
  for (const date of datesBetween(start, endOfYear(start))) {
    if (recurring.includes(parseIso(date).getUTCDay() as Weekday)) selected.add(date);
  }
  return [...selected].sort();
};

const format = (value: number, metric: Metric) => new Intl.NumberFormat('en-US', {
  maximumFractionDigits: metric === 'distance' ? 1 : 0,
}).format(value);

export default function VersionB() {
  const [values, setValues] = useState<FormValues>(blankValues);
  const [submitted, setSubmitted] = useState<GoalData | null>(null);
  const [asOf, setAsOf] = useState(todayIso);
  const [weekStartsOn, setWeekStartsOn] = useState<Weekday>(1);
  const [storageReady, setStorageReady] = useState(false);
  const [saveMessage, setSaveMessage] = useState('Changes are saved automatically on this browser.');
  const [formError, setFormError] = useState('');
  const [blockoutOpen, setBlockoutOpen] = useState(false);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [blockedWeekdays, setBlockedWeekdays] = useState<Weekday[]>([]);
  const [draftDates, setDraftDates] = useState<string[]>([]);
  const [draftWeekdays, setDraftWeekdays] = useState<Weekday[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => todayIso().slice(0, 7));

  useEffect(() => {
    const loadSavedValues = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as { values?: FormValues; weekStartsOn?: Weekday; blockedDates?: string[]; blockedWeekdays?: Weekday[] };
          if (parsed.values) setValues({ ...blankValues, ...parsed.values });
          if (typeof parsed.weekStartsOn === 'number') setWeekStartsOn(parsed.weekStartsOn);
          if (Array.isArray(parsed.blockedDates)) setBlockedDates(parsed.blockedDates);
          if (Array.isArray(parsed.blockedWeekdays)) setBlockedWeekdays(parsed.blockedWeekdays);
          setSaveMessage('Saved values loaded. Update your latest totals, then calculate.');
        }
      } catch {
        setSaveMessage('Saved values could not be loaded. Enter them again to replace the saved copy.');
      }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(loadSavedValues);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ values, weekStartsOn, blockedDates, blockedWeekdays }));
    } catch {
      // Calculation still works when a browser blocks local storage.
    }
  }, [storageReady, values, weekStartsOn, blockedDates, blockedWeekdays]);

  const activeBlockedDates = useMemo(() => effectiveBlockedDates(blockedDates, blockedWeekdays, asOf), [blockedDates, blockedWeekdays, asOf]);
  const draftBlockedDates = useMemo(() => effectiveBlockedDates(draftDates, draftWeekdays, asOf), [draftDates, draftWeekdays, asOf]);
  const availableYearDays = datesBetween(asOf, endOfYear(asOf)).length - activeBlockedDates.length;

  const calendar = useMemo(() => {
    const [year, monthNumber] = calendarMonth.split('-').map(Number);
    const month = monthNumber - 1;
    const first = new Date(Date.UTC(year, month, 1, 12));
    const count = new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate();
    return {
      label: first.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      padding: first.getUTCDay(),
      dates: Array.from({ length: count }, (_, index) => toIso(new Date(Date.UTC(year, month, index + 1, 12)))),
    };
  }, [calendarMonth]);

  const moveMonth = (offset: number) => {
    const [year, month] = calendarMonth.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1 + offset, 1));
    setCalendarMonth(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`);
  };

  const openBlockouts = () => {
    setDraftDates(blockedDates);
    setDraftWeekdays(blockedWeekdays);
    setCalendarMonth(asOf.slice(0, 7));
    setBlockoutOpen((open) => !open);
  };

  const saveBlockouts = () => {
    setBlockedDates(draftDates);
    setBlockedWeekdays(draftWeekdays);
    setBlockoutOpen(false);
    setSaveMessage('Block-out days saved. Your riding pace now uses available days only.');
  };

  const results = useMemo(() => submitted && metrics.map((metric) => ({
    ...metric,
    periods: periods.flatMap((period) => {
      const input = submitted[period.id][metric.id];
      if (!input) return [];
      const bounds = getPeriodBounds(period.id, asOf, weekStartsOn);
      return [{ ...period, bounds, input, result: calculateGoalPace({ ...input, ...bounds, blockedDates: activeBlockedDates }) }];
    }),
  })).filter((metric) => metric.periods.length > 0), [submitted, asOf, weekStartsOn, activeBlockedDates]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = {} as GoalData;
    let completePairs = 0;
    setFormError('');
    for (const period of periods) {
      data[period.id] = {} as Record<Metric, GoalInput | null>;
      for (const metric of metrics) {
        const goalValue = values[`${period.id}_${metric.id}_goal`];
        const currentValue = values[`${period.id}_${metric.id}_current`];
        if (!goalValue && !currentValue) {
          data[period.id][metric.id] = null;
          continue;
        }
        if (!goalValue || !currentValue) {
          setFormError(`Complete both ${period.label.toLowerCase()} ${metric.label.toLowerCase()} fields, or leave both blank.`);
          return;
        }
        if (Number(goalValue) <= 0) {
          setFormError(`${period.label} ${metric.label.toLowerCase()} goal must be greater than zero.`);
          return;
        }
        data[period.id][metric.id] = { goal: Number(goalValue), current: Number(currentValue) };
        completePairs += 1;
      }
    }
    if (completePairs === 0) {
      setFormError('Enter at least one complete goal and “so far” pair to calculate your pace.');
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ values, weekStartsOn, blockedDates, blockedWeekdays }));
      setSaveMessage('Saved on this browser. Your values will be prefilled next time.');
    } catch {
      setSaveMessage('Results calculated, but this browser did not allow saving.');
    }
    setSubmitted(data);
    requestAnimationFrame(() => document.getElementById('your-results')?.scrollIntoView({ behavior: 'smooth' }));
  };

  const clearSavedData = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setValues(blankValues);
    setSubmitted(null);
    setWeekStartsOn(1);
    setBlockedDates([]);
    setBlockedWeekdays([]);
    setBlockoutOpen(false);
    setSaveMessage('Saved values erased from this browser.');
    setFormError('');
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

      <form className="goal-form" onSubmit={submit} autoComplete="off">
        <div className="form-settings">
          <label>Progress through<input type="date" required value={asOf} onChange={(event) => setAsOf(event.target.value)} /></label>
          <label>My week starts on<select value={weekStartsOn} onChange={(event) => setWeekStartsOn(Number(event.target.value) as Weekday)}>{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
          <p><b>Private by design.</b> {saveMessage} Nothing is sent to an account or server. <button type="button" onClick={clearSavedData}>Erase saved data</button></p>
        </div>

        <section className="blockout-section">
          <button className="blockout-toggle" type="button" aria-expanded={blockoutOpen} onClick={openBlockouts}>
            <span><b>Block Out Riding Days</b><small>{activeBlockedDates.length ? `${activeBlockedDates.length} blocked · ${availableYearDays} available through December 31` : 'Plan around rest days, travel, work, and holidays'}</small></span>
            <i>{blockoutOpen ? '−' : '+'}</i>
          </button>
          {blockoutOpen && <div className="blockout-panel">
            <div className="calendar-wrap">
              <div className="calendar-nav"><button type="button" disabled={calendarMonth <= asOf.slice(0, 7)} onClick={() => moveMonth(-1)} aria-label="Previous month">←</button><h2>{calendar.label}</h2><button type="button" disabled={calendarMonth >= asOf.slice(0, 4) + '-12'} onClick={() => moveMonth(1)} aria-label="Next month">→</button></div>
              <div className="calendar-grid" aria-label={`Block out dates in ${calendar.label}`}>
                {['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'].map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}
                {Array.from({ length: calendar.padding }, (_, index) => <span key={`blank-${index}`} />)}
                {calendar.dates.map((date) => {
                  const day = parseIso(date).getUTCDay() as Weekday;
                  const recurring = draftWeekdays.includes(day);
                  const selected = draftDates.includes(date) || recurring;
                  const disabled = date < asOf || date > endOfYear(asOf);
                  return <button type="button" key={date} disabled={disabled || recurring} className={selected ? 'selected' : ''} aria-pressed={selected} aria-label={`${selected ? 'Unblock' : 'Block'} ${date}${recurring ? ` (${weekdays[day]} is always blocked)` : ''}`} onClick={() => setDraftDates((dates) => dates.includes(date) ? dates.filter((item) => item !== date) : [...dates, date])}>{Number(date.slice(-2))}</button>;
                })}
              </div>
            </div>
            <div className="recurring-days">
              <p className="blockout-eyebrow">Weekly schedule</p>
              <h2>I never ride on:</h2>
              <div className="weekday-checks">{weekdayChoices.map((day) => <label key={day.value} title={day.long}><input type="checkbox" checked={draftWeekdays.includes(day.value)} onChange={() => setDraftWeekdays((days) => days.includes(day.value) ? days.filter((item) => item !== day.value) : [...days, day.value])} /><span>{day.label}</span></label>)}</div>
              <p className="blockout-summary"><b>{draftBlockedDates.length}</b> blocked days<br /><b>{datesBetween(asOf, endOfYear(asOf)).length - draftBlockedDates.length}</b> available riding days through December 31</p>
              <div className="blockout-actions"><button type="button" className="save-blockouts" onClick={saveBlockouts}>Save Block Out Days</button><button type="button" className="cancel-blockouts" onClick={() => setBlockoutOpen(false)}>Cancel</button></div>
            </div>
          </div>}
        </section>

        <div className="form-columns">
          {metrics.map((metric) => (
            <fieldset key={metric.id}>
              <legend><span className={`metric-icon ${metric.id}`}>{metric.icon}</span><span><b>{metric.label}</b><small>{metric.unit === 'mi' ? 'Miles' : 'Feet climbed'}</small></span></legend>
              {periods.map((period) => (
                <div className="form-period" key={period.id}>
                  <h2>{period.label}</h2>
                  <label>{period.label} {metric.label.toLowerCase()} goal
                    <span className="number-input"><input type="number" name={`${period.id}_${metric.id}_goal`} min="0" step="any" inputMode="decimal" value={values[`${period.id}_${metric.id}_goal`]} onChange={(event) => setValues({ ...values, [`${period.id}_${metric.id}_goal`]: event.target.value })} /><i>{metric.unit}</i></span>
                  </label>
                  <label>{period.label} {metric.label.toLowerCase()} so far
                    <span className="number-input"><input type="number" name={`${period.id}_${metric.id}_current`} min="0" step="any" inputMode="decimal" value={values[`${period.id}_${metric.id}_current`]} onChange={(event) => setValues({ ...values, [`${period.id}_${metric.id}_current`]: event.target.value })} /><i>{metric.unit}</i></span>
                  </label>
                </div>
              ))}
            </fieldset>
          ))}
        </div>
        {formError && <p className="form-error" role="alert">{formError}</p>}
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
              <div className="pace-callout steady"><span>{period.result.rideDaysRemaining ? `Ride on ${period.result.rideDaysRemaining} available ${period.result.rideDaysRemaining === 1 ? 'day' : 'days'}` : 'No riding days available'}</span><strong>{Number.isFinite(period.result.requiredPerDay) ? format(period.result.requiredPerDay, metric.id) : '—'} <small>{metric.unit}/ride day</small></strong></div>
            </section>;
          })}</div>
        </article>)}
      </section>}

      <footer><div><span className="brand-mark small">CG</span><b>Cycling Goals Intelligence</b></div><p>Version B · Anonymous, form-driven pace calculator</p></footer>
    </main>
  );
}
