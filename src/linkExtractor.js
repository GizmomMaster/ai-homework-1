'use strict';

function maskRange(str, start, end) {
  return str.slice(0, start) + ' '.repeat(end - start) + str.slice(end);
}

// Извлекает из содержимого markdown-файла все ссылки: inline-ссылки и
// изображения, ссылки по сноскам ([text][ref]), автоссылки (<https://...>)
// и обычные url, встреченные в тексте.
function extractLinks(content) {
  const links = [];
  let working = content;

  // Маскируем блоки кода, чтобы не проверять ссылки внутри примеров кода.
  working = working.replace(/```[\s\S]*?```/g, (m) => ' '.repeat(m.length));
  working = working.replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length));

  // Собираем определения ссылок по сноскам: [ref]: target "title"
  const refDefs = new Map();
  const refDefRe = /^[ \t]{0,3}\[([^\]]+)\]:\s*<?([^\s>]+)>?.*$/gm;
  working = working.replace(refDefRe, (m, ref, target) => {
    refDefs.set(ref.trim().toLowerCase(), target);
    return ' '.repeat(m.length);
  });

  // Inline-ссылки и изображения: [текст](target "title") / ![alt](target)
  const inlineRe = /(!?)\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;
  let match;
  while ((match = inlineRe.exec(working)) !== null) {
    const [full, bang, text, target] = match;
    links.push({ text: text || (bang ? '(изображение)' : ''), target });
    working = maskRange(working, match.index, match.index + full.length);
  }

  // Ссылки по сноскам: [текст][ref] и укороченная форма [текст][]
  const refUseRe = /\[([^\]]*)\]\[([^\]]*)\]/g;
  while ((match = refUseRe.exec(working)) !== null) {
    const [full, text, refRaw] = match;
    const ref = (refRaw || text).trim().toLowerCase();
    const target = refDefs.get(ref);
    if (target) {
      links.push({ text, target });
    }
    working = maskRange(working, match.index, match.index + full.length);
  }

  // Автоссылки: <https://example.com>
  const autoRe = /<(https?:\/\/[^\s>]+)>/g;
  while ((match = autoRe.exec(working)) !== null) {
    links.push({ text: match[1], target: match[1] });
    working = maskRange(working, match.index, match.index + match[0].length);
  }

  // Голые url, оставшиеся в обычном тексте
  const bareRe = /https?:\/\/[^\s<>()[\]"']+/g;
  while ((match = bareRe.exec(working)) !== null) {
    const target = match[0].replace(/[.,;:!?]+$/, '');
    links.push({ text: target, target });
  }

  return links;
}

module.exports = { extractLinks };
