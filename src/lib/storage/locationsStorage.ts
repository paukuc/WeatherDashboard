import type { SavedLocation } from "../../domain/types";

// Namespaced key so we don't clash with other apps sharing the same origin.
const STORAGE_KEY = "energy-advice:saved-locations";

// Type guard that validates each item before we trust data from localStorage.
// Silently drops anything that doesn't match the expected shape.
function isSavedLocation(value: unknown): value is SavedLocation {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.label === "string" &&
    typeof record.lat === "number" &&
    typeof record.lng === "number"
  );
}

export function loadLocations(): SavedLocation[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isSavedLocation);
  } catch {
    return [];
  }
}

export function saveLocations(locations: SavedLocation[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
}
