# Changelog

## 0.1.9 — 2026-10-08

Verified DeepSeek Harness: `0.2.1-alpha.1`（2026-10-03 发布），同时保持对 `0.2.0-rc.2`、`0.2.0-rc.1` 与整条 `0.1.7` 线的兼容声明。

**本版声明支持最新 DSH `0.2.1-alpha.1`：接口零破坏，业务代码与 `0.1.8` 完全相同——升级无需迁移数据、无需改配置。改动只有兼容声明、文档与开发依赖的钉版。同时把两份 README 从「实现说明」重写为「讲重点」，删去三段长篇接口论证。**

- **门禁放行**：用 DSH 自带的门禁函数（`@deepseek-ai/dsh-app-boot` 的 `evaluatePluginCompatibility`）实测 `0.1.8`/`0.1.9` 的 manifest → 通过。`0.1.8` 的范围其实已经能装载 `0.2.1-alpha.1`（尾段 `>=0.2.0 <0.3.0` 在门禁的 `includePrerelease: true` 下把排序高于 `0.2.0` 的预发布一并接纳），所以这次不是修 bug，而是把已验证版本写明。
- **peer 范围显式加入 `0.2.1-alpha.1`**：`dsh.engines.dsh` 与 `peerDependencies['@deepseek-ai/dsh-settings']` 改为 `>=0.1.7-alpha.2 <0.2.0-0 || 0.2.0-rc.1 || 0.2.0-rc.2 || 0.2.1-alpha.1 || >=0.2.0 <0.3.0`。加入后 `0.2.1-alpha.1` 在 node-semver 默认规则与门禁的 `includePrerelease` 规则下**都**接纳（此前只靠后者）；`0.2.1-alpha.2` 等后续预发布仍由尾段在门禁侧接纳，`0.2.0`/`0.2.1` 正式版照常接纳，`0.3.0` 仍在大门外。
- **真实 profile 端到端实测**：`dsh --profile web --dump-config` 退出码 0、**stderr 零 skip 警告**；`dsh-quick-replies` 条目存在且未被禁用，`config.items` 完整呈现用户自定义条目，说明宿主半边被 import 且 schemastery Config 解析成功（profile 里当时装的是 `0.1.8`）。
- **rc.2 → 0.2.1-alpha.1 源码逐项核对，插件消费的契约全部未变**：`ui-conversation` 的 `contract/slots.ts` 里 `conversation.input.dock` 声明未变（`kind:'list'`、`scope:'session'`、owner `InputZone`）；`packages/client/web/src/seed.ts` 的客户端静态模块表未变，仍与 `tsdown.config.ts` 的 9 个平台模块一一对应；`input/service.ts` 的 `prompt(content, mode, signal, requestId)` 调用点未变；`InputState.phase` 四个取值逐字未变；`SessionInput.state`、`contract/composer-blocks.ts` 的 `storeFor(sessionId)` 未变；`packages/settings/settings` 与 `ui-settings` 只改 README；`settings.configure(presentation, owner)` 两版同在 `settings/src/index.ts:266`；harness 的 `packages/client/tsdown.client.ts` 的 banner/intro/footer 契约未变（只改了一处文档注释），插件 client bundle 的 `window.__ModuleLoader__.load({id, factory})` + `var module = { exports: {} }` 写法仍成立。
- **本版唯一的破坏性客户端契约改动不影响本插件**：新增草稿文档模型（`DraftSnapshot`/`DraftInput`/`DraftReference`），并把 `ConversationSessionInjected.bindDraftMirror(write:(text)=>void)` 改名为 `bindDraftPersistence(write:(draft: DraftSnapshot)=>void)`、`ConversationStoreState.draft` 由 `string` 变 `DraftInput`——这些都在 session-injected 插槽契约上，而本插件只注册 `conversation.input.dock`、从不改写草稿，公开的 `SessionInput.setDraft(text: string)` 签名也未变。官方另两条「需更新」说明同样不适用：移除运行时 invariant 插件与 `./invariant` 导出（本插件无此入口）、输入区统计拆为 `activity`/`usage`（本插件不注册 `stats` 行）。
- **样式认领修复（「启停插件时其他插件样式被移除」）对本插件安全**：`modules/src/client/system.ts` 的 `claimStyles` 现在只认领「factory 运行前不存在」的 `style:not([data-plugin])`；本插件 `installStyles()` 自建标签时立即写 `data-plugin`，属预标记，走 `style[data-plugin="<id>"]` 的 owned 路径，新旧行为一致。
- **文档**：两份 README 重写为短句讲重点（删掉 `0.1.7` 在 `rc.2` 上的长篇归因、逐字节契约论证与规则矩阵），兼容表每行一句话；`docs/releases/v0.1.9.md` 按现行版式写（双语锚点 + 一句话 + 三条要点 + 升级命令）。
- **`devDependencies` 的 `@deepseek-ai/dsh-settings` 钉到 `0.2.1-alpha.1`**：本仓库类型检查从「直接针对 `0.2.0-rc.2`」升级为「直接针对 `0.2.1-alpha.1`」。98 项测试全部通过（含按 harness 方式装载 `lib/` 产物的 lane）。

