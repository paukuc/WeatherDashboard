import type {
  MetricKey,
  WeatherPoint,
  WeatherRequest,
  WeatherSeries,
  WeatherSnapshot,
} from "../../domain/types";

type OpenMeteoDailyResponse = {
  daily?: {
    time?: string[];
    temperature_2m_mean?: number[];
    relative_humidity_2m_mean?: number[];
    wind_speed_10m_mean?: number[];
  };
};

// Central config that maps our internal metric keys to Open-Meteo field names and display metadata.
// Adding a new metric only requires a new entry here — no other changes needed.
const METRIC_CONFIG: Record<
  MetricKey,
  {
    label: string;
    unit: string;
    responseKey:
      | "temperature_2m_mean"
      | "relative_humidity_2m_mean"
      | "wind_speed_10m_mean";
  }
> = {
  temperature: {
    label: "Temperature",
    unit: "C",
    responseKey: "temperature_2m_mean",
  },
  humidity: {
    label: "Humidity",
    unit: "%",
    responseKey: "relative_humidity_2m_mean",
  },
  windSpeed: {
    label: "Wind speed",
    unit: "km/h",
    responseKey: "wind_speed_10m_mean",
  },
};

// Builds the Open-Meteo archive URL. All three daily variables are always requested
// so the response can be shared; individual metrics are filtered during normalization.
function buildOpenMeteoUrl({ location, dateRange }: WeatherRequest): string {
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");

  url.searchParams.set("latitude", String(location.lat));
  url.searchParams.set("longitude", String(location.lng));
  url.searchParams.set("start_date", dateRange.start);
  url.searchParams.set("end_date", dateRange.end);
  url.searchParams.set(
    "daily",
    [
      "temperature_2m_mean",
      "relative_humidity_2m_mean",
      "wind_speed_10m_mean",
    ].join(","),
  );
  url.searchParams.set("timezone", "auto");

  return url.toString();
}

// Zips the time array and the values array into the WeatherPoint shape our chart expects.
function normalizeSeries(
  metric: MetricKey,
  times: string[],
  values: Array<number | undefined>,
): WeatherSeries {
  const config = METRIC_CONFIG[metric];

  const points: WeatherPoint[] = times.map((time, index) => ({
    time,
    [metric]: values[index],
  }));

  return {
    metric,
    label: config.label,
    unit: config.unit,
    points,
  };
}

function normalizeOpenMeteoResponse(
  request: WeatherRequest,
  response: OpenMeteoDailyResponse,
): WeatherSnapshot {
  const times = response.daily?.time ?? [];

  const series = request.metrics.map((metric) => {
    const config = METRIC_CONFIG[metric];
    const values = response.daily?.[config.responseKey] ?? [];

    return normalizeSeries(metric, times, values);
  });

  return {
    locationLabel: request.location.label,
    dateRange: request.dateRange,
    series,
  };
}

export async function fetchWeatherSnapshot(
  request: WeatherRequest,
): Promise<WeatherSnapshot> {
  const response = await fetch(buildOpenMeteoUrl(request));

  if (!response.ok) {
    throw new Error("Failed to load weather data.");
  }

  const json = (await response.json()) as OpenMeteoDailyResponse;

  return normalizeOpenMeteoResponse(request, json);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Generates every calendar day between start and end (inclusive) as ISO strings.
// Used by the mock so the x-axis always matches whatever dates the user picked.
function buildDateTimeline(start: string, end: string): string[] {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return [start, end].filter(Boolean);
  }

  const [from, to] =
    startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
  const current = new Date(from);
  const timeline: string[] = [];

  while (current <= to) {
    timeline.push(toIsoDate(current));
    current.setDate(current.getDate() + 1);
  }

  return timeline;
}

// Produces realistic-looking wave values for each metric using sin/cos oscillations.
function buildMockValues(metric: MetricKey, length: number): number[] {
  return Array.from({ length }, (_, index) => {
    switch (metric) {
      case "temperature":
        return Math.round(8 + 6 * Math.sin(index / 2));
      case "humidity":
        return Math.round(62 + 12 * Math.cos(index / 3));
      case "windSpeed":
        return Math.round(14 + 7 * Math.sin(index / 1.5));
      default:
        return 0;
    }
  });
}

export function createMockWeatherSnapshot(
  request: WeatherRequest,
): WeatherSnapshot {
  const times = buildDateTimeline(
    request.dateRange.start,
    request.dateRange.end,
  );

  const response: OpenMeteoDailyResponse = {
    daily: {
      time: times,
      temperature_2m_mean: buildMockValues("temperature", times.length),
      relative_humidity_2m_mean: buildMockValues("humidity", times.length),
      wind_speed_10m_mean: buildMockValues("windSpeed", times.length),
    },
  };

  return normalizeOpenMeteoResponse(request, response);
}
