/**
 * 通用工具函数模块
 *
 * 职责：
 * 1. withRetry：带重试机制的异步函数执行
 *    - 支持最大重试次数、初始延迟、指数退避
 *    - 页面加载失败时自动重试，提高稳定性
 *
 * 配置来源：config.retry（maxRetries, delay, backoff）
 */

const { retry } = require('../config');

/**
 * 带重试的异步函数执行
 * @param {Function} fn - 要执行的异步函数
 * @param {object} options - 重试配置
 * @param {number} options.maxRetries - 最大重试次数
 * @param {number} options.delay - 初始延迟时间（毫秒）
 * @param {number} options.backoff - 延迟倍数
 * @returns {Promise<any>} 函数执行结果
 */
async function withRetry(fn, options = {}) {
  const { maxRetries = retry.maxRetries, delay = retry.delay, backoff = retry.backoff } = options;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const waitTime = delay * Math.pow(backoff, attempt - 1);
        console.log(`  重试 ${attempt}/${maxRetries}... (${waitTime}ms 后)`);
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
  }
  throw lastError;
}

module.exports = { withRetry };
