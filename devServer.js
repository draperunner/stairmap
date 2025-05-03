import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = 3000;
const PUBLIC_DIR = join(__dirname, "public");

const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".geojson": "application/json+geojson",
  ".svg": "image/svg+xml",
};

async function parseHeaders() {
  const headersFile = join(PUBLIC_DIR, "_headers");
  const headersContent = await readFile(headersFile, "utf-8");

  const lines = headersContent.trim().normalize().split("\n").slice(1);

  const headers = lines.map((line) => {
    const colonIndex = line.indexOf(":");
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    return [key, value];
  });

  return Object.fromEntries(headers);
}

const server = createServer(async (req, res) => {
  let filePath = join(PUBLIC_DIR, req.url === "/" ? "index.html" : req.url);
  const ext = extname(filePath);

  try {
    const headers = await parseHeaders();
    const content = await readFile(filePath);

    res.writeHead(200, {
      ...headers,
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
    });
    res.end(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
    } else {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("500 Internal Server Error");
    }
  }
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
