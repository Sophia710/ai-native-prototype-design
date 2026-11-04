/**
 * 四个门禁脚本的共享工具（零依赖，Node ESM）。
 * 不属于独立门禁，不单独运行。
 *
 * 约定：
 * - 所有脚本既可审交付包默认目录（modules/**\/*.html），也可审显式传入的文件/目录；
 * - 输出风格与 .tmp/m2/check.mjs 一致：ok/FAIL + 相对路径 + 行号；
 * - 发现问题 process.exit(1)，全绿 exit(0)。
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MODULES_DIR = join(PKG_ROOT, 'modules');
export const TOKENS_CSS = join(PKG_ROOT, 'tokens', 'tokens.css');
export const SLOTS_REGISTRY = join(MODULES_DIR, 'chat-workbench', 'content-slots.json');

/* ---------------- CLI 参数 ---------------- */

/**
 * 解析 argv：
 *   --flag            -> flags.flag = true
 *   --key value       -> flags.key = 'value'（布尔键之外取下一个非 -- 项）
 *   --require-components a,b,c 按逗号拆数组
 *   其余为位置参数
 * @param {string[]} argv process.argv.slice(2)
 * @param {{stringKeys?: string[], arrayKeys?: string[]}} opts
 */
export function parseArgs(argv, opts = {}) {
  const stringKeys = new Set(opts.stringKeys || []);
  const arrayKeys = new Set(opts.arrayKeys || []);
  const flags = {};
  const positionals = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { positionals.push(a); continue; }
    const key = a.slice(2);
    if (arrayKeys.has(key)) {
      const v = argv[++i] || '';
      flags[key] = v.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (stringKeys.has(key)) {
      flags[key] = argv[++i] || '';
    } else {
      flags[key] = true;
    }
  }
  return { flags, positionals };
}

/* ---------------- 文件收集 ---------------- */

/** 递归收集 .html 文件；位置参数为空时默认审 modules/ 全量 */
export function collectHtml(positionals) {
  const roots = positionals.length
    ? positionals.map((p) => resolve(process.cwd(), p))
    : [MODULES_DIR];
  const out = [];
  const walk = (p) => {
    const st = statSync(p);
    if (st.isDirectory()) {
      for (const name of readdirSync(p)) {
        if (name.startsWith('.')) continue;
        walk(join(p, name));
      }
    } else if (st.isFile() && extname(p).toLowerCase() === '.html') {
      out.push(p);
    }
  };
  for (const r of roots) {
    if (!existsSync(r)) { throw new Error('路径不存在: ' + r); }
    walk(r);
  }
  return out.sort();
}

export function readUtf8(p) { return readFileSync(p, 'utf8'); }

export function rel(p) {
  const r = relative(PKG_ROOT, p);
  return r.startsWith('..') ? p : r;
}

/* ---------------- 结果收集 ---------------- */

export class Report {
  constructor(ruleName) {
    this.ruleName = ruleName;
    this.problems = 0;
    this.files = 0;
  }
  fail(file, line, msg) {
    this.problems++;
    const where = line ? `${rel(file)}:${line}` : rel(file);
    console.error(`FAIL ${where} ${msg}`);
  }
  ok(file, extra = '') {
    console.log(`ok   ${rel(file)}${extra ? ' ' + extra : ''}`);
  }
  done() {
    console.log(`\n${this.ruleName}: ${this.files} 个文件，${this.problems} 个问题`);
    if (this.problems) process.exit(1);
  }
}

/* ---------------- HTML/CSS 解析 ---------------- */

/** 计算字符偏移所在行号（1 起） */
export function lineAt(text, idx) {
  let line = 1;
  for (let i = 0; i < idx && i < text.length; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

/**
 * 抽出全部 <style> 文本块。
 * @returns {{text:string,line:number}[]}
 */
export function extractStyleBlocks(html) {
  const blocks = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html))) {
    blocks.push({ text: m[1], line: lineAt(html, m.index) + m[0].indexOf(m[1]) });
  }
  return blocks;
}

/** 抽出全部内联 style="..." 属性值（选择器记为 [inline]） */
export function extractInlineStyles(html) {
  const out = [];
  const re = /\sstyle\s*=\s*"([^"]*)"/gi;
  let m;
  while ((m = re.exec(html))) {
    out.push({ text: m[1], line: lineAt(html, m.index), tagIndex: m.index });
  }
  return out;
}

/**
 * 挖掉内联的 tokens.css 权威块，返回与原文等长（保留换行）的遮罩文本，
 * 使行号不漂移。先按整文件精确匹配（build 内联的是 tokens.trim()），
 * 失败则退化到逐变量定义行遮罩。
 */
export function maskAuthority(html, tokensText) {
  let masked = html;
  const hit = masked.indexOf(tokensText.trim());
  if (hit >= 0) {
    masked = masked.slice(0, hit) + blank(masked.slice(hit, hit + tokensText.trim().length)) + masked.slice(hit + tokensText.trim().length);
  } else {
    masked = masked.replace(/^[ \t]*--ds-[^;{}]+;?/gm, (s) => ' '.repeat(s.length));
  }
  return masked;
}

function blank(s) {
  return s.replace(/[^\n]/g, ' ');
}

/** 去掉 CSS 注释（保留换行与行号） */
export function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/** 遮罩 HTML 注释（保留换行与行号） */
export function maskHtmlComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, (m) => blank(m));
}

/** 遮罩全部 <script>…</script>（JS 模板字符串不是真实 DOM） */
export function maskScripts(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => blank(m));
}

/**
 * DOM 检查用文本：剔除注释与 <script>，行号保持不变。
 * 规范 JSON 块（data-component-spec）因此一并被遮罩——需要它请对原文单独匹配。
 */
export function domOnly(html) {
  return maskScripts(maskHtmlComments(html));
}

const DECL_RE = /([a-z-]+)\s*:\s*([^;{}:]+?)\s*(?=[;}])/g;

/**
 * 从 CSS 文本提取声明（粗解析，够用且零依赖）。
 * 选择器伪类（:hover）因值后必须紧跟 ; 或 } 不会被误判。
 * @returns {{prop:string,value:string,line:number}[]}
 */
export function parseDeclarations(cssText, baseLine = 1) {
  const decls = [];
  let m;
  /* 末尾补 ; 使内联 style 中最后一条声明也能被识别（lookahead 要求 ; 或 }） */
  const src = cssText + ';';
  DECL_RE.lastIndex = 0;
  while ((m = DECL_RE.exec(src))) {
    const prop = m[1].trim();
    if (prop.length < 2 || prop === 'content') continue;
    decls.push({ prop, value: m[2].trim(), line: baseLine + lineAt(cssText, m.index) - 1 });
  }
  return decls;
}

/** 取某 CSS 值里的全部 Npx 数字（含小数；含负号） */
export function pxLiterals(value) {
  const out = [];
  const re = /(-?\d+(?:\.\d+)?)px/gi;
  let m;
  while ((m = re.exec(value))) out.push(Number(m[1]));
  return out;
}

/** 读 tokens.css 原文（失败抛错由调用方决定） */
export function readTokens() {
  return readUtf8(TOKENS_CSS);
}
