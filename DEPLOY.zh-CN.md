# 部署指南

这份指南用于把项目部署到 Cloudflare Pages。

## 准备条件

- 一个 GitHub 账号。
- 一个 Cloudflare 账号。
- 本地已安装 Node.js。
- 已登录 Wrangler：

```bash
npx wrangler login
```

## 方式一：Cloudflare 后台部署

1. Fork 或下载本项目。
2. 在 GitHub 创建自己的仓库并上传代码。
3. 登录 Cloudflare。
4. 进入 Workers & Pages。
5. 新建 Pages 项目。
6. 选择连接 GitHub 仓库。
7. 构建设置保持简单：

```text
Framework preset: None
Build command: npm install
Build output directory: /
Root directory: /
```

8. 创建 KV 命名空间，名称建议为：

```text
ARTICLE_PREVIEW_KV
```

9. 在 Pages 项目的 Settings 中绑定 KV。

绑定变量名必须是：

```text
ARTICLE_PREVIEW_KV
```

10. 重新部署项目。

部署完成后访问：

```text
https://你的项目地址/admin.html
```

## 方式二：命令行部署

安装依赖：

```bash
npm install
```

创建 KV：

```bash
npm run kv:create
```

命令会返回一个 KV namespace id。把这个 id 填入 `wrangler.toml`：

```toml
[[kv_namespaces]]
binding = "ARTICLE_PREVIEW_KV"
id = "这里填写你的 KV namespace id"
```

部署：

```bash
npm run deploy
```

## 绑定自定义域名

在 Cloudflare Pages 项目后台进入 Custom domains，添加自己的域名即可。

## 使用入口

- 客户预览页：`/`
- 第一篇文章：`/1/`
- 后台编辑页：`/admin.html`

## 常见问题

### 上传 Word 后无法保存

检查 Cloudflare Pages 是否绑定了 KV，变量名必须是 `ARTICLE_PREVIEW_KV`。

### 图片上传后无法显示

检查 KV 是否绑定正确，并确认重新部署过项目。

### 复制到公众号后样式有差异

微信编辑器会过滤部分网页样式。本项目尽量使用稳定的内联样式、表格、边框和背景色，但最终以微信公众号编辑器实际粘贴效果为准。

### 是否需要密码

当前版本默认不启用后台密码。部署后访问 `/admin.html` 即可进入后台。

如果需要公开使用，建议自行增加 Cloudflare Access 或其他访问保护。
