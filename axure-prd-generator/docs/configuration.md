# 配置参考

本文档说明技能中可配置的 JSON 文件和 PRD 模板。

---

## keywords.json

**路径**：`$SKILL_DIR/scripts/keywords.json`

**作用**：定义页面元素识别关键词，用于自动提取表格列、按钮、表单字段等。

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `tableHeaders` | `{ description, keywords[] }` | 表格列头关键词，用于识别页面中的表格结构 |
| `actionButtons` | `{ description, keywords[] }` | 操作按钮关键词，用于识别页面中的功能按钮 |
| `navigationActions` | `{ description, keywords[] }` | 导航跳转关键词，用于识别页面间的跳转关系 |
| `formHints` | `{ description, keywords{} }` | 表单提示词，用于识别表单字段类型 |

### 配置优先级

```
项目根目录/keywords.json  >  技能源目录/keywords.json  >  config.js 内置默认值
```

---

## categories.json

**路径**：`$SKILL_DIR/scripts/categories.json`

**作用**：定义页面分类规则，根据页面名称中的关键词自动判断页面类型。

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `rules` | `[{ type, description, keywords[], exclude? }]` | 分类规则数组 |
| `default` | `string` | 默认分类类型（未匹配时使用） |
| `defaultDescription` | `string` | 默认分类的描述 |

### 支持的页面类型

| 类型 | 说明 | 关键词示例 |
|------|------|-----------|
| `home` | 首页（控制台、工作台） | 首页、控制台 |
| `auth` | 认证页（登录、注册账号） | 登录、账号登录、忘记密码 |
| `dashboard` | 仪表盘（数据统计、大屏展示） | 统计、大屏 |
| `list` | 列表页（数据列表展示） | 列表、管理、日志、记录 |
| `form` | 表单页（新增、申请、填写数据） | 新增、添加、创建、申请 |
| `detail` | 详情页（查看数据详情） | 详情、详情页 |
| `import` | 导入页（上传文件导入数据） | 导入、上传 |
| `export` | 导出页（导出数据下载） | 导出、下载 |
| `config` | 配置页（系统设置、参数配置） | 设置、配置、管理值 |
| `search` | 搜索页（搜索结果展示） | 搜索 |
| `result` | 结果页（操作完成后的结果展示） | 提交后、完成 |
| `selector` | 数据选择页（选择用户、产品等） | 选择、选取 |
| `confirm` | 二次确认页（删除、启用禁用等） | 确认删除、是否删除、二次确认 |
| `static` | 静态页（帮助、协议、政策等） | 帮助、协议、政策、隐私 |

### 排除规则

使用 `exclude` 字段排除误匹配的页面：

```json
{
  "type": "auth",
  "keywords": ["登录", "注册账号"],
  "exclude": ["系统注册", "租户注册", "应用注册"]
}
```

### 配置优先级

```
项目根目录/categories.json  >  技能源目录/categories.json  >  config.js 内置默认值
```

---

## PRD 模板

**路径**：`$SKILL_DIR/templates/`

### 默认模板

`default-prd-template.md` — 默认 PRD 模板（8 章结构）

### 模板变量

| 变量 | 说明 |
|------|------|
| `{{系统名称}}` | 从原型推断的系统名称 |
| `{{生成时间}}` | PRD 生成时间 |
| `{{原型链接}}` | Axure 原型链接 |
| `{{需求背景}}` | 节点 4 推断的需求背景 |
| `{{页面列表}}` | 节点 2 分析的页面数据 |
| `{{截图路径}}` | 对应页面的截图路径 |

### 自定义模板

用户可在节点 5 提供自定义结构，系统会将其保存为 `templates/custom-prd-template.md`。
