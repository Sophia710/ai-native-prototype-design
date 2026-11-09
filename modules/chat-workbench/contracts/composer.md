# 页面合同：composer（中栏输入区）

- 模块：chat-workbench
- 对应组件（P9）：`composer`、`attachment-chip`、`mention-popover`、`model-switcher`、`voice-button`；壳层共用 `popover-menu`、`icon-button`
- 位置：中栏底部（WS-2），外有 1px `--ds-divider` 顶边
- 条款编号 `CP-n`。

## 1. 区域职责图

```text
┌ composer（--ds-radius-input 外框，surface-raised + border） ───────────┐
│ attachment-row：[× __ATTACHMENT_N_NAME__ chip]…（有附件时才占位）       │
│ textarea（自适应高度，placeholder=__COMPOSER_PLACEHOLDER__）            │
│ toolbar：[加号 attachment/@][麦克风 voice] … [模型切换▾][发送/停止]（模型钮靠右贴发送）        │
└─────────────────────────────────────────────────────────────────────────┘
```

- **CP-1** 外框：`--ds-surface-raised` 底、1px `--ds-border`、`--ds-radius-input`，**常驻显示**；**hover 时边框转 `--ds-text-quaternary`；focus-within（选中态）时边框转 `--ds-text-primary` 并叠加 `box-shadow: 0 0 0 1px var(--ds-text-primary)`（1px 同色外圈，形成深色选中描边，对齐参考稿 `.composer:focus-within`），过渡只动 `border-color`/`box-shadow`**。textarea 自身在任何状态（含 `:focus`/`:focus-visible`）始终 `border:none; outline:none; box-shadow:none`——注意 tokens.css 的全局 `:focus-visible` 环会命中所有文本输入框，组件必须用 `.xxx__textarea:focus-visible { box-shadow:none }`（(0,2,0) 压过全局 (0,1,0)）显式豁免，禁止依赖"全局环刚好不生效"。本条仅豁免 composer 外框的 textarea ring（外框自身允许 1px 同色外圈）；按钮/菜单项/页签等其他可交互元素仍按视觉基线第 2 条提供深色焦点可见样式，不得据此全局删除 focus ring。
- **CP-2** 整体最大宽同 CS-1（760px）居中，与消息流左右缘对齐；外边距 `--ds-space-4` 两侧、`--ds-space-3` 底。

## 2. 输入与发送规则

- **CP-3 自适应高度**：textarea 默认 3 行（80px = 3×24 行高 + 上下 padding 8），随输入逐行增高，到 **10 行（约 248px）** 封顶后内部滚动；会话切换/发送成功后清空回 3 行。
- **CP-4 Enter 规则**：Enter = 发送；Shift+Enter = 插入换行；输入法 composition 期间 Enter 只确认组词不发送（`isComposing` 判断）；占位文案必须写明规则（`__COMPOSER_PLACEHOLDER__`）。
- **CP-5 发送条件**：文本去空白非空 **或** 存在附件时可发送；空内容发送按钮禁用（灰）。
- **CP-6** 发送派发 `conversation:submit {text, attachments}`，附件行与输入同步清空；失败时不清空并恢复可编辑（允许重新生成走 CS-15）。

## 3. 发送 ↔ 停止

- **CP-7 禁用矩阵（generating 状态）**：

| 控件 | 空闲 idle | 生成中 generating |
| --- | --- | --- |
| textarea | 可编辑 | 可编辑（允许追加下一条？——**本版只读**，不可编辑） |
| 附件 / @ / 模型切换 / 语音 | 可用 | **禁用**（disabled，视觉降透明，不可聚焦发送动作） |
| 主按钮 | send 图标（内容为空时禁用） | **stop 图标，可用**（派发 `generation:stop`，见 CS-10） |
| Enter 发送 | 按 CP-4 | 不发送（停止只能点按钮，避免误触） |

