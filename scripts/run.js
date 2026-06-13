/**
 * Axure 原型自动化测试主入口
 *
 * 职责：
 * 1. 编排全部测试流程（页面分析、导航测试、跳转测试）
 * 2. 自动检测并提取 Sitemap（如果不存在）
 * 3. 生成测试报告（JSON + Markdown）
 *
 * 浏览器引擎降级策略：
 *   优先使用 Playwright → 不可用时降级到 agent-browser → 均不可用时退出
 *
 * CLI 参数：
 *   --module <name>        仅运行指定模块：pages | navigation | forms
 *   --limit <n>            限制测试页面数量
 *   --category <type>      仅测试指定类型的页面（如 list, form）
 *   --base-url <url>       指定 Axure 原型地址
 *   --report-only          仅重新生成报告（跳过测试执行）
 *   --nav-mode <mode>      导航测试模式：auto | manual | category
 *   --nav-max <n>          导航测试最大页面数（auto 模式）
 *   --nav-pages <list>     手动指定导航测试页面（manual 模式）
 *   --nav-categories <list> 指定导航测试的页面类型（category 模式）
 */

// 检测 Playwright 可用性，不可用时降级到 agent-browser
let chromium;
let browserEngine = 'playwright';
try {
  chromium = require('playwright').chromium;
} catch (e) {
  const { AgentBrowser, isAgentBrowserAvailable } = require('./lib/agent-browser-wrapper');
  if (isAgentBrowserAvailable()) {
    chromium = AgentBrowser;
    browserEngine = 'agent-browser';
    console.log('[降级] Playwright 不可用，使用 agent-browser 作为替代');
  } else {
    console.error('错误: Playwright 和 agent-browser 均不可用');
    console.error('请安装 Playwright: cd $SKILL_DIR/scripts && npm install && npx playwright install chromium');
    console.error('或安装 agent-browser: npm install -g agent-browser');
    process.exit(1);
  }
}

const config = require('./config');
const { pages, SCREENSHOTS_DIR, REPORTS_DIR, BASE_URL } = config;
const { analyzePage } = require('./lib/page-analyzer');
const { testNavigation, testPageTransitions } = require('./lib/navigation-tester');
const { captureScreenshot } = require('./lib/screenshot-capture');
const { generateReport } = require('./lib/report-generator');
const { extractSitemap } = require('./extract-sitemap');
const fs = require('fs');
const path = require('path');

// 解析 CLI 参数
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const moduleFilter = getArg('module');
const limit = getArg('limit') ? parseInt(getArg('limit')) : null;
const categoryFilter = getArg('category');
const reportOnly = hasFlag('report-only');
const baseUrlOverride = getArg('base-url');
const navMode = getArg('nav-mode') || 'auto';
const navMax = getArg('nav-max') ? parseInt(getArg('nav-max')) : 10;

// 支持通过 CLI 覆盖 BASE_URL
if (baseUrlOverride) {
  config.BASE_URL = baseUrlOverride;
  // 重新构建页面 URL
  pages.forEach(p => { p.fullUrl = `${baseUrlOverride}/${encodeURIComponent(p.url).replace(/%2F/g, '/')}`; });
}

// 筛选目标页面
let targetPages = [...pages];
if (categoryFilter) targetPages = targetPages.filter(p => p.category === categoryFilter);
if (limit) targetPages = targetPages.slice(0, limit);

