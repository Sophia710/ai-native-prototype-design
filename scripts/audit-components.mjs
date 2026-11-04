#!/usr/bin/env node
/**
 * audit-components.mjs — 组件结构与图标门禁（P12-3，零依赖）
 *
 * 对每个目标 HTML：
 *   1. --require_components a,b,c 中每个 id 必须存在 data-component="<id>" 根；
 *   2. 原生交互控件（button/input/select/textarea/a）挂 data-component 时必须带 ds-* 类
 *      （禁止裸原生控件冒充规范组件；行为型组件允许挂在普通 div 上）；
 *   3. 含组件规范块（<script type="application/json" data-component-spec>）的页面：
 *      JSON 合法、spec.id 在页面有根、anatomy 首条声明的 .ds-* 主类在标记中存在；
 *   4. 每个 svg.ds-icon 必须带 viewBox="0 0 24 24"，width/height 均 ∈ {12,16,18,20,24}；
 *   5. <use href="#i-x"> 必须命中页内已内联的 symbol/元素 id，且只用页内引用；
 *   6. 纯图标按钮（button.ds-icon-btn 无文本）必须有 aria-label。
 *
 * 用法：
 *   node scripts/audit-components.mjs [--require-components file-tree,artifact-panel] [文件或目录 ...]
 */
import {
  parseArgs, collectHtml, readUtf8, Report, lineAt, domOnly
} from './_lib.mjs';

const { flags, positionals } = parseArgs(process.argv.slice(2), {
  arrayKeys: ['require-components']
});
const required = flags['require-components'] || [];
const files = collectHtml(positionals);
const R = new Report('components');

const ICON_SIZES = new Set([12, 16, 18, 20, 24]);
const SPEC_RE = /<script\b[^>]*type="application\/json"[^>]*data-component-spec[^>]*>([\s\S]*?)<\/script>/gi;
const DC_RE = /<([a-z][a-z0-9-]*)\b([^>]*\bdata-component\s*=\s*"([^"]*)"[^>]*)>/gi;
const ALL_DC_RE = /data-component\s*=\s*"([^"]+)"/g;
const SVG_RE = /<svg\b([^>]*)>/gi;
const USE_RE = /<use\b[^>]*\bhref\s*=\s*"([^"]+)"[^>]*>/gi;
const ID_RE = /\sid\s*=\s*"([^"]+)"/g;
const ICONBTN_RE = /<button\b([^>]*\bclass\s*=\s*"[^"]*\bds-icon-btn\b[^"]*"[^>]*)>([\s\S]*?)<\/button>/gi;
const SPEC_CLASS_RE = /\.(ds-[a-z0-9-]+)/;

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i'));
  return m ? m[1] : null;
}

function idsOf(html) {
  const set = new Set();
  let m;
  ID_RE.lastIndex = 0;
  while ((m = ID_RE.exec(html))) set.add(m[1]);
  return set;
}

function stripTags(s) {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, '').trim();
}

function auditFile(file) {
  const html = readUtf8(file);
  // DOM 检查一律在剔除注释与 <script> 后的文本上进行，
  // 避免 sprite 说明注释、JS 模板字符串里的 <svg>/<use> 片段误报。
  const dom = domOnly(html);
  let bad = 0;
  const fail = (line, msg) => { R.fail(file, line, msg); bad++; };

  /* 1. 必需组件根 */
  for (const id of required) {
    const re = new RegExp(`data-component\\s*=\\s*"${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`);
    if (!re.test(dom)) fail(0, `缺少必需组件根 data-component="${id}"`);
  }

  /* 2. 原生交互控件挂名必须带 ds-* 类；顺便收集全部 data-component 值 */
  const NATIVE_HOOK_TAGS = new Set(['button', 'input', 'select', 'textarea', 'a']);
  const roots = new Set();
  let m;
  DC_RE.lastIndex = 0;
  while ((m = DC_RE.exec(dom))) {
    const tagName = m[1];
    const tagInner = m[2];
    const id = m[3];
    roots.add(id);
    const cls = attr(tagInner, 'class') || '';
    if (NATIVE_HOOK_TAGS.has(tagName) && !/\bds-/.test(cls)) {
      fail(lineAt(dom, m.index), `<${tagName}> 挂 data-component="${id}" 必须带 ds-* 规范类（原生控件不得冒充规范组件）`);
    }
  }

  /* 3. 规范块结构（块本身在原文上解析） */
  SPEC_RE.lastIndex = 0;
  let sm;
  while ((sm = SPEC_RE.exec(html))) {
    const line = lineAt(html, sm.index);
    let spec;
    try { spec = JSON.parse(sm[1]); } catch (e) { fail(line, '组件规范 JSON 非法: ' + e.message); continue; }
    if (!spec.id) fail(line, '规范缺少 id');
    else if (!roots.has(spec.id)) fail(line, `规范 id="${spec.id}" 在页面无 data-component 根`);
    if (!Array.isArray(spec.anatomy) || !spec.anatomy.length) {
      fail(line, '规范 anatomy 必须是非空数组');
    } else {
      const cm = String(spec.anatomy[0]).match(SPEC_CLASS_RE);
      if (cm && !dom.includes(cm[1])) fail(line, `anatomy 首条主类 ${cm[1]} 未在页面标记中出现`);
    }
  }

  /* 4. svg.ds-icon 规范 */
  SVG_RE.lastIndex = 0;
  let vm;
  while ((vm = SVG_RE.exec(dom))) {
    const tagInner = vm[1];
    const cls = attr(tagInner, 'class') || '';
    if (!/\bds-icon\b/.test(cls)) continue;
    const line = lineAt(dom, vm.index);
    if ((attr(tagInner, 'viewbox') || '') !== '0 0 24 24') {
      fail(line, 'svg.ds-icon 必须带 viewBox="0 0 24 24"');
    }
    for (const dim of ['width', 'height']) {
      const v = attr(tagInner, dim);
      const n = v == null ? NaN : Number(v);
      if (!ICON_SIZES.has(n)) fail(line, `svg.ds-icon ${dim} 必须 ∈ {12,16,18,20,24}（实际 ${v ?? '缺失'}）`);
    }
  }

  /* 5. <use href="#i-…"> 必须命中内联 symbol/元素 */
  const pageIds = idsOf(dom);
  USE_RE.lastIndex = 0;
  let um;
  while ((um = USE_RE.exec(dom))) {
    const href = um[1];
    if (!href.startsWith('#i-')) { fail(lineAt(dom, um.index), `<use> 只允许页内 sprite 引用 #i-*（实际 ${href}）`); continue; }
    if (!pageIds.has(href.slice(1))) fail(lineAt(dom, um.index), `<use href="${href}"> 在内联 sprite 中找不到对应 symbol`);
  }

  /* 6. 纯图标按钮可访问名 */
  ICONBTN_RE.lastIndex = 0;
  let bm;
  while ((bm = ICONBTN_RE.exec(dom))) {
    const tagInner = bm[1];
    const text = stripTags(bm[2]);
    const aria = attr(tagInner, 'aria-label') || attr(tagInner, 'title');
    if (!text && !aria) fail(lineAt(dom, bm.index), '纯图标 .ds-icon-btn 缺少 aria-label');
  }

  if (!bad) R.ok(file);
}

if (!files.length) { console.error('未找到任何 .html 文件'); process.exit(1); }
R.files = files.length;
for (const f of files) {
  try { auditFile(f); } catch (e) { R.fail(f, 0, '审计异常: ' + e.message); }
}
R.done();
