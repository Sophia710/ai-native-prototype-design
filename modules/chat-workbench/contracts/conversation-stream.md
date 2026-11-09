# 页面合同：conversation-stream（中栏对话流）

- 模块：chat-workbench
- 对应组件（P8）：`conversation-header`、`welcome-state`、`message-bubble`、`thinking-block`、`step-timeline`、`markdown-body`、`code-block`、`citation-chip`、`artifact-card`、`message-actions`
- 内容容器：`conversation-scroll`（WS-1 定义的唯一中栏滚动容器）
- 条款编号 `CS-n`。

## 1. 区域职责图

```text
conversation-header（sticky）：← 折叠面板入口（左栏收起时显露）  __CONVERSATION_TITLE__   __TASK_DURATION__（右侧，条件显示）
conversation-scroll：
  空白态：welcome-state（__GREETING__ + 输入区 + 4× __SUGGESTED_PROMPT_N_TITLE__/__DESC__）
  有消息：按轮次纵向排列
    用户轮：message-bubble[user]（右对齐黑底白字，无头像）
    AI 轮（八区块，见 §2，按条件隐藏）
composer：钉底（WS-2），见 composer.md
```

- **CS-1** 中栏内容最大可读宽 760px、左右 auto 居中；短消息不强制拉伸，消息操作条与气泡右缘/正文左缘对齐。
- **CS-2** 轮次间距 `--ds-space-6`；AI 轮内部区块间距 `--ds-space-4`；区块出现/更新不得引起已渲染内容横向跳动。

## 2. AI 回复八区块顺序与进入时机

顺序固定（不需要的整块隐藏，不留空占位）：

1. **任务状态行**：位于 header 标题同一行右侧（`__TASK_DURATION__`）；
2. **thinking-block**：生成开始即出现"思考中…"；
3. **step-timeline**：首个工具步骤开始时出现；
4. **markdown-body**：首 token 到达出现；
5. **code-block**：正文中代码围栏位置（属于 markdown-body 内的区块化渲染，不脱离文档流顺序）；
6. **citation-chip**：正文产生引用编号处，行内/正文末分组；
7. **artifact-card**：产物元数据到达时，在正文之后；
8. **message-actions**：整轮完成后出现（生成中不显示）。

- **CS-3 简单问答判定**：无思考展示要求、无工具步骤、无产物时：隐藏任务状态行（header 右侧）与 thinking/step/artifact 区块，仅正文 + 操作条。判定以数据字段有无为准（`thinking`/`steps`/`artifacts` 全空即简单问答），不凭消息长短。
- **CS-4 thinking-block 三态**：
  - running："思考中…" + 三点动效（opacity 关键帧，`--ds-t-slow`，respect reduced-motion 时静态）；
  - collapsed（默认完成态）："已深度思考 N 秒 ›"（`__THINKING_DURATION__`），点击展开；
  - expanded：思考全文 + "收起"；同一轮只保留一个展开态。
- **CS-5 step-timeline 三态**：卡片容器（1px `--ds-border`、`--ds-radius-panel`、padding `--ds-space-4`、max-width 520），头部 = sparkles 图标 + 标题 `__STEP_GROUP_TITLE__` + 右侧自动计数（done/total，JS 按 `data-state` 统计并跟随变更）。步骤行 36px 高，21×21 圆点，非末行圆点间画 1px 纵向连接线：done = 深色实心圆 + 白 check；running = 5px 18% 深灰光晕 + 实心深点 + 脉冲动画（reduced-motion 静止）；waiting = 空心圆 `--ds-border`。每项：动作名 `__STEP_N_ACTION__`、工具名 `__STEP_N_TOOL__`（无工具不显示）、右侧小字（done = 耗时 `__STEP_N_DURATION__`，running = 「进行中」）；running 项可展开详情 `__STEP_N_DETAIL__`。
- **CS-6** 用户消息：黑底（`--ds-text-primary`）白字（`--ds-on-primary`）气泡，圆角 `--ds-radius-panel`，右对齐，最大宽 80%；AI 内容无容器、无灰气泡、无头像框，以 16px 无衬线正文直接成流。
- **CS-7 markdown-body**：只渲染 h3/h4、p、ul/ol、table、blockquote、inline-code、code-block、strong/em/a（原型 a 无 href 或 #）；数字 tabular-nums；表格用 `--ds-border` 横线；等宽字体仅 code/技术标识符。

