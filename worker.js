// Cloudflare Worker for Infinite Craft — Local Edition.
//
// It does two jobs:
//   1. Serves the static app (index.html) via the ASSETS binding.
//   2. Proxies the WebLLM model files through this same origin, so the browser
//      never has to reach huggingface.co or raw.githubusercontent.com directly.
//      That avoids the common "Failed to fetch" caused by networks, firewalls,
//      ad/privacy blockers, or browser extensions blocking those third-party
//      domains, and removes all cross-origin/CORS concerns (it's now same-origin).
//
// Routing: requests that match a static asset are served by the assets binding;
// anything under /_model/* is handled here as a proxy.

const UPSTREAMS = {
  "/_model/hf/": "https://huggingface.co/",
  "/_model/gh/": "https://raw.githubusercontent.com/",
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Health check the client probes to decide whether to use the proxy.
    if (path === "/_model/ping") {
      return new Response("infinite-craft-proxy", {
        headers: { "content-type": "text/plain", "cache-control": "no-store" },
      });
    }

    for (const [prefix, upstream] of Object.entries(UPSTREAMS)) {
      if (path.startsWith(prefix)) {
        const target = upstream + path.slice(prefix.length) + url.search;
        return handleProxy(request, ctx, target);
      }
    }

    // Not a proxy route → serve the static site.
    return env.ASSETS.fetch(request);
  },
};

async function handleProxy(request, ctx, target) {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const range = request.headers.get("range");
  const cache = caches.default;
  const cacheKey = new Request(target, { method: "GET" });

  // Serve full-file responses from the edge cache when possible.
  if (!range) {
    const hit = await cache.match(cacheKey);
    if (hit) return withCors(hit);
  }

  // Follow HF/GitHub redirects (HF resolve URLs 30x to a CDN) on the edge so
  // the browser only ever sees our origin.
  const upstream = await fetch(target, {
    method: "GET",
    headers: range ? { range } : {},
    redirect: "follow",
  });

  const headers = new Headers(upstream.headers);
  headers.delete("set-cookie");
  for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);

  // Ensure the WASM library is served with the right MIME type so the browser
  // can use WebAssembly.instantiateStreaming on it.
  if (/\.wasm($|\?)/.test(target)) headers.set("content-type", "application/wasm");

  // Model files are immutable (content-addressed); cache them aggressively.
  if (upstream.ok && !range) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }

  const resp = new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });

  if (!range && upstream.ok && request.method === "GET") {
    ctx.waitUntil(cache.put(cacheKey, resp.clone()).catch(() => {}));
  }
  return resp;
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    "access-control-allow-headers": "range, content-type",
    "access-control-expose-headers": "content-length, content-range, accept-ranges",
  };
}

function withCors(resp) {
  const headers = new Headers(resp.headers);
  for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
  return new Response(resp.body, { status: resp.status, headers });
}
