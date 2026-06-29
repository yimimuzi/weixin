function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getArticles() {
  return window.WECHAT_ARTICLES || [];
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

function setArticles(articles) {
  const usedPaths = new Set();
  window.WECHAT_ARTICLES = articles.map((article) => {
    const path = stableArticlePath(article, usedPaths);
    usedPaths.add(path);
    return {
      ...stripGeneratedText(normalizeArticle(article)),
      path,
    };
  });
}

function articlePathNumber(article) {
  const value = Number(String(article?.path || "").replace(/^\/+|\/+$/g, ""));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function nextArticlePath(articles) {
  return String(Math.max(0, ...articles.map(articlePathNumber)) + 1);
}

async function loadSavedArticles() {
  try {
    const res = await fetch("/api/articles", { cache: "no-store" });
    if (!res.ok) return getArticles();
    const data = await res.json();
    if (Array.isArray(data.articles)) {
      setArticles(data.articles);
    }
  } catch {}
  return getArticles();
}

async function loadPublishedArticle(slug) {
  try {
    const type = location.pathname.startsWith("/r/") ? "&type=review" : "";
    const res = await fetch(`/api/published?id=${encodeURIComponent(slug)}${type}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.article || null;
  } catch {
    return null;
  }
}

function getArticlePath(article, index) {
  return cleanArticlePath(article.path) || pathFromArticleId(article) || String(index + 1);
}

function getArticleUrl(article, index) {
  return `${location.origin}/${getArticlePath(article, index)}/`;
}

function normalizeSrc(src) {
  if (/^(https?:)?\/\//.test(src) || src.startsWith("data:")) return src;
  return `/${src.replace(/^\/+/, "")}`;
}

function isImagePath(text) {
  return /^(\/?uploads\/|\/?assets\/|https?:\/\/).+\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(String(text).trim());
}

function normalizeArticle(article) {
  return {
    ...article,
    decorated: article.decorated !== false,
    sections: (article.sections || []).map((item) => {
      if (item.type === "paragraph" && isImagePath(item.text)) {
        return { type: "image", src: item.text.trim(), alt: "文章图片" };
      }
      return item;
    }),
  };
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

function editableAttrs(path) {
  return `contenteditable="true" data-edit="${esc(path)}" spellcheck="false"`;
}

function editableStyle() {
  return "white-space:pre-wrap;";
}

function hexToRgb(hex) {
  const clean = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(clean)) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function luminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 1;
  const channel = (value) => {
    const next = value / 255;
    return next <= 0.03928 ? next / 12.92 : ((next + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

function contrastRatio(a, b) {
  const light = Math.max(luminance(a), luminance(b));
  const dark = Math.min(luminance(a), luminance(b));
  return (light + 0.05) / (dark + 0.05);
}

function readableText(background, preferred = "#303030", threshold = 4.5) {
  if (contrastRatio(background, preferred) >= threshold) return preferred;
  return contrastRatio(background, "#222222") >= contrastRatio(background, "#ffffff") ? "#222222" : "#ffffff";
}

const FONT_SIZE_OPTIONS = [
  { id: "small", label: "小号", body: 15, heading: 18, title: 26, subtitle: 15, footer: 13 },
  { id: "normal", label: "标准", body: 16, heading: 20, title: 28, subtitle: 16, footer: 14 },
  { id: "large", label: "大号", body: 17, heading: 22, title: 30, subtitle: 17, footer: 15 },
  { id: "xlarge", label: "特大", body: 18, heading: 24, title: 32, subtitle: 18, footer: 16 },
];

function fontOption(id) {
  return FONT_SIZE_OPTIONS.find((item) => item.id === id) || FONT_SIZE_OPTIONS[1];
}

function fontScale(article, path) {
  return fontOption(article?.fontSizes?.[path]);
}

function px(value) {
  return `${value}px`;
}

const SCHOOL_TEMPLATES = [
  { id: "auto", label: "风格 01", keywords: "", name: "red", accent: "#b71f1f", accentDark: "#8f1515", accentSoft: "#fff7f0", warm: "#fffaf2", warmDeep: "#f8f1e6", border: "#ead8bd", gold: "#d6a34a", title: "#8f1515", body: "#2f2f2f", muted: "#70665b", headingRadius: "0", titleBar: "line" },
  { id: "menu-xiumi", label: "风格 02", keywords: "菜谱|食谱|菜品|用餐|膳食|餐", name: "menu-xiumi", accent: "#6b9f39", accentDark: "#3f7b32", accentSoft: "#f3f8f0", warm: "#fff8df", warmDeep: "#eef6df", border: "#d6e6bd", gold: "#f4c84e", title: "#3f7b32", body: "#3a432e", muted: "#71815e", headingRadius: "20px", titleBar: "menu" },
  { id: "menu-card", label: "风格 03", keywords: "菜谱|食谱|菜品|用餐|膳食|餐", name: "menu-card", accent: "#5b8f3a", accentDark: "#2f6f35", accentSoft: "#f1f8e9", warm: "#fff8e8", warmDeep: "#f6ead0", border: "#e6d2a8", gold: "#e3ad45", title: "#2f6f35", body: "#3a3428", muted: "#7a6a54", headingRadius: "18px", titleBar: "menu" },
  { id: "menu-fresh", label: "风格 04", keywords: "食谱|菜品|用餐|膳食|餐", name: "menu", accent: "#4f8a3d", accentDark: "#2f6f35", accentSoft: "#eef8e8", warm: "#fff8e8", warmDeep: "#f6ead0", border: "#e5d5af", gold: "#e0a83f", title: "#2f6f35", body: "#33352e", muted: "#766a54", headingRadius: "12px", titleBar: "short" },
  { id: "menu-warm", label: "风格 05", keywords: "食谱|营养|膳食", name: "menu", accent: "#d47a2c", accentDark: "#a9571e", accentSoft: "#fff4e8", warm: "#fffaf0", warmDeep: "#f5e2c6", border: "#ead2ae", gold: "#c99a3a", title: "#a9571e", body: "#3c3328", muted: "#7a6956", headingRadius: "14px", titleBar: "pill" },
  { id: "safety-blue", label: "风格 06", keywords: "安全|防溺水|消防|交通|法治|演练", name: "safety", accent: "#276b7a", accentDark: "#174f5f", accentSoft: "#eef8f8", warm: "#f7fbf8", warmDeep: "#e9f3ee", border: "#c7dfdc", gold: "#d4a34f", title: "#174f5f", body: "#263b3d", muted: "#647274", headingRadius: "4px", titleBar: "line" },
  { id: "safety-navy", label: "风格 07", keywords: "法治|普法|安全|交通", name: "safety", accent: "#2f5487", accentDark: "#1e3f6d", accentSoft: "#edf4ff", warm: "#f8fbff", warmDeep: "#e5eef9", border: "#c7d7eb", gold: "#c89a43", title: "#1e3f6d", body: "#27364a", muted: "#657086", headingRadius: "0", titleBar: "short" },
  { id: "teaching-blue", label: "风格 08", keywords: "教研|课堂|课程|教学|公开课|教师|培训|课题", name: "teaching", accent: "#3568a8", accentDark: "#224f87", accentSoft: "#eef5ff", warm: "#f8fbff", warmDeep: "#e8f0fb", border: "#cbdcf2", gold: "#c89a43", title: "#224f87", body: "#26364a", muted: "#647084", headingRadius: "4px", titleBar: "line" },
  { id: "teaching-ink", label: "风格 09", keywords: "课堂|读书|书香|课程", name: "teaching", accent: "#35625b", accentDark: "#244d47", accentSoft: "#edf7f5", warm: "#f8fbf8", warmDeep: "#e3efeb", border: "#c7ddd7", gold: "#b8954b", title: "#244d47", body: "#293b38", muted: "#64736f", headingRadius: "2px", titleBar: "short" },
  { id: "moral-red", label: "风格 10", keywords: "少先队|德育|班会|志愿|文明|劳动|升旗|团委", name: "moral", accent: "#a54035", accentDark: "#833127", accentSoft: "#fff4ef", warm: "#fff9f4", warmDeep: "#f7eadf", border: "#ead2c2", gold: "#d4a34f", title: "#833127", body: "#3b302c", muted: "#76685f", headingRadius: "0", titleBar: "line" },
  { id: "moral-gold", label: "风格 11", keywords: "文明|实践|志愿|劳动", name: "moral", accent: "#b85638", accentDark: "#8d3d28", accentSoft: "#fff5eb", warm: "#fffaf2", warmDeep: "#f3e4ce", border: "#e5cdb1", gold: "#c39135", title: "#8d3d28", body: "#3c3028", muted: "#75675b", headingRadius: "10px", titleBar: "pill" },
  { id: "notice-brown", label: "风格 12", keywords: "通知|公告|安排|放假|开学|家长|提醒|须知", name: "notice", accent: "#7a5130", accentDark: "#5f3c21", accentSoft: "#fff6ea", warm: "#fffaf4", warmDeep: "#f2e5d4", border: "#e2ceb7", gold: "#bc8b3c", title: "#5f3c21", body: "#3a322a", muted: "#75685b", headingRadius: "0", titleBar: "short" },
  { id: "notice-gray", label: "风格 13", keywords: "通知|家长|须知|提醒", name: "notice", accent: "#5d6673", accentDark: "#404956", accentSoft: "#f3f5f7", warm: "#fafafa", warmDeep: "#eceff2", border: "#d9dee4", gold: "#b58b43", title: "#404956", body: "#30343a", muted: "#6c737d", headingRadius: "4px", titleBar: "line" },
  { id: "showcase-olive", label: "风格 14", keywords: "招生|报名|入学|校园开放|简介|风采|成果|荣誉", name: "showcase", accent: "#5a6f37", accentDark: "#445925", accentSoft: "#f1f7e9", warm: "#fffaf0", warmDeep: "#edf2df", border: "#d8dfc4", gold: "#c99a3d", title: "#445925", body: "#34392b", muted: "#6e725f", headingRadius: "12px", titleBar: "pill" },
  { id: "showcase-purple", label: "风格 15", keywords: "成果|荣誉|展示|风采", name: "showcase", accent: "#6e4f8f", accentDark: "#563b73", accentSoft: "#f5effb", warm: "#fffafd", warmDeep: "#ece2f4", border: "#d9c7e8", gold: "#c49a45", title: "#563b73", body: "#352d3d", muted: "#706579", headingRadius: "10px", titleBar: "short" },
  { id: "sports-green", label: "风格 16", keywords: "运动|体育|比赛|运动会|足球|篮球|体质", name: "sports", accent: "#2f8f5b", accentDark: "#1f7044", accentSoft: "#edf9f2", warm: "#fbfff8", warmDeep: "#e4f2df", border: "#c8dfc4", gold: "#c99a37", title: "#1f7044", body: "#28382d", muted: "#637267", headingRadius: "16px", titleBar: "pill" },
  { id: "arts-rose", label: "风格 17", keywords: "艺术|美育|音乐|舞蹈|绘画|展演|朗诵", name: "arts", accent: "#b14d72", accentDark: "#8f3859", accentSoft: "#fff0f5", warm: "#fffafd", warmDeep: "#f4e2ea", border: "#e7c8d5", gold: "#c79a45", title: "#8f3859", body: "#3c2c34", muted: "#756570", headingRadius: "14px", titleBar: "pill" },
  { id: "reading-cyan", label: "风格 18", keywords: "阅读|读书|书香|图书|经典|诵读", name: "reading", accent: "#277b8b", accentDark: "#1d6070", accentSoft: "#eef9fb", warm: "#fbfffe", warmDeep: "#e4f2f3", border: "#c8dfe3", gold: "#b8954b", title: "#1d6070", body: "#283b3f", muted: "#64767b", headingRadius: "6px", titleBar: "short" },
  { id: "research-indigo", label: "风格 19", keywords: "课题|科研|研究|论文|成果|质量", name: "research", accent: "#4b5fa7", accentDark: "#37498b", accentSoft: "#f0f3ff", warm: "#fafbff", warmDeep: "#e6eafd", border: "#ccd3ef", gold: "#c09a43", title: "#37498b", body: "#30364d", muted: "#68708b", headingRadius: "2px", titleBar: "line" },
  { id: "health-mint", label: "风格 20", keywords: "心理|健康|卫生|成长|关爱", name: "health", accent: "#3f8f7b", accentDark: "#2d705f", accentSoft: "#effaf6", warm: "#fbfffc", warmDeep: "#e4f3ed", border: "#c8ded6", gold: "#c49a45", title: "#2d705f", body: "#2d3d38", muted: "#65756f", headingRadius: "14px", titleBar: "pill" },
  { id: "parent-tea", label: "风格 21", keywords: "家校|家长|共育|家庭|沟通", name: "parent", accent: "#6f7d3c", accentDark: "#556326", accentSoft: "#f4f7e9", warm: "#fffdf5", warmDeep: "#edf1d8", border: "#dce2bd", gold: "#b89542", title: "#556326", body: "#383b2b", muted: "#6f735f", headingRadius: "10px", titleBar: "short" },
  { id: "graduation-blue", label: "风格 22", keywords: "毕业|典礼|成长|青春|仪式", name: "graduation", accent: "#3f78b5", accentDark: "#285f99", accentSoft: "#eef7ff", warm: "#fbfdff", warmDeep: "#e4eff8", border: "#c8dcee", gold: "#c99a3a", title: "#285f99", body: "#2b3846", muted: "#657486", headingRadius: "12px", titleBar: "pill" },
  { id: "festival-red", label: "风格 23", keywords: "元旦|春节|国庆|六一|节日|庆祝|庆典", name: "festival", accent: "#c3322e", accentDark: "#9f211f", accentSoft: "#fff2ed", warm: "#fff9f2", warmDeep: "#f6e2d2", border: "#e9c9b8", gold: "#d3a13d", title: "#9f211f", body: "#3c302b", muted: "#75665d", headingRadius: "0", titleBar: "line" },
  { id: "campus-clean", label: "风格 24", keywords: "简报|动态|新闻|校园", name: "clean", accent: "#40708f", accentDark: "#2b5874", accentSoft: "#f0f7fb", warm: "#fbfcfd", warmDeep: "#e8f0f4", border: "#d2dfe6", gold: "#b9934a", title: "#2b5874", body: "#30383d", muted: "#68757c", headingRadius: "4px", titleBar: "short" },
  { id: "campus-classic", label: "风格 25", keywords: "会议|党建|工作|总结|简报", name: "classic", accent: "#a62222", accentDark: "#821818", accentSoft: "#fff5f2", warm: "#fffaf4", warmDeep: "#f5e7dc", border: "#e5cfc2", gold: "#c99a3d", title: "#821818", body: "#302d2b", muted: "#71665f", headingRadius: "0", titleBar: "line" },
  { id: "science-teal", label: "风格 26", keywords: "科技|科学|创新|实验|信息|人工智能", name: "science", accent: "#317d91", accentDark: "#215f72", accentSoft: "#eef8fb", warm: "#fbfdff", warmDeep: "#e4eef5", border: "#c7dce5", gold: "#b89545", title: "#215f72", body: "#293940", muted: "#65767d", headingRadius: "8px", titleBar: "short" },
  { id: "kindergarten-soft", label: "风格 27", keywords: "幼儿|幼儿园|亲子|宝贝|童年", name: "kindergarten", accent: "#d46b7b", accentDark: "#aa4d5d", accentSoft: "#fff2f4", warm: "#fffdf8", warmDeep: "#f8e8df", border: "#ebd2cb", gold: "#c99a43", title: "#aa4d5d", body: "#3c3230", muted: "#786a66", headingRadius: "16px", titleBar: "pill" },
];

SCHOOL_TEMPLATES.push(
  { id: "notice-red", label: "风格 28", keywords: "通知|公告|公示|安排|须知|提醒|放假|开学", name: "notice", accent: "#b62828", accentDark: "#8d1c1c", accentSoft: "#fff1ed", warm: "#fffaf6", warmDeep: "#f5e2d8", border: "#e8c8bb", gold: "#c7983a", title: "#8d1c1c", body: "#332b28", muted: "#74655f", headingRadius: "0", titleBar: "line" },
  { id: "notice-blue", label: "风格 29", keywords: "通知|公告|公示|安排|须知|提醒", name: "notice", accent: "#2f5f96", accentDark: "#214a78", accentSoft: "#edf5ff", warm: "#fbfdff", warmDeep: "#e4eef9", border: "#c8d8e8", gold: "#b98f3e", title: "#214a78", body: "#2d3643", muted: "#657284", headingRadius: "2px", titleBar: "short" },
  { id: "honor-redgold", label: "风格 30", keywords: "喜报|获奖|荣获|表彰|荣誉|一等奖|二等奖|三等奖|冠军|优秀", name: "honor", accent: "#c72b25", accentDark: "#9d1d19", accentSoft: "#fff0e9", warm: "#fff8ed", warmDeep: "#f4dfc4", border: "#e8c5aa", gold: "#d9a441", title: "#9d1d19", body: "#3b2e29", muted: "#746359", headingRadius: "0", titleBar: "line" },
  { id: "honor-certificate", label: "风格 31", keywords: "喜报|获奖|表彰|荣誉|优秀|证书", name: "honor", accent: "#a96525", accentDark: "#7f4518", accentSoft: "#fff4e7", warm: "#fffaf0", warmDeep: "#f1dfbd", border: "#dfc49a", gold: "#c8962f", title: "#7f4518", body: "#3a3127", muted: "#756657", headingRadius: "8px", titleBar: "pill" },
  { id: "admission-bright", label: "风格 32", keywords: "招生|报名|入学|开放日|校园开放|幼升小|小升初", name: "showcase", accent: "#2877a8", accentDark: "#1b5d87", accentSoft: "#eef8ff", warm: "#fbfdff", warmDeep: "#dfeef6", border: "#c3dce9", gold: "#d0a23b", title: "#1b5d87", body: "#2a3740", muted: "#637583", headingRadius: "14px", titleBar: "pill" },
  { id: "admission-green", label: "风格 33", keywords: "招生|报名|入学|开放日|校园开放", name: "showcase", accent: "#3f7d4b", accentDark: "#2e6237", accentSoft: "#eff8ef", warm: "#fffdf4", warmDeep: "#e5efd8", border: "#cbdcbf", gold: "#b7953c", title: "#2e6237", body: "#30392e", muted: "#68725d", headingRadius: "14px", titleBar: "pill" },
  { id: "party-classic", label: "风格 34", keywords: "党建|党支部|党员|主题党日|廉洁|思政", name: "classic", accent: "#b21d1d", accentDark: "#891414", accentSoft: "#fff2ee", warm: "#fff9f3", warmDeep: "#f2ddcf", border: "#e4c2b2", gold: "#d0a13b", title: "#891414", body: "#332b28", muted: "#74655f", headingRadius: "0", titleBar: "line" },
  { id: "exam-focus", label: "风格 35", keywords: "考试|测评|质量监测|期中|期末|考务|评价", name: "notice", accent: "#365b7f", accentDark: "#284663", accentSoft: "#f0f5fb", warm: "#fbfcfe", warmDeep: "#e5edf4", border: "#ccd8e3", gold: "#b89243", title: "#284663", body: "#303943", muted: "#68727c", headingRadius: "2px", titleBar: "short" },
  { id: "holiday-warm", label: "风格 36", keywords: "放假|假期|寒假|暑假|元旦|春节|中秋|国庆|端午", name: "notice", accent: "#b85b36", accentDark: "#914329", accentSoft: "#fff4ea", warm: "#fffaf3", warmDeep: "#f1dfca", border: "#e1c7ae", gold: "#c99535", title: "#914329", body: "#3a3029", muted: "#75665d", headingRadius: "12px", titleBar: "pill" },
  { id: "emergency-clear", label: "风格 37", keywords: "紧急|提醒|预警|停课|调整|重要|防汛|极端天气", name: "notice", accent: "#b4382e", accentDark: "#8e2b23", accentSoft: "#fff0ed", warm: "#fffafa", warmDeep: "#f3deda", border: "#e3c2bc", gold: "#c89b3e", title: "#8e2b23", body: "#3b2f2c", muted: "#756660", headingRadius: "0", titleBar: "line" },
  { id: "weekly-report", label: "风格 38", keywords: "周报|简报|动态|一周|回顾|新闻", name: "clean", accent: "#4b7788", accentDark: "#355f70", accentSoft: "#eff7f9", warm: "#fbfdfd", warmDeep: "#e5f0f2", border: "#cadde2", gold: "#b9934a", title: "#355f70", body: "#30393d", muted: "#68767b", headingRadius: "4px", titleBar: "short" },
  { id: "class-feature", label: "风格 39", keywords: "班级|风采|成长|展示|精彩|瞬间", name: "showcase", accent: "#6d8f34", accentDark: "#526f24", accentSoft: "#f4f9eb", warm: "#fffdf4", warmDeep: "#e7efcf", border: "#d2dfb8", gold: "#c39637", title: "#526f24", body: "#353a2d", muted: "#6e725e", headingRadius: "16px", titleBar: "pill" },
  { id: "labor-earth", label: "风格 40", keywords: "劳动|实践|种植|农耕|体验|劳动教育", name: "moral", accent: "#8a6a35", accentDark: "#654b23", accentSoft: "#fff7ea", warm: "#fffaf1", warmDeep: "#eee0c6", border: "#dbc6a2", gold: "#b98c37", title: "#654b23", body: "#393126", muted: "#716656", headingRadius: "10px", titleBar: "pill" },
  { id: "research-green", label: "风格 41", keywords: "教研|课堂|听评课|公开课|培训|教师发展", name: "teaching", accent: "#3d7467", accentDark: "#2a5b50", accentSoft: "#eef8f5", warm: "#fbfffd", warmDeep: "#e1eee9", border: "#c6ddd6", gold: "#b8954b", title: "#2a5b50", body: "#2c3b37", muted: "#65736f", headingRadius: "4px", titleBar: "short" },
  { id: "reading-warm", label: "风格 42", keywords: "阅读|读书|书香|图书|经典|诵读", name: "reading", accent: "#9a7130", accentDark: "#74511f", accentSoft: "#fff7e8", warm: "#fffdf5", warmDeep: "#efe1c1", border: "#dcc69f", gold: "#c39335", title: "#74511f", body: "#383126", muted: "#716657", headingRadius: "8px", titleBar: "short" },
  { id: "mental-soft", label: "风格 43", keywords: "心理|健康|情绪|生命教育|关爱|成长", name: "health", accent: "#4c8a78", accentDark: "#356d5d", accentSoft: "#eff9f5", warm: "#fbfffc", warmDeep: "#e4f0ea", border: "#c8ded6", gold: "#b8954b", title: "#356d5d", body: "#2d3b37", muted: "#65746f", headingRadius: "18px", titleBar: "pill" },
  { id: "health-clean", label: "风格 44", keywords: "卫生|健康|疾病|预防|体检|爱眼|护牙", name: "health", accent: "#2f8f8a", accentDark: "#1f706c", accentSoft: "#edf9f8", warm: "#fbfffe", warmDeep: "#dff0ee", border: "#c4dfdc", gold: "#ba9343", title: "#1f706c", body: "#283b3a", muted: "#637674", headingRadius: "12px", titleBar: "pill" },
  { id: "science-dark", label: "风格 45", keywords: "科技|科学|实验|创客|人工智能|信息技术|机器人", name: "science", accent: "#245f73", accentDark: "#18475a", accentSoft: "#edf7fa", warm: "#fbfdff", warmDeep: "#dcecf2", border: "#bfd8e1", gold: "#c09a43", title: "#18475a", body: "#293940", muted: "#65767d", headingRadius: "6px", titleBar: "short" },
  { id: "campus-photo", label: "风格 46", keywords: "活动|现场|照片|纪实|掠影|剪影", name: "showcase", accent: "#526f8e", accentDark: "#3d5874", accentSoft: "#f0f6fb", warm: "#fbfcfd", warmDeep: "#e3ecf3", border: "#c9d8e4", gold: "#b9934a", title: "#3d5874", body: "#30383d", muted: "#68757c", headingRadius: "4px", titleBar: "short" },
  { id: "competition-energy", label: "风格 47", keywords: "比赛|竞赛|运动会|足球|篮球|冠军|荣获", name: "sports", accent: "#2f8d63", accentDark: "#1e704a", accentSoft: "#edf9f3", warm: "#fbfff9", warmDeep: "#def0df", border: "#c3dfc6", gold: "#c99a37", title: "#1e704a", body: "#28382d", muted: "#637267", headingRadius: "18px", titleBar: "pill" },
  { id: "art-stage", label: "风格 48", keywords: "艺术|美育|音乐|舞蹈|绘画|展演|朗诵|合唱", name: "arts", accent: "#8e477d", accentDark: "#6f3460", accentSoft: "#fbf0f8", warm: "#fffafd", warmDeep: "#eedfed", border: "#dac3d7", gold: "#c99a45", title: "#6f3460", body: "#3b3039", muted: "#716575", headingRadius: "14px", titleBar: "pill" },
  { id: "newsletter-bright", label: "风格 49", keywords: "快讯|新闻|动态|报道|校园新闻", name: "clean", accent: "#2f7896", accentDark: "#215e78", accentSoft: "#eef8fb", warm: "#fbfdfd", warmDeep: "#e1eef3", border: "#c5dbe4", gold: "#bd9443", title: "#215e78", body: "#2d383d", muted: "#65757c", headingRadius: "4px", titleBar: "short" },
  { id: "achievement-modern", label: "风格 50", keywords: "成果|发布|展示|案例|特色|品牌", name: "showcase", accent: "#596b93", accentDark: "#405174", accentSoft: "#f1f4fb", warm: "#fbfcff", warmDeep: "#e5eaf4", border: "#cdd5e6", gold: "#c19a43", title: "#405174", body: "#303540", muted: "#687084", headingRadius: "6px", titleBar: "short" }
);

function templateById(id) {
  return SCHOOL_TEMPLATES.find((template) => template.id === id);
}

function articleTheme(article) {
  const manual = templateById(article.themeId);
  if (manual && manual.id !== "auto") return manual;
  const text = articleText(article);
  const profiled = PROFILE_DEFAULTS[articleProfile(article, text)]?.themeId;
  const profiledTheme = templateById(profiled);
  if (profiledTheme) return profiledTheme;
  return SCHOOL_TEMPLATES.find((template) => template.keywords && new RegExp(template.keywords).test(text)) || SCHOOL_TEMPLATES[0];
}

const DECORATION_SCHEMES = [
  { id: "line-dot", label: "美化 01", full: "● ━━━━━ ● ━━━━━ ●", short: "━━━━━━ ● ━━━━━━", top: "● ● ●", heading: "center-pill", paragraph: "left-gold", image: "thin", footer: "badge" },
  { id: "double-dot", label: "美化 02", full: "● ─── ● ─── ●", short: "─── ● ───", top: "●  ●", heading: "left-block", paragraph: "side-soft", image: "label", footer: "line" },
  { id: "square-line", label: "美化 03", full: "■ ━━━━━ ■ ━━━━━ ■", short: "━━━━ ■ ━━━━", top: "■ ■ ■", heading: "square-band", paragraph: "top-strip", image: "mat", footer: "box" },
  { id: "diamond-line", label: "美化 04", full: "◆ ━━━━━ ◆ ━━━━━ ◆", short: "━━━━ ◆ ━━━━", top: "◆ ◆ ◆", heading: "bracket", paragraph: "corner", image: "corner", footer: "badge" },
  { id: "circle-light", label: "美化 05", full: "○ ───── ○ ───── ○", short: "──── ○ ────", top: "○ ○ ○", heading: "quiet", paragraph: "soft-card", image: "plain", footer: "line" },
  { id: "star-formal", label: "美化 06", full: "★ ━━━━━ ★ ━━━━━ ★", short: "━━━━ ★ ━━━━", top: "★ ★ ★", heading: "stamp", paragraph: "formal", image: "gold", footer: "box" },
  { id: "bookish", label: "美化 07", full: "【 ● 】────────【 ● 】", short: "【 ● 】──────", top: "【 ● 】", heading: "book", paragraph: "note", image: "book", footer: "badge" },
  { id: "notice", label: "美化 08", full: "——  ●  ——  ●  ——", short: "——  ●  ——", top: "—— ● ——", heading: "notice", paragraph: "notice", image: "thin", footer: "line" },
  { id: "fresh", label: "美化 09", full: "● · · · ● · · · ●", short: "· · ● · ·", top: "● · ●", heading: "leaf", paragraph: "fresh", image: "soft", footer: "badge" },
  { id: "classic", label: "美化 10", full: "━━━━━━━━━━━━", short: "━━━━━━", top: "━━━━", heading: "classic", paragraph: "formal", image: "thin", footer: "line" },
  { id: "warm", label: "美化 11", full: "●  ●  ●  ●  ●", short: "●  ●  ●", top: "● ●", heading: "warm", paragraph: "warm", image: "mat", footer: "box" },
  { id: "safety", label: "美化 12", full: "● ━━━━━ ● ━━━━━ ●", short: "━━ ● ━━", top: "● ● ●", heading: "warning", paragraph: "side-soft", image: "label", footer: "box" },
  { id: "teaching", label: "美化 13", full: "◆ ───── ◆ ───── ◆", short: "── ◆ ──", top: "◆ ◆ ◆", heading: "book", paragraph: "note", image: "book", footer: "line" },
  { id: "moral", label: "美化 14", full: "● ━━━━━ ● ━━━━━ ●", short: "━━ ● ━━", top: "● ● ●", heading: "stamp", paragraph: "corner", image: "gold", footer: "badge" },
  { id: "menu", label: "美化 15", full: "● ━━━━━ ● ━━━━━ ●", short: "━━━━ ● ━━━━", top: "● ● ●", heading: "menu-tab", paragraph: "menu-card", image: "mat", footer: "box" },
  { id: "sports", label: "美化 16", full: "● ─ ● ─ ● ─ ●", short: "● ─ ●", top: "● ● ●", heading: "track", paragraph: "fresh", image: "corner", footer: "badge" },
  { id: "arts", label: "美化 17", full: "◆ · · ◆ · · ◆", short: "· · ◆ · ·", top: "◆ ◆", heading: "gallery", paragraph: "soft-card", image: "label", footer: "badge" },
  { id: "parent", label: "美化 18", full: "● ─ ● ─ ●", short: "── ● ──", top: "● ● ●", heading: "notice", paragraph: "note", image: "soft", footer: "line" },
  { id: "science", label: "美化 19", full: "■ ── ■ ── ■", short: "── ■ ──", top: "■ ■ ■", heading: "square-band", paragraph: "top-strip", image: "corner", footer: "box" },
  { id: "soft", label: "美化 20", full: "○  ○  ○  ○  ○", short: "○  ○  ○", top: "○ ○", heading: "quiet", paragraph: "soft-card", image: "soft", footer: "line" },
];

DECORATION_SCHEMES.push(
  { id: "notice-redbar", label: "美化 21", full: "━━ ● ━━", short: "━━ ● ━━", top: "● ● ●", heading: "notice", paragraph: "notice", image: "thin", footer: "line" },
  { id: "notice-seal", label: "美化 22", full: "【 ● 】────────", short: "【 ● 】", top: "● ● ●", heading: "stamp", paragraph: "formal", image: "thin", footer: "box" },
  { id: "notice-folder", label: "美化 23", full: "■ ● ■ ● ■", short: "■ ● ■", top: "■ ■ ■", heading: "square-band", paragraph: "top-strip", image: "label", footer: "line" },
  { id: "honor-laurel", label: "美化 24", full: "★ ━━ ★ ━━ ★", short: "★ ★ ★", top: "★ ★ ★", heading: "stamp", paragraph: "warm", image: "gold", footer: "badge" },
  { id: "honor-ribbon", label: "美化 25", full: "◆ ━━ ◆ ━━ ◆", short: "◆ ◆ ◆", top: "◆ ◆ ◆", heading: "bracket", paragraph: "corner", image: "gold", footer: "badge" },
  { id: "honor-certificate", label: "美化 26", full: "【 ◆ 】────────", short: "【 ◆ 】", top: "◆ ◆ ◆", heading: "book", paragraph: "formal", image: "book", footer: "box" },
  { id: "menu-leaf", label: "美化 27", full: "●  ●  ●", short: "● ● ●", top: "● ● ●", heading: "leaf", paragraph: "menu-card", image: "mat", footer: "box" },
  { id: "menu-plate", label: "美化 28", full: "○ ━ ○ ━ ○", short: "○ ○ ○", top: "○ ○ ○", heading: "menu-tab", paragraph: "menu-card", image: "soft", footer: "badge" },
  { id: "safety-shield", label: "美化 29", full: "■ ━ ■ ━ ■", short: "■ ■ ■", top: "■ ■ ■", heading: "warning", paragraph: "side-soft", image: "corner", footer: "box" },
  { id: "safety-alert", label: "美化 30", full: "——  ●  ——", short: "—— ● ——", top: "● ● ●", heading: "notice", paragraph: "notice", image: "label", footer: "line" },
  { id: "teaching-chalk", label: "美化 31", full: "── ◆ ──", short: "── ◆ ──", top: "◆ ◆ ◆", heading: "book", paragraph: "note", image: "book", footer: "line" },
  { id: "teaching-grid", label: "美化 32", full: "■ ─ ■ ─ ■", short: "■ ■ ■", top: "■ ■ ■", heading: "square-band", paragraph: "top-strip", image: "corner", footer: "box" },
  { id: "moral-medal", label: "美化 33", full: "★ ━ ★ ━ ★", short: "★ ★ ★", top: "★ ★ ★", heading: "stamp", paragraph: "corner", image: "gold", footer: "badge" },
  { id: "moral-flag", label: "美化 34", full: "◆ ━ ◆ ━ ◆", short: "◆ ◆ ◆", top: "◆ ◆ ◆", heading: "bracket", paragraph: "warm", image: "gold", footer: "badge" },
  { id: "admission-gate", label: "美化 35", full: "【 ○ 】────────", short: "【 ○ 】", top: "○ ○ ○", heading: "book", paragraph: "soft-card", image: "label", footer: "box" },
  { id: "admission-sign", label: "美化 36", full: "● ━ ● ━ ●", short: "● ● ●", top: "● ● ●", heading: "notice", paragraph: "side-soft", image: "soft", footer: "line" },
  { id: "party-banner", label: "美化 37", full: "★ ━ ★ ━ ★", short: "★ ★ ★", top: "★ ★ ★", heading: "stamp", paragraph: "formal", image: "gold", footer: "box" },
  { id: "exam-blueprint", label: "美化 38", full: "■ ─ ■ ─ ■", short: "■ ■ ■", top: "■ ■ ■", heading: "square-band", paragraph: "top-strip", image: "thin", footer: "line" },
  { id: "holiday-lantern", label: "美化 39", full: "● ━ ● ━ ●", short: "● ● ●", top: "● ● ●", heading: "warm", paragraph: "warm", image: "mat", footer: "badge" },
  { id: "weekly-column", label: "美化 40", full: "━━━━━━━━━━━━", short: "━━━━━━", top: "━━━━", heading: "classic", paragraph: "formal", image: "thin", footer: "line" },
  { id: "class-smile", label: "美化 41", full: "○ · ○ · ○", short: "○ ○ ○", top: "○ ○ ○", heading: "quiet", paragraph: "fresh", image: "soft", footer: "badge" },
  { id: "labor-field", label: "美化 42", full: "● · ● · ●", short: "● ● ●", top: "● ● ●", heading: "leaf", paragraph: "fresh", image: "mat", footer: "box" },
  { id: "reading-bookmark", label: "美化 43", full: "【 ● 】────────", short: "【 ● 】", top: "● ● ●", heading: "book", paragraph: "note", image: "book", footer: "line" },
  { id: "health-cross", label: "美化 44", full: "● ━ ● ━ ●", short: "● ● ●", top: "● ● ●", heading: "notice", paragraph: "soft-card", image: "soft", footer: "box" },
  { id: "science-chip", label: "美化 45", full: "■ ─ ■ ─ ■", short: "■ ■ ■", top: "■ ■ ■", heading: "square-band", paragraph: "top-strip", image: "corner", footer: "box" },
  { id: "sports-lane", label: "美化 46", full: "● ─ ● ─ ●", short: "● ● ●", top: "● ● ●", heading: "track", paragraph: "fresh", image: "corner", footer: "badge" },
  { id: "arts-frame", label: "美化 47", full: "◆ · ◆ · ◆", short: "◆ ◆ ◆", top: "◆ ◆ ◆", heading: "gallery", paragraph: "soft-card", image: "label", footer: "badge" },
  { id: "graduation-arch", label: "美化 48", full: "【 ◆ 】────────", short: "【 ◆ 】", top: "◆ ◆ ◆", heading: "bracket", paragraph: "warm", image: "gold", footer: "badge" },
  { id: "parent-note", label: "美化 49", full: "—— ● ——", short: "—— ● ——", top: "● ● ●", heading: "notice", paragraph: "note", image: "soft", footer: "line" },
  { id: "photo-album", label: "美化 50", full: "◆ ━ ◆ ━ ◆", short: "◆ ◆ ◆", top: "◆ ◆ ◆", heading: "gallery", paragraph: "corner", image: "label", footer: "badge" }
);

const LAYOUT_SCHEMES = [
  { id: "auto", label: "排版 01", keywords: "", header: "center", heading: "badge", paragraph: "card", image: "full", group: "grid", footer: "soft" },
  { id: "cover-card", label: "排版 02", keywords: "招生|报名|简介|风采|成果|荣誉|毕业|典礼", header: "cover", heading: "badge", paragraph: "card", image: "full", group: "grid", footer: "soft" },
  { id: "notice-compact", label: "排版 03", keywords: "通知|公告|安排|放假|开学|家长|提醒|须知", header: "compact", heading: "left", paragraph: "plain-box", image: "full", group: "grid", footer: "line" },
  { id: "timeline", label: "排版 04", keywords: "活动|开展|举行|启动|过程|现场|实践|研学|志愿", header: "center", heading: "timeline", paragraph: "timeline", image: "framed", group: "grid", footer: "soft" },
  { id: "magazine", label: "排版 05", keywords: "简报|动态|新闻|校园|展示|风采", header: "magazine", heading: "split", paragraph: "magazine", image: "framed", group: "grid", footer: "badge" },
  { id: "menu-board", label: "排版 06", keywords: "菜谱|食谱|菜品|用餐|膳食|餐|营养", header: "menu", heading: "menu", paragraph: "menu", image: "mat", group: "grid", footer: "soft" },
  { id: "report-formal", label: "排版 07", keywords: "会议|党建|工作|总结|检查|督导|调研|质量", header: "formal", heading: "line", paragraph: "formal", image: "full", group: "grid", footer: "line" },
  { id: "photo-first", label: "排版 08", keywords: "现场|照片|图片|展演|比赛|运动会|艺术|美育", header: "center", heading: "photo", paragraph: "card", image: "featured", group: "grid", footer: "badge" },
  { id: "soft-card", label: "排版 09", keywords: "心理|健康|关爱|成长|家校|共育|幼儿|亲子", header: "soft", heading: "soft", paragraph: "card", image: "soft", group: "grid", footer: "soft" },
  { id: "section-bands", label: "排版 10", keywords: "德育|少先队|班会|文明|劳动|升旗|安全|法治|消防", header: "band", heading: "band", paragraph: "band", image: "framed", group: "grid", footer: "badge" },
  { id: "minimal-clean", label: "排版 11", keywords: "阅读|读书|书香|课程|教研|课堂|培训", header: "minimal", heading: "quiet", paragraph: "clean", image: "full", group: "grid", footer: "line" },
];

LAYOUT_SCHEMES.push(
  { id: "notice-redhead", label: "排版 12", keywords: "通知|公告|公示|重要|安排|须知", header: "formal", heading: "line", paragraph: "formal", image: "full", group: "grid", footer: "line" },
  { id: "notice-list", label: "排版 13", keywords: "通知|提醒|须知|事项|安排", header: "compact", heading: "left", paragraph: "plain-box", image: "full", group: "grid", footer: "line" },
  { id: "notice-parent", label: "排版 14", keywords: "家长|告家长书|提醒|须知|家校", header: "soft", heading: "soft", paragraph: "card", image: "soft", group: "grid", footer: "soft" },
  { id: "honor-cover", label: "排版 15", keywords: "喜报|获奖|荣获|表彰|荣誉", header: "cover", heading: "badge", paragraph: "warm", image: "featured", group: "grid", footer: "badge" },
  { id: "honor-board", label: "排版 16", keywords: "获奖|表彰|优秀|名单|荣誉榜", header: "band", heading: "band", paragraph: "band", image: "gold", group: "grid", footer: "badge" },
  { id: "honor-certificate", label: "排版 17", keywords: "证书|奖状|荣誉|表彰", header: "formal", heading: "line", paragraph: "formal", image: "featured", group: "grid", footer: "box" },
  { id: "menu-weekly", label: "排版 18", keywords: "食谱|一周|餐单|营养", header: "menu", heading: "menu", paragraph: "menu", image: "mat", group: "grid", footer: "soft" },
  { id: "menu-card-grid", label: "排版 19", keywords: "食谱|菜品|膳食|用餐", header: "soft", heading: "soft", paragraph: "card", image: "soft", group: "grid", footer: "soft" },
  { id: "menu-clean", label: "排版 20", keywords: "食谱|餐|营养", header: "minimal", heading: "quiet", paragraph: "clean", image: "full", group: "grid", footer: "line" },
  { id: "activity-timeline", label: "排版 21", keywords: "活动|开展|举行|启动|过程|现场|实践", header: "center", heading: "timeline", paragraph: "timeline", image: "framed", group: "grid", footer: "soft" },
  { id: "activity-album", label: "排版 22", keywords: "活动|现场|照片|掠影|剪影|纪实", header: "magazine", heading: "photo", paragraph: "card", image: "featured", group: "grid", footer: "badge" },
  { id: "activity-story", label: "排版 23", keywords: "活动|研学|实践|体验|成长", header: "cover", heading: "split", paragraph: "magazine", image: "framed", group: "grid", footer: "soft" },
  { id: "safety-manual", label: "排版 24", keywords: "安全|防溺水|消防|交通|法治", header: "compact", heading: "left", paragraph: "plain-box", image: "full", group: "grid", footer: "line" },
  { id: "safety-warning", label: "排版 25", keywords: "预警|安全|紧急|防汛|极端天气", header: "band", heading: "band", paragraph: "band", image: "framed", group: "grid", footer: "badge" },
  { id: "teaching-paper", label: "排版 26", keywords: "教研|课题|研究|论文|质量", header: "formal", heading: "line", paragraph: "formal", image: "full", group: "grid", footer: "line" },
  { id: "teaching-notes", label: "排版 27", keywords: "课堂|公开课|听评课|课程", header: "minimal", heading: "quiet", paragraph: "clean", image: "full", group: "grid", footer: "line" },
  { id: "teaching-report", label: "排版 28", keywords: "培训|教师|学习|研修", header: "magazine", heading: "split", paragraph: "magazine", image: "framed", group: "grid", footer: "badge" },
  { id: "moral-flag", label: "排版 29", keywords: "德育|少先队|升旗|班会", header: "band", heading: "band", paragraph: "band", image: "framed", group: "grid", footer: "badge" },
  { id: "moral-practice", label: "排版 30", keywords: "志愿|文明|劳动|实践|研学", header: "center", heading: "timeline", paragraph: "timeline", image: "framed", group: "grid", footer: "soft" },
  { id: "admission-guide", label: "排版 31", keywords: "招生|报名|入学|开放日", header: "cover", heading: "badge", paragraph: "card", image: "featured", group: "grid", footer: "soft" },
  { id: "admission-qa", label: "排版 32", keywords: "招生|报名|咨询|答疑|指南", header: "compact", heading: "left", paragraph: "plain-box", image: "full", group: "grid", footer: "line" },
  { id: "party-report", label: "排版 33", keywords: "党建|党支部|党员|主题党日|思政", header: "formal", heading: "line", paragraph: "formal", image: "full", group: "grid", footer: "line" },
  { id: "exam-arrange", label: "排版 34", keywords: "考试|考务|期中|期末|测评", header: "compact", heading: "left", paragraph: "plain-box", image: "full", group: "grid", footer: "line" },
  { id: "holiday-guide", label: "排版 35", keywords: "放假|假期|寒假|暑假|节日", header: "soft", heading: "soft", paragraph: "card", image: "soft", group: "grid", footer: "soft" },
  { id: "weekly-news", label: "排版 36", keywords: "周报|简报|动态|新闻|回顾", header: "magazine", heading: "split", paragraph: "magazine", image: "framed", group: "grid", footer: "badge" },
  { id: "class-gallery", label: "排版 37", keywords: "班级|风采|展示|成长|瞬间", header: "center", heading: "photo", paragraph: "card", image: "featured", group: "grid", footer: "badge" },
  { id: "reading-journal", label: "排版 38", keywords: "阅读|读书|书香|诵读|经典", header: "minimal", heading: "quiet", paragraph: "clean", image: "full", group: "grid", footer: "line" },
  { id: "health-care", label: "排版 39", keywords: "健康|心理|卫生|疾病|预防", header: "soft", heading: "soft", paragraph: "card", image: "soft", group: "grid", footer: "soft" },
  { id: "science-lab", label: "排版 40", keywords: "科技|科学|实验|创客|人工智能", header: "band", heading: "split", paragraph: "band", image: "framed", group: "grid", footer: "badge" },
  { id: "sports-meet", label: "排版 41", keywords: "运动会|体育|比赛|足球|篮球", header: "cover", heading: "photo", paragraph: "fresh", image: "featured", group: "grid", footer: "badge" },
  { id: "arts-stage", label: "排版 42", keywords: "艺术|美育|音乐|舞蹈|绘画|展演", header: "cover", heading: "photo", paragraph: "soft-card", image: "featured", group: "grid", footer: "badge" },
  { id: "graduation-ceremony", label: "排版 43", keywords: "毕业|典礼|青春|成长|仪式", header: "cover", heading: "badge", paragraph: "card", image: "featured", group: "grid", footer: "badge" },
  { id: "research-achievement", label: "排版 44", keywords: "成果|展示|荣誉|课题|质量", header: "magazine", heading: "split", paragraph: "magazine", image: "framed", group: "grid", footer: "badge" },
  { id: "kindergarten-play", label: "排版 45", keywords: "幼儿|幼儿园|亲子|宝贝|童年", header: "soft", heading: "soft", paragraph: "card", image: "soft", group: "grid", footer: "soft" },
  { id: "parent-school", label: "排版 46", keywords: "家校|家长会|共育|家庭教育", header: "soft", heading: "left", paragraph: "card", image: "soft", group: "grid", footer: "soft" },
  { id: "inspection-report", label: "排版 47", keywords: "检查|督导|调研|评估|验收", header: "formal", heading: "line", paragraph: "formal", image: "full", group: "grid", footer: "line" },
  { id: "meeting-minutes", label: "排版 48", keywords: "会议|部署|推进|工作会|总结", header: "formal", heading: "line", paragraph: "formal", image: "full", group: "grid", footer: "line" },
  { id: "campus-feature", label: "排版 49", keywords: "专题|校园|特色|文化|品牌", header: "magazine", heading: "split", paragraph: "magazine", image: "framed", group: "grid", footer: "badge" },
  { id: "photo-wall", label: "排版 50", keywords: "图片|照片|现场|合集|展示", header: "center", heading: "photo", paragraph: "card", image: "featured", group: "grid", footer: "badge" }
);

const PROFILE_RULES = [
  ["honor", /喜报|获奖|荣获|表彰|荣誉|一等奖|二等奖|三等奖|冠军|优秀|证书|奖状/],
  ["menu", /菜谱|食谱|菜品|用餐|膳食|餐|营养/],
  ["emergency", /紧急|预警|停课|防汛|极端天气|重要提醒/],
  ["holiday", /放假|假期|寒假|暑假|元旦|春节|中秋|国庆|端午/],
  ["notice", /通知|公告|公示|安排|开学|家长|提醒|须知|告家长书/],
  ["admission", /招生|报名|入学|校园开放|开放日|幼升小|小升初/],
  ["safety", /安全|防溺水|消防|交通|法治|普法|演练/],
  ["party", /党建|党支部|党员|主题党日|廉洁|思政/],
  ["teaching", /教研|课堂|课程|教学|公开课|教师|培训|学习|课题|质量|听评课|研修/],
  ["moral", /少先队|德育|班会|志愿|文明|劳动|升旗|团委|实践|研学/],
  ["sports", /运动|体育|比赛|运动会|足球|篮球|体质|竞赛/],
  ["arts", /艺术|美育|音乐|舞蹈|绘画|展演|朗诵|合唱/],
  ["reading", /阅读|读书|书香|图书|经典|诵读/],
  ["science", /科技|科学|创新|实验|信息|人工智能|机器人|创客/],
  ["health", /心理|健康|卫生|疾病|预防|体检|爱眼|护牙|防艾/],
  ["graduation", /毕业|典礼|青春|仪式/],
  ["kindergarten", /幼儿|幼儿园|亲子|宝贝|童年/],
  ["parent", /家校|家长会|共育|家庭教育|沟通/],
  ["photo", /照片|图片|现场|掠影|剪影|合集/],
  ["inspection", /检查|督导|调研|评估|验收/],
  ["meeting", /会议|工作会|部署|推进|总结/],
  ["news", /简报|动态|新闻|周报|快讯|回顾|报道/],
  ["showcase", /简介|风采|成果|展示|特色|品牌|案例/],
];

const PROFILE_DEFAULTS = {
  honor: { themeId: "honor-redgold", decorationId: "honor-ribbon", layoutId: "honor-cover" },
  menu: { themeId: "menu-xiumi", decorationId: "menu-plate", layoutId: "menu-weekly" },
  emergency: { themeId: "emergency-clear", decorationId: "safety-alert", layoutId: "safety-warning" },
  holiday: { themeId: "holiday-warm", decorationId: "holiday-lantern", layoutId: "holiday-guide" },
  notice: { themeId: "notice-red", decorationId: "notice-seal", layoutId: "notice-redhead" },
  admission: { themeId: "admission-bright", decorationId: "admission-gate", layoutId: "admission-guide" },
  safety: { themeId: "safety-blue", decorationId: "safety-shield", layoutId: "safety-manual" },
  party: { themeId: "party-classic", decorationId: "party-banner", layoutId: "party-report" },
  teaching: { themeId: "teaching-blue", decorationId: "teaching-grid", layoutId: "teaching-paper" },
  moral: { themeId: "moral-red", decorationId: "moral-flag", layoutId: "moral-practice" },
  sports: { themeId: "competition-energy", decorationId: "sports-lane", layoutId: "sports-meet" },
  arts: { themeId: "art-stage", decorationId: "arts-frame", layoutId: "arts-stage" },
  reading: { themeId: "reading-warm", decorationId: "reading-bookmark", layoutId: "reading-journal" },
  science: { themeId: "science-dark", decorationId: "science-chip", layoutId: "science-lab" },
  health: { themeId: "health-clean", decorationId: "health-cross", layoutId: "health-care" },
  graduation: { themeId: "graduation-blue", decorationId: "graduation-arch", layoutId: "graduation-ceremony" },
  kindergarten: { themeId: "kindergarten-soft", decorationId: "class-smile", layoutId: "kindergarten-play" },
  parent: { themeId: "parent-tea", decorationId: "parent-note", layoutId: "parent-school" },
  photo: { themeId: "campus-photo", decorationId: "photo-album", layoutId: "activity-album" },
  inspection: { themeId: "exam-focus", decorationId: "exam-blueprint", layoutId: "inspection-report" },
  meeting: { themeId: "campus-classic", decorationId: "weekly-column", layoutId: "meeting-minutes" },
  news: { themeId: "newsletter-bright", decorationId: "weekly-column", layoutId: "weekly-news" },
  showcase: { themeId: "achievement-modern", decorationId: "admission-sign", layoutId: "research-achievement" },
};

function articleStats(article) {
  return {
    imageCount: (article.sections || []).reduce((sum, item) => sum + (item.type === "imageGroup" ? (item.images || []).length : item.type === "image" ? 1 : 0), 0),
    paragraphCount: (article.sections || []).filter((item) => item.type === "paragraph").length,
  };
}

function articleProfile(article, text = articleText(article)) {
  const stats = articleStats(article);
  if (stats.imageCount >= 8) return "photo";
  if (stats.paragraphCount >= 9 && stats.imageCount <= 2) return "text-heavy";
  const match = PROFILE_RULES.find(([, pattern]) => pattern.test(text));
  return match ? match[0] : "auto";
}

function stableHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function decorationScheme(article, theme) {
  const explicit = DECORATION_SCHEMES.find((scheme) => scheme.id === article.decorationId);
  if (explicit) return explicit;
  const text = articleText(article, theme);
  const profiled = PROFILE_DEFAULTS[articleProfile(article, text)]?.decorationId;
  const profiledDecoration = DECORATION_SCHEMES.find((scheme) => scheme.id === profiled);
  if (profiledDecoration) return profiledDecoration;
  const index = stableHash(text) % DECORATION_SCHEMES.length;
  return DECORATION_SCHEMES[index];
}

function layoutById(id) {
  return LAYOUT_SCHEMES.find((layout) => layout.id === id);
}

function articleText(article, theme = {}) {
  return `${article.title || ""} ${article.subtitle || ""} ${article.intro || ""} ${theme.name || ""} ${(article.sections || [])
    .map((item) => item.text || "")
    .join(" ")}`;
}

function layoutScheme(article, theme) {
  const explicit = layoutById(article.layoutId);
  if (explicit && explicit.id !== "auto") return explicit;
  const text = articleText(article, theme);
  const profiled = PROFILE_DEFAULTS[articleProfile(article, text)]?.layoutId;
  const profiledLayout = layoutById(profiled);
  if (profiledLayout) return profiledLayout;
  return LAYOUT_SCHEMES.find((layout) => layout.keywords && new RegExp(layout.keywords).test(text)) || LAYOUT_SCHEMES[0];
}

function stableDecoration(article, theme, variant = "full") {
  const scheme = decorationScheme(article, theme);
  const safeDecorations = {
    full: ["● ━━━━━ ● ━━━━━ ●", "◆ ───── ◆ ───── ◆", "■ ━━━━━ ■ ━━━━━ ■", "○ · · · ○ · · · ○", "★ ━━━━━ ★ ━━━━━ ★"],
    short: ["━━━━━━ ● ━━━━━━", "──── ◆ ────", "━━━━ ■ ━━━━", "· · ○ · ·", "━━━━ ★ ━━━━"],
    top: ["● ● ●", "◆ ◆ ◆", "■ ■ ■", "○ ○ ○", "★ ★ ★"],
  };
  const pool = safeDecorations[variant] || safeDecorations.full;
  const text = pool[stableHash(`${scheme.id}-${variant}`) % pool.length];
  const margin = variant === "short" ? "0 0 12px" : "12px 0 0";
  const color = variant === "top" ? theme.gold : variant === "short" ? theme.gold : theme.accent;
  const size = variant === "top" ? "18px" : "14px";
  if (scheme.id === "square-line" || scheme.id === "science") {
    return `<section style="margin:${margin};text-align:center;">
      <span style="display:inline-block;width:20px;height:8px;background:${theme.accent};vertical-align:middle;"></span>
      <span style="display:inline-block;width:86px;height:1px;background:${theme.border};vertical-align:middle;"></span>
      <span style="display:inline-block;margin:0 8px;color:${theme.title};font-size:${size};white-space:pre-wrap;line-height:1.5;font-weight:700;">${esc(text)}</span>
      <span style="display:inline-block;width:86px;height:1px;background:${theme.border};vertical-align:middle;"></span>
      <span style="display:inline-block;width:20px;height:8px;background:${theme.gold};vertical-align:middle;"></span>
    </section>`;
  }
  if (scheme.id === "bookish" || scheme.id === "teaching") {
    return `<section style="margin:${margin};padding:8px 12px;text-align:center;background:${theme.warm};border-left:4px solid ${theme.accent};border-right:4px solid ${theme.accent};color:${readableText(theme.warm, theme.title)};font-size:${size};white-space:pre-wrap;line-height:1.6;">${esc(text)}</section>`;
  }
  if (scheme.id === "notice" || scheme.id === "parent" || scheme.id === "safety") {
    return `<section style="margin:${margin};padding:7px 12px;text-align:center;background:${theme.accentSoft};border:1px dashed ${theme.accent};color:${readableText(theme.accentSoft, theme.title)};font-size:${size};white-space:pre-wrap;line-height:1.6;font-weight:700;">${esc(text)}</section>`;
  }
  if (scheme.id === "menu" || scheme.id === "warm") {
    return `<section style="margin:${margin};text-align:center;">
      <span style="display:inline-block;padding:7px 18px;background:${theme.warmDeep};border:1px solid ${theme.border};border-radius:999px;color:${readableText(theme.warmDeep, theme.title)};font-size:${size};white-space:pre-wrap;line-height:1.5;font-weight:700;">${esc(text)}</span>
    </section>`;
  }
  if (scheme.id === "sports") {
    return `<section style="margin:${margin};text-align:center;color:${color};font-size:${size};white-space:pre-wrap;line-height:1.5;">
      <span style="display:inline-block;width:34px;height:2px;background:${theme.accent};vertical-align:middle;"></span>
      <span style="display:inline-block;margin:0 8px;padding:3px 10px;border:1px solid ${theme.accent};border-radius:999px;">${esc(text)}</span>
      <span style="display:inline-block;width:34px;height:2px;background:${theme.accent};vertical-align:middle;"></span>
    </section>`;
  }
  if (scheme.id === "arts" || scheme.id === "diamond-line") {
    return `<p style="margin:${margin};text-align:center;color:${color};font-size:${size};white-space:pre-wrap;line-height:1.7;">◆　${esc(text)}　◆</p>`;
  }
  return `<p style="margin:${margin};text-align:center;color:${color};font-size:${size};white-space:pre-wrap;line-height:1.5;">${esc(text)}</p>`;
}

function headerHtml(article, theme, layout, decoration, editable, decorated, bits, fonts) {
  const titleFonts = fontScale(article, "title");
  const subtitleFonts = fontScale(article, "subtitle");
  const safeBody = readableText(theme.warm, theme.body);
  const safeSoftTitle = readableText(theme.accentSoft, theme.title);
  const safeWarmTitle = readableText(theme.warm, theme.title);
  const safeMuted = readableText("#ffffff", theme.muted, 3.2);
  const subtitleHtml = article.subtitle
    ? `<p ${editable ? editableAttrs("subtitle") : ""} style="margin:14px auto 0;color:${safeMuted};font-size:${px(subtitleFonts.subtitle)};white-space:pre-wrap;line-height:1.85;max-width:590px;">${esc(article.subtitle)}</p>`
    : "";
  const titleAttrs = editable ? editableAttrs("title") : "";
  const baseTitle = `margin:0 auto;color:${theme.title};font-size:${px(titleFonts.title)};white-space:pre-wrap;line-height:1.4;font-weight:800;letter-spacing:0;max-width:590px;`;
  const themeFamily = theme.name || "";
  if (/honor/.test(layout.id)) {
    return `<section style="margin:0 0 26px;padding:30px 18px 28px;text-align:center;background:${theme.warm};border:2px solid ${theme.gold};box-shadow:inset 0 0 0 6px #ffffff;">
      ${decorated ? bits.top : ""}
      <div style="width:92px;height:6px;margin:12px auto 14px;background:${theme.accent};"></div>
      <h1 ${titleAttrs} style="${baseTitle}color:${safeWarmTitle};font-size:${px(titleFonts.title + 3)};">${esc(article.title)}</h1>
      ${subtitleHtml}
      <div style="width:70%;height:1px;margin:18px auto 0;background:${theme.gold};"></div>
    </section>`;
  }
  if (/menu/.test(layout.id)) {
    return `<section style="margin:0 0 24px;padding:0;text-align:center;background:${theme.accentSoft};border:1px solid ${theme.border};border-radius:18px;overflow:hidden;">
      <div style="height:14px;background:${theme.accent};"></div>
      <div style="padding:26px 18px 26px;background:${theme.accentSoft};">
        ${decorated ? bits.top : ""}
        <div style="display:inline-block;width:78px;height:10px;margin:0 auto 14px;background:${theme.gold};border-radius:999px;"></div>
        <h1 ${titleAttrs} style="${baseTitle}font-size:${px(titleFonts.title + 2)};color:${safeSoftTitle};">${esc(article.title)}</h1>
        ${subtitleHtml}
      </div>
      <div style="height:10px;background:${theme.warmDeep};border-top:1px solid ${theme.border};"></div>
    </section>`;
  }
  if (/notice|safety|exam|inspection|meeting|party/.test(layout.id)) {
    return `<section style="margin:0 0 24px;padding:26px 0 20px;text-align:left;border-top:6px solid ${theme.accent};border-bottom:2px solid ${theme.accent};background:#ffffff;">
      <div style="width:88px;height:5px;margin:0 0 14px;background:${theme.gold};"></div>
      <h1 ${titleAttrs} style="${baseTitle}margin:0;color:${theme.title};font-size:${px(titleFonts.title)};text-align:left;">${esc(article.title)}</h1>
      ${subtitleHtml}
      ${decorated ? bits.short : ""}
    </section>`;
  }
  if (/photo|album|gallery|sports|arts/.test(layout.id)) {
    return `<section style="margin:0 0 26px;padding:30px 18px 24px;text-align:left;background:#ffffff;border:1px solid ${theme.border};border-left:10px solid ${theme.accent};">
      <div style="width:48px;height:48px;margin:0 0 14px;background:${theme.accentSoft};border:8px solid ${theme.warm};"></div>
      <h1 ${titleAttrs} style="${baseTitle}margin:0;color:${theme.title};font-size:${px(titleFonts.title + 3)};text-align:left;">${esc(article.title)}</h1>
      ${subtitleHtml}
      ${decorated ? bits.full : ""}
    </section>`;
  }
  if (/science|teaching|reading/.test(layout.id)) {
    return `<section style="margin:0 0 25px;padding:28px 18px 24px;text-align:left;background:${theme.accentSoft};border-top:1px solid ${theme.border};border-bottom:1px solid ${theme.border};">
      <div style="width:100%;height:8px;margin:0 0 18px;background:${theme.accent};box-shadow:64px 0 0 ${theme.gold};"></div>
      <h1 ${titleAttrs} style="${baseTitle}margin:0;color:${safeSoftTitle};font-size:${px(titleFonts.title + 1)};text-align:left;">${esc(article.title)}</h1>
      ${subtitleHtml}
    </section>`;
  }
  if (/safety|notice/.test(themeFamily) && layout.header === "center") {
    return `<section style="margin:0 0 22px;padding:26px 0 20px;text-align:left;border-top:5px solid ${theme.accent};border-bottom:1px solid ${theme.border};">
      <div style="width:72px;height:5px;margin:0 0 14px;background:${theme.accent};"></div>
      <h1 ${titleAttrs} style="${baseTitle}margin:0;color:${theme.title};font-size:${px(titleFonts.title)};text-align:left;">${esc(article.title)}</h1>
      ${subtitleHtml}
      ${decorated ? bits.short : ""}
    </section>`;
  }
  if (/menu|health|parent|kindergarten/.test(themeFamily) && layout.header === "center") {
    return `<section style="margin:0 0 24px;padding:28px 18px 24px;text-align:center;background:${theme.warm};border:1px solid ${theme.border};border-radius:20px;">
      ${decorated ? bits.top : ""}
      <div style="width:78px;height:10px;margin:0 auto 14px;background:${theme.gold};border-radius:999px;"></div>
      <h1 ${titleAttrs} style="${baseTitle}color:${safeWarmTitle};font-size:${px(titleFonts.title + 1)};">${esc(article.title)}</h1>
      ${subtitleHtml}
    </section>`;
  }
  if (/sports|arts|showcase|graduation|festival/.test(themeFamily) && layout.header === "center") {
    return `<section style="margin:0 0 24px;padding:30px 18px 24px;text-align:center;border:1px solid ${theme.border};background:#fff;">
      <div style="height:10px;background:${theme.accent};margin:-30px -18px 20px;"></div>
      <div style="width:68px;height:6px;margin:0 auto 14px;background:${theme.gold};"></div>
      <h1 ${titleAttrs} style="${baseTitle}font-size:${px(titleFonts.title + 2)};">${esc(article.title)}</h1>
      ${subtitleHtml}
      ${decorated ? bits.full : ""}
    </section>`;
  }
  if (/teaching|reading|research|science/.test(themeFamily) && layout.header === "center") {
    return `<section style="margin:0 0 24px;padding:28px 0 20px;text-align:left;border-left:8px solid ${theme.accent};border-bottom:1px solid ${theme.border};">
      <div style="padding-left:16px;">
        <div style="width:72px;height:4px;margin:0 0 14px;background:${theme.gold};"></div>
        <h1 ${titleAttrs} style="${baseTitle}margin:0;color:${theme.title};font-size:${px(titleFonts.title + 1)};text-align:left;">${esc(article.title)}</h1>
        ${subtitleHtml}
      </div>
    </section>`;
  }
  if (layout.header === "cover") {
    return `<section style="margin:0 0 24px;padding:34px 18px 30px;text-align:center;background:${theme.warm};border:1px solid ${theme.border};border-top:6px solid ${theme.accent};">
      ${decorated ? bits.top : ""}
      <div style="width:78px;height:6px;margin:12px auto 14px;background:${theme.gold};border-radius:999px;"></div>
      <h1 ${titleAttrs} style="${baseTitle}color:${safeWarmTitle};font-size:${px(titleFonts.title + 2)};">${esc(article.title)}</h1>
      ${subtitleHtml}
      ${decorated ? bits.full : ""}
    </section>`;
  }
  if (layout.header === "compact") {
    return `<section style="margin:0 0 18px;padding:24px 0 18px;text-align:left;border-bottom:2px solid ${theme.accent};">
      <div style="width:64px;height:4px;margin:0 0 12px;background:${theme.accent};"></div>
      <h1 ${titleAttrs} style="${baseTitle}color:${theme.title};font-size:${px(titleFonts.title - 2)};text-align:left;">${esc(article.title)}</h1>
      ${subtitleHtml}
    </section>`;
  }
  if (layout.header === "magazine") {
    return `<section style="margin:0 0 24px;padding:28px 0 22px;text-align:left;border-top:8px solid ${theme.accent};border-bottom:1px solid ${theme.border};">
      ${decorated ? bits.top : ""}
      <h1 ${titleAttrs} style="${baseTitle}font-size:${px(titleFonts.title + 3)};text-align:left;">${esc(article.title)}</h1>
      ${subtitleHtml}
      ${decorated ? bits.short : ""}
    </section>`;
  }
  if (layout.header === "menu") {
    return `<section style="margin:0 0 22px;padding:34px 16px 30px;text-align:center;background:${theme.accentSoft};border:1px solid ${theme.border};border-radius:0 0 22px 22px;">
      ${decorated ? bits.top : ""}
      <div style="margin:0 auto 16px;width:86%;height:12px;background:${theme.warmDeep};border:1px solid ${theme.border};border-radius:999px;"></div>
      <h1 ${titleAttrs} style="${baseTitle}font-size:${px(titleFonts.title + 1)};color:${safeSoftTitle};">${esc(article.title)}</h1>
      ${subtitleHtml}
      ${decorated ? bits.full : ""}
    </section>`;
  }
  if (layout.header === "formal") {
    return `<section style="margin:0 0 22px;padding:30px 0 20px;text-align:center;border-top:4px solid ${theme.accent};border-bottom:2px solid ${theme.accent};">
      <h1 ${titleAttrs} style="${baseTitle}">${esc(article.title)}</h1>
      ${subtitleHtml}
      ${decorated ? bits.short : ""}
    </section>`;
  }
  if (layout.header === "soft") {
    return `<section style="margin:0 0 24px;padding:30px 18px 26px;text-align:center;background:${theme.warm};border:1px solid ${theme.border};border-radius:18px;">
      ${decorated ? bits.top : ""}
      <h1 ${titleAttrs} style="${baseTitle}color:${safeWarmTitle};">${esc(article.title)}</h1>
      ${subtitleHtml}
    </section>`;
  }
  if (layout.header === "band") {
    return `<section style="margin:0 0 24px;padding:0;text-align:center;background:${theme.warm};border:1px solid ${theme.border};">
      <div style="height:12px;background:${theme.accent};"></div>
      <div style="padding:28px 18px 24px;">
        <h1 ${titleAttrs} style="${baseTitle}color:${safeWarmTitle};">${esc(article.title)}</h1>
        ${subtitleHtml}
        ${decorated ? bits.full : ""}
      </div>
    </section>`;
  }
  if (layout.header === "minimal") {
    return `<section style="margin:0 0 22px;padding:28px 0 16px;text-align:center;border-bottom:1px solid ${theme.border};">
      <h1 ${titleAttrs} style="${baseTitle}font-size:${px(titleFonts.title - 1)};">${esc(article.title)}</h1>
      ${subtitleHtml}
    </section>`;
  }
  return `<section style="padding:30px 0 18px;text-align:center;border-bottom:2px solid ${theme.accent};background:transparent;">
    ${decorated ? bits.top : ""}
    <div style="margin:0 auto 12px;width:54px;height:4px;background:${theme.gold};border-radius:2px;"></div>
    <h1 ${titleAttrs} style="${baseTitle}font-size:${px(titleFonts.title - 1)};">${esc(article.title)}</h1>
    ${subtitleHtml}
    ${decorated ? bits.full : ""}
  </section>`;
}

function introHtml(article, theme, layout, decoration, editable, fonts) {
  if (!article.intro) return "";
  const introFonts = fontScale(article, "intro");
  const bg = layout.paragraph === "clean" ? "#ffffff" : theme.warm;
  const textColor = readableText(bg, theme.body);
  const style = layout.paragraph === "clean" ? "background:#fff;border-bottom:1px solid " + theme.border : `background:${theme.warm};border:1px solid ${theme.border};border-left:5px solid ${theme.accent}`;
  return `<section style="margin:22px 0 28px;padding:18px 18px;${style};">
    <p ${editable ? editableAttrs("intro") : ""} style="margin:0;color:${textColor};font-size:${px(introFonts.body)};white-space:pre-wrap;line-height:1.95;text-align:justify;text-indent:2em;">${esc(article.intro)}</p>
  </section>`;
}

function headingHtml(item, index, theme, layout, decoration, editable, decorated, bits, fonts) {
  const itemFonts = fontScale({ fontSizes: item.fontSizes }, "text");
  const accentText = readableText(theme.accent, "#ffffff", 4);
  const softTitle = readableText(theme.accentSoft, theme.title);
  const textAttrs = editable ? editableAttrs(`sections.${index}.text`) : "";
  const text = `<span ${textAttrs} style="display:inline-block;font-size:${px(itemFonts.heading - 2)};font-weight:800;white-space:pre-wrap;line-height:1.5;color:${accentText};vertical-align:middle;">${esc(item.text)}</span>`;
  const scheme = decoration.heading;
  if (layout.heading === "badge") {
    return `<section style="margin:34px 0 0;text-align:center;">
      ${decorated ? bits.short : ""}
      <div style="display:inline-block;max-width:100%;padding:8px 18px;background:${theme.accent};border:2px solid #ffffff;border-radius:18px;box-shadow:0 0 0 1px ${theme.border};">
        ${text}
      </div>
    </section>`;
  }
  if (layout.heading === "left") {
    return `<section style="margin:30px 0 0;padding:0 0 10px;text-align:left;border-bottom:1px solid ${theme.border};">
      <span ${textAttrs} style="color:${theme.title};font-size:${px(itemFonts.heading - 1)};font-weight:800;white-space:pre-wrap;line-height:1.5;">${esc(item.text)}</span>
    </section>`;
  }
  if (layout.heading === "photo") {
    return `<section style="margin:34px 0 0;text-align:left;">
      <span style="display:inline-block;width:18px;height:18px;background:${theme.accent};border-radius:50%;vertical-align:middle;"></span>
      <span ${textAttrs} style="display:inline-block;margin-left:10px;color:${theme.title};font-size:${px(itemFonts.heading + 1)};font-weight:900;white-space:pre-wrap;line-height:1.5;vertical-align:middle;">${esc(item.text)}</span>
      <div style="height:6px;margin:10px 0 0 28px;background:${theme.accentSoft};border-left:60px solid ${theme.gold};"></div>
    </section>`;
  }
  if (layout.heading === "soft") {
    return `<section style="margin:34px 0 0;text-align:center;">
      <div style="display:inline-block;max-width:100%;padding:10px 18px;background:${theme.warm};border:1px solid ${theme.border};border-radius:999px;color:${theme.title};">
        <span ${textAttrs} style="font-size:${px(itemFonts.heading - 1)};font-weight:900;">${esc(item.text)}</span>
      </div>
    </section>`;
  }
  if (layout.heading === "timeline" || scheme === "left-block") {
    return `<section style="margin:32px 0 0;padding:0 0 0 14px;border-left:4px solid ${theme.accent};">
      <div style="display:inline-block;padding:7px 14px;background:${theme.accent};color:${accentText};">${text}</div>
    </section>`;
  }
  if (scheme === "bracket") {
    return `<section style="margin:34px 0 0;text-align:center;">
      <span style="display:inline-block;color:${theme.gold};font-size:26px;white-space:pre-wrap;line-height:1;vertical-align:middle;">【</span>
      <span ${textAttrs} style="display:inline-block;margin:0 8px;color:${theme.title};font-size:${px(itemFonts.heading)};font-weight:900;white-space:pre-wrap;line-height:1.5;vertical-align:middle;">${esc(item.text)}</span>
      <span style="display:inline-block;color:${theme.gold};font-size:26px;white-space:pre-wrap;line-height:1;vertical-align:middle;">】</span>
    </section>`;
  }
  if (scheme === "book") {
    return `<section style="margin:34px 0 0;padding:10px 14px;background:${theme.warm};border-left:6px double ${theme.accent};border-right:1px solid ${theme.border};">
      <span ${textAttrs} style="color:${readableText(theme.warm, theme.title)};font-size:${px(itemFonts.heading)};font-weight:900;white-space:pre-wrap;line-height:1.5;">${esc(item.text)}</span>
    </section>`;
  }
  if (scheme === "notice") {
    return `<section style="margin:34px 0 0;padding:9px 12px;background:${theme.accentSoft};border:1px dashed ${theme.accent};text-align:left;">
      <span ${textAttrs} style="color:${softTitle};font-size:${px(itemFonts.heading - 1)};font-weight:900;">${esc(item.text)}</span>
    </section>`;
  }
  if (scheme === "leaf" || scheme === "warm") {
    return `<section style="margin:34px 0 0;text-align:center;">
      <span style="display:inline-block;width:34px;height:10px;background:${theme.gold};border-radius:999px 0 999px 0;vertical-align:middle;"></span>
      <span ${textAttrs} style="display:inline-block;margin:0 10px;color:${theme.title};font-size:${px(itemFonts.heading)};font-weight:900;white-space:pre-wrap;line-height:1.5;vertical-align:middle;">${esc(item.text)}</span>
      <span style="display:inline-block;width:34px;height:10px;background:${theme.accent};border-radius:0 999px 0 999px;vertical-align:middle;"></span>
    </section>`;
  }
  if (scheme === "track") {
    return `<section style="margin:34px 0 0;padding:8px 0;border-top:2px solid ${theme.accent};border-bottom:2px solid ${theme.accent};">
      <span ${textAttrs} style="color:${theme.title};font-size:${px(itemFonts.heading)};font-weight:900;">${esc(item.text)}</span>
    </section>`;
  }
  if (scheme === "gallery") {
    return `<section style="margin:34px 0 0;text-align:center;">
      <span ${textAttrs} style="display:inline-block;padding:9px 18px;background:#fff;border:1px solid ${theme.border};border-bottom:5px solid ${theme.accent};color:${theme.title};font-size:${px(itemFonts.heading)};font-weight:900;">${esc(item.text)}</span>
    </section>`;
  }
  if (layout.heading === "line" || scheme === "classic") {
    return `<section style="margin:34px 0 0;padding:0 0 11px;border-bottom:2px solid ${theme.border};">
      <span ${textAttrs} style="display:inline-block;color:${theme.title};font-size:${px(itemFonts.heading - 1)};font-weight:800;white-space:pre-wrap;line-height:1.5;">${esc(item.text)}</span>
    </section>`;
  }
  if (layout.heading === "menu" || scheme === "menu-tab") {
    return `<section style="margin:34px 0 0;text-align:center;">
      ${decorated ? bits.short : ""}
      <div style="display:inline-block;max-width:100%;padding:8px 18px;background:${theme.accent};border:2px solid #ffffff;border-radius:999px;">
        ${text}
      </div>
    </section>`;
  }
  if (layout.heading === "split" || scheme === "square-band") {
    return `<section style="margin:34px 0 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:10px;background:${theme.accent};padding:0;"></td>
          <td style="background:${theme.accentSoft};border:1px solid ${theme.border};border-left:0;padding:9px 12px;color:${softTitle};font-size:${px(itemFonts.heading - 2)};font-weight:800;">${esc(item.text)}</td>
        </tr>
      </table>
    </section>`;
  }
  if (layout.heading === "band" || scheme === "warning" || scheme === "stamp") {
    return `<section style="margin:34px 0 0;padding:11px 12px;background:${theme.accent};color:#fff;text-align:center;box-shadow:inset 0 -4px 0 ${theme.gold};">
      ${text}
    </section>`;
  }
  if (layout.heading === "quiet" || scheme === "quiet") {
    return `<section style="margin:34px 0 0;text-align:left;">
      <p style="margin:0 0 8px;color:${theme.gold};font-size:14px;white-space:pre-wrap;line-height:1.6;">${decorated ? bits.short : ""}</p>
      <h2 ${textAttrs} style="margin:0;color:${theme.title};font-size:${px(itemFonts.heading)};white-space:pre-wrap;line-height:1.5;font-weight:800;">${esc(item.text)}</h2>
    </section>`;
  }
  return `<section style="margin:34px 0 0;text-align:center;">
    ${decorated ? bits.short : ""}
    <section style="display:inline-block;max-width:100%;padding:8px 18px;background:${theme.accent};border:2px solid #ffffff;border-radius:18px;">
      ${text}
    </section>
  </section>`;
}

function paragraphHtml(item, index, theme, layout, decoration, editable, fonts) {
  const itemFonts = fontScale({ fontSizes: item.fontSizes }, "text");
  const attrs = editable ? editableAttrs(`sections.${index}.text`) : "";
  const variant = layout.paragraph === "timeline" ? "timeline" : decoration.paragraph;
  const textOn = (bg) => readableText(bg, theme.body);
  const paragraph = (bg, extra = "") => `<p ${attrs} style="margin:0;color:${textOn(bg)};font-size:${px(itemFonts.body)};white-space:pre-wrap;line-height:2;text-align:justify;text-indent:2em;${extra}">${esc(item.text)}</p>`;
  if (/honor/.test(layout.id)) {
    return `<section style="margin:16px 0 0;padding:18px 18px;background:${theme.warm};border:1px solid ${theme.gold};box-shadow:inset 0 5px 0 ${theme.gold};">${paragraph(theme.warm)}</section>`;
  }
  if (/menu/.test(layout.id)) {
    return `<section style="margin:14px 0 0;padding:0;background:${theme.warm};border:1px solid ${theme.border};border-radius:18px;overflow:hidden;">
      <div style="height:10px;background:${theme.gold};"></div>
      <div style="padding:17px 18px;">${paragraph(theme.warm)}</div>
    </section>`;
  }
  if (/notice|safety|exam|inspection|meeting|party/.test(layout.id)) {
    return `<section style="margin:14px 0 0;padding:16px 18px;background:#ffffff;border-left:6px solid ${theme.accent};border-top:1px solid ${theme.border};border-bottom:1px solid ${theme.border};">${paragraph("#ffffff")}</section>`;
  }
  if (/photo|album|gallery|sports|arts/.test(layout.id)) {
    return `<section style="margin:14px 0 0;padding:16px 18px;background:${theme.accentSoft};border:0;border-radius:0 22px 0 22px;">${paragraph(theme.accentSoft)}</section>`;
  }
  if (/science|teaching|reading/.test(layout.id)) {
    return `<section style="margin:14px 0 0;padding:0;background:#ffffff;border:1px solid ${theme.border};">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
        <tr><td style="width:12px;background:${theme.accent};"></td><td style="padding:16px 18px;">${paragraph("#ffffff")}</td></tr>
      </table>
    </section>`;
  }
  if (layout.paragraph === "magazine") {
    return `<section style="margin:16px 0 0;padding:0 0 14px;border-bottom:1px solid ${theme.border};">
      <div style="height:5px;width:54px;background:${theme.accent};margin:0 0 12px;"></div>
      ${paragraph("#ffffff")}
    </section>`;
  }
  if (layout.paragraph === "menu") {
    return `<section style="margin:14px 0 0;padding:16px 18px;background:${theme.warm};border:1px solid ${theme.border};border-radius:16px;">
      <div style="height:8px;width:68px;background:${theme.gold};border-radius:999px;margin:0 0 10px;"></div>
      ${paragraph(theme.warm)}
    </section>`;
  }
  if (layout.paragraph === "formal") {
    return `<section style="margin:12px 0 0;padding:14px 4px;border-top:1px solid ${theme.border};border-bottom:1px solid ${theme.border};">${paragraph("#ffffff")}</section>`;
  }
  if (layout.paragraph === "band") {
    return `<section style="margin:14px 0 0;padding:0;background:${theme.accentSoft};border:1px solid ${theme.border};">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:10px;background:${theme.accent};"></td>
          <td style="padding:16px 16px;">${paragraph(theme.accentSoft)}</td>
        </tr>
      </table>
    </section>`;
  }
  if (layout.paragraph === "plain-box") {
    return `<section style="margin:14px 0 0;padding:16px 18px;background:#fff;border:1px dashed ${theme.border};">${paragraph("#ffffff")}</section>`;
  }
  if (layout.paragraph === "card") {
    return `<section style="margin:14px 0 0;padding:17px 18px;background:${theme.warm};border:1px solid ${theme.border};box-shadow:inset 4px 0 0 ${theme.gold};">${paragraph(theme.warm)}</section>`;
  }
  if (layout.paragraph === "clean") {
    return `<section style="margin:14px 0 0;padding:0 2px 12px;border-bottom:1px solid ${theme.border};">${paragraph("#ffffff")}</section>`;
  }
  if (variant === "timeline") {
    return `<section style="margin:14px 0 0;padding:16px 18px;background:${theme.warm};border:1px solid ${theme.border};border-left:5px solid ${theme.gold};">${paragraph(theme.warm)}</section>`;
  }
  if (variant === "menu-card") {
    return `<section style="margin:14px 0 0;padding:18px 18px;background:${theme.warm};border:1px solid ${theme.border};border-radius:18px;">
      <div style="width:64px;height:8px;margin:0 0 12px;background:${theme.gold};border-radius:999px;"></div>
      ${paragraph(theme.warm)}
    </section>`;
  }
  if (variant === "fresh") {
    return `<section style="margin:14px 0 0;padding:16px 18px;background:${theme.accentSoft};border:0;border-radius:0 18px 0 18px;">${paragraph(theme.accentSoft)}</section>`;
  }
  if (variant === "formal") {
    return `<section style="margin:14px 0 0;padding:14px 0;border-top:1px solid ${theme.border};border-bottom:1px solid ${theme.border};">${paragraph("#ffffff")}</section>`;
  }
  if (variant === "warm") {
    return `<section style="margin:14px 0 0;padding:17px 18px;background:${theme.warmDeep};border:1px solid ${theme.border};box-shadow:inset 0 6px 0 ${theme.gold};">${paragraph(theme.warmDeep)}</section>`;
  }
  if (variant === "soft-card") {
    return `<section style="margin:14px 0 0;padding:17px 18px;background:${theme.warm};border:1px solid ${theme.border};border-radius:14px;">${paragraph(theme.warm)}</section>`;
  }
  if (variant === "top-strip") {
    return `<section style="margin:14px 0 0;background:${theme.warm};border:1px solid ${theme.border};"><div style="height:7px;background:${theme.accentSoft};border-bottom:1px solid ${theme.border};"></div>${paragraph(theme.warm, "padding:14px 16px;")}</section>`;
  }
  if (variant === "side-soft" || variant === "left-gold") {
    return `<section style="margin:14px 0 0;padding:16px 18px;background:${theme.warm};border:1px solid ${theme.border};border-left:5px solid ${variant === "left-gold" ? theme.gold : theme.accent};">${paragraph(theme.warm)}</section>`;
  }
  if (variant === "corner") {
    return `<section style="margin:14px 0 0;padding:16px 18px;background:#fff;border:1px solid ${theme.border};border-top:4px solid ${theme.gold};">${paragraph("#ffffff")}</section>`;
  }
  if (variant === "notice") {
    return `<section style="margin:14px 0 0;padding:16px 18px;background:${theme.accentSoft};border:1px dashed ${theme.accent};">${paragraph(theme.accentSoft)}</section>`;
  }
  if (variant === "note") {
    return `<section style="margin:14px 0 0;padding:16px 18px;background:${theme.warmDeep};border:1px solid ${theme.border};">${paragraph(theme.warmDeep)}</section>`;
  }
  return `<section style="margin:14px 0 0;padding:16px 18px;background:${theme.warm};border:1px solid ${theme.border};">${paragraph(theme.warm)}</section>`;
}

function gridColumns(count) {
  if (count <= 1) return 1;
  if (count === 2 || count === 4) return 2;
  return 3;
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

function imageGroupsFromSources(sources) {
  const groups = [];
  let remaining = sources.slice();
  while (remaining.length) {
    const size = preferredImageGroupSize(remaining.length);
    const batch = remaining.splice(0, size);
    if (batch.length === 1) {
      groups.push({ type: "image", src: batch[0], alt: "文章图片" });
      continue;
    }
    groups.push({
      type: "imageGroup",
      title: "",
      display: "grid",
      columns: batch.length === 2 || batch.length === 4 ? 2 : 3,
      images: batch.map((src) => ({ src, alt: "文章图片" })),
    });
  }
  return groups;
}

function renderImageGrid(images, theme, decoration = {}, preferredColumns, layout = {}) {
  const cols = preferredColumns || gridColumns(images.length);
  const rows = [];
  for (let i = 0; i < images.length; i += cols) rows.push(images.slice(i, i + cols));
  const variant = decoration.image || "thin";
  const strongPhoto = /photo|album|gallery|sports|arts/.test(layout.id || "");
  const menuGrid = /menu/.test(layout.id || "");
  const formalGrid = /notice|safety|exam|inspection|meeting|party/.test(layout.id || "");
  const border = variant === "plain" ? "0" : variant === "gold" || menuGrid ? `3px solid ${theme.gold}` : strongPhoto ? `2px solid #ffffff` : variant === "corner" ? `1px solid ${theme.border}` : `1px solid ${theme.border}`;
  const bg = menuGrid ? theme.warm : strongPhoto ? theme.accentSoft : formalGrid ? "#ffffff" : variant === "mat" || variant === "book" ? theme.warm : variant === "label" ? "#ffffff" : theme.accentSoft;
  const padding = variant === "plain" ? "0" : menuGrid ? "9px" : strongPhoto ? "6px" : variant === "mat" || variant === "book" || variant === "gold" ? "7px" : "3px";
  const radius = variant === "soft" || menuGrid ? "12px" : strongPhoto ? "0" : "0";
  const spacing = strongPhoto ? "6px" : menuGrid ? "10px" : "8px";
  return `
    <section style="margin:20px 0 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:${spacing};table-layout:fixed;background:${strongPhoto ? theme.accent : "transparent"};">
        ${rows
          .map(
            (row) => `<tr>${row
              .map(
                (image) => `
                  <td style="width:${100 / cols}%;padding:${padding};vertical-align:top;background:${bg};border:${border};${variant === "corner" ? "border-bottom:6px solid " + theme.accent + ";" : ""}">
                    <img src="${esc(normalizeSrc(image.src))}" alt="${esc(image.alt || "文章图片")}" style="display:block;width:100%;height:auto;margin:0;border-radius:${radius};">
                  </td>`
              )
              .join("")}${row.length < cols ? `<td colspan="${cols - row.length}" style="padding:0;"></td>` : ""}</tr>`
          )
          .join("")}
      </table>
    </section>`;
}

function imageHtml(item, index, theme, layout, decoration, editable, imageTools) {
  const variant = layout.image === "featured" ? "featured" : decoration.image;
  const strongPhoto = /photo|album|gallery|sports|arts/.test(layout.id || "");
  const menuImage = /menu/.test(layout.id || "");
  const formalImage = /notice|safety|exam|inspection|meeting|party/.test(layout.id || "");
  const border = variant === "plain" ? "0" : variant === "gold" || menuImage ? `3px solid ${theme.gold}` : strongPhoto ? `2px solid #ffffff` : `1px solid ${theme.border}`;
  const radius = menuImage ? "14px" : strongPhoto ? "0" : variant === "soft" ? "14px" : "4px";
  const wrapBg = menuImage ? theme.warm : strongPhoto ? theme.accent : formalImage ? "#fff" : variant === "mat" || variant === "book" ? theme.warm : variant === "gold" ? theme.warmDeep : "#fff";
  const pad = variant === "plain" ? "0" : menuImage || strongPhoto || variant === "mat" || variant === "book" || variant === "featured" || variant === "gold" ? "8px" : "0";
  const top =
    variant === "label"
      ? `<div style="height:8px;margin:0 0 8px;background:${theme.accent};"></div>`
      : variant === "book"
      ? `<div style="height:8px;border-top:1px solid ${theme.border};border-bottom:1px solid ${theme.border};margin:0 0 8px;"></div>`
      : "";
  const bottom = variant === "corner" ? `<div style="height:6px;background:${theme.accentSoft};border:1px solid ${theme.border};border-top:0;"></div>` : "";
  return `<section data-image-section="${editable ? index : ""}" style="margin:20px 0 0;text-align:center;background:${wrapBg};padding:${pad};border:${variant === "featured" ? "1px solid " + theme.border : variant === "book" ? "1px solid " + theme.border : "0"};${variant === "corner" ? "box-shadow:inset 0 -6px 0 " + theme.accent + ";" : ""}">
    ${top}
    <img src="${esc(normalizeSrc(item.src))}" alt="${esc(item.alt)}" style="display:block;width:100%;height:auto;border-radius:${radius};margin:0 auto;border:${border};">
    ${bottom}
    ${imageTools(index)}
  </section>`;
}

function closingHtml(article, theme, layout, decoration, editable, fonts) {
  if (!article.closing) return "";
  const closingFonts = fontScale(article, "closing");
  return `<section style="margin:34px 0 0;padding:20px 18px;background:${theme.accentSoft};border-top:3px solid ${theme.accent};border-bottom:1px solid ${theme.border};">
    <p ${editable ? editableAttrs("closing") : ""} style="margin:0;color:${readableText(theme.accentSoft, theme.body)};font-size:${px(closingFonts.body)};white-space:pre-wrap;line-height:1.95;text-align:justify;text-indent:2em;font-weight:600;">${esc(article.closing)}</p>
  </section>`;
}

function footerHtml(article, theme, layout, decoration, editable, decorated, fonts) {
  if (!article.footer?.length) return "";
  const bg = decoration.footer === "box" || layout.footer === "soft" ? theme.warmDeep : "#ffffff";
  const footerText = readableText(bg, theme.muted, 3.2);
  const label = decorated ? `<div style="width:54px;height:3px;margin:0 auto 10px;background:${theme.accent};"></div>` : "";
  const style =
    decoration.footer === "box" || layout.footer === "soft"
      ? `background:${theme.warmDeep};border:1px solid ${theme.border};padding:16px 16px;`
      : `border-top:1px solid ${theme.border};padding:14px 0 0;`;
  return `<section style="margin:30px 0 0;${style}color:${footerText};font-size:${px(fonts.footer)};white-space:pre-wrap;line-height:1.9;">
    ${label}
    ${article.footer.map((line, index) => {
      const lineFonts = fontScale(article, `footer.${index}`);
      return `<p ${editable ? editableAttrs(`footer.${index}`) : ""} style="margin:0;font-size:${px(lineFonts.footer)};">${esc(line)}</p>`;
    }).join("")}
  </section>`;
}

function findArticleFromLocation() {
  const articles = getArticles();
  const params = new URLSearchParams(location.search);
  const requested = params.get("article");
  const pathPart = location.pathname.replace(/^\/+|\/+$/g, "");
  if (requested) {
    return articles.find((a, idx) => a.id === requested || getArticlePath(a, idx) === requested) || null;
  }
  if (pathPart && pathPart !== "index.html") {
    if (!/^\d+$/.test(pathPart) && pathPart !== "menu-preview") return null;
    return articles.find((a, idx) => a.id === pathPart || getArticlePath(a, idx) === pathPart) || null;
  }
  return articles[0];
}

function renderArticle(article, options = {}) {
  const editable = Boolean(options.editable);
  const forWechat = Boolean(options.forWechat);
  const theme = articleTheme(article);
  const layout = layoutScheme(article, theme);
  const decoration = decorationScheme(article, theme);
  const fonts = fontScale(article);
  const decorated = article.decorated !== false;
  const decoDots = decorated ? stableDecoration(article, theme) : "";
  const decoShort = decorated ? stableDecoration(article, theme, "short") : "";
  const decoTop = decorated ? stableDecoration(article, theme, "top") : "";
  const bits = { full: decoDots, short: decoShort, top: decoTop };
  const imageTools = (index) =>
    editable
      ? `<div data-image-tools="${index}" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:8px 0 0;">
          <button type="button" data-image-action="insert-before" data-index="${index}" style="border:1px solid rgba(158,31,31,.25);background:#fff;color:#9e1f1f;border-radius:6px;padding:6px 8px;font-size:12px;cursor:pointer;">上方插入</button>
          <button type="button" data-image-action="insert-after" data-index="${index}" style="border:1px solid rgba(158,31,31,.25);background:#fff;color:#9e1f1f;border-radius:6px;padding:6px 8px;font-size:12px;cursor:pointer;">下方插入</button>
          <button type="button" data-image-action="insert-group-after" data-index="${index}" style="border:1px solid rgba(158,31,31,.25);background:#fff;color:#9e1f1f;border-radius:6px;padding:6px 8px;font-size:12px;cursor:pointer;">下方插入图片组</button>
          <button type="button" data-image-action="replace" data-index="${index}" style="border:1px solid rgba(158,31,31,.25);background:#fff;color:#9e1f1f;border-radius:6px;padding:6px 8px;font-size:12px;cursor:pointer;">替换</button>
          <button type="button" data-image-action="delete" data-index="${index}" style="border:1px solid rgba(158,31,31,.25);background:#fff;color:#9e1f1f;border-radius:6px;padding:6px 8px;font-size:12px;cursor:pointer;">删除</button>
        </div>`
      : "";
  return `
    ${headerHtml(article, theme, layout, decoration, editable, decorated, bits, fonts)}
    ${introHtml(article, theme, layout, decoration, editable, fonts)}
    ${article.sections
      .map((item, index) => {
        if (item.type === "heading") {
          return headingHtml(item, index, theme, layout, decoration, editable, decorated, bits, fonts);
        }
        if (item.type === "paragraph") {
          return paragraphHtml(item, index, theme, layout, decoration, editable, fonts);
        }
        if (item.type === "imageGroup") {
          const images = item.images || [];
          const groupHtml = renderImageGrid(images, theme, decoration, item.columns, layout);
          const tools = editable
            ? `<div data-image-tools="${index}" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:8px 0 0;">
                <button type="button" data-image-action="insert-before" data-index="${index}" style="border:1px solid rgba(158,31,31,.25);background:#fff;color:#9e1f1f;border-radius:6px;padding:6px 8px;font-size:12px;cursor:pointer;">上方插入</button>
                <button type="button" data-image-action="insert-after" data-index="${index}" style="border:1px solid rgba(158,31,31,.25);background:#fff;color:#9e1f1f;border-radius:6px;padding:6px 8px;font-size:12px;cursor:pointer;">下方插入</button>
                <button type="button" data-image-action="insert-group-after" data-index="${index}" style="border:1px solid rgba(158,31,31,.25);background:#fff;color:#9e1f1f;border-radius:6px;padding:6px 8px;font-size:12px;cursor:pointer;">下方插入图片组</button>
                <button type="button" data-image-action="replace-group" data-index="${index}" style="border:1px solid rgba(158,31,31,.25);background:#fff;color:#9e1f1f;border-radius:6px;padding:6px 8px;font-size:12px;cursor:pointer;">替换图片组</button>
                <button type="button" data-image-action="delete" data-index="${index}" style="border:1px solid rgba(158,31,31,.25);background:#fff;color:#9e1f1f;border-radius:6px;padding:6px 8px;font-size:12px;cursor:pointer;">删除</button>
              </div>`
            : "";
          return `<section data-image-section="${editable ? index : ""}" style="margin:20px 0 0;">${decorated ? decoShort : ""}${groupHtml}${tools}</section>`;
        }
        return imageHtml(item, index, theme, layout, decoration, editable, imageTools);
      })
      .join("")}
    ${closingHtml(article, theme, layout, decoration, editable, fonts)}
    ${footerHtml(article, theme, layout, decoration, editable, decorated, fonts)}
  `;
}

function removeNonSourceLabels(container, article) {
  const sourceText = new Set([
    article.title || "",
    article.subtitle || "",
    article.intro || "",
    article.closing || "",
    ...(article.footer || []),
    ...(article.sections || []).map((item) => item.text || ""),
  ].filter(Boolean));
  container.querySelectorAll("p, span, div").forEach((node) => {
    const text = (node.textContent || "").trim();
    if (!text || sourceText.has(text)) return;
    if (/^[\s●○◆■★━─—·【】]+$/.test(text)) return;
    if (text.length <= 12 && node.querySelectorAll("img,button,input,textarea,select").length === 0 && node.children.length === 0) {
      node.remove();
    }
  });
}

async function renderClientPage(container) {
  const publishedMatch = location.pathname.match(/^\/[pr]\/([^/]+)\/?$/);
  if (publishedMatch) {
    const article = await loadPublishedArticle(publishedMatch[1]);
    if (!article) {
      container.innerHTML = "<p>文章不存在或链接已失效</p>";
      return;
    }
    const normalized = normalizeArticle(article);
    container.innerHTML = renderArticle(normalized);
    removeNonSourceLabels(container, normalized);
    return;
  }
  let lastSignature = "";
  const draw = async () => {
    await loadSavedArticles();
    const article = findArticleFromLocation();
    if (!article) {
      container.innerHTML = "<p>暂无文章</p>";
      return;
    }
    const signature = JSON.stringify(article);
    if (signature === lastSignature) return;
    lastSignature = signature;
    container.innerHTML = renderArticle(article);
    removeNonSourceLabels(container, article);
  };
  await draw();
  window.setInterval(draw, 5000);
  return;
  const article = findArticleFromLocation();
  if (!article) {
    container.innerHTML = "<p>暂无文章</p>";
    return;
  }
  container.innerHTML = renderArticle(article);
}

function samplePreviewArticle(themeId) {
  return {
    id: "sample-preview",
    path: "menu-preview",
    themeId,
    title: "学校公众号排版预览",
    subtitle: "示例标题与段落仅用于模板预览",
    intro: "这里是通用示例导语，用于查看模板、排版和美化效果。正式文章请在后台上传 Word 文档生成。",
    sections: [
      { type: "heading", label: "01", text: "栏目标题示例" },
      { type: "paragraph", text: "这是第一段示例正文。系统会为中文段落保留首行缩进，并根据文章内容自动匹配适合学校公众号的模板。" },
      { type: "heading", label: "02", text: "图片位置示例" },
      { type: "paragraph", text: "正式使用时，上传 Word 中的图片会自动进入文章；后台也可以继续插入、替换或删除图片。" },
      { type: "heading", label: "03", text: "结尾提示示例" },
      { type: "paragraph", text: "这里用于展示结尾段落、落款信息和稳定装饰在不同模板中的效果。" },
    ],
    closing: "这是通用示例结尾。正式内容以后台上传和保存后的文章为准。",
    footer: ["编辑｜示例", "审核｜示例"],
  };
}

function renderPreviewArticle(container, themeId) {
  container.innerHTML = renderArticle(samplePreviewArticle(themeId));
}

async function renderArticleListPage(container) {
  async function deletePublishedArticle(slug, title) {
    const ok = window.confirm(`确认删除“${title || "这篇文章"}”吗？删除后会同步清除 KV 中保存的文章数据和已保存图片。`);
    if (!ok) return;
    const res = await fetch("/api/published-delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (!res.ok) {
      window.alert("删除失败，请稍后再试");
      return;
    }
    await renderArticleListPage(container);
  }
  container.innerHTML = `<section style="padding:28px 0;text-align:center;color:#7a6a5e;font-size:15px;white-space:pre-wrap;line-height:1.8;">正在加载已确认文章...</section>`;
  try {
    const res = await fetch("/api/published-list", { cache: "no-store" });
    const data = await res.json();
    const articles = Array.isArray(data.articles) ? data.articles : [];
    if (!articles.length) {
      container.innerHTML = `<section style="padding:34px 0;text-align:center;color:#7a6a5e;font-size:15px;white-space:pre-wrap;line-height:1.8;">暂无最终确认保存的文章</section>`;
      return;
    }
    container.innerHTML = `
      <section style="padding:28px 0 10px;text-align:center;border-bottom:2px solid #9e1f1f;">
        <h1 style="margin:0;color:#8f1515;font-size:26px;white-space:pre-wrap;line-height:1.4;font-weight:800;">已确认文章列表</h1>
        <p style="margin:10px 0 0;color:#7a6a5e;font-size:14px;white-space:pre-wrap;line-height:1.8;">这里展示客户确认后最终保存的文章</p>
      </section>
      <section style="padding:16px 0 28px;">
        ${articles
          .map((article) => {
            const url = article.url || `/p/${article.slug}/`;
            const date = article.publishedAt ? new Date(article.publishedAt).toLocaleString("zh-CN", { hour12: false }) : "";
            return `<section style="display:block;margin:12px 0;padding:14px 16px;border:1px solid rgba(126,31,31,.14);background:#fffaf4;color:#2f2f2f;">
              <a href="${esc(url)}" target="_blank" rel="noopener" style="display:block;text-decoration:none;color:#2f2f2f;">
                <strong style="display:block;color:#8f1515;font-size:17px;white-space:pre-wrap;line-height:1.6;">${esc(article.title || "未命名文章")}</strong>
                ${article.subtitle ? `<span style="display:block;margin-top:4px;color:#7a6a5e;font-size:13px;white-space:pre-wrap;line-height:1.7;">${esc(article.subtitle)}</span>` : ""}
                <span style="display:block;margin-top:6px;color:#7a6a5e;font-size:12px;white-space:pre-wrap;line-height:1.7;">${esc(date)}　${esc(location.origin + url)}</span>
              </a>
              <button type="button" data-delete-published="${esc(article.slug)}" data-title="${esc(article.title || "未命名文章")}" style="margin-top:10px;border:1px solid rgba(158,31,31,.25);background:#fff;color:#9e1f1f;border-radius:6px;padding:7px 10px;font-size:12px;cursor:pointer;">删除</button>
            </section>`;
          })
          .join("")}
      </section>`;
    container.querySelectorAll("[data-delete-published]").forEach((button) => {
      button.addEventListener("click", () => deletePublishedArticle(button.dataset.deletePublished, button.dataset.title));
    });
  } catch {
    container.innerHTML = `<section style="padding:34px 0;text-align:center;color:#9e1f1f;font-size:15px;white-space:pre-wrap;line-height:1.8;">文章列表加载失败</section>`;
  }
}

function articleToEditableText(article) {
  return article.sections
    .map((item) => {
      if (item.type === "heading") return `## ${item.text}`;
      if (item.type === "image") return `[图片] ${item.src}`;
      if (item.type === "imageGroup") return `[图片组] ${(item.images || []).map((image) => image.src).join(" | ")}`;
      return item.text;
    })
    .join("\n\n");
}

function editableTextToSections(text) {
  const sections = [];
  let paragraph = [];
  const flushParagraph = () => {
    const text = paragraph.join("\n").trim();
    if (text) sections.push({ type: "paragraph", text });
    paragraph = [];
  };
  text.split("\n").forEach((line) => {
    const block = line.trim();
    if (!block) {
      flushParagraph();
      return;
    }
    const heading = block.match(/^##\s*([^\s]+)\s+(.+)$/);
    if (heading) {
      flushParagraph();
      sections.push({ type: "heading", label: heading[1], text: heading[2] });
      return;
    }
    const image = block.match(/^\[图片\]\s+(.+)$/);
    if (image) {
      flushParagraph();
      sections.push({ type: "image", src: image[1], alt: "活动图片" });
      return;
    }
    const imageGroup = block.match(/^\[图片组\]\s+(.+)$/);
    if (imageGroup) {
      flushParagraph();
      sections.push({
        type: "imageGroup",
        title: "",
        display: "grid",
        images: imageGroup[1]
          .split("|")
          .map((src) => src.trim())
          .filter(Boolean)
          .map((src) => ({ src, alt: "文章图片" })),
      });
      return;
    }
    if (isImagePath(block)) {
      flushParagraph();
      sections.push({ type: "image", src: block, alt: "文章图片" });
      return;
    }
    paragraph.push(block);
  });
  flushParagraph();
  return sections;
}

function updateByPath(article, path, value) {
  const text = value.replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n");
  if (path === "title" || path === "subtitle" || path === "intro" || path === "closing") {
    article[path] = text;
    return;
  }
  const sectionMatch = path.match(/^sections\.(\d+)\.(label|text)$/);
  if (sectionMatch) {
    const index = Number(sectionMatch[1]);
    const key = sectionMatch[2];
    if (article.sections[index]) article.sections[index][key] = text;
    return;
  }
  const footerMatch = path.match(/^footer\.(\d+)$/);
  if (footerMatch) {
    const index = Number(footerMatch[1]);
    article.footer[index] = text;
  }
}

function syncInlineEdits(previewEl, article) {
  previewEl.querySelectorAll("[data-edit]").forEach((el) => {
    updateByPath(article, el.dataset.edit, el.innerText);
  });
}

async function renderAdminPage(container, listEl, previewEl, statusEl, selectEl) {
  await loadSavedArticles();
  let articles = getArticles();
  let currentId = articles[0]?.id;
  let inlineEditMode = true;
  let selectedImageIndex = null;
  let selectedTextPath = "";
  let uploadedImageSrcs = [];
  let editBodyCursor = 0;
  const randomPools = {
    template: [],
    decoration: [],
    layout: [],
  };
  let autosaveTimer = null;
  let autosaveBusy = false;
  let autosavePending = false;
  function setStatus(msg) {
    statusEl.textContent = msg;
  }
  async function persistArticles({ quiet = true, copyLink = false } = {}) {
    const index = articles.findIndex((a) => a.id === currentId);
    if (index >= 0) syncInlineEdits(previewEl, articles[index]);
    setArticles(articles);
    articles = getArticles();
    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ articles }),
    });
    if (!res.ok) throw new Error("save_failed");
    const data = await res.json();
    if (Array.isArray(data.articles)) {
      setArticles(data.articles);
      articles = getArticles();
      if (currentId && !articles.some((article) => article.id === currentId)) {
        currentId = articles[0]?.id;
      }
      drawList();
      if (currentId) {
        drawPreview(currentId);
      } else {
        previewEl.innerHTML = "<p>暂无文章</p>";
        syncEditor(null);
      }
    }
    const article = currentArticle();
    const url = articleLink(article);
    if (publishedBox && url) {
      publishedBox.style.display = "block";
      publishedBox.innerHTML = `客户预览链接：<br><a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a><br>数据和图片最多保留 7 天。`;
    }
    if (copyLink && url) await navigator.clipboard.writeText(url);
    if (!quiet) setStatus(copyLink ? "已保存并复制客户链接；客户预览页会自动更新" : "已保存；客户预览页会自动更新");
  }
  async function saveNow(message = "已保存，客户预览页会自动更新") {
    try {
      await persistArticles({ quiet: true });
      setStatus(message);
    } catch {
      setStatus("保存失败，请稍后重试");
    }
  }
  async function runAutosave() {
    if (autosaveBusy) {
      autosavePending = true;
      return;
    }
    autosaveBusy = true;
    try {
      await persistArticles({ quiet: true });
      setStatus("已自动保存，客户预览页会自动更新");
    } catch {
      setStatus("自动保存失败，请点“保存并生成客户链接”重试");
    } finally {
      autosaveBusy = false;
      if (autosavePending) {
        autosavePending = false;
        scheduleAutosave();
      }
    }
  }
  function scheduleAutosave(delay = 800) {
    clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(runAutosave, delay);
  }
  function confirmCenter(message, title = "确认操作") {
    return new Promise((resolve) => {
      const mask = document.createElement("div");
      mask.className = "confirm-mask";
      mask.innerHTML = `
        <section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
          <h3 class="confirm-title" id="confirmTitle">${esc(title)}</h3>
          <p class="confirm-message">${esc(message)}</p>
          <div class="confirm-actions">
            <button type="button" class="secondary" data-confirm-cancel>取消</button>
            <button type="button" class="primary" data-confirm-ok>确认</button>
          </div>
        </section>`;
      const close = (value) => {
        mask.remove();
        resolve(value);
      };
      mask.addEventListener("click", (event) => {
        if (event.target === mask || event.target.closest("[data-confirm-cancel]")) close(false);
        if (event.target.closest("[data-confirm-ok]")) close(true);
      });
      document.addEventListener(
        "keydown",
        function onKey(event) {
          if (event.key === "Escape") close(false);
        },
        { once: true }
      );
      document.body.appendChild(mask);
      mask.querySelector("[data-confirm-ok]").focus();
    });
  }
  function setBusy(button, busy, text) {
    if (!button) return;
    if (busy) {
      if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
      button.textContent = text || "处理中...";
      button.disabled = true;
      button.style.opacity = ".68";
      button.style.cursor = "wait";
      return;
    }
    button.textContent = button.dataset.originalText || button.textContent;
    delete button.dataset.originalText;
    button.disabled = false;
    button.style.opacity = "";
    button.style.cursor = "";
  }
  function uploadWithProgress(url, form, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) {
          onProgress?.(null);
          return;
        }
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      });
      xhr.addEventListener("load", () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error("request_failed"));
          return;
        }
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("invalid_json"));
        }
      });
      xhr.addEventListener("error", () => reject(new Error("network_error")));
      xhr.send(form);
    });
  }
  function currentArticle() {
    return articles.find((a) => a.id === currentId) || articles[0];
  }
  function articleStatus(article) {
    return `客户预览：${articleLink(article)}`;
  }
  function articleLink(article) {
    if (!article) return "";
    const index = articles.findIndex((item) => item.id === article.id);
    return getArticleUrl(article, Math.max(index, 0));
  }
  async function copyArticleLink(article) {
    const url = articleLink(article);
    if (!url) {
      setStatus("这篇文章还没有客户链接");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("已复制链接：" + url);
    } catch {
      setStatus("复制失败，请手动选择链接复制");
    }
  }
  function collectTempSources(article) {
    const sources = [];
    (article?.sections || []).forEach((item) => {
      if (item.type === "image") sources.push(item.src);
      if (item.type === "imageGroup") (item.images || []).forEach((image) => sources.push(image.src));
    });
    return [];
  }
  function cleanupTempArticles() {
    const sources = articles.flatMap(collectTempSources);
    if (!sources.length) return;
    const payload = JSON.stringify({ sources });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/temp-cleanup", new Blob([payload], { type: "application/json" }));
      return;
    }
    fetch("/api/temp-cleanup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
  function syncEditor(article) {
    document.getElementById("editTitle").value = article?.title || "";
    document.getElementById("editSubtitle").value = article?.subtitle || "";
    document.getElementById("editIntro").value = article?.intro || "";
    document.getElementById("editBody").value = article ? articleToEditableText(article) : "";
    document.getElementById("editClosing").value = article?.closing || "";
    document.getElementById("editFooter").value = (article?.footer || []).join("\n");
    const templateSelect = document.getElementById("templateSelect");
    if (templateSelect) templateSelect.value = article?.themeId || "auto";
    const decoratedToggle = document.getElementById("decoratedToggle");
    if (decoratedToggle) decoratedToggle.checked = article?.decorated !== false;
    const decorationSelect = document.getElementById("decorationSelect");
    if (decorationSelect) decorationSelect.value = article?.decorationId || "";
    const layoutSelect = document.getElementById("layoutSelect");
    if (layoutSelect) layoutSelect.value = article?.layoutId || "auto";
    const fontSizeSelect = document.getElementById("fontSizeSelect");
    if (fontSizeSelect) fontSizeSelect.value = selectedTextFontSize(article) || "normal";
  }
  function selectedTextFontSize(article) {
    if (!article || !selectedTextPath) return "";
    if (selectedTextPath.startsWith("sections.")) {
      const index = Number(selectedTextPath.match(/^sections\.(\d+)\.text$/)?.[1]);
      return article.sections?.[index]?.fontSizes?.text || "normal";
    }
    return article.fontSizes?.[selectedTextPath] || "normal";
  }
  function setSelectedTextFontSize(article, size) {
    if (!article || !selectedTextPath) return false;
    if (selectedTextPath.startsWith("sections.")) {
      const index = Number(selectedTextPath.match(/^sections\.(\d+)\.text$/)?.[1]);
      if (!article.sections?.[index]) return false;
      article.sections[index].fontSizes = { ...(article.sections[index].fontSizes || {}), text: size };
      return true;
    }
    article.fontSizes = { ...(article.fontSizes || {}), [selectedTextPath]: size };
    return true;
  }
  function readEditor(article) {
    return {
      ...article,
      themeId: document.getElementById("templateSelect")?.value || article.themeId || "auto",
      layoutId: document.getElementById("layoutSelect")?.value || article.layoutId || "auto",
      decorated: document.getElementById("decoratedToggle")?.checked !== false,
      decorationId: document.getElementById("decorationSelect")?.value || "",
      title: document.getElementById("editTitle").value,
      subtitle: document.getElementById("editSubtitle").value,
      intro: document.getElementById("editIntro").value,
      sections: editableTextToSections(document.getElementById("editBody").value),
      closing: document.getElementById("editClosing").value,
      footer: document
        .getElementById("editFooter")
        .value.split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    };
  }
  function editBodyEl() {
    return document.getElementById("editBody");
  }
  function rememberEditBodyCursor() {
    const el = editBodyEl();
    editBodyCursor = el.selectionStart ?? el.value.length;
  }
  function insertTextAtEditBody(text) {
    const el = editBodyEl();
    const start = editBodyCursor ?? el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const before = el.value.slice(0, start).replace(/\s*$/, "\n\n");
    const after = el.value.slice(end).replace(/^\s*/, "\n\n");
    const inserted = text.trim();
    el.value = `${before}${inserted}${after}`;
    const nextCursor = before.length + inserted.length;
    el.focus();
    el.setSelectionRange(nextCursor, nextCursor);
    editBodyCursor = nextCursor;
  }
  function applyEditorToCurrentArticle(message) {
    const index = articles.findIndex((a) => a.id === currentId);
    if (index < 0) return;
    articles[index] = readEditor(articles[index]);
    setArticles(articles);
    articles = getArticles();
    drawList();
    drawPreview(articles[index].id);
    setStatus(message);
  }
  function getUploadSources() {
    const manual = document
      .getElementById("uploadedImagePath")
      .value.split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    return manual.length ? manual : uploadedImageSrcs;
  }
  function imageItemsFromUploads() {
    return getUploadSources().map((src) => ({ type: "image", src, alt: "文章图片" }));
  }
  async function uploadFiles(files, onProgress) {
    const sources = [];
    for (const [index, file] of files.entries()) {
      const form = new FormData();
      form.append("file", file);
      onProgress?.({ index, total: files.length, file, phase: "uploading" });
      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("upload_failed");
      const data = await res.json();
      sources.push(data.src);
      onProgress?.({ index, total: files.length, file, phase: "done" });
    }
    uploadedImageSrcs = sources;
    document.getElementById("uploadedImagePath").value = sources.join("\n");
    return sources;
  }
  function chooseImageFiles({ multiple = true } = {}) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.multiple = multiple;
      input.style.display = "none";
      input.addEventListener("change", () => {
        const files = Array.from(input.files || []);
        input.remove();
        resolve(files);
      });
      document.body.appendChild(input);
      input.click();
    });
  }
  async function chooseAndUploadImages(options) {
    const files = await chooseImageFiles(options);
    if (!files.length) return [];
    setStatus(`正在上传图片：0/${files.length}`);
    try {
      const sources = await uploadFiles(files, ({ index, total, file, phase }) => {
        const current = Math.min(index + 1, total);
        setStatus(`${phase === "done" ? "已完成" : "正在上传"}图片：${current}/${total} ${file?.name || ""}`);
      });
      setStatus(`已上传 ${sources.length} 张图片`);
      return sources;
    } catch {
      setStatus("图片上传失败：请检查图片格式或大小");
      return [];
    }
  }
  function itemsFromSources(sources) {
    return sources.map((src) => ({ type: "image", src, alt: "文章图片" }));
  }
  function groupFromSources(sources) {
    return imageGroupsFromSources(sources);
  }
  function imageGroupFromUploads() {
    return imageGroupsFromSources(getUploadSources());
  }
  function updateAfterImageChange(article, message) {
    syncEditor(article);
    drawPreview(article.id);
    setStatus(message);
    scheduleAutosave();
  }
  function insertImagesAt(article, index, placement) {
    const imageItems = imageItemsFromUploads();
    if (!imageItems.length) {
      setStatus("请先上传图片，或填写图片路径");
      return;
    }
    const insertAt = placement === "before" ? index : index + 1;
    article.sections.splice(insertAt, 0, ...imageItems);
    updateAfterImageChange(article, `已插入 ${imageItems.length} 张图片，保存后客户可见`);
  }
  function insertImageItemsAt(article, index, placement, imageItems) {
    if (!imageItems.length) return;
    const insertAt = placement === "before" ? index : index + 1;
    article.sections.splice(insertAt, 0, ...imageItems);
    updateAfterImageChange(article, `已插入 ${imageItems.length} 张图片，保存后客户可见`);
  }
  function insertImageItemsNearSelection(article, imageItems) {
    if (!imageItems.length) return;
    if (selectedImageIndex === null || !article.sections[selectedImageIndex]) {
      article.sections.push(...imageItems);
      updateAfterImageChange(article, `已在文章末尾插入 ${imageItems.length} 张图片，保存后客户可见`);
      return;
    }
    insertImageItemsAt(article, selectedImageIndex, "after", imageItems);
  }
  function insertImageGroupAt(article, index, placement, groups) {
    if (!groups?.length) return;
    const insertAt = placement === "before" ? index : index + 1;
    article.sections.splice(insertAt, 0, ...groups);
    const count = groups.reduce((sum, item) => sum + (item.type === "imageGroup" ? item.images.length : 1), 0);
    updateAfterImageChange(article, `已插入 ${count} 张图片，并自动拆成公众号稳定静态网格`);
  }
  function replaceImageAt(article, index) {
    const imageItems = imageItemsFromUploads();
    if (!imageItems.length) {
      setStatus("请先上传图片，或填写图片路径");
      return;
    }
    if (article.sections[index]?.type !== "image") {
      setStatus("请先选择要替换的图片");
      return;
    }
    article.sections.splice(index, 1, ...imageItems);
    updateAfterImageChange(article, `已替换为 ${imageItems.length} 张图片，保存后客户可见`);
  }
  function replaceImageGroupAt(article, index) {
    const groups = imageGroupFromUploads();
    if (!groups.length) {
      setStatus("请先上传图片，或填写图片路径");
      return;
    }
    article.sections.splice(index, 1, ...groups);
    const count = groups.reduce((sum, item) => sum + (item.type === "imageGroup" ? item.images.length : 1), 0);
    updateAfterImageChange(article, `已替换为 ${count} 张图片，并自动拆成公众号稳定静态网格`);
  }
  function deleteImageAt(article, index) {
    if (!["image", "imageGroup"].includes(article.sections[index]?.type)) {
      setStatus("请先选择要删除的图片或图片组");
      return;
    }
    article.sections.splice(index, 1);
    updateAfterImageChange(article, "已删除图片，保存后客户可见");
  }
  function drawPreview(id) {
    currentId = id;
    selectedImageIndex = null;
    const article = currentArticle();
    if (!article) {
      previewEl.innerHTML = "<p>请先上传 Word 生成临时文章</p>";
      syncEditor(null);
      return;
    }
  previewEl.innerHTML = renderArticle(article, { editable: true });
  removeNonSourceLabels(previewEl, article);
    syncEditor(article);
    previewEl.querySelectorAll("[contenteditable]").forEach((el) => {
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        selectedTextPath = el.dataset.edit || "";
        selectedImageIndex = null;
        previewEl.querySelectorAll("[data-edit]").forEach((node) => {
          node.style.boxShadow = "";
        });
        el.style.boxShadow = "0 0 0 3px rgba(31,108,56,.18)";
        if (fontSizeSelect) fontSizeSelect.value = selectedTextFontSize(article) || "normal";
        setStatus("已选中文字块，可在右侧调整这处字号");
      });
      el.addEventListener("input", () => {
        syncInlineEdits(previewEl, article);
        syncEditor(article);
        setStatus("已在文章内修改，正在自动保存...");
        scheduleAutosave();
      });
    });
    if (selectedTextPath) {
      const selectedTextEl = previewEl.querySelector(`[data-edit="${CSS.escape(selectedTextPath)}"]`);
      if (selectedTextEl) selectedTextEl.style.boxShadow = "0 0 0 3px rgba(31,108,56,.18)";
    }
    previewEl.querySelectorAll("[data-image-section]").forEach((el) => {
      el.addEventListener("click", () => {
        selectedTextPath = "";
        previewEl.querySelectorAll("[data-image-section]").forEach((node) => {
          node.style.outline = "";
          node.style.outlineOffset = "";
        });
        selectedImageIndex = Number(el.dataset.imageSection);
        el.style.outline = "3px solid rgba(158,31,31,.55)";
        el.style.outlineOffset = "4px";
        setStatus(`已选中第 ${selectedImageIndex + 1} 个内容块的图片`);
      });
    });
    previewEl.querySelectorAll("[data-image-action]").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const article = currentArticle();
        const index = Number(btn.dataset.index);
        selectedImageIndex = index;
        if (btn.dataset.imageAction === "insert-before") {
          const sources = await chooseAndUploadImages({ multiple: true });
          insertImageItemsAt(article, index, "before", itemsFromSources(sources));
        }
        if (btn.dataset.imageAction === "insert-after") {
          const sources = await chooseAndUploadImages({ multiple: true });
          insertImageItemsAt(article, index, "after", itemsFromSources(sources));
        }
        if (btn.dataset.imageAction === "insert-group-after") {
          const sources = await chooseAndUploadImages({ multiple: true });
          insertImageGroupAt(article, index, "after", groupFromSources(sources));
        }
        if (btn.dataset.imageAction === "replace") {
          const sources = await chooseAndUploadImages({ multiple: true });
          if (sources.length) {
            article.sections.splice(index, 1, ...itemsFromSources(sources));
            updateAfterImageChange(article, `已替换为 ${sources.length} 张图片，保存后客户可见`);
          }
        }
        if (btn.dataset.imageAction === "replace-group") {
          const sources = await chooseAndUploadImages({ multiple: true });
          const groups = groupFromSources(sources);
          if (groups.length) {
            article.sections.splice(index, 1, ...groups);
            const count = groups.reduce((sum, item) => sum + (item.type === "imageGroup" ? item.images.length : 1), 0);
            updateAfterImageChange(article, `已替换为 ${count} 张图片，并自动拆成公众号稳定静态网格`);
          }
        }
        if (btn.dataset.imageAction === "delete") deleteImageAt(article, index);
      });
    });
  }
  function setInlineEditMode(enabled) {
    inlineEditMode = true;
    document.body.classList.add("editing-inline");
    if (currentId) drawPreview(currentId);
    setStatus("文章内编辑已开启：直接点击中间预览里的文字修改，保存后客户可见");
  }
  function drawList() {
    if (!articles.length) {
      listEl.innerHTML = `<div style="border:1px solid #eadbd2;background:#fff;padding:12px;border-radius:6px;color:#7a6a5e;font-size:13px;white-space:pre-wrap;line-height:1.7;">暂无文章。上传 Word 后会显示在这里，并自动生成客户预览链接。</div>`;
      selectEl.innerHTML = "";
      return;
    }
    listEl.innerHTML = articles
      .map(
        (a, idx) => `
        <div data-article-row="${esc(a.id)}" style="border:1px solid #eadbd2;background:${a.id === currentId ? "#fff7f0" : "#fff"};padding:12px;border-radius:6px;margin:0 0 8px;">
          <button data-id="${esc(a.id)}" style="display:block;width:100%;text-align:left;border:0;background:transparent;padding:0;cursor:pointer;">
            <div style="font-size:12px;color:#7a6a5e;margin-bottom:4px;">固定客户路径：/${esc(getArticlePath(a, idx))}/</div>
            <div style="font-weight:700;color:#9e1f1f;">${esc(a.title)}</div>
            <div style="font-size:13px;color:#7a6a5e;margin-top:4px;">${esc(a.subtitle)}</div>
            <div style="font-size:12px;color:#7a6a5e;margin-top:4px;">风格：${esc(templateById(a.themeId)?.label || "自动匹配")}</div>
            <div style="font-size:12px;color:#7a6a5e;margin-top:4px;">排版：${esc(layoutById(a.layoutId)?.label || "按内容自动排版")}</div>
            <div style="font-size:12px;color:#1f6c38;margin-top:6px;">${esc(articleStatus(a))}</div>
          </button>
          ${
            articleLink(a)
              ? `<div style="display:grid;grid-template-columns:1fr auto;gap:6px;align-items:stretch;margin-top:8px;">
                  <button type="button" data-copy-article-link="${esc(a.id)}" style="min-width:0;border:1px solid rgba(158,31,31,.2);background:#fff;color:#7a5130;border-radius:6px;padding:7px 10px;font-size:12px;white-space:pre-wrap;line-height:1.5;cursor:pointer;text-align:left;word-break:break-all;">点击复制链接：${esc(articleLink(a))}</button>
                  <button type="button" data-open-article-link="${esc(a.id)}" style="border:1px solid rgba(31,108,56,.25);background:#f3faf3;color:#1f6c38;border-radius:6px;padding:7px 10px;font-size:12px;white-space:pre-wrap;line-height:1.5;cursor:pointer;white-space:nowrap;">打开预览</button>
                </div>`
              : ""
          }
          <button type="button" data-delete-article="${esc(a.id)}" style="margin-top:8px;border:1px solid rgba(158,31,31,.25);background:#fff;color:#9e1f1f;border-radius:6px;padding:7px 10px;font-size:12px;cursor:pointer;">删除当前文章</button>
        </div>`
      )
      .join("");
    listEl.querySelectorAll("[data-copy-article-link]").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const article = articles.find((item) => item.id === btn.dataset.copyArticleLink);
        await copyArticleLink(article);
      });
    });
    listEl.querySelectorAll("[data-open-article-link]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const article = articles.find((item) => item.id === btn.dataset.openArticleLink);
        const url = articleLink(article);
        if (url) window.open(url, "_blank", "noopener");
      });
    });
    listEl.querySelectorAll("button[data-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectEl.value = btn.dataset.id;
        drawPreview(btn.dataset.id);
        drawList();
        setStatus("已切换文章");
      });
    });
    listEl.querySelectorAll("[data-delete-article]").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const deleteId = btn.dataset.deleteArticle;
        const index = articles.findIndex((article) => article.id === deleteId);
        if (index < 0) return;
        const title = articles[index]?.title || `第 ${index + 1} 篇`;
        const confirmed = await confirmCenter(`确认删除“${title}”吗？客户预览链接会同步失效。`, "删除文章");
        if (!confirmed) return;
        clearTimeout(autosaveTimer);
        articles.splice(index, 1);
        setArticles(articles);
        articles = getArticles();
        currentId = articles[Math.min(index, articles.length - 1)]?.id;
        drawList();
        if (currentId) {
          drawPreview(currentId);
        } else {
          previewEl.innerHTML = "<p>暂无文章</p>";
          selectEl.innerHTML = "";
        }
        await saveNow("已删除并同步到线上，原客户链接已失效");
      });
    });
    selectEl.innerHTML = articles
      .map((a, idx) => `<option value="${esc(a.id)}">/${esc(getArticlePath(a, idx))}/：${esc(a.title)}</option>`)
      .join("");
    selectEl.value = currentId;
  }
  function resetRandomPool(kind, items, currentId) {
    randomPools[kind] = items.map((item) => item.id).filter((id) => id && id !== currentId);
  }
  function pickWithoutRepeat(kind, items, currentId) {
    const ids = items.map((item) => item.id).filter((id) => id && id !== currentId);
    if (!ids.length) return null;
    const pool = randomPools[kind].filter((id) => ids.includes(id));
    if (!pool.length) {
      resetRandomPool(kind, items, currentId);
    } else {
      randomPools[kind] = pool;
    }
    const index = Math.floor(Math.random() * randomPools[kind].length);
    const [id] = randomPools[kind].splice(index, 1);
    return items.find((item) => item.id === id) || null;
  }
  const copyHtmlBtn = document.getElementById("copyHtmlBtn");
  const copyTextBtn = document.getElementById("copyTextBtn");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const applyEditBtn = document.getElementById("applyEditBtn");
  const saveOnlineBtn = document.getElementById("saveOnlineBtn");
  const topSaveOnlineBtn = document.getElementById("topSaveOnlineBtn");
  const publishedBox = document.getElementById("publishedBox");
  const imageUploadInput = document.getElementById("imageUploadInput");
  const uploadImageBtn = document.getElementById("uploadImageBtn");
  const wordUploadInput = document.getElementById("wordUploadInput");
  const generateWordBtn = document.getElementById("generateWordBtn");
  const templateSelect = document.getElementById("templateSelect");
  const prevTemplateBtn = document.getElementById("prevTemplateBtn");
  const nextTemplateBtn = document.getElementById("nextTemplateBtn");
  const autoTemplateBtn = document.getElementById("autoTemplateBtn");
  const randomTemplateBtn = document.getElementById("randomTemplateBtn");
  const applyTemplateBtn = document.getElementById("applyTemplateBtn");
  const decoratedToggle = document.getElementById("decoratedToggle");
  const decorationSelect = document.getElementById("decorationSelect");
  const randomDecorationBtn = document.getElementById("randomDecorationBtn");
  const layoutSelect = document.getElementById("layoutSelect");
  const randomLayoutBtn = document.getElementById("randomLayoutBtn");
  const fontSizeSelect = document.getElementById("fontSizeSelect");
  const insertImageBtn = document.getElementById("insertImageBtn");
  const replaceImageBtn = document.getElementById("replaceImageBtn");
  const deleteImageBtn = document.getElementById("deleteImageBtn");
  const insertImageGroupBtn = document.getElementById("insertImageGroupBtn");
  const uploadedImagePath = document.getElementById("uploadedImagePath");
  templateSelect.innerHTML = SCHOOL_TEMPLATES.map(
    (template) => `<option value="${esc(template.id)}">${esc(template.label)}</option>`
  ).join("");
  decorationSelect.innerHTML = `<option value="">按内容自动选择</option>${DECORATION_SCHEMES.map(
    (scheme, index) => `<option value="${esc(scheme.id)}">美化 ${String(index + 1).padStart(2, "0")}</option>`
  ).join("")}`;
  layoutSelect.innerHTML = LAYOUT_SCHEMES.map((layout) => `<option value="${esc(layout.id)}">${esc(layout.label)}</option>`).join("");
  fontSizeSelect.innerHTML = FONT_SIZE_OPTIONS.map((item) => `<option value="${esc(item.id)}">${esc(item.label)}</option>`).join("");
  selectEl.addEventListener("change", () => {
    selectedTextPath = "";
    drawPreview(selectEl.value);
    drawList();
  });
  drawList();
  drawPreview(articles[0]?.id);
  function setTemplate(themeId, message) {
    const article = currentArticle();
    if (!article) return;
    syncInlineEdits(previewEl, article);
    article.themeId = themeId;
    templateSelect.value = themeId;
    drawPreview(article.id);
    setStatus(message);
    scheduleAutosave();
  }
  function stepTemplate(direction) {
    const article = currentArticle();
    const current = article?.themeId || templateSelect.value || "auto";
    const index = Math.max(0, SCHOOL_TEMPLATES.findIndex((template) => template.id === current));
    const nextIndex = (index + direction + SCHOOL_TEMPLATES.length) % SCHOOL_TEMPLATES.length;
    setTemplate(SCHOOL_TEMPLATES[nextIndex].id, `已切换为：${SCHOOL_TEMPLATES[nextIndex].label}，保存后客户可见`);
  }
  templateSelect.addEventListener("change", () => {
    const selected = templateById(templateSelect.value);
    setTemplate(templateSelect.value, `已预览：${selected?.label || "当前风格"}，保存后客户可见`);
  });
  prevTemplateBtn.addEventListener("click", () => stepTemplate(-1));
  nextTemplateBtn.addEventListener("click", () => stepTemplate(1));
  autoTemplateBtn.addEventListener("click", () => {
    resetRandomPool("template", SCHOOL_TEMPLATES.filter((template) => template.id !== "auto"), "auto");
    setTemplate("auto", "已恢复自动匹配风格，保存后客户可见");
  });
  randomTemplateBtn.addEventListener("click", () => {
    const article = currentArticle();
    if (!article) return;
    const current = article.themeId || templateSelect.value || "auto";
    const next = pickWithoutRepeat("template", SCHOOL_TEMPLATES.filter((template) => template.id !== "auto"), current);
    if (!next) {
      setStatus("暂无可切换的风格");
      return;
    }
    setTemplate(next.id, `已随机切换风格：${next.label}，本轮不会重复，保存后客户可见`);
  });
  applyTemplateBtn.addEventListener("click", () => {
    const selected = templateById(templateSelect.value);
    setTemplate(templateSelect.value, `已应用：${selected?.label || "当前风格"}，保存后客户可见`);
  });
  decoratedToggle.addEventListener("change", () => {
    const article = currentArticle();
    if (!article) return;
    syncInlineEdits(previewEl, article);
    article.decorated = decoratedToggle.checked;
    drawPreview(article.id);
    setStatus(decoratedToggle.checked ? "已开启公众号稳定装饰，保存后客户可见" : "已关闭装饰，保存后客户可见");
    scheduleAutosave();
  });
  decorationSelect.addEventListener("change", () => {
    const article = currentArticle();
    if (!article) return;
    syncInlineEdits(previewEl, article);
    article.decorationId = decorationSelect.value;
    article.decorated = decoratedToggle.checked;
    resetRandomPool("decoration", DECORATION_SCHEMES, decorationSelect.value);
    drawPreview(article.id);
    setStatus("已切换美化方案，正在自动保存...");
    scheduleAutosave();
  });
  randomDecorationBtn.addEventListener("click", () => {
    const article = currentArticle();
    if (!article) return;
    const current = decorationSelect.value;
    const next = pickWithoutRepeat("decoration", DECORATION_SCHEMES, current);
    if (!next) {
      setStatus("暂无可切换的美化方案");
      return;
    }
    decorationSelect.value = next.id;
    syncInlineEdits(previewEl, article);
    article.decorationId = next.id;
    article.decorated = true;
    drawPreview(article.id);
    setStatus("已切换美化方案，正在自动保存...");
    scheduleAutosave();
  });
  layoutSelect.addEventListener("change", () => {
    const article = currentArticle();
    if (!article) return;
    syncInlineEdits(previewEl, article);
    article.layoutId = layoutSelect.value;
    resetRandomPool("layout", LAYOUT_SCHEMES.filter((layout) => layout.id !== "auto"), layoutSelect.value);
    drawPreview(article.id);
    setStatus("已切换默认排版变化，保存后客户可见");
    scheduleAutosave();
  });
  randomLayoutBtn.addEventListener("click", () => {
    const article = currentArticle();
    if (!article) return;
    const current = layoutSelect.value || "auto";
    const next = pickWithoutRepeat("layout", LAYOUT_SCHEMES.filter((layout) => layout.id !== "auto"), current);
    if (!next) {
      setStatus("暂无可切换的排版");
      return;
    }
    layoutSelect.value = next.id;
    syncInlineEdits(previewEl, article);
    article.layoutId = next.id;
    drawPreview(article.id);
    setStatus(`已切换为排版：${next.label}，保存后客户可见`);
    scheduleAutosave();
  });
  fontSizeSelect.addEventListener("change", () => {
    const article = currentArticle();
    if (!article) return;
    if (!selectedTextPath) {
      fontSizeSelect.value = "normal";
      setStatus("请先点击中间预览里的某段文字或标题，再调整字号");
      return;
    }
    syncInlineEdits(previewEl, article);
    setSelectedTextFontSize(article, fontSizeSelect.value || "normal");
    drawPreview(article.id);
    const selected = FONT_SIZE_OPTIONS.find((item) => item.id === (fontSizeSelect.value || "normal"));
    setStatus(`已调整选中文字字号：${selected?.label || "标准"}，正在自动保存...`);
    scheduleAutosave();
  });
  editBodyEl().addEventListener("click", rememberEditBodyCursor);
  editBodyEl().addEventListener("keyup", rememberEditBodyCursor);
  editBodyEl().addEventListener("select", rememberEditBodyCursor);
  document.body.classList.add("editing-inline");
  copyHtmlBtn.addEventListener("click", async () => {
    const article = currentArticle();
    if (!article) {
      setStatus("请先上传 Word 生成文章");
      return;
    }
    syncInlineEdits(previewEl, article);
    const html = renderArticle(article, { forWechat: true });
    const text = previewEl.innerText.replace(/上方插入|下方插入|替换|删除/g, "").trim();
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      setStatus("已复制排版");
    } catch {
      const range = document.createRange();
      range.selectNode(previewEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("copy");
      sel.removeAllRanges();
      setStatus("已复制排版");
    }
  });
  copyTextBtn.addEventListener("click", async () => {
    if (!currentArticle()) {
      setStatus("请先上传 Word 生成文章");
      return;
    }
    await navigator.clipboard.writeText(previewEl.innerText);
    setStatus("已复制纯文本");
  });
  copyLinkBtn.addEventListener("click", async () => {
    const article = currentArticle();
    const url = articleLink(article);
    if (!url) {
      setStatus("当前文章还没有客户链接");
      return;
    }
    await navigator.clipboard.writeText(url);
    setStatus("已复制客户链接");
  });
  applyEditBtn.addEventListener("click", () => {
    const index = articles.findIndex((a) => a.id === currentId);
    if (index < 0) return;
    articles[index] = readEditor(articles[index]);
    setArticles(articles);
    articles = getArticles();
    drawList();
    drawPreview(articles[index].id);
    setStatus("已更新预览，保存后客户页面生效");
  });
  async function saveOnline() {
    setBusy(saveOnlineBtn, true, "保存中...");
    setBusy(topSaveOnlineBtn, true, "保存中...");
    try {
      await persistArticles({ quiet: false, copyLink: true });
    } catch {
      setStatus("保存失败：数据格式有误");
    } finally {
      setBusy(saveOnlineBtn, false);
      setBusy(topSaveOnlineBtn, false);
    }
  }
  saveOnlineBtn.addEventListener("click", saveOnline);
  topSaveOnlineBtn.addEventListener("click", saveOnline);
  uploadImageBtn.addEventListener("click", async () => {
    const files = Array.from(imageUploadInput.files || []);
    if (!files.length) {
      setStatus("请先选择图片");
      return;
    }
    setBusy(uploadImageBtn, true, "上传中...");
    try {
      const sources = await uploadFiles(files, ({ index, total, file, phase }) => {
        const current = Math.min(index + 1, total);
        setStatus(`${phase === "done" ? "已完成" : "正在上传"}图片：${current}/${total} ${file?.name || ""}`);
      });
      if (sources.length) {
        uploadedImagePath.focus();
        uploadedImagePath.select();
        setStatus(`已上传 ${sources.length} 张图片，可继续插入或替换`);
      }
    } catch {
      setStatus("图片上传失败：请检查图片格式或大小");
    } finally {
      setBusy(uploadImageBtn, false);
    }
  });
  generateWordBtn.addEventListener("click", async () => {
    const files = Array.from(wordUploadInput.files || []);
    if (!files.length) {
      setStatus("请先选择 Word 文件");
      return;
    }
    setBusy(generateWordBtn, true, "上传中...");
    try {
      setStatus(`准备上传 ${files.length} 个 Word 文件，请不要关闭页面`);
      const beforeCount = articles.length;
      const currentIndex = articles.findIndex((a) => a.id === currentId);
      if (currentIndex >= 0) syncInlineEdits(previewEl, articles[currentIndex]);
      setArticles(articles);
      articles = getArticles();
      const form = new FormData();
      files.forEach((file) => form.append("file", file));
      form.append("mode", "append");
      form.append("currentArticles", JSON.stringify(articles));
      const data = await uploadWithProgress("/api/generate-word", form, (percent) => {
        if (percent === null) {
          setStatus(`正在上传 ${files.length} 个 Word 文件，上传完成后会自动解析...`);
          return;
        }
        setStatus(`正在上传 Word：${percent}% ；上传完成后会继续解析图片和排版，请稍等`);
        if (percent >= 100) setBusy(generateWordBtn, true, "解析中...");
      });
      setStatus("上传完成，正在解析 Word、上传图片并生成排版...");
      if (Array.isArray(data.articles)) {
        setArticles(data.articles);
        articles = getArticles();
        currentId = articles[beforeCount]?.id || articles[0]?.id;
        drawList();
        drawPreview(currentId);
        setStatus(`已生成并保存 ${data.added || files.length} 篇文章，现在共 ${articles.length} 篇；左侧可复制客户预览链接，数据最多保留 7 天`);
      }
    } catch {
      setStatus("生成失败：请确认上传的是 .docx 文件，或文件过大时稍后再试");
    } finally {
      setBusy(generateWordBtn, false);
    }
  });
  insertImageBtn.addEventListener("click", async () => {
    const article = currentArticle();
    const sources = await chooseAndUploadImages({ multiple: true });
    if (!sources.length) {
      setStatus("未选择图片");
      return;
    }
    insertImageItemsNearSelection(article, itemsFromSources(sources));
  });
  replaceImageBtn.addEventListener("click", async () => {
    const article = currentArticle();
    if (selectedImageIndex === null || article.sections[selectedImageIndex]?.type !== "image") {
      setStatus("请先在中间预览里点击选中要替换的图片");
      return;
    }
    let imageItems = imageItemsFromUploads();
    if (!imageItems.length) {
      const sources = await chooseAndUploadImages({ multiple: true });
      imageItems = itemsFromSources(sources);
    }
    if (!imageItems.length) {
      setStatus("未选择图片");
      return;
    }
    article.sections.splice(selectedImageIndex, 1, ...imageItems);
    updateAfterImageChange(article, `已替换为 ${imageItems.length} 张图片，保存后客户可见`);
  });
  insertImageGroupBtn.addEventListener("click", async () => {
    const article = currentArticle();
    let groups = imageGroupFromUploads();
    if (!groups.length) {
      const sources = await chooseAndUploadImages({ multiple: true });
      groups = groupFromSources(sources);
    }
    if (!groups.length) {
      setStatus("未选择图片");
      return;
    }
    if (selectedImageIndex === null || !article.sections[selectedImageIndex]) {
      article.sections.push(...groups);
    } else {
      article.sections.splice(selectedImageIndex + 1, 0, ...groups);
    }
    const count = groups.reduce((sum, item) => sum + (item.type === "imageGroup" ? item.images.length : 1), 0);
    updateAfterImageChange(article, `已插入 ${count} 张图片，并自动拆成公众号稳定静态网格`);
  });
  deleteImageBtn.addEventListener("click", () => {
    const article = currentArticle();
    if (selectedImageIndex === null || !["image", "imageGroup"].includes(article.sections[selectedImageIndex]?.type)) {
      setStatus("请先在中间预览里点击选中要删除的图片或图片组");
      return;
    }
    deleteImageAt(article, selectedImageIndex);
  });
}

window.WechatSite = { renderClientPage, renderAdminPage, renderPreviewArticle, renderArticleListPage };
