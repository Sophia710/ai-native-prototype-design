# 页面合同：project-history（左栏项目/会话历史）

- 模块：chat-workbench
- 对应组件：`brand-header`、`tool-nav`、`history-tree`、`inline-rename`、`user-card`、`popover-menu`、`dialog-confirm`、`button`、`icon-button`
- 条款编号 `PH-n`。

## 1. 区域职责图（左栏自上而下）

```text
brand-header：Logo 占位 + __PRODUCT_NAME__
new-actions：  [＋ 新建会话]（primary，全宽）／「新建项目」次入口（菜单项或文字按钮）
search：       中性搜索框（仅过滤本栏标题，试点可只做外观+键盘）
tool-nav：     __TOOL_NAV_GROUP_TITLE__ + __TOOL_1_NAME__..__TOOL_5_NAME__（点击仅选中态）
history-tree： ─ 项目 ▾（hover: ＋）
│                ├ 项目行：[展收icon][folder][__PROJECT_N_NAME__]（hover/focus: ＋ ···）
│                └ 会话行缩进：[__PROJECT_N_CONVERSATION_M_TITLE__]（hover/focus: ···）
│               ─ 最近 ▾（hover: ＋）
│                └ __RECENT_CONVERSATION_N_TITLE__（平铺，不缩进）
user-card：    头像（__USER_INITIALS__）+ __USER_NAME__（底部）
```

- **PH-1** 左栏纵向节奏：区块间距 `--ds-space-4`，区块内条目纵向 `--ds-space-1`；左右内边距 `--ds-space-3`。
- **PH-2** 左栏整体折叠（WS 合同）时，本区域全部隐藏，不提供窄条内容。

## 2. 层级与数据规则

- **PH-3 两个分组**：「项目」（含子会话树）与「最近」（独立会话平铺）。分组标题为静态文本 + 展收 icon，hover/focus-within 显露「＋」：项目组＋=新建项目（路径 2），最近组＋=新建独立会话（路径 1）。
- **PH-4 展收**：仅名称紧邻的 chevron icon 触发展开/折叠；chevron 旋转或切换 chevron-right/down；展开状态记忆在组件内存即可（不持久化）。**展收不进入行菜单**。
- **PH-5 标题规则**：会话标题默认取首条用户消息摘要（截断单行省略）；一旦手动重命名即冻结，不再随消息变化（组件数据上标记 `renamed:true`）。
- **PH-6 排序**：置顶项在前（项目/会话各自排序域），其余按最近活跃倒序；置顶仅切换标记，原型数据内排序。
- **PH-7 选中态**：当前会话行灰底 `--ds-active-fill` + `--ds-text-primary`；其父项目行视觉加粗（500）但不灰底。点击会话行派发 `conversation:open {id}`；试点不做真实切换内容，只移动选中态。

## 3. 三种新建路径

1. **PH-N1 顶部「新建会话」**：primary button → 创建独立会话 → 进入「最近」顶部并选中 → 派发 `conversation:create {inProject:null}`。
2. **PH-N2 新建项目**：项目组标题＋（或次入口）→ 创建空项目（行内命名，默认 `__PROJECT_N_NAME__` 语义的临时名"新项目"立即可改）→ 展开项目组 → 派发 `project:create {}`。
3. **PH-N3 项目内新建会话**：项目行＋或其菜单首项 → 在该项目下创建会话并选中 → `conversation:create {inProject:projectId}`。

- **PH-8** 所有新建动作在原型中只操作内存数组并重渲染对应分组，不弹 toast 之外的反馈。

## 4. 行操作菜单（popover-menu 承载）

