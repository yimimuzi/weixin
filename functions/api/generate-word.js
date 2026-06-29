import { unzipSync, strFromU8 } from "fflate";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function cleanXmlText(value) {
  return value
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

function readZipText(zip, name) {
  const file = zip[name];
  return file ? strFromU8(file) : "";
}

function parseRelationships(xml) {
  const map = {};
  for (const rel of xml.matchAll(/<Relationship\b[^>]*>/g)) {
    const tag = rel[0];
    const id = tag.match(/\bId="([^"]+)"/)?.[1];
    const target = tag.match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target) map[id] = target.replace(/^\.\//, "");
  }
  return map;
}

function parseDocumentItems(documentXml) {
  const body = documentXml.match(/<w:body[\s\S]*<\/w:body>/)?.[0] || documentXml;
  const items = [];
  for (const p of body.matchAll(/<w:p[\s\S]*?<\/w:p>/g)) {
    const xml = p[0];
    const text = [...xml.matchAll(/<w:t\b[^>]*>[\s\S]*?<\/w:t>/g)]
      .map((m) => cleanXmlText(m[0]))
      .join("")
      .trim();
    const embeds = [...xml.matchAll(/r:embed="([^"]+)"/g)].map((m) => m[1]);
    if (text) items.push({ type: "text", text });
    embeds.forEach((id) => items.push({ type: "embed", id }));
  }
  return items;
}

function extFromName(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "png") return { ext: "png", type: "image/png" };
  if (ext === "webp") return { ext: "webp", type: "image/webp" };
  if (ext === "gif") return { ext: "gif", type: "image/gif" };
  return { ext: "jpg", type: "image/jpeg" };
}

function classifyText(text, index) {
  if (index === 0) return "title";
  if (/^(撰稿|编辑|图片|供稿|审核|科室审核|版权|一审|二审|三审|终审)\s*\|?/.test(text)) return "footer";
  if (/^(\d+[\.、]|（\d+）|\(\d+\)|[一二三四五六七八九十]+[、\.])/.test(text)) return "heading";
  if (text.length <= 22 && /(食谱|展示|卫生|提示|活动|通知|安排|总结|聚焦|安全|教研|德育|招生|课程|风采|公告)/.test(text)) return "heading";
  return "paragraph";
}

function autoThemeId(text) {
  if (/菜谱|食谱|菜品|用餐|膳食|餐/.test(text)) return "menu-xiumi";
  if (/安全|防溺水|消防|交通|法治|普法|演练|心理|健康|卫生/.test(text)) return "safety-blue";
  if (/教研|课堂|课程|教学|公开课|教师|培训|学习|课题|质量/.test(text)) return "teaching-blue";
  if (/少先队|德育|班会|志愿|文明|劳动|升旗|团委|实践|研学/.test(text)) return "moral-red";
  if (/招生|报名|入学|校园开放|简介|风采|成果|荣誉/.test(text)) return "showcase-olive";
  if (/通知|公告|安排|放假|开学|家长|提醒|须知/.test(text)) return "notice-brown";
  return "auto";
}

const DECORATION_IDS = [
  "line-dot",
  "double-dot",
  "square-line",
  "diamond-line",
  "circle-light",
  "star-formal",
  "bookish",
  "notice",
  "fresh",
  "classic",
  "warm",
  "safety",
  "teaching",
  "moral",
  "menu",
  "sports",
  "arts",
  "parent",
  "science",
  "soft",
];

const LAYOUT_IDS = [
  "cover-card",
  "notice-compact",
  "timeline",
  "magazine",
  "menu-board",
  "report-formal",
  "photo-first",
  "soft-card",
  "section-bands",
  "minimal-clean",
];

function stableHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function autoDecorationId(text) {
  if (/菜谱|食谱|菜品|用餐|膳食|餐/.test(text)) return "menu";
  if (/安全|防溺水|消防|交通|法治|普法|演练/.test(text)) return "safety";
  if (/教研|课堂|课程|教学|公开课|教师|培训/.test(text)) return "teaching";
  if (/少先队|德育|班会|志愿|文明|劳动|升旗/.test(text)) return "moral";
  return DECORATION_IDS[stableHash(text) % DECORATION_IDS.length];
}

