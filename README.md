# 微信公众号图文排版系统

这是一个面向学校公众号内容的在线排版、预览和编辑工具。

## 项目用途

- 上传 Word 文档后自动生成公众号文章排版。
- 支持一篇 Word 对应一篇文章。
- 支持一次上传多篇文章，并按当前批次生成独立访问路径。
- 客户可以通过预览链接查看最终效果。
- 管理员可以在后台继续修改文字、图片、模板、排版和美化方案。
- 排版内容可以复制到微信公众号编辑器中发布。

## 核心规则

- 默认不修改原文文字。
- 默认不修改原文图片。
- 除非人工编辑，否则上传内容会尽量保持原始文字和图片一致。
- 客户预览效果应尽量与复制到微信公众号后的效果保持一致。
- 图片组默认使用静态网格，避免客户看到的效果和正式发布效果不一致。

## 主要功能

- Word 自动解析。
- 图片自动上传。
- 文章内直接编辑文字。
- 图片插入、替换、删除。
- 多种学校公众号风格模板。
- 多种排版结构自动匹配。
- 多种稳定装饰方案。
- 一键复制公众号排版。
- 一键复制客户预览链接。

## 文件说明

- `index.html`：客户预览入口。
- `admin.html`：后台编辑入口。
- `site.js`：文章渲染、编辑、复制和模板逻辑。
- `articles.js`：默认文章数据，当前为空。
- `functions/api/articles.js`：文章读取和保存接口。
- `functions/api/generate-word.js`：Word 上传解析接口。
- `functions/api/upload.js`：图片上传接口。
- `functions/uploads/[name].js`：图片访问接口。
- `DEPLOY.zh-CN.md`：详细部署指南。

## 快速部署

安装依赖：

```bash
npm install
```

创建 Cloudflare KV：

```bash
npm run kv:create
```

把返回的 KV namespace id 填入 `wrangler.toml` 后部署：

```bash
npm run deploy
```

详细步骤见：

```text
DEPLOY.zh-CN.md
```

## 手动部署命令

部署到 Cloudflare Pages：

```bash
npx wrangler pages deploy . --project-name=weixin
```

自定义域名请在 Cloudflare Pages 后台绑定。

## GitHub 同步说明

GitHub 仓库只保存系统代码。

后台里保存的文章内容、上传图片和客户预览数据保存在 Cloudflare 存储中，不会自动同步到 GitHub。

以后只有明确要求同步时，才需要把本地修改提交并推送到 GitHub。
