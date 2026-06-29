export async function onRequestGet({ env, params }) {
  const key = `uploads/${params.name}`;
  const value = await env.ARTICLE_PREVIEW_KV.getWithMetadata(key, "arrayBuffer");
  if (!value.value) return new Response("Not found", { status: 404 });

  return new Response(value.value, {
    headers: {
      "content-type": value.metadata?.contentType || "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