- **CP-8** 主按钮是同一按钮两态：idle 黑底白字 send（18px 图标），generating 黑底白字 stop；**按钮本体 32×32 正方形（与工具行同高，padding 0）**，切换无布局位移（两图标同尺寸）。危险/中断不用红色，stop 是中性深色。
- **CP-9 草稿**：按会话记忆未发送文本，键 `ds.chat-workbench.draft.{conversationId}`，输入去抖 300ms 落盘；切会话恢复对应草稿，发送成功删除；空白态欢迎卡发起的新会话使用同一机制（临时 id）。

## 4. 附件（attachment-chip）

- **CP-10** chip：类型小图标（图片=image，文档=file-text/file-pdf/file-sheet 按扩展名）+ 名称单行省略 + x 移除；chip 位于 textarea 上方一行 flex-wrap，**只有有附件时该行才出现**（不留空高）。
- **CP-11** v1 用隐藏 `<input type="file">` 作数据内核（点击附件 icon-button 触发 click），禁止直接裸露原生选择控件外观；选中文件不入磁盘，只在内存 + chip 展示。
- **CP-12** 图片/文档仅以图标与底色区分，不用彩色角标；单 chip 最大宽 220px。

## 5. @ 提及（mention-popover）

- **CP-13 触发**：textarea 中空格后或起始处输入 `@`，且光标左侧 token 形如 `@xxx`（无空格）时打开；三组分类：文件 `__MENTION_FILE_N_NAME__`、知识库 `__MENTION_KB_N_NAME__`、智能体 `__MENTION_AGENT_N_NAME__`，组标题不可选。
- **CP-14 键盘**：↓/↑ 在可选项间移动（默认第一项），Enter/Tab 选中（插入"名称"chip 化文本并关闭），**Esc 关闭浮层且焦点回到 textarea 原位置**；继续输入按关键词过滤；失焦或点击外部关闭。
- **CP-15** 浮层定位在触发字符附近、贴 composer 上沿向上展开；宽度 280px、最大高 320px 内部滚动；样式走 popover 同款（surface-raised + border + shadow-raised + radius-panel），不复刻其 JS。
- **CP-16** 选中后 textarea 中以普通文本 `@名称 ` 插入即可（不做富文本原子 chip，避免光标复杂度）；生成中禁止触发（矩阵禁用）。

## 6. 模型切换（model-switcher）

- **CP-17** 工具行右侧（spacer 之后、发送钮之前）弹层：触发器显示 bot 图标 + `__MODEL_NAME__` + chevron-down；浮层项 = 名称 + `__MODEL_N_DESC__`，当前项尾 check；单选，点击即切换并关闭回焦。
- **CP-18** 选中模型记忆键 `ds.chat-workbench.model`（存名称字符串）；不得写死任何真实品牌型号；默认值用槽位示例语义"通用模型 · 标准"。
- **CP-19** 键盘规则同 popover-menu（↑↓/Home/End/Enter/Esc/外部点击）。

## 7. 语音（voice-button）

- **CP-20 三态**：idle（mic 图标，可点）→ recording（mic 变红？——**不，用深色实心状态 + stop/再次点击结束**，波形可省略，仅 12px 红点用 danger，因为它是真实状态语义）→ transcribing（加载旋转，按钮禁用）；完成转写文本填入 textarea。原型允许用定时器模拟 2.4 秒三态流转。
- **CP-21** 录音中点按钮或 Esc（浮层提示存在时）结束；生成中整个按钮禁用（CP-7）。

## 7b. 空白态定位（welcome → chatting）

