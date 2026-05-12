import "maplibre-gl/dist/maplibre-gl.css";
import { Map, GeolocateControl, NavigationControl } from "maplibre-gl";
import style from "./style.json";

export const map = new Map({
  container: "map",
  center: [12.307778, 63.990556],
  zoom: 4,
  style: "https://tiles.openfreemap.org/styles/liberty",
});

map.on("load", () => {
  for (const [id, source] of Object.entries(style.sources)) {
    map.addSource(id, source);
  }
  for (const layer of style.layers) {
    map.addLayer(layer);
  }

  map.addControl(
    new GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }),
    "bottom-right",
  );

  map.addControl(
    new NavigationControl({
      showZoom: true,
      showCompass: false,
    }),
    "bottom-right",
  );
});
