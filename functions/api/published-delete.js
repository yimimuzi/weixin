function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function imageKeys(article) {
  const keys = [];
  for (const item of article.sections || []) {
    if (item.type === "image") keys.push(item.src);
    if (item.type === "imageGroup") {
      for (const image of item.images || []) keys.push(image.src);
    }
  }
  return [
    ...new Set(
      keys
        .map((src) => String(src || "").replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+/, ""))
        .filter((key) => /^uploads\/pub-[^/]+$/i.test(key))
    ),
  ];
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  const slug = String(body?.slug || "");
  if (!/^[a-z0-9]+$/i.test(slug)) {
    return json({ ok: false, error: "invalid_slug" }, 400);
  }

  const key = `published/${slug}`;
  const raw = await env.ARTICLE_PREVIEW_KV.get(key);
  if (!raw) return json({ ok: false, error: "not_found" }, 404);

  const article = JSON.parse(raw);
  await Promise.all(imageKeys(article).map((imageKey) => env.ARTICLE_PREVIEW_KV.delete(imageKey)));
  await env.ARTICLE_PREVIEW_KV.delete(key);

  const indexRaw = await env.ARTICLE_PREVIEW_KV.get("published_index");
  const index = indexRaw ? JSON.parse(indexRaw) : [];
  await env.ARTICLE_PREVIEW_KV.put(
    "published_index",
    JSON.stringify(index.filter((item) => item.slug !== slug))
  );

  return json({ ok: true, deleted: slug });
}
