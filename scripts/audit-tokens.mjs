#!/usr/bin/env node
/**
 * audit-tokens.mjs — 设计令牌门禁（P12-2，零依赖）
 *
 * 对内联 <style> 与元素 style="" 中的 CSS 声明做检查（自动挖掉内联 tokens.css
 * 权威块与 <script>/规范 JSON，行号不漂移）：
 *   1. 裸颜色：hex / rgb()/rgba()/hsl()/hsla() / CSS 命名色；
 *      允许 var(--ds-*)、color-mix(in srgb, var(…))、transparent、currentColor、
 *      inherit/initial/unset；
 *   2. 间距阶：padding、margin、gap 各属性的 px 字面值只允许 0 或 4/8/12/16/20/24/32；
 *   3. 圆角阶：border-radius* 的 px 字面值只允许 0/4/6/8/10/12/16/9999；
 *   4. 字重：只允许 400/500（normal 合法，bold/bolder/lighter/600+ 违规）；
 *   5. 字体栈：font-family 只允许 var(--ds-font-*) 或 inherit（禁硬编码字体栈）；
 *   6. accent/chart 蓝变量一律禁止（蓝色仅数据可视化；图表场景须走 --allow-chart）。
 *
 * 用法：
 *   node scripts/audit-tokens.mjs [--allow-chart] [文件或目录 ...]
 */
import {
  parseArgs, collectHtml, readUtf8, Report, readTokens,
  maskAuthority, extractStyleBlocks, extractInlineStyles,
  stripComments, parseDeclarations, pxLiterals
} from './_lib.mjs';

const { flags, positionals } = parseArgs(process.argv.slice(2));
const files = collectHtml(positionals);
const R = new Report('tokens');
const tokens = readTokens();

const SPACE = new Set([4, 8, 12, 16, 20, 24, 32]);
const RADIUS = new Set([4, 6, 8, 10, 12, 16, 9999]);
const SPACE_PROPS = new Set(['padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'gap', 'row-gap', 'column-gap']);
const RADIUS_PROPS = new Set(['border-radius', 'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-left-radius', 'border-bottom-right-radius']);
const ALLOWED_KEYWORDS = new Set(['transparent', 'currentcolor', 'inherit', 'initial', 'unset', 'revert',
  'none', 'auto', 'normal']);
/* CSS 命名色（常见全集；十六进制/函数颜色另行匹配） */
const NAMED_COLORS = new Set(`aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond
blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan
darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen
darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey
darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite
forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink
indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan
lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue
lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon
mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen
mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive
olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip
peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon
sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen
steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen`.split(/\s+/));

function hasRawColor(value) {
  if (/#[0-9a-fA-F]{3,8}\b/.test(value)) return 'hex 颜色';
  const fn = value.match(/\b(rgba?|hsla?)\s*\(/i);
  if (fn) return fn[1] + '() 颜色函数';
  for (const word of value.split(/[(),/\s]+/)) {
    const w = word.toLowerCase();
    if (NAMED_COLORS.has(w)) return '命名色 ' + word;
  }
  return null;
}

function auditFile(file) {
  const html0 = readUtf8(file);
  const html = maskAuthority(html0, tokens);
  let bad = 0;
  const fail = (line, msg) => { R.fail(file, line, msg); bad++; };

  const blocks = [
    ...extractStyleBlocks(html).map((b) => ({ ...b, where: '<style>' })),
    ...extractInlineStyles(html).map((b) => ({ ...b, where: 'style=""' }))
  ];

  for (const b of blocks) {
    const css = stripComments(b.text);
    for (const d of parseDeclarations(css, b.line)) {
      const loc = `${d.where || b.where} ${d.prop}`;

      const raw = hasRawColor(d.value);
      if (raw) fail(d.line, `裸颜色（${raw}）于 ${loc}: ${d.value}`);

      if (!flags['allow-chart'] && /--ds-(color-)?accent|--ds-chart-\d/.test(d.value)) {
        fail(d.line, `accent/图表蓝禁止用于 UI（数据可视化须 --allow-chart）于 ${loc}`);
      }

      if (SPACE_PROPS.has(d.prop)) {
        for (const n of pxLiterals(d.value)) {
          if (n !== 0 && !SPACE.has(Math.abs(n))) {
            fail(d.line, `间距越界（仅 0/4/8/12/16/20/24/32）于 ${loc}: ${d.value}`);
            break;
          }
        }
      }
      if (RADIUS_PROPS.has(d.prop)) {
        for (const n of pxLiterals(d.value)) {
          if (n !== 0 && !RADIUS.has(n)) {
            fail(d.line, `圆角越界（仅 0/4/6/8/10/12/16/9999）于 ${loc}: ${d.value}`);
            break;
          }
        }
      }
      if (d.prop === 'font-weight') {
        const v = d.value.toLowerCase();
        const ok = v === 'var(--ds-weight-regular)' || v === 'var(--ds-weight-medium)'
          || v === 'normal' || v === '400' || v === '500' || ALLOWED_KEYWORDS.has(v);
        if (!ok) fail(d.line, `字重越界（仅 400/500）于 font-weight: ${d.value}`);
      }
      if (d.prop === 'font-family') {
        const v = d.value.trim().toLowerCase();
        if (v !== 'inherit' && !/var\(--ds-font-(sans|mono|serif)\)/.test(v)) {
          fail(d.line, `硬编码字体栈（须用 var(--ds-font-*) 或 inherit）: ${d.value}`);
        }
      }
    }
  }
  if (!bad) R.ok(file);
}

if (!files.length) { console.error('未找到任何 .html 文件'); process.exit(1); }
R.files = files.length;
for (const f of files) {
  try { auditFile(f); } catch (e) { R.fail(f, 0, '审计异常: ' + e.message); }
}
R.done();
