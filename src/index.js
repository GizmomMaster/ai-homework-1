#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const { findMarkdownFiles } = require('./scanner');
const { extractLinks } = require('./linkExtractor');
const { classify, checkExternal, checkLocal, runWithConcurrency } = require('./linkChecker');
const { printReport } = require('./report');

const CONCURRENCY = 10;

function parseArgs(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith('-')));
  const onlyBroken = flags.has('--broken') || flags.has('-b');
  const targetArg = argv.find((a) => !a.startsWith('-'));
  return { onlyBroken, targetArg };
}

async function main() {
  const { onlyBroken, targetArg } = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(targetArg || path.join(__dirname, '..', 'ecto-1-kb-main'));

  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
    console.error(`Папка не найдена: ${rootDir}`);
    process.exit(1);
  }

  console.log(`Сканирование папки: ${rootDir}`);
  const files = findMarkdownFiles(rootDir);
  console.log(`Найдено .md файлов: ${files.length}`);

  const items = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const link of extractLinks(content)) {
      items.push({ file, ...link, type: classify(link.target) });
    }
  }

  console.log(`Найдено ссылок: ${items.length}`);
  console.log('Проверка ссылок (это может занять некоторое время)...\n');

  const results = await runWithConcurrency(items, CONCURRENCY, async (item) => {
    if (item.type === 'external') {
      const { status, code } = await checkExternal(item.target);
      return { ...item, status, code };
    }
    if (item.type === 'local') {
      const { status, code } = checkLocal(item.target, item.file, rootDir);
      return { ...item, status, code };
    }
    return { ...item, status: 'SKIP', code: 'не проверяется' };
  });

  printReport(results, rootDir, { onlyBroken });

  const hasBroken = results.some((r) => r.status === 'BROKEN');
  process.exit(hasBroken ? 1 : 0);
}

main().catch((err) => {
  console.error('Ошибка выполнения:', err);
  process.exit(1);
});
