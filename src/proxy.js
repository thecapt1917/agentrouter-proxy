/**
 * agentrouter-proxy — core proxy logic
 * Injects Codex headers so opencode can talk to agentrouter.org
 */

import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

const DEFAULT_TARGET = "https://agentrouter.org";
const DEFAULT_PORT = 8318;

const DEFAULT_CODEX_HEADERS = {
    Originator: "codex_cli_rs",
    "User-Agent":
        "codex_cli_rs/0.101.0 (Mac OS 26.0.1; arm64) Apple_Terminal/464",
    Version: "0.101.0",
};

const SKIP_HEADERS = new Set([
    "host",
    "transfer-encoding",
    "connection",
    "content-length", // let Node recalculate
]);

/**
 * Create and start the proxy server.
 *
 * @param {object} opts
 * @param {number}  [opts.port]         - Local port to listen on (default 8318)
 * @param {string}  [opts.target]       - Upstream URL (default https://agentrouter.org)
 * @param {object}  [opts.extraHeaders] - Additional headers to inject (merged with Codex defaults)
 * @param {boolean} [opts.silent]       - Suppress log output
 * @returns {http.Server}
 */
export function createProxy(opts = {}) {
    const port = opts.port ?? DEFAULT_PORT;
    const target = opts.target ?? DEFAULT_TARGET;
    const codexHeaders = {
        ...DEFAULT_CODEX_HEADERS,
        ...(opts.extraHeaders ?? {}),
    };
    const silent = opts.silent ?? false;

    const targetUrl = new URL(target);
    const upstreamLib = targetUrl.protocol === "https:" ? https : http;

    const log = (...args) => {
        if (!silent) console.log(...args);
    };

    const server = http.createServer((req, res) => {
        // ── Build outgoing headers ──────────────────────────────────────────────
        const headers = {};
        for (const [k, v] of Object.entries(req.headers)) {
            if (!SKIP_HEADERS.has(k.toLowerCase())) headers[k] = v;
        }
        Object.assign(headers, codexHeaders);

        const upstreamOptions = {
            hostname: targetUrl.hostname,
            port:
                targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
            path: req.url,
            method: req.method,
            headers,
        };

        // ── Fire upstream request ───────────────────────────────────────────────
        const proxyReq = upstreamLib.request(upstreamOptions, (proxyRes) => {
            const outHeaders = {};
            for (const [k, v] of Object.entries(proxyRes.headers)) {
                if (!SKIP_HEADERS.has(k.toLowerCase())) outHeaders[k] = v;
            }

            res.writeHead(proxyRes.statusCode, outHeaders);
            log(`  ${req.method} ${req.url} → ${proxyRes.statusCode}`);

            // Stream (SSE-compatible)
            proxyRes.on("data", (chunk) => {
                res.write(chunk);
            });
            proxyRes.on("end", () => res.end());
        });

        proxyReq.on("error", (err) => {
            log(`  ERROR ${req.method} ${req.url} — ${err.message}`);
            if (!res.headersSent) {
                res.writeHead(502, { "Content-Type": "application/json" });
            }
            res.end(
                JSON.stringify({ error: "Bad Gateway", message: err.message }),
            );
        });

        // Pipe request body
        req.pipe(proxyReq);
    });

    server.listen(port, "127.0.0.1", () => {
        log(`\n  agentrouter-proxy`);
        log(
            `  Created by stpndev (\u001B]8;;https://github.com/thecapt1917\u0007github.com/thecapt1917\u001B]8;;\u0007)`,
        );
        log(`  ─────────────────────────────────────`);
        log(`  Listening  →  http://localhost:${port}/v1`);
        log(`  Upstream   →  ${target}`);
        log(`  Press Ctrl+C to stop\n`);
    });

    return server;
}

export { DEFAULT_PORT, DEFAULT_TARGET, DEFAULT_CODEX_HEADERS };
