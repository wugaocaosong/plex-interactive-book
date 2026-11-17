import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, relative, extname, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".zip": "application/zip",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};

export function createStaticServer(
  root,
  apiTarget = process.env.PLEX_API_TARGET ?? "http://127.0.0.1:5100",
) {
  root = resolve(root);
  const target = apiTarget && apiTarget !== "off" ? new URL(apiTarget) : null;
  if (
    target &&
    (!["http:", "https:"].includes(target.protocol) ||
      target.username ||
      target.password ||
      target.pathname !== "/" ||
      target.search ||
      target.hash)
  )
    throw Error("PLEX_API_TARGET must be a fixed HTTP(S) origin, or off");
  return createServer(async (request, response) => {
    if (request.url === "/api" || request.url?.startsWith("/api/")) {
      const unavailable = () => {
        if (response.destroyed || response.writableEnded) return;
        if (!response.headersSent)
          response.writeHead(503, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          });
        response.end(
          JSON.stringify({
            code: 50301,
            message: "PLEX 在线服务不可用；本机学习可继续。",
            data: null,
          }),
        );
      };
      if (!target) {
        request.resume();
        unavailable();
        return;
      }
      if (!request.url.startsWith("/api/v1/")) {
        response.writeHead(404).end();
        return;
      }
      const headers = { ...request.headers, host: target.host };
      delete headers.connection;
      delete headers["proxy-authorization"];
      delete headers.cookie;
      const proxy = (target.protocol === "https:" ? httpsRequest : httpRequest)(
        {
          protocol: target.protocol,
          hostname: target.hostname,
          port: target.port,
          method: request.method,
          path: request.url,
          headers,
          timeout: 95000,
        },
        (upstream) => {
          response.writeHead(upstream.statusCode || 502, {
            ...upstream.headers,
            "Cache-Control": "no-store",
          });
          upstream.pipe(response);
        },
      );
      proxy.on("error", unavailable);
      proxy.on("timeout", () => proxy.destroy());
      request.on("aborted", () => proxy.destroy());
      response.on("close", () => proxy.destroy());
      request.pipe(proxy);
      return;
    }
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
    } catch {
      response.writeHead(400).end();
      return;
    }
    if (pathname.includes("\0")) {
      response.writeHead(400).end();
      return;
    }
    const requested = resolve(root, "." + pathname);
    const within = relative(root, requested);
    if (
      within === ".." ||
      within.startsWith("../") ||
      within.startsWith("..\\") ||
      isAbsolute(within)
    ) {
      response.writeHead(403).end();
      return;
    }
    const candidates = pathname.endsWith("/")
      ? [resolve(requested, "index.html")]
      : [requested, requested + ".html", resolve(requested, "index.html")];
    for (const file of candidates) {
      const info = await stat(file).catch(() => null);
      if (!info?.isFile()) continue;
      response.writeHead(200, {
        "Content-Type": mime[extname(file)] || "application/octet-stream",
        "Content-Length": info.size,
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      if (request.method === "HEAD") response.end();
      else
        createReadStream(file)
          .on("error", () => response.destroy())
          .pipe(response);
      return;
    }
    response
      .writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
      .end("Not found");
  });
}

if (
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const root = resolve(import.meta.dirname, "../web/.vitepress/dist");
  const args = process.argv.slice(2);
  const port = Number(args[0] === "--port" ? args[1] : 5190);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw Error("Port must be between 1024 and 65535");
  if (!(await stat(resolve(root, "index.html")).catch(() => null)))
    throw Error(
      "Build missing. Run npm run build, or extract the complete release ZIP.",
    );
  const server = createStaticServer(root);
  server.on("error", (error) => {
    console.error(
      error.code === "EADDRINUSE"
        ? `Port ${port} is in use. Try: node scripts/serve-dist.mjs --port ${port + 1}`
        : error.message,
    );
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () =>
    console.log(
      `PLEX preview: http://127.0.0.1:${port}/\nPress Ctrl+C to stop. No dependency installation required.`,
    ),
  );
}
