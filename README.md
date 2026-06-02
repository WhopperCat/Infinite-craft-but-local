# ♾️ Infinite Craft — Local Edition

An [Infinite Craft](https://neal.fun/infinite-craft/) clone where every
combination is decided by **Gemma 4** running **locally on your own machine**
through [Ollama](https://ollama.com) — no cloud, no API keys, nothing leaves
your computer.

![elements](https://img.shields.io/badge/start-💧🔥🌍🌬️-7c5cff)

## How it works

- The page is plain HTML/JS (no build step). It calls your local Ollama server
  at `http://localhost:11434/api/chat`.
- When you combine two elements, it sends this prompt to Gemma 4:

  > You are the game engine for Infinite Craft. The player combines two
  > elements. Reply with ONLY a JSON object like `{"name": "Steam", "emoji":
  > "💨"}` … be creative, logical, and humorous when the combination calls for
  > it.

- It uses Ollama's **structured-output mode** (a JSON schema) to guarantee a
  clean `{"name", "emoji"}` object, then animates the new element onto the board
  and into the sidebar.

## Prerequisites

1. **Install Ollama** → <https://ollama.com>
2. **Pull Gemma 4:**
   ```bash
   ollama pull gemma4
   ```
3. **Run Ollama so the browser is allowed to call it** (CORS). Ollama rejects
   web-origin requests by default, so start it with `OLLAMA_ORIGINS`:
   ```bash
   OLLAMA_ORIGINS=* ollama serve
   ```
   (You can scope it instead of `*`, e.g.
   `OLLAMA_ORIGINS="https://your-site.workers.dev"`.)

> If the page is served over **https** (e.g. the deployed site) and Ollama is on
> `http://localhost`, the browser must allow that loopback call. Chromium-based
> browsers (Chrome/Edge) permit `https → http://localhost`, so it works there.

## Running it

It's a single `index.html` — open it however you like:

```bash
# any static server, e.g.
python3 -m http.server 8000
# …or just open index.html directly (file://) — it works too,
# since it only talks to your local Ollama.
```

On first load the app shows a connect screen with the **Ollama URL** and
**model tag** (defaults `http://localhost:11434` and `gemma4`), both editable
and saved to `localStorage`. It auto-connects; if Ollama isn't reachable it
shows exactly what to run. You can reopen it any time via **Engine settings**.

## Features

- 🎛️ Draggable element tiles on a canvas (mouse + touch).
- 🤝 Drop one tile onto another to combine them (or drag from the sidebar).
- ✨ New elements animate in and join a searchable sidebar collection.
- 🤖 Combinations decided by **Gemma 4** via Ollama, with guaranteed-JSON output.
- 💾 Discoveries persist to `localStorage`; engine settings persist too.
- 🧪 Starts with 4 base elements: **Water 💧, Fire 🔥, Earth 🌍, Wind 🌬️**.

## Deploying to Cloudflare (optional)

The app is a static site, deployed with **Cloudflare Workers Static Assets**
(`wrangler.jsonc`). A `.assetsignore` keeps repo files out of what gets served.

> Note: a deployed copy still talks to **each visitor's own** local Ollama, so
> it only works for people who run Ollama locally (with `OLLAMA_ORIGINS` set).
> For solo/local use, just opening `index.html` is enough.

**Dashboard (Git-connected, auto-deploy):** Cloudflare → **Workers & Pages →
Create → Workers → Import a repository**, pick this repo + `main`. Leave the
build command empty, set the deploy command to `npx wrangler deploy`.

**CLI:**
```bash
npm install
npx wrangler login
npm run deploy
```

## Why not WebLLM / in-browser Gemma?

An earlier version ran Gemma in-browser via WebLLM + WebGPU. That works, but
WebLLM can only run models compiled to its MLC/WebGPU format — and **Gemma 4 has
no such build yet** (WebLLM tops out at Gemma 3 1B). Ollama runs the real Gemma 4
locally, so this version uses that instead.

## Tech

- Vanilla JS + HTML/CSS in a single file — no build step.
- [Ollama](https://ollama.com) `/api/chat` with structured (JSON-schema) output.
- Google's **Gemma 4** open model (Apache-2.0).
