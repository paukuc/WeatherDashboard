# Energy Advice Weather Dashboard

Take-home task — weather dashboard SPA.

## Run

```bash
npm install
npm run dev
```

No API keys needed.

## Architecture

Zustand store split into two slices (dashboard filters + saved locations). State is synced to URL query params on change and restored on load. Saved locations go to localStorage.

All selected metrics share one Chart.js chart rather than stacking separate instances — easier to compare visually. The Chart.js legend is replaced with a custom div below the canvas so adding lines doesn't shrink the plot area.

Computed series (moving average, trend line, min/max) are calculated client-side from the raw API data. AbortController cancels in-flight requests when inputs change.

## Limitations

- Active selected location isn't saved to the URL, only to the map via localStorage.
- Metrics are shown as lines on one chart, not as separate stacked chart instances.
- Open-Meteo archive data lags a few days, so very recent end dates may return nothing.
- No tests, no Docker.

## Implementation Checklist

Legend: [C] completed · [P] partially completed · [-] not completed

### Required Items

- [C] Global toolbar implemented
- [C] Global date range selection implemented
- [C] Global metric checkbox list implemented
- [C] Global computed-series checkbox list implemented
- [C] Interactive map implemented
- [C] Add and save location flow implemented
- [C] Remove location flow implemented
- [C] Saved locations displayed on the map
- [C] One active/selected location displayed in the location detail view
- [P] Multiple selected metrics displayed as stacked charts — shown as lines on one shared chart instead
- [C] Location-specific date override implemented
- [C] Location-specific override resets when global date range changes
- [P] URL query parameter persistence — metrics, computed series and date range are persisted; active location is not
- [C] localStorage persistence implemented for saved locations
- [C] Time-series weather data loaded from a no-auth API (Open-Meteo archive)
- [C] At least one computed series implemented (all three done)
- [C] Loading states implemented
- [C] Empty states implemented
- [C] Error states implemented
- [C] Graceful failure handling implemented
- [C] README setup instructions included
- [C] Architecture and technical decisions documented
- [C] Known limitations or tradeoffs documented
- [C] AI Usage Disclosure included

### Extra Items

- [-] Share Dashboard button
- [-] Shared URL restores full state including localStorage
- [-] Multiple saved locations selected at once
- [-] Separate chart per selected location
- [-] Charts grouped by location
- [C] All 3 computed series implemented
- [C] Request cancellation for rapidly changing filters
- [-] Unit tests
- [-] Dockerfile
- [-] docker-compose.yaml
- [-] Self-contained Docker Compose setup
- [-] Docker build instructions
- [-] Self-signed HTTPS certificate
- [-] Authentication gate
- [C] Mobile-responsive layout

## AI Usage Disclosure

Used GitHub Copilot (Claude Sonnet) throughout — scaffolding, state logic, chart config, CSS. I directed the architecture, reviewed everything, and made the calls on tradeoffs.