- **CP-22** 新建会话（`data-stage="welcome"`）时，greeting + composer + 建议 chips 作为同一组在中栏**垂直居中**（仅视觉居中，composer 仍在正常钉底文档流中，用合成层 `transform: translateY(...)` 上移，不改变 flex 几何）；首条 `conversation:submit` 后切 `data-stage="chatting"`：greeting/chips 零占位淡出，同一位移以 `--ds-t-slow` + `--ds-ease-out` 平滑归零，composer 下沉贴底（WS-2），消息流出现。
- **CP-23** 该过渡只允许 `transform`（位移）与 `opacity`（淡出），禁止动画消息流容器宽高、禁止用 JS 每帧驱动、禁止把 composer 在 DOM 中搬家；`prefers-reduced-motion` 下瞬时归位。历史对话页始终为 `chatting`，不播放下沉。

## 7c. 窄宽自适应（容器收缩零溢出）

- **CP-24** 中栏被右栏/窗口挤窄时（设计下限：中栏 360px，且任意更窄宽度都不得破版），composer 内部所有控件必须始终位于 `.t-composer` 的 padding box 内，发送钮不得脱离圆角容器，页面不得出现横向滚动条。布局硬规则：
  1. 收缩父链逐层显式 `min-width: 0`：`.ds-shell__center` → `.ds-shell__composer` → `.t-composer-stage` → `.t-composer` → `.t-composer__bar`（解除 flex 子项 `min-width: auto` 隐式最小宽度，否则不收缩文本会把容器撑爆）。
  2. 工具栏 `.t-composer__bar` 为 flex 行，`gap: 8px`、**`flex-wrap: nowrap` 恒单行**（flex 换行判定先于收缩，wrap 会让发送钮在省略号生效前就被折到次行造成错位）；`.t-composer` 声明 `container-type: inline-size`。
  3. 加号/语音 icon-btn 与发送钮恒为 `flex: none`，尺寸不压缩；弹簧 `.t-composer__spacer` 为 `flex: 1 1 0; min-width: 0`，发送钮因此始终钉在工具栏右侧（附件/@ 入口已按 CP-25 收进加号菜单）。
  4. 模型钮 `flex: 0 1 auto; min-width: 0`，内部名称 `<span>` 用 `overflow:hidden; text-overflow:ellipsis; white-space:nowrap`：宽屏完整显示，窄宽先省略模型名，不得挤掉发送钮。当 composer 宽度 ≤240px（约中栏 298px，处于 WS 钳制下限 360 之外的纯兜底区间）时，`@container (max-width: 240px)` 将模型钮整体 `display:none`，确保任意极端宽度下发送钮仍在单行右侧、零溢出；设计适配区间（中栏 ≥360）内模型钮始终完整可见、视觉无任何变化。
  5. textarea `width:100%; min-width:0; box-sizing:border-box`，长文本走原生软换行，禁止内容横向截断或控件错位。
  6. 仅允许布局 CSS 实现；不得改按钮功能、事件、颜色、圆角与既有交互。

## 7d. 加号收纳菜单（输入能力统一入口）

