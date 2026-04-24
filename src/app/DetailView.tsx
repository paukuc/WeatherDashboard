import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../state/store";
import { fetchWeatherSnapshot } from "../lib/api/openMeteo";
import type { WeatherSnapshot } from "../domain/types";
import { isValidDateRange } from "../lib/url/queryState";
import { MetricChart } from "./MetricChart";
import "./DetailView.css";

type ReverseGeocodeResponse = {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
};

export function LocationDetail() {
  const globalDateRange = useAppStore((state) => state.globalDateRange);
  const activeLocation = useAppStore((state) => state.activeLocation);
  const detailDateOverride = useAppStore((state) => state.detailDateOverride);
  const setDetailDateOverride = useAppStore(
    (state) => state.setDetailDateOverride,
  );
  const clearDetailDateOverride = useAppStore(
    (state) => state.clearDetailDateOverride,
  );
  const selectedMetrics = useAppStore((state) => state.selectedMetrics);
  const selectedComputedSeries = useAppStore(
    (state) => state.selectedComputedSeries,
  );

  const effectiveDateRange = detailDateOverride ?? globalDateRange;

  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedLocationLabel, setResolvedLocationLabel] = useState<
    string | null
  >(null);
  const abortRef = useRef<AbortController | null>(null);
  const reverseGeocodeAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!activeLocation) {
      setResolvedLocationLabel(null);
      return;
    }

    const fallbackLabel = `${activeLocation.lat.toFixed(4)}, ${activeLocation.lng.toFixed(4)}`;
    // Show coordinates immediately, then replace with a human-friendly place name if available.
    setResolvedLocationLabel(fallbackLabel);

    reverseGeocodeAbortRef.current?.abort();
    const controller = new AbortController();
    reverseGeocodeAbortRef.current = controller;

    const url = new URL(
      "https://api.bigdatacloud.net/data/reverse-geocode-client",
    );
    url.searchParams.set("latitude", String(activeLocation.lat));
    url.searchParams.set("longitude", String(activeLocation.lng));
    url.searchParams.set("localityLanguage", "en");

    fetch(url.toString(), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to reverse geocode.");
        }

        return response.json() as Promise<ReverseGeocodeResponse>;
      })
      .then((payload) => {
        if (controller.signal.aborted) {
          return;
        }

        const cityLabel =
          payload.city ??
          payload.locality ??
          payload.principalSubdivision ??
          payload.countryName ??
          fallbackLabel;
        setResolvedLocationLabel(cityLabel);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResolvedLocationLabel(fallbackLabel);
        }
      });

    return () => {
      controller.abort();
    };
  }, [activeLocation]);

  useEffect(() => {
    if (!activeLocation || selectedMetrics.length === 0) {
      setSnapshot(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (!isValidDateRange(effectiveDateRange)) {
      setSnapshot(null);
      setError(
        "Invalid date range: start date must be before or equal to end date.",
      );
      setIsLoading(false);
      return;
    }

    // Cancel any previous in-flight request so stale responses can't overwrite fresh state.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    fetchWeatherSnapshot({
      location: activeLocation,
      dateRange: effectiveDateRange,
      metrics: selectedMetrics,
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setSnapshot(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Failed to load data.");
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [
    activeLocation,
    effectiveDateRange.start,
    effectiveDateRange.end,
    selectedMetrics,
  ]);

  return (
    <div className="detailPanel">
      <div className="detailView">
        <input
          className="dateInput"
          type="date"
          placeholder="Date From"
          value={effectiveDateRange.start}
          onChange={(event) =>
            setDetailDateOverride({
              start: event.target.value,
              end: effectiveDateRange.end,
            })
          }
        />
        <input
          className="dateInput"
          type="date"
          placeholder="Date To"
          value={effectiveDateRange.end}
          onChange={(event) =>
            setDetailDateOverride({
              start: effectiveDateRange.start,
              end: event.target.value,
            })
          }
        />
      </div>
      <div className="buttons">
        <button onClick={clearDetailDateOverride}>Reset to Global</button>
      </div>

      {!activeLocation && <p>Select a location on the map to preview data.</p>}

      {activeLocation && selectedMetrics.length === 0 && (
        <p>Select at least one metric in the toolbar.</p>
      )}

      {isLoading && <p>Loading weather data…</p>}

      {error && !isLoading && (
        <div>
          <p>Error: {error}</p>
          <button
            onClick={() => {
              if (!activeLocation || selectedMetrics.length === 0) return;
              if (!isValidDateRange(effectiveDateRange)) {
                setError(
                  "Invalid date range: start date must be before or equal to end date.",
                );
                return;
              }
              setError(null);
              setIsLoading(true);
              fetchWeatherSnapshot({
                location: activeLocation,
                dateRange: effectiveDateRange,
                metrics: selectedMetrics,
              })
                .then(setSnapshot)
                .catch((err: unknown) =>
                  setError(
                    err instanceof Error ? err.message : "Failed to load data.",
                  ),
                )
                .finally(() => setIsLoading(false));
            }}
          >
            Retry
          </button>
        </div>
      )}

      {snapshot && !isLoading && !error && selectedMetrics.length > 0 && (
        <div>
          <p>{resolvedLocationLabel ?? snapshot.locationLabel}</p>
          <MetricChart
            seriesList={snapshot.series}
            selectedComputedSeries={selectedComputedSeries}
          />
        </div>
      )}
    </div>
  );
}
