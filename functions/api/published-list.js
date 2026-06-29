function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function onRequestGet({ env }) {
  const raw = await env.ARTICLE_PREVIEW_KV.get("published_index");
  return json({ ok: true, articles: raw ? JSON.parse(raw) : [] });
}
