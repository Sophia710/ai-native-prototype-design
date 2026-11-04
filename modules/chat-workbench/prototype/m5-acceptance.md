# M5（P13–P14）验收记录 · chat-workbench 单文件原型

- 验收对象：`modules/chat-workbench/prototype/ai-workbench.html`（249,052 字符，自包含单文件，0 槽位，断网可交互）
- 验收日期：2026-10-13
- 验收依据：设计文档第 10 节（6 段演示脚本）、第 11 节（四视口×双主题 / 无双重滚动 / 浮层焦点与背景不错位 / 触控 ≥44px / 流式无跳动 / console 0 错误 / 0 外部请求 / 同需求独立生成 3 次比对）
- 结论：**通过**。CDP 自动化断言 225/225 全绿；四门禁 0 问题；组件 harness 993/993；稳定性三版差异 0。

## 1. 验收方法

- headless Microsoft Edge 155.0.4283.45 + Chrome DevTools Protocol；视口用 `Emulation.setDeviceMetricsOverride` 精确设置（内置浏览器固定 989×653/dpr1.5，不可用于本验收）。
- 零依赖驱动（Node 24 内置 WebSocket/fetch + 本地静态服务），均在开发临时目录、不随 Skill 包分发：
  - `.tmp/m2/cdp/accept.mjs`：8 场景主流程 + 8 组视口×主题矩阵，机器结果 `.tmp/m2/cdp/accept-result.json`；
  - `.tmp/m2/cdp/stability.mjs` + `.tmp/m2/stability-build.mjs`：稳定性变体构建与比对，结果 `.tmp/m2/cdp/stability-result.json`；
  - `.tmp/m2/cdp/run-harness.mjs`：组件 harness 回归，结果 `.tmp/m2/cdp/harness-result.json`。
- 截图证据 22 张：随包存放于本目录 `m5-shots/`（与 `.tmp/m2/cdp/shots/` 同名同字节）。
- 复现命令（工作区根；脚本自建 127.0.0.1:50963 静态服务并自行拉起/关闭 Edge）：
  - `node .tmp/m2/build-prototype.mjs`（改组件源后必须先重建交付 HTML，禁止手改交付文件）
  - `node .tmp/m2/cdp/accept.mjs`
  - `node .tmp/m2/stability-build.mjs` 后 `node .tmp/m2/cdp/stability.mjs`
  - `node .tmp/m2/cdp/run-harness.mjs`

## 2. 主流程断言（设计文档第 10 节脚本，共 110 项 + 全局质量 3 项）

| 场景 | 断言数 | 结果 |
| --- | --- | --- |
| S1 初始欢迎态（三栏、欢迎卡、推荐卡组、建议词、滚动链） | 17 | ✔ |
| S2 流式回放（思考卡折叠、4 步时序、md/code/cites/cards 顺序、终态控件复位） | 24 | ✔ |
| S3 产物面板（md/docx 卡片、页签、launcher 单例、文档/代码/网页视图切换、开文件树） | 21 | ✔ |
| S4 左栏历史树（单击 220ms 延迟打开、recent/项目树） | 12 | ✔ |
| S5 输入区（发送禁用态、@提及、加号一/二级菜单键盘与互斥、浮层开关前后背景不错位、附件选择与移除、模型切换） | 20 | ✔ |
| S6 中断（400ms 停=思考已停止；1700ms 停=steps `done,waiting,waiting,waiting`） | 7 | ✔ |
| S7 拖拽调宽（480→576、钳制 320–720、中栏 ≥360、aria-valuenow 与宽度写盘、Home 回 320） | 6 | ✔ |
| X 全局质量：console 0 错误 / 0 外部网络请求（8 场景全程） | 3 | ✔ |

## 3. 视口×主题矩阵（设计文档第 11 节，每单元 13–14 项，共 115 项）

4 视口 × 浅/深主题逐组通过：视口精确、无横滚、无整页纵滚（bodyH=视口高）、三滚动链均 auto、右宽钳制、中栏 ≥360、composer 与推荐卡组不越界、工作态无横滚、产物 doc 视图可见（avW≥200，1280 开文件树后仍 ≥180）、主题属性与底色令牌正确。工作态实测几何：

| 视口 | 中栏 | 右栏 | 输入框宽 | 产物视图宽 | 浅底 / 深底 |
| --- | --- | --- | --- | --- | --- |
| 1920×1080 | 1180 | 480 | 702 | 478 | rgb(255,255,255) / rgb(26,26,26) |
| 1440×900 | 700 | 480 | 642 | 478 | 同上 |
| 1366×768 | 626 | 480 | 568 | 478 | 同上 |
| 1280×720 | 540 | 480 | 482 | 478 | 同上（另验文件树展开无横滚） |

每单元 2 张截图（welcome/work），共 16 张，见 `m5-shots/m5-{视口}-{主题}-{态}.png`；另 6 张场景截图：s1-welcome、s2a-thinking、s2b-completed、s3a-artifact-md、s3b-tree-open、s7-resize-320。图标钮触控命中区统一经 `::before{min-width/height:44px}` 满足 ≥44px。

