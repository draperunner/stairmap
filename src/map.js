import "maplibre-gl/dist/maplibre-gl.css";
import { Map, GeolocateControl, NavigationControl } from "maplibre-gl";
import style from "./style.json";

class SettingsControl {
  constructor(onClick) {
    this.onClick = onClick;
  }

  onAdd() {
    this.container = document.createElement("div");
    this.container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    const button = document.createElement("button");
    button.type = "button";
    button.title = "Innstillingar";
    button.setAttribute("aria-label", "Innstillingar");
    button.className = "settings-button";
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    `;
    button.addEventListener("click", this.onClick);

    this.container.appendChild(button);
    return this.container;
  }

  onRemove() {
    this.container.parentNode?.removeChild(this.container);
  }
}

class InfoControl {
  constructor(onClick) {
    this.onClick = onClick;
  }

  onAdd() {
    this.container = document.createElement("div");
    this.container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    const button = document.createElement("button");
    button.type = "button";
    button.title = "Info";
    button.setAttribute("aria-label", "Info");
    button.className = "info-button";
    button.innerHTML = "?";
    button.addEventListener("click", this.onClick);

    this.container.appendChild(button);
    return this.container;
  }

  onRemove() {
    this.container.parentNode?.removeChild(this.container);
  }
}

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

  map.addControl(
    new InfoControl(() => document.getElementById("info-dialog").showModal()),
    "bottom-right",
  );

  map.addControl(
    new SettingsControl(() =>
      document.getElementById("settings-dialog").showModal(),
    ),
    "bottom-right",
  );
});