## 0.1.8 — 2026-09-30

Verified DeepSeek Harness: `0.2.0-rc.2`（2026-09-30 发布；npm dist-tag `next`），同时保持对 `0.2.0-rc.1` 与整条 `0.1.7` 线（`0.1.7-rc.2` / `0.1.7-rc.1` / `0.1.7-alpha.2`）的兼容声明。

**本版适配 DSH `0.2.0-rc.2`：运行时接口对本插件零破坏，业务代码与 `0.1.7` 完全相同——从 `0.1.7` 升级无需迁移数据、无需改配置。改动只有版本声明与文档。同时修掉了 `0.1.7` 在 `rc.2` 上被 profile 门禁拒载（快捷栏消失）的问题。**

- **问题定位：坏掉的是 npm 上的 `latest`，不是 profile 里那份旧版。** `0.1.7` 的 peer 上界 `<0.2.0-0` 是当时刻意用来挡未经验证的 `0.2.0-rc.2` 的；DSH 升到 `0.2.0-rc.2` 后，`0.2.0-rc.2` 既不等于 `0.2.0-rc.1` 也不小于 `0.2.0-0`，`@deepseek-ai/dsh-settings` 这个 peer 判定不满足，整个 bundle 被跳过。而本机 profile 里锁的是 `0.1.6`（范围 `>=0.1.7-alpha.2 <0.2.0`），它的通过**只是因为门禁用 `semver.satisfies(..., { includePrerelease: true })` 比对，该规则下 `<0.2.0` 会接纳 `0.2.0-rc.2`**；换成 node-semver 默认规则同样不接纳。所以任何 `pnpm update` 或新装拿到 `0.1.7` 的用户都会丢插件。
- **peer 范围显式加入 `0.2.0-rc.2`**。`dsh.engines.dsh` 与 `peerDependencies['@deepseek-ai/dsh-settings']` 改为 `>=0.1.7-alpha.2 <0.2.0-0 || 0.2.0-rc.1 || 0.2.0-rc.2 || >=0.2.0 <0.3.0`。**新范围的接纳表在 node-semver 默认规则与门禁的 `includePrerelease` 规则下完全一致**——这是相对 `0.1.6`（只在宽松规则下接纳 `rc.2`）与 `0.1.7`（两种规则下都不接纳 `rc.2`）的实质改进，声明终于与事实对齐。`0.2.0-rc.3` 等未验证预发布仍留在门外（`❌/❌`），`0.2.0` 正式版及 `0.2.x` 仍接纳。
- **用 DSH 自带的门禁函数实测**（`@deepseek-ai/dsh-app-boot` 的 `evaluatePluginCompatibility`，不是复刻逻辑）：`0.1.8` 的 manifest → 通过；npm 上 `0.1.7` 的 manifest → 判定不兼容（复现本次要修的现象）。
- **rc.1 → rc.2 源码逐项核对，本插件依赖的接口都没有不兼容变更**：`ui-conversation` 的 `contract/` 目录**零 diff**（`conversation.input.dock` 插槽契约不变）；`packages/client/web/src/seed.ts` 的 9 个平台模块表**零 diff**（与 `tsdown.config.ts` 基线一一对应，`window.__ModuleLoader__` 协议不变）；`ctx.configForms` 仍是官方设置通道且 `ui-settings` 的 `src/` 零 diff（`settingsScope` 仍不存在）；`settings/document-updated` 仍在发、仍在事件表里；会话 `prompt(content, mode, signal, requestId)` 的调用点与 `api/session-controller` 的 `src/` 均未变；`api/remotes` 只有增量（新增 `userQuestionsRemote`）。平台基线里唯一实质改动是 `ui-primitives`（`Input` 改 `forwardRef`、新增 `MenuGroup`、一处图标画法微调），本插件客户端半边不 import 这些模块（只用注入的平台 `require`），且 `forwardRef` 化对既有调用方向后兼容。
- **`dsh.compatibility.dshReleases` 记录 `0.2.0-rc.2`**，保留原有四条记录。
- **`devDependencies` 的 `@deepseek-ai/dsh-settings` 钉到 `0.2.0-rc.2`**：本仓库类型检查从「直接针对 `0.2.0-rc.1`」升级为「直接针对 `0.2.0-rc.2`」。98 项测试全部通过（含按 harness 方式装载 `lib/` 产物的 lane），`pnpm build` 产出三件套。
- **本次未做端到端装载实测**：`dsh --profile web --dump-config` 看到本条目无 skipping、快捷栏真的渲染出来，需要 profile（`~/.dsh`）里装到 `0.1.8` 之后才能做，改动 `~/.dsh` 不在本仓库范围内；上面那条门禁实测用的是 DSH 自己的判定函数，结论等价。`docs/releases/v0.1.8.md` 里对此有明确标注。