## 4. 本轮发现并修复的真实缺陷（均改组件源后重建交付 HTML）

1. **移除附件后发送态不同步**（`src/composer/component.js`）：attachment-chip 移除时派发冒泡 `attach:remove`，composer 未监听，导致删完唯一附件后空文本的发送按钮仍可点。补充 `row.addEventListener('attach:remove', syncSend)`。
2. **加号二级菜单 ←/Esc 键盘返回后面板被立即重开**：`opener.focus()` 触发的 focusin 立刻重新 placeSub。引入模块变量 `suppressSubOpenUntil`，键盘返回前置 200ms 抑制窗（pointerenter 路径不抑制，鼠标行为不变）。同一缺陷在两个 starter 的**独立内联 composer 副本**中同样存在，已同步修复（`src/starter/starter.html`、`src/starter/conversation-starter.html`），harness 中 starter/conv/composer 三条键盘回归全部转绿。
3. **右栏拖拽在合成事件下失效**（`src/workbench-shell/component.js`）：pointer capture 在 headless 合成 pointermove/up 下不重定向 target，move/up 监听挂在手柄上会丢失。重构为拖拽期在 window 上挂监听、结束时摘除并 releasePointerCapture；真实浏览器行为不变，S7 拖拽断言转绿。
4. **favicon 404**：装配页 `<head>` 增加 `<link rel="icon" href="data:,">`，消除唯一的 console error/网络 404。
5. **启动页搜索框聚焦灰环（M5 终验后补丁，2026-10-13）**：右栏「新标签页」启动器的输入框聚焦时命中 tokens.css 全局 `:focus-visible { box-shadow: var(--ds-focus-ring) }`（`0 0 0 2px rgba(31,31,31,.35)`），在输入框上呈现一圈灰色边框。按 CP-1 同模式补组件级规则 `.ds-launch-row__field:focus(:focus-visible){outline:none;box-shadow:none}`（外层胶囊 1px 常驻边框保留）；组件源与两个 starter 的 t- 前缀独立副本三处同步。harness 新增 3 条聚焦无环断言（panel/starter/conv），总数 990→993。

测试侧一处等价修正（非组件缺陷）：Chromium 155 对 `outline: none` 的 `getComputedStyle().outlineWidth` 计算值返回 `3px`（used value 仍为 0、outlineStyle 为 none，无可见焦点环，合同语义满足）。harness「聚焦外框不变色不套 ring」断言由 `outlineWidth==='0px'` 改为语义等价的 `outlineStyle==='none'`；边框色不变与 `box-shadow:none` 两条子断言不变。

## 5. 稳定性：同需求独立生成 3 次比对（差异 0）

- main = 交付页核心区域；A（219,403 字符）= setTimeout 链编排、`<main>` 包裹；B（219,388 字符）= 单 interval 时间轴、`<article>` 包裹、CSS/JS 倒序合并。两变体均含全部 29 组件、仅装配中栏+输入区，位于 `.tmp/m2/stab/`（临时证据，不进包）。
- 1440×900 下三版终态逐项比对，`stability-result.json` 中 `compare.A_vs_B=[]`、`compare.main_vs_A=[]`，三版 console errors 均为 []：
  - 中栏宽均 700；composer 盒均 `{x:16,y:806,w:668,h:82}`；对话线程盒均 `{x:0,y:-7,w:685,h:813}`；
  - 流式步骤均 `done,done,done,done`；markdown/代码块/引用/产物卡 4 类渲染均出现；
  - 计算后 design tokens、DOM 根节点数量完全相等；槽位残留 0；外部请求 0。

## 6. 门禁与回归

| 检查 | 命令（包根 `ai-native-prototype-design/`） | 结果 |
| --- | --- | --- |
| 自包含 | `node scripts/audit-self-contained.mjs modules/chat-workbench/prototype/ai-workbench.html` | 0 问题 |
| Tokens | `node scripts/audit-tokens.mjs <同上>` | 0 问题 |
| 组件齐全 | `node scripts/audit-components.mjs --require-components <29 组件> <同上>` | 0 问题 |
| 无槽位 | `node scripts/audit-slots.mjs <同上>` | 0 问题（无槽位残留） |
| 组件实物/starter 静态校验 | `node .tmp/m2/check.mjs` | 29 组件页 + 2 starter 全 ok |
| 组件行为 harness | `.tmp/m2/harness.html`（993 断言，31 套件） | **993/993 通过，0 失败** |

## 7. 遗留项

- AP-5（沿自 M4，非阻断、可选项）：产物页签关闭 x 视觉盒为 20px（`src/artifact-panel/component.css` 注释 AP-2），与部分条款建议的 24px 视觉存在可选差异；该控件为桌面鼠标态显露控件，所有验收场景均通过，维持现状并留待后续评审。
- 证据工程文件（accept/stability/harness 驱动、变体构建器、Edge profile、探针）全部位于 `.tmp/m2/`，不随 Skill 包分发；包内仅保留交付 HTML、22 张截图与本记录。
