// The raw weather metrics the user can toggle on/off in the toolbar.
export type MetricKey = "temperature" | "humidity" | "windSpeed";

// Extra derived series that can be layered on top of the raw metrics.
export type ComputedSeriesKey = "movingAverage" | "trendLine" | "minMax";

// ISO date strings (YYYY-MM-DD). Using strings avoids timezone issues with Date objects.
export type DateRange = {
  start: string;
  end: string;
};

// A location that has been saved to the list and persisted to localStorage.
export type SavedLocation = {
  id: string; // crypto.randomUUID() — stable across sessions
  label: string;
  lat: number;
  lng: number;
};

// The location currently selected/highlighted on the map. Not saved yet.
export type ActiveLocation = {
  label: string;
  lat: number;
  lng: number;
};

// One data point returned by the weather API for a single day.
export type WeatherPoint = {
  time: string; // ISO date, e.g. "2026-04-01"
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
};

// All daily values for one metric over the requested date range.
export type WeatherSeries = {
  metric: MetricKey;
  label: string; // human-readable, e.g. "Temperature"
  unit: string; // e.g. "C", "%", "km/h"
  points: WeatherPoint[];
};

// Everything returned from one weather API call — multiple series bundled together.
export type WeatherSnapshot = {
  locationLabel: string;
  dateRange: DateRange;
  series: WeatherSeries[];
};

// The parameters needed to fire a weather fetch.
export type WeatherRequest = {
  location: ActiveLocation;
  dateRange: DateRange;
  metrics: MetricKey[];
};
