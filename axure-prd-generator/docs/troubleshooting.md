# 故障排除

本文档列出常见问题和解决方案。

---

## 常见问题

### Axure 链接无法访问

- 检查链接是否正确
- 确认 Axure 原型已发布/共享
- 本地原型需保持 Axure Share 服务运行

### Sitemap 自动提取失败

- 检查链接和网络
- 增加超时时间：`node extract-sitemap.js --base-url <链接> --timeout 60000`
- 使用 agent-browser 手动提取（参考兜底方案）

### 页面数量过多（>50）

- 自动使用 Playwright 批量处理
- 可用 `--limit 20` 快速预览

### 页面为空白/404

- 脚本自动重试 3 次，失败后标记为 `error`
- 报告中标注失败原因

### 页面加载超时

- 自动重试机制（默认 3 次，延迟 2 秒，指数退避）

### Playwright 未安装

- 参考节点 0 的环境准备流程

### 用户未提供 Axure 链接

- 主动询问用户

### 关键词配置缺失

- 使用内置默认值

### 分类规则配置缺失

- 使用内置默认规则

---

## 降级方案

### 浏览器引擎降级

```
Playwright 可用
├── 主方案：extract-sitemap.js 自动提取 + run.js 自动化分析
└── 兜底方案：agent-browser 手动提取
```

### Sitemap 提取降级

1. **自动提取**（extract-sitemap.js）
   - 优先使用，成功率高
2. **手动提取**（agent-browser）
   - 自动提取失败时使用
   - 打开 Axure 链接，执行 JS 提取

---

## 格式同步

### Markdown → Word

```bash
npx pandoc-bin PRD_xxx.md -o PRD_xxx.docx
```

### Word → Markdown

```bash
npx pandoc-bin PRD_xxx.docx -o PRD_xxx.md
```
