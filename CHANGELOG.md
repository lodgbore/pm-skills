# 更新日志

本文件记录 axure-prd-generator 技能的版本变更历史。

---

## v1.0.0 (2026-06-13)

初始发布版本。

### 核心功能

- **Sitemap 自动提取**：通过 Playwright 自动访问 Axure 原型，提取页面结构数据
- **页面自动化分析**：逐页访问，提取标题、表格、按钮、表单字段、分页、标签页等元素
- **导航测试**：测试侧边栏导航链接和页面内跳转关系
- **截图采集**：为每个页面自动截图（fullPage）
- **PRD 文档生成**：自动生成 .md 和 .docx 双格式 PRD 文档

### 支持的链接格式

- Axure Cloud：`https://*.axshare.com/...`
- 本地 Axure Share：`http://127.0.0.1:xxxxx/start.html?id=xxx`
- 第三方托管平台：`https://hub.axmax.cn/view/xxx/`

### 降级方案

- Playwright 不可用时自动降级到 agent-browser
- Sitemap 提取失败时支持 agent-browser 手动提取

### 配置文件

- `keywords.json`：页面元素关键词配置（表格列、按钮、表单提示词）
- `categories.json`：页面分类规则配置（14 种页面类型）
- `templates/default-prd-template.md`：默认 PRD 模板

### 工作流程

- 节点 0：环境准备（一次性）
- 节点 1：获取 Axure 链接 & 提取 Sitemap
- 节点 2：运行自动化批量分析
- 节点 3：分析页面间关联关系
- 节点 4：分析需求背景与设计思路
- 节点 5：确认 PRD 文档结构
- 节点 6：生成 PRD 需求文档

### 文档结构

- `SKILL.md`：主文档（精简版）
- `docs/workflow.md`：工作流程详细说明
- `docs/configuration.md`：配置参考
- `docs/troubleshooting.md`：故障排除
