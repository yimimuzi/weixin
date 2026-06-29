const KEY = "current";
const TTL_SECONDS = 7 * 24 * 60 * 60;

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

function cleanArticlePath(value) {
  const path = String(value || "").replace(/^\/+|\/+$/g, "");
  return /^\d+$/.test(path) ? path : "";
}

function pathFromArticleId(article) {
  const match = String(article?.id || "").match(/-(\d+)$/);
  return match ? cleanArticlePath(match[1]) : "";
}

function stableArticlePath(article, usedPaths) {
  const existing = cleanArticlePath(article?.path);
  if (existing && !usedPaths.has(existing)) return existing;
  const fromId = pathFromArticleId(article);
  if (fromId && !usedPaths.has(fromId)) return fromId;
  let next = 1;
  while (usedPaths.has(String(next))) next += 1;
  return String(next);
}

function stripGeneratedText(article) {
  return {
    ...article,
    sections: (article.sections || []).map((item) => {
      if (item.type === "heading") return { ...item, label: "", text: item.text || "" };
      if (item.type === "imageGroup") return { ...item, title: "", images: item.images || [] };
      return item;
    }),
  };
}

export async function onRequestGet({ env }) {
  const raw = await env.ARTICLE_PREVIEW_KV.get(KEY);
  return json({ articles: raw ? JSON.parse(raw) : null });
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body || !validArticles(body.articles)) {
    return json({ ok: false, error: "invalid_articles" }, 400);
  }

  const usedPaths = new Set();
  const articles = body.articles.map((article) => {
    const path = stableArticlePath(article, usedPaths);
    usedPaths.add(path);
    return { ...stripGeneratedText(article), path };
  });

  await env.ARTICLE_PREVIEW_KV.put(KEY, JSON.stringify(articles), { expirationTtl: TTL_SECONDS });
  return json({ ok: true, articles });
}
