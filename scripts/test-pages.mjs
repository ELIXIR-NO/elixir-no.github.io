#!/usr/bin/env node
/**
 * Page & asset integrity test.
 *
 * Starts a local static HTTP server on dist/, then:
 *   1. Reads dist/sitemap-0.xml to enumerate every page URL.
 *   2. Fetches each page – expects HTTP 200.
 *   3. Parses the HTML to find local asset references (img src, link href,
 *      script src, source srcset, etc.).
 *   4. Fetches each unique local asset URL once – expects HTTP 200.
 *   5. Prints a summary and exits with code 1 if anything failed.
 *
 * Usage:
 *   node scripts/test-pages.mjs [--port 4321] [--dist ./dist]
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Config ──────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
function arg(flag, fallback) {
  const i = args.indexOf(flag);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : fallback;
}
const PORT = Number(arg('--port', '4321'));
const DIST = path.resolve(ROOT, arg('--dist', 'dist'));
const SITE_ORIGIN = `http://localhost:${PORT}`;

// MIME types for the static server
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

// ── Static HTTP server ───────────────────────────────────────────────────────
function createServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      // Strip query string
      let urlPath = req.url.split('?')[0];
      // Decode URI components
      try { urlPath = decodeURIComponent(urlPath); } catch {}

      let filePath = path.join(DIST, urlPath);

      // Try exact path, then index.html
      const candidates = [
        filePath,
        path.join(filePath, 'index.html'),
        filePath + '.html',
      ];

      for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          const ext = path.extname(candidate);
          const mime = MIME[ext] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': mime });
          fs.createReadStream(candidate).pipe(res);
          return;
        }
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    });

    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

// ── HTTP fetch (no external deps) ───────────────────────────────────────────
function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () =>
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() })
      );
    });
    req.on('error', reject);
    req.setTimeout(10_000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ── Sitemap parser ───────────────────────────────────────────────────────────
function parseSitemap(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map((m) =>
    m[1].trim()
  );
}

// ── HTML asset extractor ─────────────────────────────────────────────────────
// File-extension pattern — used to distinguish real assets from nav links.
const HAS_EXT = /\.[a-z0-9]{1,6}$/i;

// Some hrefs come from feeds we do not control (TeSS on /training) and get baked
// into static HTML at build time, so a `javascript:` URL would ship and stay
// shipped. Anything outside this set is a defect, not a style preference.
const SAFE_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);
const SCHEMED_HREF = /(?:href|src)="([a-zA-Z][a-zA-Z0-9+.-]*):/g;

function extractUnsafeSchemes(html) {
  const found = new Set();
  for (const [, scheme] of html.matchAll(SCHEMED_HREF)) {
    if (!SAFE_SCHEMES.has(scheme.toLowerCase())) found.add(scheme.toLowerCase());
  }
  return [...found];
}

const ASSET_ATTRS = [
  // src attributes (scripts, images — always files)
  /\bsrc=["']([^"']+)["']/g,
  // href attributes — only those pointing to actual files (css, fonts, pdf, …)
  // Navigation links like /news/ or /about intentionally excluded.
  /\bhref=["']([^"'#][^"']*)["']/g,
  // srcset — comma-separated list of "url [descriptor]" pairs
  /\bsrcset=["']([^"']+)["']/g,
];

function extractLocalAssets(html, pageUrl) {
  const assets = new Set();

  for (const pattern of ASSET_ATTRS) {
    for (const m of html.matchAll(new RegExp(pattern.source, 'g'))) {
      const raw = m[1].trim();

      // srcset can contain multiple space/comma separated entries
      const candidates = raw.includes(',')
        ? raw.split(',').map((s) => s.trim().split(/\s+/)[0])
        : [raw.split(/\s+/)[0]];

      for (const url of candidates) {
        if (!url) continue;
        // Only local paths (starts with /)
        if (!url.startsWith('/')) continue;
        // Skip data URIs
        if (url.startsWith('data:')) continue;
        // For href: only flag actual files, not navigation paths
        if (!HAS_EXT.test(url.split('?')[0])) continue;
        assets.add(url);
      }
    }
  }

  return [...assets];
}

// ── Colour helpers (no external deps) ───────────────────────────────────────
const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red:   (s) => `\x1b[31m${s}\x1b[0m`,
  yellow:(s) => `\x1b[33m${s}\x1b[0m`,
  dim:   (s) => `\x1b[2m${s}\x1b[0m`,
  bold:  (s) => `\x1b[1m${s}\x1b[0m`,
};

// ── Progress bar ─────────────────────────────────────────────────────────────
function progress(current, total, label = '') {
  const width = 40;
  const filled = Math.round((current / total) * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  process.stdout.write(`\r[${bar}] ${current}/${total} ${label.slice(0, 40).padEnd(40)}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(DIST)) {
    console.error(c.red(`dist/ not found at ${DIST}. Run \`pnpm build\` first.`));
    process.exit(1);
  }

  const sitemapPath = path.join(DIST, 'sitemap-0.xml');
  if (!fs.existsSync(sitemapPath)) {
    console.error(c.red('sitemap-0.xml not found. Is @astrojs/sitemap configured?'));
    process.exit(1);
  }

  console.log(c.bold('\n  ELIXIR Norway — page & asset integrity test\n'));
  console.log(c.dim(`  Serving:  ${DIST}`));
  console.log(c.dim(`  Port:     ${PORT}\n`));

  // Start server
  const server = await createServer();

  const pageErrors = [];    // { url, status, error }
  const ssrPages = [];      // SSR pages in sitemap (no static HTML file)
  const assetErrors = [];   // { asset, foundOn, status, error }
  const schemeErrors = [];  // { url, scheme }
  const assetCache = new Map(); // url → status

  // Parse sitemap
  const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
  const sitemapUrls = parseSitemap(sitemapXml);

  console.log(`  Checking ${c.bold(String(sitemapUrls.length))} pages from sitemap...\n`);

  let pageOk = 0;

  // Helper: find the prerendered HTML file on disk for a URL path
  function findStaticHtml(urlPath) {
    const base = path.join(DIST, urlPath);
    for (const candidate of [base, path.join(base, 'index.html'), base + '.html']) {
      try {
        if (fs.statSync(candidate).isFile()) return candidate;
      } catch {}
    }
    return null;
  }

  for (let i = 0; i < sitemapUrls.length; i++) {
    const siteUrl = sitemapUrls[i];
    // Replace production origin with localhost
    const localUrl = siteUrl.replace(/^https?:\/\/[^/]+/, SITE_ORIGIN);
    const pagePath = new URL(localUrl).pathname;

    progress(i + 1, sitemapUrls.length, pagePath);

    if (!findStaticHtml(pagePath)) {
      ssrPages.push(siteUrl);
      continue;
    }

    let pageHtml = '';
    try {
      const res = await fetch(localUrl);
      if (res.status !== 200) {
        pageErrors.push({ url: siteUrl, status: res.status });
      } else {
        pageOk++;
        pageHtml = res.body;
      }
    } catch (err) {
      pageErrors.push({ url: siteUrl, status: null, error: err.message });
    }

    for (const scheme of pageHtml ? extractUnsafeSchemes(pageHtml) : []) {
      schemeErrors.push({ url: siteUrl, scheme });
    }

    // Check assets found in page HTML
    if (pageHtml) {
      const assets = extractLocalAssets(pageHtml, localUrl);
      for (const asset of assets) {
        if (assetCache.has(asset)) continue; // already checked

        let status = null;
        try {
          const res = await fetch(`${SITE_ORIGIN}${asset}`);
          status = res.status;
        } catch (err) {
          assetCache.set(asset, 'error');
          assetErrors.push({ asset, foundOn: siteUrl, status: null, error: err.message });
          continue;
        }

        assetCache.set(asset, status);
        if (status !== 200) {
          assetErrors.push({ asset, foundOn: siteUrl, status });
        }
      }
    }
  }

  // Clear progress line
  process.stdout.write('\r' + ' '.repeat(80) + '\r');

  // ── Report ─────────────────────────────────────────────────────────────────
  const staticTotal = sitemapUrls.length - ssrPages.length;
  const totalAssets = assetCache.size;
  const assetOk = totalAssets - assetErrors.length;

  console.log('  ┌─────────────────────────────────────────────┐');
  console.log(`  │  Pages   ${String(pageOk).padStart(4)}/${String(staticTotal).padEnd(4)} ok   ${pageErrors.length > 0 ? c.red(`${pageErrors.length} failed`) : c.green('all passed')}           │`);
  console.log(`  │  Assets  ${String(assetOk).padStart(4)}/${String(totalAssets).padEnd(4)} ok   ${assetErrors.length > 0 ? c.red(`${assetErrors.length} failed`) : c.green('all passed')}           │`);
  console.log(`  │  Links   ${schemeErrors.length > 0 ? c.red(`${String(schemeErrors.length).padStart(4)} unsafe scheme(s)`) : c.green('   0 unsafe schemes   ')}          │`);
  if (ssrPages.length > 0)
    console.log(`  │  SSR     ${String(ssrPages.length).padStart(4)} pages skipped (no static HTML)      │`);
  console.log('  └─────────────────────────────────────────────┘\n');

  if (pageErrors.length > 0) {
    console.log(c.red(c.bold('  Broken pages:')));
    for (const { url, status, error } of pageErrors) {
      const tag = status ? c.red(`HTTP ${status}`) : c.yellow('ERROR');
      console.log(`    ${tag}  ${url}${error ? `  — ${error}` : ''}`);
    }
    console.log();
  }

  if (schemeErrors.length > 0) {
    console.log(c.red(c.bold('  Unsafe URL schemes:')));
    for (const { url, scheme } of schemeErrors) {
      console.log(`    ${c.red(scheme + ':')}  ${url}`);
    }
    console.log();
  }

  if (assetErrors.length > 0) {
    console.log(c.red(c.bold('  Broken assets:')));
    for (const { asset, foundOn, status, error } of assetErrors) {
      const tag = status ? c.red(`HTTP ${status}`) : c.yellow('ERROR');
      console.log(`    ${tag}  ${asset}`);
      console.log(c.dim(`          found on: ${foundOn}${error ? `  (${error})` : ''}`));
    }
    console.log();
  }

  server.close();

  const failed = pageErrors.length + assetErrors.length + schemeErrors.length;
  if (failed > 0) {
    console.log(c.red(c.bold(`  ${failed} issue(s) found. Fix before deploying.\n`)));
    process.exit(1);
  } else {
    console.log(c.green(c.bold('  All pages and assets OK.\n')));
  }
}

main().catch((err) => {
  console.error(c.red('\nUnexpected error:'), err);
  process.exit(1);
});
