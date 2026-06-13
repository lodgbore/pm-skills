/**
 * 导航测试模块
 *
 * 职责：
 * 1. testNavigation：测试侧边栏导航链接（点击链接，检测 URL 变化）
 * 2. testPageTransitions：测试页面内跳转（点击按钮，检测页面跳转）
 *
 * 依赖：
 * - config.keywords.navigationActions：导航跳转关键词
 * - utils.withRetry：重试机制
 */

const { keywords } = require('../config');
const { withRetry } = require('./utils');

async function testNavigation(page, startUrl, expectedLinks) {
  const result = {
    startUrl,
    sidebarLinks: [],
    testedLinks: [],
    passed: 0,
    failed: 0,
    errors: []
  };

  try {
    await withRetry(async () => {
      await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
    });

    const navItems = await page.evaluate(() => {
      const items = [];
      const allDivs = document.querySelectorAll('[class*="ax_default"]');
      allDivs.forEach(div => {
        const text = div.innerText.trim();
        if (text && text.length > 1 && text.length < 30) {
          const rect = div.getBoundingClientRect();
          if (rect.x < 300 && rect.width > 0 && rect.height > 0) {
            items.push({
              text,
              x: rect.x + rect.width / 2,
              y: rect.y + rect.height / 2,
              width: rect.width,
              height: rect.height,
              cursor: window.getComputedStyle(div).cursor
            });
          }
        }
      });
      const seen = new Set();
      return items.filter(item => { if (seen.has(item.text)) return false; seen.add(item.text); return true; });
    });

    result.sidebarLinks = navItems.map(n => n.text);

    for (const navItem of navItems.slice(0, 20)) {
      const testResult = { linkText: navItem.text, status: 'unknown', targetUrl: null, error: null };
      try {
        const urlBefore = page.url();
        await page.mouse.click(navItem.x, navItem.y);
        await page.waitForTimeout(2000);
        const urlAfter = page.url();
        testResult.targetUrl = urlAfter;
        testResult.navigated = urlBefore !== urlAfter;
        testResult.status = testResult.navigated ? 'navigated' : 'no_navigation';
        result.passed++;
        if (testResult.navigated) {
          await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await page.waitForTimeout(1500);
        }
      } catch (err) {
        testResult.status = 'error';
        testResult.error = err.message;
        result.failed++;
        result.errors.push(`${navItem.text}: ${err.message}`);
        try { await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }); await page.waitForTimeout(1500); } catch (e) {}
      }
      result.testedLinks.push(testResult);
    }
  } catch (err) {
    result.errors.push(`Navigation test failed: ${err.message}`);
  }
  return result;
}

async function testPageTransitions(page, pageDef) {
  const result = { pageName: pageDef.name, transitions: [], passed: 0, failed: 0 };
  try {
    await withRetry(async () => {
      await page.goto(pageDef.fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
    });

    const navigationActions = keywords.navigationActions;
    const actionButtons = await page.evaluate((actionTexts) => {
      const actions = [];
      document.querySelectorAll('[class*="ax_default"]').forEach(div => {
        const text = div.innerText.trim();
        if (actionTexts.includes(text)) {
          const rect = div.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            actions.push({ text, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
          }
        }
      });
      return actions;
    }, navigationActions);

    for (const btn of actionButtons) {
      const transition = { buttonText: btn.text, status: 'unknown', targetUrl: null };
      try {
        const urlBefore = page.url();
        await page.mouse.click(btn.x, btn.y);
        await page.waitForTimeout(2000);
        const urlAfter = page.url();
        transition.targetUrl = urlAfter;
        transition.navigated = urlBefore !== urlAfter;
        transition.status = transition.navigated ? 'success' : 'no_effect';
        result.passed++;
        if (transition.navigated) {
          await page.goto(pageDef.fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await page.waitForTimeout(1500);
        }
      } catch (err) {
        transition.status = 'error';
        transition.error = err.message;
        result.failed++;
        try { await page.goto(pageDef.fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }); await page.waitForTimeout(1500); } catch (e) {}
      }
      result.transitions.push(transition);
    }
  } catch (err) { result.error = err.message; }
  return result;
}

module.exports = { testNavigation, testPageTransitions };
