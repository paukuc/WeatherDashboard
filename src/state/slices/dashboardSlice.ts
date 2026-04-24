import type { StateCreator } from "zustand";
import type {
  ActiveLocation,
  ComputedSeriesKey,
  DateRange,
  MetricKey,
} from "../../domain/types";
import type { AppStore } from "../store";

export type DashboardSlice = {
  // The date range chosen in the global toolbar.
  globalDateRange: DateRange;
  // Which raw weather metrics are currently shown on the chart.
  selectedMetrics: MetricKey[];
  // Which computed overlays (moving average, trend, min/max) are active.
  selectedComputedSeries: ComputedSeriesKey[];
  // The map pin the user last clicked — drives the detail panel.
  activeLocation: ActiveLocation | null;
  // Optional per-session date override for the detail panel; null means use globalDateRange.
  detailDateOverride: DateRange | null;

  setGlobalDateRange: (range: DateRange) => void;
  // Direct setters used during URL hydration to replace the entire selection at once.
  setSelectedMetrics: (metrics: MetricKey[]) => void;
  setSelectedComputedSeries: (series: ComputedSeriesKey[]) => void;
  // Toggle helpers used by the toolbar checkboxes.
  toggleMetric: (metric: MetricKey) => void;
  toggleComputedSeries: (series: ComputedSeriesKey) => void;
  setActiveLocation: (location: ActiveLocation | null) => void;
  setDetailDateOverride: (range: DateRange | null) => void;
  clearDetailDateOverride: () => void;
};

export const createDashboardSlice: StateCreator<
  AppStore,
  [],
  [],
  DashboardSlice
> = (set) => ({
  globalDateRange: {
    start: "2026-04-01",
    end: "2026-04-21",
  },
  selectedMetrics: ["temperature"],
  selectedComputedSeries: [],
  activeLocation: null,
  detailDateOverride: null,

  // Changing the global range always clears any detail-specific override so
  // the detail panel snaps back to whatever the toolbar says.
  setGlobalDateRange: (range) =>
    set({
      globalDateRange: range,
      detailDateOverride: null,
    }),

  setSelectedMetrics: (metrics) =>
    set({
      selectedMetrics: metrics,
    }),

  setSelectedComputedSeries: (series) =>
    set({
      selectedComputedSeries: series,
    }),

  toggleMetric: (metric) =>
    set((state) => ({
      selectedMetrics: state.selectedMetrics.includes(metric)
        ? state.selectedMetrics.filter((item) => item !== metric)
        : [...state.selectedMetrics, metric],
    })),

  toggleComputedSeries: (series) =>
    set((state) => ({
      selectedComputedSeries: state.selectedComputedSeries.includes(series)
        ? state.selectedComputedSeries.filter((item) => item !== series)
        : [...state.selectedComputedSeries, series],
    })),

  setActiveLocation: (location) =>
    set({
      activeLocation: location,
    }),

  setDetailDateOverride: (range) =>
    set({
      detailDateOverride: range,
    }),

  clearDetailDateOverride: () =>
    set({
      detailDateOverride: null,
    }),
});
