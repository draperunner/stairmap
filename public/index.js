const map = new ol.Map({
  target: "map",
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM(),
    }),
  ],
  view: new ol.View({
    center: ol.proj.fromLonLat([12.307778, 63.990556]),
    zoom: 5,
  }),
});

map.addControl(new ol.control.Attribution());
map.addControl(new ol.control.Zoom());

const geolocation = new ol.Geolocation({
  tracking: false,
  projection: map.getView().getProjection(),
});

function locateUser() {
  geolocation.setTracking(true);
  geolocation.once("change:position", () => {
    const coordinates = geolocation.getPosition();
    if (coordinates) {
      map.getView().animate({ center: coordinates, zoom: 14, duration: 500 });
    }
    geolocation.setTracking(false);
  });
}

// Simple locate button
const locateBtn = document.createElement("button");
locateBtn.textContent = "📍";
locateBtn.title = "Finn meg";
locateBtn.style.cssText =
  "position:absolute;bottom:20px;right:20px;z-index:1000;padding:8px 10px;border:none;border-radius:6px;background:#fff;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.3);";
locateBtn.addEventListener("click", locateUser);
document.body.appendChild(locateBtn);

const dialog = document.querySelector("dialog");
const showButton = document.querySelector("#info-bubble");
const closeButton = document.querySelector("dialog button");

dialog.showModal();
showButton.addEventListener("click", () => dialog.showModal());
closeButton.addEventListener("click", () => dialog.close());

function centerOnMarker(coordinates) {
  map.getView().setCenter(ol.proj.fromLonLat(coordinates));
  map.getView().setZoom(16);
}

function createMarker(feature, map, vectorSource) {
  const stepCount = parseInt(feature.properties.step_count, 10) || 0;
  const title = feature.properties.name || `Trapp med ${stepCount} trinn`;
  const firstPoint = feature.geometry.coordinates[0];
  const lonlat = [firstPoint[0], firstPoint[1]];

  const marker = new ol.Feature({
    geometry: new ol.geom.Point(ol.proj.fromLonLat(lonlat)),
    name: title,
    featureId: feature.id,
    properties: feature.properties,
    stepCount,
    lonlat,
  });

  marker.setId(feature.id);
  vectorSource.addFeature(marker);

  marker.onClick = function () {
    centerOnMarker(lonlat);
    const popupHtml = `
      <h1>${title}</h1>
      <p><a href="https://www.openstreetmap.org/way/${
        feature.id
      }" target="_blank">Opne på OpenStreetMap</a></p>
      ${Object.entries(feature.properties)
        .map(([key, value]) => `${key}: ${value}`)
        .join("<br />")}
    `;
    showPopup(ol.proj.fromLonLat(lonlat), popupHtml);
  };
}

// Popup overlay for OpenLayers
const popupContainer = document.createElement("div");
popupContainer.className = "ol-popup";
document.body.appendChild(popupContainer);
const popupOverlay = new ol.Overlay({
  element: popupContainer,
  autoPan: true,
  autoPanAnimation: { duration: 250 },
});
map.addOverlay(popupOverlay);

function showPopup(coordinate, html) {
  popupContainer.innerHTML = html;
  popupOverlay.setPosition(coordinate);
}

async function loadStairs() {
  const response = await fetch("/stairs.geojson");
  if (!response.ok) {
    throw new Error("Failed to load JSON file");
  }
  const featureCollection = await response.json();

  const vectorSource = new ol.source.Vector();

  // Separate styling: one layer for circles (all drawn), one layer for labels (decluttered)
  function circleColor(steps) {
    return steps > 100 ? "tomato" : steps > 50 ? "#ffa500" : "#ffffff";
  }

  const circleStyleCache = {};
  function circleStyle(feature) {
    const steps = feature.get("stepCount") || 0;
    if (!circleStyleCache[steps]) {
      circleStyleCache[steps] = new ol.style.Style({
        image: new ol.style.Circle({
          radius: 15,
          fill: new ol.style.Fill({ color: circleColor(steps) }),
        }),
      });
    }
    return circleStyleCache[steps];
  }

  const labelStyleCache = {};
  function labelStyle(feature) {
    const steps = feature.get("stepCount") || 0;
    if (!labelStyleCache[steps]) {
      labelStyleCache[steps] = new ol.style.Style({
        text: new ol.style.Text({
          text: String(steps),
          font: "bold 14px sans-serif",
          fill: new ol.style.Fill({ color: "#000" }),
          offsetY: 2,
        }),
      });
    }
    return labelStyleCache[steps];
  }

  const circleLayer = new ol.layer.Vector({
    source: vectorSource,
    style: circleStyle,
  });

  const labelLayer = new ol.layer.Vector({
    source: vectorSource,
    declutter: true,
    style: labelStyle,
  });

  map.addLayer(circleLayer);
  map.addLayer(labelLayer);

  featureCollection.features.forEach((feature) => {
    createMarker(feature, map, vectorSource);
  });

  // Add click handler for popups
  map.on("singleclick", function (evt) {
    let found = false;
    map.forEachFeatureAtPixel(evt.pixel, function (feature) {
      if (feature.onClick) {
        feature.onClick();
        found = true;
      }
    });
    if (!found) {
      popupOverlay.setPosition(undefined);
    }
  });
}

loadStairs();
