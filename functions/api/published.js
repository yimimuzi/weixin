function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  if (!/^[a-z0-9]+$/i.test(id)) {
    return json({ ok: false, error: "invalid_id" }, 400);
  }
  const key = url.searchParams.get("type") === "review" ? `review/${id}` : `published/${id}`;
  const raw = await env.ARTICLE_PREVIEW_KV.get(key);
  if (!raw) return json({ ok: false, error: "not_found" }, 404);
  return json({ ok: true, article: JSON.parse(raw) });
}
