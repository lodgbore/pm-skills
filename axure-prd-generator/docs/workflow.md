# 工作流程详细说明

本文档详细说明 Axure PRD 生成器的完整工作流程。

---

## 路径解析

**在执行前，必须先确定技能目录路径。**

```bash
# 根据 SKILL.md 文件位置动态确定技能目录（排除 node_modules）
SKILL_DIR=$(find <project-root> -name "SKILL.md" -path "*/axure-prd-generator/*" -not -path "*/node_modules/*" -exec dirname {} \; | head -1)
```

**后续所有命令中的 `$SKILL_DIR` 均指代此路径。**

---

## 节点 0：环境准备（一次性，首次使用时执行）

**目标**：确定技能路径并确保自动化脚本所需依赖就绪。只需执行一次，后续复用。

### 步骤 1：确定技能目录路径

```bash
SKILL_DIR=$(find <project-root> -name "SKILL.md" -path "*/axure-prd-generator/*" -not -path "*/node_modules/*" -exec dirname {} \; | head -1)
```

### 步骤 2：安装 npm 依赖

```bash
cd $SKILL_DIR/scripts && npm install
```

### 步骤 3：安装 Playwright 浏览器

```bash
cd $SKILL_DIR/scripts && npx playwright install chromium
```

仅安装 Chromium（脚本只用 Chromium），不安装 Firefox/WebKit 以节省空间。

### 步骤 4：安装 pandoc（用于 .md 转 .docx）

```bash
npm install -g pandoc-bin
```

如果全局安装失败，可使用 `npx pandoc-bin` 按需调用。

### 步骤 5：验证环境

```bash
# 验证 Playwright
cd $SKILL_DIR/scripts && node -e "const { chromium } = require('playwright'); chromium.launch({ headless: true }).then(b => { console.log('Playwright 可用'); b.close(); }).catch(e => { console.error('Playwright 不可用:', e.message); process.exit(1); })"

# 验证 pandoc
npx pandoc-bin --version | head -1 && echo "pandoc 可用" || echo "pandoc 不可用"
```

### 步骤 6：降级方案

如果 Playwright 安装失败（网络问题、系统兼容等），检测 `agent-browser` 是否可用：

```bash
which agent-browser || npm list -g agent-browser
```

- **已安装** → 跳过 Playwright，后续使用 `agent-browser` 兜底
- **未安装** → 执行 `npm install -g agent-browser` 安装

**环境就绪后，后续节点无需再关注依赖问题。**

---

## 节点 1：获取 Axure 链接 & 提取 Sitemap

**目标**：从 Axure 原型中提取页面结构数据。

### 步骤 1：接收用户提供的 Axure 原型链接

链接格式通常为：
- Axure Cloud：`https://*.axshare.com/...`
- 本地 Axure Share：`http://127.0.0.1:xxxxx/start.html?id=xxxxx`
- 第三方托管平台：`https://hub.axmax.cn/view/xxx/` 或 `https://hub.axmax.cn/view/xxx/?g=1&id=xxx`

### 步骤 2：自动提取 Sitemap（推荐）

```bash
cd <project-root> && node $SKILL_DIR/scripts/extract-sitemap.js --base-url <Axure链接>
```

脚本会自动：
- 启动 Playwright 无头浏览器
- 打开 Axure 原型链接
- 提取 `$axure.document.sitemap`
- 保存为 `<project-root>/sitemap_raw.json`

**兜底方案**：如果自动提取失败，使用 `agent-browser` 手动提取：
- 打开 Axure 原型链接
- 执行 JS 提取：`(function() { return JSON.stringify($axure.document.sitemap); })()`
- 将返回结果保存为 `<project-root>/sitemap_raw.json`

### 步骤 3：解析 Sitemap 为结构化数据

```bash
cd <project-root> && node $SKILL_DIR/scripts/parse_sitemap.js
```

输出 `sitemap_parsed.json`，包含页面树、页面列表、统计摘要。

**注意**：`run.js` 会自动检测并执行步骤 2 和 3，无需手动运行。

