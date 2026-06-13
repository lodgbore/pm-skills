/**
 * agent-browser CLI 封装模块
 *
 * 职责：
 * 提供与 Playwright Page 类似的接口，底层使用 agent-browser CLI
 * 用于 Playwright 不可用时的降级方案
 *
 * 提供的类：
 * - AgentBrowserPage：模拟 Playwright Page（goto, evaluate, screenshot, mouse.click）
 * - AgentBrowserContext：模拟 Playwright BrowserContext
 * - AgentBrowser：模拟 Playwright Browser（launch, newContext, close）
 *
 * 工具函数：
 * - isAgentBrowserAvailable：检测 agent-browser 是否可用
 */

const { execSync } = require('child_process');

class AgentBrowserPage {
  constructor() {
    this.currentUrl = null;
  }

  /**
   * 打开指定 URL
   */
  async goto(url, options = {}) {
    const timeout = options.timeout || 30000;
    try {
      execSync(`agent-browser open "${url}"`, { timeout, stdio: 'pipe' });
      this.currentUrl = url;
      // 等待页面加载
      await this.waitForTimeout(options.waitUntil === 'domcontentloaded' ? 2000 : 3000);
      return { ok: () => true, status: () => 200 };
    } catch (err) {
      return { ok: () => false, status: () => 500 };
    }
  }

  /**
   * 在页面中执行 JavaScript
   */
  async evaluate(fn, ...args) {
    try {
      // 将函数和参数序列化为可执行的 JS 表达式
      let jsExpr;
      if (typeof fn === 'function') {
        const fnStr = fn.toString();
        if (args.length > 0) {
          // 将参数注入到函数调用中
          const argsStr = args.map(a => JSON.stringify(a)).join(', ');
          jsExpr = `(${fnStr})(${argsStr})`;
        } else {
          jsExpr = `(${fnStr})()`;
        }
      } else {
        jsExpr = fn;
      }

      // agent-browser eval 输出是双层 JSON 编码
      const result = execSync(`agent-browser eval '${jsExpr.replace(/'/g, "'\\''")}'`, {
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf8'
      }).trim();

      // 解析双层 JSON
      const first = JSON.parse(result);
      return typeof first === 'string' ? JSON.parse(first) : first;
    } catch (err) {
      console.error(`[agent-browser] evaluate 失败: ${err.message}`);
      return null;
    }
  }

  /**
   * 获取当前页面 URL
   */
  url() {
    return this.currentUrl || '';
  }

  /**
   * 获取页面标题
   */
  async title() {
    try {
      const result = execSync(`agent-browser eval 'document.title'`, {
        timeout: 10000,
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf8'
      }).trim();
      const first = JSON.parse(result);
      return typeof first === 'string' ? first : JSON.parse(first);
    } catch {
      return '';
    }
  }

  /**
   * 等待指定时间
   */
  async waitForTimeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 截图
   */
  async screenshot(options = {}) {
    const filepath = options.path || 'screenshot.png';
    try {
      execSync(`agent-browser screenshot "${filepath}"`, {
        timeout: 15000,
        stdio: 'pipe'
      });
      return filepath;
    } catch (err) {
      console.error(`[agent-browser] 截图失败: ${err.message}`);
      return null;
    }
  }

  /**
   * 模拟 Playwright 的 mouse 对象
   */
  get mouse() {
    const self = this;
    return {
      async click(x, y) {
        try {
          execSync(`agent-browser click --x ${Math.round(x)} --y ${Math.round(y)}`, {
            timeout: 10000,
            stdio: 'pipe'
          });
        } catch (err) {
          console.error(`[agent-browser] 点击失败: ${err.message}`);
        }
      }
    };
  }

  /**
   * 关闭浏览器
   */
  async close() {
    try {
      execSync('agent-browser close', { timeout: 5000, stdio: 'pipe' });
    } catch {}
  }
}

/**
 * 模拟 Playwright BrowserContext
 */
class AgentBrowserContext {
  async newPage() {
    return new AgentBrowserPage();
  }

  async close() {
    try {
      execSync('agent-browser close', { timeout: 5000, stdio: 'pipe' });
    } catch {}
  }
}

/**
 * 模拟 Playwright Browser
 */
class AgentBrowser {
  static async launch(options = {}) {
    return new AgentBrowser();
  }

  async newContext(options = {}) {
    return new AgentBrowserContext();
  }

  async close() {
    try {
      execSync('agent-browser close', { timeout: 5000, stdio: 'pipe' });
    } catch {}
  }
}

/**
 * 检测 agent-browser 是否可用
 */
function isAgentBrowserAvailable() {
  try {
    execSync('which agent-browser', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  AgentBrowser,
  AgentBrowserContext,
  AgentBrowserPage,
  isAgentBrowserAvailable
};
