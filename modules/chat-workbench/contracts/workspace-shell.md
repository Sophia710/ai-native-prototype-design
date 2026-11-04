# 页面合同：workspace-shell（工作台三栏壳层）

- 模块：chat-workbench
- 对应组件：`workbench-shell`、`icon-button`（展收/手柄命中区）
- 几何权威：`tokens/tokens.json` 的 layout 组（`--ds-left-*`、`--ds-right-*`、`--ds-center-min`、`--ds-touch-target`）
- 条款编号 `WS-n`，组件规范与其他合同引用本文件时使用该编号。

## 1. 区域职责图

```text
┌──────────────────────────────────────────────────────────────────────┐
│ sidebar（左栏 260）                  │ main（中栏，弹性，唯一主滚动）  │ right（右栏 480，可关闭）
│  brand-header                        │  conversation-header（吸顶）    │  artifact-tabs
│  new-actions / search / tool-nav     │  conversation-scroll（滚动容器）│  artifact-toolbar
│  history-tree（栏内独立滚动）         │  ── 消息流 / welcome-state ──   │  artifact-content
│  user-card                           │  composer（钉底，不随消息滚）   │   ├ document-preview
│                                      │                                  │   └ file-tree（内嵌最右）
└──────────────────────────────────────┴──────────────────────────────────┘
                      ↑ resize-handle（右栏与中栏之间，8px 命中条）
```

- **WS-1 滚动归属（硬规则）**：全页只有 3 个纵向滚动容器——`history-tree` 列表、中栏 `conversation-scroll`、右栏内容区（preview/tree 各自）。`body`、shell 根、各栏容器自身 `overflow: hidden`；禁止出现整页横向滚动与同一区域双重纵向滚动。
- **WS-2** composer 钉在中栏底部，不随消息流滚动；composer 高度增长只向上挤压消息区。
- **WS-3** 中栏 `conversation-header` 吸顶（sticky），背景用 `--ds-surface`，下方 1px `--ds-divider`。

## 2. 尺寸与展收规则

| 区域 | 默认 | 区间 | 折叠态 |
| --- | --- | --- | --- |
| 左栏 | `--ds-left-width` 260 | `--ds-left-min` 240 ~ `--ds-left-max` 320 | 0（整栏收起，**不保留 rail 窄条**；唯一展开入口为中栏 header 展收钮） |
| 中栏 | flex:1 | 内容宽 ≥ `--ds-center-min` 360 | 不可折叠 |
| 右栏 | `--ds-right-width` 480 | `--ds-right-min` 320 ~ `--ds-right-max` 720 | 0，中栏入口 icon-button panel-right-open |

- **WS-4** 左栏宽度不在本版可调（只展收）；右栏宽度可拖拽调。
- **WS-5** 展收动画只过渡几何属性 `width`（+ `--ds-t-slow` + `--ds-ease-out`）；内容显隐走零占位通道（容器 `overflow:hidden` 随宽度裁剪揭示，列表体 `display:none` 不占布局），几何与显隐不得挤在同一动画通道。`prefers-reduced-motion` 下瞬时完成。
- **WS-6** 折叠后再次展开必须恢复折叠前宽度。
- **WS-7 下限保护**：拖拽中实时保证 `视口宽 − 左栏宽 − 右栏宽 ≥ 360`；到达下限时右栏停止增宽（手柄可继续跟手但宽度钳制）。1280×720 + 左右栏全开（260+480=740，余 540 > 360）必须始终成立。

## 3. 拖拽规则（resize-handle）

- **WS-8** 手柄为中/右栏分界处 8px 宽透明命中条（内含 1px `--ds-divider` 静态分隔线，hover/拖动时命中条底色 `--ds-hover-fill`，光标 `col-resize`），命中高度 100%；不使用浏览器原生拖拽 API。
- **WS-9** 使用 Pointer Events：`pointerdown` 后 `setPointerCapture`；`pointermove` 只改右栏 CSS 变量像素宽（按视口右缘计算），不写布局；`pointerup/cancel` 落盘 localStorage。
- **WS-10 拖动期间**：`body` 加 `user-select:none`；给右栏内容容器加指针事件屏蔽类（`pointer-events:none`，覆盖 iframe/预览），防止 reflow 闪烁与子元素吞事件；光标保持 `col-resize`。
- **WS-11** 拖动只改宽度，不触发消息流/预览的业务重算；宽度提交（pointerup）后 document-preview 才做一次排版自适应（见 artifact-panel 合同 AP-7）。

