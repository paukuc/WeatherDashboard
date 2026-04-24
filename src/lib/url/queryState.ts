import type {
  ComputedSeriesKey,
  DateRange,
  MetricKey,
} from "../../domain/types";

export type QueryState = {
  globalDateRange?: DateRange;
  selectedMetrics?: MetricKey[];
  selectedComputedSeries?: ComputedSeriesKey[];
};

// Whitelists used by parseCsvParam — any URL value not in these lists is silently ignored.
const METRIC_KEYS: MetricKey[] = ["temperature", "humidity", "windSpeed"];
const COMPUTED_KEYS: ComputedSeriesKey[] = [
  "movingAverage",
  "trendLine",
  "minMax",
];

function isDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// Parses a comma-separated URL param and filters out any values not in the allowed list.
// Returns undefined when the param is missing so the caller can decide to skip hydration.
function parseCsvParam<T extends string>(
  input: string | null,
  allowed: T[],
): T[] | undefined {
  if (!input) {
    return undefined;
  }

  const allowedSet = new Set(allowed);
  const parsed = input
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is T => allowedSet.has(item as T));

  return Array.from(new Set(parsed));
}

export function isValidDateRange(range: DateRange): boolean {
  return range.start <= range.end;
}

// Reads filter state out of the URL. Only returns fields that are present and valid
// so App.tsx can skip updating the store for anything that wasn't in the URL.
export function parseQueryState(search: string): QueryState {
  const params = new URLSearchParams(search);
  const start = params.get("start");
  const end = params.get("end");

  const parsedRange =
    start && end && isDateString(start) && isDateString(end)
      ? { start, end }
      : undefined;

  const globalDateRange =
    parsedRange && isValidDateRange(parsedRange) ? parsedRange : undefined;

  return {
    globalDateRange,
    selectedMetrics: parseCsvParam(params.get("metrics"), METRIC_KEYS),
    selectedComputedSeries: parseCsvParam(
      params.get("computed"),
      COMPUTED_KEYS,
    ),
  };
}

// Serializes current filter state back into a query string for history.replaceState.
export function buildQueryString(state: {
  globalDateRange: DateRange;
  selectedMetrics: MetricKey[];
  selectedComputedSeries: ComputedSeriesKey[];
}): string {
  const params = new URLSearchParams();

  params.set("start", state.globalDateRange.start);
  params.set("end", state.globalDateRange.end);

  if (state.selectedMetrics.length > 0) {
    params.set("metrics", state.selectedMetrics.join(","));
  }

  if (state.selectedComputedSeries.length > 0) {
    params.set("computed", state.selectedComputedSeries.join(","));
  }

  return params.toString();
}
