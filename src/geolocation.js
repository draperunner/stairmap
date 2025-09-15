import { Geolocation, Feature } from "ol";
import { Vector as VectorLayer } from "ol/layer";
import { Point } from "ol/geom";
import { Vector as VectorSource } from "ol/source";
import { Circle, Fill, Style, Stroke } from "ol/style";
import { map } from "./map.js";

const geolocation = new Geolocation({
  tracking: false,
  projection: map.getView().getProjection(),
});

// User location (pulsating) marker setup
let userLocationFeature = null;
let userLocationLayer = null;
let userLocationSource = null;
let userPulseStart = null;
let lastAccuracy = null; // meters

function ensureUserLocationLayer() {
  if (userLocationLayer) {
    return;
  }

  userLocationSource = new VectorSource();
  userLocationLayer = new VectorLayer({
    source: userLocationSource,
    style: (_feature, resolution) => {
      if (!userPulseStart) {
        return null;
      }

      const elapsed = Date.now() - userPulseStart;
      const cycle = 2000; // ms for one pulse
      const t = (elapsed % cycle) / cycle; // 0..1
      const baseRadius = 8;
      // Stroke width pulses between 2 and 4
      const strokeWidth = 2 + 2 * Math.abs(Math.sin(t * Math.PI));

      // Convert accuracy meters to pixel radius (rough: meters / (resolution) )
      let accuracyRadiusPx = null;
      if (typeof lastAccuracy === "number" && resolution) {
        // resolution is map units per pixel (in WebMercator ~ meters near equator)
        accuracyRadiusPx = Math.min(
          300,
          Math.max(15, lastAccuracy / resolution),
        );
      }

      const styles = [
        new Style({
          image: new Circle({
            radius: accuracyRadiusPx,
            fill: new Fill({ color: "rgba(43,114,255,0.15)" }),
          }),
        }),
        new Style({
          image: new Circle({
            radius: baseRadius,
            fill: new Fill({ color: "#2b72ff" }),
            stroke: new Stroke({ color: "#fff", width: strokeWidth }),
          }),
        }),
      ];

      if (accuracyRadiusPx) {
        styles.unshift(
          new Style({
            image: new Circle({
              radius: accuracyRadiusPx,
              fill: new Fill({ color: "rgba(43,114,255,0.15)" }),
            }),
          }),
        );
      }

      return styles;
    },
    zIndex: 5000,
  });

  map.addLayer(userLocationLayer);

  // Animation loop to refresh pulsating style
  (function animateUserPulse() {
    if (userLocationLayer) {
      userLocationLayer.changed();
      requestAnimationFrame(animateUserPulse);
    }
  })();
}

export function locateUser() {
  // First click: start continuous tracking
  if (!geolocation.getTracking()) {
    geolocation.setTracking(true);

    geolocation.on("change:position", () => {
      const coordinates = geolocation.getPosition();

      if (!coordinates) {
        return;
      }

      ensureUserLocationLayer();

      if (!userLocationFeature) {
        userLocationFeature = new Feature({
          geometry: new Point(coordinates),
          name: "Din posisjon",
        });
        userLocationSource.addFeature(userLocationFeature);
        userPulseStart = Date.now();
        map.getView().animate({ center: coordinates, zoom: 14, duration: 500 });
      } else {
        userLocationFeature.getGeometry().setCoordinates(coordinates);
      }
    });

    geolocation.on("change:accuracy", () => {
      const acc = geolocation.getAccuracy();
      if (typeof acc === "number") {
        lastAccuracy = acc;
      }
    });
  } else {
    // If already tracking, recenter to current position
    const coordinates = geolocation.getPosition();
    if (coordinates) {
      map.getView().animate({ center: coordinates, duration: 300 });
    }
  }
}
