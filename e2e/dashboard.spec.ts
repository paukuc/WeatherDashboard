import { expect, test } from "@playwright/test";

function buildDailyTimeline(start: string, end: string): string[] {
  const from = new Date(`${start}T00:00:00`);
  const to = new Date(`${end}T00:00:00`);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return [start, end].filter(Boolean);
  }

  const [minDate, maxDate] = from <= to ? [from, to] : [to, from];
  const current = new Date(minDate);
  const dates: string[] = [];

  while (current <= maxDate) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });

  await page.route("**/data/reverse-geocode-client**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ city: "London" }),
    });
  });

  await page.route("**/v1/archive**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const start = requestUrl.searchParams.get("start_date") ?? "2026-04-01";
    const end = requestUrl.searchParams.get("end_date") ?? "2026-04-03";
    const days = buildDailyTimeline(start, end);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        daily: {
          time: days,
          temperature_2m_mean: days.map((_, index) => 10 + index),
          relative_humidity_2m_mean: days.map((_, index) => 60 + index),
          wind_speed_10m_mean: days.map((_, index) => 5 + index),
        },
      }),
    });
  });
});

async function clickMap(
  page: Parameters<typeof test>[0] extends never ? never : any,
) {
  await page
    .locator(".leaflet-container")
    .click({ position: { x: 260, y: 180 } });
}

async function clickSavedMapMarker(
  page: Parameters<typeof test>[0] extends never ? never : any,
) {
  await page.locator(".leaflet-interactive").first().click();
}

test("shows empty state before a location is selected", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByText("Select a location on the map to preview data."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add Location" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Remove Selected" }),
  ).toBeDisabled();
});

test("can save and remove a selected location and persist the saved list", async ({
  page,
}) => {
  await page.goto("/");
  await clickMap(page);

  await expect(
    page.getByRole("button", { name: "Add Location" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Add Location" }).click();

  await expect(page.getByText("London")).toBeVisible();

  const savedAfterAdd = await page.evaluate(() =>
    window.localStorage.getItem("energy-advice:saved-locations"),
  );

  expect(savedAfterAdd).not.toBeNull();
  expect(savedAfterAdd).toContain("Location ");

  await page.getByRole("button", { name: "Remove Selected" }).click();

  await expect(
    page.getByText("Select a location on the map to preview data."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add Location" }),
  ).toBeDisabled();

  const savedAfterRemove = await page.evaluate(() =>
    window.localStorage.getItem("energy-advice:saved-locations"),
  );

  expect(savedAfterRemove).toBe("[]");
});

test("hydrates filters from the URL and renders matching chart state", async ({
  page,
}) => {
  await page.goto(
    "/?start=2026-04-05&end=2026-04-08&metrics=temperature,humidity&computed=movingAverage,minMax",
  );

  await expect(page.locator(".toolbar .dateInput").first()).toHaveValue(
    "2026-04-05",
  );
  await expect(page.locator(".toolbar .dateInput").nth(1)).toHaveValue(
    "2026-04-08",
  );
  await expect(page.getByLabel("Humidity")).toBeChecked();
  await expect(page.getByLabel("Moving Avg")).toBeChecked();

  await clickMap(page);

  await expect(page.getByText("London")).toBeVisible();
  await expect(page.locator(".metricChartContainer")).toBeVisible();
  await expect(page.getByLabel("Chart legend")).toContainText("Humidity");
  await expect(page.getByLabel("Chart legend")).toContainText("Min:");
  await expect(page.getByLabel("Chart legend")).toContainText("MA7");
});

test("shows empty metric state and validates invalid detail date ranges", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByLabel("Temp").uncheck();
  await clickMap(page);

  await expect(
    page.getByText("Select at least one metric in the toolbar."),
  ).toBeVisible();

  await page.getByLabel("Temp").check();
  await expect(page.getByText("London")).toBeVisible();

  await page.locator(".detailPanel .dateInput").first().fill("2026-04-20");
  await page.locator(".detailPanel .dateInput").nth(1).fill("2026-04-10");

  await expect(
    page.getByText(
      "Error: Invalid date range: start date must be before or equal to end date.",
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "Reset to Global" }).click();
  await expect(
    page.getByText(
      "Error: Invalid date range: start date must be before or equal to end date.",
    ),
  ).toBeHidden();
  await expect(page.locator(".metricChartContainer")).toBeVisible();
});

test("shows an error and can retry when weather loading fails once", async ({
  page,
}) => {
  let requestCount = 0;

  await page.unroute("**/v1/archive**");
  await page.route("**/v1/archive**", async (route) => {
    requestCount += 1;

    if (requestCount === 1) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Temporary failure" }),
      });
      return;
    }

    const requestUrl = new URL(route.request().url());
    const start = requestUrl.searchParams.get("start_date") ?? "2026-04-01";
    const end = requestUrl.searchParams.get("end_date") ?? "2026-04-03";
    const days = buildDailyTimeline(start, end);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        daily: {
          time: days,
          temperature_2m_mean: days.map((_, index) => 10 + index),
          relative_humidity_2m_mean: days.map((_, index) => 60 + index),
          wind_speed_10m_mean: days.map((_, index) => 5 + index),
        },
      }),
    });
  });

  await page.goto("/");
  await clickMap(page);

  await expect(
    page.getByText("Error: Failed to load weather data."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();

  await page.getByRole("button", { name: "Retry" }).click();

  await expect(
    page.getByText("Error: Failed to load weather data."),
  ).toBeHidden();
  await expect(page.getByText("London")).toBeVisible();
  await expect(page.locator(".metricChartContainer")).toBeVisible();
});

