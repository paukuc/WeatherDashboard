import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import type {
  ComputedSeriesKey,
  MetricKey,
  WeatherSeries,
} from "../domain/types";
import "./MetricChart.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface MetricChartProps {
  seriesList: WeatherSeries[];
  selectedComputedSeries: ComputedSeriesKey[];
}

function createMovingAverage(
  values: (number | null)[],
  window: number,
): (number | null)[] {
  return values.map((_, index) => {
    if (index < window - 1) return null;
    const sum = values
      .slice(index - window + 1, index + 1)
      .reduce(
        (acc: number, val) => acc + (typeof val === "number" ? val : 0),
        0,
      );
    return Math.round((sum / window) * 10) / 10;
  });
}

function createTrendLine(values: (number | null)[]): (number | null)[] {
  const validIndices: Array<[number, number]> = [];
  values.forEach((v, i) => {
    if (typeof v === "number") validIndices.push([i, v]);
  });
  if (validIndices.length < 2) return Array(values.length).fill(null);
  const n = validIndices.length;
  const sumX = validIndices.reduce((s, [i]) => s + i, 0);
  const sumY = validIndices.reduce((s, [, v]) => s + v, 0);
  const sumXY = validIndices.reduce((s, [i, v]) => s + i * v, 0);
  const sumX2 = validIndices.reduce((s, [i]) => s + i * i, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return values.map((_, i) => Math.round((slope * i + intercept) * 10) / 10);
}

function buildMinMaxLegendSuffix(values: (number | null)[]): string {
  const numericValues = values.filter(
    (value): value is number => typeof value === "number",
  );

  if (numericValues.length === 0) {
    return " | Min: n/a Max: n/a";
  }

  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);

  return ` | Min: ${min.toFixed(1)} Max: ${max.toFixed(1)}`;
}

const METRIC_COLORS: Record<MetricKey, string> = {
  temperature: "rgb(244, 114, 54)",
  humidity: "rgb(59, 130, 246)",
  windSpeed: "rgb(34, 197, 94)",
};

export function MetricChart({
  seriesList,
  selectedComputedSeries,
}: MetricChartProps) {
  const baseSeries = seriesList[0];

  if (!baseSeries) {
    return null;
  }

  const labels = baseSeries.points.map((point) => point.time);

  const baseDatasets = seriesList.map((series) => {
    const values = series.points.map((point) => point[series.metric] ?? null);

    return {
      label: `${series.label} (${series.unit})${
        selectedComputedSeries.includes("minMax")
          ? buildMinMaxLegendSuffix(values)
          : ""
      }`,
      data: values,
      borderColor: METRIC_COLORS[series.metric],
      backgroundColor: METRIC_COLORS[series.metric],
      tension: 0.35,
      fill: false,
      pointRadius: 2,
      pointHoverRadius: 4,
    };
  });

  const computedDatasets = seriesList.flatMap((series) => {
    const values = series.points.map((point) => point[series.metric] ?? null);
    // Computed series are visual overlays derived from the same base metric points.
    const computed = [];
    if (selectedComputedSeries.includes("movingAverage")) {
      computed.push({
        label: `${series.label} MA7`,
        data: createMovingAverage(values, 7),
        borderColor: METRIC_COLORS[series.metric],
        borderDash: [5, 5],
        backgroundColor: "transparent",
        tension: 0.35,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
      });
    }
    if (selectedComputedSeries.includes("trendLine")) {
      computed.push({
        label: `${series.label} Trend`,
        data: createTrendLine(values),
        borderColor: METRIC_COLORS[series.metric],
        borderDash: [2, 2],
        backgroundColor: "transparent",
        tension: 0,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
      });
    }

    return computed;
  });

  const data = {
    labels,
    datasets: [...baseDatasets, ...computedDatasets],
  };

  const legendItems = data.datasets.map((dataset) => ({
    label: dataset.label,
    color:
      typeof dataset.borderColor === "string" ? dataset.borderColor : "#64748b",
  }));

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
    },
    transitions: {
      active: {
        animation: {
          duration: 0,
        },
      },
      resize: {
        animation: {
          duration: 0,
        },
      },
      show: {
        animation: {
          duration: 0,
        },
      },
      hide: {
        animation: {
          duration: 0,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "Weather Metrics Over Time",
      },
    },
  };

  return (
    <div className="metricChartContainer">
      <div className="metricChartCanvas">
        <Line data={data} options={options} />
      </div>
      <div className="metricLegend" aria-label="Chart legend">
        {legendItems.map((item) => (
          <span className="metricLegendItem" key={item.label}>
            <span
              className="metricLegendSwatch"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
