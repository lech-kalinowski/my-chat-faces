import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png" };
createServer((request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
  const file = resolve(root, "." + (path === "/" ? "/tests/browser.html" : path));
  if (!file.startsWith(root) || file.includes("/.git/")) {
    response.writeHead(403).end();
    return;
  }
  try {
    const body = readFileSync(file);
    response.writeHead(200, { "Content-Type": types[extname(file)] || "text/plain", "Cache-Control": "no-store" });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(8787, "127.0.0.1", () => console.log("Browser regression suite: http://127.0.0.1:8787"));
