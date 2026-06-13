/**
 * 页面分析模块
 *
 * 职责：
 * 1. 访问每个 Axure 页面，等待加载完成
 * 2. 提取页面元素：标题、表格、按钮、表单字段、分页、标签页、关键文本
 * 3. 自动识别页面类型（基于 keywords.json 和 categories.json 配置）
 *
 * 依赖：
 * - config.keywords：关键词配置（表格列、按钮、表单提示词）
 * - utils.withRetry：重试机制（页面加载失败时自动重试）
 */

const { keywords } = require('../config');
const { withRetry } = require('./utils');

/**
 * 分析单个页面的内容和结构
 * @param {import('playwright').Page} page - Playwright page 实例
 * @param {object} pageDef - 页面定义 { name, fullUrl, category }
 * @returns {Promise<object>} 页面分析结果
 */
async function analyzePage(page, pageDef) {
  const startTime = Date.now();
  const result = {
    name: pageDef.name,
    url: pageDef.fullUrl,
    category: pageDef.category,
    path: pageDef.path,
    status: 'unknown',
    loadTime: 0,
    title: '',
    error: null,
    elements: {},
    textContent: [],
    navigationLinks: [],
    tables: [],
    formFields: [],
    buttons: [],
    tabs: [],
    headings: [],
    pagination: null,
    breadcrumb: null,
    screenshotPath: null
  };

  try {
    await withRetry(async () => {
      const response = await page.goto(pageDef.fullUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      result.loadTime = Date.now() - startTime;
      result.status = response ? (response.ok() ? 'success' : `http_${response.status()}`) : 'no_response';
      await page.waitForTimeout(1500);
      result.title = await page.title();
    });

    // 提取全部文本内容
    result.textContent = await page.evaluate(() => {
      const texts = [];
      const walker = document.createTreeWalker(
        document.body, NodeFilter.SHOW_TEXT,
        { acceptNode: function(node) {
            const text = node.textContent.trim();
            if (text.length > 0 && text.length < 200 &&
                node.parentElement &&
                node.parentElement.tagName !== 'SCRIPT' &&
                node.parentElement.tagName !== 'STYLE') {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_REJECT;
          }
        }
      );
      let node;
      while ((node = walker.nextNode())) {
        const t = node.textContent.trim();
        if (t) texts.push(t);
      }
      return [...new Set(texts)];
    });

    // 提取结构化元素
    result.elements = await page.evaluate(() => {
      const r = {};
      r.axDefaultCount = document.querySelectorAll('[class*="ax_default"]').length;
      r.totalDivs = document.querySelectorAll('div').length;
      r.totalImages = document.querySelectorAll('img').length;
      r.tableCellCount = document.querySelectorAll('[class*="table_cell"]').length;
      const headerTexts = [];
      document.querySelectorAll('[class*="table_cell"]').forEach(cell => {
        const text = cell.innerText.trim();
        if (text && text.length < 30) headerTexts.push(text);
      });
      r.tableHeaders = headerTexts.slice(0, 20);
      return r;
    });

    // 提取导航链接
    result.navigationLinks = await page.evaluate(() => {
      const links = [];
      const allDivs = document.querySelectorAll('[class*="ax_default"]');
      allDivs.forEach(div => {
        const text = div.innerText.trim();
        if (text && div.style.cursor === 'pointer' && text.length < 30) {
          links.push(text);
        }
      });
      return [...new Set(links)];
    });

    // 检测表格结构
    const tableHeaders = keywords.tableHeaders;
    result.tables = await page.evaluate((headers) => {
      const tables = [];
      const allText = document.body.innerText;
      const pagMatch = allText.match(/共\s*(\d+)\s*条/);
      const pagination = pagMatch ? { total: parseInt(pagMatch[1]) } : null;
      const foundHeaders = headers.filter(h => allText.includes(h));
      if (foundHeaders.length > 0) {
        tables.push({ headers: foundHeaders, pagination });
      }
      return tables;
    }, tableHeaders);

    // 检测表单字段
    const formHints = keywords.formHints;
    result.formFields = await page.evaluate((hints) => {
      const fields = [];
      document.querySelectorAll('[placeholder]').forEach(el => {
        fields.push({ type: 'input', placeholder: el.placeholder });
      });
      const allText = document.body.innerText;
      const inputPattern = new RegExp(hints.input + '[^\\n]{1,20}', 'g');
      const selectPattern = new RegExp(hints.select + '[^\\n]{1,20}', 'g');
      (allText.match(inputPattern) || []).forEach(p => fields.push({ type: 'input_hint', text: p }));
      (allText.match(selectPattern) || []).forEach(p => fields.push({ type: 'select_hint', text: p }));
      return fields;
    }, formHints);

    // 检测操作按钮
    const actionButtons = keywords.actionButtons;
    result.buttons = await page.evaluate((btns) => {
      const foundBtns = [];
      const allText = document.body.innerText;
      btns.forEach(btn => { if (allText.includes(btn)) foundBtns.push(btn); });
      return foundBtns;
    }, actionButtons);

    // 检测标签页
    result.tabs = await page.evaluate(() => {
      const tabKeywords = [];
      document.querySelectorAll('[class*="tab"], [role="tablist"]').forEach(container => {
        container.querySelectorAll('[class*="tab"]').forEach(tab => {
          const text = tab.innerText.trim();
          if (text && text.length < 20) tabKeywords.push(text);
        });
      });
      return [...new Set(tabKeywords)];
    });

    // 检测标题
    result.headings = await page.evaluate(() => {
      const heads = [];
      document.querySelectorAll('[class*="ax_default"][class*="text"]').forEach(el => {
        const text = el.innerText.trim();
        if (text && text.length < 50 && text.length > 1) heads.push(text);
      });
      return [...new Set(heads)].slice(0, 10);
    });

    // 检测分页
    result.pagination = await page.evaluate(() => {
      const text = document.body.innerText;
      const totalMatch = text.match(/共\s*(\d+)\s*条/);
      const pageMatch = text.match(/(\d+)条\/页/);
      const jumpMatch = text.match(/跳至\s*(\d+)\s*页/);
      if (totalMatch || pageMatch) {
        return {
          total: totalMatch ? parseInt(totalMatch[1]) : null,
          perPage: pageMatch ? parseInt(pageMatch[1]) : null,
          maxPage: jumpMatch ? parseInt(jumpMatch[1]) : null
        };
      }
      return null;
    });

    result.status = 'analyzed';
  } catch (err) {
    result.status = 'error';
    result.error = err.message;
  }

  return result;
}

module.exports = { analyzePage };
