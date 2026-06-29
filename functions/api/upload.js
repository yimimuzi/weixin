function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function extFromType(type) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

export async function onRequestPost({ request, env }) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string" || !file.type?.startsWith("image/")) {
    return json({ ok: false, error: "image_required" }, 400);
  }

  if (file.size > 8 * 1024 * 1024) {
    return json({ ok: false, error: "too_large" }, 400);
  }

  const id = `${Date.now()}-${crypto.randomUUID()}.${extFromType(file.type)}`;
  const key = `uploads/${id}`;
  await env.WEIXIN_ARTICLES.put(key, await file.arrayBuffer(), {
    metadata: { contentType: file.type },
  });

  return json({ ok: true, src: `/uploads/${id}` });
}
