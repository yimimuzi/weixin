import { unzipSync, strFromU8 } from "fflate";

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

function contentProfile(text, stats = {}) {
  const has = (pattern) => pattern.test(text);
  if (has(/喜报|获奖|荣获|表彰|荣誉|一等奖|二等奖|三等奖|冠军|优秀|证书|奖状/)) return "honor";
  if (has(/菜谱|食谱|菜品|用餐|膳食|餐|营养/)) return "menu";
  if (has(/紧急|预警|停课|防汛|极端天气|重要提醒/)) return "emergency";
  if (has(/放假|假期|寒假|暑假|元旦|春节|中秋|国庆|端午/)) return "holiday";
  if (has(/通知|公告|公示|安排|开学|家长|提醒|须知|告家长书/)) return "notice";
  if (has(/招生|报名|入学|校园开放|开放日|幼升小|小升初/)) return "admission";
  if (has(/安全|防溺水|消防|交通|法治|普法|演练/)) return "safety";
  if (has(/党建|党支部|党员|主题党日|廉洁|思政/)) return "party";
  if (has(/教研|课堂|课程|教学|公开课|教师|培训|学习|课题|质量|听评课|研修/)) return "teaching";
  if (has(/少先队|德育|班会|志愿|文明|劳动|升旗|团委|实践|研学/)) return "moral";
  if (has(/运动|体育|比赛|运动会|足球|篮球|体质|竞赛/)) return "sports";
  if (has(/艺术|美育|音乐|舞蹈|绘画|展演|朗诵|合唱/)) return "arts";
  if (has(/阅读|读书|书香|图书|经典|诵读/)) return "reading";
  if (has(/科技|科学|创新|实验|信息|人工智能|机器人|创客/)) return "science";
  if (has(/心理|健康|卫生|疾病|预防|体检|爱眼|护牙|防艾/)) return "health";
  if (has(/毕业|典礼|青春|仪式/)) return "graduation";
  if (has(/幼儿|幼儿园|亲子|宝贝|童年/)) return "kindergarten";
  if (has(/家校|家长会|共育|家庭教育|沟通/)) return "parent";
  if (stats.imageCount >= 8 || has(/照片|图片|现场|掠影|剪影|合集/)) return "photo";
  if (has(/检查|督导|调研|评估|验收/)) return "inspection";
  if (has(/会议|工作会|部署|推进|总结/)) return "meeting";
  if (has(/简报|动态|新闻|周报|快讯|回顾|报道/)) return "news";
  if (has(/简介|风采|成果|展示|特色|品牌|案例/)) return "showcase";
  if (stats.paragraphCount >= 9 && stats.imageCount <= 2) return "text-heavy";
  return "auto";
}

function autoThemeId(text, stats = {}) {
  const type = contentProfile(text, stats);
  const map = {
    honor: "honor-redgold",
    menu: stats.imageCount >= 4 ? "menu-card" : "menu-xiumi",
    emergency: "emergency-clear",
    holiday: "holiday-warm",
    notice: /家长|告家长书|家校/.test(text) ? "parent-tea" : "notice-red",
    admission: "admission-bright",
    safety: "safety-blue",
    party: "party-classic",
    teaching: /课堂|课程|听评课|公开课/.test(text) ? "teaching-ink" : "teaching-blue",
    moral: /劳动|实践|研学/.test(text) ? "labor-earth" : "moral-red",
    sports: "competition-energy",
    arts: "art-stage",
    reading: "reading-warm",
    science: "science-dark",
    health: /心理|情绪|生命教育/.test(text) ? "mental-soft" : "health-clean",
    graduation: "graduation-blue",
    kindergarten: "kindergarten-soft",
    parent: "parent-tea",
    photo: "campus-photo",
    inspection: "exam-focus",
    meeting: "campus-classic",
    news: "newsletter-bright",
    showcase: "achievement-modern",
    "text-heavy": "campus-clean",
  };
  return map[type] || "auto";
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
  "notice-redbar",
  "notice-seal",
  "notice-folder",
  "honor-laurel",
  "honor-ribbon",
  "honor-certificate",
  "menu-leaf",
  "menu-plate",
  "safety-shield",
  "safety-alert",
  "teaching-chalk",
  "teaching-grid",
  "moral-medal",
  "moral-flag",
  "admission-gate",
  "admission-sign",
  "party-banner",
  "exam-blueprint",
  "holiday-lantern",
  "weekly-column",
  "class-smile",
  "labor-field",
  "reading-bookmark",
  "health-cross",
  "science-chip",
  "sports-lane",
  "arts-frame",
  "graduation-arch",
  "parent-note",
  "photo-album",
];