## 0.1.7 — 2026-09-29

Verified DeepSeek Harness: `0.2.0-rc.1`（2026-09-28 发布），同时保持对 `0.1.7-rc.2` / `0.1.7-rc.1` / `0.1.7-alpha.2` 的兼容声明。

**本版适配 DSH `0.2.0-rc.1`：运行时接口对本插件零破坏，代码与 `0.1.6` 完全相同——从 `0.1.6` 升级无需迁移数据、无需改配置。改动只有版本声明与文档。**

- **逐项核对了 0.2.0-rc.1 的实际产物与源码**，本插件依赖的接口都没有不兼容变更：
  - `conversation.input.dock` 插槽仍是 `kind: "list"`、`scope: "session"`、owner `InputZone`（`ui-conversation` 的 `contract/slots.ts`）；
  - 客户端静态模块表（`packages/client/web/src/seed.ts`）与本插件 `tsdown.config.ts` 的 9 个平台模块逐一对应（react / react-dom / cordis / client-store / ui-slots / ui-primitives / ui-dockkit 等），`window.__ModuleLoader__` 注册协议不变；
  - `ctx.configForms` 仍是官方设置通道（`ui-settings` 包仍在使用），`@deepseek-ai/dsh-settings` 的 `SettingsNamespace` / `volatile` / `SettingsProvider.configure` 类型契约未变（本仓库 typecheck 直接针对 `0.2.0-rc.1` 通过）；
  - `settings/document-updated` 事件仍在 settings 包事件表中，局域网兜底不受影响；
  - 会话 `session.prompt(content, mode, signal, requestId)` 签名未变（`ui-conversation` 的 `service.ts` 仍以相同参数调用）。