### 步骤 4：输出页面目录结构与页面明细

将解析结果输出给用户确认，格式如下：

```
## 页面目录结构

- 一级模块 A/
  - 二级页面 A-1
  - 二级页面 A-2
    - 三级页面 A-2-1

## 页面明细清单

| 序号 | 页面名称 | 层级 | URL | 所属模块 |
|------|----------|------|-----|----------|
| 1    | xxx      | L2   | ... | 模块 A   |
```

**输出后暂停，等待用户确认或调整后再继续。**

---

## 节点 2：运行自动化批量分析

**使用自动化脚本一次性完成全部页面的功能提取，替代逐页手动分析。**

```bash
cd <project-root> && node $SKILL_DIR/scripts/run.js
```

**浏览器引擎降级策略**：
- 优先使用 **Playwright**（功能完整，性能更好）
- Playwright 不可用时自动降级到 **agent-browser**（CLI 工具，兼容性更广）
- 两者均不可用时退出并提示安装

脚本自动完成：
- 遍历全部 Wireframe 页面（无头浏览器逐页访问）
- 提取每页的：标题、按钮、表单字段、表格列、分页信息、标签页、关键文本
- 自动识别页面类型（list / form / detail / dashboard / config / static / auth / search / home）
- 为每个页面截图保存至 `<project-root>/screenshots/`
- 测试导航跳转关系和页面内跳转（如列表→新增、列表→详情）
- 生成测试报告至 `<project-root>/reports/`

**可选参数**：
```bash
node $SKILL_DIR/scripts/run.js --limit 20              # 限制页面数（快速预览）
node $SKILL_DIR/scripts/run.js --module pages          # 仅页面分析
node $SKILL_DIR/scripts/run.js --module navigation     # 仅导航测试
node $SKILL_DIR/scripts/run.js --category list         # 仅列表页
node $SKILL_DIR/scripts/run.js --base-url http://xxx   # 指定原型地址
node $SKILL_DIR/scripts/run.js --report-only           # 仅重新生成报告
node $SKILL_DIR/scripts/run.js --nav-mode auto         # 导航测试模式: auto|manual|category
node $SKILL_DIR/scripts/run.js --nav-max 10            # 导航测试最大页面数
node $SKILL_DIR/scripts/run.js --nav-pages page1,page2 # 手动指定导航测试页面
node $SKILL_DIR/scripts/run.js --nav-categories home,list # 指定导航测试的页面类型
```

**读取分析结果**：
- `reports/latest_results.json` — 全部页面的结构化分析数据
- `reports/report_*.md` — 可读的测试报告

**输出分析摘要给用户**，包含页面分类统计、发现的操作按钮/表单字段/表格列、导航和跳转测试结果。

---

## 节点 3：分析页面间关联关系

基于节点 2 的自动化分析结果，识别页面间关联关系：

### 导航跳转关系（来自 `navigationResults`）

- 列表页「新增」→ 新增页面
- 列表页「详情」→ 详情页面
- 面包屑/菜单导航跳转

### 数据依赖关系

- 配置页的配置项 → 其他页面的选项数据来源
- 基础数据页面 → 被其他页面引用

### 业务流程关系

- 页面间的状态流转
- 操作触发的跨页面行为

输出格式：

```
## 页面关联关系

### 跳转关系
- [列表页 A] →「新增」按钮 → [新增页 A-1]

### 数据依赖
- [配置页 B] → [页面 C] 下拉选项数据源

### 业务流程
- 流程1：[页面X] → [页面Y] → [页面Z]
```

**输出后暂停，等待用户确认。**

---

## 节点 4：分析需求背景与设计思路

**目标**：基于原型分析结果，推断需求背景、设计思路和核心业务逻辑，与用户对齐后再生成 PRD。

### 步骤 1：推断需求背景

- 基于页面结构和功能要素，推断系统定位、目标用户、核心价值
- 识别业务领域（如：教育管理、企业 SaaS、政务系统等）

### 步骤 2：推断设计思路

- 分析页面分类和功能分布，推断产品架构思路
- 识别核心模块和辅助模块的边界

