# Axure PRD 需求文档生成器

[![version](https://img.shields.io/badge/version-v1.0.0-blue.svg)](https://github.com/lodgbore/pm-skills)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

根据 Axure 原型链接，自动遍历页面结构、分析页面功能与关联关系，生成 PRD 需求文档。

## 功能特性

- **Sitemap 自动提取**：通过 Playwright 自动访问 Axure 原型，提取页面结构数据
- **页面自动化分析**：逐页访问，提取标题、表格、按钮、表单字段、分页、标签页等元素
- **导航测试**：测试侧边栏导航链接和页面内跳转关系
- **截图采集**：为每个页面自动截图（fullPage）
- **PRD 文档生成**：自动生成 .md 和 .docx 双格式 PRD 文档
- **浏览器引擎降级**：Playwright 不可用时自动降级到 agent-browser

## 支持的链接格式

| 格式 | 示例 |
|------|------|
| Axure Cloud | `https://*.axshare.com/...` |
| 本地 Axure Share | `http://127.0.0.1:xxxxx/start.html?id=xxx` |
| 第三方托管平台 | `https://hub.axmax.cn/view/xxx/` |

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/lodgbore/pm-skills.git
```

### 2. 安装依赖

```bash
cd pm-skills/scripts
npm install
npx playwright install chromium
```

### 3. 运行分析

```bash
cd your-project-root
node /path/to/pm-skills/scripts/run.js --base-url http://your-axure-link
```

### 4. 生成 PRD

PRD 文档会自动生成到项目根目录：
- `PRD_xxx.md` — Markdown 格式
- `PRD_xxx.docx` — Word 格式（需要安装 pandoc）

## 工作流程

```
节点 0：环境准备（一次性）
├── 确定技能目录路径
├── 安装 npm 依赖（playwright）
├── 安装 Playwright 浏览器（chromium）
├── 安装 pandoc（用于 .md 转 .docx）
├── 验证环境
└── 降级方案（agent-browser）

节点 1：获取 Axure 链接 & 提取 Sitemap
├── 接收 Axure 链接
├── 自动提取 Sitemap（extract-sitemap.js）
├── 兜底：agent-browser 手动提取
└── 解析 Sitemap（parse_sitemap.js）

节点 2：运行自动化批量分析
├── 页面分析（标题、表格、按钮、表单字段等）
├── 导航测试（侧边栏链接跳转）
├── 跳转测试（页面内按钮跳转）
└── 截图采集（全页面截图）

节点 3：分析页面间关联关系
├── 导航跳转关系
├── 数据依赖关系
└── 业务流程关系

节点 4：分析需求背景与设计思路
├── 推断需求背景
├── 推断设计思路
└── 与用户对齐

节点 5：确认 PRD 文档结构
└── 询问用户文档结构（默认 / 自定义）

节点 6：生成 PRD 需求文档
├── 生成 .md 文件
├── 转换为 .docx 文件（pandoc）
└── 输出到项目根目录
```

## CLI 参数

```bash
node run.js [options]

选项：
  --module <name>          仅运行指定模块：pages | navigation | forms
  --limit <n>              限制测试页面数量
  --category <type>        仅测试指定类型的页面（如 list, form）
  --base-url <url>         指定 Axure 原型地址
  --report-only            仅重新生成报告（跳过测试执行）
  --nav-mode <mode>        导航测试模式：auto | manual | category
  --nav-max <n>            导航测试最大页面数（auto 模式）
  --nav-pages <list>       手动指定导航测试页面（manual 模式）
  --nav-categories <list>  指定导航测试的页面类型（category 模式）
```

## 配置文件

### keywords.json

页面元素关键词配置，用于识别表格列、按钮、表单字段等。

### categories.json

页面分类规则配置，支持 14 种页面类型：
- home, auth, dashboard, list, form, detail
- import, export, config, search, result
- selector, confirm, static

详细配置说明见 [docs/configuration.md](docs/configuration.md)

## 文档

- [详细工作流程](docs/workflow.md) — 节点 0-6 完整说明
- [配置参考](docs/configuration.md) — keywords.json、categories.json、PRD 模板
- [故障排除](docs/troubleshooting.md) — 常见问题、降级方案、格式同步

## 版本历史

- **v1.0.0** (2026-06-13) — 初始发布版本

## 许可证

MIT License