- **profile 门禁实测通过**：`dsh --profile web --dump-config` 中 `dsh-quick-replies` 0.1.6 正常装载，无 skipping 警告（0.2.0-rc.1 起门禁以 `semver.satisfies(..., { includePrerelease: true })` 检查 `@deepseek-ai/dsh-*` peer）。
- **peer 范围显式声明 0.2 线**。`dsh.engines.dsh` 与 `peerDependencies['@deepseek-ai/dsh-settings']` 从 `>=0.1.7-alpha.2 <0.2.0` 扩为 `>=0.1.7-alpha.2 <0.2.0-0 || 0.2.0-rc.1 || >=0.2.0 <0.3.0`：旧范围在 node-semver 默认预发布规则下并不接纳 `0.2.0-rc.1`（没有比较符写 `0.2.0` 元组），只是 DSH 门禁的 `includePrerelease` 放行了它；新范围把意图写明——显式接纳已验证的 `0.2.0-rc.1` 与将来的 `0.2.x` 正式版，同时用 `<0.2.0-0` 挡住未经验证的 `0.2.0-rc.2` 等预发布。`0.1.7` 线的接纳行为与之前完全一致（已用 semver 逐版本验证）。
- **`dsh.compatibility.dshReleases` 记录 `0.2.0-rc.1`**，保留原有三条 `0.1.7` 线记录。
- **`devDependencies` 的 `@deepseek-ai/dsh-settings` 钉到 `0.2.0-rc.1`**：本仓库类型检查从「等价于 rc.2」升级为「直接针对 0.2.0-rc.1」。98 项测试全部通过。

## 0.1.6 — 2026-09-25

Verified DeepSeek Harness: `0.1.7-rc.2`（官方最新的候选版本），同时兼容 `0.1.7-rc.1` 与 `0.1.7-alpha.2`。

**本版确认并声明对最新 `0.1.7-rc.2` 候选版本的支持。代码与 `0.1.5` 完全相同，存储模型也完全相同——从 `0.1.5` 升级无需迁移数据、无需改配置。**

- **逐包核对了 rc.1 → rc.2 的实际产物**，本插件依赖的接口都没有不兼容变更：`@deepseek-ai/dsh-settings` 的 `lib` 未变（仍无运行时 `register`，仍是 `describe` / `update` / `replace` / `mutate`）；`@deepseek-ai/dsh-client-ui-settings` 的 `lib/client.js` 未变（`ctx.configForms` 仍在，`ctx.settingsScope` 仍不存在）；`@deepseek-ai/dsh-api-settings-controller` 除 `package.json`/README 外完全一致（`settings.describe` / `settings.mutate` 未变）；`@deepseek-ai/dsh-client-connection` 的 `lib` 未变；`@deepseek-ai/dsh-api-remotes` 只有增量（新增 `schedule` 等 Remote 与凭据事件，局域网兜底依赖的 `settings/document-updated` 仍在）；`@deepseek-ai/dsh-api-session-controller` 的 `prompt` / `steer` / `queue` 面未变（仅新增 `initializeDefaultModel`）。
- **插槽契约未变**：`conversation.input.dock` 仍是 `kind: "list"`、`scope: "session"`，`quick-replies` occupant 照常注册；该插槽的 props 类型 rc.2 未改（rc.2 只在别处新增了 `stopShortcut` hook）。
- **rc.2 唯一可见的改动是设计令牌**：`@deepseek-ai/dsh-client-ui-theme` 定义 `--dsw-radius-*`（`sm/md/lg/xl/panel`）与 `--dsw-focus-ring-*`，宿主自己的 dock 面板圆角由字面 `12px` 改为 `var(--dsw-radius-lg)`（= 16px）。本插件的圆角是自持的 12px，因此与刷新后的宿主 dock 有约 4px 的观感差异；本版**刻意不改**——同一个 `--dsw-radius-lg` 在 rc.1 上也是 16px，而 rc.1 的宿主 dock 是 12px，跟随令牌只会把差异从最新版挪到旧版，属于纯观感取舍，不影响挂载、发送与存储。
- **peer 范围无需改动**：`>=0.1.7-alpha.2 <0.2.0` 在 node-semver 默认预发布规则下同时接纳 `0.1.7-alpha.2`、`0.1.7-rc.1` 与 `0.1.7-rc.2`（只要范围里有比较符写了同一个 `major.minor.patch`，该版本的预发布即被接纳）。`dsh.compatibility.dshReleases` 现同时记录三者。
- **文档**：中英文 README 在顶部与兼容性章节更新支持版本；顺带修正 README 中「配置了 `NPM_TOKEN` 才发布 npm」的过时说法——实际是 OIDC 可信发布。

## 0.1.5 — 2026-09-23

Verified DeepSeek Harness: `0.1.7-rc.1`（官方最新的候选版本），同时兼容 `0.1.7-alpha.2`。