test("rehydrates saved locations from localStorage on page load", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "energy-advice:saved-locations",
      JSON.stringify([
        {
          id: "saved-london",
          label: "Location 51.5050, -0.0900",
          lat: 51.505,
          lng: -0.09,
        },
      ]),
    );
  });

  await page.goto("/");
  await clickSavedMapMarker(page);

  await expect(
    page.getByRole("button", { name: "Remove Selected" }),
  ).toBeEnabled();
  await expect(page.getByText("London")).toBeVisible();
  await expect(page.locator(".metricChartContainer")).toBeVisible();

  const persistedLocations = await page.evaluate(() =>
    window.localStorage.getItem("energy-advice:saved-locations"),
  );

  expect(persistedLocations).toContain("saved-london");
});

test("clears detail date override when the global date range changes", async ({
  page,
}) => {
  await page.goto("/");
  await clickMap(page);

  await expect(page.getByText("London")).toBeVisible();

  await page.locator(".detailPanel .dateInput").first().fill("2026-04-10");
  await page.locator(".detailPanel .dateInput").nth(1).fill("2026-04-12");

  await expect(page.locator(".detailPanel .dateInput").first()).toHaveValue(
    "2026-04-10",
  );
  await expect(page.locator(".detailPanel .dateInput").nth(1)).toHaveValue(
    "2026-04-12",
  );

  await page.locator(".toolbar .dateInput").first().fill("2026-04-02");
  await page.locator(".toolbar .dateInput").nth(1).fill("2026-04-06");

  await expect(page.locator(".toolbar .dateInput").first()).toHaveValue(
    "2026-04-02",
  );
  await expect(page.locator(".toolbar .dateInput").nth(1)).toHaveValue(
    "2026-04-06",
  );
  await expect(page.locator(".detailPanel .dateInput").first()).toHaveValue(
    "2026-04-02",
  );
  await expect(page.locator(".detailPanel .dateInput").nth(1)).toHaveValue(
    "2026-04-06",
  );
  await expect(page).toHaveURL(/start=2026-04-02/);
  await expect(page).toHaveURL(/end=2026-04-06/);
  await expect(page.locator(".metricChartContainer")).toBeVisible();
});
