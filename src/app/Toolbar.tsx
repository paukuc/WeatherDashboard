import type { ComputedSeriesKey, DateRange, MetricKey } from "../domain/types";
import { useAppStore } from "../state/store";
import "./Toolbar.css";

// Driving checkboxes from a config array means adding a new metric only requires
// a new entry here — the JSX loop handles the rest.
const METRIC_OPTIONS: Array<{ key: MetricKey; label: string }> = [
  { key: "temperature", label: "Temp" },
  { key: "humidity", label: "Humidity" },
  { key: "windSpeed", label: "Wind" },
];

const COMPUTED_OPTIONS: Array<{ key: ComputedSeriesKey; label: string }> = [
  { key: "movingAverage", label: "Moving Avg" },
  { key: "trendLine", label: "Trend" },
  { key: "minMax", label: "Min/Max" },
];

export function Toolbar() {
  const globalDateRange = useAppStore((state) => state.globalDateRange);
  const setGlobalDateRange = useAppStore((state) => state.setGlobalDateRange);
  const selectedMetrics = useAppStore((state) => state.selectedMetrics);
  const toggleMetric = useAppStore((state) => state.toggleMetric);
  const selectedComputedSeries = useAppStore(
    (state) => state.selectedComputedSeries,
  );
  const toggleComputedSeries = useAppStore(
    (state) => state.toggleComputedSeries,
  );

  // Merges a partial update (just start or just end) into the existing range
  // so we don't have to pass both fields on every change event.
  const updateGlobalDateRange = (partial: Partial<DateRange>) => {
    setGlobalDateRange({
      ...globalDateRange,
      ...partial,
    });
  };

  return (
    <div className="toolbar">
      <input
        className="dateInput"
        type="date"
        placeholder="Date From"
        value={globalDateRange.start}
        onChange={(event) =>
          updateGlobalDateRange({ start: event.target.value })
        }
      />
      <input
        className="dateInput"
        type="date"
        placeholder="Date To"
        value={globalDateRange.end}
        onChange={(event) => updateGlobalDateRange({ end: event.target.value })}
      />
      <div className="checkBoxesContainer">
        <div className="metricsBoxes boxContainer">
          Metrics:
          {METRIC_OPTIONS.map((option) => (
            <label key={option.key}>
              <input
                type="checkbox"
                checked={selectedMetrics.includes(option.key)}
                onChange={() => toggleMetric(option.key)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <div className="computedBoxes boxContainer">
          Computed:
          {COMPUTED_OPTIONS.map((option) => (
            <label key={option.key}>
              <input
                type="checkbox"
                checked={selectedComputedSeries.includes(option.key)}
                onChange={() => toggleComputedSeries(option.key)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