**本版适配并验证了最新的 `0.1.7-rc.1` 候选版本。** 存储模型与 `0.1.4` 完全一致，**从 `0.1.4` 升级无需迁移数据、无需改配置**。

- **在运行中的 `0.1.7-rc.1` 实例上实测通过**：Host 侧 `Config.listConfigs` 仍把 `dsh-quick-replies` 识别为可配置的表单条目（`status: "schema"`），客户端 `conversation.input.dock` 的 `quick-replies` occupant 仍为 `active: true`，快捷栏照常渲染与读写。
- **核对过 rc.1 的实际代码与官方说明**：`ctx.configForms` 仍在、`ctx.settingsScope` 仍不存在、`dsh-settings` 仍无运行时 `register`；官方 rc.1 说明中「设置改由当前 Profile 的插件配置保存；旧 settings.yaml 仅尝试导入一次」正是 `0.1.4` 已适配的那批变更。
- **peer 范围无需改动**：`>=0.1.7-alpha.2 <0.2.0` 在 node-semver 默认预发布规则下同时接纳 `0.1.7-alpha.2` 与 `0.1.7-rc.1`（只要范围里有比较符写了同一个 `major.minor.patch`，该版本的预发布即被接纳）。`dsh.compatibility.dshReleases` 现同时记录两者。
- **清理 `0.1.4` 遗留**：删除已无调用方的 `assertSectionValid`（其注释仍引用 0.1.7 已移除的 Host registration validate hook）；两处**用户可见**的错误前缀由旧命名空间 `quick-replies:` 改为实际寻址的条目 id `dsh-quick-replies:`。
- **文档**：中英文 README 在顶部与兼容性章节明确标注已支持最新 RC。

## 0.1.4 — 2026-09-23

Verified DeepSeek Harness: `0.1.7-alpha.2`.

0.1.7 移除了本插件赖以工作的两套 API，因此这是一次必需的重写而非增量修补。**`0.1.4` 只支持 DSH `0.1.7-alpha.2`**；更早的 DSH（含 `0.1.6-alpha.2`）请继续用 `0.1.3`。

- **宿主半：`settings.register` 已不存在（致命项）**。0.1.7 的 `ctx.settings` 只投影各 Loader 条目自身 `Config` 的 **volatile** 字段，且**设置表单的命名空间就是条目 id**（`docs/subsystems/settings.md`）。原先 `sctx.settings.register(QR_NAMESPACE, schema, { base, applies, validate })` 会抛 `register is not a function` 并被容错吞掉，`quick-replies` 命名空间从此永远不存在，快捷栏在 0.1.7 上必然全灭。现在宿主半导出 `Config`（schemastery），`schemaVersion` 与 `items` 均标 `.volatile()`：库的每次编辑都提交进运行中的引用并发 `loader/volatile-update`，不会重挂载插件。原「四个内置回复」成为 `items` 的 schema 默认值（即解析后的 composition base）；用户删除全部条目写入 `items: []` 仍是用户层覆盖，不会退回内置。
- **命名空间改名**：`quick-replies` → `dsh-quick-replies`（= `cordis.patch.yml` 的 insert id）。`cordis.patch.yml` 里的 `id` 从此**就是**存储键，不可再改。
- **存储位置变更**：回复库不再写在 `~/.dsh/settings.yaml`，而是作为该条目的 `config` 落在当前 profile 的 `cordis.patch.yml`。这是 0.1.7 官方的插件偏好模型（`configEditor.edit()` 会为 bundle insert 出来的条目追加 profile override），写入仍是原子替换并保留 YAML 注释。
- **客户端：`ctx.settingsScope` 服务已不存在**。官方通道改为 `ctx.configForms.get(entryId)`（`@deepseek-ai/dsh-client-ui-settings`），新增 `configFormScope.ts` 把它投影到插件自己的 scope 契约上；`mutate` 返回 `false`（被拒）会翻译成拒绝，管理界面的冲突提示得以保留。回环页面依旧优先走官方通道，不多发线上读取；局域网页面依旧回落到 `remote.settings` 直连，跨设备共享语义不变。
- **抑制重复的自动表单页**：`Config` 出现后 DSH 会默认为该条目生成一个通用表单，与本插件自带的管理弹窗重复。按官方惯例（`ui-theme`、`ui-chat`、`ui-conversation` 同样做法）注册 `settings.configure({ auto: false })`；命名空间行本身仍留在 `settings.describe()` 中，读写不受影响。
- **`@deepseek-ai/schemastery` 由普通 dependency 改为 peer**（同时保留 devDependency）：DSH 0.1.7 只从运行安装解析 link 插件的 peer 依赖，普通依赖会在插件自己的 `node_modules` 下查找，而本仓库不提供该目录，`link:` 安装时 Host 半边会 import 失败。
- **兼容性声明修正**：`dsh.engines.dsh` 与 `dsh-settings` peer 范围改为 `>=0.1.7-alpha.2 <0.2.0`，`dsh.compatibility.dshReleases` 记 `0.1.7-alpha.2`。下界必须写这个 alpha：按 node-semver 默认预发布规则，`>=0.1.6-0 <0.2.0` 并不接纳 `0.1.7-alpha.2`。另补 `dsh.manifestVersion`，并在 `dsh.client.inject` 中补 `@deepseek-ai/dsh-api-remotes`（直连通道直接使用 `remote.settings`）。

