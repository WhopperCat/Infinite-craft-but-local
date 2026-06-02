import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import manifestJSON from '__STATIC_CONTENT_MANIFEST';

const assetManifest = JSON.parse(manifestJSON);

export default {
  async fetch(request, env, ctx) {
    try {
      return await getAssetFromKV(
        { request, waitUntil: ctx.waitUntil.bind(ctx) },
        { ASSET_NAMESPACE: env.__STATIC_CONTENT, ASSET_MANIFEST: assetManifest }
      );
    } catch (e) {
      // Fall back to index.html for the root, otherwise return a 404.
      const url = new URL(request.url);
      if (url.pathname === '/' || url.pathname === '') {
        try {
          const indexRequest = new Request(`${url.origin}/index.html`, request);
          return await getAssetFromKV(
            { request: indexRequest, waitUntil: ctx.waitUntil.bind(ctx) },
            { ASSET_NAMESPACE: env.__STATIC_CONTENT, ASSET_MANIFEST: assetManifest }
          );
        } catch (_) {
          /* fall through */
        }
      }
      return new Response('Not found', { status: 404 });
    }
  }
};