function autoLayoutId(text) {
  if (/菜谱|食谱|菜品|用餐|膳食|餐|营养/.test(text)) return "menu-board";
  if (/通知|公告|安排|放假|开学|家长|提醒|须知/.test(text)) return "notice-compact";
  if (/活动|开展|举行|启动|过程|现场|实践|研学|志愿/.test(text)) return "timeline";
  if (/现场|照片|图片|展演|比赛|运动会|艺术|美育/.test(text)) return "photo-first";
  if (/会议|党建|工作|总结|检查|督导|调研|质量/.test(text)) return "report-formal";
  if (/德育|少先队|班会|文明|劳动|升旗|安全|法治|消防/.test(text)) return "section-bands";
  if (/心理|健康|关爱|成长|家校|共育|幼儿|亲子/.test(text)) return "soft-card";
  if (/阅读|读书|书香|课程|教研|课堂|培训/.test(text)) return "minimal-clean";
  if (/招生|报名|简介|风采|成果|荣誉|毕业|典礼/.test(text)) return "cover-card";
  if (/简报|动态|新闻|校园|展示/.test(text)) return "magazine";
  return LAYOUT_IDS[stableHash(text) % LAYOUT_IDS.length];
}

function buildArticle(items, uploadedImages, path) {
  const textItems = items.filter((item) => item.type === "text");
  const title = textItems[0]?.text || "未命名文章";
  const sections = [];
  const footer = [];
  let textIndex = 0;
  let pendingImages = [];
  const flushImages = () => {
    if (!pendingImages.length) return;
    if (pendingImages.length === 1) {
      sections.push(pendingImages[0]);
    } else {
      sections.push({
        type: "imageGroup",
        title: "图片组",
        display: "grid",
        images: pendingImages.map((image) => ({ src: image.src, alt: image.alt })),
      });
    }
    pendingImages = [];
  };
  for (const item of items) {
    if (item.type === "embed") {
      const src = uploadedImages[item.id];
      if (src) pendingImages.push({ type: "image", src, alt: "文章图片" });
      continue;
    }
    flushImages();
    const role = classifyText(item.text, textIndex);
    textIndex += 1;
    if (role === "title") continue;
    if (role === "footer") {
      footer.push(item.text);
      continue;
    }
    if (role === "heading") {
      const match = item.text.match(/^(\d+[\.、]?|（\d+）|\(\d+\)|[一二三四五六七八九十]+[、\.]?)(.*)$/);
      sections.push({
        type: "heading",
        label: match?.[1]?.replace(/[、.]$/, "") || String(sections.filter((s) => s.type === "heading").length + 1).padStart(2, "0"),
        text: (match?.[2] || item.text).trim() || item.text,
      });
      continue;
    }
    sections.push({ type: "paragraph", text: item.text });
  }
  flushImages();
  const allText = items.filter((item) => item.type === "text").map((item) => item.text).join(" ");
  return {
    id: `word-${Date.now()}-${path}`,
    path: String(path),
    themeId: autoThemeId(allText),
    layoutId: autoLayoutId(allText),
    decorated: true,
    decorationId: autoDecorationId(allText),
    title,
    subtitle: "",
    intro: "",
    sections,
    closing: "",
    footer,
  };
}

export async function onRequestPost({ request, env }) {
  const form = await request.formData().catch(() => null);
  const files = form
    ? form
        .getAll("file")
        .filter((file) => file && typeof file !== "string" && file.name?.toLowerCase().endsWith(".docx"))
    : [];
  if (!files.length) {
    return json({ ok: false, error: "docx_required" }, 400);
  }

  const articles = [];
  for (const [fileIndex, file] of files.entries()) {
    const zip = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const documentXml = readZipText(zip, "word/document.xml");
    const rels = parseRelationships(readZipText(zip, "word/_rels/document.xml.rels"));
    const items = parseDocumentItems(documentXml);
    const uploadedImages = {};
    for (const item of items) {
      if (item.type !== "embed" || uploadedImages[item.id]) continue;
      const target = rels[item.id];
      const zipName = target?.startsWith("word/") ? target : `word/${target}`;
      const bytes = zip[zipName];
      if (!bytes) continue;
      const { ext, type } = extFromName(zipName);
      const key = `uploads/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      await env.WEIXIN_ARTICLES.put(key, bytes, { metadata: { contentType: type } });
      uploadedImages[item.id] = `/${key}`;
    }

    articles.push(buildArticle(items, uploadedImages, fileIndex + 1));
  }
  await env.WEIXIN_ARTICLES.put("current", JSON.stringify(articles));
  return json({ ok: true, articles });
}
