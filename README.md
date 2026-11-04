# ai-native-prototype-design

一套供 AI 稳定执行的高保真原型设计 Skill：根据对话描述、PRD、需求文档、功能清单或截图，生成遵循统一设计规范的**单文件、可离线打开**的 HTML 高保真原型。

采用「共享层 + 模块层」组织：设计语言（token / 图标 / 门禁）跨模块共享，页面模块各自独立。当前交付首个模块 **chat-workbench（AI 对话工作台）**，未来模块在 `modules/` 下平行扩展。

## 安装

将整个目录复制到本地 Skill 目录：

```text
c:\Users\<你的用户名>\.trae-cn\skills\ai-native-prototype-design\
```

重启会话后即可在对话中点名：

```text
使用 $ai-native-prototype-design，根据以下需求生成一个 AI 对话工作台高保真原型：……
```

## 目录结构

```text
ai-native-prototype-design/
├── SKILL.md                 # AI 执行入口：模块路由 + 7 步生成顺序 + 门禁 + 验收
├── agents/openai.yaml       # Skill 展示/注册元信息
├── tokens/                  # 【共享层】唯一视觉权威
│   ├── tokens.json          #   语义 token + 浅/深两套值 + role/used_by
│   └── tokens.css           #   --ds-* CSS 变量（内联进产物）
├── icons/                   # 【共享层】1.8px 线性图标集
│   ├── manifest.json        #   name/aliases/use_for/avoid_for/default_size
│   └── sprite.svg
├── scripts/                 # 【共享层】四个机器门禁 + fill-template 填槽器（零依赖 Node .mjs）
└── modules/
    └── chat-workbench/      # 【模块层】AI 对话工作台
        ├── content-slots.json
        ├── contracts/       #   5 份页面合同
        ├── components/      #   29 个组件（规范 JSON + 实物）+ index.html
        ├── starters/        #   interactive-starter.html（默认·全交互）+ 两个轻量线框骨架
        └── prototype/       #   ai-workbench.html 端到端参考原型（interactive-starter 填充成品）
```

## 默认产物：全交互原型

默认从 `starters/interactive-starter.html`（29 组件全装配、交互全接线，127 槽位 + 4 个 JSON 数据岛）出发：把需求证据写成 manifest JSON，由填槽器机械产出成品：

```bash
node scripts/fill-template.mjs --manifest my-manifest.json --template interactive --out deliverables/prototype.html --report report.json
```

填槽器自动展开 N/M 下标数组槽、未覆盖槽回退登记示例值、校验零残留与 JSON 数据岛合法性；随后跑四个审计脚本（`--require-components` 须含全部 29 个组件）并在浏览器按 SKILL.md 第 7 节做交互验收（发送→流式回放→产物卡打开右栏→新建会话重置等）。仅当用户明确要求静态稿/线框时，才降级使用两个轻量 starter。

## 设计原则速览

- **黑白灰优先**：交互强调用深色与灰阶，蓝色只留给数据可视化和真实语义；
- **唯一 token 源**：颜色/字体/间距/圆角/动效只来自 `tokens/tokens.json`，禁止裸值；
- **唯一壳层源**：全交互产物只能从 `interactive-starter.html` 复制整页骨架；
- **槽位化 + 机械填充**：模板业务文案全部为 `__SLOT__`，交付时写 manifest 由 `fill-template.mjs` 填充，不手工改成品；
- **默认可交互**：发送回放流式思考/步骤、产物卡打开右栏、历史树与新建会话真实可用；
- **机器门禁**：四个审计脚本拦截自包含性、token 越界、挂名组件、槽位残留。

详细生成顺序与验收清单见 [SKILL.md](./SKILL.md)。