- **PH-9 显露规则**：行尾操作区默认 `opacity:0;visibility:hidden`，行 `:hover` 或 `:focus-within` 时显露；**用 opacity/visibility 保留布局占位，禁止 hover 时位移/挤压行文字**。键盘 Tab 必须能到达行内按钮（＋、···）。
- **PH-10 项目菜单项（顺序固定）**：在项目中新建会话 ／ 重命名 ／ 置顶（取消置顶） ／ ───── ／ 删除（危险项，独立分区，红色文字 `--ds-color-danger`）。
- **PH-11 会话菜单项（顺序固定）**：重命名 ／ 移动到项目…（原型可只放禁用态或无子项提示）／ 移出项目（仅项目内会话出现） ／ 置顶（取消置顶） ／ ───── ／ 删除（危险项）。
- **PH-12** 菜单触发：点击「···」打开 popover-menu（锚定行尾），焦点进入首项；↑/↓ 循环移动，Home/End 跳首尾，Enter 激活，Esc 关闭并回焦「···」；菜单打开时点击外部关闭；危险项与普通项之间有分隔线，危险项文字红色，不使用红色实底。

## 5. 重命名（inline-rename）

- **PH-13** 触发：菜单「重命名」或双击行名（双击为快捷方式，键盘仍以菜单为准入）。
- **PH-14** 行名原地替换为单行 input，值=当前名并全选；Enter 或失焦提交（去空白，空名则还原旧名），Esc 取消还原；提交后标记 renamed（PH-5）。
- **PH-15** 重命名中该行菜单与展收 icon 临时禁用；宽度不超过行可用宽。

## 6. 删除与强确认（dialog-confirm 承载）

- **PH-16 删除会话**：二次确认 dialog——标题"删除该会话？"，正文槽位 `__DELETE_CONVERSATION_CONFIRM_BODY__`；\[取消]（默认焦点）\[删除]（danger button）。
- **PH-17 删除项目 = 级联删除**：强确认 dialog——标题槽位 `__DELETE_PROJECT_CONFIRM_TITLE__`；正文槽位 `__DELETE_PROJECT_CONFIRM_BODY__`，**必须动态插入真实会话计数**（"将同时删除该项目及其下 N 个会话…"），N 来自实际数据，禁止写死；危险按钮文案明确为"删除项目及 N 个会话"。
- **PH-18** dialog 行为：scrim `--ds-scrim` + 居中面板（`--ds-radius-large`、`--ds-shadow-raised`）；打开焦点进「取消」；Tab 在面板内循环；Esc = 取消；关闭后焦点回到触发行的「···」；删除执行后焦点回落到分组标题或下一可用行。
- **PH-19** 确认按钮在危险操作时可要求更强防呆（本版只做文案明确，不做输入确认）。

## 7. 联动事件

| 事件名                                      | 时机               | 载荷                                               | <br />  |
| ---------------------------------------- | ---------------- | ------------------------------------------------ | :------ |
| `project:create`                         | 路径 2             | `{}`                                             | <br />  |
| `conversation:create`                    | 路径 1/3           | \`{inProject: string                             | null}\` |
| `conversation:open`                      | 点会话行             | \`{id:string, inProject:string                   | null}\` |
| `project:rename` / `conversation:rename` | inline-rename 提交 | `{id:string, title:string}`                      | <br />  |
| `project:pin` / `conversation:pin`       | 菜单置顶切换           | `{id:string, pinned:boolean}`                    | <br />  |
| `project:delete` / `conversation:delete` | 强确认通过            | `{id:string}`（项目删除时含 `conversationIds:string[]`） | <br />  |

## 8. 禁用项

- **PH-X1** 禁止把展收入口放进 ··· 菜单。
- **PH-X2** 禁止 hover 显露操作按钮时引起行宽/文字位移（不许用 display:none 切换）。
- **PH-X3** 禁止删除项目不弹级联确认、或确认文案中会话数写死。
- **PH-X4** 禁止工具导航项跳任何页面/改变中栏内容（v1 仅选中态）。
- **PH-X5** 禁止会话重命名后标题仍随首条消息变化。
- **PH-X6** 禁止使用蓝色表达选中/hover；只用灰阶（视觉基线第 2 条）。

