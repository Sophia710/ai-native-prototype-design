---
name: ai-native-prototype-design
description: 根据对话描述、PRD、需求文档、功能清单或截图，按 AI 原生设计规范生成单文件、可离线打开的高保真 HTML 原型。当前覆盖「AI 对话工作台」模块（三栏：项目会话历史 / 对话流输入区 / 产物工作区；浅色深色双主题），适用于 AI 对话、聊天、Agent 任务台、带产物面板的工作台类页面。后续 AI 应用模块随 modules/ 扩展。触发词：AI 原型、AI 原生、AI 对话、聊天工作台、Agent 工作台、产物面板、高保真原型。
---

# ai-native-prototype-design — AI 原生高保真原型设计 Skill

你是这个 Skill 的执行者。目标：**让每一次生成的原型在视觉、结构、交互上保持一致**。你不凭记忆做设计决策，只从本包的权威文件读取规则并严格执行。

## 1. 职责与边界

**做**：桌面 Web（1280–1920px 宽屏）单文件 HTML 高保真原型；浅色 + 深色双主题；自包含、断网可打开。**默认交付全交互原型**：发送问题可回放"思考→步骤→分段揭示"流式演示、产物卡点击打开右栏工作区、历史树/重命名/删除/新建会话等全部组件真实可用（见第 7 节交互必检）。仅当用户明确只要静态稿或线框时，才降级使用轻量 starter。

**不做**（用户要求时明确说明不支持，不要硬做）：

- 移动端页面、多会话页签、真实后端/模型接入、账号体系；
- npm 工程、构建工具、外部 CDN、外部字体、网络图片；
- 跨模块拼凑：不属于「已交付模块」的场景不得借用模块组件冒充。

产物中所有业务文案必须来自需求证据或槽位示例值，保持中立命名，不杜撰品牌名。

## 2. 模块路由（每次任务的第一步）

先识别需求属于哪个模块，再读取该模块目录。已交付模块：

| 模块 id | 识别信号 | 模块目录 |
| --- | --- | --- |
| `chat-workbench` | AI 对话 / 聊天 / 会话 / Agent 任务执行 / 消息流 / 思考与步骤 / 产物文件面板 / 项目-会话历史 | `modules/chat-workbench/` |

路由规则：

1. 信号命中唯一模块 → 使用该模块；信号同时命中多个或都不命中 → 向用户说明并请求确认，不要自行选择；
2. 命中"尚未交付模块"（如知识库管理、智能体管理后台等）→ 明确告知该模块尚未支持，列出当前可用模块，不用现有模块硬拼；
3. 确定模块后，本 Skill 中所有模块资源路径都以该模块目录为前缀（下文以 `modules/chat-workbench/` 为例）。

## 3. 稳定生成原则（权威链）

1. **一个 token 权威源**：颜色/字体/间距/圆角/动效只来自 `tokens/tokens.json`，组件中禁止裸值；
2. **一个壳层复制源**：全交互产物只能从 `interactive-starter.html` 复制整页骨架，禁止从零手写三栏、禁止手工往成品里增删组件；静态稿才允许使用轻量 starter；
3. **内容只走填充集**：业务文案以 manifest JSON 提供，由 `scripts/fill-template.mjs` 机械填槽（N/M 下标槽按数组展开），禁止手工查找替换 `__SLOT__`——确保 127 个槽位零残留且四个 JSON 数据岛合法；
4. **按需读取组件**：只读命中的组件文件，不把 components 目录整体载入上下文；
5. **先证据后界面**：需求证据不足处标记待确认或使用槽位示例值，不杜撰数据；
6. **先静态门禁后浏览器验收**：四个审计脚本全绿，才进入浏览器检查。

冲突优先级：共享层（tokens/scripts） > 模块合同（contracts） > 单组件规范。新规则必须归位到对应文件，不在生成产物里临时发明样式。

## 4. 资源导航

### 共享层（跨模块）