- **CP-25** 工具栏不再裸露「附件（paperclip）」「@ 提及（at-sign）」按钮，二者与其他输入能力统一收进**唯一显式入口**：工具栏首位的加号钮 `.t-composer__plus`（i-plus，18px，aria-label「更多输入能力」，`aria-haspopup="menu"` + `aria-controls="t-plus-menu"` + `aria-expanded` 联动）；语音 mic 钮常驻工具栏、不收纳。单击加号向上展开一级浮窗 `.t-plus-menu`（`role="menu"`），再点/选择后收起；禁止右键、长按等隐性手势。规则：
  1. **结构与分组**：一级菜单宽 240px，卡面与 popover 同款（1px border、radius-panel 12、surface-raised、shadow-raised、padding 4、item 高 32 / radius-chip 6），自上而下分三组，组间用 1px 分隔线：① 快捷项（无二级）：添加知识库（i-hash）、调用命令和技能（i-bolt）、上传附件（i-paperclip）；② 能力分类（带 i-chevron-right caret，可级联）：命令（i-terminal）/ 插件（i-grid）/ 技能（i-blocks）；③ 集成项分类（带 caret，名称与条目走内容槽位）：集成 1（i-file-text）/ 集成 2（i-user）。
  2. **二级面板** `.t-plus-sub`（宽 232px，data-plus-panel 与一级项 data-plus-sub 对应，共 5 个）：能力类二级面板含 caption 标题（「可用命令/插件/技能」）、3 个占位条目（单色线性图标 + 槽位文案）、分隔线、两个弱入口「管理X」（i-sliders）与「探索更多X」（i-external-link 16px）；集成类二级面板标题/条目/名称均取槽位，含 2 个条目与「管理」「探索更多」。全部条目为 `role="menuitem"` 的 button。
  3. **接线归属（P8）**：「上传附件」仍走 CP-11 的隐藏 file 内核；提及文件/知识库/智能体仍走 CP-13 的 @ 提及弹层；二级叶子项由各能力提供方按槽位注册。P8 之前叶子项仅占位：点击/激活后关闭菜单、焦点回到 textarea，不执行业务、不导航。
  4. **定位与翻转**：菜单/面板 `position: fixed`、z-index 1000，初始化时（hidden）由 JS 搬至 `document.body`——welcome 态 `.t-composer-stage` 带 `transform: translateY(...)` 会形成 fixed 的 containing block，不搬体会导致浮窗错位。一级菜单底边距加号钮顶边 8px、左缘与加号钮对齐，右/上超出视口（留 8px 安全边）时翻转/夹紧；上方空间不足时改为向下展开。二级面板默认在触发项右侧（与一级菜单间距 4px、顶部对齐触发项），视口右缘不足时翻到一级菜单**左侧**，底边超出时上翻；任何时刻最多展开一个二级面板。
  5. **悬停级联**：pointerenter/focusin 分类项即展开对应二级并收起其他；一级菜单与二级面板之间移动用 120ms 宽限定时器防闪烁；离开两者 120ms 后收起二级（一级保持）。
  6. **键盘**：加号钮 Enter/Space 开关，打开后焦点进一级首项；↑/↓ 在当前可见 menuitem 内循环、Home/End 跳首尾；→ 或 Enter 展开二级并聚焦其首项；二级内 ↑/↓ 循环，←/Esc 回一级父项；Esc 关闭全部并回焦加号；Tab、外部 pointerdown、焦点移出菜单体系、页面滚动/resize 均关闭。叶子项激活后关闭并回焦 textarea。
  7. **视觉态**：加号钮展开态用 active-fill 底 + primary 色（`[aria-expanded="true"]`）；item hover/键盘焦点为 active-fill；显隐瞬时无过渡（reduced-motion 下无差异）。

## 8. 联动事件

| 事件名 | 派发者 → 监听者 | 载荷 |
| --- | --- | --- |
| `conversation:submit` | composer → stream | `{text:string, attachments:{name,type}[]}` |
| `generation:stop` | 主按钮(generating) → stream | `{}` |
| `composer:prefill` | welcome 开场卡 → composer | `{text:string, autosubmit:boolean}` |
| `model:change` | model-switcher | `{name:string}` |

## 9. 禁用项

- **CP-X1** 禁止 generating 时仍可发送/触发 @/换模型（禁用矩阵是硬规则）。
- **CP-X2** 禁止用红色表示停止按钮（仅语音录音指示点可用语义红）。
- **CP-X3** 禁止裸露原生文件选择按钮外观（只能作隐藏内核，CP-11）。
- **CP-X4** 禁止 Enter 在输入法组词时发送。
- **CP-X5** 禁止占位提示不写 Enter/Shift+Enter 规则。
- **CP-X6** 禁止空消息可点发送（按钮必须禁用）。
- **CP-X7** 禁止在工具栏直接裸露附件/@ 等输入能力入口（必须经 CP-25 加号菜单收纳，语音 mic 除外）；禁止在浮层/二级面板内嵌真实业务功能或外链导航——P8 前叶子项一律占位槽位，点击只关闭菜单。
