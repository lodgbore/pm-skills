---
name: "axure-prd-generator"
version: "1.0.0"
description: "根据 Axure 原型链接，自动遍历页面结构、分析页面功能与关联关系，生成 PRD 需求文档。当用户提供 Axure 原型地址、要求从 Axure 原型生成需求文档、或提到 Axure PRD 时调用。"
---

# Axure PRD 需求文档生成器

**版本**：v1.0.0 | **发布日期**：2026-06-13

根据用户提供的 Axure 原型链接，自动遍历原型页面结构，分析页面功能及关联关系，生成结构化 PRD 需求文档。

## 技能目录结构

**路径动态识别**：不同 IDE 的技能安装路径不同，使用以下命令获取：
```bash
SKILL_DIR=$(find <project-root> -name "SKILL.md" -path "*/axure-prd-generator/*" -not -path "*/node_modules/*" -exec dirname {} \; | head -1)
```

```
$SKILL_DIR/
├── SKILL.md                      # 本技能说明文件
├── CHANGELOG.md                  # 版本更新日志
├── docs/                         # 详细文档
│   ├── workflow.md               # 工作流程详细说明
│   ├── configuration.md          # 配置参考
│   └── troubleshooting.md        # 故障排除
├── templates/                    # PRD 模板
│   └── default-prd-template.md   # 默认 PRD 模板（8 章结构）
└── scripts/                      # 自动化脚本
    ├── run.js                    # 主入口（编排全部测试流程）
    ├── config.js                 # 动态配置（路径、页面分类）
    ├── extract-sitemap.js        # Sitemap 自动提取
    ├── parse_sitemap.js          # Sitemap 解析
    ├── keywords.json             # 关键词配置（表格列、按钮、表单提示）
    ├── categories.json           # 页面分类规则配置
    └── lib/
        ├── page-analyzer.js      # 页面分析模块
        ├── navigation-tester.js  # 导航跳转测试模块
        ├── screenshot-capture.js # 截图采集模块
        ├── report-generator.js   # 测试报告生成模块
        ├── utils.js              # 通用工具函数（重试机制）
        └── agent-browser-wrapper.js # agent-browser 降级封装
```

## 核心工具说明

| 模块 | 功能 | 关键输出 |
|------|------|----------|
| `run.js` | 主入口，编排全部测试流程 | 控制台进度 + 报告 |
| `extract-sitemap.js` | 自动提取 Axure Sitemap | sitemap_raw.json |
| `lib/page-analyzer.js` | 逐页访问，提取标题/表格/按钮/表单字段/分页/标签页 | JSON 结构化数据 |
| `lib/navigation-tester.js` | 测试侧边栏导航和页面内跳转关系 | 跳转关系列表 |
| `lib/screenshot-capture.js` | 为每个页面截图（fullPage） | PNG 截图文件 |
| `lib/report-generator.js` | 汇总结果生成报告 | MD 报告 + JSON 数据 |

## 工作流程概览

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

## 快速开始

```bash
# 1. 确定技能路径
SKILL_DIR=$(find <project-root> -name "SKILL.md" -path "*/axure-prd-generator/*" -not -path "*/node_modules/*" -exec dirname {} \; | head -1)

# 2. 安装依赖（首次）
cd $SKILL_DIR/scripts && npm install && npx playwright install chromium

# 3. 运行分析
cd <project-root> && node $SKILL_DIR/scripts/run.js --base-url <Axure链接>

# 4. 生成 PRD（自动双格式输出）
# PRD_xxx.md + PRD_xxx.docx 生成到项目根目录
```

## 相关文档

- [详细工作流程](docs/workflow.md) — 节点 0-6 完整说明
- [配置参考](docs/configuration.md) — keywords.json、categories.json、PRD 模板
- [故障排除](docs/troubleshooting.md) — 常见问题、降级方案、格式同步
