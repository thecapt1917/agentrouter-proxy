#!/usr/bin/env node
/**
 * agentrouter-proxy CLI
 * Usage: agentrouter-proxy [options]
 */

import { createProxy, DEFAULT_PORT, DEFAULT_TARGET } from "../src/proxy.js";

// ── Simple arg parser ────────────────────────────────────────────────────────
async function parseArgs(argv) {
    const args = argv.slice(2);
    const opts = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === "-h" || arg === "--help") {
            printHelp();
            process.exit(0);
        }

        if (arg === "-v" || arg === "--version") {
            const { readFileSync } = await import("node:fs");
            const pkg = JSON.parse(
                readFileSync(
                    new URL("../package.json", import.meta.url),
                    "utf8",
                ),
            );
            console.log(pkg.version);
            process.exit(0);
        }

        if ((arg === "-p" || arg === "--port") && args[i + 1]) {
            opts.port = parseInt(args[++i], 10);
            if (isNaN(opts.port) || opts.port < 1 || opts.port > 65535) {
                fatal("Invalid port number.");
            }
            continue;
        }

        if ((arg === "-t" || arg === "--target") && args[i + 1]) {
            opts.target = args[++i];
            try {
                new URL(opts.target);
            } catch {
                fatal(`Invalid target URL: ${opts.target}`);
            }
            continue;
        }

        if ((arg === "-H" || arg === "--header") && args[i + 1]) {
            const raw = args[++i];
            const colon = raw.indexOf(":");
            if (colon === -1)
                fatal(`Bad header format (expected "Key: Value"): ${raw}`);
            opts.extraHeaders ??= {};
            opts.extraHeaders[raw.slice(0, colon).trim()] = raw
                .slice(colon + 1)
                .trim();
            continue;
        }

        if (arg === "--silent") {
            opts.silent = true;
            continue;
        }

        fatal(`Unknown option: ${arg}`);
    }

    return opts;
}

function printHelp() {
    console.log(`
  AgentRouter Proxy
  ——— A lightweight reverse proxy that bridges any OpenAI-compatible AI agent to agentrouter.org
  ——— Created by stpndev (github.com/thecapt1917)

  Usage:
    agentrouter-proxy [options]

  Options:
    -p, --port <number>      Local port to listen on  (default: ${DEFAULT_PORT})
    -t, --target <url>       Upstream URL             (default: ${DEFAULT_TARGET})
    -H, --header <Key:Value> Inject an extra header   (repeatable)
        --silent             Suppress log output
    -v, --version            Print version and exit
    -h, --help               Show this help

  Examples:
    agentrouter-proxy
    agentrouter-proxy --port 9000
    agentrouter-proxy --target https://agentrouter.org --port 8318
    agentrouter-proxy -H "X-My-Key: abc123"
`);
}

function fatal(msg) {
    console.error(`\n  Error: ${msg}\n  Run with --help for usage.\n`);
    process.exit(1);
}

// ── Main ─────────────────────────────────────────────────────────────────────
const opts = await parseArgs(process.argv);
const server = createProxy(opts);

// Graceful shutdown
function shutdown(signal) {
    console.log(`\n  ${signal} received — shutting down…`);
    server.close(() => {
        console.log("  Proxy stopped.\n");
        process.exit(0);
    });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
