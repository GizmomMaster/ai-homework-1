'use strict';

const fs = require('fs');
const path = require('path');

const HTTP_TIMEOUT_MS = 30000;

function classify(target) {
  if (/^https?:\/\//i.test(target)) return 'external';
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return 'other';
  return 'local';
}

async function fetchWithTimeout(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(url, { method, redirect: 'follow', signal: controller.signal });
    return { ok: true, status: response.status };
  } catch (err) {
    return { ok: false, error: err };
  } finally {
    clearTimeout(timer);
  }
}

async function checkExternal(url) {
  let result = await fetchWithTimeout(url, 'HEAD');
  // Часть серверов не поддерживает HEAD и отвечает 405 (Method Not Allowed),
  // хотя сам ресурс доступен — в этом случае тоже пробуем GET.
  if (!result.ok || result.status === 405) {
    result = await fetchWithTimeout(url, 'GET');
  }

  if (!result.ok) {
    const isTimeout = result.error && result.error.name === 'AbortError';
    return { status: 'BROKEN', code: isTimeout ? 'таймаут' : (result.error?.code || 'ошибка сети') };
  }

  const broken = result.status >= 400;
  return { status: broken ? 'BROKEN' : 'OK', code: String(result.status) };
}

function checkLocal(target, sourceFile, rootDir) {
  const withoutHash = target.split('#')[0];
  const cleanPath = withoutHash.split('?')[0];

  if (!cleanPath) {
    return { status: 'OK', code: 'якорь' };
  }

  let decoded;
  try {
    decoded = decodeURIComponent(cleanPath);
  } catch {
    decoded = cleanPath;
  }

  const basePath = decoded.startsWith('/')
    ? path.join(rootDir, decoded)
    : path.resolve(path.dirname(sourceFile), decoded);

  return fs.existsSync(basePath)
    ? { status: 'OK', code: 'найден' }
    : { status: 'BROKEN', code: 'не найден' };
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function next() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, next);
  await Promise.all(workers);
  return results;
}

module.exports = { classify, checkExternal, checkLocal, runWithConcurrency, HTTP_TIMEOUT_MS };
