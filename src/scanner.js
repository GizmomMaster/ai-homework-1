'use strict';

const fs = require('fs');
const path = require('path');

function findMarkdownFiles(rootDir) {
  const result = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.md') {
        result.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return result;
}

module.exports = { findMarkdownFiles };
