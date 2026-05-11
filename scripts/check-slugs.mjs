#!/usr/bin/env node
/**
 * Slug naming convention check.
 *
 * All content folder names and image/asset filenames must follow kebab-case:
 * lowercase letters, digits, and hyphens only — no uppercase, underscores, or spaces.
 *
 * Scans:
 *   src/content/      — all directory names and co-located asset files
 *   src/data/people/  — all image filenames
 *   src/data/slides/  — all image filenames
 *
 * Usage:
 *   node scripts/check-slugs.mjs
 *
 * Exit code 1 if any violations are found.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Valid slug: one or more lowercase-alphanumeric segments separated by single hyphens.
// Digits-only segments are allowed (years, numeric IDs: 2025, 2nd, 3d, …).
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Asset extensions we validate.
const ASSET_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.pdf']);

const c = {
  red:    s => `\x1b[31m${s}\x1b[0m`,
  green:  s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  dim:    s => `\x1b[2m${s}\x1b[0m`,
  bold:   s => `\x1b[1m${s}\x1b[0m`,
};

const violations = [];

// Suggest a corrected name: lowercase, spaces/underscores → hyphens,
// then collapse any run of consecutive hyphens.
function suggest(name) {
  const ext = path.extname(name);
  const stem = path.basename(name, ext);
  const fixed = stem
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return fixed + ext.toLowerCase();
}

function check(name, fullPath, kind) {
  if (kind === 'file') {
    const ext = path.extname(name);
    const stem = path.basename(name, ext);
    if (!SLUG.test(stem) || ext !== ext.toLowerCase()) {
      violations.push({ path: fullPath, name, suggestion: suggest(name) });
    }
  } else {
    if (!SLUG.test(name)) {
      violations.push({ path: fullPath, name, suggestion: suggest(name) });
    }
  }
}

// Walk src/content/ recursively.
// Checks all directory names and all co-located asset files.
// Skips config.ts — it's source code, not a content slug.
function walkContent(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'config.ts') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      check(entry.name, fullPath, 'dir');
      walkContent(fullPath);
    } else if (entry.isFile()) {
      if (ASSET_EXTS.has(path.extname(entry.name).toLowerCase())) {
        check(entry.name, fullPath, 'file');
      }
    }
  }
}

// Walk a flat data media directory (src/data/people/, src/data/slides/).
// Checks all image filenames.
function walkDataDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isFile() && ASSET_EXTS.has(path.extname(file).toLowerCase())) {
      check(file, fullPath, 'file');
    }
  }
}

function main() {
  console.log(c.bold('\n  ELIXIR Norway — slug & filename convention check\n'));
  console.log(c.dim('  Rule: lowercase, digits, hyphens only (kebab-case). No uppercase, underscores, or spaces.\n'));

  walkContent(path.join(ROOT, 'src/content'));
  walkDataDir(path.join(ROOT, 'src/data/people'));
  walkDataDir(path.join(ROOT, 'src/data/slides'));

  if (violations.length === 0) {
    console.log(c.green(c.bold('  All names are valid. ✓\n')));
    process.exit(0);
  }

  console.log(c.red(c.bold(`  ${violations.length} violation(s) found:\n`)));
  for (const v of violations) {
    const rel = path.relative(ROOT, v.path);
    console.log(`  ${c.red('✗')}  ${rel}`);
    console.log(c.dim(`       → ${v.suggestion}`));
    console.log();
  }

  console.log(
    c.yellow('  Rename with: ') +
    c.dim('git mv <old-path> <new-path>') +
    c.dim('  (preserves history)\n')
  );

  process.exit(1);
}

main();
