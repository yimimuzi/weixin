const KEY = "current";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function validArticles(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.title === "string" &&
        Array.isArray(item.sections)
    )
  );
}

export async function onRequestGet({ env }) {
  const raw = await env.WEIXIN_ARTICLES.get(KEY);
  return json({ articles: raw ? JSON.parse(raw) : null });
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body || !validArticles(body.articles)) {
    return json({ ok: false, error: "invalid_articles" }, 400);
  }

  const articles = body.articles.map((article, index) => ({
    ...article,
    path: String(index + 1),
  }));

  await env.WEIXIN_ARTICLES.put(KEY, JSON.stringify(articles));
  return json({ ok: true, articles });
}
