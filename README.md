# Energy Advice Weather Dashboard

## Run

```bash
npm install
npm run dev
```

No API keys needed.

## Tests

Playwright end-to-end tests are available in `e2e/`.

```bash
npm run test:e2e
```

Other useful modes:

```bash
npm run test:e2e:headed
npm run test:e2e:ui
```

## Architecture

Zustand store split into two slices (dashboard filters + saved locations). State is synced to URL query params on change and restored on load. Saved locations go to localStorage.

All selected metrics share one Chart.js chart rather than stacking separate instances — easier to compare visually. The Chart.js legend is replaced with a custom div below the canvas so adding lines doesn't shrink the plot area.

Computed series (moving average, trend line, min/max) are calculated client-side from the raw API data. AbortController cancels in-flight requests when inputs change.
