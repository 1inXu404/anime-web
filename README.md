<p align="center">
  <img src="public/vite.svg" width="64" height="64" alt="追番" />
</p>

<h1 align="center">追番</h1>

<p align="center">
  <em>优雅的动漫追番网站 · 数据来源 <a href="https://bgm.tv">Bangumi</a></em>
</p>

<p align="center">
  <a href="https://1inxu404.github.io/anime-web/"><img src="https://img.shields.io/badge/demo-online-6366f1?style=flat-square" alt="Demo" /></a>
  <a href="https://github.com/1inXu404/anime-web/actions"><img src="https://img.shields.io/github/actions/workflow/status/1inXu404/anime-web/deploy.yml?style=flat-square" alt="CI" /></a>
  <img src="https://img.shields.io/badge/vue-3.5-4FC08D?style=flat-square&logo=vuedotjs" alt="Vue" />
  <img src="https://img.shields.io/badge/tailwind-4.1-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
</p>

---

## ✨ 功能

- **追番日历** — 按星期展示每日播出番剧，今日更新高亮突出
- **番剧浏览** — 按年/月筛选新番，支持年份点击选择
- **番剧详情** — 封面、评分、简介、完整剧集列表（含播出日期 & 时长）
- **静态数据缓存** — 预抓取 234 部番剧数据到本地 JSON，页面零 API 请求，秒开
- **深色模式** — 自动检测系统偏好，手动切换，localStorage 持久化
- **优雅设计** — 玻璃态导航栏、渐变 Hero、毛玻璃卡片、流畅过渡动画
- **响应式布局** — 手机 2 列 / 平板 4 列 / 桌面 6 列，全设备自适应

## 🛠 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Vue 3 (Composition API) |
| 语言 | TypeScript |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS v4 |
| 路由 | Vue Router 4 (Hash History) |
| 工具 | VueUse · tsx |
| 数据 | [Bangumi](https://bgm.tv) API → 静态 JSON 缓存 |
| 部署 | GitHub Pages + Actions (每日定时) |

## 🚀 本地运行

```bash
git clone https://github.com/1inXu404/anime-web.git
cd anime-web
npm install
npm run fetch-data   # 抓取最新番剧数据（可选，仓库已包含缓存）
npm run dev
```

## 📦 静态数据缓存

项目将 Bangumi API 数据预抓取为静态 JSON 文件（`public/data/`），页面直接读取本地文件，无需等待网络请求。

| 命令 | 说明 |
|------|------|
| `npm run fetch-data` | 从 Bangumi 抓取最新日历 + 番剧详情 + 剧集，写入 `public/data/` |
| `npm run build` | 类型检查 + 构建生产包（含静态数据） |

**自动更新**：GitHub Actions 每日 00:00（北京时间）自动运行 `fetch-data` → 提交 → 重新部署。

## 🤖 AI Agent 声明

> 本项目 **100% 由 AI Agent（Sisyphus）自主完成**，涵盖架构设计、API 对接、UI 开发、暗色模式、响应式布局、静态数据缓存及 GitHub Pages 自动部署全流程。人类仅提供需求描述。
>
> 如果你对 AI-Native 开发感兴趣，欢迎阅读源码——所有代码均可追溯至 AI 的即时推理与生成。

## 📡 数据来源

本网站所有番剧数据来自 **[Bangumi 番组计划](https://bgm.tv)** 公开 API，预抓取后以静态 JSON 形式托管在仓库中，页面运行时零网络请求。

> 使用的 API 端点均为公开接口，无需认证：
> - `GET https://api.bgm.tv/calendar`
> - `GET https://api.bgm.tv/v0/subjects`
> - `GET https://api.bgm.tv/v0/subjects/{id}`
> - `GET https://api.bgm.tv/v0/episodes`

使用 Bangumi 数据请遵守其 [用户协议](https://bgm.tv/about/tos)。

## 📄 License

MIT © 2026
