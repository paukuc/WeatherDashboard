import type { StateCreator } from "zustand";
import type { SavedLocation } from "../../domain/types";
import type { AppStore } from "../store";

export type LocationsSlice = {
  savedLocations: SavedLocation[];
  addLocation: (location: SavedLocation) => void;
  removeLocation: (locationId: string) => void;
  // Replaces the entire list at once — used on startup to restore from localStorage.
  hydrateLocations: (locations: SavedLocation[]) => void;
};

export const createLocationsSlice: StateCreator<
  AppStore,
  [],
  [],
  LocationsSlice
> = (set) => ({
  savedLocations: [],

  addLocation: (location) =>
    set((state) => ({
      savedLocations: [...state.savedLocations, location],
    })),

  removeLocation: (locationId) =>
    set((state) => ({
      savedLocations: state.savedLocations.filter(
        (location) => location.id !== locationId,
      ),
    })),

  hydrateLocations: (locations) =>
    set({
      savedLocations: locations,
    }),
});
