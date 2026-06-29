function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function tempUploadKey(src) {
  const path = String(src || "").replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+/, "");
  return /^uploads\/tmp-[^/]+$/i.test(path) ? path : "";
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  const sources = Array.isArray(body?.sources) ? body.sources : [];
  const keys = [...new Set(sources.map(tempUploadKey).filter(Boolean))];
  await Promise.all(keys.map((key) => env.ARTICLE_PREVIEW_KV.delete(key)));
  return json({ ok: true, deleted: keys.length });
}
