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
      [out:json][timeout:300];
      area["ISO3166-1:alpha2"="NO"]->.a;
      (
        way(area.a)["highway"="steps"];
      );
      out body;
      >;
      out skel qt;
    `;

    console.log("Querying Overpass API...");
    const start = Date.now();

    const response = await fetch(overpassUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    console.log(
      "Got successful response from Overpass API after",
      (Date.now() - start) / 1000,
      "seconds",
    );

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
          id: element.nodes[0],
          name: element.tags.name,
          step_count: element.tags.step_count
            ? Number(element.tags.step_count)
            : undefined,
        },
      }));

    console.log("Found", features.length, "features");

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
    join("node_modules", "ol", "dist", "ol.js"),
    join(lib, "ol.js"),
  );

  await copyFile(join("node_modules", "ol", "ol.css"), join(lib, "ol.css"));
}

main();
