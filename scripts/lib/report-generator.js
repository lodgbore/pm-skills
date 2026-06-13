/**
 * 报告生成模块
 *
 * 职责：
 * 1. 汇总页面分析、导航测试、跳转测试结果
 * 2. 生成 JSON 数据文件（latest_results.json）
 * 3. 生成 Markdown 格式的可读报告（report_*.md）
 *
 * 输出：
 * - reports/latest_results.json：结构化数据（供 PRD 生成使用）
 * - reports/report_*.md：可读的测试报告
 */

const fs = require('fs');
const path = require('path');
const { REPORTS_DIR, sitemap } = require('../config');

function generateReport(data) {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const reportPath = path.join(REPORTS_DIR, `report_${timestamp}.md`);
  const jsonPath = path.join(REPORTS_DIR, `report_${timestamp}.json`);

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  const md = buildMarkdownReport(data);
  fs.writeFileSync(reportPath, md, 'utf8');

  return { reportPath, jsonPath };
}

function buildMarkdownReport(data) {
  const { pageResults, navigationResults, transitionResults, summary, startTime, endTime } = data;
  const duration = ((endTime - startTime) / 1000).toFixed(1);
  let md = '';

  md += `# Axure 原型自动化测试报告\n\n`;
  md += `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n`;
  md += `**执行时长**: ${duration}s\n\n`;

  md += `## 一、测试概要\n\n`;
  md += `| 指标 | 数值 |\n|------|------|\n`;
  md += `| 总页面数 | ${summary.totalPages} |\n`;
  md += `| 成功分析 | ${summary.analyzed} |\n`;
  md += `| 分析失败 | ${summary.failed} |\n`;
  md += `| 成功率 | ${summary.successRate}% |\n`;
  md += `| 列表页 | ${summary.byCategory.list || 0} |\n`;
  md += `| 表单页 | ${summary.byCategory.form || 0} |\n`;
  md += `| 详情页 | ${summary.byCategory.detail || 0} |\n`;
  md += `| 仪表盘 | ${summary.byCategory.dashboard || 0} |\n`;
  md += `| 静态页 | ${summary.byCategory.static || 0} |\n\n`;

  md += `## 二、页面目录结构\n\n\`\`\`\n${sitemap.tree}\`\`\`\n\n`;

  md += `## 三、页面分析详情\n\n`;
  const byModule = {};
  pageResults.forEach(p => {
    const module = p.path ? p.path.split(' > ').slice(0, 2).join(' > ') : '未知模块';
    if (!byModule[module]) byModule[module] = [];
    byModule[module].push(p);
  });

  for (const [module, pages] of Object.entries(byModule)) {
    md += `### ${module}\n\n`;
    for (const p of pages) {
      md += `#### ${p.name} [${p.category}]\n\n`;
      md += `- **状态**: ${p.status === 'analyzed' ? '✓ 正常' : '✗ ' + (p.error || p.status)}\n`;
      md += `- **加载时间**: ${p.loadTime}ms\n`;
      md += `- **路径**: ${p.path}\n`;
      if (p.headings && p.headings.length > 0) md += `- **页面标题**: ${p.headings.slice(0, 3).join(' / ')}\n`;
      if (p.buttons && p.buttons.length > 0) md += `- **操作按钮**: ${p.buttons.join('、')}\n`;
      if (p.formFields && p.formFields.length > 0) md += `- **表单字段**: ${p.formFields.map(f => f.text || f.placeholder).join('、')}\n`;
      if (p.pagination) md += `- **分页**: 共 ${p.pagination.total || '?'} 条, ${p.pagination.perPage || '?'} 条/页\n`;
      if (p.tables && p.tables.length > 0 && p.tables[0].headers.length > 0) md += `- **表格列**: ${p.tables[0].headers.join('、')}\n`;
      if (p.tabs && p.tabs.length > 0) md += `- **标签页**: ${p.tabs.join('、')}\n`;
      const keyTexts = p.textContent.filter(t => t.length > 1 && t.length < 30 && !/^\d+$/.test(t)).slice(0, 10);
      if (keyTexts.length > 0) md += `- **关键内容**: ${keyTexts.join('、')}\n`;
      md += '\n';
    }
  }

  if (navigationResults && navigationResults.length > 0) {
    md += `## 四、导航测试结果\n\n`;
    for (const nav of navigationResults) {
      md += `### 从 ${nav.startUrl.split('/').pop()} 出发\n\n`;
      md += `- 发现导航链接: ${nav.sidebarLinks.length} 个\n- 测试通过: ${nav.passed}\n- 测试失败: ${nav.failed}\n\n`;
      if (nav.testedLinks.length > 0) {
        md += `| 链接文本 | 状态 | 目标URL | 错误 |\n|----------|------|---------|------|\n`;
        nav.testedLinks.forEach(link => {
          md += `| ${link.linkText} | ${link.status === 'navigated' ? '✓' : link.status} | ${link.targetUrl ? '已跳转' : '-'} | ${link.error || '-'} |\n`;
        });
        md += '\n';
      }
    }
  }

  if (transitionResults && transitionResults.length > 0) {
    md += `## 五、页面跳转测试结果\n\n`;
    for (const trans of transitionResults) {
      if (trans.transitions.length === 0) continue;
      md += `### ${trans.pageName}\n\n- 测试通过: ${trans.passed}\n- 测试失败: ${trans.failed}\n\n`;
      md += `| 按钮 | 状态 | 目标URL |\n|------|------|--------|\n`;
      trans.transitions.forEach(t => {
        md += `| ${t.buttonText} | ${t.status === 'success' ? '✓ 跳转成功' : t.status === 'no_effect' ? '无跳转' : '✗ ' + t.status} | ${t.targetUrl ? '已跳转' : '-'} |\n`;
      });
      md += '\n';
    }
  }

  md += `## 六、页面关联关系分析\n\n`;
  md += `### 6.1 列表-详情关系\n\n| 列表页 | 操作 | 详情/子页面 |\n|--------|------|-------------|\n`;
  [
    ['产品管理', '查看详情', '产品详情'],
    ['产品分类', '新增', '产品分类-新增'],
    ['产品参数', '新增/管理值', '产品参数-新增 / 产品参数-管理值'],
    ['客户管理', '新增/授权/联系人', '客户管理-新增 / 客户管理-产品授权 / 客户管理-联系人管理'],
    ['订单管理', '详情', '订单管理-订单详情'],
    ['建议反馈', '新增/详情', '建议反馈-新增 / 建议反馈-反馈详情'],
    ['已购产品', '详情/购买/续费', '已购产品-详情 / 已购产品-购买 / 已购产品-续费'],
    ['账单管理-日账单', '详情/切换', '账单管理-账单详情 / 周账单 / 月账单'],
    ['消息管理', '设置', '消息管理-设置-站内信 / 消息管理-设置-短信'],
  ].forEach(([list, action, detail]) => { md += `| ${list} | ${action} | ${detail} |\n`; });

  md += `\n### 6.2 数据依赖关系\n\n`;
  md += `- **产品分类** → 产品管理的产品分类筛选项\n`;
  md += `- **产品参数** → 产品管理的产品参数配置\n`;
  md += `- **产品标签** → 产品管理的产品标签筛选项\n`;
  md += `- **角色权限** → 全局菜单与功能权限控制\n\n`;

  md += `### 6.3 业务流程关系\n\n\`\`\`\n`;
  md += `试用申请 → 已购产品(试用) → 购买 → 已购产品(正式) → 续费 → 退款申请\n`;
  md += `建议反馈 → 反馈管理-建议 → 建议详情\n`;
  md += `缺陷反馈 → 反馈管理-缺陷 → 缺陷详情\n`;
  md += `\`\`\`\n\n`;

  const errors = pageResults.filter(p => p.status === 'error');
  if (errors.length > 0) {
    md += `## 七、错误详情\n\n`;
    errors.forEach(e => { md += `- **${e.name}**: ${e.error}\n`; });
  }

  return md;
}

module.exports = { generateReport };
