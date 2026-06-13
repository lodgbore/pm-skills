/**
 * Sitemap 解析脚本
 *
 * 职责：
 * 1. 读取 sitemap_raw.json（原始 Sitemap 数据）
 * 2. 递归展平页面节点，提取页面元数据（id、name、url、depth、path）
 * 3. 构建缩进树形文本（用于展示页面目录结构）
 * 4. 输出 sitemap_parsed.json（结构化数据，供 run.js 使用）
 *
 * 输入格式兼容：
 *   - 双层 JSON（agent-browser eval 输出）
 *   - 单层 JSON（extract-sitemap.js 输出）
 *
 * CLI 参数：
 *   node parse_sitemap.js [sitemap_raw.json 路径]
 */
const fs = require('fs');
const path = require('path');

const WORK_DIR = process.cwd();
const rawPath = process.argv[2] || path.join(WORK_DIR, 'sitemap_raw.json');

if (!fs.existsSync(rawPath)) {
  console.error(`未找到 ${rawPath}`);
  console.error('请先通过 agent-browser 提取 Axure Sitemap 并保存为 sitemap_raw.json');
  process.exit(1);
}

const rawStr = fs.readFileSync(rawPath, 'utf8').trim();
// 兼容两种格式：双层 JSON（agent-browser 输出）或单层 JSON（extract-sitemap.js 输出）
let raw;
try {
  const first = JSON.parse(rawStr);
  raw = typeof first === 'string' ? JSON.parse(first) : first;
} catch (e) {
  console.error('sitemap_raw.json 格式错误:', e.message);
  process.exit(1);
}

// 递归展平页面节点
function flattenNodes(nodes, parentPath, depth, results) {
  if (!nodes) return;
  for (const node of nodes) {
    const fullPath = parentPath ? parentPath + ' > ' + node.pageName : node.pageName;
    results.push({
      id: node.id,
      name: node.pageName,
      type: node.type,
      url: node.url || '',
      depth: depth,
      path: fullPath,
      hasChildren: !!(node.children && node.children.length > 0)
    });
    if (node.children) {
      flattenNodes(node.children, fullPath, depth + 1, results);
    }
  }
}

// 构建缩进树形文本
function buildTree(nodes, indent) {
  if (!nodes) return '';
  let lines = '';
  for (const node of nodes) {
    const prefix = indent ? indent + '- ' : '- ';
    const suffix = node.type === 'Folder' ? '/' : '';
    lines += prefix + node.pageName + suffix + '\n';
    if (node.children) {
      lines += buildTree(node.children, indent + '  ');
    }
  }
  return lines;
}

const allPages = [];
flattenNodes(raw.rootNodes, '', 0, allPages);

const tree = buildTree(raw.rootNodes, '');
const wireframes = allPages.filter(p => p.type === 'Wireframe');
const folders = allPages.filter(p => p.type === 'Folder');

const output = {
  summary: {
    totalPages: allPages.length,
    wireframePages: wireframes.length,
    folders: folders.length
  },
  tree: tree,
  wireframes: wireframes.map(w => ({
    name: w.name,
    url: w.url,
    id: w.id,
    path: w.path,
    depth: w.depth
  }))
};

const outPath = path.join(WORK_DIR, 'sitemap_parsed.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log('Summary:', output.summary);
console.log('\n=== Page Tree ===\n');
console.log(tree);
console.log('\n=== Wireframe Pages ===');
wireframes.forEach((w, i) => {
  console.log((i+1) + '. ' + w.name + ' (' + w.url + ')');
});
console.log(`\n已保存至: ${outPath}`);
