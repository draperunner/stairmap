import { writeFile, copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Fetches stair data from the Overpass API, maps it to
 * GeoJSON and saves it to public/stairs.geojson.
 */
async function fetchData() {
  try {
    const overpassUrl = "https://overpass-api.de/api/interpreter";

    const query = `
      [out:json];
      area["ISO3166-1:alpha2"="NO"]->.a;
      (
        way(area.a)["highway"="steps"]["step_count"]
        ["step_count"~"^[2-9][0-9]$|^[1-9][0-9]{2,}$"];
      );
      out body;
      >;
      out skel qt;
    `;

    console.log("Querying Overpass API...");

    const response = await fetch(overpassUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    console.log("Got successful response from Overpass API");

    const data = await response.json();

    const nodes = data.elements
      .filter((element) => element.type === "node")
      .reduce((acc, node) => {
        acc[node.id] = node;
        return acc;
      }, {});

    const features = data.elements
      .filter((element) => element.type === "way")
      .map((element) => ({
        id: element.id,
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: element.nodes.map((nodeId) => [
            nodes[nodeId].lon,
            nodes[nodeId].lat,
          ]),
        },
        properties: {
          ...element.tags,
          id: element.nodes[0],
        },
      }));

    const featureCollection = {
      type: "FeatureCollection",
      features,
    };

    console.log("Writing to stairs.geojson...");

    await writeFile(
      join("public", "stairs.geojson"),
      JSON.stringify(featureCollection),
    );
  } catch (error) {
    console.error(error);
  }
}

async function main() {
  await fetchData();

  const lib = join("public", "lib");
  await mkdir(lib, { recursive: true });

  await copyFile(
    join("node_modules", "leaflet", "dist", "leaflet.js"),
    join(lib, "leaflet.js"),
  );
  await copyFile(
    join("node_modules", "leaflet", "dist", "leaflet.css"),
    join(lib, "leaflet.css"),
  );
  await copyFile(
    join(
      "node_modules",
      "leaflet.locatecontrol",
      "dist",
      "L.Control.Locate.min.js",
    ),
    join(lib, "leaflet-locate.js"),
  );
  await copyFile(
    join(
      "node_modules",
      "leaflet.locatecontrol",
      "dist",
      "L.Control.Locate.min.css",
    ),
    join(lib, "leaflet-locate.css"),
  );
}

main();
