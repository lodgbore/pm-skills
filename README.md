# PM Skills

Trae IDE 技能集合，包含多个实用的自动化技能。

## 技能列表

| 技能 | 版本 | 说明 |
|------|------|------|
| [axure-prd-generator](axure-prd-generator/) | v1.0.0 | 根据 Axure 原型链接，自动遍历页面结构、分析页面功能与关联关系，生成 PRD 需求文档 |

## 使用方式

每个技能都是独立的目录，包含 `SKILL.md` 说明文件和 `scripts/` 自动化脚本。

### 安装技能

将技能目录复制到 Trae IDE 的 skills 目录：
- Trae: `.trae/skills/`
- Cursor: `.cursor/skills/`
- VS Code: `.vscode/skills/`

### 技能结构

```
pm-skills/
├── README.md                    # 本文件
├── CHANGELOG.md                 # 版本更新日志
└── axure-prd-generator/         # Axure PRD 生成器技能
    ├── SKILL.md                 # 技能说明文件
    ├── CHANGELOG.md             # 技能更新日志
    ├── README.md                # 技能详细说明
    ├── docs/                    # 详细文档
    ├── templates/               # PRD 模板
    └── scripts/                 # 自动化脚本
```

## 版本历史

- **v1.0.0** (2026-06-13) — 初始发布，包含 axure-prd-generator 技能

## 许可证

MIT License