## 3. 流式行为

- **CS-8** 新 token 追加时保持"贴底阅读"：若用户当前在底部阈值（距底 ≤80px）内，新内容自动滚到底；用户上滚后不强制下拉，header 或底部出现"新内容 ↓"提示（本版可用简单文字按钮）。
- **CS-9** 区块条件挂载/卸载用 opacity/translateY(4px) 进入动效（`--ds-t-fast` + `--ds-ease-out`）；禁止高度动画导致全文重排抖动。
- **CS-10** 生成中收到中断（composer 停止按钮派发 `generation:stop`）：保留已生成内容，未完成的 thinking/step 停在当前态并标"已停止"；操作条随后出现，"重新生成"可用。

## 4. 产物卡联动（artifact-card）

- **CS-11** 卡结构：类型图标（按 `__ARTIFACT_TYPE__` 映射 file-md/file-sheet/file-pdf/file-text/image/file）+ 名称 `__ARTIFACT_NAME__` + 固定元信息行 `__ARTIFACT_META__`（**格式 · 大小 · 创建时间**，`tabular-nums`，恒定不变）；整卡可点击（键盘 Enter），点击派发：
  `artifact:open {id, name, type}`（shell 负责打开右栏，WS-14；右栏行为见 AP-3）。
- **CS-12** 卡片视觉不随打开状态变化——不设"已打开"弱态、状态行不改写为动态文案；同一产物已在右栏打开时，点击=聚焦已有页签而非新增。

## 5. 操作条（message-actions）

- **CS-13** 操作条固定在每轮 AI 回答最末区块之下（左缘与正文对齐，CS-1）。项与顺序：重新生成（refresh）、复制（copy）、赞（thumb-up）、踩（thumb-down）、分支（git-branch，基于此回答派生新会话）、分享（share）、更多（more-horizontal，承载溢出菜单）；均使用 `ds-icon-btn--sm`（24px 视觉盒 / 16px 图标，命中区由基元外扩到 44）。右侧为回答时间：clock 14px + `__RESPONSE_TIME__`（`--ds-text-quaternary`，12px，`margin-left:auto` 靠右）；`__AI_GENERATED_NOTE__` 如需要放在时间之后或以 title 提示承载，不新增第二种弱文案样式。显露规则同 PH-9：默认 `opacity:0; visibility:hidden`，**opacity/visibility 保留布局占位，禁止位移/挤压正文**。显露的结构锚点为该轮 AI 内容的唯一包裹层 `.t-turn`（思考/工具/正文/产物/代码块/操作条，用户气泡在外），视觉出口唯一：`.t-turn:hover .t-msg-actions, .t-turn:focus-within .t-msg-actions, .t-turn.is-actions-on .t-msg-actions`，禁止并行第二套显隐样式。
- **CS-13b** 显露/收起交互由 `.t-turn` 单锚点维护三路状态（悬停 / 焦点 / 触屏钉住），任一为真即显露，全部解除后延迟 120ms 收起（跨越区块间隙、焦点在操作钮间移动不闪烁）：
  1. 鼠标：`pointerenter` 立即显露、`pointerleave` 进入宽限；
  2. 键盘：`focusin` 显露；`focusout` 仅当 `relatedTarget` 已不在本轮内才收起——因此 Tab 先落在思考折叠条等轮次内元素即可带出操作条，隐藏期操作钮不脱离 Tab 序（PH-9 / CS-17）；
  3. 触屏（无 hover，操作入口必须可达）：`pointerdown` 且 `pointerType=touch` 点按轮次内非操作区即钉住（`is-actions-on`），点按操作钮自身不翻转钉住态；点按轮次外或按 Esc（且焦点不在轮次内）解除；
  4. `prefers-reduced-motion: reduce` 时显隐不过渡。参考实现见 conversation-starter 页尾 CS-13 行为参考块，P8 组件直接沿用同一状态机。
