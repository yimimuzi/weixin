const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f6f1ea">
  <title>文章预览系统</title>
  <style>
    :root { --bg:#f7f2ea; --paper:#fff; --ink:#2b2b2b; --accent:#9e1f1f; --line:rgba(126,31,31,.12); }
    * { box-sizing:border-box; }
    html, body { margin:0; padding:0; background:var(--bg); color:var(--ink); font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue','PingFang SC','Microsoft YaHei',Arial,sans-serif; }
    .site-name { max-width:760px; margin:0 auto; padding:20px 14px 8px; color:var(--accent); font-size:20px; font-weight:800; letter-spacing:0; text-align:center; }
    .site-name::after { content:""; display:block; width:76px; height:3px; margin:10px auto 0; border-radius:999px; background:linear-gradient(90deg, rgba(158,31,31,.18), rgba(158,31,31,.78), rgba(158,31,31,.18)); }
    .shell { max-width:760px; margin:0 auto; padding:12px 14px 40px; }
    .article { background:var(--paper); padding:0 18px 34px; }
  </style>
</head>
<body>
  <header class="site-name">文章预览系统</header>
  <div class="shell">
    <main class="article" id="clientArticle"></main>
  </div>
  <script src="/articles.js?v=20260629-preserve-space1"></script>
  <script src="/site.js?v=20260629-preserve-space1"></script>
  <script>WechatSite.renderClientPage(document.getElementById('clientArticle'));</script>
</body>
</html>`;

export async function onRequestGet() {
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
