import { writeFile, copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const MAX_RETRIES = 3;

/**
 * Fetches stair data from the Overpass API, maps it to
 * GeoJSON and saves it to public/stairs.geojson.
 */
async function fetchData(retryNumber = 0) {
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
    const isRetryableError = response.status === 429 || response.status >= 500;

    if (isRetryableError && retryNumber < MAX_RETRIES) {
      const retry = retryNumber + 1;
      const sleepTimeSeconds = 2 + Math.pow(2, retry); // 4, 6, 10 seconds
      console.log(
        `Overpass API request failed with status ${response.status}. Retrying in ${sleepTimeSeconds} seconds... (retry ${retry}/${MAX_RETRIES})`,
      );

      await new Promise((resolve) =>
        setTimeout(resolve, sleepTimeSeconds * 1000),
      );
      return fetchData(retry);
    }

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
}

async function main() {
  await fetchData();

  const lib = join("public", "lib");
  await mkdir(lib, { recursive: true });
}

main();