const LAYOUT_IDS = [
  "auto",
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
  "notice-redhead",
  "notice-list",
  "notice-parent",
  "honor-cover",
  "honor-board",
  "honor-certificate",
  "menu-weekly",
  "menu-card-grid",
  "menu-clean",
  "activity-timeline",
  "activity-album",
  "activity-story",
  "safety-manual",
  "safety-warning",
  "teaching-paper",
  "teaching-notes",
  "teaching-report",
  "moral-flag",
  "moral-practice",
  "admission-guide",
  "admission-qa",
  "party-report",
  "exam-arrange",
  "holiday-guide",
  "weekly-news",
  "class-gallery",
  "reading-journal",
  "health-care",
  "science-lab",
  "sports-meet",
  "arts-stage",
  "graduation-ceremony",
  "research-achievement",
  "kindergarten-play",
  "parent-school",
  "inspection-report",
  "meeting-minutes",
  "campus-feature",
  "photo-wall",
];

function stableHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function autoDecorationId(text, stats = {}) {
  const map = {
    honor: "honor-ribbon",
    menu: "menu-plate",
    emergency: "safety-alert",
    holiday: "holiday-lantern",
    notice: "notice-seal",
    admission: "admission-gate",
    safety: "safety-shield",
    party: "party-banner",
    teaching: "teaching-grid",
    moral: "moral-flag",
    sports: "sports-lane",
    arts: "arts-frame",
    reading: "reading-bookmark",
    science: "science-chip",
    health: "health-cross",
    graduation: "graduation-arch",
    kindergarten: "class-smile",
    parent: "parent-note",
    photo: "photo-album",
    inspection: "exam-blueprint",
    meeting: "weekly-column",
    news: "weekly-column",
    showcase: "admission-sign",
    "text-heavy": "classic",
  };
  const selected = map[contentProfile(text, stats)];
  if (selected) return selected;
  return DECORATION_IDS[stableHash(text) % DECORATION_IDS.length];
}

function autoLayoutId(text, stats = {}) {
  const type = contentProfile(text, stats);
  if (stats.imageCount >= 10 && type !== "menu") return "photo-wall";
  const map = {
    honor: /证书|奖状|荣誉证书/.test(text) ? "honor-certificate" : "honor-cover",
    menu: stats.imageCount >= 4 ? "menu-card-grid" : "menu-weekly",
    emergency: "safety-warning",
    holiday: "holiday-guide",
    notice: /家长|告家长书|家校|共育|家庭教育/.test(text) ? "notice-parent" : "notice-redhead",
    admission: "admission-guide",
    safety: "safety-manual",
    party: "party-report",
    teaching: /课堂|课程|公开课|听评课/.test(text) ? "teaching-notes" : "teaching-paper",
    moral: /志愿|劳动|实践|研学|体验/.test(text) ? "moral-practice" : "moral-flag",
    sports: "sports-meet",
    arts: "arts-stage",
    reading: "reading-journal",
    science: "science-lab",
    health: "health-care",
    graduation: "graduation-ceremony",
    kindergarten: "kindergarten-play",
    parent: "parent-school",
    photo: "activity-album",
    inspection: "inspection-report",
    meeting: "meeting-minutes",
    news: "weekly-news",
    showcase: "research-achievement",
    "text-heavy": "minimal-clean",
  };
  if (map[type]) return map[type];
  return LAYOUT_IDS[stableHash(text) % LAYOUT_IDS.length];
}

