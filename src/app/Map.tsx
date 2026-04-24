import { useAppStore } from "../state/store";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import "./Map.css";

// Leaflet event hooks must live inside MapContainer, so this component exists
// purely to attach the click handler without rendering anything.
function MapClickHandler() {
  const setActiveLocation = useAppStore((state) => state.setActiveLocation);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      // Set a temporary label; the detail panel will replace it with a proper place name.
      setActiveLocation({
        label: `Picked ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat,
        lng,
      });
    },
  });

  return null;
}

export function Map() {
  const savedLocations = useAppStore((state) => state.savedLocations);
  const activeLocation = useAppStore((state) => state.activeLocation);
  const addLocation = useAppStore((state) => state.addLocation);
  const removeLocation = useAppStore((state) => state.removeLocation);
  const setActiveLocation = useAppStore((state) => state.setActiveLocation);

  const handleAddLocation = () => {
    if (!activeLocation) {
      return;
    }

    const id = crypto.randomUUID();
    // Use a consistent coordinate-based label for saved locations.
    const savedLabel = `Location ${activeLocation.lat.toFixed(4)}, ${activeLocation.lng.toFixed(4)}`;

    addLocation({
      id,
      label: savedLabel,
      lat: activeLocation.lat,
      lng: activeLocation.lng,
    });

    // Keep active location aligned with saved label so follow-up actions are consistent.
    setActiveLocation({
      label: savedLabel,
      lat: activeLocation.lat,
      lng: activeLocation.lng,
    });
  };

  const handleRemoveSelected = () => {
    if (!activeLocation) {
      return;
    }

    // Match by coordinates because activeLocation has no id — only SavedLocation does.
    const matchingSaved = savedLocations.find(
      (loc) => loc.lat === activeLocation.lat && loc.lng === activeLocation.lng,
    );

    if (matchingSaved) {
      removeLocation(matchingSaved.id);
    }

    setActiveLocation(null);
  };

  return (
    <div className="mapWrapper">
      <MapContainer center={[51.505, -0.09]} zoom={13} className="mapCanvas">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClickHandler />
        {savedLocations.map((location) => (
          <CircleMarker
            key={location.id}
            center={[location.lat, location.lng]}
            radius={8}
            eventHandlers={{
              click: () =>
                setActiveLocation({
                  label: location.label,
                  lat: location.lat,
                  lng: location.lng,
                }),
            }}
            pathOptions={{
              color: "#b91c1c",
              fillColor: "#ef4444",
              fillOpacity: 0.95,
            }}
          >
            <Popup>
              {location.label}
              <br />
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </Popup>
          </CircleMarker>
        ))}
        {activeLocation && (
          <Marker position={[activeLocation.lat, activeLocation.lng]}>
            <Popup>
              {activeLocation.label}
              <br />
              {activeLocation.lat.toFixed(4)}, {activeLocation.lng.toFixed(4)}
            </Popup>
          </Marker>
        )}
      </MapContainer>
      <button onClick={handleAddLocation} disabled={!activeLocation}>
        Add Location
      </button>
      <button onClick={handleRemoveSelected} disabled={!activeLocation}>
        Remove Selected
      </button>
    </div>
  );
}
