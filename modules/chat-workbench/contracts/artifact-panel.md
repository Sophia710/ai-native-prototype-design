# 页面合同：artifact-panel（右栏产物工作区）

- 模块：chat-workbench
- 对应组件（P10）：`artifact-panel`、`artifact-toolbar`、`file-tree`、`document-preview`；壳层几何见 workspace-shell.md
- 条款编号 `AP-n`。

## 1. 区域职责图

```text
┌ artifact-tabs（页签行） ────────────────────────────────┐
│ [× html页签] [× 新标签页] …                   [＋]       │
├ artifact-toolbar ───────────────────────────────────────┤
│ __FILE_NAME__      [</>编辑]  ↗外部打开  ···更多  ☲文件树│
├ artifact-content（栏内独立滚动，WS-1） ──────────────────┤
│ 视图区（弹性）                        │ file-tree（240，│
│   空态：__ARTIFACT_EMPTY_TEXT__       │  内嵌最右侧，   │
│   网页预览 / 代码编辑 / 文件预览       │  可关）          │
│   启动页（新标签页）                                      │
└─────────────────────────────────────────────────────────┘
```

- **AP-1** 页签位只放已打开产物页签与「新标签页」（AP-20），不再设常驻「文件」入口；末尾「＋」=新建标签页（打开发布启动页，非文件选择器）。
- **AP-2** 页签结构：文件类型小图标 16 + 名称（单行省略）+ 关闭 x（hover/focus-within 显露，遵循不跳动原则）；当前页签底色 `--ds-active-fill`、文字 primary，非当前 secondary。

## 2. 开/关与页签行为

- **AP-3 监听 `artifact:open {id,name,type}`**：已存在同 id 页签 → 聚焦；否则在末尾插入并聚焦；同时若右栏关闭则请求 shell 打开（`rightpanel:toggle {open:true}` 或 shell 直接处理，见 WS-14）。
- **AP-4** 关闭最后一个产物页签 ≠ 关闭右栏：保留工具栏 + 空态 `__ARTIFACT_EMPTY_TEXT__`；右栏整体关闭只由 ☲ 以外的面板开关控制（v1 统一用中栏右缘 icon-button；工具栏 ☰ 菜单已移除，不再提供关闭面板入口）。
- **AP-5** 中键/快捷键本版不做；关闭按钮是 x icon-button（24px 视觉，44px 命中区），`aria-label="关闭页签：名称"`；关当前页签后焦点移到左侧相邻页签；全关后焦点移到行尾「＋」。

## 3. 工具栏（artifact-toolbar）

- **AP-6** 自左向右：当前文件名（14px medium，单行省略；空态/启动页态隐藏）｜右侧弹簧：**编辑/预览切换钮（AP-18，描边胶囊 icon+文字）**、外部打开 ↗（icon-button，原型无真实地址时为禁用态，**不得** `target=_blank` 到占位 URL）、··· 更多（下载/重命名等占位项）、**☲ list-tree = 文件树开关**。工具栏不再含 ☰ 菜单钮。
- **AP-7 ☲ 开关**：file-tree 在右栏内部展收（宽度 240，区间不做拖拽），预览区 flex 弹性收缩；展收用 width + `--ds-t-normal`/`--ds-ease-standard`；**开关状态持久化**：`ds.chat-workbench.fileTree.open`（"1"/"0"），刷新恢复（与右栏开/关独立：右栏再开时树保持上次状态）。
- **AP-8** 右栏宽度拖拽提交（WS-11）后 document-preview 重排一次；☲ 树展收结束（transitionend 或无动画环境立即）后重排一次；重排期间预览内容不出横向滚动（宽表/代码可内部横向滚，版面本身不滚）。

## 4. 文件树（file-tree）

- **AP-9** 结构：工作区头 `__WORKSPACE_ID__`（含搜索框外观 + ···）→ 文件夹 `__FILE_TREE_FOLDER_N_NAME__`（folder/folder-open + chevron，折叠记忆在组件内存）→ 文件行（类型图标按扩展名映射 file-md/file-sheet/file-pdf/file-text/image/file + `__FILE_TREE_FILE_N_NAME__`）。
- **AP-10 选中**：当前预览文件行灰底 `--ds-active-fill`；点击文件行派发 `artifact:open`（与产物卡同一条事件，AP-3 复用，不新增页签）。
- **AP-11 记忆**：树开关持久化（AP-7）；文件夹折叠状态本版仅内存。

## 5. document-preview

- **AP-12** 三态：loading（骨架条，`--ds-surface-strong` 块 + shimmer 仅在动画允许时；reduced-motion 静态灰块）／ updating（内容上盖 30% 静态蒙层 + 顶部 2px 进度条外观）／ ready。
- **AP-13** 普通文件预览（`kind=file · mode=preview`）：最大排版宽 720px 居中；字号/行距走 body/title token；预览是静态演示内容（Markdown 渲染外观或文档占位），禁止 iframe 外链（自包含契约）；图片仅 data URI。网页/代码视图见 AP-18。
- **AP-14** 空态居中：file 图标 24 + `__ARTIFACT_EMPTY_TEXT__`（secondary 文字），无按钮堆；启动页（新标签页）关闭后恢复本空态。

