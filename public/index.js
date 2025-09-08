// Shared bottom-right control container
const controlsContainer = document.createElement("div");
controlsContainer.className = "map-controls-bottom-right";
document.getElementById("map").appendChild(controlsContainer);

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
  controls: [
    new ol.control.Attribution(),
    new ol.control.Zoom({ target: controlsContainer }),
  ],
});

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
locateBtn.className = "locate-btn";
locateBtn.addEventListener("click", locateUser);
controlsContainer.appendChild(locateBtn);

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

function createMarker(feature, source) {
  const stepCount = feature.properties.step_count;
  const title =
    feature.properties.name || `Trapp med ${stepCount ?? "ukjent antal"} trinn`;
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
  source.addFeature(marker);

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
  positioning: "bottom-center",
  offset: [0, -20],
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

  const knownStepsSource = new ol.source.Vector();
  const unknownStepsSource = new ol.source.Vector();

  const clusterSource = new ol.source.Cluster({
    distance: 32,
    minDistance: 32,
    source: knownStepsSource,
  });

  // Separate styling: one layer for circles (all drawn), one layer for labels (decluttered)
  function circleColor(steps) {
    if (steps === undefined) return "#55f";
    if (steps > 100) return "tomato";
    if (steps > 50) return "#ffa500";
    return "#fff";
  }

  const circleStyleCache = {};

  function circleStyle(feature) {
    const steps = feature.get("stepCount");
    if (!circleStyleCache[steps]) {
      circleStyleCache[steps] = new ol.style.Style({
        image: new ol.style.Circle({
          radius: 15,
          fill: new ol.style.Fill({ color: circleColor(steps) }),
        }),
        text: new ol.style.Text({
          text: String(steps ?? "?"),
          font: "bold 14px sans-serif",
          fill: new ol.style.Fill({
            color: steps !== undefined ? "#000" : "#fff",
          }),
          offsetY: 2,
        }),
      });
    }
    return circleStyleCache[steps];
  }

  const clusterStyleCache = {};

  function clusterStyle(feature) {
    const features = feature.get("features");

    const totalStepCount = features.reduce((sum, f) => {
      const steps = f.get("stepCount");
      return sum + (typeof steps === "number" ? steps : 0);
    }, 0);

    if (!totalStepCount || feature.get("hiddenByUnknownFilter")) {
      return null;
    }

    if (!clusterStyleCache[totalStepCount]) {
      clusterStyleCache[totalStepCount] = new ol.style.Style({
        image: new ol.style.Circle({
          radius: 15,
          fill: new ol.style.Fill({ color: circleColor(totalStepCount) }),
        }),
        text: new ol.style.Text({
          text: `${totalStepCount ?? "?"}`,
          font: "bold 14px sans-serif",
          fill: new ol.style.Fill({ color: "#000" }),
          offsetY: 2,
        }),
      });
    }

    return clusterStyleCache[totalStepCount];
  }

  const clusterLayer = new ol.layer.Vector({
    source: clusterSource,
    style: clusterStyle,
  });

  const unknownStepsLayer = new ol.layer.Vector({
    source: unknownStepsSource,
    declutter: true,
    style: circleStyle,
  });

  map.addLayer(clusterLayer);

  let stairsWithUnknownCount = 0;

  featureCollection.features.forEach((feature) => {
    if (feature.properties.step_count === undefined) {
      stairsWithUnknownCount += 1;
      createMarker(feature, unknownStepsSource);
    } else {
      createMarker(feature, knownStepsSource);
    }
  });

  const unknownCountElement = document.getElementById("toggle-unknown-label");
  unknownCountElement.textContent = `Vis trapper utan kjent antal trinn (${stairsWithUnknownCount})`;

  const toggle = document.getElementById("toggle-unknown");
  function applyUnknownFilter() {
    if (toggle.checked) {
      map.addLayer(unknownStepsLayer);
      map.removeLayer(clusterLayer);
    } else {
      map.removeLayer(unknownStepsLayer);
      map.addLayer(clusterLayer);
    }
  }
  toggle.addEventListener("change", applyUnknownFilter);

  // Add click handler for popups
  map.on("singleclick", function (evt) {
    let handled = false;
    map.forEachFeatureAtPixel(evt.pixel, function (feature) {
      // If this is a cluster feature, unwrap it
      const clustered = feature.get("features");
      if (Array.isArray(clustered)) {
        if (clustered.length === 1) {
          const original = clustered[0];
          if (original.onClick) {
            original.onClick();
            handled = true;
          }
        } else if (clustered.length > 1) {
          map.getView().animate({
            center: evt.coordinate,
            zoom: map.getView().getZoom() + 2,
            duration: 250,
          });
          handled = true;
        }
        return;
      }

      if (feature.onClick) {
        feature.onClick();
        handled = true;
      }
    });

    if (!handled) {
      popupOverlay.setPosition(undefined);
    }
  });

  // Pointer cursor feedback
  map.on("pointermove", (evt) => {
    const hit = map.hasFeatureAtPixel(evt.pixel);
    map.getTargetElement().style.cursor = hit ? "pointer" : "";
  });
}

loadStairs();
