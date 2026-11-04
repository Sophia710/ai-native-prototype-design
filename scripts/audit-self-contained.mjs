#!/usr/bin/env node
/**
 * audit-self-contained.mjs — 单 HTML 自包含门禁（P12-1，零依赖）
 *
 * 检查每个目标 HTML：
 *   1. 以 <!doctype html> 开头；
 *   2. 无任何外部资源引用：http(s):// 与协议相对 // 的 src/href/poster/srcset，
 *      CSS url()/@import，外部字体（@font-face 的非 data: src），CDN 域名；
 *      允许：页内锚点（#…）、data: URI、相对路径、xmlns 命名空间声明；
 *   3. id 属性无重复。
 *
 * 用法：
 *   node scripts/audit-self-contained.mjs [文件或目录 ...]
 * 无参数时默认审 modules/ 下全部 HTML。退出码 0 全绿 / 1 有问题。
 */
import {
  parseArgs, collectHtml, readUtf8, Report,
  extractStyleBlocks, extractInlineStyles, lineAt
} from './_lib.mjs';

const { positionals } = parseArgs(process.argv.slice(2));
const files = collectHtml(positionals);
const R = new Report('self-contained');

const TAG_RE = /<(?:script|link|img|iframe|audio|video|source|input|image|use|a|form|object|embed|font)\b([^>]*)>/gi;
const ATTR_RE = /(?:^|\s)(xlink:href|href|src|poster|srcset|data)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const ID_RE = /\sid\s*=\s*"([^"]+)"/g;
const URL_RE = /url\(\s*(?:'([^']*)'|"([^"]*)"|([^)'"]*))\s*\)/gi;
const IMPORT_RE = /@import\s+(?:url\()?\s*['"]([^'"]+)['"]/gi;
const FONTFACE_RE = /@font-face\s*\{([^{}]*\{[^{}]*\}[^{}]*|[^{}]*)}/gi;

const CDN_HOSTS = ['cdn.', 'unpkg.com', 'jsdelivr.net', 'googleapis.com', 'gstatic.com',
  'cdnjs.', 'bootcdn', 'fonts.', 'httpstatic', 'aliyuncs.com'];

function isExternal(u) {
  if (!u) return false;
  const v = u.trim();
  if (/^https?:\/\//i.test(v) || v.startsWith('//')) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v) && !/^(data|tel|mailto|javascript|#)/i.test(v)) return true;
  return false;
}

function cdnHit(v) {
  const low = v.toLowerCase();
  return CDN_HOSTS.some((h) => low.includes(h));
}

function tagAttrs(tagInner) {
  const out = [];
  let m;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(tagInner))) {
    const name = m[1].toLowerCase();
    if (name.startsWith('xmlns')) continue;
    out.push({ name, value: m[3] ?? m[4] ?? m[5] ?? '' });
  }
  return out;
}

function auditFile(file) {
  const html = readUtf8(file);
  let bad = 0;
  const fail = (line, msg) => { R.fail(file, line, msg); bad++; };

  if (!/^\s*<!doctype html>/i.test(html)) fail(1, '缺少 <!doctype html>');

  /* ---- 标签属性外部引用 ---- */
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(html))) {
    const line = lineAt(html, m.index);
    for (const a of tagAttrs(m[1])) {
      const values = a.name === 'srcset'
        ? a.value.split(',').map((s) => s.trim().split(/\s+/)[0])
        : [a.value];
      for (const v of values) {
        if (!v || v.startsWith('#')) continue;
        if (isExternal(v)) fail(line, `外部资源 ${a.name}="${v}"`);
        if (cdnHit(v)) fail(line, `CDN 域名引用 ${a.name}="${v}"`);
      }
    }
  }

  /* ---- <style> 与内联 style 中的 CSS 引用 ---- */
  const cssBlocks = [
    ...extractStyleBlocks(html).map((b) => ({ ...b, where: '<style>' })),
    ...extractInlineStyles(html).map((b) => ({ ...b, where: 'style=""' }))
  ];
  for (const b of cssBlocks) {
    URL_RE.lastIndex = 0;
    let u;
    while ((u = URL_RE.exec(b.text))) {
      const v = (u[1] || u[2] || u[3] || '').trim();
      if (!v || v.startsWith('#') || v.startsWith('data:')) continue;
      fail(b.line + lineAt(b.text, u.index) - 1, `CSS url() 非内联资源：${v}`);
    }
    IMPORT_RE.lastIndex = 0;
    let im;
    while ((im = IMPORT_RE.exec(b.text))) {
      const v = im[1].trim();
      if (v.startsWith('data:')) continue;
      fail(b.line + lineAt(b.text, im.index) - 1, `禁止 @import：${v}`);
    }
    FONTFACE_RE.lastIndex = 0;
    let ff;
    while ((ff = FONTFACE_RE.exec(b.text))) {
      const body = ff[1];
      URL_RE.lastIndex = 0;
      let su;
      while ((su = URL_RE.exec(body))) {
        const v = (su[1] || su[2] || su[3] || '').trim();
        if (v.startsWith('data:')) continue;
        fail(b.line + lineAt(b.text, ff.index) - 1, `外部字体 @font-face src：${v}`);
      }
    }
  }

  /* ---- 重复 id ---- */
  const seen = new Map();
  ID_RE.lastIndex = 0;
  let im2;
  while ((im2 = ID_RE.exec(html))) {
    const id = im2[1];
    if (seen.has(id)) {
      fail(lineAt(html, im2.index), `重复 id="${id}"（首次出现于第 ${seen.get(id)} 行）`);
    } else {
      seen.set(id, lineAt(html, im2.index));
    }
  }

  if (!bad) R.ok(file);
}

if (!files.length) {
  console.error('未找到任何 .html 文件');
  process.exit(1);
}
R.files = files.length;
for (const f of files) {
  try { auditFile(f); } catch (e) { R.fail(f, 0, '审计异常: ' + e.message); }
}
R.done();