## 0.1.3 — 2026-09-16

Verified DeepSeek Harness: `0.1.5-rc.1`.

- **局域网/非回环页面修复**：DSH 的 settings Client 对来源不是 loopback 的页面关闭 Host 持久化（官方 `dsh-client-ui-settings` README：*Non-loopback pages get no durable settings*）——`settingsScope` 直接返回 `unavailable`，且从不发送 `settings.describe`，于是手机等经局域网访问的设备上快捷栏只显示「回复库不可用，无法发送」。现在官方 scope 报告 `unavailable` 时，插件改用与官方 settings Client 相同的公开 Remote（`settings.describe` / `settings.mutate`）直连 Host 的 `quick-replies` 命名空间：回复库仍是 Host 上那一份、多设备共享，读写、可写性与 revision 栅栏语义与回环页面一致。
- 回环页面行为与线上请求完全不变：官方 scope 可用时，直连通道不会被打开（也不会多发一次 `settings.describe`）。
- 直连通道可安全降级：Remote 缺失、读取被拒或答案不合法时，仍然是诚实的 `unavailable`，绝不伪造数据；写被拒时以 Host 错误码拒绝（管理界面提示冲突），不会静默覆盖。
- 修复注入守卫：注入上下文中读取点号父级（`payload.remote`）会抛 `cannot get property "remote" without inject`，旧守卫先读它会导致整条设置接线中断；现在先读字面服务键 `payload['remote.settings']`，并把每次读取都包在容错内。
- 多设备同步：直连通道订阅 `settings/document-updated` 失效通知，并在重连后重读，局域网设备的库与另一台设备的编辑保持同步。

## 0.1.2 — 2026-09-10

Verified DeepSeek Harness: `0.1.5-rc.1`.

- Adapted the Web client half to DeepSeek Harness `0.1.5-rc.1`.
- Dropped `@deepseek-ai/dsh-client-ui-slots` from `dsh.client.inject` (it is a frozen platform module, not a boot-graph plugin).
- Read `conversation.input.dock` session identity from session-standard `sessionId` or the `InputZone` owner (`session.sessionId`).
- Declared compatibility with DSH `0.1.5-rc.1` and aligned `@deepseek-ai/dsh-settings` peer/dev pins.

## 0.1.1

- CI 只跑 Node 24，避免 jsdom/undici 在 Node 20 上失败。
- npm 发布改用 GitHub Actions OIDC Trusted Publisher，推 `v*` 标签即可发版。

## 0.1.0

- 在会话输入区提供可管理的快捷回复，点击即发送纯文本用户消息。
- 空闲时 `queue`，顶层会话运行中 `steer`；不触碰草稿、不 cancel/stop。
- 回复库保存在 DSH Host 全局设置 `quick-replies`，多设备共享。
- 窄容器自动折叠；管理弹窗支持增删改、排序、导入导出。
- 空会话（尚无历史）拒绝发送，避免误触发新会话。
