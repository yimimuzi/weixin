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

function setArticles(articles) {
  window.WECHAT_ARTICLES = articles.map((article, index) => ({
    ...normalizeArticle(article),
    path: String(index + 1),
  }));
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

function getArticlePath(article, index) {
  return String(article.path || index + 1).replace(/^\/+|\/+$/g, "");
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

function editableAttrs(path) {
  return `contenteditable="true" data-edit="${esc(path)}" spellcheck="false"`;
}

const SCHOOL_TEMPLATES = [
  { id: "auto", label: "自动匹配", keywords: "", name: "red", accent: "#b71f1f", accentDark: "#8f1515", accentSoft: "#fff7f0", warm: "#fffaf2", warmDeep: "#f8f1e6", border: "#ead8bd", gold: "#d6a34a", title: "#8f1515", body: "#2f2f2f", muted: "#70665b", headingRadius: "0", titleBar: "line" },
  { id: "menu-xiumi", label: "秀米食谱参考风格", keywords: "菜谱|食谱|菜品|用餐|膳食|餐", name: "menu-xiumi", accent: "#6b9f39", accentDark: "#3f7b32", accentSoft: "#f3f8f0", warm: "#fff8df", warmDeep: "#eef6df", border: "#d6e6bd", gold: "#f4c84e", title: "#3f7b32", body: "#3a432e", muted: "#71815e", headingRadius: "20px", titleBar: "menu" },
  { id: "menu-card", label: "菜谱餐单专用模板", keywords: "菜谱|食谱|菜品|用餐|膳食|餐", name: "menu-card", accent: "#5b8f3a", accentDark: "#2f6f35", accentSoft: "#f1f8e9", warm: "#fff8e8", warmDeep: "#f6ead0", border: "#e6d2a8", gold: "#e3ad45", title: "#2f6f35", body: "#3a3428", muted: "#7a6a54", headingRadius: "18px", titleBar: "menu" },
  { id: "menu-fresh", label: "校园食谱清新绿", keywords: "食谱|菜品|用餐|膳食|餐", name: "menu", accent: "#4f8a3d", accentDark: "#2f6f35", accentSoft: "#eef8e8", warm: "#fff8e8", warmDeep: "#f6ead0", border: "#e5d5af", gold: "#e0a83f", title: "#2f6f35", body: "#33352e", muted: "#766a54", headingRadius: "12px", titleBar: "short" },
  { id: "menu-warm", label: "营养膳食暖橙", keywords: "食谱|营养|膳食", name: "menu", accent: "#d47a2c", accentDark: "#a9571e", accentSoft: "#fff4e8", warm: "#fffaf0", warmDeep: "#f5e2c6", border: "#ead2ae", gold: "#c99a3a", title: "#a9571e", body: "#3c3328", muted: "#7a6956", headingRadius: "14px", titleBar: "pill" },
  { id: "safety-blue", label: "安全教育蓝绿", keywords: "安全|防溺水|消防|交通|法治|演练", name: "safety", accent: "#276b7a", accentDark: "#174f5f", accentSoft: "#eef8f8", warm: "#f7fbf8", warmDeep: "#e9f3ee", border: "#c7dfdc", gold: "#d4a34f", title: "#174f5f", body: "#263b3d", muted: "#647274", headingRadius: "4px", titleBar: "line" },
  { id: "safety-navy", label: "法治安全深蓝", keywords: "法治|普法|安全|交通", name: "safety", accent: "#2f5487", accentDark: "#1e3f6d", accentSoft: "#edf4ff", warm: "#f8fbff", warmDeep: "#e5eef9", border: "#c7d7eb", gold: "#c89a43", title: "#1e3f6d", body: "#27364a", muted: "#657086", headingRadius: "0", titleBar: "short" },
  { id: "teaching-blue", label: "教学教研学院蓝", keywords: "教研|课堂|课程|教学|公开课|教师|培训|课题", name: "teaching", accent: "#3568a8", accentDark: "#224f87", accentSoft: "#eef5ff", warm: "#f8fbff", warmDeep: "#e8f0fb", border: "#cbdcf2", gold: "#c89a43", title: "#224f87", body: "#26364a", muted: "#647084", headingRadius: "4px", titleBar: "line" },
  { id: "teaching-ink", label: "书香课堂墨青", keywords: "课堂|读书|书香|课程", name: "teaching", accent: "#35625b", accentDark: "#244d47", accentSoft: "#edf7f5", warm: "#f8fbf8", warmDeep: "#e3efeb", border: "#c7ddd7", gold: "#b8954b", title: "#244d47", body: "#293b38", muted: "#64736f", headingRadius: "2px", titleBar: "short" },
  { id: "moral-red", label: "德育活动雅红", keywords: "少先队|德育|班会|志愿|文明|劳动|升旗|团委", name: "moral", accent: "#a54035", accentDark: "#833127", accentSoft: "#fff4ef", warm: "#fff9f4", warmDeep: "#f7eadf", border: "#ead2c2", gold: "#d4a34f", title: "#833127", body: "#3b302c", muted: "#76685f", headingRadius: "0", titleBar: "line" },
  { id: "moral-gold", label: "文明实践金红", keywords: "文明|实践|志愿|劳动", name: "moral", accent: "#b85638", accentDark: "#8d3d28", accentSoft: "#fff5eb", warm: "#fffaf2", warmDeep: "#f3e4ce", border: "#e5cdb1", gold: "#c39135", title: "#8d3d28", body: "#3c3028", muted: "#75675b", headingRadius: "10px", titleBar: "pill" },
  { id: "notice-brown", label: "通知公告稳重棕", keywords: "通知|公告|安排|放假|开学|家长|提醒|须知", name: "notice", accent: "#7a5130", accentDark: "#5f3c21", accentSoft: "#fff6ea", warm: "#fffaf4", warmDeep: "#f2e5d4", border: "#e2ceb7", gold: "#bc8b3c", title: "#5f3c21", body: "#3a322a", muted: "#75685b", headingRadius: "0", titleBar: "short" },
  { id: "notice-gray", label: "家校通知简洁灰", keywords: "通知|家长|须知|提醒", name: "notice", accent: "#5d6673", accentDark: "#404956", accentSoft: "#f3f5f7", warm: "#fafafa", warmDeep: "#eceff2", border: "#d9dee4", gold: "#b58b43", title: "#404956", body: "#30343a", muted: "#6c737d", headingRadius: "4px", titleBar: "line" },
  { id: "showcase-olive", label: "校园风采橄榄绿", keywords: "招生|报名|入学|校园开放|简介|风采|成果|荣誉", name: "showcase", accent: "#5a6f37", accentDark: "#445925", accentSoft: "#f1f7e9", warm: "#fffaf0", warmDeep: "#edf2df", border: "#d8dfc4", gold: "#c99a3d", title: "#445925", body: "#34392b", muted: "#6e725f", headingRadius: "12px", titleBar: "pill" },
  { id: "showcase-purple", label: "成果展示紫金", keywords: "成果|荣誉|展示|风采", name: "showcase", accent: "#6e4f8f", accentDark: "#563b73", accentSoft: "#f5effb", warm: "#fffafd", warmDeep: "#ece2f4", border: "#d9c7e8", gold: "#c49a45", title: "#563b73", body: "#352d3d", muted: "#706579", headingRadius: "10px", titleBar: "short" },
  { id: "sports-green", label: "体育运动活力绿", keywords: "运动|体育|比赛|运动会|足球|篮球|体质", name: "sports", accent: "#2f8f5b", accentDark: "#1f7044", accentSoft: "#edf9f2", warm: "#fbfff8", warmDeep: "#e4f2df", border: "#c8dfc4", gold: "#c99a37", title: "#1f7044", body: "#28382d", muted: "#637267", headingRadius: "16px", titleBar: "pill" },
  { id: "arts-rose", label: "艺术节柔玫", keywords: "艺术|美育|音乐|舞蹈|绘画|展演|朗诵", name: "arts", accent: "#b14d72", accentDark: "#8f3859", accentSoft: "#fff0f5", warm: "#fffafd", warmDeep: "#f4e2ea", border: "#e7c8d5", gold: "#c79a45", title: "#8f3859", body: "#3c2c34", muted: "#756570", headingRadius: "14px", titleBar: "pill" },
  { id: "reading-cyan", label: "阅读书香青蓝", keywords: "阅读|读书|书香|图书|经典|诵读", name: "reading", accent: "#277b8b", accentDark: "#1d6070", accentSoft: "#eef9fb", warm: "#fbfffe", warmDeep: "#e4f2f3", border: "#c8dfe3", gold: "#b8954b", title: "#1d6070", body: "#283b3f", muted: "#64767b", headingRadius: "6px", titleBar: "short" },
  { id: "research-indigo", label: "课题科研靛蓝", keywords: "课题|科研|研究|论文|成果|质量", name: "research", accent: "#4b5fa7", accentDark: "#37498b", accentSoft: "#f0f3ff", warm: "#fafbff", warmDeep: "#e6eafd", border: "#ccd3ef", gold: "#c09a43", title: "#37498b", body: "#30364d", muted: "#68708b", headingRadius: "2px", titleBar: "line" },
  { id: "health-mint", label: "心理健康薄荷", keywords: "心理|健康|卫生|成长|关爱", name: "health", accent: "#3f8f7b", accentDark: "#2d705f", accentSoft: "#effaf6", warm: "#fbfffc", warmDeep: "#e4f3ed", border: "#c8ded6", gold: "#c49a45", title: "#2d705f", body: "#2d3d38", muted: "#65756f", headingRadius: "14px", titleBar: "pill" },
  { id: "parent-tea", label: "家校共育茶绿", keywords: "家校|家长|共育|家庭|沟通", name: "parent", accent: "#6f7d3c", accentDark: "#556326", accentSoft: "#f4f7e9", warm: "#fffdf5", warmDeep: "#edf1d8", border: "#dce2bd", gold: "#b89542", title: "#556326", body: "#383b2b", muted: "#6f735f", headingRadius: "10px", titleBar: "short" },
  { id: "graduation-blue", label: "毕业典礼晴蓝", keywords: "毕业|典礼|成长|青春|仪式", name: "graduation", accent: "#3f78b5", accentDark: "#285f99", accentSoft: "#eef7ff", warm: "#fbfdff", warmDeep: "#e4eff8", border: "#c8dcee", gold: "#c99a3a", title: "#285f99", body: "#2b3846", muted: "#657486", headingRadius: "12px", titleBar: "pill" },
  { id: "festival-red", label: "节日庆典中国红", keywords: "元旦|春节|国庆|六一|节日|庆祝|庆典", name: "festival", accent: "#c3322e", accentDark: "#9f211f", accentSoft: "#fff2ed", warm: "#fff9f2", warmDeep: "#f6e2d2", border: "#e9c9b8", gold: "#d3a13d", title: "#9f211f", body: "#3c302b", muted: "#75665d", headingRadius: "0", titleBar: "line" },
  { id: "campus-clean", label: "校园简报清爽白", keywords: "简报|动态|新闻|校园", name: "clean", accent: "#40708f", accentDark: "#2b5874", accentSoft: "#f0f7fb", warm: "#fbfcfd", warmDeep: "#e8f0f4", border: "#d2dfe6", gold: "#b9934a", title: "#2b5874", body: "#30383d", muted: "#68757c", headingRadius: "4px", titleBar: "short" },
  { id: "campus-classic", label: "学校公文经典红", keywords: "会议|党建|工作|总结|简报", name: "classic", accent: "#a62222", accentDark: "#821818", accentSoft: "#fff5f2", warm: "#fffaf4", warmDeep: "#f5e7dc", border: "#e5cfc2", gold: "#c99a3d", title: "#821818", body: "#302d2b", muted: "#71665f", headingRadius: "0", titleBar: "line" },
  { id: "science-teal", label: "科技创新青紫", keywords: "科技|科学|创新|实验|信息|人工智能", name: "science", accent: "#317d91", accentDark: "#215f72", accentSoft: "#eef8fb", warm: "#fbfdff", warmDeep: "#e4eef5", border: "#c7dce5", gold: "#b89545", title: "#215f72", body: "#293940", muted: "#65767d", headingRadius: "8px", titleBar: "short" },
  { id: "kindergarten-soft", label: "幼儿园柔和彩", keywords: "幼儿|幼儿园|亲子|宝贝|童年", name: "kindergarten", accent: "#d46b7b", accentDark: "#aa4d5d", accentSoft: "#fff2f4", warm: "#fffdf8", warmDeep: "#f8e8df", border: "#ebd2cb", gold: "#c99a43", title: "#aa4d5d", body: "#3c3230", muted: "#786a66", headingRadius: "16px", titleBar: "pill" },
];

function templateById(id) {
  return SCHOOL_TEMPLATES.find((template) => template.id === id);
}

function articleTheme(article) {
  const manual = templateById(article.themeId);
  if (manual && manual.id !== "auto") return manual;
  const text = `${article.title || ""} ${article.subtitle || ""} ${(article.sections || [])
    .map((item) => item.text || item.label || item.title || "")
    .join(" ")}`;
  return SCHOOL_TEMPLATES.find((template) => template.keywords && new RegExp(template.keywords).test(text)) || SCHOOL_TEMPLATES[0];
}

function decorationLabel(theme) {
  const labels = {
    "menu-xiumi": "校园食谱",
    menu: "营养校园",
    safety: "安全校园",
    teaching: "教学教研",
    moral: "德育活动",
    notice: "家校通知",
    showcase: "校园风采",
    sports: "阳光体育",
    arts: "美育校园",
    reading: "书香校园",
    research: "课题研究",
    health: "健康成长",
    parent: "家校共育",
    graduation: "成长仪式",
    festival: "校园庆典",
    clean: "校园动态",
    classic: "学校简报",
    science: "科技创新",
    kindergarten: "童心校园",
  };
  return labels[theme.name] || "校园动态";
}

const DECORATION_SCHEMES = [
  { id: "line-dot", label: "中轴线点", full: "● ━━━━━ ● ━━━━━ ●", short: "━━━━━━ ● ━━━━━━", top: "● ● ●", heading: "center-pill", paragraph: "left-gold", image: "thin", footer: "badge" },
  { id: "double-dot", label: "双点边栏", full: "● ─── ● ─── ●", short: "─── ● ───", top: "●  ●", heading: "left-block", paragraph: "side-soft", image: "label", footer: "line" },
  { id: "square-line", label: "方块校刊", full: "■ ━━━━━ ■ ━━━━━ ■", short: "━━━━ ■ ━━━━", top: "■ ■ ■", heading: "square-band", paragraph: "top-strip", image: "mat", footer: "box" },
  { id: "diamond-line", label: "菱形栏目", full: "◆ ━━━━━ ◆ ━━━━━ ◆", short: "━━━━ ◆ ━━━━", top: "◆ ◆ ◆", heading: "bracket", paragraph: "corner", image: "corner", footer: "badge" },
  { id: "circle-light", label: "轻圆留白", full: "○ ───── ○ ───── ○", short: "──── ○ ────", top: "○ ○ ○", heading: "quiet", paragraph: "soft-card", image: "plain", footer: "line" },
  { id: "star-formal", label: "星标荣誉", full: "★ ━━━━━ ★ ━━━━━ ★", short: "━━━━ ★ ━━━━", top: "★ ★ ★", heading: "stamp", paragraph: "formal", image: "gold", footer: "box" },
  { id: "bookish", label: "书香卷页", full: "【 ● 】────────【 ● 】", short: "【 ● 】──────", top: "【 校园 】", heading: "book", paragraph: "note", image: "book", footer: "badge" },
  { id: "notice", label: "通知短栏", full: "——  ●  ——  ●  ——", short: "——  ●  ——", top: "—— ● ——", heading: "notice", paragraph: "notice", image: "thin", footer: "line" },
  { id: "fresh", label: "清新点线", full: "● · · · ● · · · ●", short: "· · ● · ·", top: "● · ●", heading: "leaf", paragraph: "fresh", image: "soft", footer: "badge" },
  { id: "classic", label: "经典横线", full: "━━━━━━━━━━━━", short: "━━━━━━", top: "━━━━", heading: "classic", paragraph: "formal", image: "thin", footer: "line" },
  { id: "warm", label: "暖色底纹", full: "●  ●  ●  ●  ●", short: "●  ●  ●", top: "● ●", heading: "warm", paragraph: "warm", image: "mat", footer: "box" },
  { id: "safety", label: "安全提示牌", full: "● ━━ 安全 ━━ ●", short: "━━ ● ━━", top: "● 安全 ●", heading: "warning", paragraph: "side-soft", image: "label", footer: "box" },
  { id: "teaching", label: "课堂笔记", full: "◆ ── 课堂 ── ◆", short: "── ◆ ──", top: "◆ 课堂 ◆", heading: "book", paragraph: "note", image: "book", footer: "line" },
  { id: "moral", label: "德育章印", full: "● ━━ 德育 ━━ ●", short: "━━ ● ━━", top: "● 德育 ●", heading: "stamp", paragraph: "corner", image: "gold", footer: "badge" },
  { id: "menu", label: "食谱餐盘", full: "● ━━ 餐单 ━━ ●", short: "━━━━ ● ━━━━", top: "● 餐单 ●", heading: "menu-tab", paragraph: "menu-card", image: "mat", footer: "box" },
  { id: "sports", label: "活力赛道", full: "● ─ ● ─ ● ─ ●", short: "● ─ ●", top: "● ● ●", heading: "track", paragraph: "fresh", image: "corner", footer: "badge" },
  { id: "arts", label: "美育展签", full: "◆ · · 艺术 · · ◆", short: "· · ◆ · ·", top: "◆ ◆", heading: "gallery", paragraph: "soft-card", image: "label", footer: "badge" },
  { id: "parent", label: "家校便签", full: "● ─ 家校 ─ ●", short: "── ● ──", top: "● 家校 ●", heading: "notice", paragraph: "note", image: "soft", footer: "line" },
  { id: "science", label: "科技模块", full: "■ ── 创新 ── ■", short: "── ■ ──", top: "■ 创新 ■", heading: "square-band", paragraph: "top-strip", image: "corner", footer: "box" },
  { id: "soft", label: "柔和框景", full: "○  ○  ○  ○  ○", short: "○  ○  ○", top: "○ ○", heading: "quiet", paragraph: "soft-card", image: "soft", footer: "line" },
];

const LAYOUT_SCHEMES = [
  { id: "auto", label: "按内容自动排版", keywords: "", header: "center", heading: "badge", paragraph: "card", image: "full", group: "grid", footer: "soft" },
  { id: "cover-card", label: "封面感标题", keywords: "招生|报名|简介|风采|成果|荣誉|毕业|典礼", header: "cover", heading: "badge", paragraph: "card", image: "full", group: "grid", footer: "soft" },
  { id: "notice-compact", label: "通知紧凑版", keywords: "通知|公告|安排|放假|开学|家长|提醒|须知", header: "compact", heading: "left", paragraph: "plain-box", image: "full", group: "grid", footer: "line" },
  { id: "timeline", label: "活动时间轴", keywords: "活动|开展|举行|启动|过程|现场|实践|研学|志愿", header: "center", heading: "timeline", paragraph: "timeline", image: "framed", group: "grid", footer: "soft" },
  { id: "magazine", label: "校园杂志版", keywords: "简报|动态|新闻|校园|展示|风采", header: "magazine", heading: "split", paragraph: "magazine", image: "framed", group: "grid", footer: "badge" },
  { id: "menu-board", label: "食谱公告板", keywords: "菜谱|食谱|菜品|用餐|膳食|餐|营养", header: "menu", heading: "menu", paragraph: "menu", image: "mat", group: "grid", footer: "soft" },
  { id: "report-formal", label: "正式简报版", keywords: "会议|党建|工作|总结|检查|督导|调研|质量", header: "formal", heading: "line", paragraph: "formal", image: "full", group: "grid", footer: "line" },
  { id: "photo-first", label: "图片优先版", keywords: "现场|照片|图片|展演|比赛|运动会|艺术|美育", header: "center", heading: "photo", paragraph: "card", image: "featured", group: "grid", footer: "badge" },
  { id: "soft-card", label: "柔和卡片版", keywords: "心理|健康|关爱|成长|家校|共育|幼儿|亲子", header: "soft", heading: "soft", paragraph: "card", image: "soft", group: "grid", footer: "soft" },
  { id: "section-bands", label: "栏目色带版", keywords: "德育|少先队|班会|文明|劳动|升旗|安全|法治|消防", header: "band", heading: "band", paragraph: "band", image: "framed", group: "grid", footer: "badge" },
  { id: "minimal-clean", label: "清爽留白版", keywords: "阅读|读书|书香|课程|教研|课堂|培训", header: "minimal", heading: "quiet", paragraph: "clean", image: "full", group: "grid", footer: "line" },
];

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
  const text = `${article.title || ""} ${article.subtitle || ""} ${theme.name || ""}`;
  if (/菜谱|食谱|菜品|用餐|膳食|餐/.test(text)) return DECORATION_SCHEMES.find((scheme) => scheme.id === "menu");
  if (/安全|防溺水|消防|交通|法治|演练/.test(text)) return DECORATION_SCHEMES.find((scheme) => scheme.id === "safety");
  if (/教研|课堂|课程|教学|公开课|教师|培训/.test(text)) return DECORATION_SCHEMES.find((scheme) => scheme.id === "teaching");
  if (/德育|少先队|班会|志愿|文明|劳动|升旗/.test(text)) return DECORATION_SCHEMES.find((scheme) => scheme.id === "moral");
  const index = stableHash(text) % DECORATION_SCHEMES.length;
  return DECORATION_SCHEMES[index];
}

function layoutById(id) {
  return LAYOUT_SCHEMES.find((layout) => layout.id === id);
}

function articleText(article, theme = {}) {
  return `${article.title || ""} ${article.subtitle || ""} ${article.intro || ""} ${theme.name || ""} ${(article.sections || [])
    .map((item) => item.text || item.label || item.title || (item.images || []).map((image) => image.alt || "").join(" "))
    .join(" ")}`;
}

function layoutScheme(article, theme) {
  const explicit = layoutById(article.layoutId);
  if (explicit && explicit.id !== "auto") return explicit;
  const text = articleText(article, theme);
  return LAYOUT_SCHEMES.find((layout) => layout.keywords && new RegExp(layout.keywords).test(text)) || LAYOUT_SCHEMES[0];
}

function stableDecoration(article, theme, variant = "full") {
  const scheme = decorationScheme(article, theme);
  const text = variant === "short" ? scheme.short : variant === "top" ? scheme.top : scheme.full;
  const margin = variant === "short" ? "0 0 10px" : "12px 0 0";
  const color = variant === "top" ? theme.gold : variant === "short" ? theme.gold : theme.accent;
  const size = variant === "top" ? "18px" : "14px";
  return `<p style="margin:${margin};text-align:center;color:${color};font-size:${size};line-height:1.5;">${esc(text)}</p>`;
}

function headerHtml(article, theme, layout, decoration, editable, decorated, bits) {
  const subtitleHtml = article.subtitle
    ? `<p ${editable ? editableAttrs("subtitle") : ""} style="margin:14px auto 0;color:${theme.muted};font-size:16px;line-height:1.85;max-width:590px;">${esc(article.subtitle)}</p>`
    : "";
  const titleAttrs = editable ? editableAttrs("title") : "";
  const baseTitle = `margin:0 auto;color:${theme.title};font-size:28px;line-height:1.4;font-weight:800;letter-spacing:0;max-width:590px;`;
  const label = decorationLabel(theme);
  if (layout.header === "cover") {
    return `<section style="margin:0 0 24px;padding:34px 18px 30px;text-align:center;background:${theme.warm};border:1px solid ${theme.border};border-top:6px solid ${theme.accent};">
      ${decorated ? bits.top : ""}
      <p style="margin:0 0 12px;color:${theme.gold};font-size:14px;line-height:1.6;">${esc(label)}</p>
      <h1 ${titleAttrs} style="${baseTitle}font-size:30px;">${esc(article.title)}</h1>
      ${subtitleHtml}
      ${decorated ? bits.full : ""}
    </section>`;
  }
  if (layout.header === "compact") {
    return `<section style="margin:0 0 18px;padding:24px 0 18px;text-align:left;border-bottom:2px solid ${theme.accent};">
      <p style="margin:0 0 8px;color:${theme.accent};font-size:13px;line-height:1.6;font-weight:700;">${esc(label)}</p>
      <h1 ${titleAttrs} style="${baseTitle}font-size:26px;text-align:left;">${esc(article.title)}</h1>
      ${subtitleHtml}
    </section>`;
  }
  if (layout.header === "magazine") {
    return `<section style="margin:0 0 24px;padding:28px 0 22px;text-align:left;border-top:8px solid ${theme.accent};border-bottom:1px solid ${theme.border};">
      <p style="margin:0 0 10px;color:${theme.gold};font-size:13px;line-height:1.6;font-weight:700;">${decorated ? esc(decoration.top) : esc(label)}</p>
      <h1 ${titleAttrs} style="${baseTitle}font-size:31px;text-align:left;">${esc(article.title)}</h1>
      ${subtitleHtml}
      ${decorated ? bits.short : ""}
    </section>`;
  }
  if (layout.header === "menu") {
    return `<section style="margin:0 0 22px;padding:34px 16px 30px;text-align:center;background:${theme.accentSoft};border:1px solid ${theme.border};border-radius:0 0 22px 22px;">
      ${decorated ? bits.top : ""}
      <div style="margin:0 auto 16px;width:86%;height:12px;background:${theme.warmDeep};border:1px solid ${theme.border};border-radius:999px;"></div>
      <h1 ${titleAttrs} style="${baseTitle}font-size:29px;color:${theme.title};">${esc(article.title)}</h1>
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
      <h1 ${titleAttrs} style="${baseTitle}">${esc(article.title)}</h1>
      ${subtitleHtml}
    </section>`;
  }
  if (layout.header === "band") {
    return `<section style="margin:0 0 24px;padding:0;text-align:center;background:${theme.warm};border:1px solid ${theme.border};">
      <div style="height:12px;background:${theme.accent};"></div>
      <div style="padding:28px 18px 24px;">
        <h1 ${titleAttrs} style="${baseTitle}">${esc(article.title)}</h1>
        ${subtitleHtml}
        ${decorated ? bits.full : ""}
      </div>
    </section>`;
  }
  if (layout.header === "minimal") {
    return `<section style="margin:0 0 22px;padding:28px 0 16px;text-align:center;border-bottom:1px solid ${theme.border};">
      <h1 ${titleAttrs} style="${baseTitle}font-size:27px;">${esc(article.title)}</h1>
      ${subtitleHtml}
    </section>`;
  }
  return `<section style="padding:30px 0 18px;text-align:center;border-bottom:2px solid ${theme.accent};background:transparent;">
    ${decorated ? bits.top : ""}
    <div style="margin:0 auto 12px;width:54px;height:4px;background:${theme.gold};border-radius:2px;"></div>
    <div style="display:inline-block;margin:0 auto 12px;padding:5px 14px;border:1px solid ${theme.border};border-radius:999px;color:${theme.muted};background:#fff;font-size:13px;line-height:1.5;">${esc(label)}</div>
    <h1 ${titleAttrs} style="${baseTitle}font-size:27px;">${esc(article.title)}</h1>
    ${subtitleHtml}
    ${decorated ? bits.full : ""}
  </section>`;
}

function introHtml(article, theme, layout, decoration, editable) {
  if (!article.intro) return "";
  const style = layout.paragraph === "clean" ? "background:#fff;border-bottom:1px solid " + theme.border : `background:${theme.warm};border:1px solid ${theme.border};border-left:5px solid ${theme.accent}`;
  return `<section style="margin:22px 0 28px;padding:18px 18px;${style};">
    <p ${editable ? editableAttrs("intro") : ""} style="margin:0;color:${theme.body};font-size:16px;line-height:1.95;text-align:justify;text-indent:2em;">${esc(article.intro)}</p>
  </section>`;
}

function headingHtml(item, index, theme, layout, decoration, editable, decorated, bits) {
  const labelAttrs = editable ? editableAttrs(`sections.${index}.label`) : "";
  const textAttrs = editable ? editableAttrs(`sections.${index}.text`) : "";
  const label = `<span ${labelAttrs} style="display:inline-block;margin-right:8px;font-size:13px;font-weight:700;line-height:1.5;color:#fff;">${esc(item.label)}</span>`;
  const text = `<span ${textAttrs} style="display:inline-block;font-size:18px;font-weight:800;line-height:1.5;color:#fff;vertical-align:middle;">${esc(item.text)}</span>`;
  const scheme = decoration.heading;
  if (layout.heading === "timeline" || scheme === "left-block") {
    return `<section style="margin:32px 0 0;padding:0 0 0 14px;border-left:4px solid ${theme.accent};">
      <div style="display:inline-block;padding:7px 14px;background:${theme.accent};color:#fff;">${label}${text}</div>
    </section>`;
  }
  if (layout.heading === "line" || scheme === "classic") {
    return `<section style="margin:34px 0 0;padding:0 0 11px;border-bottom:2px solid ${theme.border};">
      <span ${labelAttrs} style="display:inline-block;background:${theme.accent};color:#fff;font-size:14px;font-weight:700;line-height:1.4;padding:5px 10px;">${esc(item.label)}</span>
      <span ${textAttrs} style="display:inline-block;margin-left:10px;color:${theme.title};font-size:19px;font-weight:800;line-height:1.5;">${esc(item.text)}</span>
    </section>`;
  }
  if (layout.heading === "menu" || scheme === "menu-tab") {
    return `<section style="margin:34px 0 0;text-align:center;">
      ${decorated ? bits.short : ""}
      <div style="display:inline-block;max-width:100%;padding:8px 18px;background:${theme.accent};border:2px solid #ffffff;border-radius:999px;">
        ${label}${text}
      </div>
    </section>`;
  }
  if (layout.heading === "split" || scheme === "square-band") {
    return `<section style="margin:34px 0 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:54px;background:${theme.accent};color:#fff;text-align:center;font-size:15px;font-weight:800;padding:9px 6px;">${esc(item.label)}</td>
          <td style="background:${theme.accentSoft};border:1px solid ${theme.border};border-left:0;padding:9px 12px;color:${theme.title};font-size:18px;font-weight:800;">${esc(item.text)}</td>
        </tr>
      </table>
    </section>`;
  }
  if (layout.heading === "band" || scheme === "warning" || scheme === "stamp") {
    return `<section style="margin:34px 0 0;padding:10px 12px;background:${theme.accent};color:#fff;text-align:center;">
      ${label}${text}
    </section>`;
  }
  if (layout.heading === "quiet" || scheme === "quiet") {
    return `<section style="margin:34px 0 0;text-align:left;">
      <p style="margin:0 0 8px;color:${theme.gold};font-size:14px;line-height:1.6;">${decorated ? esc(decoration.short) : ""}</p>
      <h2 ${textAttrs} style="margin:0;color:${theme.title};font-size:20px;line-height:1.5;font-weight:800;">${esc(item.text)}</h2>
    </section>`;
  }
  return `<section style="margin:34px 0 0;text-align:center;">
    ${decorated ? bits.short : ""}
    <section style="display:inline-block;max-width:100%;padding:8px 18px;background:${theme.accent};border:2px solid #ffffff;border-radius:18px;">
      ${label}${text}
    </section>
  </section>`;
}

function paragraphHtml(item, index, theme, layout, decoration, editable) {
  const attrs = editable ? editableAttrs(`sections.${index}.text`) : "";
  const common = `margin:0;color:${theme.body};font-size:16px;line-height:2;text-align:justify;text-indent:2em;`;
  const variant = layout.paragraph === "timeline" ? "timeline" : decoration.paragraph;
  if (layout.paragraph === "clean") {
    return `<section style="margin:14px 0 0;padding:0 2px 12px;border-bottom:1px solid ${theme.border};"><p ${attrs} style="${common}">${esc(item.text)}</p></section>`;
  }
  if (variant === "timeline") {
    return `<section style="margin:14px 0 0;padding:14px 16px 14px 18px;background:${theme.warm};border-left:4px solid ${theme.gold};"><p ${attrs} style="${common}">${esc(item.text)}</p></section>`;
  }
  if (variant === "top-strip") {
    return `<section style="margin:14px 0 0;background:${theme.warm};border:1px solid ${theme.border};"><div style="height:7px;background:${theme.accentSoft};border-bottom:1px solid ${theme.border};"></div><p ${attrs} style="${common}padding:14px 16px;">${esc(item.text)}</p></section>`;
  }
  if (variant === "side-soft" || variant === "left-gold") {
    return `<section style="margin:14px 0 0;padding:15px 16px;background:${theme.warm};border:1px solid ${theme.border};border-left:5px solid ${variant === "left-gold" ? theme.gold : theme.accent};"><p ${attrs} style="${common}">${esc(item.text)}</p></section>`;
  }
  if (variant === "corner") {
    return `<section style="margin:14px 0 0;padding:16px 18px;background:#fff;border:1px solid ${theme.border};border-top:4px solid ${theme.gold};"><p ${attrs} style="${common}">${esc(item.text)}</p></section>`;
  }
  if (variant === "notice") {
    return `<section style="margin:14px 0 0;padding:14px 16px;background:${theme.accentSoft};border:1px dashed ${theme.accent};"><p ${attrs} style="${common}">${esc(item.text)}</p></section>`;
  }
  if (variant === "note") {
    return `<section style="margin:14px 0 0;padding:16px 18px;background:${theme.warmDeep};border:1px solid ${theme.border};"><p ${attrs} style="${common}">${esc(item.text)}</p></section>`;
  }
  return `<section style="margin:14px 0 0;padding:16px 18px;background:${theme.warm};border:1px solid ${theme.border};"><p ${attrs} style="${common}">${esc(item.text)}</p></section>`;
}

function gridColumns(count) {
  if (count <= 1) return 1;
  if (count === 2 || count === 4) return 2;
  return 3;
}

function renderImageGrid(images, theme, decoration = {}) {
  const cols = gridColumns(images.length);
  const rows = [];
  for (let i = 0; i < images.length; i += cols) rows.push(images.slice(i, i + cols));
  const border = decoration.image === "gold" ? `2px solid ${theme.gold}` : `1px solid ${theme.border}`;
  const bg = decoration.image === "mat" || decoration.image === "book" ? theme.warm : theme.accentSoft;
  const padding = decoration.image === "mat" || decoration.image === "book" ? "6px" : "0";
  return `
    <section style="margin:20px 0 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:8px;table-layout:fixed;">
        ${rows
          .map(
            (row) => `<tr>${row
              .map(
                (image) => `
                  <td style="width:${100 / cols}%;padding:${padding};vertical-align:top;background:${bg};border:${border};">
                    <img src="${esc(normalizeSrc(image.src))}" alt="${esc(image.alt || "文章图片")}" style="display:block;width:100%;height:auto;margin:0;">
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
  const border = variant === "gold" ? `2px solid ${theme.gold}` : `1px solid ${theme.border}`;
  const radius = variant === "soft" ? "14px" : "4px";
  const wrapBg = variant === "mat" || variant === "book" ? theme.warm : "#fff";
  const pad = variant === "mat" || variant === "book" || variant === "featured" ? "8px" : "0";
  const top = variant === "label" ? `<p style="margin:0 0 8px;color:${theme.muted};font-size:13px;line-height:1.6;text-align:center;">${esc(decorationLabel(theme))}</p>` : "";
  const bottom = variant === "corner" ? `<div style="height:6px;background:${theme.accentSoft};border:1px solid ${theme.border};border-top:0;"></div>` : "";
  return `<section data-image-section="${editable ? index : ""}" style="margin:20px 0 0;text-align:center;background:${wrapBg};padding:${pad};border:${variant === "featured" ? "1px solid " + theme.border : "0"};">
    ${top}
    <img src="${esc(normalizeSrc(item.src))}" alt="${esc(item.alt)}" style="display:block;width:100%;height:auto;border-radius:${radius};margin:0 auto;border:${border};">
    ${bottom}
    ${imageTools(index)}
  </section>`;
}

function closingHtml(article, theme, layout, decoration, editable) {
  if (!article.closing) return "";
  return `<section style="margin:34px 0 0;padding:20px 18px;background:${theme.accentSoft};border-top:3px solid ${theme.accent};border-bottom:1px solid ${theme.border};">
    <p ${editable ? editableAttrs("closing") : ""} style="margin:0;color:${theme.body};font-size:16px;line-height:1.95;text-align:justify;text-indent:2em;font-weight:600;">${esc(article.closing)}</p>
  </section>`;
}

function footerHtml(article, theme, layout, decoration, editable, decorated) {
  if (!article.footer?.length) return "";
  const label = decorated ? `<div style="margin:0 0 10px;text-align:center;color:${theme.accent};font-size:13px;font-weight:700;">· ${esc(decorationLabel(theme))} ·</div>` : "";
  const style =
    decoration.footer === "box" || layout.footer === "soft"
      ? `background:${theme.warmDeep};border:1px solid ${theme.border};padding:16px 16px;`
      : `border-top:1px solid ${theme.border};padding:14px 0 0;`;
  return `<section style="margin:30px 0 0;${style}color:${theme.muted};font-size:14px;line-height:1.9;">
    ${label}
    ${article.footer.map((line, index) => `<p ${editable ? editableAttrs(`footer.${index}`) : ""} style="margin:0;">${esc(line)}</p>`).join("")}
  </section>`;
}

function findArticleFromLocation() {
  const articles = getArticles();
  const params = new URLSearchParams(location.search);
  const requested = params.get("article");
  const pathPart = location.pathname.replace(/^\/+|\/+$/g, "");
  if (requested) {
    return articles.find((a, idx) => a.id === requested || getArticlePath(a, idx) === requested) || articles[0];
  }
  if (pathPart && pathPart !== "index.html") {
    return articles.find((a, idx) => a.id === pathPart || getArticlePath(a, idx) === pathPart) || articles[0];
  }
  return articles[0];
}

function renderArticle(article, options = {}) {
  const editable = Boolean(options.editable);
  const forWechat = Boolean(options.forWechat);
  const theme = articleTheme(article);
  const layout = layoutScheme(article, theme);
  const decoration = decorationScheme(article, theme);
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
    ${headerHtml(article, theme, layout, decoration, editable, decorated, bits)}
    ${introHtml(article, theme, layout, decoration, editable)}
    ${article.sections
      .map((item, index) => {
        if (item.type === "heading") {
          return headingHtml(item, index, theme, layout, decoration, editable, decorated, bits);
        }
        if (item.type === "paragraph") {
          return paragraphHtml(item, index, theme, layout, decoration, editable);
        }
        if (item.type === "imageGroup") {
          const images = item.images || [];
          const groupHtml = renderImageGrid(images, theme, decoration);
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
    ${closingHtml(article, theme, layout, decoration, editable)}
    ${footerHtml(article, theme, layout, decoration, editable, decorated)}
  `;
}

async function renderClientPage(container) {
  await loadSavedArticles();
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

function articleToEditableText(article) {
  return article.sections
    .map((item) => {
      if (item.type === "heading") return `## ${item.label} ${item.text}`;
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
        title: "图片组",
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
  const text = value.replace(/\u00a0/g, " ").trim();
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
  let uploadedImageSrcs = [];
  let editBodyCursor = 0;
  function setStatus(msg) {
    statusEl.textContent = msg;
  }
  function currentArticle() {
    return articles.find((a) => a.id === currentId) || articles[0];
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
  async function uploadFiles(files) {
    const sources = [];
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("upload_failed");
      const data = await res.json();
      sources.push(data.src);
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
    setStatus("正在上传图片...");
    try {
      const sources = await uploadFiles(files);
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
    if (!sources.length) return null;
    return {
      type: "imageGroup",
      title: "图片组",
      display: "grid",
      images: sources.map((src) => ({ src, alt: "文章图片" })),
    };
  }
  function imageGroupFromUploads() {
    const images = getUploadSources().map((src) => ({ src, alt: "文章图片" }));
    if (!images.length) return null;
    return { type: "imageGroup", title: "图片组", display: "grid", images };
  }
  function updateAfterImageChange(article, message) {
    syncEditor(article);
    drawPreview(article.id);
    setStatus(message);
  }
  function insertImagesAt(article, index, placement) {
    const imageItems = imageItemsFromUploads();
    if (!imageItems.length) {
      setStatus("请先上传图片，或填写图片路径");
      return;
    }
    const insertAt = placement === "before" ? index : index + 1;
    article.sections.splice(insertAt, 0, ...imageItems);
    updateAfterImageChange(article, `已插入 ${imageItems.length} 张图片，保存线上后客户可见`);
  }
  function insertImageItemsAt(article, index, placement, imageItems) {
    if (!imageItems.length) return;
    const insertAt = placement === "before" ? index : index + 1;
    article.sections.splice(insertAt, 0, ...imageItems);
    updateAfterImageChange(article, `已插入 ${imageItems.length} 张图片，保存线上后客户可见`);
  }
  function insertImageGroupAt(article, index, placement, group) {
    if (!group) return;
    const insertAt = placement === "before" ? index : index + 1;
    article.sections.splice(insertAt, 0, group);
    updateAfterImageChange(article, `已插入 ${group.images.length} 张图片的静态网格，客户预览和公众号发布保持一致`);
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
    updateAfterImageChange(article, `已替换为 ${imageItems.length} 张图片，保存线上后客户可见`);
  }
  function replaceImageGroupAt(article, index) {
    const group = imageGroupFromUploads();
    if (!group) {
      setStatus("请先上传图片，或填写图片路径");
      return;
    }
    article.sections.splice(index, 1, group);
    updateAfterImageChange(article, `已替换为 ${group.images.length} 张图片组成的静态网格，保存线上后客户可见`);
  }
  function deleteImageAt(article, index) {
    if (!["image", "imageGroup"].includes(article.sections[index]?.type)) {
      setStatus("请先选择要删除的图片或图片组");
      return;
    }
    article.sections.splice(index, 1);
    updateAfterImageChange(article, "已删除图片，保存线上后客户可见");
  }
  function drawPreview(id) {
    currentId = id;
    selectedImageIndex = null;
    const article = currentArticle();
    previewEl.innerHTML = renderArticle(article, { editable: true });
    syncEditor(article);
    previewEl.querySelectorAll("[contenteditable]").forEach((el) => {
      el.addEventListener("input", () => {
        syncInlineEdits(previewEl, article);
        syncEditor(article);
        setStatus("已在文章内修改，保存后客户页面生效");
      });
    });
    previewEl.querySelectorAll("[data-image-section]").forEach((el) => {
      el.addEventListener("click", () => {
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
            updateAfterImageChange(article, `已替换为 ${sources.length} 张图片，保存线上后客户可见`);
          }
        }
        if (btn.dataset.imageAction === "replace-group") {
          const sources = await chooseAndUploadImages({ multiple: true });
          const group = groupFromSources(sources);
          if (group) {
            article.sections.splice(index, 1, group);
            updateAfterImageChange(article, `已替换为 ${group.images.length} 张图片组成的静态网格，保存线上后客户可见`);
          }
        }
        if (btn.dataset.imageAction === "delete") deleteImageAt(article, index);
      });
    });
  }
  function setInlineEditMode(enabled) {
    inlineEditMode = true;
    document.body.classList.add("editing-inline");
    document.getElementById("toggleInlineEditBtn").textContent = "文章文字可直接编辑";
    drawPreview(currentId);
    setStatus("文章内编辑已开启：直接点击中间预览里的文字修改");
  }
  function drawList() {
    listEl.innerHTML = articles
      .map(
        (a, idx) => `
        <button data-id="${esc(a.id)}" style="display:block;width:100%;text-align:left;border:1px solid #eadbd2;background:${idx === 0 ? "#fff7f0" : "#fff"};padding:12px 12px;border-radius:6px;margin:0 0 8px;cursor:pointer;">
          <div style="font-size:12px;color:#7a6a5e;margin-bottom:4px;">第 ${idx + 1} 篇：/${idx + 1}/</div>
          <div style="font-weight:700;color:#9e1f1f;">${esc(a.title)}</div>
          <div style="font-size:13px;color:#7a6a5e;margin-top:4px;">${esc(a.subtitle)}</div>
          <div style="font-size:12px;color:#7a6a5e;margin-top:4px;">风格：${esc(templateById(a.themeId)?.label || "自动匹配")}</div>
          <div style="font-size:12px;color:#7a6a5e;margin-top:4px;">排版：${esc(layoutById(a.layoutId)?.label || "按内容自动排版")}</div>
          <div style="font-size:12px;color:#9e1f1f;margin-top:6px;">${esc(getArticleUrl(a, idx))}</div>
        </button>`
      )
      .join("");
    listEl.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        listEl.querySelectorAll("button").forEach((b) => (b.style.background = "#fff"));
        btn.style.background = "#fff7f0";
        selectEl.value = btn.dataset.id;
        drawPreview(btn.dataset.id);
        setStatus("已切换文章");
      });
    });
    selectEl.innerHTML = articles
      .map((a, idx) => `<option value="${esc(a.id)}">第 ${idx + 1} 篇：${esc(a.title)}</option>`)
      .join("");
    selectEl.value = currentId;
  }
  const copyHtmlBtn = document.getElementById("copyHtmlBtn");
  const copyTextBtn = document.getElementById("copyTextBtn");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const applyEditBtn = document.getElementById("applyEditBtn");
  const saveOnlineBtn = document.getElementById("saveOnlineBtn");
  const topSaveOnlineBtn = document.getElementById("topSaveOnlineBtn");
  const toggleInlineEditBtn = document.getElementById("toggleInlineEditBtn");
  const imageUploadInput = document.getElementById("imageUploadInput");
  const uploadImageBtn = document.getElementById("uploadImageBtn");
  const wordUploadInput = document.getElementById("wordUploadInput");
  const generateWordBtn = document.getElementById("generateWordBtn");
  const templateSelect = document.getElementById("templateSelect");
  const prevTemplateBtn = document.getElementById("prevTemplateBtn");
  const nextTemplateBtn = document.getElementById("nextTemplateBtn");
  const autoTemplateBtn = document.getElementById("autoTemplateBtn");
  const applyTemplateBtn = document.getElementById("applyTemplateBtn");
  const decoratedToggle = document.getElementById("decoratedToggle");
  const decorationSelect = document.getElementById("decorationSelect");
  const randomDecorationBtn = document.getElementById("randomDecorationBtn");
  const layoutSelect = document.getElementById("layoutSelect");
  const randomLayoutBtn = document.getElementById("randomLayoutBtn");
  const insertImageBtn = document.getElementById("insertImageBtn");
  const replaceImageBtn = document.getElementById("replaceImageBtn");
  const deleteImageBtn = document.getElementById("deleteImageBtn");
  const insertImageGroupBtn = document.getElementById("insertImageGroupBtn");
  const uploadedImagePath = document.getElementById("uploadedImagePath");
  templateSelect.innerHTML = SCHOOL_TEMPLATES.map(
    (template) => `<option value="${esc(template.id)}">${esc(template.label)}</option>`
  ).join("");
  decorationSelect.innerHTML = `<option value="">按内容自动选择</option>${DECORATION_SCHEMES.map(
    (scheme) => `<option value="${esc(scheme.id)}">${esc(scheme.label)}</option>`
  ).join("")}`;
  layoutSelect.innerHTML = LAYOUT_SCHEMES.map((layout) => `<option value="${esc(layout.id)}">${esc(layout.label)}</option>`).join("");
  selectEl.addEventListener("change", () => drawPreview(selectEl.value));
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
  }
  function stepTemplate(direction) {
    const article = currentArticle();
    const current = article?.themeId || templateSelect.value || "auto";
    const index = Math.max(0, SCHOOL_TEMPLATES.findIndex((template) => template.id === current));
    const nextIndex = (index + direction + SCHOOL_TEMPLATES.length) % SCHOOL_TEMPLATES.length;
    setTemplate(SCHOOL_TEMPLATES[nextIndex].id, `已切换为：${SCHOOL_TEMPLATES[nextIndex].label}，保存线上后客户可见`);
  }
  templateSelect.addEventListener("change", () => {
    const selected = templateById(templateSelect.value);
    setTemplate(templateSelect.value, `已预览：${selected?.label || "当前风格"}，保存线上后客户可见`);
  });
  prevTemplateBtn.addEventListener("click", () => stepTemplate(-1));
  nextTemplateBtn.addEventListener("click", () => stepTemplate(1));
  autoTemplateBtn.addEventListener("click", () => setTemplate("auto", "已恢复自动匹配风格，保存线上后客户可见"));
  applyTemplateBtn.addEventListener("click", () => {
    const selected = templateById(templateSelect.value);
    setTemplate(templateSelect.value, `已应用：${selected?.label || "当前风格"}，保存线上后客户可见`);
  });
  decoratedToggle.addEventListener("change", () => {
    const article = currentArticle();
    if (!article) return;
    syncInlineEdits(previewEl, article);
    article.decorated = decoratedToggle.checked;
    drawPreview(article.id);
    setStatus(decoratedToggle.checked ? "已开启公众号稳定装饰，保存线上后客户可见" : "已关闭装饰，保存线上后客户可见");
  });
  decorationSelect.addEventListener("change", () => {
    const article = currentArticle();
    if (!article) return;
    syncInlineEdits(previewEl, article);
    article.decorationId = decorationSelect.value;
    article.decorated = decoratedToggle.checked;
    drawPreview(article.id);
    setStatus("已切换美化方案，保存线上后客户可见");
  });
  randomDecorationBtn.addEventListener("click", () => {
    const article = currentArticle();
    if (!article) return;
    const current = decorationSelect.value;
    const choices = DECORATION_SCHEMES.filter((scheme) => scheme.id !== current);
    const next = choices[Math.floor(Math.random() * choices.length)];
    decorationSelect.value = next.id;
    syncInlineEdits(previewEl, article);
    article.decorationId = next.id;
    article.decorated = true;
    drawPreview(article.id);
    setStatus(`已切换为美化方案：${next.label}，保存线上后客户可见`);
  });
  layoutSelect.addEventListener("change", () => {
    const article = currentArticle();
    if (!article) return;
    syncInlineEdits(previewEl, article);
    article.layoutId = layoutSelect.value;
    drawPreview(article.id);
    setStatus("已切换默认排版变化，保存线上后客户可见");
  });
  randomLayoutBtn.addEventListener("click", () => {
    const article = currentArticle();
    if (!article) return;
    const current = layoutSelect.value || "auto";
    const choices = LAYOUT_SCHEMES.filter((layout) => layout.id !== "auto" && layout.id !== current);
    const next = choices[Math.floor(Math.random() * choices.length)];
    layoutSelect.value = next.id;
    syncInlineEdits(previewEl, article);
    article.layoutId = next.id;
    drawPreview(article.id);
    setStatus(`已切换为排版：${next.label}，保存线上后客户可见`);
  });
  editBodyEl().addEventListener("click", rememberEditBodyCursor);
  editBodyEl().addEventListener("keyup", rememberEditBodyCursor);
  editBodyEl().addEventListener("select", rememberEditBodyCursor);
  document.body.classList.add("editing-inline");
  toggleInlineEditBtn.textContent = "文章文字可直接编辑";
  copyHtmlBtn.addEventListener("click", async () => {
    const article = currentArticle();
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
    await navigator.clipboard.writeText(previewEl.innerText);
    setStatus("已复制纯文本");
  });
  copyLinkBtn.addEventListener("click", async () => {
    const selectedIndex = Math.max(
      0,
      articles.findIndex((a) => a.id === selectEl.value)
    );
    await navigator.clipboard.writeText(getArticleUrl(articles[selectedIndex], selectedIndex));
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
    const confirmed = window.confirm("确认保存到线上吗？保存后客户刷新页面就会看到当前版本。");
    if (!confirmed) {
      setStatus("已取消保存");
      return;
    }
    const index = articles.findIndex((a) => a.id === currentId);
    if (index >= 0) {
      if (inlineEditMode) {
        syncInlineEdits(previewEl, articles[index]);
      } else {
        articles[index] = readEditor(articles[index]);
      }
    }
    setArticles(articles);
    articles = getArticles();
    const res = await fetch("/api/articles", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ articles }),
    });
    if (!res.ok) {
      setStatus("保存失败：数据格式有误");
      return;
    }
    const data = await res.json();
    if (Array.isArray(data.articles)) {
      setArticles(data.articles);
      articles = getArticles();
      drawList();
      drawPreview(currentId);
    }
    setStatus("已保存到线上，客户刷新即可看到新版");
  }
  saveOnlineBtn.addEventListener("click", saveOnline);
  topSaveOnlineBtn.addEventListener("click", saveOnline);
  toggleInlineEditBtn.addEventListener("click", () => setInlineEditMode(true));
  uploadImageBtn.addEventListener("click", async () => {
    const files = Array.from(imageUploadInput.files || []);
    if (!files.length) {
      setStatus("请先选择图片");
      return;
    }
    const sources = await chooseAndUploadImages({ multiple: true });
    if (sources.length) {
      uploadedImagePath.focus();
      uploadedImagePath.select();
      setStatus(`已上传 ${sources.length} 张图片，路径已选中，可复制到“正文和图片”中间`);
    }
  });
  generateWordBtn.addEventListener("click", async () => {
    const files = Array.from(wordUploadInput.files || []);
    if (!files.length) {
      setStatus("请先选择 Word 文件");
      return;
    }
    setStatus("正在读取 Word 并生成排版...");
    const form = new FormData();
    files.forEach((file) => form.append("file", file));
    const res = await fetch("/api/generate-word", {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      setStatus("生成失败：请确认上传的是 .docx 文件");
      return;
    }
    const data = await res.json();
    if (Array.isArray(data.articles)) {
      setArticles(data.articles);
      articles = getArticles();
      currentId = articles[0]?.id;
      drawList();
      drawPreview(currentId);
      setStatus(`已生成并保存线上，共 ${articles.length} 篇，客户链接从 /1/ 开始`);
    }
  });
  insertImageBtn.addEventListener("click", async () => {
    const sources = await chooseAndUploadImages({ multiple: true });
    if (!sources.length) {
      setStatus("未选择图片");
      return;
    }
    insertTextAtEditBody(sources.join("\n"));
    applyEditorToCurrentArticle(`已在光标位置插入 ${sources.length} 张图片，保存线上后客户可见`);
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
    updateAfterImageChange(article, `已替换为 ${imageItems.length} 张图片，保存线上后客户可见`);
  });
  insertImageGroupBtn.addEventListener("click", async () => {
    const article = currentArticle();
    let group = imageGroupFromUploads();
    if (!group) {
      const sources = await chooseAndUploadImages({ multiple: true });
      group = groupFromSources(sources);
    }
    if (!group) {
      setStatus("未选择图片");
      return;
    }
    if (selectedImageIndex === null || !article.sections[selectedImageIndex]) {
      article.sections.push(group);
    } else {
      article.sections.splice(selectedImageIndex + 1, 0, group);
    }
    updateAfterImageChange(article, `已插入 ${group.images.length} 张图片的静态网格，客户预览和公众号发布保持一致`);
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

window.WechatSite = { renderClientPage, renderAdminPage, renderPreviewArticle };
