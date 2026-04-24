import { create } from "zustand";
import {
  createDashboardSlice,
  type DashboardSlice,
} from "./slices/dashboardSlice";
import {
  createLocationsSlice,
  type LocationsSlice,
} from "./slices/locationsSlice";

// The combined store type — merging both slices into one flat object.
// Slices keep the code organized without needing separate stores.
export type AppStore = DashboardSlice & LocationsSlice;

// Single Zustand store. Spread both slices so they share the same state atom
// and can read each other's state if needed in the future.
export const useAppStore = create<AppStore>()((...args) => ({
  ...createDashboardSlice(...args),
  ...createLocationsSlice(...args),
}));
