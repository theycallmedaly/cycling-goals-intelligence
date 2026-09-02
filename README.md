# Cycling Goals Intelligence

Cycling Goals Intelligence fills a gap in Strava Goals: it shows not only annual pace, but also weekly and monthly pace for both distance and elevation—and turns any deficit into an actionable daily number.

## MVP

The first version is deliberately API-free so the calculation model can be reviewed before adding Strava authentication. It includes:

- Weekly (user-selected start day), monthly, and annual calendar goals
- Distance in miles and elevation gain in feet
- Editable manual goal and completed values, preloaded with realistic sample data
- A selectable “progress through” date for testing any point in a period
- A seven-day week-start selector that immediately updates weekly boundaries and pace
- Responsive, accessible single-page UI suitable for GitHub and web deployment
- A small, pure calculation module with automated boundary tests

Select **Edit goals** to replace the sample goal and progress values. All results update immediately.

## Calculation definitions

Pace advances once at midnight, matching Strava. The selected date's full share of the goal is therefore already due at 12:00 AM, while rides entered during the day change current progress immediately. Remaining calendar days include the selected date.

| Result | Definition |
| --- | --- |
| Current progress | Manually entered cumulative distance or elevation through the selected date |
| Target progress | `goal × elapsed calendar days ÷ total calendar days` (selected date included) |
| Ahead / behind | `current progress − target progress`; positive is ahead, negative is behind |
| Remaining | `max(goal − current progress, 0)` |
| Ride today to finish on target | `remaining ÷ calendar days including the selected date`; this is the primary, sustainable recommendation |
| Immediate catch-up | When behind: the amount needed to erase the entire deficit and reach the next midnight's target, capped at the overall goal |

For example, with a 365-mile annual goal, the target at midnight on January 1 is 1 mile. Riding 2 miles moves the rider to 1 mile ahead. At midnight January 2 the target becomes 2 miles, so the rider is exactly on pace. If no ride happens that day, January 3 begins 1 mile behind. The sustainable recommendation remains 1 mile per day, while the secondary immediate catch-up figure is 2 miles.

On day 45, a rider who is 10 miles behind has completed 35 of 365 miles. With 330 miles remaining across 321 calendar days, the primary recommendation is about 1.03 miles per day—not an unreasonable 11-mile ride. The 11-mile immediate catch-up amount remains visible as optional context.

Calendar-day pacing is intentional: rest days are not guessed by the MVP. A future training-plan mode can distribute work across selected ride days instead.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal.

## Validate

```bash
npm test
npm run build
```

Tests cover weekly boundaries, the Strava-style midnight examples above, sustainable day-45 deficit recovery, immediate catch-up calculations, and completed goals.

## Architecture

- `app/page.tsx` — interactive dashboard and manual inputs
- `lib/calculations.ts` — pure, reusable date and pace calculations
- `tests/calculations.test.ts` — calculation validation
- `app/globals.css` — visual system and responsive layout

The calculation layer has no UI or Strava dependency, which keeps OAuth/API integration isolated from the math.

## Next steps

1. Add Strava OAuth and securely store refresh tokens server-side.
2. Import cycling activities and aggregate distance/elevation by calendar period.
3. Add unit preferences (miles/kilometres and feet/metres).
4. Let riders choose training days and calculate per-ride-day pacing.
5. Add time-zone and custom week-start preferences.
6. Persist goal configurations and show historical pace trends.

Strava is a trademark of Strava, Inc. This project is not affiliated with or endorsed by Strava.