| 路径 | 用途 | 何时读 |
| --- | --- | --- |
| `tokens/tokens.json` | 唯一视觉权威：语义 token + 浅/深两套值 + role/used_by | 生成前必读 |
| `tokens/tokens.css` | 由 tokens.json 生成的 `--ds-*` CSS 变量 | 内联进产物 |
| `icons/manifest.json` | 图标 name/aliases/use_for/avoid_for/default_size | 选图标时检索 |
| `icons/sprite.svg` | SVG 图标集（id 形如 `i-xxx`，currentColor） | 内联进产物 |
| `scripts/audit-*.mjs` | 四个机器门禁 | 生成后必跑 |
| `scripts/fill-template.mjs` | 零依赖填槽器：manifest JSON + 骨架 → 零残留成品 HTML，输出证据/示例来源报告 | 全交互产物填充时必用 |

### 模块层（以 chat-workbench 为例）

| 路径 | 用途 | 何时读 |
| --- | --- | --- |
| `modules/chat-workbench/content-slots.json` | 全部槽位名称/含义/示例值/是否必填 | 填槽位前必读 |
| `modules/chat-workbench/contracts/*.md` | 5 份页面合同：区域职责、联动、键盘焦点、禁用项 | 组装前按区域读对应合同 |
| `modules/chat-workbench/components/*.html` | 29 个组件：头部规范 JSON + 可运行实物 | 按需读取命中组件 |
| `modules/chat-workbench/components/index.html` | 组件可视化目录 | 不确定用哪个组件时查 |
| `modules/chat-workbench/starters/interactive-starter.html` | **默认整页骨架**：29 组件全装配、交互 JS 全接线的三栏页，保留 127 个槽位与 4 个 JSON 数据岛 | 每次全交互生成的唯一起点 |
| `modules/chat-workbench/starters/workbench-starter.html` / `conversation-starter.html` | 轻量线框骨架（三栏空槽 / 单会话），静态稿或低保真线框备选 | 用户明确不要交互时 |
| `modules/chat-workbench/prototype/ai-workbench.html` | 端到端参考原型（interactive-starter 经规范填充集填充的成品，全交互） | 需要参考完整联动与文案密度时读 |

## 5. 强制生成顺序（7 步，不可跳步）

1. **读需求**：提取平台、项目/会话数据、消息内容（用户提问、思考过程、工具步骤、AI 回复正文/代码/引用/产物卡）、加号菜单集成项、模型列表、@提及对象、右栏产物内容；证据不足标待确认，不杜撰；
2. **读 token 与槽位**：读 `tokens/tokens.json`（浅/深两套）与 `content-slots.json`（确认每个槽位语义、必填性、N/M 数组槽）；
3. **写 manifest**：把需求证据写成填充集 JSON（键为槽位名，N/M 槽给数组）。无证据的槽位取登记 example；JSON 岛内槽位（history-seed / model-seed / mention-seed / demo-seed，见 `scaffolds:["interactive"]` 登记项）的值必须是单行文本，不含英文双引号/反斜杠/换行。参考填充集见 `prototype/ai-workbench.html` 对应的 demo 数据密度；
4. **机械填充**：在包根执行
   ```bash
   node scripts/fill-template.mjs --manifest <manifest.json> --template interactive --out <交付路径>.html --report <manifest同名>-report.json
   ```
   填槽器自动完成：N/M 下标槽按数组展开、证据优先未覆盖槽回退登记 example、零残留校验、4 个 JSON 数据岛可解析校验。stdout 的 JSON 中 `exampleSlots` 即"无证据用示例值"清单，须写入交付说明。**禁止手工编辑产物 HTML**；确需改骨架只能改源并重建，不直接改成品；