- **CS-14** 复制：写入剪贴板（`navigator.clipboard`，失败回退临时 textarea+execCommand 保底，原型允许静默保底）后图标瞬时变 check 1.2s；赞/踩单选互斥，仅灰阶不使用彩色。
- **CS-15** 重新生成派发 `generation:regenerate {messageId}`；生成中控件禁用矩阵见 composer 合同 CP-7。

## 6. 键盘与焦点

- **CS-16** 所有卡片/ chip /操作图标都是 button 或 `role=button tabindex=0` 且 Enter/Space 等效；触控命中 ≥ `--ds-touch-target`（图标按钮本体 32 时由 hit-area 撑到 44）。
- **CS-17** thinking 折叠按钮、step 详情、citation hover 摘要：hover 摘要同时提供 focus 可见（`focus-within` 显示），不用只依赖鼠标。
- **CS-18** 推荐开场卡（welcome-state）可 Tab 聚焦，Enter 等价点击：把 `__SUGGESTED_PROMPT_N_TITLE__` **填入 composer 但不发送**（派发 `composer:prefill {text, autosubmit:false}`），随后聚焦 textarea 并把光标置于文本末尾；发送仍需用户显式点击发送或 Enter。

## 6b. 卡面一致性与文档行

- **CS-19** AI 回答流中的同类容器——思考折叠条（reasoning）、工具调用完成条（toolcall）、代码块（code）——必须共用同一卡面：`1px solid var(--ds-border)`、`border-radius: var(--ds-radius-panel)`（12px）、`background: var(--ds-surface-muted)`；代码块卡头内分隔线也用 `--ds-border`，不得用 `--ds-divider` 等其他灰阶。差异只允许体现在内部结构（单行条 padding 8/12 vs 复合卡头/卡体），不得各自改变边框粗细颜色、圆角或底色。思考折叠条为整宽 button（左对齐文字、`font-family:inherit`、hover 仅中性底变化）。
- **CS-20** 文档生成行（doc-row）纵向排列：`__GENERATED_DOC_LABEL__` 说明文字独占一行，文件卡（doc-card）在其下一行左对齐；禁止说明文字与文件卡同一行横排。

## 7. 联动事件

| 事件名 | 派发者 → 监听者 | 载荷 |
| --- | --- | --- |
| `conversation:open` | history-tree → conversation-stream | `{id}` 切换消息数据 |
| `conversation:submit` | welcome 卡 / composer → conversation-stream | `{text:string, attachments?:[]}` |
| `generation:stop` | composer → stream | `{}` |
| `generation:regenerate` | message-actions → stream/composer | `{messageId:string}` |
| `artifact:open` | artifact-card → artifact-panel/shell | `{id,name,type}` |

## 8. 禁用项

- **CS-X1** 禁止给 AI 文字套灰色气泡/卡片容器。
- **CS-X2** 禁止简单问答显示任务状态行、思考块或空步骤时间线。
- **CS-X3** 禁止流式时无视用户滚动位置强制吸底。
- **CS-X4** 禁止步骤状态使用彩色（绿/蓝/红）表示普通完成/进行/等待；仅异常步骤可用 `--ds-color-danger`。
- **CS-X5** 禁止 code 以外的正文使用等宽字体；禁止正文字重超过 500。
- **CS-X6** 禁止 artifact-card 用 `<a target=_blank>` 打开外部地址；产物只在右栏页签打开。
