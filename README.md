# Cycling Goals Intelligence

Cycling Goals Intelligence fills a gap in Strava Goals: it shows not only annual pace, but also weekly and monthly pace for both distance and elevation—and turns any deficit into an actionable daily number.

## MVP

The first version is deliberately API-free so the calculation model can be reviewed before adding Strava authentication. It includes:

- Weekly (Monday–Sunday), monthly, and annual calendar goals
- Distance in miles and elevation gain in feet
- Editable manual goal and completed values, preloaded with realistic sample data
- A selectable “progress through” date for testing any point in a period
- Responsive, accessible single-page UI suitable for GitHub and web deployment
- A small, pure calculation module with automated boundary tests

Select **Edit goals** to replace the sample goal and progress values. All results update immediately.

## Calculation definitions

The selected date is treated as a completed snapshot: `current progress` includes riding through that date, and `remaining days` begin on the following calendar day.

| Result | Definition |
| --- | --- |
| Current progress | Manually entered cumulative distance or elevation through the selected date |
| Target progress | `goal × elapsed calendar days ÷ total calendar days` (selected date included) |
| Ahead / behind | `current progress − target progress`; positive is ahead, negative is behind |
| Remaining | `max(goal − current progress, 0)` |
| Daily required | `remaining ÷ calendar days after selected date` |
| 7-day catch-up pace | When behind: normal full-period daily pace plus the deficit spread across the next seven days, or all remaining days when fewer than seven remain |

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

Tests cover weekly boundaries, leap-year math, behind-pace catch-up calculations, and completed goals.

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