5. **静态稿降级路径（仅当用户明确不要交互）**：复制 `workbench-starter.html` 或 `conversation-starter.html`，按需复制命中组件的 `data-component` 根及局部 CSS/JS，严格按 5 份 contracts 放置接线（如产物卡点击派发 `artifact:open`），手工填充其槽位；
6. **核对合同**：对照模块 contracts 确认区域职责、联动与禁用项未被填充文案破坏（例如产物卡 `data-id` 等结构性属性不在槽位中，不会被改动）；
7. **跑门禁 → 浏览器验收**：四个脚本全绿（全交互产物的 `--require-components` 必须含全部 29 个组件，见第 8 节），再按第 7 节清单做交互验收。

## 6. 单 HTML 契约

- 完整 `<!doctype html>`；所有 CSS/JS/图片内联（图片用 data URI）；
- 不依赖 npm、CDN、外部字体、网络图片、任何后端；断网双击可完整交互；
- 图标只用内联 sprite 中的标准四件套写法：`<svg class="ds-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><use href="#i-xxx"></use></svg>`——**外层 svg 必须带 `viewBox="0 0 24 24"`**，否则 symbol 不缩放会被裁切；尺寸只取 icons/manifest.json 的 size_table（16/18/20/24，徽标点 12）；禁止复制外部图库 path、禁止 emoji 充当 UI 图标；
- 组件根必须带 `data-component="<id>"` 并包含规范 JSON 声明的结构，禁止"挂名组件"。

## 7. 浏览器验收清单（门禁通过后执行）

**全交互必检（默认产物逐项点过，不能只看首屏）**：

1. 页面对应根节点带 `data-ready` 标记，console 0 错误、Network 0 外部请求；
2. 输入问题发送（或点欢迎卡）：用户气泡出现 → 思考块 running→可折叠完成态 → 步骤时间线四步依次推进（等待/进行/完成）→ 正文/代码/引用/产物卡分段揭示，全程无布局跳动；
3. 再次发送可完整回放；生成中点"停止"：思考块变为停止态、进行中步骤回退、输入区恢复可用；
4. 点消息下产物卡：右栏工作区打开对应产物（文件类→文档预览视图、网页类→网页视图、代码可切 code 视图），顶部工具栏名称/同步态与卡片一致；空态文案在未打开时正确；
5. 左栏：项目展开/折叠、会话切换、内联重命名（失焦/Esc 行为）、删除确认框确认/取消、新建会话回到欢迎空态且对话流重置；加号菜单的命令/插件/技能二级面板与 @提及浮层可开关、焦点正确；
6. 模型切换下拉、语音按钮态、附件 chip、主题切换（浅↔深色后等待 ≥300ms 再检查）均可用；
7. 欢迎卡点击把文案预填进输入区（不自动发送）。

**通用视觉与适配**：

- 视口 1920×1080 / 1440×900 / 1366×768 / 1280×720，每个视口 × 浅色/深色；
- 无整页横向滚动、无双重纵向滚动；1280 下右栏打开时中栏不小于 360px；
- 浮层（行菜单 / @选择器 / 确认框 / 模型下拉）：焦点进入、Escape 关闭、关闭后焦点回到触发元素、背景不错位滚动；
- 键盘全流程可达；行操作在 focus-within 下可见；触控目标 ≥44px；
- 流式/动效演示尊重 `prefers-reduced-motion`。

## 8. 机器门禁

四个零依赖 Node ESM 脚本位于 `scripts/`（Node ≥18，无需 npm install）。在包根目录执行；退出码 0=通过、1=有违规，问题输出为 `FAIL <文件相对路径>:<行号> <原因>`。不传路径参数时默认递归审计 `modules/` 下全部 HTML。

**交付物（成品 HTML，槽位必须已全部替换）**：

```bash
node scripts/audit-self-contained.mjs deliverables/prototype.html
node scripts/audit-tokens.mjs deliverables/prototype.html          # 含数据可视化图表时加 --allow-chart
# 全交互产物（interactive-starter 填充）必须声明全部 29 个组件；静态降级稿按实际装配组件声明
node scripts/audit-components.mjs --require-components artifact-card,artifact-panel,artifact-toolbar,attachment-chip,brand-header,button,citation-chip,code-block,composer,conversation-header,dialog-confirm,document-preview,file-tree,history-tree,icon-button,inline-rename,markdown-body,mention-popover,message-actions,message-bubble,model-switcher,popover-menu,step-timeline,thinking-block,tool-nav,user-card,voice-button,welcome-state,workbench-shell deliverables/prototype.html
node scripts/audit-slots.mjs deliverables/prototype.html
```