## 6. 键盘与焦点

- **AP-15** 页签行支持左右方向键在页签间移动焦点（roving tabindex）；Home/End 跳首/尾；页签焦点上 Delete 等同关闭 x；☲/↗/··· 均为带 aria-label 的 icon-button。
- **AP-16** 文件树：文件夹行 Enter/Space 切换折叠；文件行 Enter 打开；树作为 `role="tree"`/`treeitem`（本版至少保证语义角色 + 单层键盘）。
- **AP-17** ☲ 切换后焦点停留在 ☲ 自身；外部打开禁用时 aria-disabled 且不可聚焦。

## 7. 编辑/预览模式、元素选择与新标签页

- **AP-18 编辑/预览双模式**：每个产物有 `kind`（`web`=网页类，如 html；`file`=普通文件）与 `mode`（`preview`/`edit`）两个正交状态，视图映射为：
  - `web · preview`：网页渲染效果（纯静态 DOM 模拟，AP-X7）；
  - `web · edit` / `file · edit`：代码编辑视图（等宽 `--ds-font-mono`、行号列、长行内部横向滚动，单色灰阶，AP-X9）；
  - `file · preview`：AP-13 的 720 排版文件预览。
  - 切换钮为描边胶囊（icon 16 + 14px 文字，30 高，1px `--ds-border`，radius-button）：任何 `preview` 态按钮文案「**编辑**」、图标 i-code；任何 `edit` 态文案「**预览**」、图标 i-play（即参考图「查看代码」=编辑、「查看预览」=预览）。无产物（空态）与启动页态该钮隐藏。
- **AP-19 元素选择钮**：工具栏图标钮（复用 `.ds-icon-btn`，i-pointer），位置在编辑/预览切换钮**左侧**；仅 `web · preview` 态出现（其余模式/启动页/空态隐藏），`aria-label="选择页面元素"`、`aria-pressed` 表达开关，按压态走 icon-button 组件灰阶选中样式；P 阶段前仅视觉/按压占位（AP-X8），不做真实 DOM 选取。禁止做成悬浮于网页画布的浮动圆形钮。
- **AP-20 新标签页启动页**：页签行「＋」点击后插入一个可关闭的「新标签页」页签（plus 图标 + 文案 + 关闭 x，复用 AP-2 页签样式），内容区切换为启动页；已存在时再次点 ＋ 仅聚焦不重复插入。启动页垂直居中、宽 ≤480，包含 5 个大胶囊行（48 高、radius-full、1px 边框、图标 20 + 16px 文字）：搜索或输入网址（输入框外观，仅占位）、打开项目文件夹（folder）、打开云盘文件（cloud）、新建文件（plus）、打开终端（terminal）。关闭该页签后：有产物时回到原产物页签与原模式，无产物时恢复 AP-14 空态。

## 8. 联动事件

| 事件名 | 时机 | 载荷 |
| --- | --- | --- |
| `artifact:open` | 产物卡 / 文件树文件行 | `{id,name,type}` |
| `artifact:tab:close` | 页签 x | `{id}` |
| `artifact:tab:new` | 页签行 ＋（打开启动页/新标签页） | `{}` |
| `artifact:mode:change` | 编辑/预览切换钮 | `{id,kind:'web'\|'file',mode:'edit'\|'preview'}` |
| `filetree:toggle` | ☲ | `{open:boolean}` |

## 9. 禁用项

- **AP-X1** 禁止文件树做成第四栏（绝对定位悬浮抽屉）；它必须是右栏 flex 内的子区域。
- **AP-X2** 禁止右栏关闭后丢失已打开页签数据；再开恢复页签与当前选中。
- **AP-X3** 禁止预览通过 iframe/外链加载任何 URL。
- **AP-X4** 禁止用彩色高亮文件树当前项；只用灰底。
- **AP-X5** 禁止关闭最后页签时连带关闭右栏（AP-4）。
- **AP-X6** 启动页 5 个入口（搜索/网址、项目文件夹、云盘、新建文件、终端）在 P 阶段前全部仅占位：不导航、不打开真实文件/文件夹、不唤起终端；输入框可输入但不触发任何跳转。
- **AP-X7** 网页预览 mock 必须是纯静态 DOM 模拟（随包自包含），禁止 iframe、外链脚本/样式/图片与真实 URL 加载（在 AP-X3 基础上覆盖网页视图）。
- **AP-X8** 元素选择工具栏钮仅视觉与按压态占位，禁止在原型期实现真实元素框选/属性读取。
- **AP-X9** 代码编辑视图与网页 mock 只允许黑白灰 token（含 `--ds-text-primary` 反色卡片），禁止语法高亮彩色与还原参考图的品牌色；代码视图不做真实编辑保存。
