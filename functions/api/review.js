function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function validArticle(article) {
  return article && typeof article === "object" && typeof article.title === "string" && Array.isArray(article.sections);
}

function randomSlug() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, 12);
}

function reviewUploadKey(src) {
  const path = String(src || "").replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+/, "");
  return /^uploads\/tmp-[^/]+$/i.test(path) ? path : "";
}

async function moveToReviewSrc(src, env, slug, moved) {
  const key = reviewUploadKey(src);
  if (!key) return src;
  if (moved.has(key)) return moved.get(key);
  const stored = await env.ARTICLE_PREVIEW_KV.getWithMetadata(key, "arrayBuffer");
  if (!stored.value) return src;
  const ext = key.split(".").pop() || "jpg";
  const newKey = `uploads/rev-${slug}-${crypto.randomUUID()}.${ext}`;
  await env.ARTICLE_PREVIEW_KV.put(newKey, stored.value, {
    metadata: stored.metadata || { contentType: "image/jpeg" },
    expirationTtl: 7 * 24 * 60 * 60,
  });
  await env.ARTICLE_PREVIEW_KV.delete(key);
  const nextSrc = `/${newKey}`;
  moved.set(key, nextSrc);
  return nextSrc;
}

async function moveArticleImagesToReview(article, env, slug) {
  const moved = new Map();
  const sections = [];
  for (const item of article.sections || []) {
    if (item.type === "image") {
      sections.push({ ...item, src: await moveToReviewSrc(item.src, env, slug, moved) });
      continue;
    }
    if (item.type === "imageGroup") {
      const images = [];
      for (const image of item.images || []) {
        images.push({ ...image, src: await moveToReviewSrc(image.src, env, slug, moved) });
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
  if (!body || !validArticle(body.article)) {
    return json({ ok: false, error: "invalid_article" }, 400);
  }

  let slug = body.article.reviewSlug || randomSlug();
  if (!/^[a-z0-9]+$/i.test(slug)) slug = randomSlug();

  const reviewAt = new Date().toISOString();
  const reviewedArticle = await moveArticleImagesToReview(body.article, env, slug);
  const article = {
    ...reviewedArticle,
    id: body.article.id || `review-${slug}`,
    reviewSlug: slug,
    reviewAt,
    reviewUrl: `/r/${slug}/`,
  };

  await env.ARTICLE_PREVIEW_KV.put(`review/${slug}`, JSON.stringify(article), { expirationTtl: 7 * 24 * 60 * 60 });
  return json({ ok: true, slug, url: `/r/${slug}/`, article });
}
