import { createServer } from "node:http";
import { mkdir, stat, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const OVERRIDES_PATH = path.join(DATA_DIR, "guide-overrides.json");
const PORT = Number.parseInt(process.env.PORT ?? "4173", 10);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/api/overrides" && req.method === "GET") {
      await sendJson(res, await readOverrides());
      return;
    }

    if (pathname === "/api/overrides" && req.method === "POST") {
      const body = await readRequestJson(req);
      const saved = await saveOverride(body);
      await sendJson(res, saved);
      return;
    }

    const baseDir = pathname.startsWith("/data/") ? DATA_DIR : PUBLIC_DIR;
    const relative = pathname.startsWith("/data/") ? pathname.replace(/^\/data\//, "") : pathname.replace(/^\//, "") || "index.html";
    const filePath = path.resolve(baseDir, relative);

    if (!filePath.startsWith(baseDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const fileStat = await stat(filePath).catch(() => null);
    const finalPath = fileStat?.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const body = await readFile(finalPath);
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(finalPath)] ?? "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(body);
  } catch (error) {
    const status = error.status ?? 404;
    res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(status === 404 ? "Not found" : error.message);
  }
});

server.listen(PORT, () => {
  console.log(`CityRP Legal Reference running at http://localhost:${PORT}`);
});

async function readOverrides() {
  try {
    return JSON.parse(await readFile(OVERRIDES_PATH, "utf8"));
  } catch {
    return { updatedAt: null, documents: {} };
  }
}

async function saveOverride(body) {
  if (!body?.documentId || typeof body.documentId !== "string" || !body.patch || typeof body.patch !== "object") {
    const error = new Error("Invalid override payload");
    error.status = 400;
    throw error;
  }

  const overrides = await readOverrides();
  overrides.documents[body.documentId] = deepMerge(overrides.documents[body.documentId] ?? {}, body.patch);
  overrides.updatedAt = new Date().toISOString();
  overrides.documents[body.documentId].updatedAt = overrides.updatedAt;
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(OVERRIDES_PATH, `${JSON.stringify(overrides, null, 2)}\n`, "utf8");
  return overrides;
}

async function readRequestJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw Object.assign(new Error("Request too large"), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function sendJson(res, value) {
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(value, null, 2));
}

function deepMerge(base, patch) {
  const result = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === "object" && !Array.isArray(value) && result[key] && typeof result[key] === "object" && !Array.isArray(result[key])) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
