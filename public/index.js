"use strict";

const map = L.map("map", {
  zoomControl: false,
}).setView([63.990556, 12.307778], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

L.control.zoom({ position: "bottomright" }).addTo(map);
L.control.locate({ position: "bottomright" }).addTo(map);

const dialog = document.querySelector("dialog");
const showButton = document.querySelector("#info-bubble");
const closeButton = document.querySelector("dialog button");

dialog.showModal();
showButton.addEventListener("click", () => dialog.showModal());
closeButton.addEventListener("click", () => dialog.close());

function centerOnMarker(event) {
  map.fitBounds([event.latlng]);
}

function getIconClass(stepCount) {
  if (stepCount > 100) {
    return "extreme";
  } else if (stepCount > 50) {
    return "many";
  }
  return "few";
}

function createMarker(feature) {
  const stepCount = feature.properties.step_count;
  const title = feature.properties.name || `Trapp med ${stepCount} trinn`;

  const icon = L.divIcon({
    className: "div-icon " + getIconClass(stepCount),
    html: `<div>${stepCount}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  const firstPoint = feature.geometry.coordinates[0];

  L.marker([firstPoint[1], firstPoint[0]], { icon })
    .bindPopup(
      `
          <h1>${title}</h1>
          <p><a href="https://www.openstreetmap.org/way/${
            feature.id
          }" target="_blank">Opne på OpenStreetMap</a></p>
          ${Object.entries(feature.properties)
            .map(([key, value]) => `${key}: ${value}`)
            .join("<br />")}
          `,
    )
    .on("click", centerOnMarker)
    .addTo(map);
}

async function loadStairs() {
  const response = await fetch("/stairs.geojson");
  if (!response.ok) {
    throw new Error("Failed to load JSON file");
  }

  const featureCollection = await response.json();

  L.geoJSON(featureCollection, {
    onEachFeature: createMarker,
    style: (feature) => ({
      color: getIconClass(feature.properties.step_count),
    }),
  }).addTo(map);
}

loadStairs();
