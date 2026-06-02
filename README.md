# ♾️ Infinite Craft — Local Edition

An [Infinite Craft](https://neal.fun/infinite-craft/) clone that runs **entirely
in your browser**. A small **Gemma** language model runs client-side via
[WebLLM](https://github.com/mlc-ai/web-llm) + **WebGPU** and decides what every
combination produces — no backend, no API keys, no data leaving your machine.

![elements](https://img.shields.io/badge/start-💧🔥🌍🌬️-7c5cff)

## How it works

- The model is loaded with `@mlc-ai/web-llm` (pulled from a CDN as an ES module).
- On first load the model downloads and is **cached in the browser** via the
  Cache Storage API — future visits start instantly with no re-download.
- All inference runs **client-side on your GPU**. Nothing is sent to a server.
- When you combine two elements, this prompt is sent to Gemma:

  > You are the game engine for Infinite Craft. The player combines two
  > elements. Reply with ONLY a JSON object like `{"name": "Steam", "emoji":
  > "💨"}` … be creative, logical, and humorous when the combination calls for
  > it.

  The JSON is parsed and the new element animates onto the board and into the
  sidebar.

## Features

- 🎛️ Draggable element tiles on a canvas.
- 🤝 Drop one tile onto another to combine them (or drag from the sidebar).
- ✨ New elements animate in and are added to the sidebar collection.
- ⏳ Loading screen with a live **download progress %** while the model fetches.
- 💾 Discoveries persist to `localStorage`; the model persists in Cache Storage.
- 🧪 Starts with 4 base elements: **Water 💧, Fire 🔥, Earth 🌍, Wind 🌬️**.
- 🖥️ Picks the best available Gemma model and offers others (Gemma 2 2B/9B,
  Gemma 3 1B) in a dropdown.

## Running it

It's a single `index.html` file, but because it imports an ES module from a CDN
it must be served over HTTP (opening the file directly with `file://` won't
work). Any static server will do:

```bash
# Python
python3 -m http.server 8000

# …or Node
npx serve .
```

Then open <http://localhost:8000> in a **WebGPU-capable browser**.

### Requirements

- A Chromium-based desktop browser (Chrome / Edge 113+) or Safari Technology
  Preview, with **WebGPU** enabled and hardware acceleration on.
- A few GB of free disk for the cached model (≈1.6 GB for the default Gemma 2
  2B; the Gemma 3 1B option is smaller and faster).

If WebGPU isn't available, the app shows a friendly fallback message instead of
breaking.

## Deploying to Cloudflare

The app is a static site, deployed with **Cloudflare Workers Static Assets**
(configured in `wrangler.jsonc`). A `.assetsignore` keeps repo files like the
README and config out of what gets served — only `index.html` ships.

### Deploy via the Cloudflare dashboard (Git-connected, auto-deploy)

1. Push this repo to GitHub (already done if you're reading this there).
2. In the Cloudflare dashboard, go to **Workers & Pages → Create →
   Workers → Import a repository** and connect your GitHub account.
3. Select this repository and the `main` branch.
4. Cloudflare auto-detects `wrangler.jsonc`. Leave the **build command empty**
   and set the **deploy command** to `npx wrangler deploy`.
5. Click **Deploy**. Every push to `main` now redeploys automatically.

Your site will be live at `https://infinite-craft-local.<your-subdomain>.workers.dev`
(rename via the `name` field in `wrangler.jsonc`).

### Deploy from the CLI (optional)

```bash
npm install
npx wrangler login
npm run deploy      # wrangler deploy
```

## Tech

- Vanilla JS + HTML/CSS in a single file — no build step.
- [`@mlc-ai/web-llm`](https://www.npmjs.com/package/@mlc-ai/web-llm) for
  in-browser inference.
- Google's Gemma models, quantized for the browser by the MLC project.
