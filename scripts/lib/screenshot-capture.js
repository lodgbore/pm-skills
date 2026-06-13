/**
 * 截图采集模块
 *
 * 职责：
 * 1. 访问页面并等待加载完成
 * 2. 截取全页面截图（fullPage: true）
 * 3. 保存为 PNG 文件到 screenshots/ 目录
 *
 * 文件命名：{序号}_{页面名称}.png
 */

const path = require('path');
const fs = require('fs');
const { SCREENSHOTS_DIR } = require('../config');

async function captureScreenshot(page, pageDef) {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const safeName = pageDef.name
    .replace(/[（）()\/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_');
  const filename = `${String(pageDef.index || 0).padStart(3, '0')}_${safeName}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);

  try {
    await page.goto(pageDef.fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: filepath, fullPage: true });
    return filepath;
  } catch (err) {
    return `error: ${err.message}`;
  }
}

module.exports = { captureScreenshot };