**包内模板集合（组件实物 + starter，槽位允许保留）**：

```bash
node scripts/audit-self-contained.mjs modules
node scripts/audit-tokens.mjs modules
node scripts/audit-components.mjs modules
node scripts/audit-slots.mjs --template modules/chat-workbench/components modules/chat-workbench/starters
```

1. `audit-self-contained.mjs`：缺 doctype、外链/CDN/外部字体、CSS `url()`/`@import` 非 data URI、重复 ID；
2. `audit-tokens.mjs`：裸颜色（hex/rgb/hsl/命名色）、间距越界（非 0/4/8/12/16/20/24/32）、圆角越界（非 0/4/6/8/10/12/16/9999）、`--ds-color-accent`/`--ds-chart-*` 用于 UI（图表场景须显式 `--allow-chart`）、字重越界（仅 400/500/normal）、硬编码字体栈（须 `var(--ds-font-sans|mono|serif)` 或 inherit）；tokens.css 权威定义块自动挖空，不会自证违规；
3. `audit-components.mjs`：`--require-components a,b,c` 声明的组件根必须真实存在；`button/input/select/textarea/a` 挂 `data-component` 必须带 `ds-*` 类（行为型组件允许挂在普通 div）；规范 JSON 合法且 id/anatomy 与标记一致；`svg.ds-icon` 必须 `viewBox="0 0 24 24"` 且 width/height ∈ {12,16,18,20,24}；`<use href>` 只允许命中页内 sprite 的 `#i-*`；纯图标 `.ds-icon-btn` 必须有 `aria-label`/`title`；
4. `audit-slots.mjs`：默认交付模式——残留任何 `__UPPER_SNAKE__` 即失败；`--template` 模板模式——禁止字面 `__SLOT__`、所用槽位必须登记于 `modules/chat-workbench/content-slots.json`（N/M 下标数字通配），必填槽位对 `starters/<骨架名>-starter.html` 按登记项可选 `scaffolds` 字段校验（缺省=全部骨架，`[]`=运行时装配不静态承载）。另有 `--registry <path>` 自定义登记、`--no-registry` 跳过登记/必填校验。

> 注意：默认（交付）模式直接跑 `modules/` 会因 starter/组件实物保留槽位而失败——审模板必须显式带 `--template` 与模板路径。

## 9. 视觉红线（摘自 tokens 权威定义，速查用）

- 黑白灰优先；交互强调用深色文字色与灰阶，**蓝色只用于数据可视化与真实语义**，绝不表示"可交互"；
- 语义底色用 10–25% 浅色（`color-mix(in srgb, var(--ds-color-danger) 12%, transparent)`），不用实色；
- 仅 400/500 两档字重；正文 16px/24px；数字用 `tabular-nums`；等宽字体仅限代码；
- 间距只取 4/8/12/16/20/24/32；圆角只取 4/6/8/10/12/16/full，嵌套时内小外大（inner = outer − padding）；
- 图标 1.8px 线性、24×24 网格、仅 currentColor、最大 24px；
- 动效只用 `--ds-t-*` 时长（60–300ms）与 `--ds-ease-*` 缓动。

## 10. 长任务状态

当上下文被缩减或任务跨多轮时，保留并在恢复时复述最小状态：

- 需求证据清单、模块路由结果（模块 id）；
- 已选组件映射（区域 → 组件 id 列表）、已读文件路径；
- manifest 填充集路径、槽位 → 值或"待确认/示例值"映射、未决问题；
- 当前进行到 7 步中的哪一步。

恢复后不重新决定主色、几何与布局：这些只由 tokens 与 starter 决定。
