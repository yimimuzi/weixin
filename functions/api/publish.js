function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

const TTL_SECONDS = 7 * 24 * 60 * 60;

function validArticle(article) {
  return article && typeof article === "object" && typeof article.title === "string" && Array.isArray(article.sections);
}

function randomSlug() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, 12);
}

function tempUploadKey(src) {
  const path = String(src || "").replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+/, "");
  return /^uploads\/(tmp|rev)-[^/]+$/i.test(path) ? path : "";
}

async function promoteSrc(src, env, slug, promoted) {
  const key = tempUploadKey(src);
  if (!key) return src;
  if (promoted.has(key)) return promoted.get(key);

  const stored = await env.ARTICLE_PREVIEW_KV.getWithMetadata(key, "arrayBuffer");
  if (!stored.value) return src;
  const ext = key.split(".").pop() || "jpg";
  const newKey = `uploads/pub-${slug}-${crypto.randomUUID()}.${ext}`;
  await env.ARTICLE_PREVIEW_KV.put(newKey, stored.value, {
    metadata: stored.metadata || { contentType: "image/jpeg" },
    expirationTtl: TTL_SECONDS,
  });
  await env.ARTICLE_PREVIEW_KV.delete(key);
  const nextSrc = `/${newKey}`;
  promoted.set(key, nextSrc);
  return nextSrc;
}

async function promoteArticleImages(article, env, slug) {
  const promoted = new Map();
  const sections = [];
  for (const item of article.sections || []) {
    if (item.type === "image") {
      sections.push({ ...item, src: await promoteSrc(item.src, env, slug, promoted) });
      continue;
    }
    if (item.type === "imageGroup") {
      const images = [];
      for (const image of item.images || []) {
        images.push({ ...image, src: await promoteSrc(image.src, env, slug, promoted) });
      }
      sections.push({ ...item, images });
      continue;
    }
    sections.push(item);
  }
  return { ...article, sections };
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  let sourceArticle = body?.article;
  if (!sourceArticle && typeof body?.reviewSlug === "string" && /^[a-z0-9]+$/i.test(body.reviewSlug)) {
    const raw = await env.ARTICLE_PREVIEW_KV.get(`review/${body.reviewSlug}`);
    sourceArticle = raw ? JSON.parse(raw) : null;
  }
  if (!body || !validArticle(sourceArticle)) {
    return json({ ok: false, error: "invalid_article" }, 400);
  }

  let slug = sourceArticle.publishedSlug || randomSlug();
  for (let i = 0; i < 5; i += 1) {
    const existing = await env.ARTICLE_PREVIEW_KV.get(`published/${slug}`);
    if (!existing) break;
    slug = randomSlug();
  }

  const article = await promoteArticleImages(sourceArticle, env, slug);
  const publishedAt = new Date().toISOString();
  const published = {
    ...article,
    id: article.id || `published-${slug}`,
    publishedSlug: slug,
    publishedAt,
    publishedUrl: `/p/${slug}/`,
  };

  await env.ARTICLE_PREVIEW_KV.put(`published/${slug}`, JSON.stringify(published), { expirationTtl: TTL_SECONDS });
  await env.ARTICLE_PREVIEW_KV.put(
    "published_index",
    JSON.stringify([
      { slug, title: published.title, subtitle: published.subtitle || "", publishedAt, url: `/p/${slug}/` },
      ...JSON.parse((await env.ARTICLE_PREVIEW_KV.get("published_index")) || "[]").filter((item) => item.slug !== slug),
    ].slice(0, 500))
  , { expirationTtl: TTL_SECONDS });
  if (sourceArticle.reviewSlug) await env.ARTICLE_PREVIEW_KV.delete(`review/${sourceArticle.reviewSlug}`);
  return json({ ok: true, slug, url: `/p/${slug}/`, article: published });
}