// 确保输出目录存在
[SCREENSHOTS_DIR, REPORTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 获取导航测试页面
function getNavigationTestPages(pages) {
  if (navMode === 'manual') {
    const navPages = getArg('nav-pages');
    if (navPages) {
      const pageNames = navPages.split(',');
      return pages.filter(p => pageNames.includes(p.name));
    }
  }
  if (navMode === 'category') {
    const navCategories = getArg('nav-categories') || 'home,list';
    const categories = navCategories.split(',');
    return pages.filter(p => categories.includes(p.category));
  }
  // auto 模式：选择首页和列表页
  return pages.filter(p => 
    p.category === 'home' || p.category === 'list'
  ).slice(0, navMax);
}

async function main() {
  const startTime = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Axure 原型自动化测试`);
  console.log(`  目标: ${config.BASE_URL}`);
  console.log(`  页面数: ${targetPages.length} / ${pages.length}`);
  console.log(`  模块: ${moduleFilter || '全部'}`);
  console.log(`  引擎: ${browserEngine}`);
  console.log(`${'='.repeat(60)}\n`);

  // 检测 sitemap 是否存在，不存在则自动提取
  const sitemapPath = path.join(process.cwd(), 'sitemap_raw.json');
  if (!fs.existsSync(sitemapPath) && !reportOnly) {
    console.log('未找到 sitemap_raw.json，尝试自动提取...\n');
    try {
      await extractSitemap();
      // 重新加载配置
      delete require.cache[require.resolve('./config')];
      const newConfig = require('./config');
      Object.assign(config, newConfig);
      targetPages = [...newConfig.pages];
      if (categoryFilter) targetPages = targetPages.filter(p => p.category === categoryFilter);
      if (limit) targetPages = targetPages.slice(0, limit);
    } catch (err) {
      console.error('自动提取失败:', err.message);
      console.error('\n请手动执行: node extract-sitemap.js --base-url <Axure链接>');
      console.error('或使用 agent-browser 手动提取（参考 SKILL.md 兜底方案）');
      process.exit(1);
    }
  }

  if (reportOnly) {
    console.log('仅生成报告模式，跳过测试执行...\n');
    const rawPath = path.join(REPORTS_DIR, 'latest_results.json');
    if (fs.existsSync(rawPath)) {
      const data = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
      const { reportPath, jsonPath } = generateReport(data);
      console.log(`报告已生成: ${reportPath}`);
      console.log(`JSON数据: ${jsonPath}`);
    } else {
      console.log('未找到之前的测试结果，请先运行测试。');
    }
    return;
  }

  console.log(`正在启动浏览器 (${browserEngine})...`);
  const launchOptions = browserEngine === 'playwright'
    ? { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
    : {};
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'zh-CN' });
  const page = await context.newPage();

  const pageResults = [];
  let navigationResults = [];
  let transitionResults = [];

  try {
    // === 页面分析 ===
    if (!moduleFilter || moduleFilter === 'pages') {
      console.log(`\n[${'='.repeat(20)} 页面分析 ${'='.repeat(20)}]\n`);
      for (let i = 0; i < targetPages.length; i++) {
        const pageDef = targetPages[i];
        pageDef.index = i + 1;
        process.stdout.write(`[${i + 1}/${targetPages.length}] 分析: ${pageDef.name} (${pageDef.category})... `);
        const result = await analyzePage(page, pageDef);
        result.screenshotPath = await captureScreenshot(page, pageDef);
        pageResults.push(result);
        console.log(`${result.status === 'analyzed' ? '✓' : '✗'} ${result.loadTime}ms`);
      }
    }

    // === 导航测试 ===
    if (!moduleFilter || moduleFilter === 'navigation') {
      console.log(`\n[${'='.repeat(18)} 导航测试 ${'='.repeat(18)}]\n`);
      const navTestPages = getNavigationTestPages(targetPages);
      console.log(`导航测试模式: ${navMode}, 测试页面数: ${navTestPages.length}\n`);
      for (const pageDef of navTestPages) {
        console.log(`测试导航: ${pageDef.name}...`);
        const navResult = await testNavigation(page, pageDef.fullUrl, []);
        navigationResults.push(navResult);
        console.log(`  发现 ${navResult.sidebarLinks.length} 个导航链接, 通过: ${navResult.passed}, 失败: ${navResult.failed}`);
      }
    }

    // === 表单/跳转测试 ===
    if (!moduleFilter || moduleFilter === 'forms') {
      console.log(`\n[${'='.repeat(16)} 表单/跳转测试 ${'='.repeat(16)}]\n`);
      const formPages = targetPages.filter(p => p.category === 'list' || p.category === 'form');
      for (const pageDef of formPages.slice(0, 15)) {
        console.log(`测试跳转: ${pageDef.name}...`);
        const transResult = await testPageTransitions(page, pageDef);
        transitionResults.push(transResult);
        if (transResult.transitions.length > 0) {
          console.log(`  发现 ${transResult.transitions.length} 个跳转, 通过: ${transResult.passed}`);
        }
      }
    }
  } catch (err) {
    console.error(`\n执行错误: ${err.message}`);
  } finally {
    await browser.close();
  }

  const endTime = Date.now();
  const byCategory = {};
  pageResults.forEach(p => { byCategory[p.category] = (byCategory[p.category] || 0) + 1; });

  const summary = {
    totalPages: targetPages.length,
    analyzed: pageResults.filter(p => p.status === 'analyzed').length,
    failed: pageResults.filter(p => p.status !== 'analyzed').length,
    successRate: pageResults.length > 0
      ? ((pageResults.filter(p => p.status === 'analyzed').length / pageResults.length) * 100).toFixed(1) : 0,
    byCategory
  };

  const reportData = { startTime, endTime, summary, pageResults, navigationResults, transitionResults };
  const rawPath = path.join(REPORTS_DIR, 'latest_results.json');
  fs.writeFileSync(rawPath, JSON.stringify(reportData, null, 2), 'utf8');

  console.log(`\n${'='.repeat(20)} 生成报告 ${'='.repeat(20)}\n`);
  const { reportPath, jsonPath } = generateReport(reportData);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  测试完成`);
  console.log(`  总页面: ${summary.totalPages}`);
  console.log(`  成功: ${summary.analyzed} | 失败: ${summary.failed} | 成功率: ${summary.successRate}%`);
  console.log(`  耗时: ${((endTime - startTime) / 1000).toFixed(1)}s`);
  console.log(`  报告: ${reportPath}`);
  console.log(`  数据: ${jsonPath}`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
