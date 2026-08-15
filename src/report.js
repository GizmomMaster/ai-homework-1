'use strict';

const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

function colorize(text, color) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function visibleLength(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function pad(str, width) {
  const diff = width - visibleLength(str);
  return diff > 0 ? str + ' '.repeat(diff) : str;
}

function printTable(rows, headers) {
  const widths = headers.map((h, i) =>
    Math.max(visibleLength(h), ...rows.map((r) => visibleLength(r[i])))
  );

  const renderRow = (cells) => '| ' + cells.map((c, i) => pad(c, widths[i])).join(' | ') + ' |';
  const separator = '+-' + widths.map((w) => '-'.repeat(w)).join('-+-') + '-+';

  console.log(separator);
  console.log(renderRow(headers));
  console.log(separator);
  rows.forEach((r) => console.log(renderRow(r)));
  console.log(separator);
}

function statusCell(status, code) {
  const label = `${status} (${code})`;
  if (status === 'OK') return colorize(label, 'green');
  if (status === 'BROKEN') return colorize(label, 'red');
  return colorize(label, 'gray');
}

function printReport(results, rootDir) {
  const rows = results.map((r, i) => [
    String(i + 1),
    path.relative(rootDir, r.file),
    r.target,
    r.type,
    statusCell(r.status, r.code),
  ]);

  printTable(rows, ['№', 'Файл', 'Ссылка', 'Тип', 'Статус']);

  const total = results.length;
  const broken = results.filter((r) => r.status === 'BROKEN').length;
  const ok = results.filter((r) => r.status === 'OK').length;
  const other = total - broken - ok;

  console.log('');
  console.log(`Всего ссылок: ${total}`);
  console.log(colorize(`Успешных: ${ok}`, 'green'));
  console.log(colorize(`Сломанных: ${broken}`, 'red'));
  if (other > 0) console.log(colorize(`Пропущено (не проверяются): ${other}`, 'gray'));
}

module.exports = { printReport };
