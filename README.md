# agentrouter-proxy

A lightweight reverse proxy that bridges any **OpenAI-compatible AI agent** to [agentrouter.org](https://agentrouter.org) — including opencode, Cursor, Continue, and others.

## Installation

```bash
# Install globally (recommended)
npm install -g agentrouter-proxy

# Or run without installing
npx agentrouter-proxy
```

## Usage

```bash
# Start with defaults (port 8318)
agentrouter-proxy

# Custom port
agentrouter-proxy --port 9000

# Add extra headers
agentrouter-proxy -H "X-Custom-Key: value"

# Suppress log output
agentrouter-proxy --silent
```

### Options

| Flag | Alias | Default | Description |
|------|-------|---------|-------------|
| `--port` | `-p` | `8318` | Local port to listen on |
| `--target` | `-t` | `https://agentrouter.org` | Upstream URL |
| `--header` | `-H` | — | Extra header to inject (repeatable) |
| `--silent` | | `false` | Suppress all log output |
| `--version` | `-v` | | Print version and exit |
| `--help` | `-h` | | Show help |

---

## Integrating with opencode

Start the proxy first, then point opencode to it as a custom provider.

### Desktop

Go to **Settings → Providers → Custom Providers** and add a new provider with:

- **Base URL** — `http://localhost:8318/v1`
- **Model** — the model ID you want to use (e.g. `your-model-id`)
- **API Key** — your AgentRouter API key

Save and restart opencode, then use `/models` to switch to your AgentRouter model.

### CLI

**Step 1 — Add your API key**

Edit `~/.local/share/opencode/auth.json` and add:

```json
{
  "agentrouter": {
    "type": "api",
    "key": "sk-your-agentrouter-key"
  }
}
```

**Step 2 — Add the provider to your config**

Open or create `~/.config/opencode/opencode.json` and add:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "agentrouter": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "AgentRouter",
      "options": {
        "baseURL": "http://localhost:8318/v1"
      },
      "models": {
        "your-model-id": {
          "name": "Your Model"
        }
      }
    }
  }
}
```

Restart opencode and use `/models` to switch to your AgentRouter model.

> **Note:** Make sure `agentrouter-proxy` is running before launching opencode.

---

## Requirements

- Node.js ≥ 18

## License

MIT

---

## Other OpenAI-compatible agents

The proxy exposes a standard OpenAI-compatible interface at `http://localhost:8318/v1`, so it works with any agent or tool that supports a custom base URL — not just opencode. Examples:

| Agent / Tool | Where to set the base URL |
|---|---|
| **Cursor** | Settings → Models → OpenAI Base URL |
| **Continue** | `config.json` → `apiBase` under your model |
| **Aider** | `--openai-api-base` flag or `OPENAI_API_BASE` env var |
| **Open WebUI** | Admin → Connections → OpenAI API → API Base URL |
| **LM Studio** | Anywhere that accepts a custom OpenAI endpoint |

Just point the base URL to `http://localhost:8318/v1` and use your AgentRouter API key as the API key.