### 步骤 3：与用户对齐

- 输出推断结果，询问用户是否准确
- 用户可补充或修正背景信息
- 确认后作为 PRD 的「文档概述」章节素材

**输出格式**：

```
## 需求背景推断

### 系统定位
- 系统名称：xxx
- 业务领域：xxx
- 目标用户：xxx

### 设计思路
- 核心模块：xxx
- 辅助模块：xxx
- 架构特点：xxx

请确认以上推断是否准确，或补充修正。
```

**输出后暂停，等待用户确认或修正。**

---

## 节点 5：确认 PRD 文档结构

**必须先询问用户需求文档的结构。**

PRD 模板存储在 `$SKILL_DIR/templates/` 目录：
- `default-prd-template.md` — 默认 PRD 模板（8 章结构）

使用 `AskUserQuestion` 工具确认：

```
默认 PRD 结构（详见 templates/default-prd-template.md）：
1. 文档概述（背景、目标、范围、术语表）
2. 用户角色与权限
3. 功能架构（功能模块总览、信息架构图）
4. 页面目录结构
5. 详细功能需求（按模块/页面逐一描述）
   - 页面截图 / 页面说明 / 功能清单 / 字段说明 / 排序规则 / 状态流转 / 交互规则 / 业务规则
6. 页面关联关系
7. 非功能性需求（性能、安全、兼容性等）
8. 附录（页面明细清单、自动化测试报告摘要）
```

**处理用户回复**：
- 用户确认默认结构 → 使用 `templates/default-prd-template.md` 生成
- 用户提供自定义结构 → 将用户结构保存为 `templates/custom-prd-template.md`，并使用该模板生成
- 用户回复「继续」「执行」「确认」等但未提供结构 → **直接使用默认模板**

---

## 节点 6：生成 PRD 需求文档

根据确认的文档结构，结合前几步的分析数据生成完整 PRD。

### 数据来源映射

| PRD 内容 | 数据来源 |
|----------|----------|
| 页面目录结构 | `sitemap_parsed.json` → `tree` |
| 页面功能要素 | `reports/latest_results.json` → `pageResults` |
| 页面截图 | `screenshots/*.png` |
| 导航关系 | `reports/latest_results.json` → `navigationResults` |
| 跳转关系 | `reports/latest_results.json` → `transitionResults` |

### 生成规则

1. **双格式输出**：同时生成 `.md` 和 `.docx` 两种格式
   - `.md` 文件：Markdown 格式，便于版本控制和在线查看
   - `.docx` 文件：Word 格式，便于正式文档流转和打印
   - 使用 `pandoc` 将 `.md` 转换为 `.docx`：`npx pandoc-bin PRD_xxx.md -o PRD_xxx.docx`
2. 「详细功能需求」按页面目录顺序组织，每页独立一节
3. 每页包含：**页面截图**、页面概述、功能清单（表格）、交互规则、字段说明（表格）、业务规则
4. **页面截图必须包含**：
   - 主页面（列表页）：在页面详细说明开头引用截图
   - 子页面（新增、编辑、详情等）：如果原型中存在独立的子页面，也需要单独截图并引用
   - 截图格式：`![页面名称](screenshots/xxx.png)`
5. **子页面说明必须包含**：新增、编辑、详情等子页面需要独立章节，包含页面截图、字段说明、交互规则、业务规则
6. **列表页排序规则**：列表页需要说明默认排序字段、排序方式（升序/降序）、支持的排序维度
7. **状态流转逻辑**：如果页面包含状态字段（如启用/禁用、已发布/未发布等），需要说明状态流转图和触发条件
8. 关联关系章节与详细功能需求交叉引用
9. 使用表格、清单等结构化格式
10. 附录引用自动化测试报告统计数据

### 格式同步

- 修改 `.md` 文件后，执行 `npx pandoc-bin PRD_xxx.md -o PRD_xxx.docx` 同步到 Word
- 修改 `.docx` 文件后，执行 `npx pandoc-bin PRD_xxx.docx -o PRD_xxx.md` 同步到 Markdown