function preferredImageGroupSize(count) {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  if (count === 4) return 4;
  if (count === 5) return 2;
  if (count === 6) return 3;
  if (count === 7) return 3;
  if (count === 8) return 4;
  return 9;
}

function pushImageBatch(sections, images) {
  let remaining = images.slice();
  while (remaining.length) {
    const size = preferredImageGroupSize(remaining.length);
    const batch = remaining.splice(0, size);
    if (batch.length === 1) {
      sections.push(batch[0]);
      continue;
    }
    sections.push({
      type: "imageGroup",
      title: "",
      display: "grid",
      columns: batch.length === 2 || batch.length === 4 ? 2 : 3,
      images: batch.map((image) => ({ src: image.src, alt: image.alt })),
    });
  }
}

function cleanArticlePath(value) {
  const path = String(value || "").replace(/^\/+|\/+$/g, "");
  return /^\d+$/.test(path) ? path : "";
}

function pathFromArticleId(article) {
  const match = String(article?.id || "").match(/-(\d+)$/);
  return match ? cleanArticlePath(match[1]) : "";
}

function articlePathNumber(article) {
  const value = Number(cleanArticlePath(article?.path) || pathFromArticleId(article));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function nextArticlePath(articles) {
  return String(Math.max(0, ...articles.map(articlePathNumber)) + 1);
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

function buildArticle(items, uploadedImages, path) {
  const textItems = items.filter((item) => item.type === "text");
  const title = textItems[0]?.text || "未命名文章";
  const sections = [];
  const footer = [];
  let textIndex = 0;
  let pendingImages = [];
  const flushImages = () => {
    if (!pendingImages.length) return;
    pushImageBatch(sections, pendingImages);
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
      sections.push({
        type: "heading",
        label: "",
        text: item.text,
      });
      continue;
    }
    sections.push({ type: "paragraph", text: item.text });
  }
  flushImages();
  const allText = items.filter((item) => item.type === "text").map((item) => item.text).join(" ");
  const stats = {
    imageCount: items.filter((item) => item.type === "embed" && uploadedImages[item.id]).length,
    paragraphCount: sections.filter((item) => item.type === "paragraph").length,
    headingCount: sections.filter((item) => item.type === "heading").length,
    charCount: allText.length,
  };
  return {
    id: `word-${Date.now()}-${path}`,
    path: String(path),
    themeId: autoThemeId(allText, stats),
    layoutId: autoLayoutId(allText, stats),
    decorated: true,
    decorationId: autoDecorationId(allText, stats),
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
  const mode = form?.get("mode") === "replace" ? "replace" : "append";
  const currentArticles = (() => {
    if (mode === "replace") return [];
    const raw = form?.get("currentArticles");
    if (typeof raw !== "string" || !raw.trim()) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const files = form
    ? form
        .getAll("file")
        .filter((file) => file && typeof file !== "string" && file.name?.toLowerCase().endsWith(".docx"))
    : [];
  if (!files.length) {
    return json({ ok: false, error: "docx_required" }, 400);
  }

  const usedPaths = new Set();
  const articles = currentArticles.map((article) => {
    const path = stableArticlePath(article, usedPaths);
    usedPaths.add(path);
    return { ...article, path };
  });
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
      await env.ARTICLE_PREVIEW_KV.put(key, bytes, { metadata: { contentType: type }, expirationTtl: TTL_SECONDS });
      uploadedImages[item.id] = `/${key}`;
    }

    articles.push(buildArticle(items, uploadedImages, nextArticlePath(articles)));
  }
  const normalizedPaths = new Set();
  const normalized = articles.map((article) => {
    const path = stableArticlePath(article, normalizedPaths);
    normalizedPaths.add(path);
    return { ...article, path };
  });
  await env.ARTICLE_PREVIEW_KV.put("current", JSON.stringify(normalized), { expirationTtl: TTL_SECONDS });
  return json({ ok: true, mode, added: files.length, articles: normalized });
}
