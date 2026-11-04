/**
 * fill-template.mjs —— 整页骨架填槽器（Skill 交付流程第 4 步，零依赖 Node ESM）
 *
 * 用法：
 *   node scripts/fill-template.mjs --manifest <manifest.json> \
 *     [--template interactive|workbench|conversation 或 starter 文件路径] \
 *     --out <交付文件.html> [--report <fill-map.json>]
 *
 * - 默认模板 modules/chat-workbench/starters/interactive-starter.html（全交互骨架，推荐默认）
 * - manifest 为扁平 JSON：{ "__SLOT__": "证据值" }，值也可用数组（按下标取模，适配 N 槽位）；
 *   下划线开头的键（如 _comment）忽略。
 * - 证据优先：先在 manifest 中按 原名 / 末位下标规范化（__TOOL_1_NAME__→__TOOL_N_NAME__）/
 *   全下标规范化（__PLUS_INTEGRATION_1_ITEM_1_NAME__→__PLUS_INTEGRATION_N_ITEM_N_NAME__）查找；
 *   manifest 未覆盖的槽位回退 content-slots.json 登记 example（同样按下标取模）。
 * - 槽位必须已登记；填充后零残留、JSON 数据岛（seed）仍可解析，否则 exit(1)。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SLOTS_REGISTRY, parseArgs } from './_lib.mjs';

const { flags } = parseArgs(process.argv.slice(2), {
  stringKeys: ['manifest', 'template', 'out', 'report']
});

function fail(msg) {
  console.error('FAIL ' + msg);
  process.exit(1);
}

if (!flags.manifest) fail('缺少 --manifest <manifest.json>');
if (!flags.out) fail('缺少 --out <交付文件.html>');

const here = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(here, '..');
const STARTER_DIR = join(PKG, 'modules', 'chat-workbench', 'starters');

function resolveTemplate(v) {
  if (!v || v === 'interactive') return join(STARTER_DIR, 'interactive-starter.html');
  if (existsSync(resolve(process.cwd(), v))) return resolve(process.cwd(), v);
  if (existsSync(v)) return resolve(v);
  const named = join(STARTER_DIR, v + '-starter.html');
  if (existsSync(named)) return named;
  fail('模板不存在：' + v);
}

const templatePath = resolveTemplate(flags.template);
const outPath = resolve(process.cwd(), flags.out);

const manifest = JSON.parse(readFileSync(resolve(process.cwd(), flags.manifest), 'utf8'));
const registry = JSON.parse(readFileSync(SLOTS_REGISTRY, 'utf8'));
const regByName = new Map(registry.slots.map((s) => [s.name, s]));
let html = readFileSync(templatePath, 'utf8');

/* 原名 → 末位下标规范化 → 全下标规范化 → 首维 N/末维 M（匹配 __PROJECT_N_CONVERSATION_M__ 类登记名） */
function canonicalForms(lit) {
  const runs = [...lit.matchAll(/\d+/g)];
  let mixed = lit;
  if (runs.length >= 2) {
    runs.forEach((r, i) => {
      mixed = mixed.replace(/\d+/, i === runs.length - 1 ? 'M' : 'N');
    });
  }
  return [lit, lit.replace(/(\d+)(\D*)$/, 'N$2'), lit.replace(/\d+/g, 'N'), mixed];
}
/* 多维下标按各维基数展开为扁平数组下标（同模式槽位的每维最大编号为基数，Horner 法） */
const patternDims = new Map();
for (const lit of new Set(html.match(/__[A-Z0-9_]+__/g) || [])) {
  const pat = lit.replace(/\d+/g, 'N');
  const digits = [...lit.matchAll(/\d+/g)].map((m) => parseInt(m[0], 10));
  if (!digits.length) continue;
  const prev = patternDims.get(pat) || digits.map(() => 0);
  patternDims.set(pat, digits.map((d, i) => Math.max(prev[i] || 0, d)));
}
function indexOf(lit) {
  const digits = [...lit.matchAll(/\d+/g)].map((m) => parseInt(m[0], 10));
  if (!digits.length) return 0;
  const dims = patternDims.get(lit.replace(/\d+/g, 'N'));
  let idx = 0;
  digits.forEach((d, i) => { idx = idx * (dims[i] || 1) + (d - 1); });
  return idx;
}
function pick(value, lit) {
  if (Array.isArray(value)) return String(value[indexOf(lit) % value.length]);
  return String(value);
}

const literals = Array.from(new Set(html.match(/__[A-Z0-9_]+__/g) || [])).sort();
const provenance = {};
const unresolved = [];
let evidenceCount = 0;
let exampleCount = 0;

/* 长度优先，避免前缀形态的潜在替换冲突 */
for (const lit of literals.sort((a, b) => b.length - a.length)) {
  const forms = canonicalForms(lit);
  const manifestKey = forms.find((k) => Object.prototype.hasOwnProperty.call(manifest, k)
    && typeof manifest[k] !== 'undefined' && !/^_[^_]/.test(k));
  let value;
  let source;
  if (manifestKey) {
    value = pick(manifest[manifestKey], lit);
    source = 'evidence';
    evidenceCount += 1;
  } else {
    const regKey = forms.find((k) => regByName.has(k));
    if (!regKey) {
      unresolved.push(lit);
      continue;
    }
    const ex = regByName.get(regKey).example;
    if (typeof ex === 'undefined') {
      unresolved.push(lit);
      continue;
    }
    value = pick(ex, lit);
    source = 'example';
    exampleCount += 1;
  }
  provenance[lit] = { source, via: source === 'evidence' ? manifestKey : canonicalForms(lit).find((k) => regByName.has(k)) };
  html = html.split(lit).join(value);
}

if (unresolved.length) {
  fail('以下槽位既未在 manifest 提供证据值，也没有登记 example：\n  ' + unresolved.join('\n  '));
}

const residual = Array.from(new Set(html.match(/__[A-Z0-9_]+__/g) || []));
if (residual.length) fail('填充后仍残留槽位：' + residual.join(', '));

/* JSON 数据岛（history/model/mention/demo seed）填充后必须仍可解析 */
const islandRe = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g;
let m;
let islands = 0;
while ((m = islandRe.exec(html)) !== null) {
  islands += 1;
  try {
    JSON.parse(m[1]);
  } catch (err) {
    fail('JSON 数据岛填充后无法解析（证据值含英文双引号/反斜杠/换行？）：' + err.message);
  }
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html, 'utf8');

const manifestSlotKeys = Object.keys(manifest).filter((k) => /^__[A-Z0-9_]+__$/.test(k));
const usedKeys = new Set(Object.values(provenance).map((p) => p.via));
const unused = manifestSlotKeys.filter((k) => !usedKeys.has(k));

const result = {
  ok: true,
  template: templatePath,
  manifest: resolve(process.cwd(), flags.manifest),
  out: outPath,
  distinctSlots: literals.length,
  evidenceSlots: evidenceCount,
  exampleSlots: exampleCount,
  jsonIslands: islands,
  unusedManifestKeys: unused,
  outputChars: html.length
};
console.log(JSON.stringify(result, null, 2));

if (flags.report) {
  writeFileSync(resolve(process.cwd(), flags.report),
    JSON.stringify({ result, provenance }, null, 2), 'utf8');
}
