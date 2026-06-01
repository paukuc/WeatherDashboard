import { expect, test } from "@playwright/test";

// Helper used by the API mock.
// It builds an inclusive YYYY-MM-DD timeline from start to end so mocked arrays
// always match the selected date range requested by the app.
function buildDailyTimeline(start: string, end: string): string[] {
  // Parse raw date strings as local-midnight Date objects.
  const from = new Date(`${start}T00:00:00`);
  const to = new Date(`${end}T00:00:00`);

  // If either date is invalid, return a minimal fallback timeline.
  // This keeps the mock resilient even with malformed inputs.
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return [start, end].filter(Boolean);
  }

  // Normalize order in case caller provides dates in reverse.
  const [minDate, maxDate] = from <= to ? [from, to] : [to, from];
  // Use a mutable cursor date for day-by-day iteration.
  const current = new Date(minDate);
  // Collect ISO-like dates that the chart x-axis expects.
  const dates: string[] = [];

  // Include both boundaries (start and end days).
  while (current <= maxDate) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    // Move forward exactly one calendar day.
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// One end-to-end test that demonstrates core Playwright skills in one flow:
// - deterministic setup
// - network mocking
// - robust locators
// - interactions + assertions
// - report attachments
test("example: main Playwright concepts in one flow", async ({ page }) => {
  // addInitScript runs before app scripts execute.
  // Clearing storage here avoids flaky behavior from old local state.
  await page.addInitScript(() => localStorage.clear());

  // Mock reverse geocode endpoint used by the detail panel.
  // page.route intercepts matching requests and replaces server responses.
  await page.route("**/data/reverse-geocode-client**", async (route) => {
    await route.fulfill({
      // 200 + JSON contentType mimics a successful backend response.
      status: 200,
      contentType: "application/json",
      // Deterministic city value gives us stable assertions later.
      body: JSON.stringify({ city: "London" }),
    });
  });

  // Mock Open-Meteo archive endpoint used for chart data.
  await page.route("**/v1/archive**", async (route) => {
    // Read query params from the outgoing request so mock matches current UI state.
    const requestUrl = new URL(route.request().url());
    const start = requestUrl.searchParams.get("start_date") ?? "2026-04-01";
    const end = requestUrl.searchParams.get("end_date") ?? "2026-04-03";
    // Build time axis dynamically to match selected date range.
    const days = buildDailyTimeline(start, end);

    // Return realistic, deterministic numeric series for all app metrics.
    const payload = {
      daily: {
        time: days,
        // Small monotonic sequences make chart behavior easy to reason about.
        temperature_2m_mean: days.map((_, i) => 10 + i),
        relative_humidity_2m_mean: days.map((_, i) => 60 + i),
        wind_speed_10m_mean: days.map((_, i) => 5 + i),
      },
    };

    // Fulfill request with mocked payload instead of hitting the real API.
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });

  // test.step groups actions in report output so debugging is easier.
  await test.step("Navigate and validate initial state", async () => {
    // Navigate to baseURL + "/" (baseURL is defined in playwright.config.ts).
    await page.goto("/");

    // Assert initial empty-state text before any map selection.
    await expect(
      page.getByText("Select a location on the map to preview data."),
    ).toBeVisible();
    // Buttons should be disabled until a location is active.
    await expect(
      page.getByRole("button", { name: "Add Location" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Remove Selected" }),
    ).toBeDisabled();
  });

  await test.step("Interact with app controls and verify URL sync", async () => {
    // Leaflet map click sets active location and starts data fetching.
    // Position click is used here because map tiles/markers are canvas-like UI.
    await page
      .locator(".leaflet-container")
      .click({ position: { x: 260, y: 180 } });

    // After selecting a point, Add Location becomes enabled.
    await expect(
      page.getByRole("button", { name: "Add Location" }),
    ).toBeEnabled();
    // Persist current active location into saved locations.
    await page.getByRole("button", { name: "Add Location" }).click();

    // getByLabel is preferred for form controls because it is accessibility-driven
    // and resilient to layout/style changes.
    await page.getByLabel("Humidity").check();
    await page.getByLabel("Moving Avg").check();

    // Two date inputs exist in toolbar, so use positional locators intentionally.
    // first() targets start date, nth(1) targets end date.
    await page.locator(".toolbar .dateInput").first().fill("2026-04-05");
    await page.locator(".toolbar .dateInput").nth(1).fill("2026-04-08");

    // URL assertions verify store -> query-param sync behavior.
    // Regex keeps checks flexible even if parameter order changes.
    await expect(page).toHaveURL(/start=2026-04-05/);
    await expect(page).toHaveURL(/end=2026-04-08/);
    await expect(page).toHaveURL(/metrics=.*humidity/);
    await expect(page).toHaveURL(/computed=movingAverage/);
  });

  await test.step("Assert rendered data UI", async () => {
    // Value from reverse-geocode mock should be rendered in detail panel.
    await expect(page.getByText("London")).toBeVisible();
    // Chart container confirms graph UI rendered successfully.
    await expect(page.locator(".metricChartContainer")).toBeVisible();
    // Legend assertions validate both base metric and computed overlay rendering.
    await expect(page.getByLabel("Chart legend")).toContainText("Humidity");
    await expect(page.getByLabel("Chart legend")).toContainText("MA7");
  });

  // Attach a screenshot to the test report to aid post-failure debugging.
  await test.info().attach("dashboard-screenshot", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
