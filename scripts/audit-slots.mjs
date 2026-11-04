#!/usr/bin/env node
/**
 * audit-slots.mjs — 槽位门禁（P12-4，零依赖）
 *
 * 两种模式：
 *   交付模式（默认）：成品 HTML 不得残留任何 __UPPER_SNAKE__ 槽位；
 *   模板模式（--template）：starter/组件实物允许且必须保留槽位，此时校验：
 *     - 禁止字面 __SLOT__ 占位；
 *     - 用到的槽位必须在 content-slots.json 登记（N/M 下标按数字通配匹配，
 *       如 __TOOL_1_NAME__ 命中登记名 __TOOL_N_NAME__）；
 *     - 登记为 required=true 的槽位必须出现——仅对整页模板（路径含 starters/）
 *       强制；组件实物页只承载本组件槽位，不做整页必填校验。必填项可用可选字段
 *       scaffolds 声明骨架适用域（如 ["workbench"]；空数组=不由整页骨架承载、
 *       运行时装配），缺省表示适用于全部整页骨架。
 *
 * 用法：
 *   node scripts/audit-slots.mjs [--template] [--registry path] [--no-registry] [文件或目录 ...]
 */
import {
  parseArgs, collectHtml, readUtf8, Report, SLOTS_REGISTRY
} from './_lib.mjs';

const { flags, positionals } = parseArgs(process.argv.slice(2), { stringKeys: ['registry'] });
const files = collectHtml(positionals);
const R = new Report('slots');
const SLOT_RE = /__([A-Z0-9_]+)__/g;

/** 登记名 -> 匹配正则（__TOOL_N_NAME__ -> /^__TOOL_\d+_NAME__$/） */
function slotPattern(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withDigits = escaped.replace(/_N_/g, '_\\d+_').replace(/_M_/g, '_\\d+_');
  return new RegExp('^' + withDigits + '$');
}

let registry = null;
if (!flags['no-registry']) {
  const path = flags.registry || SLOTS_REGISTRY;
  try {
    registry = JSON.parse(readUtf8(path));
  } catch (e) {
    console.error('FAIL 无法读取槽位登记 ' + path + ': ' + e.message + '（可用 --no-registry 跳过）');
    process.exit(1);
  }
}
const entries = registry ? registry.slots : [];
const exactNames = new Set(entries.map((s) => s.name));
const patterns = entries.map((s) => ({ re: slotPattern(s.name), spec: s }));

function isRegistered(token) {
  if (exactNames.has(token)) return true;
  return patterns.some((p) => p.re.test(token));
}
function requiredEntries() {
  return entries.filter((s) => s.required);
}

function auditDeliverable(file, html) {
  let bad = 0;
  const found = new Set();
  let m;
  SLOT_RE.lastIndex = 0;
  while ((m = SLOT_RE.exec(html))) found.add(m[0]);
  for (const t of [...found].sort()) {
    R.fail(file, 0, `交付物残留槽位 ${t}`);
    bad++;
  }
  if (!bad) R.ok(file, found.size ? '' : '（无槽位残留）');
}

function auditTemplate(file, html, { fullPage }) {
  let bad = 0;
  const fail = (msg) => { R.fail(file, 0, msg); bad++; };

  if (/__SLOT__/.test(html)) fail('模板残留字面 __SLOT__ 占位');

  const used = new Set();
  let m;
  SLOT_RE.lastIndex = 0;
  while ((m = SLOT_RE.exec(html))) used.add(m[0]);

  for (const t of [...used].sort()) {
    if (registry && !isRegistered(t)) fail(`使用了未登记槽位 ${t}`);
  }
  // 必填槽位是整页装配契约，只约束 starter 级整页模板。
  if (fullPage) {
    const km = file.replace(/\\/g, '/').match(/\/([^/]+?)-starter\.html$/i);
    const scaffold = km ? km[1] : null;
    for (const spec of requiredEntries()) {
      if (Array.isArray(spec.scaffolds)) {
        // 显式声明骨架适用域：名字无法识别时从严（必须显式命中）。
        if (scaffold && !spec.scaffolds.includes(scaffold)) continue;
      }
      if (used.has(spec.name)) continue;
      const hasIndexed = [...used].some((t) => slotPattern(spec.name).test(t));
      if (!hasIndexed) fail(`缺少必填槽位 ${spec.name}`);
    }
  }
  if (!bad) R.ok(file, `（${used.size} 个槽位，登记${fullPage ? '/必填' : ''}校验通过）`);
}

if (!files.length) { console.error('未找到任何 .html 文件'); process.exit(1); }
R.files = files.length;
for (const f of files) {
  const html = readUtf8(f);
  if (flags.template) {
    const norm = f.replace(/\\/g, '/');
    auditTemplate(f, html, { fullPage: norm.includes('/starters/') });
  } else {
    auditDeliverable(f, html);
  }
}
R.done();
