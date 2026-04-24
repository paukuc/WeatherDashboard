import { useEffect, useState } from "react";
import "./App.css";
import { Map } from "./Map.tsx";
import { Toolbar } from "./Toolbar.tsx";
import { LocationDetail } from "./DetailView.tsx";
import { useAppStore } from "../state/store";
import { loadLocations, saveLocations } from "../lib/storage/locationsStorage";
import { buildQueryString, parseQueryState } from "../lib/url/queryState";

function App() {
  const savedLocations = useAppStore((state) => state.savedLocations);
  const hydrateLocations = useAppStore((state) => state.hydrateLocations);
  const globalDateRange = useAppStore((state) => state.globalDateRange);
  const selectedMetrics = useAppStore((state) => state.selectedMetrics);
  const selectedComputedSeries = useAppStore(
    (state) => state.selectedComputedSeries,
  );
  const setGlobalDateRange = useAppStore((state) => state.setGlobalDateRange);
  const setSelectedMetrics = useAppStore((state) => state.setSelectedMetrics);
  const setSelectedComputedSeries = useAppStore(
    (state) => state.setSelectedComputedSeries,
  );

  const [isHydrated, setIsHydrated] = useState(false);
  const [isQueryHydrated, setIsQueryHydrated] = useState(false);

  useEffect(() => {
    // Hydrate saved map pins once, then allow persistence writes.
    const storedLocations = loadLocations();
    hydrateLocations(storedLocations);
    setIsHydrated(true);
  }, [hydrateLocations]);

  useEffect(() => {
    // Read initial dashboard filters from URL before we start syncing state back.
    const queryState = parseQueryState(window.location.search);

    if (queryState.globalDateRange) {
      setGlobalDateRange(queryState.globalDateRange);
    }

    if (queryState.selectedMetrics) {
      setSelectedMetrics(queryState.selectedMetrics);
    }

    if (queryState.selectedComputedSeries) {
      setSelectedComputedSeries(queryState.selectedComputedSeries);
    }

    setIsQueryHydrated(true);
    // Run once on startup to apply URL state before sync back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    // Persist only after hydration to avoid overwriting storage with initial empty state.
    saveLocations(savedLocations);
  }, [savedLocations, isHydrated]);

  useEffect(() => {
    if (!isQueryHydrated) {
      return;
    }

    const query = buildQueryString({
      globalDateRange,
      selectedMetrics,
      selectedComputedSeries,
    });
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [
    globalDateRange,
    selectedMetrics,
    selectedComputedSeries,
    isQueryHydrated,
  ]);

  return (
    <>
      <Toolbar />
      <div className="mainContainer">
        <Map />
        <LocationDetail />
      </div>
    </>
  );
}

export default App;
