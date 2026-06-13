/**
 * Sitemap 自动提取脚本
 *
 * 职责：
 * 1. 启动 Playwright 无头浏览器访问 Axure 原型
 * 2. 从页面中提取 $axure.document.sitemap 对象
 * 3. 将 Sitemap 保存为格式化的 JSON 文件
 *
 * 支持的链接格式：
 *   - Axure Cloud: https://*.axshare.com/...
 *   - 本地 Axure Share: http://127.0.0.1:xxxxx/start.html?id=xxx
 *   - 第三方托管平台: https://hub.axmax.cn/view/xxx/
 *
 * 降级方案：
 *   如果 Playwright 提取失败，使用 agent-browser 手动提取（参考 SKILL.md）
 *
 * CLI 参数：
 *   --base-url <url>     Axure 原型地址（必填）
 *   --output <filename>  输出文件名（默认 sitemap_raw.json）
 *   --timeout <ms>       页面加载超时时间（默认 30000ms）
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 解析 CLI 参数
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
};

const baseUrl = getArg('base-url');
const outputPath = getArg('output') || 'sitemap_raw.json';
const timeout = parseInt(getArg('timeout') || '30000');

if (!baseUrl) {
  console.error('错误: 请提供 Axure 原型地址');
  console.error('用法: node extract-sitemap.js --base-url http://xxx');
  process.exit(1);
}

async function extractSitemap() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Sitemap 自动提取`);
  console.log(`  目标: ${baseUrl}`);
  console.log(`  输出: ${outputPath}`);
  console.log(`${'='.repeat(60)}\n`);

  console.log('正在启动浏览器...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      locale: 'zh-CN'
    });
    const page = await context.newPage();

    // 构建 Axure 启动页面 URL
    const startUrl = baseUrl.includes('?') ? baseUrl : `${baseUrl}/start.html`;
    console.log(`正在访问: ${startUrl}`);

    // 打开 Axure 原型
    await page.goto(startUrl, {
      waitUntil: 'domcontentloaded',
      timeout: timeout
    });

    // 等待 Axure 加载完成
    console.log('等待 Axure 加载...');
    await page.waitForTimeout(3000);

    // 检查 $axure 对象是否存在
    const hasAxure = await page.evaluate(() => {
      return typeof window.$axure !== 'undefined' && 
             typeof window.$axure.document !== 'undefined' &&
             typeof window.$axure.document.sitemap !== 'undefined';
    });

    if (!hasAxure) {
      throw new Error('未检测到 Axure Sitemap 对象，请确认链接是否正确');
    }

    // 提取 Sitemap
    console.log('正在提取 Sitemap...');
    const sitemap = await page.evaluate(() => {
      return JSON.stringify(window.$axure.document.sitemap);
    });

    // 保存到文件（格式化输出）
    const workDir = process.cwd();
    const filePath = path.join(workDir, outputPath);
    const formatted = JSON.stringify(JSON.parse(sitemap), null, 2);
    fs.writeFileSync(filePath, formatted, 'utf8');

    // 解析并显示摘要
    const parsed = JSON.parse(sitemap);
    const stats = countNodes(parsed.rootNodes || []);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`  提取完成`);
    console.log(`  文件: ${filePath}`);
    console.log(`  总节点数: ${stats.total}`);
    console.log(`  文件夹: ${stats.folders}`);
    console.log(`  页面: ${stats.wireframes}`);
    console.log(`${'='.repeat(60)}\n`);

    return filePath;
  } catch (err) {
    console.error(`\n提取失败: ${err.message}`);
    console.error('\n请尝试以下方案:');
    console.error('1. 检查 Axure 链接是否可访问');
    console.error('2. 增加超时时间: --timeout 60000');
    console.error('3. 使用 agent-browser 手动提取（参考 SKILL.md 兜底方案）');
    throw err;
  } finally {
    await browser.close();
  }
}

function countNodes(nodes) {
  let total = 0;
  let folders = 0;
  let wireframes = 0;

  for (const node of nodes) {
    total++;
    if (node.type === 'Folder') {
      folders++;
    } else {
      wireframes++;
    }
    if (node.children) {
      const childStats = countNodes(node.children);
      total += childStats.total;
      folders += childStats.folders;
      wireframes += childStats.wireframes;
    }
  }

  return { total, folders, wireframes };
}

// 直接运行或作为模块导出
if (require.main === module) {
  extractSitemap()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  module.exports = { extractSitemap };
}
