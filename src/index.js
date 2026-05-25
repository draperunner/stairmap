import { Popup, LngLatBounds } from "maplibre-gl";
import "./index.css";
import { map } from "./map.js";

const infoDialog = document.getElementById("info-dialog");
const infoCloseButton = infoDialog.querySelector("button");

if (!localStorage.getItem("seenInfoBubble")) {
  infoDialog.showModal();
  localStorage.setItem("seenInfoBubble", "true");
}
infoCloseButton.addEventListener("click", () => infoDialog.close());

const settingsDialog = document.getElementById("settings-dialog");
const settingsCloseButton = settingsDialog.querySelector("button");
settingsCloseButton.addEventListener("click", () => settingsDialog.close());

const KNOWN_LAYERS = ["known-steps", "known-circles", "known-count"];
const UNKNOWN_LAYERS = ["unknown-steps", "unknown-circles", "unknown-count"];

const toggle = document.getElementById("toggle-unknown");
const toggleLabel = document.getElementById("toggle-unknown-label");

fetch("/counts.json")
  .then((r) => r.json())
  .then(({ unknown }) => {
    toggleLabel.textContent = `Vis trapper utan kjent antal trinn (${unknown})`;
  });

map.on("load", () => {
  function setLayersVisibility(layers, visible) {
    const value = visible ? "visible" : "none";
    for (const id of layers) {
      map.setLayoutProperty(id, "visibility", value);
    }
  }

  let selected = null; // { wayId, pointSourceId } | null

  function clearSelection() {
    if (!selected) return;
    map.removeFeatureState({ source: "stairs", id: selected.wayId });
    map.removeFeatureState({
      source: selected.pointSourceId,
      id: selected.wayId,
    });
    selected = null;
  }

  function selectFeature(wayId, pointSourceId) {
    if (selected && selected.wayId === wayId) return;
    clearSelection();
    selected = { wayId, pointSourceId };
    map.setFeatureState({ source: "stairs", id: wayId }, { selected: true });
    map.setFeatureState(
      { source: pointSourceId, id: wayId },
      { selected: true },
    );
  }

  toggle.checked = localStorage.getItem("showUnknown") === "true";

  function applyToggle() {
    localStorage.setItem("showUnknown", `${toggle.checked}`);
    setLayersVisibility(KNOWN_LAYERS, !toggle.checked);
    setLayersVisibility(UNKNOWN_LAYERS, toggle.checked);
    clearSelection();
    popup.remove();
  }

  const popup = new Popup({
    closeButton: false,
    closeOnClick: true,
    anchor: "bottom",
    offset: [0, -16],
  });
  popup.on("close", clearSelection);

  toggle.addEventListener("change", applyToggle);
  applyToggle();

  function buildPopupHtml(wayId, properties) {
    const stepCount = properties.step_count;
    const title =
      properties.name || `Trapp med ${stepCount ?? "ukjent antal"} trinn`;
    const propsList = Object.entries(properties)
      .map(([key, value]) => `${key}: ${value}`)
      .join("<br />");
    return `
      <h1>${title}</h1>
      <p><a href="https://www.openstreetmap.org/edit?way=${wayId}" target="_blank">Endre på OpenStreetMap</a></p>
      ${propsList}
    `;
  }

  function showFeaturePopup(lngLat, wayId, properties) {
    popup
      .setLngLat(lngLat)
      .setHTML(buildPopupHtml(wayId, properties))
      .addTo(map);
  }

  function focusOnStair(wayId, fallbackCenter) {
    const lines = map.querySourceFeatures("stairs", {
      filter: ["==", ["id"], wayId],
    });
    const coords = lines[0]?.geometry.coordinates;
    if (coords && coords.length > 0) {
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new LngLatBounds(coords[0], coords[0]),
      );
      map.fitBounds(bounds, {
        padding: { top: 80, bottom: 200, left: 80, right: 80 },
        maxZoom: 19,
      });
    } else {
      map.easeTo({
        center: fallbackCenter,
        zoom: Math.max(map.getZoom(), 16),
      });
    }
  }

  for (const [circleLayer, sourceId] of [
    ["known-circles", "known-points"],
    ["unknown-circles", "unknown-points"],
  ]) {
    map.on("click", circleLayer, async (e) => {
      const feature = e.features[0];
      const clusterId = feature.properties.cluster_id;
      if (clusterId != null) {
        const source = map.getSource(sourceId);
        const zoom = await source.getClusterExpansionZoom(clusterId);
        map.easeTo({ center: feature.geometry.coordinates, zoom });
        return;
      }
      selectFeature(feature.id, sourceId);
      focusOnStair(feature.id, feature.geometry.coordinates);
      showFeaturePopup(
        feature.geometry.coordinates,
        feature.id,
        feature.properties,
      );
    });
  }

  for (const [lineLayer, sourceId] of [
    ["known-steps", "known-points"],
    ["unknown-steps", "unknown-points"],
  ]) {
    map.on("click", lineLayer, (e) => {
      const feature = e.features[0];
      selectFeature(feature.id, sourceId);
      showFeaturePopup(e.lngLat, feature.id, feature.properties);
    });
  }

  for (const layerId of [
    "known-circles",
    "unknown-circles",
    "known-steps",
    "unknown-steps",
  ]) {
    map.on("mouseenter", layerId, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", layerId, () => {
      map.getCanvas().style.cursor = "";
    });
  }
});
