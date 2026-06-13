/**
 * 配置管理模块
 *
 * 职责：
 * 1. 加载并解析 keywords.json（页面元素关键词）
 * 2. 加载并解析 categories.json（页面分类规则）
 * 3. 加载 sitemap_parsed.json（页面结构数据）
 * 4. 提供页面分类、URL 构建等工具函数
 *
 * 配置文件查找优先级：
 *   用户项目根目录 (cwd) > 技能源目录 (__dirname) > 内置默认值
 */

const fs = require('fs');
const path = require('path');

// 工作目录：脚本运行时的 cwd（即用户项目根目录）
const WORK_DIR = process.cwd();

/**
 * 解析配置文件路径
 * 优先从 cwd 查找（用户可覆盖），其次从脚本同级目录查找
 * @param {string} filename - 配置文件名
 * @returns {string} 文件完整路径
 */
function resolveFile(filename) {
  const cwdPath = path.join(WORK_DIR, filename);
  if (fs.existsSync(cwdPath)) return cwdPath;
  const scriptPath = path.join(__dirname, filename);
  if (fs.existsSync(scriptPath)) return scriptPath;
  return cwdPath; // 默认返回 cwd 路径
}

// ============================================================
// 关键词配置（keywords.json）
// 用于识别页面中的表格列、按钮、表单字段、导航链接等元素
// ============================================================
const keywordsPath = resolveFile('keywords.json');

// 内置默认值（当 keywords.json 不存在时使用）
let keywords = {
  tableHeaders: ['操作', '状态', '名称', '时间', '创建时间', '更新时间', '编号', '类型', '详情', '备注', '负责人', '描述'],
  actionButtons: ['新增', '添加', '删除', '编辑', '查询', '搜索', '重置', '导入', '导出', '保存', '提交', '取消', '确定', '返回'],
  navigationActions: ['新增', '添加', '编辑', '详情', '查看', '删除', '购买', '续费', '提交'],
  formHints: { input: '请输入', select: '请选择' }
};

if (fs.existsSync(keywordsPath)) {
  const raw = JSON.parse(fs.readFileSync(keywordsPath, 'utf8'));
  // 兼容新格式（带 description）和旧格式（纯数组/对象）
  keywords = {
    tableHeaders: raw.tableHeaders.keywords || raw.tableHeaders,
    actionButtons: raw.actionButtons.keywords || raw.actionButtons,
    navigationActions: raw.navigationActions.keywords || raw.navigationActions,
    formHints: raw.formHints.keywords || raw.formHints
  };
}

// ============================================================
// 页面分类规则（categories.json）
// 根据页面名称中的关键词自动判断页面类型
// 支持的类型：home, auth, dashboard, list, form, detail, import, export, config, search, result, selector, confirm, static
// ============================================================
const categoriesPath = resolveFile('categories.json');

// 内置默认值（当 categories.json 不存在时使用）
let categories = {
  rules: [
    { type: 'home', keywords: ['首页', '控制台'] },
    { type: 'auth', keywords: ['登录', '账号登录', '手机号登录', '忘记密码', '注册账号'], exclude: ['系统注册', '租户注册', '应用注册'] },
    { type: 'dashboard', keywords: ['统计', '大屏'] },
    { type: 'list', keywords: ['列表', '管理', '日志', '记录'] },
    { type: 'form', keywords: ['新增', '添加', '创建', '申请'] },
    { type: 'detail', keywords: ['详情', '详情页'] },
    { type: 'import', keywords: ['导入', '上传'] },
    { type: 'export', keywords: ['导出', '下载'] },
    { type: 'config', keywords: ['设置', '配置', '管理值'] },
    { type: 'search', keywords: ['搜索'] },
    { type: 'result', keywords: ['提交后', '完成'] },
    { type: 'selector', keywords: ['选择', '选取'] },
    { type: 'confirm', keywords: ['确认删除', '是否删除', '确认启用', '确认禁用', '二次确认'] },
    { type: 'static', keywords: ['帮助', '协议', '政策', '规范', '隐私'], exclude: ['登录日志', '操作日志', '访问日志', '系统日志'] }
  ],
  default: 'list'
};

if (fs.existsSync(categoriesPath)) {
  categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
}

// ============================================================
// 重试配置
// 页面加载失败时的重试策略
// ============================================================
const retry = {
  maxRetries: 3,    // 最大重试次数
  delay: 2000,      // 初始延迟（毫秒）
  backoff: 2        // 指数退避倍数
};

// ============================================================
// Sitemap 数据
// 从 sitemap_parsed.json 加载页面结构
// ============================================================
const sitemapPath = resolveFile('sitemap_parsed.json');
let sitemap = { tree: '', wireframes: [], summary: {} };

if (fs.existsSync(sitemapPath)) {
  sitemap = JSON.parse(fs.readFileSync(sitemapPath, 'utf8'));
} else {
  console.warn('[config] 未找到 sitemap_parsed.json，请先运行 parse_sitemap.js 解析 Sitemap');
}

// ============================================================
// Axure 原型基础地址
// 可通过 CLI --base-url 参数覆盖
// ============================================================
let BASE_URL = 'http://127.0.0.1:32767';

// ============================================================
// 输出路径（统一输出到 cwd）
// ============================================================
const REPORTS_DIR = path.join(WORK_DIR, 'reports');
const SCREENSHOTS_DIR = path.join(WORK_DIR, 'screenshots');

/**
 * 构建页面完整 URL
 * @param {string} pageUrl - 页面相对路径（如 "租户管理.html"）
 * @returns {string} 页面完整 URL
 */
function getPageUrl(pageUrl) {
  return `${BASE_URL}/${encodeURIComponent(pageUrl).replace(/%2F/g, '/')}`;
}

/**
 * 根据页面名称自动分类
 * 匹配规则：遍历 categories.rules，检查页面名称是否包含关键词
 * 排除规则：如果页面名称命中 exclude 关键词，则跳过该规则
 * @param {string} name - 页面名称
 * @returns {string} 页面类型（如 'list', 'form', 'detail' 等）
 */
function categorizePage(name) {
  for (const rule of categories.rules) {
    const hasKeyword = rule.keywords.some(k => name.includes(k));
    const hasExclude = rule.exclude && rule.exclude.some(k => name.includes(k));
    if (hasKeyword && !hasExclude) {
      return rule.type;
    }
  }
  return categories.default;
}

/**
 * 构建带元数据的页面定义列表
 * 为每个页面添加完整 URL 和自动分类结果
 */
const pages = sitemap.wireframes.map(w => ({
  name: w.name,
  url: w.url,
  fullUrl: getPageUrl(w.url),
  id: w.id,
  path: w.path,
  depth: w.depth,
  category: categorizePage(w.name)
}));

module.exports = {
  WORK_DIR,
  BASE_URL,
  REPORTS_DIR,
  SCREENSHOTS_DIR,
  pages,
  sitemap,
  keywords,
  categories,
  retry,
  getPageUrl,
  categorizePage,
  resolveFile
};