## 4. 状态持久化

- **WS-12 键名（localStorage，统一前缀）**：
  - `ds.chat-workbench.sidebar.collapsed`（`"1"/"0"`）
  - `ds.chat-workbench.rightPanel.open`（`"1"/"0"`）
  - `ds.chat-workbench.rightPanel.width`（像素数字字符串，钳制回区间）
- **WS-13** 初始化顺序：读 storage → 钳制到合法区间 → 直接设置初始状态（首帧即最终态，不做开屏动画）。初始值优先级：**localStorage 记忆 > 宿主根节点 `data-left`/`data-right` 声明默认（`"closed"` 即收起，缺省视为打开）> token 默认**；右宽缺失回退 token 默认。示例：新建会话 starter 声明 `data-right="closed"`，无记忆时右栏保持关闭；历史对话 starter 声明 `data-right="open"`。
- **WS-14** 右栏在"无产物"时允许保持关闭；`artifact:open` 事件可强制打开（见 CS-8/AP-3）。

## 5. 键盘与焦点

- **WS-15** 展收按钮是真正的 `<button>`（icon-button 组件），带 `aria-label`（折叠左栏/展开左栏/关闭产物面板/打开产物面板）与 `aria-expanded`。**左栏展收按钮全应用唯一**，固定在中栏 header：同一按钮随 `aria-label`/`aria-expanded` 切换折叠与展开语义；左栏收起后不渲染 rail 容器或第二个展开按钮。
- **WS-15b 右栏展收按钮互斥**：右栏展开时只渲染右栏 header 内的关闭钮（中栏 header 的打开钮必须真正不显示）；右栏收起时只渲染中栏 header 的打开钮（右栏整体 width:0 裁剪，其内关闭钮不可见不可点）。实现约束：隐藏用 `hidden` 属性时，icon-button 基元必须自带 `.ds-icon-btn[hidden]{display:none}`——因为基元的作者样式 `display:inline-flex` 会压过浏览器内置 `[hidden]{display:none}`，只设 `hidden` 属性而不补 CSS 会导致两钮同时可见；两颗按钮的 `aria-expanded` 均随状态翻转。
- **WS-16** 手柄可聚焦：`role="separator" aria-orientation="vertical" tabindex="0"`；←/→ 以 16px（`--ds-space-4`）为步进调宽并钳制，Home/End 到最小/最大；键盘调整立即落盘。
- **WS-17** 面板展开后焦点不自动跳进面板；关闭面板后焦点回到触发关闭的按钮。

## 6. 联动事件

| 事件名 | 派发者 | 监听者 | 载荷 |
| --- | --- | --- | --- |
| `sidebar:toggle` | 左栏展收按钮 | workbench-shell | `{collapsed:boolean}` |
| `rightpanel:toggle` | 右栏开关 | workbench-shell / artifact-panel | `{open:boolean}` |
| `rightpanel:resize` | 手柄 | workbench-shell | `{width:number}`（pointerup 时） |
| `artifact:open` | artifact-card / 文件页签＋ | artifact-panel → shell | `{id:string, name:string, type:string}`，shell 负责保证右栏打开（WS-14） |

## 7. 禁用项

- **WS-X1** 禁止左栏可拖拽调宽（本版仅展收）。
- **WS-X2** 禁止面板使用 transform 位移制造"覆盖式抽屉"；面板必须参与 flex 布局并真正挤压中栏。
- **WS-X3** 禁止用动画库/JS 每帧驱动宽度；拖动中只允许改一个 CSS 像素值。
- **WS-X4** 禁止状态写入 cookie / sessionStorage / 后端；仅 localStorage 约定键名。
- **WS-X5** 禁止任何一栏出现整页滚动条；禁止 body 滚动。
- **WS-X6** 禁止左栏折叠后保留常驻 rail 窄条或任何第二展开入口；任何时刻只能看到一个左栏展收按钮。
- **WS-X7** 禁止右栏两颗展收按钮同时可见（WS-15b 互斥）；禁止用纯视觉遮盖（opacity/与底色相同）冒充隐藏，收起态隐藏钮必须不可点击（`display:none` 或随 width:0 裁剪）。
