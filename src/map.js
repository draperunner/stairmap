import { Map, View } from "ol";
import { Attribution, Zoom } from "ol/control";
import { Tile } from "ol/layer";
import { fromLonLat } from "ol/proj";
import { OSM } from "ol/source";

// Shared bottom-right control container
export const controlsContainer = document.createElement("div");

controlsContainer.className = "map-controls-bottom-right";
document.getElementById("map").appendChild(controlsContainer);

export const map = new Map({
  target: "map",
  layers: [
    new Tile({
      source: new OSM(),
    }),
  ],
  view: new View({
    center: fromLonLat([12.307778, 63.990556]),
    zoom: 5,
  }),
  controls: [new Attribution(), new Zoom({ target: controlsContainer })],
});
